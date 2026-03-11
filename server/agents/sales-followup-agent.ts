/**
 * Sales Follow-Up Agent
 * 
 * Manages persistent follow-up with leads until they book an appointment or opt out.
 * Coordinates Vapi calls, SMS, and email sequences.
 */

import { getDb } from '../db';
import { leads, leadActivities } from '../../drizzle/schema';
import { eq, and, lt, sql, or, isNull } from 'drizzle-orm';
import { smsCommandSystem } from './sms-command-system';
import { sendSMS } from '../twilio';
import { sendEmail } from '../email-service';
import { isTestLead, logTestLeadSuppression } from '../test-lead-utils';

export interface FollowUpSequence {
  leadId: number;
  step: number;
  channel: 'vapi' | 'sms' | 'email';
  scheduledFor: Date;
  message?: string;
}

export class SalesFollowUpAgent {
  /**
   * Determine next follow-up action for a lead
   */
  async getNextFollowUp(leadId: number): Promise<FollowUpSequence | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get lead data
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId));
    
    if (!lead) {
      return null;
    }
    
    // Check if lead has booked appointment or is closed
    if (lead.status === 'appointment_set' || lead.status === 'closed_won' || lead.status === 'appointment_completed') {
      return null; // No more follow-up needed
    }
    
    // Check if lead is lost
    if (lead.status === 'closed_lost') {
      return null;
    }
    
    // Get all activities for this lead
    const activities = await db
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, leadId))
      .orderBy(leadActivities.createdAt);
    
    // Count follow-up attempts by channel
    const vapiCalls = activities.filter(a => a.activityType === 'call').length;
    const smsAttempts = activities.filter(a => a.activityType === 'sms').length;
    const emailsSent = activities.filter(a => a.activityType === 'email').length;
    
    // Follow-up sequence logic
    // Day 1: Vapi call immediately, SMS 2 hours later, Email 4 hours later
    // Day 2: Vapi call, SMS 3 hours later
    // Day 3: Email
    // Day 7: Final Vapi call
    // Day 14: Final email
    
    const createdAt = new Date(lead.createdAt);
    const now = new Date();
    const hoursSinceCreated = (now.getTime() - createdAt.getTime()) / 1000 / 60 / 60;
    
    // Day 1
    if (hoursSinceCreated < 2 && vapiCalls === 0) {
      return {
        leadId,
        step: 1,
        channel: 'vapi',
        scheduledFor: new Date(createdAt.getTime() + 5 * 60 * 1000) // 5 min after creation
      };
    }
    
    if (hoursSinceCreated >= 2 && hoursSinceCreated < 4 && smsAttempts === 0) {
      return {
        leadId,
        step: 2,
        channel: 'sms',
        scheduledFor: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        message: `Hi ${lead.firstName}, this is Tim from Home Loan Coach. I tried calling earlier about your mortgage inquiry. When's a good time to chat? Book here: ${process.env.VITE_APP_URL || 'https://agencycrm-lmov9od5.manus.space'}/book/tim`
      };
    }
    
    if (hoursSinceCreated >= 4 && hoursSinceCreated < 24 && emailsSent === 0) {
      return {
        leadId,
        step: 3,
        channel: 'email',
        scheduledFor: new Date(createdAt.getTime() + 4 * 60 * 60 * 1000), // 4 hours
        message: 'Day 1 follow-up email'
      };
    }
    
    // Day 2
    if (hoursSinceCreated >= 24 && hoursSinceCreated < 27 && vapiCalls === 1) {
      return {
        leadId,
        step: 4,
        channel: 'vapi',
        scheduledFor: new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) // 24 hours
      };
    }
    
    if (hoursSinceCreated >= 27 && hoursSinceCreated < 48 && smsAttempts === 1) {
      return {
        leadId,
        step: 5,
        channel: 'sms',
        scheduledFor: new Date(createdAt.getTime() + 27 * 60 * 60 * 1000), // 27 hours
        message: `${lead.firstName}, I know you're busy. Quick question - are you still looking to buy/refinance? Reply YES and I'll send you my calendar link.`
      };
    }
    
    // Day 3
    if (hoursSinceCreated >= 48 && hoursSinceCreated < 72 && emailsSent === 1) {
      return {
        leadId,
        step: 6,
        channel: 'email',
        scheduledFor: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000), // 48 hours
        message: 'Day 3 follow-up email with value content'
      };
    }
    
    // Day 7
    if (hoursSinceCreated >= 168 && hoursSinceCreated < 192 && vapiCalls === 2) {
      return {
        leadId,
        step: 7,
        channel: 'vapi',
        scheduledFor: new Date(createdAt.getTime() + 168 * 60 * 60 * 1000) // 7 days
      };
    }
    
    // Day 14 - Final attempt
    if (hoursSinceCreated >= 336 && hoursSinceCreated < 360 && emailsSent === 2) {
      return {
        leadId,
        step: 8,
        channel: 'email',
        scheduledFor: new Date(createdAt.getTime() + 336 * 60 * 60 * 1000), // 14 days
        message: 'Final follow-up email - breakup email'
      };
    }
    
    // No more follow-ups
    if (hoursSinceCreated >= 360) {
      // Mark as closed_lost after 14 days with no response
      await db
        .update(leads)
        .set({ status: 'closed_lost' })
        .where(eq(leads.id, leadId));
      
      return null;
    }
    
    return null; // No action needed right now
  }
  
  /**
   * Execute a follow-up action
   */
  async executeFollowUp(followUp: FollowUpSequence): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const [lead] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, followUp.leadId));
    
    if (!lead) {
      console.error(`[Sales Follow-Up] Lead ${followUp.leadId} not found`);
      return;
    }
    
    try {
      switch (followUp.channel) {
        case 'vapi':
          await this.scheduleVapiCall(lead);
          break;
        
        case 'sms':
          await this.sendFollowUpSMS(lead, followUp.message!);
          break;
        
        case 'email':
          await this.sendFollowUpEmail(lead, followUp.step);
          break;
      }
      
      // Log activity using raw SQL helper to avoid schema drift
      const activityType = followUp.channel === 'vapi' ? 'call' as const : followUp.channel === 'sms' ? 'sms' as const : 'email' as const;
      const { createLeadActivity } = await import('../db');
      await createLeadActivity({
        leadId: followUp.leadId,
        activityType,
        description: `Follow-up step ${followUp.step} via ${followUp.channel}`,
      });
      
    } catch (error) {
      console.error(`[Sales Follow-Up] Error executing follow-up for lead ${followUp.leadId}:`, error);
      await smsCommandSystem.agentToOperations({
        fromAgent: 'Sales Follow-Up Agent',
        priority: 'medium',
        message: `⚠️ Follow-up failed for lead #${followUp.leadId} (step ${followUp.step}, ${followUp.channel})`,
        requiresResponse: false
      });
    }
  }
  
  /**
   * Schedule Vapi call
   */
  private async scheduleVapiCall(lead: any): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    if (!lead.phone) {
      console.log(`[Sales Follow-Up] Cannot schedule Vapi call for lead ${lead.id}: missing phone`);
      return;
    }
    
    // Update lead with scheduled call time
    await db
      .update(leads)
      .set({ vapiCallScheduledAt: new Date() })
      .where(eq(leads.id, lead.id));
    
    console.log(`[Sales Follow-Up] Vapi call scheduled for lead ${lead.id}`);
  }
  
  /**
   * Send follow-up SMS
   */
  private async sendFollowUpSMS(lead: any, message: string): Promise<void> {
    if (!lead.phone) {
      console.log(`[Sales Follow-Up] Cannot send SMS to lead ${lead.id}: missing phone`);
      return;
    }
    
    await sendSMS({ to: lead.phone, body: message });
    console.log(`[Sales Follow-Up] SMS sent to lead ${lead.id}`);
  }
  
  /**
   * Send follow-up email
   */
  private async sendFollowUpEmail(lead: any, step: number): Promise<void> {
    if (!lead.email) {
      console.log(`[Sales Follow-Up] Cannot send email to lead ${lead.id}: missing email`);
      return;
    }
    
    let subject: string;
    let htmlBody: string;
    const bookingUrl = `${process.env.VITE_APP_URL || ''}/book/tim`;
    
    switch (step) {
      case 3: // Day 1
        subject = `${lead.firstName}, let's get you pre-approved`;
        htmlBody = `Hi ${lead.firstName},<br><br>I tried reaching you earlier about your mortgage inquiry. I'd love to help you get pre-approved and find the best loan options.<br><br>Book a 15-minute call with me: ${bookingUrl}<br><br>Best,<br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`;
        break;
      
      case 6: // Day 3
        subject = `${lead.firstName}, here's what you need to know about rates`;
        htmlBody = `Hi ${lead.firstName},<br><br>Rates are still competitive, but they won't stay this way forever. Here's what I recommend:<br><br>1. Get pre-approved now (locks in your rate for 90 days)<br>2. Review your options with me (no obligation)<br>3. Start shopping with confidence<br><br>Book your free consultation: ${bookingUrl}<br><br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`;
        break;
      
      case 8: // Day 14 - Breakup email
        subject = `${lead.firstName}, should I close your file?`;
        htmlBody = `Hi ${lead.firstName},<br><br>I haven't heard back from you, so I'm assuming you've either:<br>- Already found a lender<br>- Decided to wait<br>- No longer interested<br><br>If I'm wrong, reply to this email or book a call: ${bookingUrl}<br><br>Otherwise, I'll close your file and stop reaching out.<br><br>No hard feelings either way!<br><br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`;
        break;
      
      default:
        subject = `Follow-up from Home Loan Coach`;
        htmlBody = `Hi ${lead.firstName},<br><br>Just following up on your mortgage inquiry. Let me know if you have any questions!<br><br>Tim`;
    }
    
    await sendEmail({
      to: lead.email,
      subject,
      html: htmlBody
    });
    
    console.log(`[Sales Follow-Up] Email sent to lead ${lead.id} (step ${step})`);
  }
  
  /**
   * Process all leads needing follow-up (called by cron)
   */
  async processFollowUps(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get all active leads (not converted, not opted out)
    const activeLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          or(
            eq(leads.status, 'new'),
            eq(leads.status, 'contacted'),
            eq(leads.status, 'qualified')
          )
        )
      );
    
    console.log(`[Sales Follow-Up] Processing ${activeLeads.length} active leads`);
    
    let followUpsScheduled = 0;
    
    for (const lead of activeLeads) {
      // Skip test leads entirely — no calls, SMS, or emails
      if (isTestLead(lead)) {
        logTestLeadSuppression("all", lead, "sales-followup-agent");
        continue;
      }
      try {
        const nextFollowUp = await this.getNextFollowUp(lead.id);
        
        if (nextFollowUp && nextFollowUp.scheduledFor <= new Date()) {
          await this.executeFollowUp(nextFollowUp);
          followUpsScheduled++;
        }
      } catch (error) {
        console.error(`[Sales Follow-Up] Error processing lead ${lead.id}:`, error);
      }
    }
    
    if (followUpsScheduled > 0) {
      await smsCommandSystem.agentToOperations({
        fromAgent: 'Sales Follow-Up Agent',
        priority: 'low',
        message: `📞 ${followUpsScheduled} follow-ups executed`,
        requiresResponse: false
      });
    }
  }
  
  /**
   * Get follow-up stats for reporting
   */
  async getStats(startDate: Date, endDate: Date): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT lead_id) as leads_followed_up,
        SUM(CASE WHEN activity_type = 'call' THEN 1 ELSE 0 END) as vapi_calls,
        SUM(CASE WHEN activity_type = 'sms' THEN 1 ELSE 0 END) as sms_sent,
        SUM(CASE WHEN activity_type = 'email' THEN 1 ELSE 0 END) as emails_sent
      FROM lead_activities
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
        AND activity_type IN ('call', 'sms', 'email')
    `);
    
    return stats[0];
  }
}

// Singleton instance
export const salesFollowUpAgent = new SalesFollowUpAgent();
