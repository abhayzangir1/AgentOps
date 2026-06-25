/**
 * AgentOps Agent SDK
 * 
 * Integrate your AI agent with AgentOps governance platform.
 * 
 * Usage:
 * ```
 * import { AgentGateway } from './agent-sdk'
 * 
 * const gateway = new AgentGateway({
 *   baseUrl: 'https://v0-agentops-platform-build.vercel.app',
 *   apiKey: 'agk_b2aplih0j1q_jd2o7oo0orf'
 * })
 * 
 * // Check if action is allowed before executing
 * const decision = await gateway.requestDecision({
 *   action_type: 'send_email',
 *   estimated_cost: 0.50,
 *   requested_scope: 'email',
 *   metadata: { recipient: 'user@example.com' }
 * })
 * 
 * if (decision.status === 'pending') {
 *   // Action requires human approval - poll for decision
 *   const approval = await gateway.pollDecision(decision.request_id, {
 *     maxWaitMs: 60000,
 *     pollIntervalMs: 2000
 *   })
 *   
 *   if (approval.status === 'approved') {
 *     // Execute the action
 *     await sendEmail(...)
 *     
 *     // Report success
 *     await gateway.reportActivity({
 *       action_type: 'send_email',
 *       cost: 0.50,
 *       status: 'success',
 *       metadata: { recipient: 'user@example.com' }
 *     })
 *   } else {
 *     console.log('Action denied by operator')
 *   }
 * } else if (decision.status === 'approved') {
 *   // Auto-approved - execute immediately
 *   await sendEmail(...)
 *   await gateway.reportActivity({...})
 * } else {
 *   // Denied due to budget/scope/risk - do not execute
 *   console.log('Action not approved:', decision.reason)
 * }
 * ```
 */

export interface GatewayConfig {
  baseUrl: string
  apiKey: string
  agentName?: string
  timeout?: number // ms, default 30000
}

export interface GuardRequest {
  action_type: string
  estimated_cost?: number
  requested_scope?: string
  metadata?: Record<string, unknown>
}

export interface GuardResponse {
  status: 'approved' | 'denied' | 'pending'
  reason?: string
  request_id?: string
}

export interface ActivityReport {
  action_type: string
  cost?: number
  status?: 'success' | 'failed' | 'pending'
  description?: string
  metadata?: Record<string, unknown>
}

export interface PollOptions {
  maxWaitMs?: number
  pollIntervalMs?: number
}

export interface DecisionStatus {
  status: 'pending' | 'approved' | 'denied'
  reason?: string
}

export class AgentGateway {
  private baseUrl: string
  private apiKey: string
  private agentName: string
  private timeout: number

  constructor(config: GatewayConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // trim trailing slash
    this.apiKey = config.apiKey
    this.agentName = config.agentName || 'agent'
    this.timeout = config.timeout || 30000
  }

  /**
   * Request a decision from the gateway before executing an action.
   * Returns immediately with 'approved', 'denied', or 'pending' (waiting for human).
   */
  async requestDecision(request: GuardRequest): Promise<GuardResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/guard`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`Guard request failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Poll for the outcome of a pending decision.
   * Useful when requestDecision returned status='pending' and you need to wait for approval.
   */
  async getDecisionStatus(requestId: string): Promise<DecisionStatus> {
    const response = await fetch(`${this.baseUrl}/api/v1/decision/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Decision poll failed: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Poll for a pending decision with exponential backoff and timeout.
   * Resolves when decision becomes approved/denied or maxWaitMs expires.
   */
  async pollDecision(requestId: string, options: PollOptions = {}): Promise<DecisionStatus> {
    const maxWaitMs = options.maxWaitMs || 300000 // 5 min default
    const pollIntervalMs = options.pollIntervalMs || 2000 // 2 sec
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitMs) {
      const decision = await this.getDecisionStatus(requestId)

      if (decision.status !== 'pending') {
        return decision
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
    }

    // Timeout reached - return pending status
    return { status: 'pending', reason: 'Decision timeout - still awaiting approval' }
  }

  /**
   * Report the outcome of an executed action.
   * This records real activity in the AgentOps platform for auditing and billing.
   */
  async reportActivity(activity: ActivityReport): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/activity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action_type: activity.action_type,
        cost: activity.cost || 0,
        status: activity.status || 'success',
        action_description: activity.description,
        metadata: activity.metadata,
      }),
    })

    if (!response.ok) {
      throw new Error(`Activity report failed: ${response.status} ${response.statusText}`)
    }
  }

  /**
   * Execute an action with full governance: request decision, wait if pending, report activity.
   * 
   * @returns { executed: true, decision, ... } if approved or auto-allowed
   * @returns { executed: false, decision, reason } if denied
   */
  async executeWithGovernance<T>(
    request: GuardRequest,
    executeAction: () => Promise<T>,
    options: PollOptions = {},
  ): Promise<{ executed: boolean; decision: GuardResponse | DecisionStatus; result?: T; reason?: string }> {
    try {
      // Step 1: Request decision
      const decision = await this.requestDecision(request)

      // Step 2: Handle decision
      if (decision.status === 'denied') {
        return {
          executed: false,
          decision,
          reason: decision.reason || 'Action denied by governance policy',
        }
      }

      if (decision.status === 'pending') {
        // Step 3: Wait for approval
        console.log(`[${this.agentName}] Action pending approval (request_id=${decision.request_id})`)
        const approval = await this.pollDecision(decision.request_id!, options)

        if (approval.status !== 'approved') {
          return {
            executed: false,
            decision: approval,
            reason: approval.reason || `Action ${approval.status} by governance`,
          }
        }

        decision.status = 'approved'
      }

      // Step 4: Execute the action
      console.log(`[${this.agentName}] Action approved - executing`)
      const result = await executeAction()

      // Step 5: Report success
      await this.reportActivity({
        action_type: request.action_type,
        cost: request.estimated_cost,
        status: 'success',
        metadata: request.metadata,
      })

      return { executed: true, decision, result }
    } catch (error) {
      // Report failure
      await this.reportActivity({
        action_type: request.action_type,
        cost: request.estimated_cost,
        status: 'failed',
        description: error instanceof Error ? error.message : String(error),
        metadata: request.metadata,
      }).catch(() => {}) // Ignore report errors

      throw error
    }
  }
}

export default AgentGateway
