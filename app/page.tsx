'use client'

import { useState } from 'react'
import { Menu, X, Settings, LogOut } from 'lucide-react'
import { AgentRegistry } from '@/components/agent-registry'
import { ActivityMonitor } from '@/components/activity-monitor'
import { ApprovalQueue } from '@/components/approval-queue'
import { CostDashboard } from '@/components/cost-dashboard'

type TabType = 'dashboard' | 'agents' | 'approvals' | 'costs'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard' },
    { id: 'agents' as const, label: 'Agent Registry' },
    { id: 'approvals' as const, label: 'Approvals' },
    { id: 'costs' as const, label: 'Cost Intelligence' },
  ]

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 border-r border-border bg-sidebar overflow-hidden flex flex-col`}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-accent">AgentOps</h1>
          <p className="text-xs text-muted-foreground mt-1">AI Agent Governance</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/20 transition-colors">
            <Settings size={16} />
            Settings
          </button>
          <button className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/20 transition-colors">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium">Operations Team</p>
              <p className="text-xs text-muted-foreground">ops@company.ai</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs">
              OP
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl">
              <div>
                <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
                <p className="text-sm text-muted-foreground">Real-time overview of all agents and operations</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity Feed */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <h3 className="text-lg font-semibold mb-4">Real-time Activity</h3>
                    <ActivityMonitor />
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-6 bg-card">
                    <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Agents</p>
                        <p className="text-3xl font-bold text-accent">11</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Pending Approvals</p>
                        <p className="text-3xl font-bold text-yellow-500">3</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Monthly Budget</p>
                        <p className="text-3xl font-bold text-green-500">$10,500</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Agent Registry</h2>
                <p className="text-sm text-muted-foreground">Manage and monitor all AI agents in your organization</p>
              </div>
              <div className="border border-border rounded-lg p-6 bg-card">
                <AgentRegistry />
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Approval Queue</h2>
                <p className="text-sm text-muted-foreground">Review and approve pending agent requests</p>
              </div>
              <div className="border border-border rounded-lg p-6 bg-card">
                <ApprovalQueue />
              </div>
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="max-w-5xl space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Cost Intelligence</h2>
                <p className="text-sm text-muted-foreground">Track and optimize agent operational expenses</p>
              </div>
              <div className="border border-border rounded-lg p-6 bg-card">
                <CostDashboard />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
