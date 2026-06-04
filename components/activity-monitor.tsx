'use client'

import useSWR from 'swr'
import { ActivityEvent } from '@/lib/dynamodb'
import { CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Demo data for hackathon
const DEMO_ACTIVITIES: ActivityEvent[] = [
  {
    eventId: '1',
    agentId: 1,
    eventType: 'execution',
    description: 'DataFlow-Ingestion processed 15,847 records',
    status: 'success',
    costUSD: 2.45,
    duration: 3240,
    timestamp: Date.now() - 120000,
    metadata: { recordsProcessed: 15847 },
  },
  {
    eventId: '2',
    agentId: 2,
    eventType: 'approval',
    description: 'Resource upgrade request pending review',
    status: 'pending',
    timestamp: Date.now() - 240000,
    metadata: { currentTier: 'pro', requestedTier: 'enterprise' },
  },
  {
    eventId: '3',
    agentId: 3,
    eventType: 'deployment',
    description: 'ContentGen-Blog deployed v2.1.0',
    status: 'success',
    costUSD: 0.78,
    duration: 1820,
    timestamp: Date.now() - 360000,
    metadata: { version: 'v2.1.0', environment: 'production' },
  },
  {
    eventId: '4',
    agentId: 2,
    eventType: 'execution',
    description: 'Analytics engine computed hourly metrics',
    status: 'success',
    costUSD: 1.2,
    duration: 1560,
    timestamp: Date.now() - 600000,
    metadata: { metricsCount: 2847 },
  },
  {
    eventId: '5',
    agentId: 4,
    eventType: 'error',
    description: 'Support-Tier2 rate limit exceeded',
    status: 'failed',
    timestamp: Date.now() - 720000,
    metadata: { requestsPerMinute: 450, limit: 400 },
  },
]

export function ActivityMonitor() {
  const { data: activities, isLoading } = useSWR<ActivityEvent[]>('/api/activity?limit=15', fetcher, {
    refreshInterval: 5000,
    fallbackData: DEMO_ACTIVITIES,
  })

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'execution':
        return <CheckCircle size={16} className="text-green-500" />
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />
      case 'approval':
        return <Clock size={16} className="text-yellow-500" />
      case 'deployment':
        return <TrendingUp size={16} className="text-blue-500" />
      default:
        return <Clock size={16} className="text-muted-foreground" />
    }
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {(activities || []).map((activity) => (
        <div
          key={activity.eventId}
          className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
        >
          <div className="mt-1 flex-shrink-0">{getEventIcon(activity.eventType)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium truncate">{activity.description}</p>
              {activity.costUSD && activity.costUSD > 0 && (
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded flex-shrink-0">
                  ${activity.costUSD.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Agent #{activity.agentId} • {formatTime(activity.timestamp)}
            </p>
          </div>
          <div className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${
            activity.status === 'success' ? 'bg-green-500/20 text-green-400' : 
            activity.status === 'failed' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {activity.status}
          </div>
        </div>
      ))}
    </div>
  )
}
