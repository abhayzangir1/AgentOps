'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { Agent } from '@/lib/types'

interface AgentFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  parentAgents: Agent[]
  editAgent?: Agent | null
}

const CAPABILITY_PRESETS = [
  'read:database',
  'write:database',
  'send:email',
  'send:slack',
  'execute:code',
  'call:api',
  'read:files',
  'write:files',
  'manage:agents',
  'approve:actions',
]

export function AgentFormDialog({ isOpen, onClose, onSuccess, parentAgents, editAgent }: AgentFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newScope, setNewScope] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tier: 'basic',
    parent_agent_id: '',
    monthly_cost_usd: '0',
    budget_limit_usd: '',
    capability_scopes: [] as string[],
    escalation_timeout_hours: '24',
    escalate_to: '',
  })

  // Sync form data when editAgent changes
  useEffect(() => {
    if (editAgent) {
      setFormData({
        name: editAgent.name,
        description: editAgent.description ?? '',
        tier: editAgent.tier,
        parent_agent_id: editAgent.parent_agent_id?.toString() ?? '',
        monthly_cost_usd: editAgent.monthly_cost_usd?.toString() ?? '0',
        budget_limit_usd: editAgent.budget_limit_usd?.toString() ?? '',
        capability_scopes: editAgent.capability_scopes ?? [],
        escalation_timeout_hours: editAgent.escalation_policy?.timeout_hours?.toString() ?? '24',
        escalate_to: editAgent.escalation_policy?.escalate_to?.toString() ?? '',
      })
    } else {
      setFormData({
        name: '',
        description: '',
        tier: 'basic',
        parent_agent_id: '',
        monthly_cost_usd: '0',
        budget_limit_usd: '',
        capability_scopes: [],
        escalation_timeout_hours: '24',
        escalate_to: '',
      })
    }
  }, [editAgent, isOpen])

  if (!isOpen) return null

  const addScope = (scope: string) => {
    const s = scope.trim()
    if (!s || formData.capability_scopes.includes(s)) return
    setFormData((f) => ({ ...f, capability_scopes: [...f.capability_scopes, s] }))
    setNewScope('')
  }

  const removeScope = (scope: string) => {
    setFormData((f) => ({ ...f, capability_scopes: f.capability_scopes.filter((s) => s !== scope) }))
  }

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
          capability_scopes: formData.capability_scopes,
          escalation_policy: {
            timeout_hours: parseInt(formData.escalation_timeout_hours) || 24,
            escalate_to: formData.escalate_to ? parseInt(formData.escalate_to) : null,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save agent')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-semibold">{editAgent ? 'Edit Agent' : 'Create New Agent'}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          <form id="agent-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                placeholder="e.g. Customer Support Bot"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none transition"
                rows={2}
                placeholder="What does this agent do?"
              />
            </div>

            {/* Tier + Parent */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Tier</label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Parent Agent</label>
                <select
                  value={formData.parent_agent_id}
                  onChange={(e) => setFormData({ ...formData, parent_agent_id: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">None (Top Level)</option>
                  {parentAgents
                    .filter((a) => !editAgent || a.id !== editAgent.id)
                    .map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Cost + Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Monthly Cost ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_cost_usd}
                  onChange={(e) => setFormData({ ...formData, monthly_cost_usd: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Budget Cap ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.budget_limit_usd}
                  onChange={(e) => setFormData({ ...formData, budget_limit_usd: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="No limit"
                />
              </div>
            </div>

            {/* Capability Scopes */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Capability Scopes</label>
              <p className="text-xs text-muted-foreground mb-2">
                Actions this agent is permitted to perform. Sub-agents cannot exceed parent scopes.
              </p>
              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CAPABILITY_PRESETS.map((preset) => {
                  const active = formData.capability_scopes.includes(preset)
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => active ? removeScope(preset) : addScope(preset)}
                      className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                        active
                          ? 'bg-accent/15 border-accent/30 text-accent'
                          : 'border-border text-muted-foreground hover:border-accent/30 hover:text-foreground'
                      }`}
                    >
                      {preset}
                    </button>
                  )
                })}
              </div>
              {/* Custom scope input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addScope(newScope) } }}
                  placeholder="Custom scope (e.g. write:slack)"
                  className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => addScope(newScope)}
                  className="px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-sm flex items-center gap-1"
                >
                  <Plus size={13} />
                  Add
                </button>
              </div>
              {/* Active scopes */}
              {formData.capability_scopes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formData.capability_scopes.map((scope) => (
                    <span
                      key={scope}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-accent/15 border border-accent/25 text-accent"
                    >
                      {scope}
                      <button
                        type="button"
                        onClick={() => removeScope(scope)}
                        className="hover:text-destructive transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Escalation Policy */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Escalation Policy</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Timeout (hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={formData.escalation_timeout_hours}
                    onChange={(e) => setFormData({ ...formData, escalation_timeout_hours: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Escalate to User ID</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.escalate_to}
                    onChange={(e) => setFormData({ ...formData, escalate_to: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="None"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="agent-form"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : editAgent ? 'Update Agent' : 'Create Agent'}
          </button>
        </div>
      </div>
    </div>
  )
}
