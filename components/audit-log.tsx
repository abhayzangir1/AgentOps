'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface AuditLog {
  id: number
  agent_id: number | null
  action: string
  actor_user_id: number | null
  details: Record<string, any>
  created_at: string
}

const DEMO_LOGS: AuditLog[] = [
  { id: 1, agent_id: 1, action: 'agent_status_changed', actor_user_id: 1, details: { status: 'paused' }, created_at: '2026-06-05T01:50:00Z' },
  { id: 2, agent_id: 2, action: 'approval_approved', actor_user_id: 1, details: { notes: 'Approved' }, created_at: '2026-06-05T02:13:00Z' },
]

export function AuditLog() {
  const { data: rawLogs, isLoading } = useSWR<AuditLog[]>('/api/audit-logs?limit=50', fetcher, {
    refreshInterval: 10000,
  })

  const logs = Array.isArray(rawLogs) ? rawLogs : DEMO_LOGS

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

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          <div className={`w-2 h-2 rounded-full mt-2 ${getEventColor(log.action)} bg-current`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{formatEventType(log.action)}</p>
            <p className="text-xs text-muted-foreground">
              {log.agent_id ? `Agent #${log.agent_id}` : 'System'} &bull; {new Date(log.created_at).toLocaleString()}
            </p>
            {log.details && Object.keys(log.details).length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {JSON.stringify(log.details)}
              </p>
            )}
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No audit logs yet</p>
      )}
    </div>
  )
}
