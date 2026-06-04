'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Approval, Agent } from '@/lib/types'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Demo approvals for hackathon
const DEMO_APPROVALS: Approval[] = [
  {
    id: 1,
    agent_id: 1,
    request_type: 'resource_upgrade',
    request_details: {
      current_tier: 'pro',
      requested_tier: 'enterprise',
      reason: 'increased load during peak hours',
      expectedCostIncrease: 3500,
    },
    requested_by_user_id: 2,
    status: 'pending',
    assigned_to_user_id: 1,
    created_at: '2025-06-04T17:30:00Z',
    updated_at: '2025-06-04T17:30:00Z',
    resolved_at: null,
    notes: null,
  },
  {
    id: 2,
    agent_id: 2,
    request_type: 'config_change',
    request_details: {
      parameter: 'batch_size',
      old_value: 100,
      new_value: 500,
      justification: 'improve throughput',
    },
    requested_by_user_id: 2,
    status: 'pending',
    assigned_to_user_id: 1,
    created_at: '2025-06-04T17:45:00Z',
    updated_at: '2025-06-04T17:45:00Z',
    resolved_at: null,
    notes: null,
  },
  {
    id: 3,
    agent_id: 3,
    request_type: 'cost_increase',
    request_details: {
      monthly_budget: 1500,
      requested_budget: 2000,
      reason: 'expanded content library access',
    },
    requested_by_user_id: 2,
    status: 'pending',
    assigned_to_user_id: 1,
    created_at: '2025-06-04T18:00:00Z',
    updated_at: '2025-06-04T18:00:00Z',
    resolved_at: null,
    notes: null,
  },
]

export function ApprovalQueue() {
  const { data: approvals, isLoading, mutate } = useSWR<Approval[]>('/api/approvals', fetcher, {
    refreshInterval: 5000,
    fallbackData: DEMO_APPROVALS,
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

  if (pendingApprovals.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-border rounded-lg">
        <CheckCircle size={32} className="mx-auto text-green-500/50 mb-3" />
        <p className="text-sm text-muted-foreground">All approvals processed</p>
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
