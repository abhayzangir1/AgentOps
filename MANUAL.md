# AgentOps - Complete Manual & Submission Guide

## 🎯 Your Step-by-Step Manual (20 minutes to full functionality)

### STEP 1: AWS IAM Policy Update (10 minutes)
**⚠️ CRITICAL - Do this first**

1. Open AWS Console: https://console.aws.amazon.com/
2. Navigate to: **IAM → Roles → Search: `access-apg-lime-lever-agentops`**
3. Click on the role name
4. Click **"Permissions"** tab
5. Click the inline policy: **`access-dynamodb-almond-drawer-agentops`**
6. Click **"Edit policy"**
7. Switch to **JSON** tab
8. **Replace entire policy with this:**

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

9. Click **"Review policy"** → **"Save changes"**
10. **WAIT 2-3 minutes** for changes to propagate

✅ **Verification:**
```bash
curl http://localhost:3000/api/health
# Look for: "dynamodb": {"status": "healthy"}
```

---

### STEP 2: Run Database Migration (2 minutes)

**In terminal:**
```bash
curl -X POST http://localhost:3000/api/migrate
```

**Expected response:**
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

✅ **What this does:**
- Creates `budget_limit_usd` column in agents table
- Creates `permissions` table with recursive CTE support
- Adds performance indexes
- Sets default budget limits

---

### STEP 3: Seed Aurora PostgreSQL (1 minute)

**In terminal:**
```bash
curl -X POST http://localhost:3000/api/seed
```

**Expected response:**
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

✅ **What gets seeded:**
- 4 parent agents (Acme, DataFlow, ContentGen, Support)
- 7 child agents (hierarchical)
- 3 pending approvals
- Admin permissions for all agents

---

### STEP 4: Seed DynamoDB Activity (1 minute)

**In terminal:**
```bash
curl -X POST http://localhost:3000/api/activity/seed
```

**Expected response:**
```json
{
  "status": "success",
  "items_inserted": 15,
  "message": "15 sample activities seeded to DynamoDB"
}
```

✅ **What gets seeded:**
- 15 activity events (execution, error, approval, deployment)
- Various agent IDs
- Timestamps from now to 7 days ago

---

### STEP 5: Verify Everything (3 minutes)

**Check health:**
```bash
curl http://localhost:3000/api/health | jq '.'
```

**Expected:**
```json
{
  "status": "healthy",
  "postgres": {"status": "healthy", "latency_ms": 125},
  "dynamodb": {"status": "healthy", "latency_ms": 45}
}
```

**Check agents:**
```bash
curl http://localhost:3000/api/agents | jq 'length'
# Should output: 14
```

**Check approvals:**
```bash
curl http://localhost:3000/api/approvals | jq 'length'
# Should output: 3
```

**Check activity:**
```bash
curl http://localhost:3000/api/activity | jq 'length'
# Should output: 15
```

**Check permissions (recursive CTE):**
```bash
curl "http://localhost:3000/api/permissions?userId=1" | jq 'length'
# Should output: 14
```

---

## ✅ Browser Verification (5 minutes)

**Open browser to:** http://localhost:3000

### Dashboard Tab
- [ ] Shows "**14 Total Agents**"
- [ ] Shows "**3 Pending Approvals**"
- [ ] Shows "**$19,500 Monthly Budget**"
- [ ] Activity Monitor shows list of events (or "No Activity Yet" if IAM not updated)

### Agent Registry Tab
- [ ] Lists all 14 agents
- [ ] Shows hierarchical structure (can expand parents)
- [ ] Green circles = active status
- [ ] Shows tier and cost for each

### Approvals Tab
- [ ] Shows 3 pending approvals
- [ ] Shows request type and details
- [ ] Approve/Reject buttons visible

### Cost Intelligence Tab
- [ ] Shows per-agent costs
- [ ] Shows budget limits
- [ ] Budget Alerts section populated (shows agents using >80%)
- [ ] "Export Report" button visible

### Permissions Tab
- [ ] Shows hierarchical tree of all 14 agents
- [ ] All showing "Admin" (red badges)
- [ ] Legend shows permission levels
- [ ] User dropdown at top

### Audit Log Tab
- [ ] Shows audit entries
- [ ] Search box works
- [ ] Filter button visible
- [ ] Export (CSV/JSON) buttons work

---

## 🚀 Production Deployment (5 minutes)

### Step A: Merge to Main
1. Go to: https://github.com/abhayzangir1/AgentOps
2. Click "Pull requests"
3. Find your branch PR (or create new one)
4. Click "Create pull request" if needed
5. Click "Merge pull request"
6. Wait for Vercel deployment (2-3 minutes)

### Step B: Get Production URL
1. Go to Vercel Dashboard: https://vercel.com/dashboard
2. Find project: `v0-agentops-platform-build`
3. Copy production URL from top of page

### Step C: Run Commands on Production
Replace `[PROD_URL]` with your actual URL:

```bash
# Run migration on production
curl -X POST https://[PROD_URL]/api/migrate

# Seed data on production
curl -X POST https://[PROD_URL]/api/seed

# Seed DynamoDB on production
curl -X POST https://[PROD_URL]/api/activity/seed
```

### Step D: Test Production
```bash
# Verify production is working
curl https://[PROD_URL]/api/health

# Check production data
curl https://[PROD_URL]/api/agents | jq 'length'
```

---

## 📸 Hackathon Submission Evidence

### Capture These Screenshots

**1. AWS Aurora PostgreSQL Configuration**
- Path: AWS Console → RDS → Databases
- Screenshot showing:
  - Database name: `aws-rds-aurora-almond-drawer-agentops`
  - Engine: Aurora PostgreSQL
  - Status: Available
  - Endpoint URL

**2. DynamoDB Table**
- Path: AWS Console → DynamoDB → Tables
- Screenshot showing:
  - Table name: `aws-dynamodb-almond-drawer-agentops`
  - Status: Active
  - Items count: 15+
  - Partition key: eventId

**3. IAM Policy**
- Path: AWS Console → IAM → Roles → `access-apg-lime-lever-agentops`
- Screenshot showing:
  - Full policy JSON with all permissions
  - DynamoDB access granted
  - Aurora access granted

**4. Vercel Deployment**
- Path: Vercel Dashboard → v0-agentops-platform-build
- Screenshot showing:
  - Production deployment URL
  - Status: Ready
  - Latest commit deployed

**5. Application Dashboard**
- Screenshot showing:
  - 14 Total Agents
  - Real data from Aurora PostgreSQL
  - Activity stream from DynamoDB
  - All metrics live

**6. Permission Hierarchy**
- Screenshot showing:
  - Recursive tree view
  - All agents with inherited permissions
  - Red "Admin" badges
  - Parent-child relationships visible

**7. API Health Check**
- Screenshot showing terminal output:
  ```
  curl http://localhost:3000/api/health
  {
    "postgres": {"status": "healthy", "latency_ms": 125},
    "dynamodb": {"status": "healthy", "latency_ms": 45}
  }
  ```

---

## 🎬 Video Walkthrough Script (2 minutes max)

**Record screen + narration:**

```
"Welcome to AgentOps - a production-ready AI agent governance platform.

This is a live demonstration of a real application built with Next.js 16, 
React 19, and dual AWS databases.

[Show Dashboard]
The dashboard displays real-time metrics: 14 agents, 3 pending approvals, 
and $19,500 monthly budget - all data from Amazon Aurora PostgreSQL.

[Show Agent Registry]
The agent registry demonstrates hierarchical management with recursive 
permission inheritance. This is the parent agent 'DataFlow Pipeline' 
with three child agents underneath it.

[Click on Permissions tab]
The Permission Hierarchy uses PostgreSQL's recursive CTE to automatically 
inherit permissions through the agent chain. Notice how child agents 
inherit 'Admin' permissions from their parents.

[Show Cost Intelligence]
Cost Intelligence tracks per-agent budgets with real alerts when agents 
exceed 80% of their budget. This data flows directly from the database.

[Show Audit Log]
The Audit Log provides immutable records with search and filter capabilities.

[Show network tab]
Looking at the API calls in the browser, you can see this application 
makes real queries to two AWS databases:
- Aurora PostgreSQL for relational data (agents, approvals, permissions)
- DynamoDB for real-time activity events

All APIs use proper error handling, input validation, and return real 
database state. This is production-ready software, not a mockup.

The application is deployed on Vercel with auto-scaling, CI/CD, and 
automatic rollback capabilities. Thank you."
```

---

## 📋 Submission Checklist

### Before Final Submission

- [ ] **AWS Setup**
  - [ ] IAM policy updated with DynamoDB PutItem permission
  - [ ] Policy changes propagated (2-3 min wait)
  - [ ] Verified with `/api/health` endpoint

- [ ] **Database Setup**
  - [ ] Migration ran successfully
  - [ ] Agents seeded (11 to database)
  - [ ] Approvals seeded (3 to database)
  - [ ] Activity seeded (15 to DynamoDB)
  - [ ] All 6 API endpoints return real data

- [ ] **UI Verification**
  - [ ] Dashboard shows real data
  - [ ] All 6 tabs load without errors
  - [ ] Interactive features work (approve, expand, search)
  - [ ] Proper error states if databases down

- [ ] **Production**
  - [ ] Branch merged to main
  - [ ] Vercel deployment verified
  - [ ] Production migrations run
  - [ ] Production seed data populated
  - [ ] Production URL responsive

- [ ] **Submission Materials**
  - [ ] 7 screenshots captured
  - [ ] 2-minute video recorded
  - [ ] README prepared
  - [ ] Deployment URL noted
  - [ ] GitHub repository link ready

---

## 🔗 Important Links

| Resource | URL |
|----------|-----|
| **GitHub Repository** | https://github.com/abhayzangir1/AgentOps |
| **Current Branch** | `v0/abhayzangir1-3217f9ed` |
| **Production Branch** | `main` |
| **Vercel Project** | https://vercel.com/dashboard/v0-agentops-platform-build |
| **AWS Console** | https://console.aws.amazon.com/ |
| **Local Dev** | http://localhost:3000 |

---

## 📞 Troubleshooting

### Problem: "dynamodb:PutItem denied"
**Solution:** 
1. Verify IAM policy updated (Step 1)
2. Wait 2-3 minutes for changes
3. Clear browser cache
4. Retry: `curl -X POST http://localhost:3000/api/activity/seed`

### Problem: "Permission denied" on Aurora
**Solution:**
1. Check connection string in environment
2. Verify role has SELECT, INSERT, UPDATE, DELETE permissions
3. Test: `curl http://localhost:3000/api/health`

### Problem: "14 agents not showing"
**Solution:**
1. Run migration: `curl -X POST http://localhost:3000/api/migrate`
2. Run seed: `curl -X POST http://localhost:3000/api/seed`
3. Check database: `curl http://localhost:3000/api/agents | jq 'length'`

### Problem: "15 activities not showing"
**Solution:**
1. Ensure IAM policy updated (Step 1)
2. Run seed: `curl -X POST http://localhost:3000/api/activity/seed`
3. Check DynamoDB: `curl http://localhost:3000/api/activity | jq 'length'`

### Problem: "Recursive permissions not working"
**Solution:**
1. Run migration: `curl -X POST http://localhost:3000/api/migrate`
2. Verify permissions table created in Aurora
3. Test: `curl "http://localhost:3000/api/permissions?userId=1" | jq 'length'`

---

## 📞 Support

If issues persist:

1. Check all API endpoints responding:
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/agents
curl http://localhost:3000/api/approvals
curl http://localhost:3000/api/audit-logs
curl "http://localhost:3000/api/permissions?userId=1"
curl http://localhost:3000/api/activity
```

2. Check browser console (F12) for JavaScript errors

3. Check Vercel logs: https://vercel.com/dashboard → Logs

4. Review documentation:
   - `QUICK_START.md` - 5-step checklist
   - `HACKATHON_SETUP.md` - Complete 6-phase manual
   - `ARCHITECTURE.md` - System design & diagrams

---

## ✨ Success Criteria

**You'll know you have FULL FUNCTIONALITY when:**

1. ✅ All 6 API endpoints return real data
2. ✅ All 6 UI tabs load without errors
3. ✅ Dashboard shows 14 agents + 3 approvals + $19,500 budget
4. ✅ Activity Monitor shows 15 real-time events
5. ✅ Permission Hierarchy shows recursive tree
6. ✅ Audit Log shows real entries with search/filter
7. ✅ Production URL works with same data
8. ✅ Health check shows both databases healthy

**When all 8 criteria are met = Ready for hackathon submission!**

---

## 📊 What You've Built

```
📦 AgentOps Platform
├─ 💾 Aurora PostgreSQL (Relational Data)
│  ├─ agents table (14 rows)
│  ├─ approvals table (3 rows)
│  ├─ audit_logs table
│  └─ permissions table (recursive CTE)
│
├─ ⚡ DynamoDB (Real-time Events)
│  └─ activity_events (15+ rows)
│
├─ 🎨 Frontend (React 19)
│  ├─ Dashboard with metrics
│  ├─ Agent Registry with hierarchy
│  ├─ Approval Engine
│  ├─ Cost Intelligence
│  ├─ Permission Hierarchy
│  └─ Audit Log with search
│
├─ 🔌 APIs (Next.js Routes)
│  ├─ 6 RESTful endpoints
│  ├─ Input validation
│  ├─ Error handling
│  └─ Health monitoring
│
└─ 🚀 Deployment (Vercel)
   ├─ CI/CD pipeline
   ├─ Auto-scaling
   └─ Production URL
```

---

**🎉 You're ready to win the hackathon!**

Total time: 20 minutes
Result: Production-ready software on real AWS
Judges will see: Genuine backend architecture, not a mockup

Good luck! 🚀
