/**
 * Client Nurture Agent
 * 
 * Manages long-term relationship building:
 * - Drip email campaigns for cold leads
 * - Re-engagement campaigns
 * - Birthday/anniversary touches (integrates with existing system)
 * - Educational content delivery
 * - Market updates
 */

import { getDb } from '../db';
import { leads, leadActivities } from '../../drizzle/schema';
import { eq, and, lt, gte, sql, or } from 'drizzle-orm';
import { smsCommandSystem } from './sms-command-system';
import { sendEmail } from '../email-service';
import { invokeLLM } from '../_core/llm';
import { isTestLead, logTestLeadSuppression } from '../test-lead-utils';

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

export interface NurtureCampaign {
  name: string;
  sequence: NurtureEmail[];
  targetStatus: string[];
}

export interface NurtureEmail {
  dayOffset: number; // Days after lead creation or campaign start
  subject: string;
  bodyTemplate: string; // Can include {{name}}, {{loan_type}}, etc.
}

export class ClientNurtureAgent {
  /**
   * Predefined nurture campaigns
   */
  private campaigns: Record<string, NurtureCampaign> = {
    cold_lead_nurture: {
      name: 'Cold Lead Nurture',
      targetStatus: ['new'],
      sequence: [
        {
          dayOffset: 0,
          subject: "{{name}}, here's what you need to know about mortgage rates",
          bodyTemplate: `Hi {{name}},<br><br>I noticed you inquired about a mortgage recently but we haven't connected yet. No worries - I'm here when you're ready!<br><br>In the meantime, here's what's happening with rates:<br><br>• Current rates are still competitive<br>• Pre-approval takes just 15 minutes<br>• You can lock your rate for 90 days<br><br>When you're ready to explore your options, book a free consultation:<br>{{booking_link}}<br><br>Best,<br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
        },
        {
          dayOffset: 7,
          subject: 'Quick question about your home goals',
          bodyTemplate: `Hi {{name}},<br><br>I wanted to check in - are you still thinking about {{loan_type}}?<br><br>I've helped hundreds of people in your situation, and I'd love to help you too. Here's what we can do:<br><br>✅ Get you pre-approved in 24 hours<br>✅ Find the best rates for your situation<br>✅ Answer all your questions (no pressure)<br><br>Book a 15-minute call: {{booking_link}}<br><br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
        },
        {
          dayOffset: 14,
          subject: 'Last chance: Free mortgage consultation',
          bodyTemplate: `Hi {{name}},<br><br>I'm reaching out one last time about your mortgage inquiry.<br><br>If you're not interested, no problem - I'll stop emailing you.<br><br>But if you ARE still thinking about buying/refinancing, I'd hate for you to miss out on current rates.<br><br>Book a call (or reply STOP to opt out):<br>{{booking_link}}<br><br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
        }
      ]
    },
    
    re_engagement: {
      name: 'Re-engagement Campaign',
      targetStatus: ['closed_lost'],
      sequence: [
        {
          dayOffset: 0,
          subject: "Still thinking about buying a home?",
          bodyTemplate: `Hi {{name}},<br><br>It's been a while since we last connected. I wanted to reach out because rates have changed recently, and it might be a good time to revisit your options.<br><br>Here's what's new:<br><br>• New loan programs available<br>• Down payment assistance up to $15,000<br>• Faster approval process<br><br>Interested in exploring? Book a call:<br>{{booking_link}}<br><br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
        },
        {
          dayOffset: 7,
          subject: 'Market update: What you need to know',
          bodyTemplate: `Hi {{name}},<br><br>Quick market update for you:<br><br>📊 Rates: Competitive<br>🏠 Inventory: Improving<br>💰 Programs: New down payment assistance available<br><br>Want to discuss how this affects you? Let's chat:<br>{{booking_link}}<br><br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
        }
      ]
    }
  };
  
  /**
   * Process nurture campaigns for all leads
   */
  async processNurtureCampaigns(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    console.log('[Client Nurture] Processing nurture campaigns...');
    
    // Process each campaign type
    for (const [campaignKey, campaign] of Object.entries(this.campaigns)) {
      await this.processCampaign(campaignKey, campaign);
    }
  }
  
  /**
   * Process a specific campaign
   */
  private async processCampaign(campaignKey: string, campaign: NurtureCampaign): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get leads matching this campaign's target status
    const targetLeads = await db
      .select()
      .from(leads)
      .where(
        sql`status IN (${sql.raw(campaign.targetStatus.map(s => `'${s}'`).join(','))})`
      );
    
    console.log(`[Client Nurture] Processing ${campaign.name} for ${targetLeads.length} leads`);
    
    for (const lead of targetLeads) {
      // Skip test leads
      if (isTestLead(lead)) {
        logTestLeadSuppression("email", lead, "client-nurture-campaign");
        continue;
      }
      try {
        // Determine which email in the sequence to send
        const createdAt = new Date(lead.createdAt);
        const now = new Date();
        const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        // Find the next email to send
        for (const email of campaign.sequence) {
          if (daysSinceCreated >= email.dayOffset) {
            // Check if we already sent this email
            const alreadySent = await this.checkIfEmailSent(lead.id, campaignKey, email.dayOffset);
            
            if (!alreadySent) {
              await this.sendNurtureEmail(lead, email, campaignKey);
            }
          }
        }
      } catch (error) {
        console.error(`[Client Nurture] Error processing lead ${lead.id}:`, error);
      }
    }
  }
  
  /**
   * Check if a specific nurture email was already sent
   */
  private async checkIfEmailSent(leadId: number, campaignKey: string, dayOffset: number): Promise<boolean> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const activities = await db
      .select()
      .from(leadActivities)
      .where(
        and(
          eq(leadActivities.leadId, leadId),
          sql`content LIKE ${'%' + campaignKey + '%day' + dayOffset + '%'}`
        )
      );
    
    return activities.length > 0;
  }
  
  /**
   * Send a nurture email
   */
  private async sendNurtureEmail(lead: any, email: NurtureEmail, campaignKey: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    if (!lead.email) {
      console.log(`[Client Nurture] Cannot send email to lead ${lead.id}: missing email`);
      return;
    }
    
    // Replace template variables
    const customFields = lead.customFields ? JSON.parse(lead.customFields) : {};
    const loanType = customFields.loan_type || 'buying or refinancing';
    const bookingLink = `${process.env.VITE_APP_URL || 'https://agencycrm-lmov9od5.manus.space'}/book/tim`;
    
    const subject = email.subject
      .replace('{{name}}', lead.firstName || 'there');
    
    const htmlBody = email.bodyTemplate
      .replace(/{{name}}/g, lead.firstName || 'there')
      .replace(/{{loan_type}}/g, loanType)
      .replace(/{{booking_link}}/g, bookingLink);
    
    // Send email
    await sendEmail({
      to: lead.email,
      subject,
      html: htmlBody
    });
    
    // Log activity using raw SQL helper to avoid schema drift
    const { createLeadActivity } = await import('../db');
    await createLeadActivity({
      leadId: lead.id,
      activityType: 'email',
      description: `Nurture email sent: ${campaignKey} day${email.dayOffset}`,
    });
    
    console.log(`[Client Nurture] Sent ${campaignKey} email (day ${email.dayOffset}) to lead ${lead.id}`);
  }
  
  /**
   * Re-engage cold leads with personalized AI-generated content
   */
  async reEngageColdLeads(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get leads that have been closed_lost for 30+ days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const coldLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.status, 'closed_lost'),
          lt(leads.updatedAt, thirtyDaysAgo)
        )
      )
      .limit(10); // Process 10 at a time
    
    console.log(`[Client Nurture] Re-engaging ${coldLeads.length} cold leads with AI-generated content`);
    
    for (const lead of coldLeads) {
      // Skip test leads
      if (isTestLead(lead)) {
        logTestLeadSuppression("email", lead, "client-nurture-reengagement");
        continue;
      }
      try {
        if (!lead.email) continue;
        
        // Generate personalized re-engagement email using LLM
        const customFields = lead.customFields ? JSON.parse(lead.customFields as string) : {};
        const prompt = `Write a personalized re-engagement email for a mortgage lead named ${lead.firstName}. They inquired about ${customFields.loan_type || 'a mortgage'} 30+ days ago but went cold. The email should:
        
1. Be friendly and non-pushy
2. Mention recent market changes (rates, programs)
3. Offer value (free consultation, market update)
4. Include a clear call-to-action
5. Be under 150 words
6. End with: Tim Haskins, Home Loan Coach, NMLS #1116876

Do not include a subject line, just the email body.`;
        
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are a mortgage loan officer writing personalized follow-up emails.' },
            { role: 'user', content: prompt }
          ]
        });
        
        const emailBody = extractText(response.choices[0].message.content) + `<br><br>Book a call: ${process.env.VITE_APP_URL || ''}/book/tim`;
        
        await sendEmail({
          to: lead.email,
          subject: `${lead.firstName}, quick update on mortgage rates`,
          html: emailBody
        });
        
        // Log activity using raw SQL helper to avoid schema drift
        const { createLeadActivity } = await import('../db');
        await createLeadActivity({
          leadId: lead.id,
          activityType: 'email',
          description: 'AI-generated re-engagement email sent',
        });
        
        // Update lead status to contacted
        await db
          .update(leads)
          .set({ 
            status: 'contacted'
          })
          .where(eq(leads.id, lead.id));
        
      } catch (error) {
        console.error(`[Client Nurture] Error re-engaging lead ${lead.id}:`, error);
      }
    }
  }
  
  /**
   * Get nurture stats for reporting
   */
  async getStats(startDate: Date, endDate: Date): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT lead_id) as leads_nurtured,
        COUNT(*) as total_emails_sent,
        SUM(CASE WHEN content LIKE '%cold_lead_nurture%' THEN 1 ELSE 0 END) as cold_nurture_emails,
        SUM(CASE WHEN content LIKE '%re_engagement%' THEN 1 ELSE 0 END) as reengagement_emails,
        SUM(CASE WHEN content LIKE '%AI-generated%' THEN 1 ELSE 0 END) as ai_generated_emails
      FROM lead_activities
      WHERE createdAt BETWEEN ${startDate} AND ${endDate}
        AND activity_type = 'email'
        AND (content LIKE '%Nurture%' OR content LIKE '%re-engagement%' OR content LIKE '%AI-generated%')
    `);
    
    return stats[0];
  }
}

// Singleton instance
export const clientNurtureAgent = new ClientNurtureAgent();
