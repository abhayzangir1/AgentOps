'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bot, Eye, EyeOff, Loader2, ShieldCheck, Zap, BookOpen, DollarSign } from 'lucide-react'

const FEATURES = [
  { icon: Zap,          text: 'Live telemetry across all AI workloads'           },
  { icon: ShieldCheck,  text: 'Human-in-the-loop safeguards for high-risk actions' },
  { icon: DollarSign,   text: 'Real-time budget caps — pause rogue agents instantly' },
  { icon: BookOpen,     text: 'Tamper-proof audit logs for SOC 2, GDPR, EU AI Act' },
]

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'signup') {
      if (!form.name.trim()) { setError('Full name is required'); return }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
      if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    }

    startTransition(async () => {
      try {
        const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
        const body = mode === 'login'
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Something went wrong')
          return
        }

        window.location.href = '/'
      } catch {
        setError('Network error — please try again')
      }
    })
  }

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'signup' : 'login'))
    setError('')
    setForm({ name: '', email: '', password: '', confirmPassword: '' })
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
            <Bot size={18} className="text-accent-foreground" />
          </div>
          <div>
            <span className="text-lg font-bold leading-none text-foreground">AgentOps</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">AI Governance Platform</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-balance text-foreground">
              Enterprise governance for autonomous AI workloads
            </h1>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              The management and control plane for every AI agent in your organization — from spawning
              sub-agents to enforcing budget caps before they rack up surprise bills.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="w-7 h-7 rounded-lg border border-border bg-muted/30 flex items-center justify-center flex-shrink-0">
                  <Icon size={13} className="text-accent" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Backed by Amazon Aurora PostgreSQL &amp; DynamoDB
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-7">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 justify-center">
            <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
              <Bot size={16} className="text-accent-foreground" />
            </div>
            <span className="text-base font-bold text-foreground">AgentOps</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground text-balance">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Sign in to your governance dashboard'
                : 'Start governing your AI agents today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.name}
                  onChange={onChange}
                  placeholder="Jane Smith"
                  className="w-full h-10 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={onChange}
                placeholder="you@company.ai"
                className="w-full h-10 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  value={form.password}
                  onChange={onChange}
                  placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                  className="w-full h-10 pl-3 pr-10 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={onChange}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-10 rounded-lg bg-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isPending && <Loader2 size={15} className="animate-spin" />}
              {isPending
                ? mode === 'login' ? 'Signing in…' : 'Creating account…'
                : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={switchMode}
              className="text-accent font-medium hover:underline transition"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {mode === 'login' && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-2">Demo credentials</p>
              <button
                type="button"
                onClick={() => {
                  setForm((f) => ({ ...f, email: 'ops@company.ai', password: 'AgentOps2024!' }))
                  setError('')
                }}
                className="w-full h-9 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/40 transition flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={12} className="text-accent" />
                Fill demo credentials
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
