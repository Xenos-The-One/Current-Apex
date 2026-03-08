/**
 * Operations Agent (Orchestrator)
 * 
 * Responsibilities:
 * - Monitor all systems and agents 24/7
 * - Coordinate between agents
 * - Handle errors and exceptions
 * - Escalate critical issues
 * - Generate daily stand-up reports
 * - Track agent performance and health
 */

import { getDb } from '../db';
import { leads, appointments as appointmentsTable, webinarRegistrations, leadActivities, users } from '../../drizzle/schema';
import { sql, desc, eq, and, gte } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';
import { invokeLLM } from '../_core/llm';

export interface SystemHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: Date;
  message?: string;
}

export interface AgentStatus {
  name: string;
  status: 'running' | 'idle' | 'error';
  lastRun: Date;
  tasksCompleted: number;
  errors: number;
}

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

export class OperationsAgent {
  private systemHealth: Map<string, SystemHealth> = new Map();
  private agentStatus: Map<string, AgentStatus> = new Map();
  
  /**
   * Monitor all systems and check health
   */
  async monitorSystems(): Promise<SystemHealth[]> {
    const checks: SystemHealth[] = [];
    
    // Check database connectivity
    try {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db.execute(sql`SELECT 1`);
      checks.push({
        service: 'database',
        status: 'healthy',
        lastCheck: new Date()
      });
    } catch (error) {
      checks.push({
        service: 'database',
        status: 'down',
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      await this.escalate('CRITICAL: Database is down', error);
    }
    
    // Check cron jobs (verify they ran recently)
    try {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const recentActivity = await db
        .select()
        .from(leadActivities)
        .where(gte(leadActivities.createdAt, sql`DATE_SUB(NOW(), INTERVAL 10 MINUTE)`))
        .limit(1);
      
      checks.push({
        service: 'cron_jobs',
        status: recentActivity.length > 0 ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        message: recentActivity.length > 0 ? 'Active' : 'No recent activity'
      });
    } catch (error) {
      checks.push({
        service: 'cron_jobs',
        status: 'degraded',
        lastCheck: new Date(),
        message: 'Unable to verify'
      });
    }
    
    // Check email service (verify SendGrid key exists)
    checks.push({
      service: 'email',
      status: process.env.SENDGRID_API_KEY ? 'healthy' : 'down',
      lastCheck: new Date(),
      message: process.env.SENDGRID_API_KEY ? 'Configured' : 'Missing API key'
    });
    
    // Check SMS service (verify Twilio configured)
    const twilioConfigured = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
    checks.push({
      service: 'sms',
      status: twilioConfigured ? 'healthy' : 'degraded',
      lastCheck: new Date(),
      message: twilioConfigured ? 'Configured (A2P pending)' : 'Not configured'
    });
    
    // Check Vapi service
    checks.push({
      service: 'vapi',
      status: process.env.VAPI_API_KEY ? 'healthy' : 'down',
      lastCheck: new Date(),
      message: process.env.VAPI_API_KEY ? 'Configured' : 'Missing API key'
    });
    
    // Update system health map
    checks.forEach(check => {
      this.systemHealth.set(check.service, check);
    });
    
    return checks;
  }
  
  /**
   * Generate daily stand-up report
   */
  async generateDailyStandUp(): Promise<string> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get yesterday's metrics using raw SQL for date comparison
    const metrics = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM leads WHERE createdAt >= ${yesterday} AND createdAt < ${today}) as new_leads,
        (SELECT COUNT(*) FROM appointments WHERE created_at >= ${yesterday} AND created_at < ${today}) as new_appointments,
        (SELECT COUNT(*) FROM webinar_registrations WHERE created_at >= ${yesterday} AND created_at < ${today}) as webinar_signups,
        (SELECT COUNT(*) FROM lead_activities WHERE activity_type = 'call' AND createdAt >= ${yesterday} AND createdAt < ${today}) as calls_made
    `);
    
    const row = (metrics as any)[0] || { new_leads: 0, new_appointments: 0, webinar_signups: 0, calls_made: 0 };
    
    // Check system health
    const systemChecks = await this.monitorSystems();
    const criticalIssues = systemChecks.filter(c => c.status === 'down');
    const warnings = systemChecks.filter(c => c.status === 'degraded');
    
    // Generate report using LLM
    const reportPrompt = `Generate a concise daily stand-up report for a mortgage/real estate lead generation company.

Yesterday's Metrics:
- New Leads: ${row.new_leads}
- Appointments Booked: ${row.new_appointments}
- Webinar Signups: ${row.webinar_signups}
- AI Calls Made: ${row.calls_made}

System Status:
- Critical Issues: ${criticalIssues.length}
${criticalIssues.map(i => `  * ${i.service}: ${i.message}`).join('\n')}
- Warnings: ${warnings.length}
${warnings.map(w => `  * ${w.service}: ${w.message}`).join('\n')}

Format the report as:
1. Quick summary (1-2 sentences)
2. Key metrics
3. System status
4. Action items (if any)
5. Today's priorities

Keep it brief and actionable.`;
    
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are an operations manager generating daily stand-up reports.' },
        { role: 'user', content: reportPrompt }
      ]
    });
    
    return extractText(response.choices[0].message.content) || 'Unable to generate report';
  }
  
  /**
   * Send daily stand-up report to owner and team
   */
  async sendDailyStandUp(): Promise<void> {
    try {
      const report = await this.generateDailyStandUp();
      
      // Send to owner
      await notifyOwner({
        title: '📊 Daily Stand-Up Report',
        content: report
      });
      
      console.log('[Operations Agent] Daily stand-up report sent');
    } catch (error) {
      console.error('[Operations Agent] Failed to send daily stand-up:', error);
      await this.escalate('Failed to send daily stand-up report', error);
    }
  }
  
  /**
   * Escalate critical issues to owner
   */
  async escalate(title: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    await notifyOwner({
      title: `🚨 ${title}`,
      content: `Critical issue detected:\n\n${message}\n\nImmediate attention required.`
    });
  }
  
  /**
   * Register agent status
   */
  registerAgent(name: string, status: AgentStatus): void {
    this.agentStatus.set(name, status);
  }
  
  /**
   * Get all agent statuses
   */
  getAgentStatuses(): AgentStatus[] {
    return Array.from(this.agentStatus.values());
  }
  
  /**
   * Check if any agents are in error state
   */
  async checkAgentHealth(): Promise<void> {
    const errorAgents = Array.from(this.agentStatus.values())
      .filter(agent => agent.status === 'error');
    
    if (errorAgents.length > 0) {
      await notifyOwner({
        title: '⚠️ Agent Errors Detected',
        content: `The following agents are in error state:\n\n${errorAgents.map(a => `- ${a.name}: ${a.errors} errors`).join('\n')}`
      });
    }
  }
}

// Singleton instance
export const operationsAgent = new OperationsAgent();
