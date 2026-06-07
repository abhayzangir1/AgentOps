'use client'

import { useState } from 'react'
import { Check, Zap, Building2, Rocket, ArrowRight, Shield, BookOpen, DollarSign, Bot, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  id: string
  name: string
  price: string
  per: string
  description: string
  icon: React.ElementType
  color: string
  bg: string
  border: string
  highlight: boolean
  cta: string
  features: PlanFeature[]
  limits: {
    agents: string
    retention: string
    approvals: string
    forecasting: string
    export: string
    sso: string
    sla: string
    support: string
  }
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Free',
    per: 'forever',
    description: 'For teams just starting to explore AI agent governance.',
    icon: Zap,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    highlight: false,
    cta: 'Start free',
    features: [
      { text: 'Up to 3 active agents', included: true },
      { text: '7-day audit log retention', included: true },
      { text: 'Basic activity dashboard', included: true },
      { text: 'Agent registry (list + hierarchy)', included: true },
      { text: 'Human-in-the-loop approvals', included: false },
      { text: 'Budget caps & cost intelligence', included: false },
      { text: 'Cost forecasting charts', included: false },
      { text: 'CSV export (compliance)', included: false },
      { text: 'Permission hierarchy (recursive CTE)', included: false },
      { text: 'SSO integration', included: false },
    ],
    limits: {
      agents: '3 agents',
      retention: '7 days',
      approvals: 'Not included',
      forecasting: 'Not included',
      export: 'Not included',
      sso: 'Not included',
      sla: 'Community',
      support: 'Community forums',
    },
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$49',
    per: '/agent/month',
    description: 'Full governance for scaling AI teams. Everything you need to ship safely.',
    icon: Rocket,
    color: 'text-accent',
    bg: 'bg-accent/5',
    border: 'border-accent/30',
    highlight: true,
    cta: 'Start Growth trial',
    features: [
      { text: 'Unlimited active agents', included: true },
      { text: '1-year audit log retention', included: true },
      { text: 'Real-time activity monitor (DynamoDB)', included: true },
      { text: 'Human-in-the-loop approval engine', included: true },
      { text: 'Hard budget caps + auto-pause', included: true },
      { text: 'Cost intelligence & forecasting charts', included: true },
      { text: 'CSV + JSON compliance exports', included: true },
      { text: 'Permission hierarchy (recursive CTE)', included: true },
      { text: 'Org chart visualization', included: true },
      { text: 'SSO integration', included: false },
    ],
    limits: {
      agents: 'Unlimited',
      retention: '1 year',
      approvals: 'Unlimited',
      forecasting: '30-day trend + forecast',
      export: 'CSV + JSON',
      sso: 'Not included',
      sla: '99.9% uptime',
      support: 'Email + Slack',
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    per: 'pricing',
    description: 'Dedicated infrastructure and compliance for regulated industries.',
    icon: Building2,
    color: 'text-blue-400',
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/20',
    highlight: false,
    cta: 'Contact sales',
    features: [
      { text: 'Everything in Growth', included: true },
      { text: 'Dedicated infrastructure (VPC)', included: true },
      { text: 'SSO / SAML / OIDC integration', included: true },
      { text: 'Permanent compliance exports', included: true },
      { text: 'On-premise deployment option', included: true },
      { text: 'Custom audit retention policy', included: true },
      { text: 'Row-level security (RLS) per team', included: true },
      { text: 'Priority SLA (99.99% uptime)', included: true },
      { text: 'Dedicated customer success manager', included: true },
      { text: 'Custom SLA + DPA / BAA agreements', included: true },
    ],
    limits: {
      agents: 'Unlimited',
      retention: 'Permanent / custom',
      approvals: 'Unlimited',
      forecasting: 'Custom reporting',
      export: 'Any format + API',
      sso: 'SAML / OIDC',
      sla: '99.99% uptime',
      support: 'Dedicated CSM',
    },
  },
]

const COMPLIANCE_BADGES = [
  { label: 'SOC 2 Type II', color: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  { label: 'GDPR Art. 30', color: 'bg-purple-500/15 text-purple-400 border-purple-500/25' },
  { label: 'EU AI Act Art. 12', color: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  { label: 'ISO 27001 Ready', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
]

const COMPARISON_ROWS = [
  { label: 'Active agents', starter: '3', growth: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Audit log retention', starter: '7 days', growth: '1 year', enterprise: 'Permanent' },
  { label: 'Human-in-the-loop approvals', starter: false, growth: true, enterprise: true },
  { label: 'Budget caps & auto-pause', starter: false, growth: true, enterprise: true },
  { label: 'Cost forecasting charts', starter: false, growth: true, enterprise: true },
  { label: 'CSV / JSON export', starter: false, growth: true, enterprise: true },
  { label: 'Permission hierarchy (recursive CTE)', starter: false, growth: true, enterprise: true },
  { label: 'Org chart visualization', starter: false, growth: true, enterprise: true },
  { label: 'SSO / SAML', starter: false, growth: false, enterprise: true },
  { label: 'Dedicated infrastructure (VPC)', starter: false, growth: false, enterprise: true },
  { label: 'On-premise deployment', starter: false, growth: false, enterprise: true },
  { label: 'Row-level security (RLS)', starter: false, growth: false, enterprise: true },
  { label: 'DPA / BAA agreements', starter: false, growth: false, enterprise: true },
]

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-foreground">{value}</span>
  }
  if (value) {
    return <Check size={15} className="text-emerald-400 mx-auto" />
  }
  return <span className="text-muted-foreground/40 text-sm mx-auto block text-center">—</span>
}

export function PricingPage() {
  const [seats, setSeats] = useState(3)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [billing, setBilling] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleGrowthCheckout() {
    setBilling(null)
    setLoadingPlan('growth')
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: seats }),
      })
      const data = await res.json()
      if (!res.ok || !data.subscriptionId) {
        setBilling({ type: 'error', message: data.error || 'Could not start checkout. Verify Razorpay keys.' })
        return
      }
      if (typeof window === 'undefined' || !window.Razorpay) {
        setBilling({ type: 'error', message: 'Checkout failed to load. Please refresh and try again.' })
        return
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'AgentOps',
        description: `Growth plan — ${seats} agent seat${seats > 1 ? 's' : ''}`,
        theme: { color: '#10b981' },
        handler: async (response: Record<string, string>) => {
          const verify = await fetch('/api/billing/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          const vData = await verify.json()
          if (verify.ok && vData.verified) {
            setBilling({ type: 'success', message: 'Subscription active — Growth tier unlocked. Welcome aboard!' })
          } else {
            setBilling({ type: 'error', message: 'Payment captured but verification failed. Contact support.' })
          }
        },
        modal: {
          ondismiss: () => setBilling({ type: 'error', message: 'Checkout cancelled.' }),
        },
      })
      rzp.open()
    } catch {
      setBilling({ type: 'error', message: 'Network error starting checkout.' })
    } finally {
      setLoadingPlan(null)
    }
  }

  function handleCta(planId: string) {
    if (planId === 'growth') return handleGrowthCheckout()
    if (planId === 'enterprise') {
      setBilling({ type: 'success', message: 'Thanks! Our sales team will reach out about Enterprise pricing.' })
      return
    }
    setBilling({ type: 'success', message: 'Starter plan is free — you are already on it.' })
  }

  return (
    <div className="space-y-10 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Plans &amp; Pricing</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Agent-seat pricing — pay per active agent, not per human user. Scale your AI workforce without surprises.
        </p>
      </div>

      {/* Billing status */}
      {billing && (
        <div
          className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${
            billing.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          {billing.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {billing.message}
        </div>
      )}

      {/* Growth seat selector */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-accent/25 bg-accent/5">
        <Rocket size={16} className="text-accent" />
        <span className="text-sm font-medium">Growth plan — estimate your monthly cost</span>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-muted-foreground">Agent seats</label>
          <input
            type="number"
            min={1}
            max={500}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            className="w-20 h-9 px-2 rounded-lg bg-input border border-border text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm font-bold text-accent">= ${seats * 49}/mo</span>
        </div>
      </div>

      {/* Compliance badges */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground mr-1">Compliance-ready:</span>
        {COMPLIANCE_BADGES.map(({ label, color }) => (
          <span key={label} className={`text-[11px] font-bold px-2 py-0.5 rounded border ${color}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 ${plan.bg} ${
                plan.highlight ? `${plan.border} ring-1 ring-accent/30` : 'border-border'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-accent-foreground text-[11px] font-bold rounded-full uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              {/* Plan header */}
              <div className="flex items-center gap-2.5 mb-4">
                <div className={`p-2 rounded-lg border ${plan.border} ${plan.bg}`}>
                  <Icon size={16} className={plan.color} />
                </div>
                <div>
                  <h3 className="font-bold text-base">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description.split('.')[0]}.</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-4xl font-bold ${plan.color}`}>{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.per}</span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCta(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all mb-5 disabled:opacity-60 ${
                  plan.highlight
                    ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                    : plan.id === 'enterprise'
                    ? 'bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20'
                    : 'bg-muted/40 border border-border text-foreground hover:bg-muted/70'
                }`}
              >
                {loadingPlan === plan.id ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Starting checkout…
                  </>
                ) : (
                  <>
                    {plan.cta}
                    <ArrowRight size={14} />
                  </>
                )}
              </button>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {plan.features.map((feat) => (
                  <li
                    key={feat.text}
                    className={`flex items-start gap-2 text-sm ${
                      feat.included ? 'text-foreground' : 'text-muted-foreground/50 line-through'
                    }`}
                  >
                    <Check
                      size={13}
                      className={`flex-shrink-0 mt-0.5 ${feat.included ? plan.color : 'text-muted-foreground/30'}`}
                    />
                    {feat.text}
                  </li>
                ))}
              </ul>

              {/* Limits summary */}
              <div className="mt-5 pt-4 border-t border-border/50 space-y-1.5">
                {[
                  { k: 'Agents', v: plan.limits.agents },
                  { k: 'Log retention', v: plan.limits.retention },
                  { k: 'Support', v: plan.limits.support },
                  { k: 'SLA', v: plan.limits.sla },
                ].map(({ k, v }) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={`font-medium ${plan.color}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Feature comparison table */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="p-4 bg-card border-b border-border">
          <h3 className="text-sm font-semibold">Full Feature Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/20 border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-1/2">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.id} className={`text-center text-xs font-bold px-4 py-3 ${p.color}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={row.label} className={`border-b border-border/50 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-2.5 text-sm text-foreground">{row.label}</td>
                  <td className="px-4 py-2.5 text-center">
                    <FeatureCell value={row.starter} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <FeatureCell value={row.growth} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <FeatureCell value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust signals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Shield,
            title: 'SOC 2 Type II',
            body: 'Immutable audit logs classified against SOC 2 Type II, GDPR Art. 30, and EU AI Act Art. 12.',
          },
          {
            icon: DollarSign,
            title: 'No surprise bills',
            body: 'Hard budget caps automatically pause agents the moment monthly spend hits the configured threshold.',
          },
          {
            icon: Bot,
            title: 'Agent-seat pricing',
            body: 'You pay per active AI agent, not per human seat. Scale your team without escalating per-user costs.',
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className="text-accent" />
              <h4 className="text-sm font-semibold">{title}</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
