'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Shield, BarChart3, Clock } from 'lucide-react'

type Tab = 'how-to' | 'terms'

function Callout({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'accent' | 'warning' | 'danger' | 'success'
  children: React.ReactNode
}) {
  const tones: Record<string, string> = {
    neutral: 'bg-muted/40 border-border',
    accent: 'bg-accent/10 border-accent/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    danger: 'bg-red-500/10 border-red-500/20',
    success: 'bg-emerald-500/10 border-emerald-500/20',
  }
  return <div className={`border rounded-lg p-4 space-y-2 ${tones[tone]}`}>{children}</div>
}

export function DocumentationPage() {
  const [tab, setTab] = useState<Tab>('how-to')

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Help &amp; Documentation</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Learn how to govern your AI agents and review the platform terms
        </p>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-muted/40 border border-border p-1">
        {(
          [
            { id: 'how-to', label: 'How-To Guide' },
            { id: 'terms', label: 'Terms & Conditions' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* HOW-TO GUIDE */}
      {tab === 'how-to' && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-8">
          <div>
            <h3 className="text-xl font-semibold">How to Use AgentOps</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete guide to governing and monitoring your AI agents
            </p>
          </div>

          {/* 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base font-semibold">1. Getting Started</h4>
            </div>
            <Callout tone="accent">
              <p className="text-sm text-foreground">
                AgentOps provides governance and monitoring for your AI agents. To get started:
              </p>
              <ol className="space-y-1.5 text-sm list-decimal list-inside ml-1 text-muted-foreground">
                <li>Sign up with your email and password</li>
                <li>You start with an empty, isolated workspace</li>
                <li>Create or connect your first agent</li>
                <li>Set budget limits and approval rules</li>
                <li>Your agent is now governed by the platform</li>
              </ol>
            </Callout>
          </div>

          {/* 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base font-semibold">2. Adding Agents</h4>
            </div>
            <Callout tone="warning">
              <p className="text-sm font-semibold text-foreground">Simple process:</p>
              <ol className="space-y-1.5 text-sm list-decimal list-inside ml-1 text-muted-foreground">
                <li>Go to the &quot;Agent Registry&quot; tab</li>
                <li>Click &quot;Add Agent&quot;</li>
                <li>Enter name, description, and capability type</li>
                <li>Set a budget limit (monthly spend cap)</li>
                <li>Choose approval rules for risky actions</li>
              </ol>
            </Callout>
            <p className="text-xs text-muted-foreground">No code required — all configuration is in the UI.</p>
          </div>

          {/* 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <h4 className="text-base font-semibold">3. Governance Rules</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Callout tone="success">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-sm text-foreground">Auto-Approved</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Read operations (low cost)</li>
                  <li>Scheduled maintenance tasks</li>
                  <li>Status checks and monitoring</li>
                </ul>
              </Callout>
              <Callout tone="warning">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-sm text-foreground">Requires Approval</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Payments or transfers</li>
                  <li>Data deletion or modification</li>
                  <li>High-cost or external actions</li>
                </ul>
              </Callout>
              <Callout tone="danger">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="font-semibold text-sm text-foreground">Auto-Denied</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>Exceeding the budget limit</li>
                  <li>Unauthorized capability scope</li>
                  <li>Paused or frozen agents</li>
                </ul>
              </Callout>
            </div>
          </div>

          {/* 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              <h4 className="text-base font-semibold">4. Real-Time Monitoring</h4>
            </div>
            <Callout tone="neutral">
              <p className="text-sm font-semibold text-foreground">Live dashboard widgets:</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground ml-1">
                <li><span className="font-medium text-foreground">Live Telemetry:</span> real-time feed of agent actions</li>
                <li><span className="font-medium text-foreground">Cost Intelligence:</span> track spending per agent</li>
                <li><span className="font-medium text-foreground">Approvals:</span> pending decisions for your review</li>
                <li><span className="font-medium text-foreground">Audit Log:</span> complete immutable history</li>
              </ul>
            </Callout>
          </div>

          {/* 5 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <h4 className="text-base font-semibold">5. Security &amp; Privacy</h4>
            </div>
            <Callout tone="accent">
              <p className="text-sm font-semibold text-foreground">Your data is private:</p>
              <ul className="space-y-1 text-sm text-muted-foreground ml-1">
                <li>Each user has a fully isolated workspace</li>
                <li>Agents only see their own activity</li>
                <li>API keys are hashed (SHA-256) and shown once</li>
                <li>All actions are logged and immutable</li>
              </ul>
            </Callout>
          </div>

          {/* 6 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base font-semibold">6. Integrating Your Agent</h4>
            </div>
            <Callout tone="neutral">
              <p className="text-sm font-semibold text-foreground">Connect any AI agent:</p>
              <ol className="space-y-1.5 text-sm list-decimal list-inside ml-1 text-muted-foreground">
                <li>Go to the &quot;Connect Agent&quot; tab</li>
                <li>Select your agent from the registry</li>
                <li>Generate an API key (shown once — save it securely)</li>
                <li>Use the SDK or curl examples to integrate</li>
                <li>Your agent is now governed and monitored</li>
              </ol>
            </Callout>
          </div>
        </div>
      )}

      {/* TERMS */}
      {tab === 'terms' && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 text-sm">
          <div>
            <h3 className="text-xl font-semibold">Terms &amp; Conditions</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Please read these terms carefully before using AgentOps
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-base">1. Service Description</h4>
            <p className="text-muted-foreground">
              AgentOps is a governance and monitoring platform for AI agents, providing real-time monitoring,
              human-in-the-loop approvals, cost tracking, budget enforcement, audit trails, and per-user
              workspace isolation.
            </p>
          </div>

          <Callout tone="warning">
            <h4 className="font-semibold text-base text-foreground">2. User Responsibility</h4>
            <ul className="ml-1 space-y-1 text-muted-foreground list-disc list-inside">
              <li>Use the service only to govern your own agents</li>
              <li>Do not attempt to access other users&apos; workspaces or data</li>
              <li>Keep your API keys and login credentials secure</li>
              <li>Report security issues promptly</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </Callout>

          <div className="space-y-2">
            <h4 className="font-semibold text-base">3. Governance &amp; Approval Rules</h4>
            <ul className="ml-1 space-y-1 text-muted-foreground list-disc list-inside">
              <li>Safe, low-cost actions are auto-approved</li>
              <li>Risky actions require human approval</li>
              <li>Budget limits are enforced; exceeding them triggers denial</li>
              <li>Scope violations are automatically denied</li>
              <li>All decisions are recorded in the immutable audit log</li>
            </ul>
          </div>

          <Callout tone="accent">
            <h4 className="font-semibold text-base text-foreground">4. Data Privacy &amp; Isolation</h4>
            <ul className="ml-1 space-y-1 text-muted-foreground list-disc list-inside">
              <li>Each user has a completely isolated workspace</li>
              <li>No agent or user can access another user&apos;s data</li>
              <li>Activity and approvals are scoped by agent ownership</li>
              <li>Passwords are securely hashed (bcrypt), never stored in plain text</li>
              <li>API keys are stored only as a SHA-256 hash</li>
            </ul>
          </Callout>

          <div className="space-y-2">
            <h4 className="font-semibold text-base">5. Monitoring &amp; Audit Logs</h4>
            <ul className="ml-1 space-y-1 text-muted-foreground list-disc list-inside">
              <li>Every agent action is logged with a timestamp and details</li>
              <li>Approval decisions are recorded with reasoning</li>
              <li>Costs are tracked at the individual action level</li>
              <li>You have full access to your own audit trail</li>
            </ul>
          </div>

          <Callout tone="danger">
            <h4 className="font-semibold text-base text-foreground">6. Acceptable Use</h4>
            <ul className="ml-1 space-y-1 text-muted-foreground list-disc list-inside">
              <li>Do not attempt to access other users&apos; accounts or data</li>
              <li>Do not share your API keys or login credentials</li>
              <li>Do not use the service for illegal or harmful purposes</li>
              <li>Do not circumvent governance rules or approval workflows</li>
              <li>Do not attempt to disrupt or compromise the service</li>
            </ul>
          </Callout>

          <div className="space-y-2">
            <h4 className="font-semibold text-base">7. Limitations &amp; Disclaimers</h4>
            <ul className="ml-1 space-y-1 text-muted-foreground list-disc list-inside">
              <li>You remain responsible for your agents&apos; behavior</li>
              <li>Approval workflows complement but don&apos;t replace human oversight</li>
              <li>Budget limits are a safety measure; unexpected costs can occur</li>
              <li>The service is provided &quot;as-is&quot; without warranty</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">
            Version 1.0
          </p>
        </div>
      )}
    </div>
  )
}
