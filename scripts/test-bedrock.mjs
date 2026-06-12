import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({
  region: process.env.BEDROCK_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY,
  },
})

const modelId = process.env.BEDROCK_MODEL_ID || 'qwen.qwen3-vl-235b-a22b'
console.log('Testing model:', modelId, 'in region:', process.env.BEDROCK_AWS_REGION || 'us-east-1')

try {
  const res = await client.send(
    new ConverseCommand({
      modelId,
      messages: [{ role: 'user', content: [{ text: 'Reply with exactly: AgentOps LLM online' }] }],
      inferenceConfig: { maxTokens: 50 },
    }),
  )
  console.log('SUCCESS:', JSON.stringify(res.output?.message?.content, null, 2))
} catch (e) {
  console.error('FAILED:', e.name, '-', e.message)
}
