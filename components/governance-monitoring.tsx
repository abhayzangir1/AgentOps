'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, Progress } from '@/components/ui/simple-ui'
import { HelpTooltip } from '@/components/help-tooltip'
import { AlertCircle, CheckCircle2, Clock, TrendingUp, Shield, Eye } from 'lucide-react'

interface GovernanceMetric {
  agentId: number
  agentName: string
  status: 'healthy' | 'warning' | 'risk'
  monthlySpend: number
  monthlyBudget: number
  approvalRate: number // percentage
  actionsDenied: number
  actionsApproved: number
  actionsAutoApproved: number
  riskScore: number // 0-100
  lastAction: string
}

export function GovernanceMonitoring() {
  const [metrics] = useState<GovernanceMetric[]>([
    {
      agentId: 1,
      agentName: 'Email Assistant',
      status: 'healthy',
      monthlySpend: 45,
      monthlyBudget: 100,
      approvalRate: 92,
      actionsDenied: 1,
      actionsApproved: 12,
      actionsAutoApproved: 87,
      riskScore: 15,
      lastAction: '2 minutes ago',
    },
    {
      agentId: 2,
      agentName: 'Data Processor',
      status: 'warning',
      monthlySpend: 78,
      monthlyBudget: 100,
      approvalRate: 85,
      actionsDenied: 3,
      actionsApproved: 8,
      actionsAutoApproved: 52,
      riskScore: 35,
      lastAction: '5 minutes ago',
    },
    {
      agentId: 3,
      agentName: 'Payment Handler',
      status: 'risk',
      monthlySpend: 105,
      monthlyBudget: 100,
      approvalRate: 65,
      actionsDenied: 7,
      actionsApproved: 5,
      actionsAutoApproved: 3,
      riskScore: 72,
      lastAction: 'now',
    },
  ])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />
      case 'risk':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-amber-50 border-amber-200'
      case 'risk':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-slate-50 border-slate-200'
    }
  }

  return (
    <div className="space-y-6 w-full">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Eye className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length}</div>
            <p className="text-xs text-muted-foreground">{metrics.filter((m) => m.status === 'healthy').length} healthy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Actions This Month</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.reduce((sum, m) => sum + m.actionsAutoApproved + m.actionsApproved + m.actionsDenied, 0)}
            </div>
            <p className="text-xs text-muted-foreground">governed and tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Actions Blocked</CardTitle>
              <Shield className="w-4 h-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.reduce((sum, m) => sum + m.actionsDenied, 0)}</div>
            <p className="text-xs text-muted-foreground">risky actions prevented</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.reduce((sum, m) => sum + m.riskScore, 0) / metrics.length)}</div>
            <p className="text-xs text-muted-foreground">out of 100</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent Status Cards */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Agent Status</h3>
          <HelpTooltip
            title="Agent Governance Status"
            content="Real-time view of each agent's health, budget, and governance metrics. Green = healthy, Yellow = approaching limits, Red = requires attention."
            variant="help"
          />
        </div>

        {metrics.map((metric) => (
          <Card key={metric.agentId} className={`border-2 ${getStatusColor(metric.status)}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(metric.status)}
                  <div>
                    <CardTitle className="text-base">{metric.agentName}</CardTitle>
                    <CardDescription className="text-xs">Last action: {metric.lastAction}</CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    metric.status === 'healthy'
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : metric.status === 'warning'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-red-100 text-red-800 border-red-300'
                  }
                >
                  {metric.status.charAt(0).toUpperCase() + metric.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Budget Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Budget Usage</span>
                    <HelpTooltip
                      title="Budget Usage"
                      content={`${metric.monthlySpend} of ${metric.monthlyBudget} dollars spent this month`}
                      variant="info"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ${metric.monthlySpend} / ${metric.monthlyBudget}
                  </span>
                </div>
                <Progress value={(metric.monthlySpend / metric.monthlyBudget) * 100} className="h-2" />
              </div>

              {/* Action Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-white/50 rounded p-2 border">
                  <div className="text-xs text-muted-foreground">Auto-Approved</div>
                  <div className="font-semibold text-green-700">{metric.actionsAutoApproved}</div>
                </div>
                <div className="bg-white/50 rounded p-2 border">
                  <div className="text-xs text-muted-foreground">Approved</div>
                  <div className="font-semibold text-blue-700">{metric.actionsApproved}</div>
                </div>
                <div className="bg-white/50 rounded p-2 border">
                  <div className="text-xs text-muted-foreground">Denied</div>
                  <div className="font-semibold text-red-700">{metric.actionsDenied}</div>
                </div>
              </div>

              {/* Risk Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Risk Score</span>
                    <HelpTooltip
                      title="Risk Score"
                      content="0-100 scale based on budget usage, action types, and denial rate. Higher = more risk."
                      variant="info"
                    />
                  </div>
                  <span className="text-sm font-semibold">{metric.riskScore}/100</span>
                </div>
                <Progress value={metric.riskScore} className="h-2" />
              </div>

              {/* Approval Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Approval Success Rate</span>
                    <HelpTooltip
                      title="Approval Rate"
                      content="Percentage of requested actions that were approved vs denied"
                      variant="info"
                    />
                  </div>
                  <span className="text-sm font-semibold">{metric.approvalRate}%</span>
                </div>
                <Progress value={metric.approvalRate} className="h-2" />
              </div>

              {/* Status Message */}
              {metric.status === 'warning' && (
                <div className="bg-amber-100 border border-amber-300 rounded p-2 text-xs text-amber-900">
                  <p className="font-semibold">Warning:</p> Agent approaching 80% of monthly budget. Consider increasing limit or reducing activity.
                </div>
              )}

              {metric.status === 'risk' && (
                <div className="bg-red-100 border border-red-300 rounded p-2 text-xs text-red-900">
                  <p className="font-semibold">Risk Alert:</p> Agent has exceeded budget. High-cost actions are now auto-denied. Review and adjust budget.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Governance Rules Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">How Governance Works</CardTitle>
            <HelpTooltip
              title="Governance Engine"
              content="Our system automatically enforces rules without manual intervention required for every action."
              variant="help"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-sm">Auto-Approved</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Read operations</li>
                <li>• Low-cost actions (&lt; threshold)</li>
                <li>• Scheduled tasks</li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="font-semibold text-sm">Requires Approval</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Payments</li>
                <li>• Data deletion</li>
                <li>• External APIs</li>
              </ul>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="font-semibold text-sm">Auto-Denied</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Over budget</li>
                <li>• Out of scope</li>
                <li>• Unauthorized actions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
