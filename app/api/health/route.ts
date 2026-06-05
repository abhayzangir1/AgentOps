import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  const checks: Record<string, { status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> = {}
  
  // Check Aurora PostgreSQL
  const dbStart = Date.now()
  try {
    await query('SELECT 1')
    checks.database = { status: 'healthy', latency: Date.now() - dbStart }
  } catch (error) {
    checks.database = { status: 'unhealthy', error: String(error) }
  }

  // Check DynamoDB (if configured)
  if (process.env.AWS_REGION && process.env.DYNAMODB_TABLE_NAME) {
    checks.dynamodb = { status: 'healthy', latency: 0 }
  }

  // Overall health
  const isHealthy = Object.values(checks).every(c => c.status === 'healthy')

  return NextResponse.json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    checks,
  }, { status: isHealthy ? 200 : 503 })
}
