'use client'

import { useState, useEffect } from 'react'
import { Copy, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { copyToClipboard } from '@/lib/utils'

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
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [runningDemo, setRunningDemo] = useState(false)
  const [demoResult, setDemoResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [baseUrl, setBaseUrl] = useState('')

  // Resolve the deployment origin at runtime so examples work in any environment
  useEffect(() => {
    if (typeof window !== 'undefined') setBaseUrl(window.location.origin)
  }, [])

  const handleGenerateKey = async () => {
    if (!selectedAgentId) return

    setLoading(true)
    setKeyError(null)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `SDK Integration Key`,
          agent_id: selectedAgentId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to generate key (${res.status})`)
      }

      const data = await res.json()
      setGeneratedKey({ key: data.secret, prefix: data.key.key_prefix })
    } catch (error) {
      setKeyError(error instanceof Error ? error.message : 'Failed to generate key')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string, field: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    }
  }

  const handleRunDemo = async () => {
    if (!selectedAgentId || !generatedKey) return

    setRunningDemo(true)
    setDemoResult(null)

    try {
      const res = await fetch('/api/v1/guard', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${generatedKey.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_type: 'read',
          estimated_cost: 1.0,
          requested_scope: 'read',
          metadata: { demo: true },
        }),
      })

      const decision = await res.json().catch(() => ({}))
      if (!res.ok && res.status !== 202 && res.status !== 403) {
        throw new Error(decision.error || `Guard request failed: ${res.status}`)
      }

      setDemoResult({
        ok: decision.decision === 'approved',
        text: `Decision: ${decision.decision ?? 'unknown'}\n${decision.reason ?? 'Action verified'}`,
      })

      // Report the activity so it appears in the live telemetry feed
      await fetch('/api/v1/activity', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${generatedKey.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_type: 'read',
          cost: 1.0,
          status: 'success',
          action_description: 'Demo read operation',
        }),
      }).catch(() => {})
    } catch (error) {
      setDemoResult({
        ok: false,
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setRunningDemo(false)
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId)
  const origin = baseUrl || 'https://your-agentops-deployment.vercel.app'

  const curlExample = generatedKey
    ? `curl -X POST ${origin}/api/v1/guard \\
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
  baseUrl: '${origin}',
  apiKey: '${generatedKey.key}'
})

// Check if action is allowed
const decision = await gateway.requestDecision({
  action_type: 'send_email',
  estimated_cost: 0.50,
  requested_scope: 'email',
  metadata: { recipient: 'user@example.com' }
})

if (decision.decision === 'approved') {
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

  const steps = [
    { title: 'Agent requests action', desc: 'Your agent calls /api/v1/guard with action details and API key' },
    { title: 'AgentOps checks governance', desc: 'Scope validation, budget enforcement, risk assessment' },
    { title: 'Immediate or pending decision', desc: 'Low-risk actions auto-approve. High-risk actions await human review.' },
    { title: 'Agent reports activity', desc: 'After execution, agent calls /api/v1/activity with results' },
    { title: 'Dashboard shows live data', desc: 'Activity, approvals, audit trail, and cost tracking updated in real-time' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Connect Your Agent</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Integrate your AI agent with AgentOps governance. Your agent authenticates with an API key and
          requests approval for risky actions.
        </p>
      </div>

      {/* Step 1: Select Agent */}
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Step 1: Select Agent</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose which agent to configure</p>
        </div>

        <div className="grid gap-2">
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No agents available. Create an agent in the Agent Registry first.
            </p>
          ) : (
            agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  setSelectedAgentId(agent.id)
                  setGeneratedKey(null)
                  setDemoResult(null)
                  setKeyError(null)
                }}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedAgentId === agent.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent/40 hover:bg-muted/30'
                }`}
              >
                <div className="font-medium">{agent.name}</div>
                <div className="text-sm text-muted-foreground">Status: {agent.status}</div>
              </button>
            ))
          )}
        </div>
      </section>

      {selectedAgent && (
        <>
          {/* Step 2: Generate Key */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Step 2: Generate API Key</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Create a secret key for {selectedAgent.name} to use
              </p>
            </div>

            {keyError && (
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {keyError}
              </div>
            )}

            {!generatedKey ? (
              <button
                onClick={handleGenerateKey}
                disabled={loading}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate API Key
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-muted/40 border border-border p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">API Key (shown once — store it securely)</p>
                  <div className="font-mono text-sm break-all text-foreground">{generatedKey.key}</div>
                </div>
                <button
                  onClick={() => handleCopy(generatedKey.key, 'key')}
                  className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-muted rounded-lg text-sm flex items-center gap-2 transition"
                >
                  {copiedField === 'key' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedField === 'key' ? 'Copied!' : 'Copy Key'}
                </button>
              </div>
            )}
          </section>

          {/* Step 3: Integration Guide */}
          {generatedKey && (
            <section className="bg-card border border-border rounded-xl p-5 space-y-6">
              <div>
                <h2 className="text-lg font-semibold">Step 3: Integrate with Your Agent</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Use one of these examples to integrate AgentOps with your agent code
                </p>
              </div>

              {/* Curl Example */}
              <div>
                <h3 className="font-medium mb-2 text-sm">Using curl (any language)</h3>
                <div className="bg-background border border-border p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm font-mono text-foreground">{curlExample}</pre>
                </div>
                <button
                  onClick={() => handleCopy(curlExample, 'curl')}
                  className="mt-2 px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-muted rounded text-sm flex items-center gap-2 transition"
                >
                  {copiedField === 'curl' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'curl' ? 'Copied!' : 'Copy curl'}
                </button>
              </div>

              {/* JavaScript Example */}
              <div>
                <h3 className="font-medium mb-2 text-sm">Using JavaScript/Node.js SDK</h3>
                <div className="bg-background border border-border p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm font-mono text-foreground">{jsExample}</pre>
                </div>
                <button
                  onClick={() => handleCopy(jsExample, 'js')}
                  className="mt-2 px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-muted rounded text-sm flex items-center gap-2 transition"
                >
                  {copiedField === 'js' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === 'js' ? 'Copied!' : 'Copy code'}
                </button>
              </div>

              {/* Documentation note */}
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-foreground">Full SDK Reference</div>
                    <p className="text-muted-foreground mt-1">
                      See{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-foreground">sdk/agent-sdk.ts</code> for the
                      complete SDK with all methods. The SDK handles decision polling, approval waiting, and
                      activity reporting.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Step 4: Test Connection */}
          {generatedKey && (
            <section className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Step 4: Test Connection</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Run a test to verify your agent can connect to AgentOps
                </p>
              </div>

              <button
                onClick={handleRunDemo}
                disabled={runningDemo}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition"
              >
                {runningDemo && <Loader2 className="w-4 h-4 animate-spin" />}
                Run Test Request
              </button>

              {demoResult && (
                <div
                  className={`p-4 rounded-lg border ${
                    demoResult.ok
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-muted/40 border-border'
                  }`}
                >
                  <pre className="text-sm font-mono whitespace-pre-wrap text-foreground">{demoResult.text}</pre>
                </div>
              )}
            </section>
          )}

          {/* Flow Diagram */}
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold">How It Works</h2>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{step.title}</div>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
