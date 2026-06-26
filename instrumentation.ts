// Next.js instrumentation hook — runs once per server cold start.
// Ensures all DB tables and columns exist before handling any requests.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { query } = await import('@/lib/db')

      // Users table
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'viewer')),
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `)
      await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)

      // Agents table
      await query(`
        CREATE TABLE IF NOT EXISTS agents (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive', 'disabled')),
          tier VARCHAR(50) DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'enterprise')),
          parent_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
          monthly_cost_usd DECIMAL(10,2) DEFAULT 0,
          budget_limit_usd DECIMAL(10,2) DEFAULT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Add columns that may be missing on existing deployments
      const addColIfMissing = async (table: string, col: string, def: string) => {
        const r = await query(
          `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
          [table, col],
        )
        if (r.rows.length === 0) {
          await query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
        }
      }

      await addColIfMissing('agents', 'capability_scopes', `TEXT[] DEFAULT '{}'`)
      await addColIfMissing('agents', 'escalation_policy', `JSONB DEFAULT '{"timeout_hours":24,"escalate_to":null}'`)
      await addColIfMissing('agents', 'owner_user_id', `INTEGER`)

      // Remaining tables
      await query(`
        CREATE TABLE IF NOT EXISTS approvals (
          id SERIAL PRIMARY KEY,
          agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          request_type VARCHAR(100) NOT NULL,
          request_details JSONB NOT NULL DEFAULT '{}',
          requested_by_user_id INTEGER,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
          assigned_to_user_id INTEGER,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMPTZ,
          notes TEXT
        )
      `)

      await query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          actor_user_id INTEGER,
          details JSONB NOT NULL DEFAULT '{}',
          ip_address INET,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await query(`
        CREATE TABLE IF NOT EXISTS permissions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          permission_level VARCHAR(50) NOT NULL CHECK (permission_level IN ('view', 'edit', 'admin', 'approve')),
          granted_by_user_id INTEGER,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, agent_id)
        )
      `)

      // Billing columns on users (starter is the free default plan)
      await addColIfMissing('users', 'plan', `VARCHAR(20) NOT NULL DEFAULT 'starter'`)
      await addColIfMissing('users', 'razorpay_subscription_id', `VARCHAR(64) DEFAULT NULL`)

      // API keys for SDK/programmatic agent access (only a SHA-256 hash is stored)
      await query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          key_prefix VARCHAR(16) NOT NULL,
          key_hash CHAR(64) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          last_used_at TIMESTAMPTZ DEFAULT NULL,
          revoked_at TIMESTAMPTZ DEFAULT NULL
        )
      `)
      await query(`CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON api_keys(agent_id)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix)`)

      // Gateway requests: track /guard pre-action checks and HITL decisions.
      // Agents poll this to learn if an action was approved/denied/still-pending.
      await query(`
        CREATE TABLE IF NOT EXISTS gateway_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          request_type VARCHAR(100) NOT NULL,
          request_details JSONB NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
          decision_reason TEXT DEFAULT NULL,
          decided_by_user_id INTEGER REFERENCES users(id),
          requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          decided_at TIMESTAMPTZ DEFAULT NULL,
          expires_at TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours')
        )
      `)
      await query(`CREATE INDEX IF NOT EXISTS idx_gateway_requests_agent ON gateway_requests(agent_id)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_gateway_requests_status ON gateway_requests(status)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_gateway_requests_user ON gateway_requests(user_id)`)

      // Webhook alerting configs (Slack / Microsoft Teams / generic JSON)
      await query(`
        CREATE TABLE IF NOT EXISTS webhook_configs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider VARCHAR(20) NOT NULL CHECK (provider IN ('slack', 'teams', 'generic')),
          url TEXT NOT NULL,
          events TEXT[] NOT NULL DEFAULT '{approval.pending,approval.decided,budget.alert}',
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          last_fired_at TIMESTAMPTZ DEFAULT NULL,
          last_status INTEGER DEFAULT NULL
        )
      `)
      await query(`CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhook_configs(user_id)`)

      // Indexes
      await query(`CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_agent_id)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_user_id)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)`)
      await query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)`)

      console.log('[AgentOps] Database schema verified and ready.')
    } catch (err) {
      // Non-fatal: log but don't crash the server
      console.error('[AgentOps] Instrumentation schema check failed:', err)
    }
  }
}
