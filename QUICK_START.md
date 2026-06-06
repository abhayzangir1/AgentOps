# Quick Start Checklist - 5 Critical Tasks

## ⚠️ DO THESE FIRST (In Order)

### 1️⃣ AWS IAM Update (10 minutes)
```
Go to: AWS Console → IAM → Roles → access-apg-lime-lever-agentops → Edit Policy
Replace with full policy that includes dynamodb:PutItem, dynamodb:BatchWriteItem
WAIT 2-3 minutes for changes to propagate
```
**Why:** Without PutItem, DynamoDB activity stream won't work

---

### 2️⃣ Run Migration (2 minutes)
```bash
curl -X POST http://localhost:3000/api/migrate
```
**Expected:** All migrations applied successfully
**What it does:** Creates budget_limit_usd, permissions table, recursive CTE support

---

### 3️⃣ Seed Aurora PostgreSQL (1 minute)
```bash
curl -X POST http://localhost:3000/api/seed
```
**Expected:** 11 agents + 3 approvals seeded
**What it does:** Populates all demo data into Aurora

---

### 4️⃣ Seed DynamoDB (1 minute)
```bash
curl -X POST http://localhost:3000/api/activity/seed
```
**Expected:** 15 activity events inserted
**What it does:** Populates activity stream with real-time events

---

### 5️⃣ Verify Everything Works (3 minutes)
```bash
# Test each database
curl http://localhost:3000/api/health | jq '.postgres.status, .dynamodb.status'

# Test Aurora data
curl http://localhost:3000/api/agents | jq 'length'  # Should be 14
curl http://localhost:3000/api/approvals | jq 'length'  # Should be 3

# Test DynamoDB data
curl http://localhost:3000/api/activity | jq 'length'  # Should be 15

# Test recursive CTE
curl "http://localhost:3000/api/permissions?userId=1" | jq 'length'  # Should be 14
```

---

## ✅ Verification in Browser

Open http://localhost:3000 and check:

| Tab | Verification |
|-----|--------------|
| Dashboard | Shows 14 Total Agents, 3 Pending Approvals, Activity list populated |
| Agent Registry | Lists all 14 agents with hierarchy, statuses, costs |
| Approvals | Shows 3 pending requests with details |
| Cost Intelligence | Budget alerts populated, Export button visible |
| Permissions | Shows hierarchical tree with Admin permissions |
| Audit Log | Search/filter functional, export buttons visible |

If all ✓, you have **FULL FUNCTIONALITY** 🎉

---

## 🚀 Production Deployment

1. Merge branch to main via GitHub PR
2. Vercel auto-deploys (2-3 minutes)
3. Run the same commands on production URL:
   ```bash
   # Note: Replace with actual production URL from Vercel
   curl -X POST https://your-production-url/api/migrate
   curl -X POST https://your-production-url/api/seed
   curl -X POST https://your-production-url/api/activity/seed
   ```
4. Verify production URL loads with real data

---

## 📸 For Hackathon Submission

Capture screenshots of:
1. AWS Console showing Aurora PostgreSQL database
2. AWS Console showing DynamoDB table configuration
3. AWS IAM policy with full permissions
4. Vercel deployment dashboard
5. Application UI showing all 14 agents
6. Recursive permission hierarchy tree
7. API health check showing both databases healthy

---

## ⏱️ Time Estimate: 20 minutes total
- AWS IAM: 10 min (includes wait time)
- Database setup: 8 min
- Verification: 2 min

**Total effort: ~20 minutes**
**Result: Production-ready app with real AWS databases**
