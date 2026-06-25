'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/simple-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HelpTooltip, InlineHelp } from '@/components/help-tooltip'
import { AlertCircle, CheckCircle2, Settings } from 'lucide-react'

// Simple toast implementation
const toast = {
  success: (msg: string) => console.log(msg),
  error: (msg: string) => console.error(msg)
}

interface OnboardingStep {
  id: 'name' | 'type' | 'budget' | 'rules'
  title: string
  description: string
  completed: boolean
}

export function SimpleAgentOnboarding() {
  const [step, setStep] = useState<'name' | 'type' | 'budget' | 'rules' | 'complete'>('name')
  const [formData, setFormData] = useState({
    name: '',
    type: 'general',
    budget: 100,
    autoApproveThreshold: 50,
  })
  const [isLoading, setIsLoading] = useState(false)

  const steps: OnboardingStep[] = [
    {
      id: 'name',
      title: 'Agent Name',
      description: 'Give your agent a memorable name',
      completed: formData.name.length > 0,
    },
    {
      id: 'type',
      title: 'Agent Type',
      description: 'Choose what your agent does',
      completed: formData.type.length > 0,
    },
    {
      id: 'budget',
      title: 'Monthly Budget',
      description: 'Set spending limits',
      completed: formData.budget > 0,
    },
    {
      id: 'rules',
      title: 'Approval Rules',
      description: 'Configure governance',
      completed: formData.autoApproveThreshold > 0,
    },
  ]

  const handleCreateAgent = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter an agent name')
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to create agent')

      toast.success('Agent created successfully!')
      setStep('complete')
      // Reset form
      setFormData({ name: '', type: 'general', budget: 100, autoApproveThreshold: 50 })
    } catch (error) {
      toast.error('Error creating agent')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  // Step 1: Agent Name
  if (step === 'name') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Add Your First Agent</CardTitle>
            <HelpTooltip
              title="What is an Agent?"
              content="An agent is an AI system that performs actions on your behalf. AgentOps monitors and governs these actions."
              variant="help"
            />
          </div>
          <CardDescription>Step 1 of 4: Name your agent</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              Agent Name
              <HelpTooltip
                title="Agent Name"
                content="A unique name to identify your agent (e.g., 'Email Assistant', 'Data Processor')"
                variant="info"
              />
            </label>
            <Input
              placeholder="e.g., Email Assistant, Data Processor"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
          </div>
          <InlineHelp title="Why name your agent?">
            A clear name helps you identify what the agent does at a glance in your dashboard.
          </InlineHelp>
          <Button
            onClick={() => setStep('type')}
            disabled={!formData.name.trim()}
            className="w-full"
          >
            Next: Choose Type
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Step 2: Agent Type
  if (step === 'type') {
    const types = [
      { value: 'general', label: 'General Purpose', desc: 'Multi-purpose AI assistant' },
      { value: 'data', label: 'Data Processor', desc: 'Analyzes and transforms data' },
      { value: 'email', label: 'Email Assistant', desc: 'Manages email and communications' },
      { value: 'payment', label: 'Payment Handler', desc: 'Processes transactions' },
      { value: 'scheduling', label: 'Scheduler', desc: 'Manages appointments and tasks' },
      { value: 'custom', label: 'Custom', desc: 'Define your own type' },
    ]

    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Agent Type</CardTitle>
            <HelpTooltip
              title="Agent Type"
              content="The type determines which governance rules apply. Each type has different approval requirements."
              variant="help"
            />
          </div>
          <CardDescription>Step 2 of 4: Choose what your agent does</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {types.map((type) => (
              <button
                key={type.value}
                onClick={() => setFormData({ ...formData, type: type.value })}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  formData.type === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{type.label}</div>
                <div className="text-xs text-muted-foreground">{type.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('name')} className="flex-1">
              Back
            </Button>
            <Button onClick={() => setStep('budget')} className="flex-1">
              Next: Budget
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 3: Budget
  if (step === 'budget') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Monthly Budget</CardTitle>
            <HelpTooltip
              title="Budget Limit"
              content="Maximum amount your agent can spend per month. Exceeding this will auto-deny expensive actions."
              variant="info"
            />
          </div>
          <CardDescription>Step 3 of 4: Set spending limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              Monthly Budget (USD)
              <HelpTooltip
                title="What counts toward budget?"
                content="All agent actions with costs: API calls, payments, data processing, external services."
                variant="info"
              />
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">$</span>
              <Input
                type="number"
                min="0"
                step="10"
                value={formData.budget}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, budget: Math.max(0, parseInt(e.target.value) || 0) })}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-2">
            <p className="font-semibold text-blue-900">Budget Alert Thresholds:</p>
            <ul className="text-xs text-blue-800 space-y-1 ml-2">
              <li>• 50% reached: Action requires approval</li>
              <li>• 80% reached: Warning notification</li>
              <li>• 100% reached: All high-cost actions denied</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('type')} className="flex-1">
              Back
            </Button>
            <Button onClick={() => setStep('rules')} className="flex-1">
              Next: Rules
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 4: Approval Rules
  if (step === 'rules') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Approval Rules</CardTitle>
            <HelpTooltip
              title="Governance Rules"
              content="Rules determine which actions are auto-approved vs require human approval."
              variant="help"
            />
          </div>
          <CardDescription>Step 4 of 4: Configure governance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Auto-Approved:</span>
              </div>
              <ul className="text-xs text-green-800 ml-6 space-y-1">
                <li>• Read-only actions</li>
                <li>• Costs under ${formData.autoApproveThreshold}</li>
                <li>• Scheduled maintenance</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">Requires Approval:</span>
              </div>
              <ul className="text-xs text-amber-800 ml-6 space-y-1">
                <li>• Payments or transfers</li>
                <li>• Data deletion or modification</li>
                <li>• External API calls</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                Auto-Approve Threshold ($)
                <HelpTooltip
                  title="Auto-Approve Threshold"
                  content="Actions under this cost are automatically approved without human review."
                  variant="info"
                />
              </label>
              <Input
                type="number"
                min="0"
                step="10"
                value={formData.autoApproveThreshold}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, autoApproveThreshold: Math.max(0, parseInt(e.target.value) || 0) })
                }
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('budget')} className="flex-1">
              Back
            </Button>
            <Button onClick={handleCreateAgent} disabled={isLoading} className="flex-1">
              {isLoading ? 'Creating...' : 'Create Agent'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Completion Screen
  if (step === 'complete') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-center mt-4">Agent Created!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-900 font-medium">{formData.name}</p>
            <p className="text-xs text-green-700 mt-1">Now ready for governance and monitoring</p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Next steps:</p>
            <ol className="ml-4 space-y-1 text-muted-foreground list-decimal">
              <li>Go to "Connect Agent" tab to get API keys</li>
              <li>Integrate the SDK with your agent code</li>
              <li>Monitor activity in your dashboard</li>
            </ol>
          </div>

          <Button onClick={() => setStep('name')} className="w-full">
            Add Another Agent
          </Button>
        </CardContent>
      </Card>
    )
  }
}
