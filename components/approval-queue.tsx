'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Approval, Agent } from '@/lib/types'
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, Inbox } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Failed to fetch')
  return r.json()
})

export function ApprovalQueue() {
  const { data: approvals, isLoading, error, mutate } = useSWR<Approval[]>('/api/approvals', fetcher, {
    refreshInterval: 5000,
  })
  const { data: agents } = useSWR<Agent[]>('/api/agents', fetcher)
  const [processingId, setProcessingId] = useState<number | null>(null)

  const getAgent = (agentId: number) => agents?.find((a) => a.id === agentId)

  const handleApprove = async (approvalId: number) => {
    setProcessingId(approvalId)
    try {
      await fetch(`/api/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', notes: 'Approved by ops team' }),
      })
      mutate()
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (approvalId: number) => {
    setProcessingId(approvalId)
    try {
      await fetch(`/api/approvals/${approvalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes: 'Rejected by ops team' }),
      })
      mutate()
    } finally {
      setProcessingId(null)
    }
  }

  const pendingApprovals = approvals?.filter((a) => a.status === 'pending') || []

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle size={32} className="text-destructive mb-3" />
        <p className="text-sm font-medium mb-1">Failed to Load Approvals</p>
        <p className="text-xs text-muted-foreground mb-3">Could not connect to Aurora PostgreSQL</p>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-2 px-3 py-1.5 bg-accent text-accent-foreground rounded text-xs"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    )
  }

  if (pendingApprovals.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-border rounded-lg">
        <Inbox size={32} className="mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">No Pending Approvals</p>
        <p className="text-xs text-muted-foreground">All requests have been processed</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {pendingApprovals.map((approval) => {
        const agent = getAgent(approval.agent_id)
        const isProcessing = processingId === approval.id

        return (
          <div key={approval.id} className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-sm">{agent?.name}</h4>
                <p className="text-xs text-muted-foreground capitalize">
                  {approval.request_type.replace(/_/g, ' ')}
                </p>
              </div>
              <Clock size={16} className="text-yellow-500 mt-1" />
            </div>

            <div className="mb-4 p-2 bg-card rounded text-xs font-mono text-muted-foreground overflow-x-auto">
              {JSON.stringify(approval.request_details, null, 2)}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(approval.id)}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={14} />
                Approve
              </button>
              <button
                onClick={() => handleReject(approval.id)}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm rounded font-medium transition-colors flex items-center justify-center gap-2"
              >
                <XCircle size={14} />
                Reject
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
