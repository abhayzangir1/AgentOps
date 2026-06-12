import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { getRecentActivity } from '@/lib/dynamodb'

// SSE — pushes new activity events as they arrive, polls DynamoDB every 2s.
// The connection stays open; the client gets data: {...}\n\n frames.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  let closed = false
  req.signal.addEventListener('abort', () => { closed = true })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send an initial "connected" heartbeat so the client knows the stream is live.
      controller.enqueue(encoder.encode(': connected\n\n'))

      // Seed with the current batch so the UI has data immediately.
      try {
        const initial = await getRecentActivity(20)
        if (!closed) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'batch', events: initial })}\n\n`),
          )
        }
      } catch {
        // Gracefully degrade — do not close stream on first fetch error
      }

      // Track the timestamp of the newest event we have seen so we only push deltas.
      let lastTimestamp = Date.now() - 5_000 // look back 5s on first delta poll

      const poll = async () => {
        if (closed) return
        try {
          const events = await getRecentActivity(20)
          // Only send events newer than what we have already emitted.
          const fresh = events.filter((e) => e.timestamp > lastTimestamp)
          if (fresh.length > 0) {
            lastTimestamp = Math.max(...fresh.map((e) => e.timestamp))
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'delta', events: fresh })}\n\n`),
            )
          }
        } catch {
          // Keep alive; DynamoDB transient errors shouldn't close the stream.
          controller.enqueue(encoder.encode(': keepalive\n\n'))
        }

        if (!closed) {
          setTimeout(poll, 2000)
        }
      }

      // Start delta polling after a short delay to avoid double-loading.
      setTimeout(poll, 2500)
    },
    cancel() {
      closed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
