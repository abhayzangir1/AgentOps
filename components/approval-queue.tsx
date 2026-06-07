'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Approval, Agent } from '@/lib/types'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Inbox,
  ShieldAlert,
  DollarSign,
  Settings2,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Pencil,
  Brain,
} from 'lucide-react'

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Failed to fetch')
    return r.json()
  })

// Risk scoring per request type
const RISK_CONFIG: Record<
  string,
  {
    label: string
    risk: 'critical' | 'high' | 'medium' | 'low'
    icon: React.ElementType
    riskColor: string
    riskBg: string
    description: string
  }
> = {
  resource_upgrade: {
    label: 'Resource Upgrade',
    risk: 'high',
    icon: TrendingUp,
    riskColor: 'text-orange-400',
    riskBg: 'bg-orange-500/10 border-orange-500/20',
    description: 'Agent is requesting elevated compute tier — may increase monthly spend significantly.',
  },
  budget_increase: {
    label: 'Budget Increase',
    risk: 'critical',
    icon: DollarSign,
    riskColor: 'text-red-400',
    riskBg: 'bg-red-500/10 border-red-500/20',
    description: 'Financial guardrail modification — approve only after cost-benefit review.',
  },
  config_change: {
    label: 'Config Change',
    risk: 'medium',
    icon: Settings2,
    riskColor: 'text-yellow-400',
    riskBg: 'bg-yellow-500/10 border-yellow-500/20',
    description: 'Runtime configuration update — may alter agent behavior unpredictably.',
  },
  deploy: {
    label: 'Deployment',
    risk: 'high',
    icon: ShieldAlert,
    riskColor: 'text-orange-400',
    riskBg: 'bg-orange-500/10 border-orange-500/20',
    description: 'New agent version deployment — requires validation before going live.',
  },
  cost_increase: {
    label: 'Cost Increase',
    risk: 'critical',
    icon: DollarSign,
    riskColor: 'text-red-400',
    riskBg: 'bg-red-500/10 border-red-500/20',
    description: 'Projected cost exceeds threshold — agent execution has been frozen pending review.',
  },
}

const RISK_BADGE: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  low: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
}

interface RiskAnalysis {
  risk: 'critical' | 'high' | 'medium' | 'low'
  score: number
  summary: string
  concerns: string[]
  recommendation: 'approve' | 'reject' | 'review'
  reasoning: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface ApprovalCardProps {
  approval: Approval
  agent: Agent | undefined
  onApprove: (id: number, notes: string) => Promise<void>
  onReject: (id: number, notes: string) => Promise<void>
  onModify: (id: number, requestDetails: Record<string, unknown>, notes: string) => Promise<void>
}

function ApprovalCard({ approval, agent, onApprove, onReject, onModify }: ApprovalCardProps) {
  const [processing, setProcessing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState('')
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)

  // AI Sentinel risk analysis
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  // Modify mode
  const [modifying, setModifying] = useState(false)
  const [draft, setDraft] = useState('')
  const [modifyError, setModifyError] = useState<string | null>(null)

  const config = RISK_CONFIG[approval.request_type] ?? {
    label: approval.request_type.replace(/_/g, ' '),
    risk: 'medium' as const,
    icon: Settings2,
    riskColor: 'text-yellow-400',
    riskBg: 'bg-yellow-500/10 border-yellow-500/20',
    description: 'Review this request carefully before approving.',
  }
  const Icon = config.icon

  const runAnalysis = async () => {
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const res = await fetch(`/api/approvals/${approval.id}/analyze`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setAnalyzeError(data.error || 'Analysis failed')
        return
      }
      setAnalysis(data.analysis)
      setExpanded(true)
    } catch {
      setAnalyzeError('Network error contacting Sentinel')
    } finally {
      setAnalyzing(false)
    }
  }

  const startModify = () => {
    setDraft(JSON.stringify(approval.request_details ?? {}, null, 2))
    setModifyError(null)
    setModifying(true)
    setExpanded(true)
  }

  const saveModify = async () => {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(draft)
    } catch {
      setModifyError('Invalid JSON — please fix before saving')
      return
    }
    setProcessing(true)
    try {
      await onModify(approval.id, parsed, notes || 'Payload modified by reviewer')
      setModifying(false)
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirm = async () => {
    if (!actionType) return
    setProcessing(true)
    try {
      if (actionType === 'approve') {
        await onApprove(approval.id, notes || 'Approved by operations team')
      } else {
        await onReject(approval.id, notes || 'Rejected by operations team')
      }
    } finally {
      setProcessing(false)
      setActionType(null)
      setNotes('')
    }
  }

  return (
    <div className={`rounded-xl border ${config.riskBg} overflow-hidden`}>
      {/* Frozen banner */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border/50">
        <Lock size={12} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          Agent action frozen — awaiting human approval
        </span>
        <span
          className={`ml-auto text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
            RISK_BADGE[config.risk]
          }`}
        >
          {config.risk} risk
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.riskBg} border ${config.riskBg}`}>
            <Icon size={16} className={config.riskColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{agent?.name ?? `Agent #${approval.agent_id}`}</h4>
              {agent?.tier && (
                <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase">
                  {agent.tier}
                </span>
              )}
            </div>
            <p className={`text-xs font-medium mt-0.5 ${config.riskColor}`}>{config.label}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{config.description}</p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-muted/50 transition-colors flex-shrink-0"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* AI Sentinel analysis */}
        {analyzeError && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle size={13} />
            {analyzeError}
          </div>
        )}

        {analysis && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Brain size={14} className="text-accent" />
              <span className="text-xs font-semibold text-accent">Sentinel AI Assessment</span>
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${RISK_BADGE[analysis.risk]}`}>
                {analysis.risk} · {analysis.score}/100
              </span>
            </div>
            <p className="text-xs text-foreground leading-relaxed font-medium">{analysis.summary}</p>
            {analysis.concerns.length > 0 && (
              <ul className="space-y-1">
                {analysis.concerns.map((c, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <span className="text-accent mt-0.5">·</span>
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-2">
              {analysis.reasoning}
            </p>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground">Recommendation:</span>
              <span
                className={`font-bold uppercase tracking-wide ${
                  analysis.recommendation === 'approve'
                    ? 'text-emerald-400'
                    : analysis.recommendation === 'reject'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}
              >
                {analysis.recommendation}
              </span>
            </div>
          </div>
        )}

        {/* Request details / modify editor */}
        {expanded && !modifying && (
          <div className="p-3 bg-black/30 rounded-lg border border-border/50">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide mb-2">
              Request Payload
            </p>
            <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(approval.request_details, null, 2)}
            </pre>
          </div>
        )}

        {modifying && (
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">
              Edit Request Payload (JSON)
            </p>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full px-3 py-2 text-xs font-mono bg-black/40 border border-border rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-accent text-foreground/90"
            />
            {modifyError && <p className="text-xs text-destructive">{modifyError}</p>}
            <div className="flex gap-2">
              <button
                onClick={saveModify}
                disabled={processing}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-accent text-accent-foreground hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
              >
                {processing ? <RefreshCw size={14} className="animate-spin" /> : <Pencil size={14} />}
                Save modified payload
              </button>
              <button
                onClick={() => setModifying(false)}
                className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>Submitted {formatDate(approval.created_at)}</span>
          <span className="ml-auto">ID: #{approval.id}</span>
        </div>

        {/* Notes + confirm */}
        {actionType ? (
          <div className="space-y-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Add notes for ${actionType === 'approve' ? 'approval' : 'rejection'} (optional)...`}
              rows={2}
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={processing}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {processing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : actionType === 'approve' ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
              </button>
              <button
                onClick={() => { setActionType(null); setNotes('') }}
                className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          !modifying && (
            <div className="space-y-2">
              {/* Sentinel + Modify row */}
              <div className="flex gap-2">
                <button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold bg-accent/10 hover:bg-accent/20 text-accent border border-accent/25 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {analyzing ? 'Analyzing…' : analysis ? 'Re-run Sentinel AI' : 'Analyze with Sentinel AI'}
                </button>
                <button
                  onClick={startModify}
                  className="px-3 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors text-muted-foreground flex items-center gap-1.5"
                >
                  <Pencil size={13} />
                  Modify
                </button>
              </div>
              {/* Approve / Reject row */}
              <div className="flex gap-2">
                <button
                  onClick={() => setActionType('approve')}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  Approve
                </button>
                <button
                  onClick={() => setActionType('reject')}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function ApprovalQueue() {
  const {
    data: approvals,
    isLoading,
    error,
    mutate,
  } = useSWR<Approval[]>('/api/approvals', fetcher, { refreshInterval: 5000 })
  const { data: agents } = useSWR<Agent[]>('/api/agents', fetcher)

  const [tab, setTab] = useState<'pending' | 'resolved'>('pending')

  const getAgent = (agentId: number) => agents?.find((a) => a.id === agentId)

  const handleApprove = async (id: number, notes: string) => {
    await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', notes }),
    })
    mutate()
  }

  const handleReject = async (id: number, notes: string) => {
    await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', notes }),
    })
    mutate()
  }

  const handleModify = async (id: number, requestDetails: Record<string, unknown>, notes: string) => {
    await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_details: requestDetails, notes }),
    })
    mutate()
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 bg-muted rounded-xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <AlertCircle size={28} className="text-destructive" />
        <div>
          <p className="text-sm font-medium">Failed to load approvals</p>
          <p className="text-xs text-muted-foreground mt-0.5">Cannot reach Aurora PostgreSQL</p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded text-xs font-medium"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    )
  }

  const pending = (approvals ?? []).filter((a) => a.status === 'pending')
  const resolved = (approvals ?? []).filter((a) => a.status !== 'pending')

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg border border-border w-fit">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'pending'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Pending
          {pending.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-full">
              {pending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'resolved'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Resolved
          {resolved.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-[11px] bg-muted text-muted-foreground rounded-full">
              {resolved.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'pending' && (
        <>
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3 border border-dashed border-border rounded-xl">
              <Inbox size={28} className="text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">All clear</p>
                <p className="text-xs text-muted-foreground mt-0.5">No agent actions awaiting approval</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((approval) => (
                <ApprovalCard
                  key={approval.id}
                  approval={approval}
                  agent={getAgent(approval.agent_id)}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onModify={handleModify}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'resolved' && (
        <div className="space-y-2">
          {resolved.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No resolved requests yet</p>
          ) : (
            resolved.map((approval) => {
              const agent = getAgent(approval.agent_id)
              const config = RISK_CONFIG[approval.request_type]
              return (
                <div
                  key={approval.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      approval.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {agent?.name ?? `Agent #${approval.agent_id}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {config?.label ?? approval.request_type} ·{' '}
                      {approval.resolved_at ? formatDate(approval.resolved_at) : '—'}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide ${
                      approval.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {approval.status}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
