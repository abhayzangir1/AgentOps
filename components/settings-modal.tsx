'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, User, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  user: { id: number; email: string; name: string; role: string } | null
  onUserUpdate: (user: { id: number; email: string; name: string; role: string }) => void
}

type Tab = 'profile' | 'password'

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
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
          {([['profile', User, 'Profile'], ['password', Lock, 'Password']] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id); setStatus(null) }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition border-b-2 ${
                tab === id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Status */}
          {status && (
            <div
              className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-4 ${
                status.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : 'bg-destructive/10 border border-destructive/20 text-destructive'
              }`}
            >
              {status.type === 'success'
                ? <CheckCircle2 size={14} />
                : <AlertCircle size={14} />}
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
        </div>
      </div>
    </div>
  )
}
