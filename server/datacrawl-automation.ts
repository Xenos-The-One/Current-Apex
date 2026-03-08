/**
 * Datacrawl Automation System
 * Handles lead nurturing, scoring, and automatic referral-back to agents
 */

import mysql from "mysql2/promise";
import { ENV } from "./_core/env";
import { sendEmail } from "./sendgrid";
import { sendSMS } from "./twilio";
import { triggerAutomation } from "./automation";

let dbConnection: mysql.Connection | null = null;

async function getConnection(): Promise<mysql.Connection> {
  if (!dbConnection) {
    dbConnection = await mysql.createConnection(ENV.databaseUrl);
  }
  return dbConnection;
}

/**
 * Lead Scoring Thresholds
 */
const SCORING = {
  EMAIL_OPEN: 5,
  EMAIL_CLICK: 10,
  SMS_REPLY: 15,
  CALL_ANSWER: 20,
  FORM_SUBMIT: 25,
  HOT_THRESHOLD: 40, // Refer back to agent when score >= 40
  WARM_THRESHOLD: 20,
};

/**
 * Import datacrawl leads from agent
 */
export async function importDatacrawlLeads(params: {
  agencyId: number;
  clientId: number;
  referringAgentName: string;
  referringAgentEmail: string;
  referringAgentPhone?: string;
  referringAgentBrokerage?: string;
  leads: Array<{
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    originalLeadDate?: Date;
    notes?: string;
  }>;
}): Promise<{
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}> {
  const conn = await getConnection();
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    for (const leadData of params.leads) {
      try {
        // Create lead in leads table
        const [leadResult] = await conn.query<any>(
          `INSERT INTO leads (client_id, agency_id, first_name, last_name, email, phone, source, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, 'datacrawl', 'new', ?)`,
          [
            params.clientId,
            params.agencyId,
            leadData.firstName,
            leadData.lastName,
            leadData.email || null,
            leadData.phone || null,
            leadData.notes || null
          ]
        );

        const leadId = leadResult.insertId;

        // Create datacrawl_leads record
        await conn.query(
          `INSERT INTO datacrawl_leads (lead_id, referring_agent_name, referring_agent_email, referring_agent_phone, referring_agent_brokerage, original_lead_date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            leadId,
            params.referringAgentName,
            params.referringAgentEmail,
            params.referringAgentPhone || null,
            params.referringAgentBrokerage || null,
            leadData.originalLeadDate || null
          ]
        );

        // Trigger datacrawl nurture automation
        if (leadData.email) {
          await triggerAutomation({
            trigger: "datacrawl_import",
            agencyId: params.agencyId,
            contactEmail: leadData.email,
            contactPhone: leadData.phone,
            contactName: `${leadData.firstName} ${leadData.lastName}`,
            leadId,
            triggerData: {
              agentName: params.referringAgentName,
              agentBrokerage: params.referringAgentBrokerage || ""
            }
          });
        }

        imported++;
      } catch (error) {
        failed++;
        errors.push(`${leadData.firstName} ${leadData.lastName}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return {
      success: true,
      imported,
      failed,
      errors
    };
  } catch (error) {
    console.error("[Datacrawl] Error importing leads:", error);
    return {
      success: false,
      imported,
      failed,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}

/**
 * Update lead engagement score
 */
export async function updateEngagementScore(params: {
  leadId: number;
  activityType: "email_open" | "email_click" | "sms_reply" | "call_answer" | "form_submit";
}): Promise<void> {
  const conn = await getConnection();

  try {
    // Get current datacrawl lead record
    const [datacrawlLeads] = await conn.query<any[]>(
      `SELECT * FROM datacrawl_leads WHERE lead_id = ? LIMIT 1`,
      [params.leadId]
    );

    if (datacrawlLeads.length === 0) {
      // Not a datacrawl lead, skip
      return;
    }

    const datacrawlLead = datacrawlLeads[0];

    // Calculate score increase
    let scoreIncrease = 0;
    switch (params.activityType) {
      case "email_open":
        scoreIncrease = SCORING.EMAIL_OPEN;
        break;
      case "email_click":
        scoreIncrease = SCORING.EMAIL_CLICK;
        break;
      case "sms_reply":
        scoreIncrease = SCORING.SMS_REPLY;
        break;
      case "call_answer":
        scoreIncrease = SCORING.CALL_ANSWER;
        break;
      case "form_submit":
        scoreIncrease = SCORING.FORM_SUBMIT;
        break;
    }

    const newScore = (datacrawlLead.engagement_score || 0) + scoreIncrease;

    // Update engagement score and last engagement date
    await conn.query(
      `UPDATE datacrawl_leads SET engagement_score = ?, last_engagement_date = NOW() WHERE lead_id = ?`,
      [newScore, params.leadId]
    );

    // Update lead score in leads table
    await conn.query(
      `UPDATE leads SET score = ?, score_tier = ? WHERE id = ?`,
      [
        newScore,
        newScore >= SCORING.HOT_THRESHOLD ? "hot" : newScore >= SCORING.WARM_THRESHOLD ? "warm" : "cold",
        params.leadId
      ]
    );

    // Check if lead should be referred back to agent
    if (newScore >= SCORING.HOT_THRESHOLD && datacrawlLead.nurture_status === "active") {
      await referLeadBackToAgent(params.leadId, "High engagement score - lead is hot!");
    }

    console.log(`[Datacrawl] Updated lead ${params.leadId} score: ${newScore} (${params.activityType})`);
  } catch (error) {
    console.error("[Datacrawl] Error updating engagement score:", error);
  }
}

/**
 * Refer lead back to agent
 */
async function referLeadBackToAgent(leadId: number, reason: string): Promise<void> {
  const conn = await getConnection();

  try {
    // Get lead and datacrawl info
    const [leads] = await conn.query<any[]>(
      `SELECT l.*, dc.* 
       FROM leads l
       JOIN datacrawl_leads dc ON dc.lead_id = l.id
       WHERE l.id = ? LIMIT 1`,
      [leadId]
    );

    if (leads.length === 0) return;

    const lead = leads[0];

    // Update datacrawl_leads status
    await conn.query(
      `UPDATE datacrawl_leads 
       SET nurture_status = 'referred_back', referred_back_at = NOW(), referred_back_reason = ?, agent_notified = TRUE
       WHERE lead_id = ?`,
      [reason, leadId]
    );

    // Send notification email to agent
    await sendEmail({
      to: [lead.referring_agent_email],
      from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
      subject: `🔥 Hot Lead Alert: ${lead.first_name} ${lead.last_name} is Ready!`,
      html: `
        <h2>Great News, ${lead.referring_agent_name}!</h2>
        
        <p>Your lead <strong>${lead.first_name} ${lead.last_name}</strong> is showing high engagement and is ready to move forward!</p>
        
        <p><strong>Why they're hot:</strong><br>${reason}</p>
        
        <p><strong>Lead Details:</strong></p>
        <ul>
          <li><strong>Name:</strong> ${lead.first_name} ${lead.last_name}</li>
          <li><strong>Email:</strong> ${lead.email || "N/A"}</li>
          <li><strong>Phone:</strong> ${lead.phone || "N/A"}</li>
          <li><strong>Engagement Score:</strong> ${lead.engagement_score}/100</li>
          <li><strong>Last Activity:</strong> ${lead.last_engagement_date ? new Date(lead.last_engagement_date).toLocaleDateString() : "N/A"}</li>
        </ul>
        
        <p><strong>Recommended Next Steps:</strong></p>
        <ol>
          <li>Call them within 24 hours while they're engaged</li>
          <li>Reference our recent conversations about mortgage options</li>
          <li>Offer to connect them with Tim for pre-approval</li>
        </ol>
        
        <p>This lead is warm and ready - don't let them cool down!</p>
        
        <p>Best regards,<br>
        Tim Haskins, NMLS #1116876<br>
        The Home Loan Coach</p>
      `,
      text: `Great News, ${lead.referring_agent_name}! Your lead ${lead.first_name} ${lead.last_name} is showing high engagement and is ready to move forward! Engagement Score: ${lead.engagement_score}/100. Contact: ${lead.email || lead.phone || "N/A"}. Call them within 24 hours!`
    });

    // Send SMS notification if agent phone is available
    if (lead.referring_agent_phone) {
      await sendSMS({
        to: lead.referring_agent_phone,
        body: `🔥 Hot Lead Alert! ${lead.first_name} ${lead.last_name} is ready to move forward (score: ${lead.engagement_score}/100). Check your email for details. - Tim, The Home Loan Coach`
      });
    }

    console.log(`[Datacrawl] Referred lead ${leadId} back to agent ${lead.referring_agent_email}`);
  } catch (error) {
    console.error("[Datacrawl] Error referring lead back to agent:", error);
  }
}

/**
 * Get datacrawl dashboard data for an agent
 */
export async function getAgentDashboard(agentEmail: string): Promise<{
  totalLeads: number;
  activeNurture: number;
  referredBack: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  leads: Array<{
    id: number;
    name: string;
    email: string;
    phone: string;
    score: number;
    tier: string;
    status: string;
    lastEngagement: Date | null;
    referredBackAt: Date | null;
  }>;
}> {
  const conn = await getConnection();

  try {
    // Get all leads for this agent
    const [leads] = await conn.query<any[]>(
      `SELECT 
        l.id,
        l.first_name,
        l.last_name,
        l.email,
        l.phone,
        l.score,
        l.score_tier,
        dc.nurture_status,
        dc.engagement_score,
        dc.last_engagement_date,
        dc.referred_back_at
       FROM datacrawl_leads dc
       JOIN leads l ON l.id = dc.lead_id
       WHERE dc.referring_agent_email = ?
       ORDER BY dc.engagement_score DESC, dc.last_engagement_date DESC`,
      [agentEmail]
    );

    const totalLeads = leads.length;
    const activeNurture = leads.filter((l: any) => l.nurture_status === "active").length;
    const referredBack = leads.filter((l: any) => l.nurture_status === "referred_back").length;
    const hotLeads = leads.filter((l: any) => l.score_tier === "hot").length;
    const warmLeads = leads.filter((l: any) => l.score_tier === "warm").length;
    const coldLeads = leads.filter((l: any) => l.score_tier === "cold").length;

    return {
      totalLeads,
      activeNurture,
      referredBack,
      hotLeads,
      warmLeads,
      coldLeads,
      leads: leads.map((l: any) => ({
        id: l.id,
        name: `${l.first_name} ${l.last_name}`,
        email: l.email,
        phone: l.phone,
        score: l.engagement_score || 0,
        tier: l.score_tier,
        status: l.nurture_status,
        lastEngagement: l.last_engagement_date,
        referredBackAt: l.referred_back_at
      }))
    };
  } catch (error) {
    console.error("[Datacrawl] Error getting agent dashboard:", error);
    return {
      totalLeads: 0,
      activeNurture: 0,
      referredBack: 0,
      hotLeads: 0,
      warmLeads: 0,
      coldLeads: 0,
      leads: []
    };
  }
}
