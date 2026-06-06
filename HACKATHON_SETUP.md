# AgentOps - Complete Hackathon Setup Manual

## Overview
This document provides step-by-step manual tasks to achieve full functionality using real AWS backends (Aurora PostgreSQL + DynamoDB).

---

## Phase 1: AWS Configuration (Do First)

### Task 1.1: Update DynamoDB IAM Policy

**Status:** REQUIRED - Activity Stream won't work without this

**Steps:**
1. Go to AWS Console > IAM > Roles > `access-apg-lime-lever-agentops`
2. Click on the inline policy `access-dynamodb-almond-drawer-agentops`
3. Click "Edit policy" and switch to JSON tab
4. Replace the entire policy with:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VercelDynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:BatchWriteItem",
        "dynamodb:BatchGetItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-south-1:896680308915:table/aws-dynamodb-almond-drawer-agentops",
        "arn:aws:dynamodb:ap-south-1:896680308915:table/aws-dynamodb-almond-drawer-agentops/index/*"
      ]
    }
  ]
}
```

5. Click "Review policy" → "Save changes"
6. Wait 2-3 minutes for IAM changes to propagate

**Verification:**
```bash
curl https://your-app.vercel.app/api/health
# Should show: "dynamodb": { "status": "healthy", "latency_ms": XX }
```

---

## Phase 2: Database Setup (Local Development)

### Task 2.1: Run Database Migration

**Status:** REQUIRED - Sets up schema for all features

**Steps:**
1. Keep your dev server running (`pnpm dev` on port 3000)
2. In a new terminal, run:

```bash
curl -X POST http://localhost:3000/api/migrate
```

**Expected Response:**
```json
{
  "status": "success",
  "migrations_applied": [
    "Added budget_limit_usd column",
    "Added capability_scopes column",
    "Added escalation_policy column",
    "Created performance indexes",
    "Set default budget limits by tier",
    "Fixed permissions table for recursive CTE",
    "Seeded admin permissions for all agents"
  ]
}
```

**Verification:**
- Check logs for any "error" messages
- All migrations should complete in < 5 seconds

---

### Task 2.2: Seed Initial Data

**Status:** REQUIRED - Populates Aurora PostgreSQL with demo data

**Steps:**
1. After migration completes, run:

```bash
curl -X POST http://localhost:3000/api/seed
```

**Expected Response:**
```json
{
  "status": "success",
  "seeded": {
    "agents": 11,
    "approvals": 3,
    "audit_logs": 0,
    "permissions": 11
  }
}
```

**What Gets Seeded:**
- 4 parent agents (Acme Corp, DataFlow, ContentGen, Support)
- 7 child agents (hierarchical structure)
- 3 pending approvals in the queue
- Admin permissions for all agents to user_id=1

**Verification:**
```bash
# Check agents were created
curl http://localhost:3000/api/agents | jq '.[] | .name'

# Check approvals exist
curl http://localhost:3000/api/approvals | jq '.[] | .request_type'
```

---

### Task 2.3: Seed DynamoDB Activity Data

**Status:** REQUIRED for Activity Monitor to show data

**Prerequisites:** Task 1.1 (IAM policy update) must be completed

**Steps:**
1. Run the activity seed endpoint:

```bash
curl -X POST http://localhost:3000/api/activity/seed
```

**Expected Response:**
```json
{
  "status": "success",
  "items_inserted": 15,
  "message": "15 sample activities seeded to DynamoDB"
}
```

**What Gets Seeded:**
- 15 activity events across different agents
- Mix of execution, error, approval, and deployment events
- Timestamps ranging from 10 minutes to 7 days ago

**Verification:**
```bash
# Check activity stream returns data
curl "http://localhost:3000/api/activity?limit=5" | jq '.[] | .description'
```

---

## Phase 3: Local Testing (Verify Everything Works)

### Task 3.1: Test All API Endpoints

**Steps:**

1. **Health Check (Database connectivity):**
```bash
curl http://localhost:3000/api/health | jq '.'
```
**Expected:** Both PostgreSQL and DynamoDB show `"status": "healthy"`

2. **Agents (Aurora PostgreSQL):**
```bash
curl http://localhost:3000/api/agents | jq '.[0] | {name, status, monthly_cost_usd, budget_limit_usd}'
```
**Expected:** Shows 11 agents with budget limits

3. **Approvals (Aurora PostgreSQL):**
```bash
curl http://localhost:3000/api/approvals | jq '.[0] | {agent_id, request_type, status}'
```
**Expected:** Shows 3 pending approvals

4. **Audit Logs (Aurora PostgreSQL):**
```bash
curl http://localhost:3000/api/audit-logs | jq '.[0] | {action, created_at}'
```
**Expected:** Returns array of audit log entries

5. **Permissions - Recursive CTE (Aurora PostgreSQL):**
```bash
curl "http://localhost:3000/api/permissions?userId=1" | jq '.[0] | {agent_id, permission_level, inherited}'
```
**Expected:** Shows all agents with admin permission (inherited from parent chain)

6. **Activity - DynamoDB:**
```bash
curl "http://localhost:3000/api/activity?limit=5" | jq '.[0] | {description, status, timestamp}'
```
**Expected:** Shows 5 recent activity events

---

### Task 3.2: Test UI in Browser

**Steps:**

1. Open http://localhost:3000 in browser
2. Verify each tab:

**Dashboard Tab:**
- ✓ Shows "14 Total Agents"
- ✓ Shows "3 Pending Approvals"
- ✓ Shows "$19,500 Monthly Budget"
- ✓ Activity Monitor shows real events (or "No Activity Yet" if DynamoDB write fails)

**Agent Registry Tab:**
- ✓ Lists all 14 agents
- ✓ Shows hierarchical structure (expandable parents)
- ✓ Shows status (green circle = active)
- ✓ Shows tier and cost

**Approvals Tab:**
- ✓ Lists 3 pending approvals
- ✓ Shows request type and details
- ✓ Approve/Reject buttons functional

**Cost Intelligence Tab:**
- ✓ Displays per-agent costs
- ✓ Shows budget limits
- ✓ Budget Alerts section populated
- ✓ "Export Report" button visible

**Permissions Tab:**
- ✓ Shows hierarchy tree
- ✓ All agents marked as "Admin" (red badges)
- ✓ Recursive inheritance working

**Audit Log Tab:**
- ✓ Shows log entries
- ✓ Search box functional
- ✓ Filter dropdown works
- ✓ Export buttons (CSV/JSON) visible

---

## Phase 4: Production Deployment

### Task 4.1: Create PR and Merge to Main

**Steps:**

1. Verify current branch:
```bash
cd /vercel/share/v0-project
git branch -a | grep "*"
```
Should show: `v0/abhayzangir1-3217f9ed`

2. Create Pull Request:
   - Go to GitHub: https://github.com/abhayzangir1/AgentOps
   - Click "Compare & pull request"
   - Base: `main`, Compare: `v0/abhayzangir1-3217f9ed`
   - Add title: "Production Ready: Recursive CTE, Dual Databases, Full CRUD"
   - Add description: Includes all features from PRD with real AWS backends

3. Click "Create pull request"

4. Once approved, click "Merge pull request" → "Confirm merge"

5. Delete the branch after merge (optional, Vercel will keep old deployments)

---

### Task 4.2: Verify Production Deployment

**Steps:**

1. Go to Vercel Dashboard for project `v0-agentops-platform-build`

2. Wait for new deployment to complete (usually 2-3 minutes)

3. Get production URL from Vercel:
```
https://v0-agentops-platform-build-[hash]-abhay-zangir.vercel.app
```

4. Test production health:
```bash
curl https://v0-agentops-platform-build-[hash]-abhay-zangir.vercel.app/api/health | jq '.'
```

5. **IMPORTANT:** Run migration on production:
```bash
curl -X POST https://v0-agentops-platform-build-[hash]-abhay-zangir.vercel.app/api/migrate
```

6. Run seed on production:
```bash
curl -X POST https://v0-agentops-platform-build-[hash]-abhay-zangir.vercel.app/api/seed
```

7. Seed DynamoDB on production:
```bash
curl -X POST https://v0-agentops-platform-build-[hash]-abhay-zangir.vercel.app/api/activity/seed
```

---

### Task 4.3: Test Production UI

**Steps:**

1. Open production URL in browser
2. Verify all tabs load and show real data
3. Test interactive features:
   - Click "Add Agent" button in Agent Registry
   - Try to approve an approval request
   - Search in Audit Log
   - Export report from Cost Intelligence

---

## Phase 5: Hackathon Submission Preparation

### Task 5.1: Capture Screenshots

**For Judges - Evidence of Real AWS Integration:**

1. **Database Configuration Screenshot:**
   - AWS Console > RDS > Databases > `aws-rds-aurora-almond-drawer-agentops`
   - Take screenshot showing:
     - Engine: Aurora PostgreSQL
     - Status: Available
     - Endpoint URL
   - Also screenshot DynamoDB table settings

2. **IAM Policy Screenshot:**
   - AWS Console > IAM > Roles > `access-apg-lime-lever-agentops`
   - Click inline policy
   - Screenshot the full policy JSON

3. **Vercel Deployment Screenshot:**
   - Vercel Dashboard showing deployed project
   - Screenshot production URL
   - Screenshot deployment logs

4. **Application Screenshots:**
   - Dashboard with real data
   - Agent Registry with 14 agents
   - Permission Hierarchy with recursive tree
   - Audit Log with search/filter
   - Cost Intelligence with budget alerts

---

### Task 5.2: Record Video Walkthrough

**Script:**

```
"AgentOps is a production-ready AI Agent governance platform built with 
Next.js 16, React 19, and dual AWS databases.

This is a live demo of the real application:

1. Dashboard - Shows 14 agents, real-time metrics from Aurora PostgreSQL
2. Agent Registry - Hierarchical agent management with status control
3. Approval Engine - Real approval queue with workflow
4. Permissions - Recursive CTE demonstrating inherited permissions
5. Cost Intelligence - Per-agent budgets with alerts from database
6. Audit Log - Immutable event log with search and export

All data is stored in Amazon Aurora PostgreSQL. Activity streams 
use DynamoDB for real-time telemetry. The app is deployed on Vercel 
with automatic scaling and CI/CD.

The backend uses recursive CTEs for permission inheritance, 
demonstrating advanced database architecture beyond basic CRUD."
```

**Recording Steps:**
1. Open production URL
2. Click through each tab slowly
3. Show API calls in console (F12 → Network)
4. Show real AWS Console windows for database proof
5. Keep video under 2 minutes

---

### Task 5.3: Prepare README for Judges

**Create file: SUBMISSION.md**

```markdown
# AgentOps - H0: Hack the Zero Stack Hackathon Submission

## Executive Summary
Enterprise AI agent governance platform demonstrating production-ready 
full-stack development with dual AWS databases, recursive SQL queries, 
and Vercel deployment.

## Technology Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js API Routes with input validation
- **Primary Database:** Amazon Aurora PostgreSQL (relational data)
- **Activity Stream:** Amazon DynamoDB (time-series telemetry)
- **Deployment:** Vercel with automatic CI/CD

## Key Features Implemented
1. **Agent Registry** - Hierarchical CRUD with status management
2. **Approval Engine** - Workflow-based request processing
3. **Cost Intelligence** - Per-agent budget tracking with alerts
4. **Audit Log** - Immutable event log with search/filter/export
5. **Permission Hierarchy** - Recursive CTE for inherited access control
6. **Real-time Activity** - DynamoDB event streaming

## Database Architecture

### Aurora PostgreSQL Tables
- `agents` - Hierarchical agent registry with budget limits
- `approvals` - Workflow queue with status transitions
- `audit_logs` - Immutable event log
- `permissions` - User-agent access with recursive inheritance

### DynamoDB Tables
- `aws-dynamodb-almond-drawer-agentops` - Activity events with EventID partition key

## Advanced Features
- **Recursive CTE Query:** `/api/permissions` walks parent chain for permission resolution
- **Input Validation:** All API endpoints validate input with custom validators
- **Error Handling:** Proper HTTP status codes with descriptive messages
- **Performance Indexes:** Database indexes on hot columns (status, created_at, budget)
- **Health Monitoring:** `/api/health` endpoint tracks database latency

## Verification of Real AWS Integration
1. Aurora PostgreSQL stores all entity data (agents, approvals, audit logs)
2. DynamoDB stores real-time activity events
3. IAM roles with least-privilege access
4. No mock data - all components show real database state or error messages
5. API endpoints directly query databases

## How to Run
1. Deploy to Vercel (CI/CD automatic)
2. POST /api/migrate (runs schema migrations)
3. POST /api/seed (populates initial data)
4. POST /api/activity/seed (seeds DynamoDB events)
5. Application ready to use

## Production Deployment
- Live at: [your-vercel-url]
- Real Aurora PostgreSQL in us-east-1
- Real DynamoDB in ap-south-1
- Vercel auto-scales based on traffic
```

---

## Phase 6: Final Checklist

### Before Submitting:

- [ ] Task 1.1 - DynamoDB IAM policy updated with PutItem permissions
- [ ] Task 2.1 - Migration endpoint runs successfully
- [ ] Task 2.2 - Seed endpoint populates 11 agents + 3 approvals
- [ ] Task 2.3 - Activity seed endpoint populates 15 DynamoDB events
- [ ] Task 3.1 - All 6 API endpoints return real data
- [ ] Task 3.2 - UI shows real data in all tabs
- [ ] Task 4.1 - PR merged to main branch
- [ ] Task 4.2 - Production deployment verified
- [ ] Task 5.1 - Screenshots captured of AWS infrastructure
- [ ] Task 5.2 - Video walkthrough recorded (< 2 minutes)
- [ ] Task 5.3 - SUBMISSION.md prepared for judges

### Proof of Real AWS for Judges:
✓ Live production URL (Vercel deployment)
✓ Real Aurora PostgreSQL queries returning 14 agents
✓ Real DynamoDB events in activity stream
✓ Recursive CTE permission queries showing inheritance
✓ AWS Console screenshots showing infrastructure

---

## Troubleshooting

### Issue: "Failed to connect to database"
**Solution:** 
1. Check Aurora PostgreSQL is running: `curl http://localhost:3000/api/health`
2. If local: verify connection string in environment
3. If production: check IAM role has necessary permissions

### Issue: "DynamoDB: No activity data"
**Solution:**
1. Verify IAM policy includes `dynamodb:PutItem` (Task 1.1)
2. Run: `curl -X POST http://localhost:3000/api/activity/seed`
3. Check DynamoDB table exists in AWS Console

### Issue: "Permissions show as empty"
**Solution:**
1. Run migration: `curl -X POST http://localhost:3000/api/migrate`
2. Run seed: `curl -X POST http://localhost:3000/api/seed`
3. Permissions are seeded with agents

### Issue: "Vercel deployment shows old version"
**Solution:**
1. Run migrations on production after deploy
2. Run seed on production to populate data
3. Clear browser cache (Cmd+Shift+Delete)
4. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

---

## Support

All code is committed to: `https://github.com/abhayzangir1/AgentOps`

Current branch: `v0/abhayzangir1-3217f9ed`
Main branch: `main` (production)

For issues, check Vercel deployment logs or GitHub Actions CI/CD.
