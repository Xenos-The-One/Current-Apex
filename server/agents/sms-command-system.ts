/**
 * SMS Command System for AI Agents
 * 
 * Hub-and-spoke architecture:
 * - All agents communicate with Operations Agent (hub)
 * - Operations Agent is the single SMS interface to Tariq
 * - Tariq texts Operations Agent, which routes to specific agents
 */

import { sendSMS } from '../twilio';
import { invokeLLM } from '../_core/llm';

/** Helper to extract text from LLM response content */
function extractText(content: string | any[] | null | undefined): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
  }
  return String(content);
}

export interface AgentMessage {
  fromAgent: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  requiresResponse: boolean;
  context?: Record<string, any>;
}

export interface UserCommand {
  command: string;
  targetAgent?: string;
  parameters?: Record<string, any>;
}

export class SMSCommandSystem {
  private messageQueue: AgentMessage[] = [];
  private ownerPhoneNumber: string;
  private pendingResponses: Map<string, AgentMessage> = new Map();
  
  constructor() {
    // Tariq's phone number from env
    this.ownerPhoneNumber = process.env.TIMISHA_PHONE_NUMBER || '';
  }
  
  /**
   * Agent sends message to Operations Agent (internal)
   */
  async agentToOperations(message: AgentMessage): Promise<void> {
    console.log(`[SMS System] Message from ${message.fromAgent}: ${message.message}`);
    
    // Add to queue
    this.messageQueue.push(message);
    
    // If critical or requires response, send SMS immediately
    if (message.priority === 'critical' || message.requiresResponse) {
      await this.sendToOwner(message);
    }
  }
  
  /**
   * Operations Agent sends SMS to owner
   */
  private async sendToOwner(message: AgentMessage): Promise<void> {
    const priorityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🔔',
      critical: '🚨'
    };
    
    const smsText = `${priorityEmoji[message.priority]} ${message.fromAgent}\n\n${message.message}${message.requiresResponse ? '\n\nReply to respond.' : ''}`;
    
    try {
      await sendSMS({ to: this.ownerPhoneNumber, body: smsText });
      
      // Store if requires response
      if (message.requiresResponse) {
        this.pendingResponses.set(message.fromAgent, message);
      }
    } catch (error) {
      console.error('[SMS System] Failed to send SMS to owner:', error);
    }
  }
  
  /**
   * Parse incoming SMS from owner and route to appropriate agent
   */
  async parseOwnerCommand(smsBody: string): Promise<UserCommand> {
    // Use LLM to parse natural language command
    const prompt = `Parse this SMS command from a business owner to their AI agent system.

SMS: "${smsBody}"

Extract:
1. The command/action requested
2. Which agent should handle it (if specified): operations, analytics, lead-qualification, sales-followup, appointment-coordination, client-nurture, webinar-management, content-creation, lead-generation, relationship-management
3. Any parameters or context

Respond in JSON format:
{
  "command": "brief description of what to do",
  "targetAgent": "agent name or null if for operations agent",
  "parameters": {
    "key": "value"
  }
}

Examples:
- "send me today's metrics" → {"command": "get_daily_metrics", "targetAgent": "analytics", "parameters": {}}
- "pause lead gen" → {"command": "pause", "targetAgent": "lead-generation", "parameters": {}}
- "YES" (in response to a question) → {"command": "approve", "targetAgent": null, "parameters": {"response": "yes"}}
- "increase budget by $50" → {"command": "increase_budget", "targetAgent": "lead-generation", "parameters": {"amount": 50}}`;
    
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are a command parser for an AI agent system. Always respond with valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'command_parse',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              command: { type: 'string' },
              targetAgent: { type: ['string', 'null'] },
              parameters: { type: 'object', additionalProperties: true }
            },
            required: ['command', 'targetAgent', 'parameters'],
            additionalProperties: false
          }
        }
      }
    });
    
    const parsed = JSON.parse(extractText(response.choices[0].message.content) || '{}');
    return parsed as UserCommand;
  }
  
  /**
   * Route owner's command to appropriate agent
   */
  async routeCommand(command: UserCommand): Promise<string> {
    console.log(`[SMS System] Routing command to ${command.targetAgent || 'operations'}: ${command.command}`);
    
    // Handle common commands
    switch (command.command) {
      case 'get_daily_metrics':
        return await this.handleGetMetrics();
      
      case 'get_system_status':
        return await this.handleGetStatus();
      
      case 'approve':
      case 'yes':
        return await this.handleApproval(command);
      
      case 'reject':
      case 'no':
        return await this.handleRejection(command);
      
      default:
        // Forward to specific agent (will be handled by individual agents)
        return `Command "${command.command}" forwarded to ${command.targetAgent || 'operations'} agent.`;
    }
  }
  
  /**
   * Handle "get metrics" command
   */
  private async handleGetMetrics(): Promise<string> {
    return 'Fetching today\'s metrics...';
  }
  
  /**
   * Handle "get status" command
   */
  private async handleGetStatus(): Promise<string> {
    return 'Checking system status...';
  }
  
  /**
   * Handle approval response
   */
  private async handleApproval(_command: UserCommand): Promise<string> {
    const pendingAgent = Array.from(this.pendingResponses.keys())[0];
    if (!pendingAgent) {
      return 'No pending requests to approve.';
    }
    
    this.pendingResponses.delete(pendingAgent);
    return `✅ Approved. ${pendingAgent} will proceed.`;
  }
  
  /**
   * Handle rejection response
   */
  private async handleRejection(_command: UserCommand): Promise<string> {
    const pendingAgent = Array.from(this.pendingResponses.keys())[0];
    if (!pendingAgent) {
      return 'No pending requests to reject.';
    }
    
    this.pendingResponses.delete(pendingAgent);
    return `❌ Rejected. ${pendingAgent} will not proceed.`;
  }
  
  /**
   * Send response back to owner
   */
  async sendResponse(message: string): Promise<void> {
    try {
      await sendSMS({ to: this.ownerPhoneNumber, body: message });
    } catch (error) {
      console.error('[SMS System] Failed to send response to owner:', error);
    }
  }
  
  /**
   * Get pending messages that haven't been sent yet
   */
  getPendingMessages(): AgentMessage[] {
    return this.messageQueue.filter(m => m.priority !== 'critical' && !m.requiresResponse);
  }
  
  /**
   * Batch and send pending messages (called periodically)
   */
  async sendBatchedMessages(): Promise<void> {
    const pending = this.getPendingMessages();
    if (pending.length === 0) return;
    
    // Group by agent
    const grouped = pending.reduce((acc, msg) => {
      if (!acc[msg.fromAgent]) acc[msg.fromAgent] = [];
      acc[msg.fromAgent].push(msg.message);
      return acc;
    }, {} as Record<string, string[]>);
    
    // Format as single SMS
    const batchText = Object.entries(grouped)
      .map(([agent, messages]) => `${agent}:\n${messages.join('\n')}`)
      .join('\n\n');
    
    await sendSMS({ to: this.ownerPhoneNumber, body: `📊 Agent Updates\n\n${batchText}` });
    
    // Clear sent messages
    this.messageQueue = this.messageQueue.filter(m => m.priority === 'critical' || m.requiresResponse);
  }
}

// Singleton instance
export const smsCommandSystem = new SMSCommandSystem();
