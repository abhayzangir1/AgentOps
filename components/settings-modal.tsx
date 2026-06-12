'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import {
  X, User, Lock, Loader2, CheckCircle2, AlertCircle, KeyRound, Webhook,
  Plus, Trash2, Copy, Send, Power,
} from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  user: { id: number; email: string; name: string; role: string } | null
  onUserUpdate: (user: { id: number; email: string; name: string; role: string }) => void
}

type Tab = 'profile' | 'password' | 'apikeys' | 'webhooks'

const fetcher = (url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error('fetch failed'); return r.json() })

interface ApiKey {
  id: number
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

interface WebhookConfig {
  id: number
  provider: 'slack' | 'teams' | 'generic'
  url: string
  events: string[]
  enabled: boolean
  created_at: string
  last_fired_at: string | null
  last_status: number | null
}

const EVENT_OPTIONS = [
  { id: 'approval.pending', label: 'Approval pending' },
  { id: 'approval.decided', label: 'Approval decided' },
  { id: 'budget.alert', label: 'Budget alert' },
]

export function SettingsModal({ open, onClose, user, onUserUpdate }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>('profile')
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [profile, setProfile] = useState({ name: '', email: '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  useEffect(() => {
    if (user) setProfile({ name: user.name, email: user.email })
  }, [user])

  useEffect(() => {
    if (open) {
      setStatus(null)
      setTab('profile')
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' })
    }
  }, [open])

  if (!open) return null

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: profile.name, email: profile.email }),
        })
        const data = await res.json()
        if (!res.ok) { setStatus({ type: 'error', message: data.error || 'Update failed' }); return }
        onUserUpdate(data.user)
        setStatus({ type: 'success', message: 'Profile updated successfully' })
      } catch {
        setStatus({ type: 'error', message: 'Network error — please try again' })
      }
    })
  }

  function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (pw.newPassword !== pw.confirmPassword) {
      setStatus({ type: 'error', message: 'New passwords do not match' })
      return
    }
    if (pw.newPassword.length < 8) {
      setStatus({ type: 'error', message: 'New password must be at least 8 characters' })
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }),
        })
        const data = await res.json()
        if (!res.ok) { setStatus({ type: 'error', message: data.error || 'Update failed' }); return }
        setPw({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setStatus({ type: 'success', message: 'Password changed successfully' })
      } catch {
        setStatus({ type: 'error', message: 'Network error — please try again' })
      }
    })
  }

  const TABS = [
    ['profile', User, 'Profile'],
    ['password', Lock, 'Password'],
    ['apikeys', KeyRound, 'API Keys'],
    ['webhooks', Webhook, 'Alerts'],
  ] as const

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Account Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setStatus(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition border-b-2 ${
                tab === id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[65vh] overflow-y-auto">
          {status && (
            <div
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-4 ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-destructive/10 border border-destructive/20 text-destructive'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {status.message}
            </div>
          )}

          {tab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Full name</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  required
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Role</label>
                <input
                  type="text"
                  readOnly
                  value={user?.role ?? ''}
                  className="w-full h-10 px-3 rounded-lg bg-muted/30 border border-border text-muted-foreground text-sm cursor-not-allowed"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-10 rounded-lg bg-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {isPending ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handlePasswordSave} className="space-y-4">
              {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground capitalize">
                    {field === 'currentPassword' ? 'Current password'
                      : field === 'newPassword' ? 'New password'
                      : 'Confirm new password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={pw[field]}
                    onChange={(e) => setPw((p) => ({ ...p, [field]: e.target.value }))}
                    placeholder={field === 'newPassword' ? 'Min. 8 characters' : '••••••••'}
                    className="w-full h-10 px-3 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={isPending}
                className="w-full h-10 rounded-lg bg-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                {isPending ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}

          {tab === 'apikeys' && <ApiKeysPanel />}
          {tab === 'webhooks' && <WebhooksPanel />}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* API Keys                                                            */
/* ------------------------------------------------------------------ */

function ApiKeysPanel() {
  const { data, mutate, isLoading } = useSWR<{ keys: ApiKey[] }>('/api/keys', fetcher)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function createKey(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create key'); return }
      setNewSecret(data.secret)
      setName('')
      mutate()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function revokeKey(id: number) {
    await fetch(`/api/keys/${id}`, { method: 'DELETE' })
    mutate()
  }

  const copySecret = useCallback(() => {
    if (!newSecret) return
    navigator.clipboard.writeText(newSecret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [newSecret])

  const activeKeys = data?.keys?.filter((k) => !k.revoked_at) ?? []

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        API keys authenticate SDK and programmatic access to AgentOps. Keys are hashed at rest — the
        full secret is shown only once at creation.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {newSecret && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 space-y-2">
          <p className="text-xs font-semibold text-emerald-400">Copy your key now — it will not be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-foreground bg-background/60 px-2 py-1.5 rounded break-all">{newSecret}</code>
            <button
              onClick={copySecret}
              className="shrink-0 p-1.5 rounded-lg bg-muted/40 border border-border text-foreground hover:bg-muted/70 transition"
              aria-label="Copy API key"
            >
              {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
          <button onClick={() => setNewSecret(null)} className="text-xs text-muted-foreground hover:text-foreground underline">
            I&apos;ve saved it
          </button>
        </div>
      )}

      <form onSubmit={createKey} className="flex gap-2">
        <input
          type="text"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. CI pipeline)"
          className="flex-1 h-9 px-3 rounded-lg bg-input border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-9 px-3 rounded-lg bg-accent text-accent-foreground text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Create
        </button>
      </form>

      <div className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">Loading keys…</p>}
        {!isLoading && activeKeys.length === 0 && (
          <p className="text-xs text-muted-foreground">No active API keys yet.</p>
        )}
        {activeKeys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border">
            <KeyRound size={14} className="text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{k.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {k.key_prefix}… · created {new Date(k.created_at).toLocaleDateString()}
                {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}` : ' · never used'}
              </p>
            </div>
            <button
              onClick={() => revokeKey(k.id)}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
              aria-label={`Revoke key ${k.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Webhooks (Slack / Teams / Generic)                                  */
/* ------------------------------------------------------------------ */

function WebhooksPanel() {
  const { data, mutate, isLoading } = useSWR<{ webhooks: WebhookConfig[] }>('/api/webhooks', fetcher)
  const [provider, setProvider] = useState<'slack' | 'teams' | 'generic'>('slack')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<string[]>(EVENT_OPTIONS.map((e) => e.id))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: number; ok: boolean } | null>(null)

  async function createWebhook(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, url, events }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to add webhook'); return }
      setUrl('')
      mutate()
    } catch {
      setError('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleWebhook(id: number, enabled: boolean) {
    await fetch(`/api/webhooks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !enabled }),
    })
    mutate()
  }

  async function deleteWebhook(id: number) {
    await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
    mutate()
  }

  async function testWebhook(id: number) {
    setTestResult(null)
    const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setTestResult({ id, ok: res.ok && data.delivered })
    mutate()
  }

  const PROVIDERS = [
    { id: 'slack' as const, label: 'Slack' },
    { id: 'teams' as const, label: 'Microsoft Teams' },
    { id: 'generic' as const, label: 'Generic JSON' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Send real-time alerts to Slack, Microsoft Teams, or any HTTPS endpoint when approvals are
        created or decided, or budgets are breached.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={createWebhook} className="space-y-3 p-3 rounded-lg bg-muted/15 border border-border">
        <div className="flex gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProvider(p.id)}
              className={`flex-1 h-8 rounded-lg text-xs font-medium transition border ${
                provider === p.id
                  ? 'bg-accent/15 border-accent/40 text-accent'
                  : 'bg-transparent border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={
            provider === 'slack' ? 'https://hooks.slack.com/services/…'
            : provider === 'teams' ? 'https://outlook.office.com/webhook/…'
            : 'https://your-endpoint.example.com/alerts'
          }
          className="w-full h-9 px-3 rounded-lg bg-input border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring transition"
        />
        <div className="flex flex-wrap gap-2">
          {EVENT_OPTIONS.map((ev) => (
            <label key={ev.id} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={events.includes(ev.id)}
                onChange={(e) =>
                  setEvents((prev) => e.target.checked ? [...prev, ev.id] : prev.filter((x) => x !== ev.id))
                }
                className="accent-[var(--accent)]"
              />
              {ev.label}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy || events.length === 0}
          className="w-full h-9 rounded-lg bg-accent text-accent-foreground text-sm font-semibold flex items-center justify-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Add webhook
        </button>
      </form>

      <div className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground">Loading webhooks…</p>}
        {!isLoading && (data?.webhooks?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">No webhooks configured yet.</p>
        )}
        {data?.webhooks?.map((w) => (
          <div key={w.id} className="p-3 rounded-lg bg-muted/20 border border-border space-y-1.5">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${w.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
              <span className="text-sm font-medium text-foreground capitalize">{w.provider === 'teams' ? 'Microsoft Teams' : w.provider}</span>
              {w.last_status != null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  w.last_status >= 200 && w.last_status < 300
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  last: {w.last_status === 0 ? 'ERR' : w.last_status}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => testWebhook(w.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition"
                  aria-label="Send test alert"
                  title="Send test alert"
                >
                  <Send size={13} />
                </button>
                <button
                  onClick={() => toggleWebhook(w.id, w.enabled)}
                  className={`p-1.5 rounded-lg transition ${w.enabled ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted/40'}`}
                  aria-label={w.enabled ? 'Disable webhook' : 'Enable webhook'}
                  title={w.enabled ? 'Disable' : 'Enable'}
                >
                  <Power size={13} />
                </button>
                <button
                  onClick={() => deleteWebhook(w.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                  aria-label="Delete webhook"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-mono truncate">{w.url}</p>
            <p className="text-[10px] text-muted-foreground/70">{w.events.join(' · ')}</p>
            {testResult?.id === w.id && (
              <p className={`text-xs font-medium ${testResult.ok ? 'text-emerald-400' : 'text-destructive'}`}>
                {testResult.ok ? 'Test delivered successfully' : 'Test failed — check the URL'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
