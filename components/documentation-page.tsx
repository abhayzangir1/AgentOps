'use client'

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/simple-ui'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Shield, BarChart3 } from 'lucide-react'

export function DocumentationPage() {
  const [activeTab, setActiveTab] = useState('how-to')

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="how-to">How-To Guide</TabsTrigger>
          <TabsTrigger value="terms">Terms & Conditions</TabsTrigger>
        </TabsList>

        {/* HOW-TO GUIDE */}
        <TabsContent value="how-to" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>How to Use AgentOps</CardTitle>
              <CardDescription>
                Complete guide to governing and monitoring your AI agents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Section 1: Getting Started */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">1. Getting Started</h3>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <p className="text-sm">
                    AgentOps provides governance and monitoring for your AI agents. Here's how to get started:
                  </p>
                  <ol className="space-y-2 text-sm list-decimal list-inside ml-2">
                    <li>Sign up with your email and password</li>
                    <li>You'll start with an empty workspace (clean slate)</li>
                    <li>Create or connect your first agent</li>
                    <li>Set budget limits and approval rules</li>
                    <li>Your agent can now be governed by the platform</li>
                  </ol>
                </div>
              </div>

              {/* Section 2: Adding Agents */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">2. Adding Agents</h3>
                </div>
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold">Simple 1-Click Process:</p>
                    <ol className="space-y-2 text-sm list-decimal list-inside ml-2">
                      <li>Go to "Agent Registry" tab</li>
                      <li>Click "Add Agent"</li>
                      <li>Enter: Agent name, description, capability type</li>
                      <li>Set budget limit (monthly spend cap)</li>
                      <li>Choose approval rules (auto-approve safe actions, require approval for risky ones)</li>
                      <li>Done! Your agent is registered</li>
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    No code required. All configuration is in the UI.
                  </p>
                </div>
              </div>

              {/* Section 3: Governance Rules */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">3. Governance Rules</h3>
                </div>
                <div className="space-y-4">
                  <Card className="border-0 bg-slate-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">What Gets Governed?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold text-green-700">Auto-Approved (Safe):</p>
                        <ul className="ml-4 mt-1 space-y-1 text-muted-foreground">
                          <li>• Read operations (low cost &lt;$1)</li>
                          <li>• Scheduled maintenance tasks</li>
                          <li>• Status checks and monitoring</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-amber-700">Requires Approval:</p>
                        <ul className="ml-4 mt-1 space-y-1 text-muted-foreground">
                          <li>• Payments or transfers (&gt;$100)</li>
                          <li>• Data deletion or modification</li>
                          <li>• External API calls</li>
                          <li>• Reaching 80% of budget</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-red-700">Auto-Denied (Risky):</p>
                        <ul className="ml-4 mt-1 space-y-1 text-muted-foreground">
                          <li>• Exceeding budget limit</li>
                          <li>• Unauthorized capability scope</li>
                          <li>• Repeated failed approval attempts</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Section 4: Monitoring */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">4. Real-Time Monitoring</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                    <p className="font-semibold">Live Dashboard Widgets:</p>
                    <ul className="space-y-2 ml-4">
                      <li>
                        <span className="font-medium">Activity Monitor:</span> Real-time feed of all agent actions
                      </li>
                      <li>
                        <span className="font-medium">Cost Intelligence:</span> Track spending by agent
                      </li>
                      <li>
                        <span className="font-medium">Approvals Inbox:</span> Pending decisions requiring your review
                      </li>
                      <li>
                        <span className="font-medium">Audit Log:</span> Complete history of all agent activity
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 5: Approving Actions */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">5. Approving Agent Actions</h3>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3 text-sm">
                  <p className="font-semibold">When an agent requests approval:</p>
                  <ol className="space-y-2 list-decimal list-inside ml-2">
                    <li>A notification appears in your Approvals Inbox</li>
                    <li>Review the action details: what, why, estimated cost</li>
                    <li>See the agent's reasoning and any risks flagged</li>
                    <li>Click Approve, Reject, or Request More Info</li>
                    <li>Your decision is immediately communicated to the agent</li>
                  </ol>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tip: Set up automatic approvals for safe, low-cost actions to reduce manual review.
                  </p>
                </div>
              </div>

              {/* Section 6: Security */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">6. Security & Privacy</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <p className="font-semibold">Your Data is Private:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• Each user has an isolated workspace</li>
                      <li>• Agents only see their own activity</li>
                      <li>• API keys are encrypted and single-use</li>
                      <li>• All actions are logged and immutable</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Section 7: Integration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">7. Integrating Your Agent</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                    <p className="font-semibold">Connect Any AI Agent:</p>
                    <ol className="space-y-2 list-decimal list-inside ml-2">
                      <li>Go to "Connect Agent" tab</li>
                      <li>Select your agent from the registry</li>
                      <li>Generate an API key (show once, save it securely)</li>
                      <li>Use our SDK: just 3 lines of code to integrate</li>
                      <li>Agent is now governed and monitored</li>
                    </ol>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Check the "Connect Agent" tab for copy-paste code examples.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TERMS & CONDITIONS */}
        <TabsContent value="terms" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
              <CardDescription>
                Please read these terms carefully before using AgentOps
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              {/* Section 1: Service Description */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">1. Service Description</h3>
                <p className="text-muted-foreground">
                  AgentOps is a governance and monitoring platform for AI agents. The service provides:
                </p>
                <ul className="ml-4 space-y-1 text-muted-foreground list-disc">
                  <li>Real-time monitoring of agent activity</li>
                  <li>Approval workflows for risky actions (Human-In-The-Loop)</li>
                  <li>Cost tracking and budget enforcement</li>
                  <li>Complete audit trails and compliance logging</li>
                  <li>Privacy isolation between users</li>
                </ul>
              </div>

              {/* Section 2: User Responsibility */}
              <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-base">2. User Responsibility</h3>
                <p className="text-muted-foreground">
                  By using AgentOps, you agree to:
                </p>
                <ul className="ml-4 space-y-1 text-muted-foreground list-disc">
                  <li>Use the service only to govern your own agents</li>
                  <li>Not attempt to access other users' workspaces or data</li>
                  <li>Keep your API keys and login credentials secure</li>
                  <li>Report any security issues immediately to our support team</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </div>

              {/* Section 3: Governance Rules */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">3. Governance & Approval Rules</h3>
                <p className="text-muted-foreground">
                  AgentOps enforces governance rules to ensure agent safety:
                </p>
                <ul className="ml-4 space-y-1 text-muted-foreground list-disc">
                  <li>Safe actions (read, low-cost) are auto-approved</li>
                  <li>Risky actions (payments, deletions, high-cost) require human approval</li>
                  <li>Budget limits are enforced; exceeding them triggers denial</li>
                  <li>Scope violations are automatically denied</li>
                  <li>All decisions are recorded in the immutable audit log</li>
                </ul>
              </div>

              {/* Section 4: Data Privacy */}
              <div className="space-y-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-base">4. Data Privacy & Isolation</h3>
                <p className="text-muted-foreground">
                  Your data is protected:
                </p>
                <ul className="ml-4 space-y-1 text-muted-foreground list-disc">
                  <li>Each user has a completely isolated workspace</li>
                  <li>No agent or user can access another user's data</li>
                  <li>Activity logs are scoped by agent ownership</li>
                  <li>Passwords are securely hashed and never stored in plain text</li>
                  <li>API keys are encrypted using SHA-256</li>
                </ul>
              </div>

              {/* Section 5: Monitoring & Logging */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">5. Monitoring & Audit Logs</h3>
                <p className="text-muted-foreground">
                  AgentOps maintains comprehensive audit trails:
                </p>
                <ul className="ml-4 space-y-1 text-muted-foreground list-disc">
                  <li>Every agent action is logged with timestamp and details</li>
                  <li>Approval decisions are recorded with reasoning</li>
                  <li>All costs are tracked at the individual action level</li>
                  <li>Logs are immutable and retained for compliance</li>
                  <li>You have full access to your own audit trail</li>
                </ul>
              </div>

              {/* Section 6: Acceptable Use */}
              <div className="space-y-3 bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-base">6. Acceptable Use Policy</h3>
                <p className="text-muted-foreground">
                  You agree NOT to:
                </p>
                <ul className="ml-4 space-y-1 text-muted-foreground list-disc">
                  <li>Attempt to access other users' accounts or data</li>
                  <li>Share your API keys or login credentials</li>
                  <li>Use the service for illegal or harmful purposes</li>
                  <li>Circumvent governance rules or approval workflows</li>
                  <li>Intentionally overload or disrupt the service</li>
                  <li>Reverse-engineer or attempt to compromise security</li>
                </ul>
              </div>

              {/* Section 7: Limitations */}
              <div className="space-y-3">
                <h3 className="font-semibold text-base">7. Limitations & Disclaimers</h3>
                <p className="text-muted-foreground">
                  AgentOps provides governance and monitoring tools, but:
                </p>
                <ul className="ml-4 space-y-1 text-muted-foreground list-disc">
                  <li>You remain responsible for your agents' behavior</li>
                  <li>Approval workflows complement but don't replace human oversight</li>
                  <li>Budget limits are a safety measure; unexpected costs can occur</li>
                  <li>The service is provided "as-is" without warranty</li>
                  <li>We are not liable for agent actions or their consequences</li>
                </ul>
              </div>

              {/* Section 8: Support & Contact */}
              <div className="space-y-3 bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-base">8. Support & Contact</h3>
                <p className="text-muted-foreground">
                  For questions, issues, or concerns:
                </p>
                <ul className="ml-4 space-y-1 text-muted-foreground list-disc">
                  <li>Contact our support team via the in-app help system</li>
                  <li>Report security issues to security@agentops.ai</li>
                  <li>Check the How-To Guide for common questions</li>
                  <li>Review the Help tooltips (i icons) throughout the app</li>
                </ul>
              </div>

              {/* Last Updated */}
              <p className="text-xs text-muted-foreground pt-4 border-t">
                Last updated: January 2025 | Version 1.0
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
