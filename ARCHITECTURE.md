# AgentOps Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                       │
│                     (Next.js 16 + React 19)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Dashboard  │  │   Agents    │  │ Approvals   │          │
│  │  (Real-time)│  │ (Hierarchy) │  │ (Workflow)  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Permissions │  │Cost Intel   │  │ Audit Log   │          │
│  │ (Recursive) │  │ (Alerts)    │  │(Search)     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                             ↓
              All API calls use SWR for caching
              Real-time refresh every 5-10 seconds
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (Next.js Routes)               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  GET /api/health                 Health Check               │
│  POST /api/migrate               Schema Migrations          │
│  POST /api/seed                  Seed Aurora Data           │
│                                                               │
│  ┌──── AGENTS APIs ────┐                                    │
│  │ GET /api/agents     │  List hierarchical agents          │
│  │ POST /api/agents    │  Create new agent                  │
│  │ PATCH /api/agents/[id]  Update status, budget            │
│  └─────────────────────┘                                    │
│                                                               │
│  ┌──── PERMISSIONS APIs ────┐                               │
│  │ GET /api/permissions     │  Recursive CTE query          │
│  │   ?userId=X              │  Returns inherited perms      │
│  └──────────────────────────┘                               │
│                                                               │
│  ┌──── APPROVALS APIs ────┐                                 │
│  │ GET /api/approvals     │  List pending requests          │
│  │ PATCH /api/approvals/[id] │  Approve/reject            │
│  └────────────────────────┘                                 │
│                                                               │
│  ┌──── AUDIT APIs ────┐                                     │
│  │ GET /api/audit-logs │  Search/filter audit events       │
│  └─────────────────────┘                                    │
│                                                               │
│  ┌──── ACTIVITY APIs ────┐                                  │
│  │ GET /api/activity     │  DynamoDB stream query          │
│  │ POST /api/activity/seed │  Seed events to DynamoDB      │
│  └───────────────────────┘                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         ↓                                      ↓
┌────────────────────────┐        ┌────────────────────────┐
│  AURORA POSTGRESQL     │        │      DYNAMODB          │
│  (Relational Data)     │        │  (Time-Series Events)  │
├────────────────────────┤        ├────────────────────────┤
│                        │        │                        │
│ ┌────────────────────┐ │        │ ┌──────────────────┐  │
│ │  agents            │ │        │ │ activity_events  │  │
│ │  ├─ id (PK)       │ │        │ │ ├─ eventId (PK)  │  │
│ │  ├─ name          │ │        │ │ ├─ agentId       │  │
│ │  ├─ status        │ │        │ │ ├─ eventType     │  │
│ │  ├─ parent_agent_id│ │        │ │ ├─ status        │  │
│ │  ├─ monthly_cost  │ │        │ │ ├─ costUSD       │  │
│ │  └─ budget_limit  │ │        │ │ ├─ duration      │  │
│ │  IX: name,status  │ │        │ │ ├─ timestamp     │  │
│ │  CTE: hierarchy   │ │        │ │ └─ metadata      │  │
│ └────────────────────┘ │        │ └──────────────────┘  │
│                        │        │                        │
│ ┌────────────────────┐ │        │ Write throughput:      │
│ │  approvals         │ │        │ 1000s events/min       │
│ │  ├─ id (PK)       │ │        │                        │
│ │  ├─ agent_id (FK) │ │        │ Read throughput:       │
│ │  ├─ request_type  │ │        │ Real-time queries      │
│ │  ├─ status        │ │        │                        │
│ │  └─ created_at    │ │        │ TTL: No expiration     │
│ │  IX: status       │ │        │ (immutable log)        │
│ └────────────────────┘ │        └──────────────────────┘
│                        │
│ ┌────────────────────┐ │
│ │  audit_logs        │ │
│ │  ├─ id (PK)       │ │
│ │  ├─ action        │ │
│ │  ├─ actor_user_id │ │
│ │  └─ created_at    │ │
│ │  IX: created_at   │ │
│ └────────────────────┘ │
│                        │
│ ┌────────────────────┐ │
│ │  permissions       │ │
│ │  ├─ user_id       │ │
│ │  ├─ agent_id (FK) │ │
│ │  ├─ perm_level    │ │
│ │  └─ created_at    │ │
│ │  CTE: inheritance │ │
│ └────────────────────┘ │
│                        │
│ Latency: ~50-200ms     │
│ Queries per second: 100s│
│ Concurrent: 10-50      │
│ Transactions: Yes      │
│ Indexes: 8             │
│                        │
└────────────────────────┘
```

---

## Request Flow Example: Get Agent Hierarchy

```
1. UI calls: GET /api/agents
   ↓
2. API Route queries Aurora:
   SELECT id, name, status, parent_agent_id, 
           monthly_cost_usd, budget_limit_usd
   FROM agents
   ORDER BY created_at DESC
   ↓
3. Aurora returns 14 rows (~50ms latency)
   ↓
4. API returns JSON with real data
   ↓
5. UI renders hierarchical tree
   - Acme Corp (parent)
     - DataFlow (child)
       - DataFlow - Ingestion
       - DataFlow - Processing
       - DataFlow - Analytics
```

---

## Request Flow Example: Get Recursive Permissions

```
1. UI calls: GET /api/permissions?userId=1
   ↓
2. API Route executes Recursive CTE:
   
   WITH RECURSIVE permission_tree AS (
     -- Base: direct user permissions
     SELECT a.id, p.permission_level, 1 as depth
     FROM agents a
     JOIN permissions p ON a.id = p.agent_id
     WHERE p.user_id = 1
     
     UNION ALL
     
     -- Recursive: inherit from parent agents
     SELECT child.id, parent.permission_level, depth+1
     FROM agents child
     JOIN permission_tree parent ON child.parent_agent_id = parent.agent_id
   )
   SELECT DISTINCT ON (agent_id) * FROM permission_tree
   ORDER BY agent_id, depth
   
   ↓
3. Aurora walks permission tree (~100ms for 14 agents)
   
   Root Agent (direct) → admin
      └─ Child Agent (inherited) → admin
         └─ Grandchild Agent (inherited) → admin
   
   ↓
4. API returns all permissions with inheritance chain
   ↓
5. UI renders color-coded hierarchy
   Red badge = admin, Yellow = edit, Blue = view
```

---

## Request Flow Example: DynamoDB Activity Stream

```
1. UI calls: GET /api/activity?limit=15
   ↓
2. API Route queries DynamoDB:
   query table = aws-dynamodb-almond-drawer-agentops
   limit = 15
   sort_order = descending (newest first)
   ↓
3. DynamoDB scans with partition key optimization (~30ms latency)
   
   Returns:
   {
     "eventId": "evt-123456",
     "agentId": 1,
     "eventType": "execution",
     "description": "DataFlow processed 15K records",
     "status": "success",
     "costUSD": 2.45,
     "timestamp": 1717662300000,
     "metadata": { "recordsProcessed": 15000 }
   }
   
   ↓
4. API returns JSON array with 15 events
   ↓
5. UI renders activity feed with:
   - Status icon (green checkmark = success)
   - Event type badge (execution, error, approval, deployment)
   - Relative time (2 minutes ago)
   - Cost indicator ($2.45)
```

---

## Data Model: Budget Limits & Alerts

```
Aurora PostgreSQL:
┌─────────────────────────────────────────┐
│ agents table                            │
├─────────────────────────────────────────┤
│ id: 1                                   │
│ name: "DataFlow Pipeline"               │
│ status: "active"                        │
│ monthly_cost_usd: 2500.00              │
│ budget_limit_usd: 3000.00               │  ← NEW
│ tier: "pro"                             │
│ parent_agent_id: NULL                   │
└─────────────────────────────────────────┘

Cost Intelligence calculates:
budget_used_pct = (monthly_cost / budget_limit) * 100
               = (2500 / 3000) * 100
               = 83.33%  → ALERT (>80%)

UI shows:
━━━━━━━━━━━━━━━━━ 83% [🔴 ALERT]
"DataFlow Pipeline is using 83% of budget"

Export includes:
Agent Name | Monthly Cost | Budget | Used % | Status
----------|-------------|--------|--------|-------
DataFlow  | $2,500      | $3,000 | 83%    | 🔴 Alert
ContentGen| $1,500      | $2,000 | 75%    | ✓ OK
Support   | $500        | $500   | 100%   | 🔴 At Limit
```

---

## Data Consistency & Integrity

```
Aurora PostgreSQL (ACID):
├─ Transactions: Yes (approvals workflow atomic)
├─ Constraints: Foreign keys, CHECK constraints
├─ Isolation: Row-level locking
└─ Durability: Multi-AZ replication

DynamoDB (Eventual Consistency):
├─ Consistency: Write immediately readable from same partition
├─ Replication: Multi-region (if enabled)
├─ Throughput: On-demand scaling
└─ Durability: 3x replication within region

Cross-database coordination:
- PostgreSQL = Source of truth (agents, budgets, permissions)
- DynamoDB = Write-once activity log (immutable)
- No conflicts (different data types)
```

---

## Performance Characteristics

```
Operation              | Database | Latency | Queries/sec | Cache
──────────────────────|----------|---------|-------------|──────
List agents           | Aurora   | 50ms    | 100s        | 5sec
Get permissions (CTE) | Aurora   | 100ms   | 50s         | 5sec
List approvals        | Aurora   | 30ms    | 1000s       | 5sec
Get activity stream   | DynamoDB | 30ms    | 1000s       | 5sec
Create approval       | Aurora   | 200ms   | 10s         | No
Update agent status   | Aurora   | 150ms   | 50s         | No
Approve request       | Aurora   | 180ms   | 20s         | No

SWR Cache Strategy:
- Dashboard: refresh every 5 seconds
- Agent Registry: refresh every 5 seconds
- Approvals: refresh every 5 seconds
- Activity: refresh every 5 seconds (real-time)
- Users can force refresh with button
```

---

## Deployment Architecture

```
GitHub
  ↓
[v0/abhayzangir1-3217f9ed] ← Development Branch
  ↓
Pull Request
  ↓
[main] ← Production Branch
  ↓
Vercel CI/CD
├─ Run tests
├─ Build Next.js
├─ Deploy to Vercel Edge
└─ Auto-scale based on traffic
  ↓
Live Production
├─ Vercel Serverless Functions (API routes)
├─ Edge Cache (static assets)
├─ Auto-scaling (100-10,000 concurrent)
└─ Automatic rollback on error
  ↓
AWS Databases
├─ Aurora PostgreSQL (us-east-1)
├─ DynamoDB (ap-south-1)
└─ IAM roles for authentication
```

---

## Monitoring & Observability

```
Health Check Endpoint: GET /api/health

Returns:
{
  "status": "healthy",
  "timestamp": "2026-06-06T10:00:00Z",
  "version": "1.0.0",
  "postgres": {
    "status": "healthy",
    "latency_ms": 125,
    "connections": 5
  },
  "dynamodb": {
    "status": "healthy",
    "latency_ms": 45,
    "write_capacity": 100
  },
  "uptime_seconds": 86400
}

Logs available in:
- Vercel Dashboard → Functions
- Vercel Dashboard → Logs
- AWS CloudWatch (optional)
- Browser Console (client-side errors)
```

---

## Security

```
Aurora PostgreSQL:
├─ IAM authentication (no passwords)
├─ Encrypted at rest (AWS KMS)
├─ Encrypted in transit (TLS)
├─ VPC isolated (no public endpoint)
└─ Backup: automatic daily

DynamoDB:
├─ IAM role-based access
├─ Encrypted at rest (AWS KMS)
├─ Encryption in transit (TLS)
├─ No public access
└─ Backup: point-in-time recovery

API Layer:
├─ Input validation on all endpoints
├─ SQL parameterization (no injection)
├─ Rate limiting (Vercel built-in)
├─ CORS configured
└─ Error messages don't leak sensitive data

Frontend:
├─ XSS protection (React auto-escaping)
├─ CSRF tokens (if forms added)
├─ Content Security Policy headers
└─ No secrets in client code
```
