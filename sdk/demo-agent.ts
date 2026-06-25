#!/usr/bin/env node

/**
 * Demo Agent - Proof of concept AI agent using AgentOps governance
 * 
 * This demonstrates how a real agent (running locally, in cloud, or enterprise)
 * integrates with AgentOps to:
 * 1. Check if actions are allowed before executing (governance gate)
 * 2. Wait for human approval if required
 * 3. Report activity back to the platform
 * 
 * Usage:
 *   export AGENTOPS_KEY=agk_...
 *   export AGENTOPS_URL=https://v0-agentops-platform-build.vercel.app
 *   node demo-agent.ts
 */

import AgentGateway from './agent-sdk'

const BASE_URL = process.env.AGENTOPS_URL || 'http://localhost:3000'
const API_KEY = process.env.AGENTOPS_KEY

if (!API_KEY) {
  console.error('Error: AGENTOPS_KEY environment variable is required')
  console.error('Example:')
  console.error('  export AGENTOPS_KEY=agk_b2aplih0j1q_jd2o7oo0orf')
  console.error('  export AGENTOPS_URL=https://v0-agentops-platform-build.vercel.app')
  process.exit(1)
}

const gateway = new AgentGateway({
  baseUrl: BASE_URL,
  apiKey: API_KEY,
  agentName: 'demo-agent-1',
  timeout: 10000,
})

/**
 * Simulate a read operation (low-risk, auto-approved)
 */
async function readDatabase() {
  console.log('\n[Demo] Action 1: Read database (low-risk, auto-approve expected)')

  const result = await gateway.executeWithGovernance(
    {
      action_type: 'read_database',
      estimated_cost: 0.10,
      requested_scope: 'read',
      metadata: { table: 'users', limit: 100 },
    },
    async () => {
      // Simulate reading
      await new Promise(resolve => setTimeout(resolve, 500))
      return { rows: 42, query_time_ms: 234 }
    },
  )

  if (result.executed) {
    console.log(`✓ Success: Read 42 rows`)
  } else {
    console.log(`✗ Denied: ${result.reason}`)
  }

  return result
}

/**
 * Simulate a moderate-cost action (budget check)
 */
async function processPayments() {
  console.log('\n[Demo] Action 2: Process payments ($50, may require approval)')

  const result = await gateway.executeWithGovernance(
    {
      action_type: 'process_payment',
      estimated_cost: 50.00,
      requested_scope: 'payments',
      metadata: { count: 5, total_usd: 1250 },
    },
    async () => {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 800))
      return { processed: 5, total: 1250 }
    },
    { maxWaitMs: 60000, pollIntervalMs: 2000 },
  )

  if (result.executed) {
    console.log(`✓ Success: Processed ${(result.result as any)?.processed || '?'} payments`)
  } else {
    console.log(`✗ Denied: ${result.reason}`)
  }

  return result
}

/**
 * Simulate a high-cost risky action (delete with high cost)
 * This will likely require HITL approval
 */
async function deleteOldRecords() {
  console.log('\n[Demo] Action 3: Delete old records ($250, likely requires approval)')
  console.log('[Demo] Watch the dashboard for a new item in the Approvals inbox...')

  const result = await gateway.executeWithGovernance(
    {
      action_type: 'delete_records',
      estimated_cost: 250.00,
      requested_scope: 'admin',
      metadata: { table: 'logs', before_date: '2024-01-01', expected_count: 50000 },
    },
    async () => {
      // Simulate deletion
      await new Promise(resolve => setTimeout(resolve, 1200))
      return { deleted: 50000, freed_gb: 45.2 }
    },
    { maxWaitMs: 120000, pollIntervalMs: 3000 }, // Wait up to 2 min for human approval
  )

  if (result.executed) {
    console.log(`✓ Success: Deleted ${(result.result as any)?.deleted || '?'} records`)
  } else if ((result.decision as any)?.status === 'pending') {
    console.log(`⏳ Still pending: Action awaiting human approval in the dashboard`)
    console.log(`   Dashboard: ${BASE_URL}/dashboard → Approvals tab`)
  } else {
    console.log(`✗ Denied: ${result.reason}`)
  }

  return result
}

/**
 * Demonstrate an action that will fail (e.g., unknown scope)
 */
async function unauthorizedScope() {
  console.log('\n[Demo] Action 4: Try operation outside agent scope (should be denied)')

  const result = await gateway.executeWithGovernance(
    {
      action_type: 'drain_production_db',
      estimated_cost: 10000.00,
      requested_scope: 'superuser', // Not in agent's allowed scopes
      metadata: { environment: 'prod' },
    },
    async () => {
      throw new Error('Should not execute')
    },
  )

  if (result.executed) {
    console.log(`✗ ERROR: This should have been denied!`)
  } else {
    console.log(`✓ Correctly denied: ${result.reason}`)
  }

  return result
}

/**
 * Main demo flow
 */
async function main() {
  console.log('='.repeat(70))
  console.log('AgentOps Demo Agent')
  console.log('='.repeat(70))
  console.log(`Gateway: ${BASE_URL}`)
  console.log(`API Key: ${API_KEY.slice(0, 20)}...`)

  try {
    // Run demo actions in sequence
    await readDatabase()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await processPayments()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await deleteOldRecords()
    await new Promise(resolve => setTimeout(resolve, 1000))

    await unauthorizedScope()

    console.log('\n' + '='.repeat(70))
    console.log('Demo complete!')
    console.log('='.repeat(70))
    console.log('\nNext steps:')
    console.log(`1. Open dashboard: ${BASE_URL}`)
    console.log('2. Check "Activity" tab to see all reported actions')
    console.log('3. Check "Approvals" tab to see pending decisions')
    console.log('4. Approve/deny actions and watch this agent respond')
    console.log('')
  } catch (error) {
    console.error('\nDemo failed:', error)
    process.exit(1)
  }
}

main()
