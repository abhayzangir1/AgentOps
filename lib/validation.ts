// Enterprise-grade input validation utilities

export function validateString(value: unknown, fieldName: string, options?: {
  minLength?: number
  maxLength?: number
  pattern?: RegExp
}): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`)
  }
  
  const trimmed = value.trim()
  
  if (options?.minLength && trimmed.length < options.minLength) {
    throw new ValidationError(`${fieldName} must be at least ${options.minLength} characters`)
  }
  
  if (options?.maxLength && trimmed.length > options.maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${options.maxLength} characters`)
  }
  
  if (options?.pattern && !options.pattern.test(trimmed)) {
    throw new ValidationError(`${fieldName} format is invalid`)
  }
  
  return trimmed
}

export function validateNumber(value: unknown, fieldName: string, options?: {
  min?: number
  max?: number
  integer?: boolean
}): number {
  const num = typeof value === 'string' ? parseFloat(value) : value
  
  if (typeof num !== 'number' || isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`)
  }
  
  if (options?.integer && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`)
  }
  
  if (options?.min !== undefined && num < options.min) {
    throw new ValidationError(`${fieldName} must be at least ${options.min}`)
  }
  
  if (options?.max !== undefined && num > options.max) {
    throw new ValidationError(`${fieldName} must be at most ${options.max}`)
  }
  
  return num
}

export function validateEnum<T extends string>(value: unknown, fieldName: string, allowedValues: readonly T[]): T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`)
  }
  return value as T
}

export function validateOptional<T>(value: unknown, validator: (v: unknown) => T): T | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return validator(value)
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Sanitize SQL inputs (parameterized queries handle this, but extra safety)
export function sanitizeForLog(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  const str = String(value)
  // Remove potential log injection characters
  return str.replace(/[\n\r\t]/g, ' ').slice(0, 200)
}

// Rate limiting key generator
export function getRateLimitKey(ip: string, endpoint: string): string {
  return `ratelimit:${endpoint}:${ip}`
}

// Agent validation schemas
export const AGENT_TIERS = ['basic', 'pro', 'enterprise'] as const
export const AGENT_STATUSES = ['active', 'paused', 'inactive'] as const
export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'] as const

export function validateAgentInput(body: Record<string, unknown>) {
  return {
    name: validateString(body.name, 'name', { minLength: 2, maxLength: 100 }),
    description: validateString(body.description ?? '', 'description', { maxLength: 500 }),
    tier: validateEnum(body.tier, 'tier', AGENT_TIERS),
    status: validateOptional(body.status, (v) => validateEnum(v, 'status', AGENT_STATUSES)) ?? 'active',
    monthly_cost_usd: validateNumber(body.monthly_cost_usd ?? 0, 'monthly_cost_usd', { min: 0, max: 100000 }),
    budget_limit_usd: validateOptional(body.budget_limit_usd, (v) => validateNumber(v, 'budget_limit_usd', { min: 0, max: 1000000 })),
    parent_agent_id: validateOptional(body.parent_agent_id, (v) => validateNumber(v, 'parent_agent_id', { integer: true, min: 1 })),
    capability_scopes: Array.isArray(body.capability_scopes)
      ? (body.capability_scopes as string[]).filter((s) => typeof s === 'string').slice(0, 20)
      : [],
    escalation_policy: body.escalation_policy
      ? (body.escalation_policy as { timeout_hours: number; escalate_to: number | null })
      : { timeout_hours: 24, escalate_to: null },
  }
}

export function validateApprovalInput(body: Record<string, unknown>) {
  return {
    status: validateEnum(body.status, 'status', APPROVAL_STATUSES),
    notes: validateOptional(body.notes, (v) => validateString(v, 'notes', { maxLength: 1000 })),
  }
}
