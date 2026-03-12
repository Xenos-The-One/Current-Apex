/**
 * Sales Follow-Up Agent
 *
 * Manages persistent follow-up with leads until they book an appointment or opt out.
 * Coordinates Vapi calls, SMS, and email sequences.
 *
 * ── Per-client branding ────────────────────────────────────────────────────
 * Every SMS and email is personalised to the client (Tim or Kyle) whose lead
 * it is. The agent looks up the client row to get name, company, NMLS, and
 * booking slug before composing any message.
 */

import { getDb } from '../db';
import { leads, leadActivities, clients } from '../../drizzle/schema';
import { eq, and, or, sql } from 'drizzle-orm';
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

// ── Client branding helper ────────────────────────────────────────────────────
interface ClientBranding {
  agentName: string;      // e.g. "Tim Haskins"
  agentFirst: string;     // e.g. "Tim"
  company: string;        // e.g. "Home Loan Coach"
  nmls: string;           // e.g. "NMLS #1116876"
  bookingUrl: string;     // full booking URL
  fromEmail: string;      // reply-to address
  vapiEnabled: boolean;
}

const DEFAULT_APP_URL = process.env.VITE_APP_URL || 'https://crmplatform-rus3etbp.manus.space';

async function getClientBranding(clientId: number | null | undefined): Promise<ClientBranding> {
  // Fallback branding (Tim — the original default)
  const fallback: ClientBranding = {
    agentName: 'Tim Haskins',
    agentFirst: 'Tim',
    company: 'Home Loan Coach',
    nmls: 'NMLS #1116876',
    bookingUrl: `${DEFAULT_APP_URL}/book/tim`,
    fromEmail: 'tim@homeloancoach.com',
    vapiEnabled: true,
  };

  if (!clientId) return fallback;

  try {
    const db = await getDb();
    if (!db) return fallback;

    const [client] = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        bookingSlug: clients.bookingSlug,
        vapiCallsEnabled: clients.vapiCallsEnabled,
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) return fallback;

    const nameParts = client.name.trim().split(' ');
    const firstName = nameParts[0] || 'Your Agent';
    const bookingUrl = client.bookingSlug
      ? `${DEFAULT_APP_URL}/book/${client.bookingSlug}`
      : `${DEFAULT_APP_URL}/book`;

    // Detect Kyle Dombecki / Optimal Lending Solutions
    const isKyle = client.name.toLowerCase().includes('kyle') ||
                   client.name.toLowerCase().includes('optimal lending');

    if (isKyle) {
      return {
        agentName: 'Kyle Dombecki',
        agentFirst: 'Kyle',
        company: 'Optimal Lending Solutions',
        nmls: 'NMLS #2161960',
        bookingUrl,
        fromEmail: client.email || 'kyle@optimallendingsolutions.com',
        vapiEnabled: client.vapiCallsEnabled ?? true,
      };
    }

    // Detect Tim Haskins / Premier Mortgage / Home Loan Coach
    const isTim = client.name.toLowerCase().includes('tim') ||
                  client.name.toLowerCase().includes('premier mortgage') ||
                  client.name.toLowerCase().includes('home loan coach');

    if (isTim) {
      return {
        agentName: 'Tim Haskins',
        agentFirst: 'Tim',
        company: 'Home Loan Coach',
        nmls: 'NMLS #1116876',
        bookingUrl,
        fromEmail: client.email || 'tim@homeloancoach.com',
        vapiEnabled: client.vapiCallsEnabled ?? true,
      };
    }

    // Generic fallback for any other client
    return {
      agentName: client.name,
      agentFirst: firstName,
      company: client.name,
      nmls: '',
      bookingUrl,
      fromEmail: client.email || 'noreply@crmplatform.com',
      vapiEnabled: client.vapiCallsEnabled ?? true,
    };
  } catch {
    return fallback;
  }
}

// ── SMS message templates ─────────────────────────────────────────────────────
function buildSMSMessage(step: number, leadFirst: string, branding: ClientBranding): string {
  const { agentFirst, company, bookingUrl } = branding;
  switch (step) {
    case 2: // Day 1 – 2 hours after lead
      return `Hi ${leadFirst}! This is ${agentFirst} from ${company}. I just tried calling you about your mortgage inquiry. When's a good time to connect? Book a quick call here: ${bookingUrl} — ${agentFirst}`;
    case 5: // Day 2 – 27 hours
      return `Hey ${leadFirst}, ${agentFirst} here from ${company}. I know you're busy — quick question: are you still looking to buy or refinance? Reply YES and I'll send you my calendar link. 🏠`;
    case 9: // Day 5 – value SMS
      return `${leadFirst}, rates have been moving this week. Want me to run a quick numbers comparison for you? Takes 5 minutes and could save you thousands. Book here: ${bookingUrl} — ${agentFirst}, ${company}`;
    case 11: // Day 10 – last SMS
      return `Hey ${leadFirst}, last message from me — I don't want to keep bugging you! If you're still thinking about a home loan, I'm here: ${bookingUrl}. Otherwise no worries at all. — ${agentFirst}`;
    default:
      return `Hi ${leadFirst}, just following up on your mortgage inquiry. I'd love to help — book a call here: ${bookingUrl} — ${agentFirst}, ${company}`;
  }
}

// ── Email templates ───────────────────────────────────────────────────────────
function buildEmailContent(
  step: number,
  leadFirst: string,
  branding: ClientBranding
): { subject: string; html: string } {
  const { agentName, agentFirst, company, nmls, bookingUrl, fromEmail } = branding;
  const nmlsLine = nmls ? `<br>${nmls}` : '';

  switch (step) {
    case 3: // Day 1 – 4 hours
      return {
        subject: `${leadFirst}, let's get you pre-approved`,
        html: `
<p>Hi ${leadFirst},</p>
<p>I tried reaching you earlier about your mortgage inquiry. I'd love to help you get pre-approved and find the best loan options for your situation.</p>
<p><strong><a href="${bookingUrl}">👉 Book a free 15-minute call with me here</a></strong></p>
<p>There's no obligation — just a quick conversation to see how I can help.</p>
<p>Best,<br>${agentName}<br>${company}${nmlsLine}</p>`,
      };

    case 6: // Day 3 – 48 hours
      return {
        subject: `${leadFirst}, here's what you need to know about rates right now`,
        html: `
<p>Hi ${leadFirst},</p>
<p>Rates have been moving, and I want to make sure you don't miss your window. Here's what I recommend:</p>
<ol>
  <li><strong>Get pre-approved now</strong> — locks in your rate for 90 days</li>
  <li><strong>Review your options with me</strong> — no obligation, just clarity</li>
  <li><strong>Start shopping with confidence</strong> — sellers take pre-approved buyers seriously</li>
</ol>
<p><strong><a href="${bookingUrl}">Book your free consultation here →</a></strong></p>
<p>${agentName}<br>${company}${nmlsLine}</p>`,
      };

    case 10: // Day 7 – value email
      return {
        subject: `${leadFirst}, a quick tip that could save you thousands`,
        html: `
<p>Hi ${leadFirst},</p>
<p>One thing most buyers don't realize: the difference between a 6.5% and 6.75% rate on a $400k loan is over <strong>$60/month</strong> — that's $720/year and $21,600 over the life of the loan.</p>
<p>I shop dozens of lenders to find you the best rate. It costs you nothing and takes about 15 minutes.</p>
<p><strong><a href="${bookingUrl}">Let's find your best rate →</a></strong></p>
<p>${agentName}<br>${company}${nmlsLine}</p>`,
      };

    case 8: // Day 14 – breakup email
      return {
        subject: `${leadFirst}, should I close your file?`,
        html: `
<p>Hi ${leadFirst},</p>
<p>I haven't heard back from you, so I'm guessing one of these is true:</p>
<ul>
  <li>You've already found a lender ✅</li>
  <li>You've decided to wait ⏳</li>
  <li>Life got busy 😅</li>
</ul>
<p>Totally understandable! If I'm wrong and you're still interested, just reply to this email or <a href="${bookingUrl}">book a quick call</a>.</p>
<p>Otherwise, I'll close your file and stop reaching out. No hard feelings either way!</p>
<p>${agentName}<br>${company}${nmlsLine}</p>`,
      };

    default:
      return {
        subject: `Follow-up from ${company}`,
        html: `<p>Hi ${leadFirst},</p><p>Just following up on your mortgage inquiry. Let me know if you have any questions!</p><p>${agentFirst}</p>`,
      };
  }
}

// ── Main agent class ──────────────────────────────────────────────────────────
export class SalesFollowUpAgent {
  /**
   * Determine next follow-up action for a lead
   *
   * Sequence (per-client, stops when lead converts or 14 days pass):
   *   Step 1  — Day 1, 5 min:   VAPI call
   *   Step 2  — Day 1, 2 hr:    SMS (missed call follow-up)
   *   Step 3  — Day 1, 4 hr:    Email (pre-approval intro)
   *   Step 4  — Day 2, 24 hr:   VAPI call
   *   Step 5  — Day 2, 27 hr:   SMS (are you still interested?)
   *   Step 6  — Day 3, 48 hr:   Email (rates + value)
   *   Step 7  — Day 5, 120 hr:  VAPI call
   *   Step 9  — Day 5, 122 hr:  SMS (rate tip)
   *   Step 10 — Day 7, 168 hr:  Email (savings tip)
   *   Step 11 — Day 10, 240 hr: SMS (last message)
   *   Step 8  — Day 14, 336 hr: Email (breakup)
   */
  async getNextFollowUp(leadId: number): Promise<FollowUpSequence | null> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
    if (!lead) return null;

    // Stop if converted or lost
    if (['appointment_set', 'closed_won', 'appointment_completed', 'closed_lost'].includes(lead.status ?? '')) {
      return null;
    }

    const branding = await getClientBranding(lead.clientId);

    // Skip VAPI steps if client has calls disabled
    const activities = await db
      .select()
      .from(leadActivities)
      .where(eq(leadActivities.leadId, leadId))
      .orderBy(leadActivities.createdAt);

    const vapiCalls = activities.filter(a => a.activityType === 'call').length;
    const smsAttempts = activities.filter(a => a.activityType === 'sms').length;
    const emailsSent = activities.filter(a => a.activityType === 'email').length;

    const createdAt = new Date(lead.createdAt);
    const now = new Date();
    const hrs = (now.getTime() - createdAt.getTime()) / 3_600_000;

    // ── Step 1: VAPI call — 5 min ─────────────────────────────────────────
    if (hrs < 2 && vapiCalls === 0 && branding.vapiEnabled) {
      return { leadId, step: 1, channel: 'vapi', scheduledFor: new Date(createdAt.getTime() + 5 * 60_000) };
    }

    // ── Step 2: SMS — 2 hr ────────────────────────────────────────────────
    if (hrs >= 2 && hrs < 4 && smsAttempts === 0) {
      return {
        leadId, step: 2, channel: 'sms',
        scheduledFor: new Date(createdAt.getTime() + 2 * 3_600_000),
        message: buildSMSMessage(2, lead.firstName || 'there', branding),
      };
    }

    // ── Step 3: Email — 4 hr ──────────────────────────────────────────────
    if (hrs >= 4 && hrs < 24 && emailsSent === 0) {
      return { leadId, step: 3, channel: 'email', scheduledFor: new Date(createdAt.getTime() + 4 * 3_600_000) };
    }

    // ── Step 4: VAPI call — 24 hr ─────────────────────────────────────────
    if (hrs >= 24 && hrs < 27 && vapiCalls <= 1 && branding.vapiEnabled) {
      return { leadId, step: 4, channel: 'vapi', scheduledFor: new Date(createdAt.getTime() + 24 * 3_600_000) };
    }

    // ── Step 5: SMS — 27 hr ───────────────────────────────────────────────
    if (hrs >= 27 && hrs < 48 && smsAttempts <= 1) {
      return {
        leadId, step: 5, channel: 'sms',
        scheduledFor: new Date(createdAt.getTime() + 27 * 3_600_000),
        message: buildSMSMessage(5, lead.firstName || 'there', branding),
      };
    }

    // ── Step 6: Email — 48 hr ─────────────────────────────────────────────
    if (hrs >= 48 && hrs < 72 && emailsSent <= 1) {
      return { leadId, step: 6, channel: 'email', scheduledFor: new Date(createdAt.getTime() + 48 * 3_600_000) };
    }

    // ── Step 7: VAPI call — 120 hr (Day 5) ───────────────────────────────
    if (hrs >= 120 && hrs < 124 && vapiCalls <= 2 && branding.vapiEnabled) {
      return { leadId, step: 7, channel: 'vapi', scheduledFor: new Date(createdAt.getTime() + 120 * 3_600_000) };
    }

    // ── Step 9: SMS — 122 hr (Day 5) ─────────────────────────────────────
    if (hrs >= 122 && hrs < 168 && smsAttempts <= 2) {
      return {
        leadId, step: 9, channel: 'sms',
        scheduledFor: new Date(createdAt.getTime() + 122 * 3_600_000),
        message: buildSMSMessage(9, lead.firstName || 'there', branding),
      };
    }

    // ── Step 10: Email — 168 hr (Day 7) ──────────────────────────────────
    if (hrs >= 168 && hrs < 240 && emailsSent <= 2) {
      return { leadId, step: 10, channel: 'email', scheduledFor: new Date(createdAt.getTime() + 168 * 3_600_000) };
    }

    // ── Step 11: SMS — 240 hr (Day 10, last SMS) ─────────────────────────
    if (hrs >= 240 && hrs < 336 && smsAttempts <= 3) {
      return {
        leadId, step: 11, channel: 'sms',
        scheduledFor: new Date(createdAt.getTime() + 240 * 3_600_000),
        message: buildSMSMessage(11, lead.firstName || 'there', branding),
      };
    }

    // ── Step 8: Email — 336 hr (Day 14, breakup) ─────────────────────────
    if (hrs >= 336 && hrs < 360 && emailsSent <= 3) {
      return { leadId, step: 8, channel: 'email', scheduledFor: new Date(createdAt.getTime() + 336 * 3_600_000) };
    }

    // After 15 days with no response → mark closed_lost
    if (hrs >= 360) {
      await db.update(leads).set({ status: 'closed_lost' }).where(eq(leads.id, leadId));
      return null;
    }

    return null;
  }

  /**
   * Execute a follow-up action
   */
  async executeFollowUp(followUp: FollowUpSequence): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const [lead] = await db.select().from(leads).where(eq(leads.id, followUp.leadId));
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

      const activityType = followUp.channel === 'vapi' ? 'call' as const
        : followUp.channel === 'sms' ? 'sms' as const
        : 'email' as const;

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
        requiresResponse: false,
      });
    }
  }

  private async scheduleVapiCall(lead: any): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    if (!lead.phone) {
      console.log(`[Sales Follow-Up] Cannot schedule Vapi call for lead ${lead.id}: missing phone`);
      return;
    }

    await db.update(leads).set({ vapiCallScheduledAt: new Date() }).where(eq(leads.id, lead.id));
    console.log(`[Sales Follow-Up] Vapi call scheduled for lead ${lead.id}`);
  }

  private async sendFollowUpSMS(lead: any, message: string): Promise<void> {
    if (!lead.phone) {
      console.log(`[Sales Follow-Up] Cannot send SMS to lead ${lead.id}: missing phone`);
      return;
    }
    await sendSMS({ to: lead.phone, body: message });
    console.log(`[Sales Follow-Up] SMS sent to lead ${lead.id}`);
  }

  private async sendFollowUpEmail(lead: any, step: number): Promise<void> {
    if (!lead.email) {
      console.log(`[Sales Follow-Up] Cannot send email to lead ${lead.id}: missing email`);
      return;
    }

    const branding = await getClientBranding(lead.clientId);
    const { subject, html } = buildEmailContent(step, lead.firstName || 'there', branding);

    await sendEmail({
      to: lead.email,
      subject,
      html,
      from: branding.fromEmail,
      fromName: `${branding.agentName} | ${branding.company}`,
    });

    console.log(`[Sales Follow-Up] Email sent to lead ${lead.id} (step ${step}) from ${branding.agentName}`);
  }

  /**
   * Process all leads needing follow-up (called by cron every hour)
   */
  async processFollowUps(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

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
      if (isTestLead(lead)) {
        logTestLeadSuppression('all', lead, 'sales-followup-agent');
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
        requiresResponse: false,
      });
    }
  }

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

export const salesFollowUpAgent = new SalesFollowUpAgent();
