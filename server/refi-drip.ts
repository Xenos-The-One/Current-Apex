/**
 * Refi Drip Automation Service
 *
 * Manages the 14-day automated email drip sequence for refi prospects.
 *
 * Sequence:
 *   Day 0  → Rate Drop Alert        (step 1)
 *   Day 3  → Follow-Up Day 3        (step 2)
 *   Day 7  → Follow-Up Day 7        (step 3)
 *   Day 14 → Urgency Close          (step 4)
 */

import { eq, and, isNotNull, lte, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { leads } from "../drizzle/schema";
import { getDb as getSeoDb } from "./seo-db";
import { emailTemplates, EmailTemplate } from "../drizzle/seo-schema";
import { sendEmail } from "./email-service";
import { createLeadActivity } from "./db";

// Drip step definitions: step number → { campaignType, dayOffset }
const DRIP_STEPS: Array<{ step: number; campaignType: string; dayOffset: number; label: string }> = [
  { step: 1, campaignType: "refi_rate_drop_alert",  dayOffset: 0,  label: "Day 0 — Rate Drop Alert"      },
  { step: 2, campaignType: "refi_followup_day3",    dayOffset: 3,  label: "Day 3 — Follow-Up"             },
  { step: 3, campaignType: "refi_followup_day7",    dayOffset: 7,  label: "Day 7 — Social Proof"          },
  { step: 4, campaignType: "refi_urgency_close",    dayOffset: 14, label: "Day 14 — Urgency Close"        },
];

/**
 * Personalise template HTML with lead-specific tokens.
 */
function personalizeHtml(html: string, lead: { firstName: string; lastName: string; email?: string | null }): string {
  return html
    .replace(/\{\{first_name\}\}/gi, lead.firstName)
    .replace(/\{\{last_name\}\}/gi, lead.lastName)
    .replace(/\{\{full_name\}\}/gi, `${lead.firstName} ${lead.lastName}`)
    .replace(/\{\{email\}\}/gi, lead.email ?? "");
}

/**
 * Personalise subject line with lead tokens.
 */
function personalizeSubject(subject: string, lead: { firstName: string; lastName: string }): string {
  return subject
    .replace(/\{\{first_name\}\}/gi, lead.firstName)
    .replace(/\{\{last_name\}\}/gi, lead.lastName)
    .replace(/\{\{full_name\}\}/gi, `${lead.firstName} ${lead.lastName}`);
}

/**
 * Process all active refi drip sequences.
 * Called by the cron job every hour.
 */
export async function processRefiDrip(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[RefiDrip] Main DB not available, skipping.");
    return;
  }

  const seoDb = await getSeoDb();
  if (!seoDb) {
    console.warn("[RefiDrip] SEO DB not available, skipping.");
    return;
  }

  const now = new Date();

  // Fetch all leads that are refi prospects, drip started, not yet completed
  const activeLeads = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.refiProspect, true),
        isNotNull(leads.refiDripStartedAt),
        isNull(leads.refiDripCompletedAt)
      )
    );

  if (activeLeads.length === 0) {
    console.log("[RefiDrip] No active refi drip leads found.");
    return;
  }

  console.log(`[RefiDrip] Processing ${activeLeads.length} active refi drip lead(s)...`);

  // Load all refi email templates once
  const allTemplates = await seoDb.select().from(emailTemplates);
  const templateMap = new Map<string, EmailTemplate>(allTemplates.map((t) => [t.campaignType, t]));

  for (const lead of activeLeads) {
    try {
      await processLeadDrip(db, lead, templateMap, now);
    } catch (err) {
      console.error(`[RefiDrip] Error processing lead ${lead.id}:`, err);
    }
  }
}

/**
 * Process a single lead's drip sequence.
 */
async function processLeadDrip(
  db: Awaited<ReturnType<typeof getDb>>,
  lead: typeof leads.$inferSelect,
  templateMap: Map<string, EmailTemplate>,
  now: Date
): Promise<void> {
  if (!db) return;
  if (!lead.refiDripStartedAt) return;
  if (!lead.email) {
    console.warn(`[RefiDrip] Lead ${lead.id} has no email address — skipping.`);
    return;
  }

  // Suppress test leads
  if (lead.isTest) {
    console.log(`[RefiDrip] Lead ${lead.id} is a test lead — skipping.`);
    return;
  }

  const currentStep = lead.refiDripStep ?? 0;
  const startedAt = new Date(lead.refiDripStartedAt);
  const daysSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Find the next step to send
  const nextStep = DRIP_STEPS.find((s) => s.step > currentStep && daysSinceStart >= s.dayOffset);

  if (!nextStep) {
    // Check if all steps are done
    if (currentStep >= DRIP_STEPS[DRIP_STEPS.length - 1].step) {
      // Mark drip as completed
      await db.update(leads).set({ refiDripCompletedAt: now }).where(eq(leads.id, lead.id));
      console.log(`[RefiDrip] Lead ${lead.id} (${lead.firstName} ${lead.lastName}) — drip sequence COMPLETED.`);
    }
    return;
  }

  const template: EmailTemplate | undefined = templateMap.get(nextStep.campaignType);
  if (!template) {
    console.warn(`[RefiDrip] Template not found for campaignType: ${nextStep.campaignType} — skipping lead ${lead.id}.`);
    return;
  }

  const subject = personalizeSubject(template.subject, lead);
  const html = personalizeHtml(template.html, lead);

  console.log(`[RefiDrip] Sending ${nextStep.label} to ${lead.email} (lead ${lead.id})...`);

  const result = await sendEmail({
    to: lead.email,
    subject,
    html,
    from: template.fromAddress ?? process.env.FROM_EMAIL ?? "noreply@lockinloans.com",
    replyTo: "tim.haskins@pmrloans.com",
  });

  if (result.success) {
    // Advance the drip step
    const isLastStep = nextStep.step >= DRIP_STEPS[DRIP_STEPS.length - 1].step;
    await db.update(leads).set({
      refiDripStep: nextStep.step,
      ...(isLastStep ? { refiDripCompletedAt: now } : {}),
    }).where(eq(leads.id, lead.id));

    // Log activity
    await createLeadActivity({
      leadId: lead.id,
      activityType: "email",
      description: `Refi drip email sent: ${nextStep.label} — "${subject}"`,
    });

    console.log(`[RefiDrip] ✅ Sent ${nextStep.label} to lead ${lead.id} (${lead.firstName} ${lead.lastName})`);
  } else {
    console.error(`[RefiDrip] ❌ Failed to send ${nextStep.label} to lead ${lead.id}: ${result.error}`);
  }
}

/**
 * Tag a lead as a refi prospect and start the drip sequence immediately.
 * Returns the updated lead.
 */
export async function tagLeadAsRefiProspect(leadId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) return { success: false, message: "Lead not found" };

  if (lead.refiProspect && lead.refiDripStartedAt) {
    return { success: false, message: "Lead is already tagged as a refi prospect with an active drip" };
  }

  const now = new Date();
  await db.update(leads).set({
    refiProspect: true,
    refiDripStartedAt: now,
    refiDripStep: 0,
    refiDripCompletedAt: null,
  }).where(eq(leads.id, leadId));

  // Log the activity
  await createLeadActivity({
    leadId,
    activityType: "note",
    description: "Tagged as Refi Prospect — 14-day drip sequence started (Day 0 email will send shortly)",
  });

  // Immediately trigger Day 0 email
  const seoDb = await getSeoDb();
  if (seoDb && lead.email && !lead.isTest) {
    const allTemplates = await seoDb.select().from(emailTemplates);
    const templateMap = new Map<string, EmailTemplate>(allTemplates.map((t) => [t.campaignType, t]));
    const updatedLead = { ...lead, refiProspect: true, refiDripStartedAt: now, refiDripStep: 0, refiDripCompletedAt: null };
    await processLeadDrip(db, updatedLead as typeof leads.$inferSelect, templateMap, now);
  }

  return { success: true, message: `Refi drip started for ${lead.firstName} ${lead.lastName}` };
}

/**
 * Remove the refi prospect tag and stop the drip.
 */
export async function untagLeadAsRefiProspect(leadId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) return { success: false, message: "Lead not found" };

  await db.update(leads).set({
    refiProspect: false,
    refiDripCompletedAt: new Date(),
  }).where(eq(leads.id, leadId));

  await createLeadActivity({
    leadId,
    activityType: "note",
    description: "Removed Refi Prospect tag — drip sequence stopped",
  });

  return { success: true, message: `Refi drip stopped for ${lead.firstName} ${lead.lastName}` };
}

/**
 * Get the drip status for a lead.
 */
export async function getRefiDripStatus(leadId: number): Promise<{
  isRefiProspect: boolean;
  dripStartedAt: Date | null;
  currentStep: number;
  completedAt: Date | null;
  nextStepLabel: string | null;
  nextStepDue: Date | null;
  progress: number; // 0-100
}> {
  const db = await getDb();
  if (!db) {
    return { isRefiProspect: false, dripStartedAt: null, currentStep: 0, completedAt: null, nextStepLabel: null, nextStepDue: null, progress: 0 };
  }

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) {
    return { isRefiProspect: false, dripStartedAt: null, currentStep: 0, completedAt: null, nextStepLabel: null, nextStepDue: null, progress: 0 };
  }

  const currentStep = lead.refiDripStep ?? 0;
  const totalSteps = DRIP_STEPS.length;
  const progress = lead.refiDripCompletedAt ? 100 : Math.round((currentStep / totalSteps) * 100);

  let nextStepLabel: string | null = null;
  let nextStepDue: Date | null = null;

  if (lead.refiDripStartedAt && !lead.refiDripCompletedAt) {
    const nextStep = DRIP_STEPS.find((s) => s.step > currentStep);
    if (nextStep) {
      nextStepLabel = nextStep.label;
      const dueDate = new Date(lead.refiDripStartedAt);
      dueDate.setDate(dueDate.getDate() + nextStep.dayOffset);
      nextStepDue = dueDate;
    }
  }

  return {
    isRefiProspect: lead.refiProspect ?? false,
    dripStartedAt: lead.refiDripStartedAt ? new Date(lead.refiDripStartedAt) : null,
    currentStep,
    completedAt: lead.refiDripCompletedAt ? new Date(lead.refiDripCompletedAt) : null,
    nextStepLabel,
    nextStepDue,
    progress,
  };
}
