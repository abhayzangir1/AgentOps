'use client'

import { useState } from 'react'
import { Copy, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface Agent {
  id: number
  name: string
  status: string
}

interface ConnectAgentProps {
  agents: Agent[]
}

export function ConnectAgent({ agents }: ConnectAgentProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [generatedKey, setGeneratedKey] = useState<{ key: string; prefix: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [runningDemo, setRunningDemo] = useState(false)
  const [demoResult, setDemoResult] = useState<string | null>(null)

  const handleGenerateKey = async () => {
    if (!selectedAgentId) return

    setLoading(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `SDK Integration Key`,
          agent_id: selectedAgentId,
        }),
      })

      if (!res.ok) throw new Error('Failed to generate key')

      const data = await res.json()
      setGeneratedKey({ key: data.secret, prefix: data.key.key_prefix })
    } catch (error) {
      console.error('Error generating key:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRunDemo = async () => {
    if (!selectedAgentId || !generatedKey) return

    setRunningDemo(true)
    setDemoResult(null)

    try {
      // Simple demo: make a guard request
      const res = await fetch('/api/v1/guard', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${generatedKey.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_type: 'read_data',
          estimated_cost: 1.0,
          requested_scope: 'read',
          metadata: { demo: true },
        }),
      })

      if (!res.ok) throw new Error(`Guard request failed: ${res.status}`)

      const decision = await res.json()
      setDemoResult(`Decision: ${decision.status}\n${decision.reason || 'Action verified'}`)

      // Try to report activity
      await fetch('/api/v1/activity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${generatedKey.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_type: 'read_data',
          cost: 1.0,
          status: 'success',
          action_description: 'Demo read operation',
        }),
      })
    } catch (error) {
      setDemoResult(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setRunningDemo(false)
    }
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)
  const curlExample = generatedKey
    ? `curl -X POST https://v0-agentops-platform-build.vercel.app/api/v1/guard \\
  -H "Authorization: Bearer ${generatedKey.key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action_type": "send_email",
    "estimated_cost": 0.50,
    "requested_scope": "email"
  }'`
    : ''

  const jsExample = generatedKey
    ? `import { AgentGateway } from '@agentops/sdk'

const gateway = new AgentGateway({
  baseUrl: 'https://v0-agentops-platform-build.vercel.app',
  apiKey: '${generatedKey.key}'
})

// Check if action is allowed
const decision = await gateway.requestDecision({
  action_type: 'send_email',
  estimated_cost: 0.50,
  requested_scope: 'email',
  metadata: { recipient: 'user@example.com' }
})

if (decision.status === 'approved') {
  // Execute action
  await sendEmail(...)
  
  // Report to AgentOps
  await gateway.reportActivity({
    action_type: 'send_email',
    cost: 0.50,
    status: 'success'
  })
}`
    : ''

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Connect Your Agent</h1>
        <p className="text-muted-foreground mt-2">
          Integrate your AI agent with AgentOps governance. Your agent will authenticate with an API key and request approval for risky actions.
        </p>
      </div>

      {/* Step 1: Select Agent */}
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Step 1: Select Agent</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose which agent to configure</p>
        </div>

        <div className="grid gap-2">
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No agents available. Create an agent in the Agent Registry first.
            </p>
          ) : (
            agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgentId(agent.id)
                  setGeneratedKey(null)
                  setDemoResult(null)
                }}
                className={`p-4 border rounded-lg text-left transition ${
                  selectedAgentId === agent.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{agent.name}</div>
                <div className="text-sm text-muted-foreground">Status: {agent.status}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedAgent && (
        <>
          {/* Step 2: Generate Key */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Step 2: Generate API Key</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create a secret key for {selectedAgent.name} to use
              </p>
            </div>

            {!generatedKey ? (
              <button
                onClick={handleGenerateKey}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate API Key
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">API Key (shown once)</p>
                  <div className="font-mono text-sm break-all">{generatedKey.key}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedKey.key)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm flex items-center gap-2"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Key'}
                </button>
              </div>
            )}
          </div>

          {/* Step 3: Integration Guide */}
          {generatedKey && (
            <div className="bg-card border rounded-lg p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Step 3: Integrate with Your Agent</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Use one of these examples to integrate AgentOps with your agent code
                </p>
              </div>

              {/* Curl Example */}
              <div>
                <h3 className="font-medium mb-2">Using curl (any language)</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm font-mono">{curlExample}</pre>
                </div>
                <button
                  onClick={() => copyToClipboard(curlExample)}
                  className="mt-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm flex items-center gap-2"
                >
                  <Copy className="w-3 h-3" />
                  Copy curl
                </button>
              </div>

              {/* JavaScript Example */}
              <div>
                <h3 className="font-medium mb-2">Using JavaScript/Node.js SDK</h3>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm font-mono">{jsExample}</pre>
                </div>
                <button
                  onClick={() => copyToClipboard(jsExample)}
                  className="mt-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm flex items-center gap-2"
                >
                  <Copy className="w-3 h-3" />
                  Copy code
                </button>
              </div>

              {/* Documentation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-900">Full SDK Documentation</div>
                    <p className="text-blue-800 mt-1">
                      See <code className="bg-white px-1 py-0.5 rounded">sdk/agent-sdk.ts</code> for the complete SDK with all methods and examples. The SDK handles decision polling, approval waiting, and activity reporting.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Test Connection */}
          {generatedKey && (
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Step 4: Test Connection</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Run a test to verify your agent can connect to AgentOps
                </p>
              </div>

              <button
                onClick={handleRunDemo}
                disabled={runningDemo}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {runningDemo && <Loader2 className="w-4 h-4 animate-spin" />}
                Run Test Request
              </button>

              {demoResult && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm font-mono whitespace-pre-wrap">{demoResult}</pre>
                </div>
              )}
            </div>
          )}

          {/* Flow Diagram */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">How It Works</h2>

            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <div className="font-medium">Agent requests action</div>
                  <p className="text-sm text-muted-foreground">
                    Your agent calls `/api/v1/guard` with action details and API key
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <div className="font-medium">AgentOps checks governance</div>
                  <p className="text-sm text-muted-foreground">
                    Scope validation, budget enforcement, risk assessment
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <div className="font-medium">Immediate or pending decision</div>
                  <p className="text-sm text-muted-foreground">
                    Low-risk actions auto-approve. High-risk actions await human review.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <div className="font-medium">Agent reports activity</div>
                  <p className="text-sm text-muted-foreground">
                    After execution, agent calls `/api/v1/activity` with results
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  5
                </div>
                <div>
                  <div className="font-medium">Dashboard shows live data</div>
                  <p className="text-sm text-muted-foreground">
                    Activity, approvals, audit trail, and cost tracking all updated in real-time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
