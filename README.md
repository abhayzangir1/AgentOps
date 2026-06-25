# AgentOps — AI Agent Governance Platform

> **Jira meets Workday for your AI workforce.** AgentOps is a production-grade B2B platform for governing, monitoring, and controlling fleets of autonomous AI agents — with human-in-the-loop approvals, real-time cost controls, recursive permission inheritance, and an AI ops copilot.

**Live demo:** https://v0-agentops-platform-build.vercel.app

**Demo login:** `ops@company.ai` / `AgentOps2024!`  _(or click "Fill demo credentials" on the login screen)_

---

## The Problem

Enterprises are deploying hundreds of autonomous AI agents that spend real money, take real actions, and delegate to sub-agents — with almost no governance layer. There is no "Jira board" for AI workers: no approval queue for high-risk actions, no per-agent budget enforcement, no audit trail for compliance, and no way to reason about which agent inherited which permission from whom.

AgentOps is that governance layer.

## What It Does

| Module | Capability |
|---|---|
| **Command Center** | Real-time dashboard with live telemetry, fleet health, and at-a-glance KPIs |
| **Agent Registry** | Create/edit agents, capability scopes, parent/child hierarchy, status tracking |
| **Approvals (HITL)** | Human-in-the-loop inbox to Approve / Reject / Modify high-risk agent actions |
| **Sentinel AI** | One-click LLM risk analysis of any pending action (AWS Bedrock) |
| **Cost Intelligence** | Per-agent token spend, budget caps, over-budget alerts, freeze-spend controls, CSV export |
| **Permissions** | Recursive permission inheritance — sub-agents can never exceed a parent's scope |
| **Audit Log** | Immutable, timestamped action record with search, filter, CSV/JSON export, and AI compliance summaries |
| **Ops Copilot** | Conversational AI assistant grounded in live fleet data (AWS Bedrock) |
| **Plans & Billing** | Self-serve Growth-tier subscriptions with per-seat pricing (Razorpay) |

## Architecture Highlights

AgentOps uses a **dual-database architecture**, intentionally chosen to match each workload:

### Aurora PostgreSQL (Serverless v2) — governance system of record
- ACID-compliant agent registry, approvals, permissions, and immutable audit log
- **Recursive CTE permission engine** — the core technical showpiece. Permissions resolve down the agent hierarchy with cycle detection and depth limits, so a sub-agent's effective capabilities and budget can never exceed its parent's:

```sql
WITH RECURSIVE agent_tree AS (
  SELECT a.id AS agent_id, a.parent_agent_id, p.permission_level, 1 AS depth, ARRAY[a.id] AS path
  FROM agents a JOIN permissions p ON p.agent_id = a.id
  WHERE p.user_id = $1
  UNION ALL
  SELECT child.id, child.parent_agent_id, parent.permission_level, parent.depth + 1, parent.path || child.id
  FROM agents child
  JOIN agent_tree parent ON child.parent_agent_id = parent.agent_id
  WHERE NOT child.id = ANY(parent.path)   -- cycle prevention
)
SELECT DISTINCT ON (agent_id) agent_id, permission_level, depth,
       (depth > 1) AS inherited
FROM agent_tree ORDER BY agent_id, depth ASC;
```

- IAM authentication via Vercel OIDC + AWS RDS Signer (no long-lived DB passwords)

### DynamoDB (on-demand) — high-velocity activity stream
- Agent action telemetry designed for high write throughput
- Streamed to the UI in real time via **Server-Sent Events** (`/api/activity/stream`) with automatic REST-polling fallback

### AWS Bedrock — AI reasoning layer
- **Sentinel AI** risk analysis of pending approvals (structured risk score + reasoning)
- **Ops Copilot** conversational assistant grounded in live fleet snapshots
- **AI audit summaries** for compliance reviews

## Tech Stack

- **Framework:** Next.js (App Router) + React + TypeScript
- **UI:** Tailwind CSS + shadcn/ui, Recharts for cost visualization
- **Data fetching:** SWR + Server-Sent Events
- **Databases:** AWS Aurora PostgreSQL Serverless v2, AWS DynamoDB
- **AI:** AWS Bedrock (Qwen3 VL)
- **Auth:** JWT session cookies with hashed credentials
- **Payments:** Razorpay (subscriptions + HMAC signature verification)
- **Hosting:** Vercel

## Key API Endpoints

```
GET    /api/agents                     list agents (with spend + status)
POST   /api/agents                     create agent (enforces plan limits)
GET    /api/approvals                  pending + resolved approval queue
PATCH  /api/approvals/[id]             approve / reject / modify (fires webhooks)
POST   /api/approvals/[id]/analyze     Sentinel AI risk analysis (Bedrock)
GET    /api/permissions?userId=        recursive CTE permission resolution
GET    /api/activity/stream            real-time SSE activity feed (DynamoDB)
GET    /api/audit-logs                 immutable audit trail
POST   /api/audit-logs/summarize       AI compliance summary (Bedrock)
POST   /api/copilot                    Ops Copilot chat (Bedrock)
POST   /api/billing/subscription       create Razorpay subscription
POST   /api/billing/verify             verify payment + upgrade plan
POST   /api/keys                       provision SDK API key (SHA-256 hashed)
POST   /api/webhooks                   Slack / Teams / generic alert configs
GET    /api/health                     Aurora + DynamoDB health probe
```

## Local Development

> Requires AWS Aurora PostgreSQL, DynamoDB, and Bedrock access plus a Razorpay account. All credentials are read from environment variables — none are committed.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Required environment variables (set in Vercel project settings or `.env.development.local`):

```
# Aurora PostgreSQL (IAM auth via Vercel OIDC + RDS Signer)
PGHOST, PGDATABASE, PGUSER, AWS_REGION, AWS_ROLE_ARN
# DynamoDB activity stream
DYNAMODB_TABLE_NAME, DYNAMODB_TABLE_PARTITION_KEY
# AWS Bedrock (AI reasoning)
BEDROCK_AWS_REGION, BEDROCK_AWS_ACCESS_KEY_ID, BEDROCK_AWS_SECRET_ACCESS_KEY, BEDROCK_MODEL_ID
# Auth
AUTH_SECRET
# Billing (Razorpay)
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_GROWTH_PLAN_ID, NEXT_PUBLIC_RAZORPAY_KEY_ID
```

Initialize the database schema and seed demo data:

```bash
curl -X POST http://localhost:3000/api/migrate   # create/extend tables
curl -X POST http://localhost:3000/api/seed      # seed demo agents + data
```

## Project Structure

```
app/
  api/            route handlers (agents, approvals, permissions, billing, copilot, …)
  page.tsx        single-page command center shell
components/       feature modules (agent-registry, approval-queue, cost-dashboard,
                  permission-hierarchy, audit-log, ops-copilot, settings-modal, …)
lib/              db.ts (Aurora), dynamodb.ts, bedrock.ts, razorpay.ts, webhooks.ts,
                  auth.ts, types.ts, validation.ts
```

## Further Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — deep-dive on the dual-database design and data flow
- [`HACKATHON_SETUP.md`](./HACKATHON_SETUP.md) — full environment + AWS setup walkthrough
- [`MANUAL.md`](./MANUAL.md) — end-user product manual
- [`QUICK_START.md`](./QUICK_START.md) — fastest path to a running instance

---

Built with [v0](https://v0.app). Every merge to the connected branch auto-deploys to Vercel.
