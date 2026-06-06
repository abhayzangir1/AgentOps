'use client'

import useSWR from 'swr'
import { ActivityEvent } from '@/lib/dynamodb'
import { Agent } from '@/lib/types'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Rocket,
  RefreshCw,
  Database,
  Zap,
  DollarSign,
  Timer,
} from 'lucide-react'

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error('Failed to fetch')
    return r.json()
  })

const EVENT_META: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  execution: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    label: 'Execution',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    label: 'Error',
  },
  approval: {
    icon: Clock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    label: 'Approval',
  },
  deployment: {
    icon: Rocket,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    label: 'Deploy',
  },
}

const STATUS_STYLES: Record<string, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  failed: 'bg-red-500/15 text-red-400 border border-red-500/20',
  pending: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
}

function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  if (diff < 10000) return 'just now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function formatDuration(ms?: number) {
  if (!ms) return null
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

export function ActivityMonitor() {
  const { data: activities, isLoading, error, mutate } = useSWR<ActivityEvent[]>(
    '/api/activity?limit=20',
    fetcher,
    { refreshInterval: 4000 },
  )
  const { data: agents } = useSWR<Agent[]>('/api/agents', fetcher, {
    refreshInterval: 30000,
  })

  const agentMap = new Map<number, string>()
  if (agents) {
    for (const a of agents) agentMap.set(a.id, a.name)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <AlertCircle size={28} className="text-destructive" />
        <div>
          <p className="text-sm font-medium">Failed to load telemetry</p>
          <p className="text-xs text-muted-foreground mt-0.5">Cannot reach DynamoDB activity stream</p>
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

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <Database size={28} className="text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">No activity yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agent events will stream here in real-time
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-xs text-emerald-400 font-medium">Live — polling every 4s</span>
        <span className="ml-auto text-xs text-muted-foreground">{activities.length} events</span>
      </div>

      {activities.map((activity) => {
        const meta = EVENT_META[activity.eventType] ?? EVENT_META.execution
        const Icon = meta.icon
        const agentName = agentMap.get(activity.agentId) ?? `Agent #${activity.agentId}`
        const duration = formatDuration(activity.duration)

        return (
          <div
            key={activity.eventId}
            className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-border/80 hover:bg-muted/20 transition-colors group"
          >
            {/* Event type icon */}
            <div className={`flex-shrink-0 p-1.5 rounded-md mt-0.5 ${meta.bg}`}>
              <Icon size={14} className={meta.color} />
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug truncate">{activity.description}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">{agentName}</span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(activity.timestamp)}</span>
                {duration && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Timer size={10} />
                      {duration}
                    </span>
                  </>
                )}
                {activity.costUSD != null && activity.costUSD > 0 && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <span className="flex items-center gap-0.5 text-xs text-accent font-medium">
                      <DollarSign size={10} />
                      {activity.costUSD.toFixed(4)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div
              className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                STATUS_STYLES[activity.status] ?? STATUS_STYLES.pending
              }`}
            >
              {activity.status}
            </div>
          </div>
        )
      })}
    </div>
  )
}
