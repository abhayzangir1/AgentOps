'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Agent } from '@/lib/types'

interface AgentFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  parentAgents: Agent[]
  editAgent?: Agent | null
}

export function AgentFormDialog({ isOpen, onClose, onSuccess, parentAgents, editAgent }: AgentFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: editAgent?.name || '',
    description: editAgent?.description || '',
    tier: editAgent?.tier || 'basic',
    parent_agent_id: editAgent?.parent_agent_id?.toString() || '',
    monthly_cost_usd: editAgent?.monthly_cost_usd?.toString() || '0',
    budget_limit_usd: (editAgent as any)?.budget_limit_usd?.toString() || '',
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const url = editAgent ? `/api/agents/${editAgent.id}` : '/api/agents'
      const method = editAgent ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          tier: formData.tier,
          parent_agent_id: formData.parent_agent_id ? parseInt(formData.parent_agent_id) : null,
          monthly_cost_usd: parseFloat(formData.monthly_cost_usd) || 0,
          budget_limit_usd: formData.budget_limit_usd ? parseFloat(formData.budget_limit_usd) : null,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save agent')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{editAgent ? 'Edit Agent' : 'Create New Agent'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Agent name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              rows={3}
              placeholder="What does this agent do?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tier</label>
              <select
                value={formData.tier}
                onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Parent Agent</label>
              <select
                value={formData.parent_agent_id}
                onChange={(e) => setFormData({ ...formData, parent_agent_id: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">None (Top Level)</option>
                {parentAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Cost ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.monthly_cost_usd}
                onChange={(e) => setFormData({ ...formData, monthly_cost_usd: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Budget Limit ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budget_limit_usd}
                onChange={(e) => setFormData({ ...formData, budget_limit_usd: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="No limit"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editAgent ? 'Update Agent' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
