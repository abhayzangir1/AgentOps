import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { nanoid } from 'nanoid'

export interface ActivityEvent {
  eventId: string
  agentId: number
  eventType: 'execution' | 'error' | 'approval' | 'deployment'
  description: string
  costUSD?: number
  duration?: number
  status: 'success' | 'pending' | 'failed'
  timestamp: number
  metadata?: Record<string, any>
}

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'agentops-activity'
const PK = process.env.DYNAMODB_TABLE_PARTITION_KEY || 'eventId'

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
    clientConfig: { region: process.env.AWS_REGION },
  }),
})

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})

export async function recordActivity(event: Omit<ActivityEvent, 'eventId'>): Promise<ActivityEvent> {
  const eventId = nanoid()
  const fullEvent: ActivityEvent = {
    ...event,
    eventId,
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: { [PK]: eventId, ...fullEvent },
    }),
  )

  return fullEvent
}

export async function getRecentActivity(limit: number = 20): Promise<ActivityEvent[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: limit,
    }),
  )

  const events = (result.Items || []) as ActivityEvent[]
  return events.sort((a, b) => b.timestamp - a.timestamp)
}

export async function getActivityByAgent(agentId: number, limit: number = 50): Promise<ActivityEvent[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'agentId = :agentId',
      ExpressionAttributeValues: {
        ':agentId': agentId,
      },
      Limit: limit,
    }),
  )

  const events = (result.Items || []) as ActivityEvent[]
  return events.sort((a, b) => b.timestamp - a.timestamp)
}
