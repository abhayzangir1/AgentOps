// One-off admin utility: set a user's plan (and optionally delete an agent).
// Usage: node --env-file=/vercel/share/.env.project scripts/set-plan.mjs <plan> [deleteAgentId]
import pg from 'pg'
import { Signer } from '@aws-sdk/rds-signer'
import { awsCredentialsProvider } from '@vercel/functions/oidc'

const plan = process.argv[2]
const deleteAgentId = process.argv[3] ? parseInt(process.argv[3]) : null

if (!['starter', 'growth', 'enterprise'].includes(plan)) {
  console.error('Usage: set-plan.mjs <starter|growth|enterprise> [deleteAgentId]')
  process.exit(1)
}

const signer = new Signer({
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN,
    clientConfig: { region: process.env.AWS_REGION },
  }),
  region: process.env.AWS_REGION,
  hostname: process.env.PGHOST,
  username: process.env.PGUSER || 'postgres',
  port: 5432,
})

const client = new pg.Client({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE || 'postgres',
  port: 5432,
  user: process.env.PGUSER || 'postgres',
  password: await signer.getAuthToken(),
  ssl: { rejectUnauthorized: false },
})

await client.connect()
const r = await client.query(`UPDATE users SET plan = $1 WHERE email = 'ops@company.ai' RETURNING id, plan`, [plan])
console.log('plan set:', JSON.stringify(r.rows[0]))
if (deleteAgentId) {
  await client.query('DELETE FROM agents WHERE id = $1', [deleteAgentId])
  console.log('deleted agent', deleteAgentId)
}
await client.end()
