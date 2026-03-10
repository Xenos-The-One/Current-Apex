/**
 * Campaign Scheduler
 * Runs every minute to check for scheduled email and SMS campaigns
 * that are due to be sent and fires them.
 *
 * Uses sql.raw() to match the actual DB column names (camelCase legacy schema).
 */
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { sendBulkEmail } from "../sendgrid";
import { sendBulkSMS } from "../twilio";

interface EmailCampaignRow {
  id: number;
  agencyId: number;
  name: string;
  subject: string;
  content: string | null;
  status: string;
  fromEmail: string | null;
}

interface SmsCampaignRow {
  id: number;
  agencyId: number;
  name: string;
  message: string;
  status: string;
}

interface LeadRow {
  email?: string | null;
  phone?: string | null;
}

export async function processScheduledCampaigns() {
  const db = await getDb();
  if (!db) return;

  const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");

  // ── Email campaigns ──────────────────────────────────────────────────────────
  try {
    const emailResult = await db.execute(
      sql.raw(`SELECT id, agencyId, name, subject, content, status, fromEmail
               FROM email_campaigns
               WHERE status = 'scheduled'
                 AND scheduledAt IS NOT NULL
                 AND scheduledAt <= '${nowStr}'`)
    ) as any;

    const dueEmailCampaigns: EmailCampaignRow[] = Array.isArray(emailResult)
      ? (emailResult[0] as EmailCampaignRow[]) || []
      : [];

    for (const campaign of dueEmailCampaigns) {
      console.log(`[CampaignScheduler] Firing scheduled email campaign ${campaign.id}: "${campaign.name}"`);
      try {
        // Mark as sending immediately to prevent double-firing
        await db.execute(sql.raw(`UPDATE email_campaigns SET status = 'sending' WHERE id = ${campaign.id}`));

        // Get recipients from leads for this agency
        const leadsResult = await db.execute(
          sql.raw(`SELECT email FROM leads WHERE agencyId = ${campaign.agencyId} AND email IS NOT NULL AND email != '' LIMIT 500`)
        ) as any;
        const recipientLeads: LeadRow[] = Array.isArray(leadsResult) ? (leadsResult[0] as LeadRow[]) || [] : [];
        const recipients = recipientLeads.map((l) => l.email!).filter(Boolean);

        if (recipients.length > 0) {
          const result = await sendBulkEmail({
            to: recipients,
            from: campaign.fromEmail || "noreply@lockinloans.com",
            subject: campaign.subject,
            html: campaign.content || undefined,
          });
          await db.execute(
            sql.raw(`UPDATE email_campaigns SET status = 'sent', sentAt = NOW(), totalSent = ${result.sent}, totalRecipients = ${recipients.length} WHERE id = ${campaign.id}`)
          );
          console.log(`[CampaignScheduler] Email campaign ${campaign.id} sent to ${result.sent} recipients`);
        } else {
          await db.execute(sql.raw(`UPDATE email_campaigns SET status = 'failed' WHERE id = ${campaign.id}`));
          console.warn(`[CampaignScheduler] Email campaign ${campaign.id} failed: no recipients found`);
        }
      } catch (err) {
        console.error(`[CampaignScheduler] Email campaign ${campaign.id} error:`, err);
        await db.execute(sql.raw(`UPDATE email_campaigns SET status = 'failed' WHERE id = ${campaign.id}`)).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[CampaignScheduler] Email campaign check failed:", err);
  }

  // ── SMS campaigns ────────────────────────────────────────────────────────────
  try {
    const smsResult = await db.execute(
      sql.raw(`SELECT id, agencyId, name, message, status
               FROM sms_campaigns
               WHERE status = 'scheduled'
                 AND scheduledAt IS NOT NULL
                 AND scheduledAt <= '${nowStr}'`)
    ) as any;

    const dueSmsCampaigns: SmsCampaignRow[] = Array.isArray(smsResult)
      ? (smsResult[0] as SmsCampaignRow[]) || []
      : [];

    for (const campaign of dueSmsCampaigns) {
      console.log(`[CampaignScheduler] Firing scheduled SMS campaign ${campaign.id}: "${campaign.name}"`);
      try {
        // Mark as sending immediately to prevent double-firing
        await db.execute(sql.raw(`UPDATE sms_campaigns SET status = 'sending' WHERE id = ${campaign.id}`));

        // Get recipients from leads for this agency
        const leadsResult = await db.execute(
          sql.raw(`SELECT phone FROM leads WHERE agencyId = ${campaign.agencyId} AND phone IS NOT NULL AND phone != '' LIMIT 500`)
        ) as any;
        const recipientLeads: LeadRow[] = Array.isArray(leadsResult) ? (leadsResult[0] as LeadRow[]) || [] : [];
        const recipients = recipientLeads.map((l) => l.phone!).filter(Boolean);

        if (recipients.length > 0) {
          const result = await sendBulkSMS(recipients, campaign.message);
          await db.execute(
            sql.raw(`UPDATE sms_campaigns SET status = 'sent', sentAt = NOW(), totalSent = ${result.sent}, totalRecipients = ${recipients.length} WHERE id = ${campaign.id}`)
          );
          console.log(`[CampaignScheduler] SMS campaign ${campaign.id} sent to ${result.sent} recipients`);
        } else {
          await db.execute(sql.raw(`UPDATE sms_campaigns SET status = 'failed' WHERE id = ${campaign.id}`));
          console.warn(`[CampaignScheduler] SMS campaign ${campaign.id} failed: no recipients found`);
        }
      } catch (err) {
        console.error(`[CampaignScheduler] SMS campaign ${campaign.id} error:`, err);
        await db.execute(sql.raw(`UPDATE sms_campaigns SET status = 'failed' WHERE id = ${campaign.id}`)).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[CampaignScheduler] SMS campaign check failed:", err);
  }
}
