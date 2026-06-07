'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X, Send, Loader2, Bot, MessageSquare } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Which agents are over budget?',
  'Summarize pending approvals',
  'What is our total monthly spend?',
  'Any risky recent activity?',
]

// Tiny markdown-ish renderer: bold + bullet lines. Avoids extra deps.
function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim()
    const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('·')
    const body = isBullet ? trimmed.replace(/^[-*·]\s*/, '') : line
    const parts = body.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith('**') && p.endsWith('**') ? (
        <strong key={j} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
      ) : (
        <span key={j}>{p}</span>
      ),
    )
    if (isBullet) {
      return (
        <div key={i} className="flex items-start gap-1.5">
          <span className="text-accent mt-0.5">·</span>
          <span>{parts}</span>
        </div>
      )
    }
    if (!line.trim()) return <div key={i} className="h-1.5" />
    return <p key={i}>{parts}</p>
  })
}

export function OpsCopilot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return
    setError(null)
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Copilot request failed')
        return
      }
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
    } catch {
      setError('Network error contacting Copilot')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-accent text-accent-foreground font-semibold text-sm shadow-lg shadow-accent/20 hover:opacity-90 transition"
          aria-label="Open Ops Copilot"
        >
          <Sparkles size={16} />
          Ops Copilot
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[min(26rem,calc(100vw-3rem))] h-[min(34rem,calc(100vh-3rem))] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/20">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">Ops Copilot</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Grounded in live platform data · Bedrock</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
                <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center">
                  <MessageSquare size={20} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ask about your AI workforce</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    The Copilot reads your live agents, approvals, costs, and audit trail to answer operational questions.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-accent text-accent-foreground rounded-br-sm'
                      : 'bg-muted/40 text-foreground rounded-bl-sm border border-border/50'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <div className="space-y-0.5">{renderContent(m.content)}</div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/40 border border-border/50 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  Analyzing live data…
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input) }}
            className="border-t border-border p-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about agents, costs, approvals…"
              className="flex-1 h-10 px-3 rounded-lg bg-input border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-10 w-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition flex-shrink-0"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
