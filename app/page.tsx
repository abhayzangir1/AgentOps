'use client'

import { useState, useTransition } from 'react'
import useSWR from 'swr'
import {
  Menu,
  X,
  Bot,
  ShieldCheck,
  DollarSign,
  BookOpen,
  GitBranch,
  Activity,
  Bell,
  ChevronRight,
  Database,
  Zap,
  LayoutDashboard,
  Settings,
  LogOut,
  CreditCard,
} from 'lucide-react'
import { AgentRegistry } from '@/components/agent-registry'
import { ActivityMonitor } from '@/components/activity-monitor'
import { ApprovalQueue } from '@/components/approval-queue'
import { CostDashboard } from '@/components/cost-dashboard'
import { AuditLog } from '@/components/audit-log'
import { QuickStats } from '@/components/quick-stats'
import { ErrorBoundary } from '@/components/error-boundary'
import { PermissionHierarchy } from '@/components/permission-hierarchy'
import { SettingsModal } from '@/components/settings-modal'
import { PricingPage } from '@/components/pricing-page'
import { OpsCopilot } from '@/components/ops-copilot'
import { ConnectAgent } from '@/components/connect-agent'
import { DocumentationPage } from '@/components/documentation-page'
import { Plug, Book } from 'lucide-react'

type TabType = 'dashboard' | 'agents' | 'approvals' | 'costs' | 'audit' | 'permissions' | 'plans' | 'connect' | 'help'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const NAV_TABS: {
  id: TabType
  label: string
  icon: React.ElementType
  description: string
}[] = [
  { id: 'dashboard',    label: 'Dashboard',         icon: LayoutDashboard, description: 'System overview' },
  { id: 'agents',       label: 'Agent Registry',    icon: Bot,             description: 'Manage AI agents' },
  { id: 'connect',      label: 'Connect Agent',     icon: Plug,            description: 'SDK & integration' },
  { id: 'approvals',    label: 'Approvals',         icon: ShieldCheck,     description: 'Human-in-the-loop' },
  { id: 'costs',        label: 'Cost Intelligence', icon: DollarSign,      description: 'Budget enforcement' },
  { id: 'permissions',  label: 'Permissions',       icon: GitBranch,       description: 'Hierarchy & access' },
  { id: 'audit',        label: 'Audit Log',         icon: BookOpen,        description: 'Compliance records' },
  { id: 'plans',        label: 'Plans & Billing',   icon: CreditCard,      description: 'SaaS pricing tiers' },
  { id: 'help',         label: 'Help & Docs',       icon: Book,            description: 'How-to & Terms' },
]

function SystemStatusBar() {
  const { data: health, isLoading } = useSWR('/api/health', fetcher, { refreshInterval: 15000 })

  // Tri-state: while the first check is in flight we show "checking…" (amber)
  // instead of a misleading "down" (red).
  const dbState = !health && isLoading ? 'checking' : health?.checks?.database?.status === 'healthy' ? 'healthy' : 'down'
  const dynState = !health && isLoading ? 'checking' : health?.checks?.dynamodb?.status === 'healthy' ? 'healthy' : 'down'

  const dotClass = (s: string) =>
    s === 'healthy' ? 'bg-emerald-500' : s === 'checking' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'
  const label = (s: string) => (s === 'checking' ? 'checking…' : s)

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-muted/20 border-b border-border text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass(dbState)}`} />
        <span>Aurora PostgreSQL {label(dbState)}</span>
        {health?.checks?.database?.latency != null && (
          <span className="text-muted-foreground/50">{health.checks.database.latency}ms</span>
        )}
      </div>
      <span className="text-muted-foreground/30">·</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass(dynState)}`} />
        <span>DynamoDB {label(dynState)}</span>
      </div>
      <span className="text-muted-foreground/30">·</span>
      <div className="flex items-center gap-1.5">
        <Zap size={11} className="text-accent" />
        <span className="text-accent">Live telemetry active</span>
      </div>
    </div>
  )
}

function PendingBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
      {count > 9 ? '9+' : count}
    </span>
  )
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isLoggingOut, startLogout] = useTransition()

  const { data: approvals } = useSWR('/api/approvals', fetcher, { refreshInterval: 10000 })
  const { data: agents } = useSWR('/api/agents', fetcher, { refreshInterval: 30000 })
  const { data: meData, mutate: mutateMe } = useSWR('/api/auth/me', fetcher)
  const user = meData?.user ?? null

  const pendingCount = Array.isArray(approvals)
    ? approvals.filter((a: { status: string }) => a.status === 'pending').length
    : 0

  function handleLogout() {
    startLogout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' })
      window.location.href = '/login'
    })
  }

  function handleUserUpdate(updated: { id: number; email: string; name: string; role: string }) {
    mutateMe({ user: updated }, false)
  }

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'OP'

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } transition-all duration-300 border-r border-border bg-sidebar overflow-hidden flex flex-col flex-shrink-0`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-accent-foreground font-bold" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-none">AgentOps</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">AI Governance Platform</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 py-2">
            Operations
          </p>
          {NAV_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/10'
                }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.id === 'approvals' && <PendingBadge count={pendingCount} />}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-0.5">
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/10 transition-colors"
          >
            <Settings size={15} />
            Settings
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/10 transition-colors disabled:opacity-50"
          >
            <LogOut size={15} />
            {isLoggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* System status bar */}
        <SystemStatusBar />

        {/* Top header */}
        <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>AgentOps</span>
              <ChevronRight size={14} />
              <span className="text-foreground font-medium">
                {NAV_TABS.find((t) => t.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Approval bell */}
            <button
              onClick={() => setActiveTab('approvals')}
              className="relative p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Bell size={17} className="text-muted-foreground" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>

            {/* DB status indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-lg px-2.5 py-1.5">
              <Database size={12} />
              <span>AWS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>

            {/* User */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium leading-none">{user?.name ?? 'Loading…'}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{user?.email ?? ''}</p>
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs flex-shrink-0 hover:opacity-80 transition"
              >
                {initials}
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Command Center</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Real-time governance across all AI workloads — Jira meets Workday for virtual workers
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Live telemetry */}
                <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={16} className="text-accent" />
                    <h3 className="text-base font-semibold">Live Telemetry</h3>
                    <span className="text-xs text-muted-foreground ml-1">— DynamoDB activity stream</span>
                  </div>
                  <ActivityMonitor />
                </div>

                {/* Quick stats */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={16} className="text-accent" />
                    <h3 className="text-base font-semibold">System Overview</h3>
                  </div>
                  <QuickStats />
                </div>
              </div>

              {/* Pending approvals quick view */}
              {pendingCount > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className="text-yellow-400" />
                      <h3 className="text-base font-semibold text-yellow-400">
                        {pendingCount} agent action{pendingCount > 1 ? 's' : ''} frozen — awaiting review
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('approvals')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/25 text-yellow-400 text-sm font-medium rounded-lg transition-colors"
                    >
                      Review now
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Human-in-the-loop safeguards have intercepted high-risk intents. These agents are paused
                    until a supervisor grants explicit approval.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="max-w-4xl space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Agent Registry</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Hierarchical view of all AI workers — coordinator agents and their nested sub-agents
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <AgentRegistry />
              </div>
            </div>
          )}

          {activeTab === 'approvals' && (
            <div className="max-w-2xl space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Approval Queue</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  High-risk agent intents intercepted and frozen — grant or deny explicit supervisor approval
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <ApprovalQueue />
              </div>
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="max-w-5xl space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Cost Intelligence</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Fine-grained API token spend per agent with automated budget caps — pause rogue agents before surprise bills
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <ErrorBoundary
                  fallback={
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Failed to load cost data. Please refresh.
                    </div>
                  }
                >
                  <CostDashboard />
                </ErrorBoundary>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="max-w-4xl space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Tamper-proof, immutable record of every automated decision — compliant with SOC 2, GDPR, and EU AI Act
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <AuditLog />
              </div>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="max-w-4xl space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Permission Hierarchy</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Sub-agents never inherit capabilities or budgets exceeding their parent — recursive CTE enforcement
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <PermissionHierarchy />
              </div>
            </div>
          )}

          {activeTab === 'connect' && (
            <div className="max-w-4xl">
              <ErrorBoundary>
                <ConnectAgent agents={Array.isArray(agents) ? agents : []} />
              </ErrorBoundary>
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="max-w-5xl space-y-5">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Plans &amp; Billing</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Per-active-agent pricing — scale from experimenting to enterprise-grade deployment
                </p>
              </div>
              <PricingPage />
            </div>
          )}

          {activeTab === 'help' && (
            <DocumentationPage />
          )}
        </div>
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        onUserUpdate={handleUserUpdate}
      />

      <OpsCopilot />
    </div>
  )
}
