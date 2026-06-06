'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Search, Filter, Download, ChevronDown, AlertCircle, RefreshCw, FileText } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => {
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

const ACTION_TYPES = [
  { value: '', label: 'All Actions' },
  { value: 'agent_created', label: 'Agent Created' },
  { value: 'agent_status_changed', label: 'Status Changed' },
  { value: 'approval_approved', label: 'Approval Approved' },
  { value: 'approval_rejected', label: 'Approval Rejected' },
]

export function AuditLog() {
  const { data: logs, isLoading, error, mutate } = useSWR<AuditLog[]>('/api/audit-logs?limit=200', fetcher, {
    refreshInterval: 10000,
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filteredLogs = useMemo(() => {
    if (!logs) return []
    return logs.filter((log) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesAction = log.action.toLowerCase().includes(searchLower)
        const matchesDetails = JSON.stringify(log.details).toLowerCase().includes(searchLower)
        const matchesAgent = log.agent_id?.toString().includes(searchLower)
        if (!matchesAction && !matchesDetails && !matchesAgent) return false
      }

      // Action type filter
      if (actionFilter && log.action !== actionFilter) return false

      // Date filter
      if (dateFilter !== 'all') {
        const logDate = new Date(log.created_at)
        const now = new Date()
        if (dateFilter === 'today') {
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          if (logDate < today) return false
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (logDate < weekAgo) return false
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (logDate < monthAgo) return false
        }
      }

      return true
    })
  }, [logs, searchQuery, actionFilter, dateFilter])

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getEventColor = (type: string) => {
    if (type.includes('created')) return 'text-green-500'
    if (type.includes('deleted')) return 'text-red-500'
    if (type.includes('approved')) return 'text-green-500'
    if (type.includes('rejected')) return 'text-red-500'
    return 'text-accent'
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Agent ID', 'Action', 'Actor User ID', 'Details', 'Created At']
    const rows = filteredLogs.map((log) => [
      log.id,
      log.agent_id || 'System',
      log.action,
      log.actor_user_id || 'System',
      JSON.stringify(log.details),
      new Date(log.created_at).toISOString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle size={48} className="text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to Load Audit Logs</h3>
        <p className="text-sm text-muted-foreground mb-4">Could not connect to Aurora PostgreSQL</p>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText size={48} className="text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Audit Logs Yet</h3>
        <p className="text-sm text-muted-foreground">System events will be recorded here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-colors ${
              showFilters ? 'border-accent bg-accent/10' : 'border-border hover:bg-muted'
            }`}
          >
            <Filter size={16} />
            Filters
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
              <Download size={16} />
              Export
              <ChevronDown size={14} />
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={exportToCSV}
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors rounded-t-lg"
              >
                Export CSV
              </button>
              <button
                onClick={exportToJSON}
                className="w-full px-4 py-2 text-sm text-left hover:bg-muted transition-colors rounded-b-lg"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg border border-border">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {ACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Time Period</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('')
                setActionFilter('')
                setDateFilter('all')
              }}
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Results Count */}
      <p className="text-xs text-muted-foreground">
        Showing {filteredLogs.length} of {logs.length} logs
      </p>

      {/* Log List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <div className={`w-2 h-2 rounded-full mt-2 ${getEventColor(log.action)} bg-current`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{formatEventType(log.action)}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {log.agent_id ? `Agent #${log.agent_id}` : 'System'} 
                {log.actor_user_id && ` • User #${log.actor_user_id}`}
              </p>
              {log.details && Object.keys(log.details).length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded">
                  {JSON.stringify(log.details)}
                </p>
              )}
            </div>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {logs.length === 0 ? 'No audit logs yet' : 'No logs match your filters'}
          </p>
        )}
      </div>
    </div>
  )
}
