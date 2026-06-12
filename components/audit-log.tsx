'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  FileText,
  Shield,
  User,
  Bot,
  CheckCircle2,
  XCircle,
  Plus,
  Settings,
  Trash2,
  Lock,
  Sparkles,
  Loader2,
  X,
} from 'lucide-react'

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Failed to fetch')
    return r.json()
  })

interface AuditLog {
  id: number
  agent_id: number | null
  action: string
  actor_user_id: number | null
  details: Record<string, any>
  created_at: string
}

// Maps action types to compliance frameworks
const COMPLIANCE_TAGS: Record<string, string[]> = {
  agent_created: ['SOC 2', 'EU AI Act'],
  agent_status_changed: ['SOC 2', 'EU AI Act'],
  agent_updated: ['SOC 2'],
  approval_approved: ['SOC 2', 'GDPR', 'EU AI Act'],
  approval_rejected: ['SOC 2', 'EU AI Act'],
  budget_updated: ['SOC 2'],
  permission_granted: ['SOC 2', 'GDPR'],
  permission_revoked: ['SOC 2', 'GDPR'],
  data_access: ['GDPR'],
  config_change: ['SOC 2', 'EU AI Act'],
}

const FRAMEWORK_COLORS: Record<string, string> = {
  'SOC 2': 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  'GDPR': 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
  'EU AI Act': 'bg-orange-500/15 text-orange-400 border border-orange-500/25',
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  agent_created: Plus,
  agent_status_changed: Bot,
  agent_updated: Settings,
  approval_approved: CheckCircle2,
  approval_rejected: XCircle,
  budget_updated: Shield,
  permission_granted: Lock,
  permission_revoked: Lock,
  data_access: User,
  config_change: Settings,
}

const ACTION_COLORS: Record<string, string> = {
  agent_created: 'text-emerald-400 bg-emerald-500/10',
  agent_status_changed: 'text-blue-400 bg-blue-500/10',
  agent_updated: 'text-accent bg-accent/10',
  approval_approved: 'text-emerald-400 bg-emerald-500/10',
  approval_rejected: 'text-red-400 bg-red-500/10',
  budget_updated: 'text-yellow-400 bg-yellow-500/10',
  permission_granted: 'text-accent bg-accent/10',
  permission_revoked: 'text-orange-400 bg-orange-500/10',
  data_access: 'text-purple-400 bg-purple-500/10',
  config_change: 'text-yellow-400 bg-yellow-500/10',
}

const ACTION_TYPES = [
  { value: '', label: 'All actions' },
  { value: 'agent_created', label: 'Agent Created' },
  { value: 'agent_status_changed', label: 'Status Changed' },
  { value: 'approval_approved', label: 'Approved' },
  { value: 'approval_rejected', label: 'Rejected' },
  { value: 'budget_updated', label: 'Budget Updated' },
  { value: 'config_change', label: 'Config Change' },
]

function formatTimestamp(str: string) {
  const d = new Date(str)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })
}

function getComplianceTags(action: string): string[] {
  return COMPLIANCE_TAGS[action] ?? ['SOC 2']
}

export function AuditLog() {
  const { data: logs, isLoading, error, mutate } = useSWR<AuditLog[]>(
    '/api/audit-logs?limit=200',
    fetcher,
    { refreshInterval: 10000 },
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [frameworkFilter, setFrameworkFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [summarizing, setSummarizing] = useState(false)
  const [summaryError, setSummaryError] = useState(false)

  const generateSummary = async () => {
    setSummarizing(true)
    setSummaryError(false)
    setAiSummary(null)
    try {
      const res = await fetch('/api/audit-logs/summarize', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.summary) { setSummaryError(true); return }
      setAiSummary(data.summary)
    } catch {
      setSummaryError(true)
    } finally {
      setSummarizing(false)
    }
  }

  const filteredLogs = useMemo(() => {
    if (!logs) return []
    return logs.filter((log) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (
          !log.action.toLowerCase().includes(q) &&
          !JSON.stringify(log.details).toLowerCase().includes(q) &&
          !log.agent_id?.toString().includes(q) &&
          !log.actor_user_id?.toString().includes(q)
        )
          return false
      }
      if (actionFilter && log.action !== actionFilter) return false
      if (frameworkFilter && !getComplianceTags(log.action).includes(frameworkFilter)) return false
      if (dateFilter !== 'all') {
        const logDate = new Date(log.created_at)
        const now = new Date()
        const cutoff =
          dateFilter === 'today'
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
            : dateFilter === 'week'
            ? new Date(now.getTime() - 7 * 86400000)
            : new Date(now.getTime() - 30 * 86400000)
        if (logDate < cutoff) return false
      }
      return true
    })
  }, [logs, searchQuery, actionFilter, frameworkFilter, dateFilter])

  const exportCSV = () => {
    const headers = ['ID', 'Agent ID', 'Action', 'Actor', 'Compliance Frameworks', 'Timestamp', 'Details']
    const rows = filteredLogs.map((log) => [
      log.id,
      log.agent_id ?? 'System',
      log.action,
      log.actor_user_id ? `User #${log.actor_user_id}` : 'System',
      getComplianceTags(log.action).join('; '),
      formatTimestamp(log.created_at),
      JSON.stringify(log.details),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const exportJSON = () => {
    const data = filteredLogs.map((log) => ({
      ...log,
      complianceFrameworks: getComplianceTags(log.action),
      immutableTimestamp: formatTimestamp(log.created_at),
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-muted/40 rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <AlertCircle size={28} className="text-destructive" />
        <div>
          <p className="text-sm font-medium">Failed to load audit logs</p>
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

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <FileText size={28} className="text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">No audit logs yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">All system events will be recorded here immutably</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Compliance banner */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
        <Shield size={16} className="text-accent flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          All entries are <strong className="text-foreground">tamper-proof</strong> and immutable.
          Logs are classified against{' '}
          <strong className="text-foreground">SOC 2 Type II</strong>,{' '}
          <strong className="text-foreground">GDPR Article 30</strong>, and{' '}
          <strong className="text-foreground">EU AI Act Article 12</strong> requirements.
        </p>
        <div className="flex gap-1.5 flex-shrink-0">
          {['SOC 2', 'GDPR', 'EU AI Act'].map((fw) => (
            <span key={fw} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${FRAMEWORK_COLORS[fw]}`}>
              {fw}
            </span>
          ))}
        </div>
      </div>

      {/* Search + actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs, agents, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateSummary}
            disabled={summarizing}
            className="flex items-center gap-2 px-3 py-2 border border-accent/40 bg-accent/10 text-accent rounded-lg text-sm hover:bg-accent/20 disabled:opacity-60 transition-colors"
          >
            {summarizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {summarizing ? 'Analyzing…' : 'AI Summary'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              showFilters || actionFilter || frameworkFilter || dateFilter !== 'all'
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border hover:bg-muted text-muted-foreground'
            }`}
          >
            <Filter size={14} />
            Filters
            {(actionFilter || frameworkFilter || dateFilter !== 'all') && (
              <span className="w-4 h-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                {[actionFilter, frameworkFilter, dateFilter !== 'all' ? 1 : 0].filter(Boolean).length}
              </span>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              <Download size={14} />
              Export
              <ChevronDown size={12} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-xl z-10 overflow-hidden">
                <button
                  onClick={() => { exportCSV(); setShowExportMenu(false) }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => { exportJSON(); setShowExportMenu(false) }}
                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-muted transition-colors"
                >
                  Export JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI compliance summary */}
      {(aiSummary || summaryError) && (
        <div className={`relative p-4 rounded-lg border ${summaryError ? 'bg-destructive/5 border-destructive/20' : 'bg-accent/5 border-accent/25'}`}>
          <button
            onClick={() => { setAiSummary(null); setSummaryError(false) }}
            className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-foreground transition"
            aria-label="Dismiss summary"
          >
            <X size={13} />
          </button>
          {summaryError ? (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle size={14} /> Failed to generate AI summary. Try again.
            </p>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent mb-2">
                <Sparkles size={12} /> Sentinel Compliance Summary — generated by Qwen3 VL on AWS Bedrock
              </p>
              <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{aiSummary}</div>
            </>
          )}
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Action type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {ACTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Framework</label>
            <select
              value={frameworkFilter}
              onChange={(e) => setFrameworkFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All frameworks</option>
              <option value="SOC 2">SOC 2</option>
              <option value="GDPR">GDPR</option>
              <option value="EU AI Act">EU AI Act</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Time period</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('')
                setActionFilter('')
                setFrameworkFilter('')
                setDateFilter('all')
              }}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        Showing <strong className="text-foreground">{filteredLogs.length}</strong> of{' '}
        <strong className="text-foreground">{logs.length}</strong> log entries
      </p>

      {/* Log entries */}
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {filteredLogs.map((log) => {
          const Icon = ACTION_ICONS[log.action] ?? FileText
          const iconStyle = ACTION_COLORS[log.action] ?? 'text-muted-foreground bg-muted'
          const tags = getComplianceTags(log.action)
          const isExpanded = expandedId === log.id
          const hasDetails = log.details && Object.keys(log.details).length > 0

          return (
            <div
              key={log.id}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <div
                className={`flex items-start gap-3 p-3 ${hasDetails ? 'cursor-pointer hover:bg-muted/20' : ''} transition-colors`}
                onClick={() => hasDetails && setExpandedId(isExpanded ? null : log.id)}
              >
                <div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${iconStyle}`}>
                  <Icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {log.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                    {tags.map((fw) => (
                      <span key={fw} className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${FRAMEWORK_COLORS[fw]}`}>
                        {fw}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {log.agent_id ? (
                      <span className="flex items-center gap-1">
                        <Bot size={11} />
                        Agent #{log.agent_id}
                      </span>
                    ) : (
                      <span>System</span>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    {log.actor_user_id ? (
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        User #{log.actor_user_id}
                      </span>
                    ) : (
                      <span>Automated</span>
                    )}
                    <span className="text-muted-foreground/40">·</span>
                    <span className="font-mono text-[11px]">{formatTimestamp(log.created_at)}</span>
                    <span className="ml-auto text-muted-foreground/60 font-mono text-[10px]">#{log.id}</span>
                  </div>
                </div>
              </div>

              {isExpanded && hasDetails && (
                <div className="px-3 pb-3 border-t border-border/50">
                  <pre className="mt-2 text-xs font-mono text-foreground/70 bg-black/20 rounded-lg p-3 whitespace-pre-wrap break-all leading-relaxed overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )
        })}

        {filteredLogs.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No logs match the current filters
          </div>
        )}
      </div>
    </div>
  )
}
