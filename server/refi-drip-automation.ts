/**
 * Refi Drip Automation Engine
 * 14-day email sequence for leads tagged as Refi Prospects
 *
 * Sequence:
 *   Step 1 (Day 0):  Rate Drop Alert         → refi_rate_drop_alert
 *   Step 2 (Day 3):  Follow-Up #1            → refi_followup_day3
 *   Step 3 (Day 7):  Social Proof + Urgency  → refi_followup_day7
 *   Step 4 (Day 14): Urgency Close           → refi_urgency_close
 */

import { eq, and, lte, isNull, isNotNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import { leads } from "../drizzle/schema";
import { sendEmail } from "./email-service";
import { getDb } from "./seo-db";
import { emailTemplates } from "../drizzle/seo-schema";

const DRIP_STEPS: Array<{
  step: number;
  campaignType: string;
  delayDays: number;
  fallbackSubject: string;
  fallbackHtml: (name: string) => string;
}> = [
  {
    step: 1,
    campaignType: "refi_rate_drop_alert",
    delayDays: 0,
    fallbackSubject: "🚨 Rates Just Hit Record Lows — Lock In Before They Rise",
    fallbackHtml: (name) => `<p>Hi ${name},</p><p>Mortgage rates just hit record lows. Now is the perfect time to refinance and lower your monthly payment. Reply to schedule a free rate review.</p><p>— Tim Haskins, Premier Mortgage Resources | NMLS #1116876</p>`,
  },
  {
    step: 2,
    campaignType: "refi_followup_day3",
    delayDays: 3,
    fallbackSubject: "💰 How Much Could You Save? (Real Numbers Inside)",
    fallbackHtml: (name) => `<p>Hi ${name},</p><p>I wanted to follow up — homeowners with a $300K mortgage are saving $300+/month by refinancing right now. Want to see your number? Reply and I'll run it for you.</p><p>— Tim Haskins, Premier Mortgage Resources | NMLS #1116876</p>`,
  },
  {
    step: 3,
    campaignType: "refi_followup_day7",
    delayDays: 7,
    fallbackSubject: "⏰ Rates Won't Stay This Low — Here's What Others Are Doing",
    fallbackHtml: (name) => `<p>Hi ${name},</p><p>I've helped several homeowners lock in these historic rates this week. Don't miss your window — let's talk before rates move back up.</p><p>— Tim Haskins, Premier Mortgage Resources | NMLS #1116876</p>`,
  },
  {
    step: 4,
    campaignType: "refi_urgency_close",
    delayDays: 14,
    fallbackSubject: "⚠️ Last Chance — Rates Are Starting to Climb",
    fallbackHtml: (name) => `<p>Hi ${name},</p><p>This is my final note on the refi opportunity. Rates are beginning to tick back up. If you want to lock in the savings, now is the time. Reply and I'll get your application started today.</p><p>— Tim Haskins, Premier Mortgage Resources | NMLS #1116876</p>`,
  },
];

/**
 * Get the HTML template for a campaign type from the DB, falling back to inline HTML
 */
async function getTemplateForStep(
  campaignType: string,
  leadName: string,
  fallbackSubject: string,
  fallbackHtml: (name: string) => string
): Promise<{ subject: string; html: string; fromAddress: string }> {
  try {
    const seoDb = await getDb();
    const [template] = await seoDb
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.campaignType, campaignType), eq(emailTemplates.isActive, true)))
      .limit(1);

    if (template) {
      // Replace {{firstName}} and {{name}} placeholders
      const html = template.html
        .replace(/\{\{firstName\}\}/g, leadName.split(" ")[0])
        .replace(/\{\{name\}\}/g, leadName)
        .replace(/\{\{fullName\}\}/g, leadName);
      const subject = template.subject
        .replace(/\{\{firstName\}\}/g, leadName.split(" ")[0])
        .replace(/\{\{name\}\}/g, leadName);
      return { subject, html, fromAddress: template.fromAddress || "tim.haskins@pmrloans.com" };
    }
  } catch (err) {
    console.error(`[Refi Drip] Failed to load template ${campaignType}:`, err);
  }

  // Fallback to inline HTML
  return {
    subject: fallbackSubject,
    html: fallbackHtml(leadName.split(" ")[0]),
    fromAddress: process.env.FROM_EMAIL || "noreply@lockinloans.com",
  };
}

/**
 * Process all active refi drip leads and send the next email if due
 * Called by cron every hour
 */
export async function processRefiDrip(): Promise<void> {
  const db = (await getDb())!;
  const now = new Date();

  // Get all refi prospects that have started the drip but not completed it
  const activeLeads = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.refiProspect, true),
        isNotNull(leads.refiDripStartedAt),
        isNull(leads.refiDripCompletedAt),
        eq(leads.isTest, false),
        eq(leads.optedOut ?? leads.isTest, false) // respect do-not-contact if field exists
      )
    );

  let processed = 0;
  let sent = 0;
  let errors = 0;

  for (const lead of activeLeads) {
    try {
      const startedAt = lead.refiDripStartedAt!;
      const currentStep = lead.refiDripStep ?? 0;

      // Find the next step to send
      const nextStep = DRIP_STEPS.find((s) => s.step === currentStep + 1);
      if (!nextStep) {
        // All steps sent — mark complete
        await db
          .update(leads)
          .set({ refiDripCompletedAt: now })
          .where(eq(leads.id, lead.id));
        continue;
      }

      // Check if enough days have passed since drip started
      const daysSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceStart < nextStep.delayDays) {
        continue; // Not time yet
      }

      // Skip if no email address
      if (!lead.email) {
        console.log(`[Refi Drip] Lead ${lead.id} has no email, skipping`);
        await db
          .update(leads)
          .set({ refiDripStep: nextStep.step })
          .where(eq(leads.id, lead.id));
        continue;
      }

      const leadName = `${lead.firstName} ${lead.lastName}`.trim();
      const { subject, html, fromAddress } = await getTemplateForStep(
        nextStep.campaignType,
        leadName,
        nextStep.fallbackSubject,
        nextStep.fallbackHtml
      );

      // Send the email
      const result = await sendEmail({
        to: lead.email,
        from: fromAddress,
        subject,
        html,
        campaignType: nextStep.campaignType,
      });

      // Update step regardless of send result (don't retry failed sends automatically)
      const isLastStep = nextStep.step === DRIP_STEPS.length;
      await db
        .update(leads)
        .set({
          refiDripStep: nextStep.step,
          ...(isLastStep ? { refiDripCompletedAt: now } : {}),
        })
        .where(eq(leads.id, lead.id));

      if (result.success) {
        sent++;
        console.log(`[Refi Drip] Sent step ${nextStep.step} (${nextStep.campaignType}) to lead ${lead.id} (${lead.email})`);
      } else {
        errors++;
        console.error(`[Refi Drip] Failed step ${nextStep.step} for lead ${lead.id}: ${result.error}`);
      }

      processed++;
    } catch (err) {
      errors++;
      console.error(`[Refi Drip] Error processing lead ${lead.id}:`, err);
    }
  }

  if (processed > 0 || activeLeads.length > 0) {
    console.log(`[Refi Drip] Processed ${activeLeads.length} leads: ${sent} emails sent, ${errors} errors`);
  }
}

/**
 * Tag a lead as a refi prospect and start the drip immediately
 * Called when user clicks "Mark as Refi Prospect" on a lead
 */
export async function tagLeadAsRefiProspect(leadId: number): Promise<void> {
  const db = (await getDb())!;
  await db
    .update(leads)
    .set({
      refiProspect: true,
      refiDripStartedAt: new Date(),
      refiDripStep: 0,
      refiDripCompletedAt: null,
    })
    .where(eq(leads.id, leadId));
}

/**
 * Remove refi prospect tag and stop the drip
 */
export async function untagLeadAsRefiProspect(leadId: number): Promise<void> {
  const db = (await getDb())!;
  await db
    .update(leads)
    .set({
      refiProspect: false,
      refiDripCompletedAt: new Date(), // Mark as completed to stop processing
    })
    .where(eq(leads.id, leadId));
}
