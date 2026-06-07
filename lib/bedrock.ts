import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

/**
 * Bedrock client authenticated with a dedicated IAM user (NOT the Vercel OIDC
 * role used for Aurora/DynamoDB) because Bedrock model invocation requires a
 * separate permission set. Credentials are read from BEDROCK_* env vars.
 */
let client: BedrockRuntimeClient | null = null

function getClient(): BedrockRuntimeClient {
  if (!client) {
    const accessKeyId = process.env.BEDROCK_AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.BEDROCK_AWS_SECRET_ACCESS_KEY
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Bedrock not configured: missing BEDROCK_AWS_ACCESS_KEY_ID / BEDROCK_AWS_SECRET_ACCESS_KEY')
    }
    client = new BedrockRuntimeClient({
      region: process.env.BEDROCK_AWS_REGION || 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
    })
  }
  return client
}

export function isBedrockConfigured(): boolean {
  return Boolean(process.env.BEDROCK_AWS_ACCESS_KEY_ID && process.env.BEDROCK_AWS_SECRET_ACCESS_KEY)
}

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'qwen.qwen3-vl-235b-a22b'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Low-level invocation. Qwen models on Bedrock use an OpenAI-style
 * messages payload. We parse the assistant text out of the response.
 */
export async function invokeModel(
  messages: Message[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const body = JSON.stringify({
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.3,
  })

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  })

  const response = await getClient().send(command)
  const decoded = JSON.parse(new TextDecoder().decode(response.body))

  // Qwen / OpenAI-style choices array
  const text =
    decoded?.choices?.[0]?.message?.content ??
    decoded?.choices?.[0]?.text ??
    decoded?.output?.message?.content ??
    decoded?.content ??
    ''

  if (Array.isArray(text)) {
    return text.map((c: { text?: string }) => c?.text ?? '').join('')
  }
  return String(text)
}

export interface RiskAnalysis {
  risk: 'critical' | 'high' | 'medium' | 'low'
  score: number
  summary: string
  concerns: string[]
  recommendation: 'approve' | 'reject' | 'review'
  reasoning: string
}

/**
 * Use the LLM to assess the risk of a pending agent action so a human
 * reviewer gets an immediate, structured recommendation.
 */
export async function analyzeApprovalRisk(input: {
  agentName: string
  agentTier: string
  requestType: string
  requestDetails: Record<string, unknown>
  monthlyCost?: number
  budgetLimit?: number | null
  capabilityScopes?: string[]
}): Promise<RiskAnalysis> {
  const system = `You are AgentOps Sentinel, an AI governance risk analyst for an enterprise platform that manages autonomous AI agents. You evaluate pending agent actions that have been frozen pending human approval. Be concise, decisive, and security-minded. Respond ONLY with strict minified JSON, no markdown.`

  const prompt = `Evaluate this frozen agent action and return a risk assessment.

Agent: ${input.agentName} (tier: ${input.agentTier})
Capability scopes: ${(input.capabilityScopes || []).join(', ') || 'none'}
Current monthly spend: $${input.monthlyCost ?? 0}
Budget limit: ${input.budgetLimit != null ? '$' + input.budgetLimit : 'none set'}
Request type: ${input.requestType}
Request payload: ${JSON.stringify(input.requestDetails)}

Return JSON with exactly these keys:
{"risk":"critical|high|medium|low","score":0-100,"summary":"one sentence","concerns":["short bullet", "..."],"recommendation":"approve|reject|review","reasoning":"2-3 sentences explaining the recommendation"}`

  const raw = await invokeModel(
    [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 700, temperature: 0.2 },
  )

  return parseRiskJson(raw)
}

function parseRiskJson(raw: string): RiskAnalysis {
  const fallback: RiskAnalysis = {
    risk: 'medium',
    score: 50,
    summary: 'Automated analysis unavailable — manual review required.',
    concerns: ['Risk model returned an unparseable response.'],
    recommendation: 'review',
    reasoning: 'The Sentinel model could not produce a structured assessment, so this action defaults to manual human review.',
  }

  try {
    // Extract the first JSON object even if the model wrapped it in prose/markdown.
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return fallback
    const parsed = JSON.parse(match[0])
    const risk = ['critical', 'high', 'medium', 'low'].includes(parsed.risk) ? parsed.risk : 'medium'
    const recommendation = ['approve', 'reject', 'review'].includes(parsed.recommendation)
      ? parsed.recommendation
      : 'review'
    return {
      risk,
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 50,
      summary: String(parsed.summary || fallback.summary),
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String).slice(0, 6) : [],
      recommendation,
      reasoning: String(parsed.reasoning || fallback.reasoning),
    }
  } catch {
    return fallback
  }
}
