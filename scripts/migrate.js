const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false },
    port: parseInt(process.env.PGPORT || '5432'),
  });
  await client.connect();
  console.log('[migrate] Connected to Aurora PostgreSQL');

  const addCol = async (table, col, def) => {
    const r = await client.query(
      'SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2',
      [table, col]
    );
    if (r.rows.length === 0) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
      console.log(`[migrate] Added column: ${table}.${col}`);
    } else {
      console.log(`[migrate] Column exists: ${table}.${col}`);
    }
  };

  await addCol('agents', 'capability_scopes', "TEXT[] DEFAULT '{}'");
  await addCol('agents', 'escalation_policy', "JSONB DEFAULT '{\"timeout_hours\":24,\"escalate_to\":null}'");
  await addCol('agents', 'budget_limit_usd', 'DECIMAL(10,2) DEFAULT NULL');
  await addCol('agents', 'owner_user_id', 'INTEGER');

  // Patch any nulls
  await client.query("UPDATE agents SET capability_scopes = ARRAY['read','write'] WHERE capability_scopes IS NULL");
  await client.query("UPDATE agents SET escalation_policy = '{\"timeout_hours\":24,\"escalate_to\":null}' WHERE escalation_policy IS NULL");

  // Confirm columns
  const cols = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='agents' ORDER BY ordinal_position"
  );
  console.log('[migrate] agents columns:', cols.rows.map(r => r.column_name).join(', '));

  // Count agents
  const cnt = await client.query('SELECT COUNT(*) FROM agents');
  console.log('[migrate] agent count:', cnt.rows[0].count);

  await client.end();
  console.log('[migrate] Done.');
}

run().catch(e => { console.error('[migrate] FAIL:', e.message); process.exit(1); });
