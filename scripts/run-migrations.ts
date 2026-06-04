import { Pool } from 'pg'
import { Signer } from '@aws-sdk/rds-signer'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import * as fs from 'fs'
import * as path from 'path'

const signer = new Signer({
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
    clientConfig: { region: process.env.AWS_REGION },
  }),
  region: process.env.AWS_REGION!,
  hostname: process.env.PGHOST!,
  username: process.env.PGUSER || 'postgres',
  port: 5432,
})

async function runMigrations() {
  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE || 'postgres',
    port: 5432,
    user: process.env.PGUSER || 'postgres',
    password: await signer.getAuthToken(),
    ssl: { rejectUnauthorized: false },
    max: 5,
  })

  try {
    console.log('Connected to Aurora PostgreSQL')

    // Get all SQL files in the scripts directory
    const scriptsDir = path.join(__dirname)
    const files = fs.readdirSync(scriptsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      console.log(`Running migration: ${file}`)
      const sql = fs.readFileSync(path.join(scriptsDir, file), 'utf-8')
      await pool.query(sql)
      console.log(`Completed: ${file}`)
    }

    console.log('All migrations completed successfully!')
  } catch (error) {
    console.error('Migration error:', error)
    throw error
  } finally {
    await pool.end()
  }
}

runMigrations().catch(console.error)
