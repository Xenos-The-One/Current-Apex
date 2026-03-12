/**
 * Drip Campaign Sequences Router
 * 
 * Manages automated multi-step email/SMS follow-up sequences for leads.
 * Handles CRUD for sequences/steps, enrollment management, and processing due steps.
 * 
 * Key flows:
 * 1. Admin creates a sequence with steps (email/SMS with delays)
 * 2. Leads are auto-enrolled when created (or manually enrolled)
 * 3. A cron job calls processSequenceQueue() every 5 minutes to send due steps
 * 4. Enrollment stops when appointment is booked or lead replies
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  campaignSequences,
  campaignSequenceSteps,
  campaignEnrollments,
  campaignStepLogs,
} from "../../drizzle/schema-campaigns";
import { leads, agencies, clients } from "../../drizzle/schema";
import { eq, and, lte, desc, asc } from "drizzle-orm";
import { sendEmail } from "../sendgrid";
import { sendSMS } from "../twilio";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Replace merge tags in message body */
function applyMergeTags(body: string, lead: any): string {
  const firstName = lead.firstName || lead.first_name || lead.name?.split(" ")[0] || "Investor";
  const lastName = lead.lastName || lead.last_name || lead.name?.split(" ").slice(1).join(" ") || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const bookingUrl = process.env.VITE_APP_URL
    ? `${process.env.VITE_APP_URL}/book`
    : "https://crmplatform-rus3etbp.manus.space/book";

  return body
    .replace(/\{\{firstName\}\}/gi, firstName)
    .replace(/\{\{lastName\}\}/gi, lastName)
    .replace(/\{\{fullName\}\}/gi, fullName)
    .replace(/\{\{email\}\}/gi, lead.email || "")
    .replace(/\{\{phone\}\}/gi, lead.phone || "")
    .replace(/\{\{bookingUrl\}\}/gi, bookingUrl)
    .replace(/\{\{loanType\}\}/gi, lead.loanType || lead.loan_type || "investment property")
    .replace(/\{\{propertyAddress\}\}/gi, lead.propertyAddress || lead.property_address || "your property");
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const dripSequencesRouter = router({

  // ── Sequence CRUD ──────────────────────────────────────────────────────────

  listSequences: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const agencyId = await getAgencyId(ctx.user.id, db);
      const rows = await db
        .select()
        .from(campaignSequences)
        .where(eq(campaignSequences.agencyId, agencyId))
        .orderBy(desc(campaignSequences.createdAt));

      // Attach step count
      const withCounts = await Promise.all(
        rows.map(async (seq) => {
          const steps = await db
            .select({ id: campaignSequenceSteps.id })
            .from(campaignSequenceSteps)
            .where(eq(campaignSequenceSteps.sequenceId, seq.id));
          const enrollments = await db
            .select({ id: campaignEnrollments.id })
            .from(campaignEnrollments)
            .where(
              and(
                eq(campaignEnrollments.sequenceId, seq.id),
                eq(campaignEnrollments.status, "active")
              )
            );
          return { ...seq, stepCount: steps.length, activeEnrollments: enrollments.length };
        })
      );
      return withCounts;
    }),

  getSequence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const agencyId = await getAgencyId(ctx.user.id, db);
      const [seq] = await db
        .select()
        .from(campaignSequences)
        .where(and(eq(campaignSequences.id, input.id), eq(campaignSequences.agencyId, agencyId)))
        .limit(1);

      if (!seq) throw new TRPCError({ code: "NOT_FOUND", message: "Sequence not found" });

      const steps = await db
        .select()
        .from(campaignSequenceSteps)
        .where(eq(campaignSequenceSteps.sequenceId, seq.id))
        .orderBy(asc(campaignSequenceSteps.stepOrder));

      return { ...seq, steps };
    }),

  createSequence: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        leadType: z.string().optional(), // 'dscr' | 'fix_flip' | 'old_lead' | 'all'
        triggerEvent: z.string().default("lead_created"),
        isActive: z.boolean().default(true),
        stopOnAppointment: z.boolean().default(true),
        stopOnReply: z.boolean().default(true),
        clientId: z.number().optional(),
        steps: z.array(
          z.object({
            stepOrder: z.number(),
            channel: z.enum(["email", "sms"]),
            delayHours: z.number().min(0),
            subject: z.string().optional(),
            body: z.string().min(1),
          })
        ).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const agencyId = await getAgencyId(ctx.user.id, db);

      const result = await db.insert(campaignSequences).values({
        agencyId,
        clientId: input.clientId ?? null,
        name: input.name,
        description: input.description ?? null,
        leadType: input.leadType ?? null,
        triggerEvent: input.triggerEvent,
        isActive: input.isActive,
        stopOnAppointment: input.stopOnAppointment,
        stopOnReply: input.stopOnReply,
        createdBy: ctx.user.id,
      });

      const sequenceId = Number((result as any).insertId);

      // Insert steps
      for (const step of input.steps) {
        await db.insert(campaignSequenceSteps).values({
          sequenceId,
          stepOrder: step.stepOrder,
          channel: step.channel,
          delayHours: step.delayHours,
          subject: step.subject ?? null,
          body: step.body,
          isActive: true,
        });
      }

      return { success: true, sequenceId };
    }),

  updateSequence: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        leadType: z.string().optional(),
        triggerEvent: z.string().optional(),
        isActive: z.boolean().optional(),
        stopOnAppointment: z.boolean().optional(),
        stopOnReply: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const agencyId = await getAgencyId(ctx.user.id, db);
      const { id, ...updates } = input;

      await db
        .update(campaignSequences)
        .set(updates)
        .where(and(eq(campaignSequences.id, id), eq(campaignSequences.agencyId, agencyId)));

      return { success: true };
    }),

  deleteSequence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const agencyId = await getAgencyId(ctx.user.id, db);

      // Deactivate instead of hard delete to preserve logs
      await db
        .update(campaignSequences)
        .set({ isActive: false })
        .where(and(eq(campaignSequences.id, input.id), eq(campaignSequences.agencyId, agencyId)));

      return { success: true };
    }),

  // ── Step CRUD ──────────────────────────────────────────────────────────────

  addStep: protectedProcedure
    .input(
      z.object({
        sequenceId: z.number(),
        stepOrder: z.number(),
        channel: z.enum(["email", "sms"]),
        delayHours: z.number().min(0),
        subject: z.string().optional(),
        body: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const result = await db.insert(campaignSequenceSteps).values({
        sequenceId: input.sequenceId,
        stepOrder: input.stepOrder,
        channel: input.channel,
        delayHours: input.delayHours,
        subject: input.subject ?? null,
        body: input.body,
        isActive: true,
      });

      return { success: true, stepId: Number((result as any).insertId) };
    }),

  updateStep: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        channel: z.enum(["email", "sms"]).optional(),
        delayHours: z.number().min(0).optional(),
        subject: z.string().optional(),
        body: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const { id, ...updates } = input;
      await db.update(campaignSequenceSteps).set(updates).where(eq(campaignSequenceSteps.id, id));

      return { success: true };
    }),

  deleteStep: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.delete(campaignSequenceSteps).where(eq(campaignSequenceSteps.id, input.id));
      return { success: true };
    }),

  // ── Enrollment Management ──────────────────────────────────────────────────

  enrollLead: protectedProcedure
    .input(
      z.object({
        sequenceId: z.number(),
        leadId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const agencyId = await getAgencyId(ctx.user.id, db);

      // Check if already enrolled and active
      const [existing] = await db
        .select()
        .from(campaignEnrollments)
        .where(
          and(
            eq(campaignEnrollments.sequenceId, input.sequenceId),
            eq(campaignEnrollments.leadId, input.leadId),
            eq(campaignEnrollments.status, "active")
          )
        )
        .limit(1);

      if (existing) {
        return { success: true, enrollmentId: existing.id, alreadyEnrolled: true };
      }

      // Get first step to schedule
      const [firstStep] = await db
        .select()
        .from(campaignSequenceSteps)
        .where(
          and(
            eq(campaignSequenceSteps.sequenceId, input.sequenceId),
            eq(campaignSequenceSteps.isActive, true)
          )
        )
        .orderBy(asc(campaignSequenceSteps.stepOrder))
        .limit(1);

      const nextStepAt = firstStep
        ? new Date(Date.now() + firstStep.delayHours * 60 * 60 * 1000)
        : null;

      const result = await db.insert(campaignEnrollments).values({
        sequenceId: input.sequenceId,
        leadId: input.leadId,
        agencyId,
        status: "active",
        currentStep: 0,
        nextStepAt,
      });

      return { success: true, enrollmentId: Number((result as any).insertId) };
    }),

  unenrollLead: protectedProcedure
    .input(
      z.object({
        enrollmentId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(campaignEnrollments)
        .set({
          status: "stopped",
          completedAt: new Date(),
          stoppedReason: input.reason ?? "manual",
        })
        .where(eq(campaignEnrollments.id, input.enrollmentId));

      return { success: true };
    }),

  getLeadEnrollments: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const enrollments = await db
        .select()
        .from(campaignEnrollments)
        .where(eq(campaignEnrollments.leadId, input.leadId))
        .orderBy(desc(campaignEnrollments.enrolledAt));

      const withNames = await Promise.all(
        enrollments.map(async (enr) => {
          const [seq] = await db
            .select({ name: campaignSequences.name })
            .from(campaignSequences)
            .where(eq(campaignSequences.id, enr.sequenceId))
            .limit(1);
          return { ...enr, sequenceName: seq?.name ?? "Unknown" };
        })
      );

      return withNames;
    }),

  getEnrollmentStats: protectedProcedure
    .input(z.object({ sequenceId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const all = await db
        .select()
        .from(campaignEnrollments)
        .where(eq(campaignEnrollments.sequenceId, input.sequenceId));

      const stats = {
        total: all.length,
        active: all.filter((e) => e.status === "active").length,
        completed: all.filter((e) => e.status === "completed").length,
        stopped: all.filter((e) => e.status === "stopped" || e.status === "unsubscribed").length,
      };

      return stats;
    }),

  // ── Bulk Enrollment ────────────────────────────────────────────────────────

  bulkEnrollLeads: protectedProcedure
    .input(
      z.object({
        sequenceId: z.number(),
        leadIds: z.array(z.number()).min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const agencyId = await getAgencyId(ctx.user.id, db);

      const [firstStep] = await db
        .select()
        .from(campaignSequenceSteps)
        .where(
          and(
            eq(campaignSequenceSteps.sequenceId, input.sequenceId),
            eq(campaignSequenceSteps.isActive, true)
          )
        )
        .orderBy(asc(campaignSequenceSteps.stepOrder))
        .limit(1);

      let enrolled = 0;
      let skipped = 0;

      for (const leadId of input.leadIds) {
        // Skip if already active
        const [existing] = await db
          .select({ id: campaignEnrollments.id })
          .from(campaignEnrollments)
          .where(
            and(
              eq(campaignEnrollments.sequenceId, input.sequenceId),
              eq(campaignEnrollments.leadId, leadId),
              eq(campaignEnrollments.status, "active")
            )
          )
          .limit(1);

        if (existing) { skipped++; continue; }

        const nextStepAt = firstStep
          ? new Date(Date.now() + firstStep.delayHours * 60 * 60 * 1000)
          : null;

        await db.insert(campaignEnrollments).values({
          sequenceId: input.sequenceId,
          leadId,
          agencyId,
          status: "active",
          currentStep: 0,
          nextStepAt,
        });
        enrolled++;
      }

      return { success: true, enrolled, skipped };
    }),

  // ── Step Log History ───────────────────────────────────────────────────────

  getStepLogs: protectedProcedure
    .input(z.object({ leadId: z.number().optional(), sequenceId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      if (input.leadId) {
        return db
          .select()
          .from(campaignStepLogs)
          .where(eq(campaignStepLogs.leadId, input.leadId))
          .orderBy(desc(campaignStepLogs.sentAt))
          .limit(50);
      }

      return [];
    }),
});

// ─── Exported Engine Function (called by cron) ───────────────────────────────

/**
 * Process all enrollments where nextStepAt <= now.
 * Called every 5 minutes by the cron scheduler.
 */
export async function processSequenceQueue(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const now = new Date();

  // Find all active enrollments that are due
  const dueEnrollments = await db
    .select()
    .from(campaignEnrollments)
    .where(
      and(
        eq(campaignEnrollments.status, "active"),
        lte(campaignEnrollments.nextStepAt, now)
      )
    )
    .limit(100); // Process in batches

  console.log(`[DripSequences] Processing ${dueEnrollments.length} due enrollments`);

  for (const enrollment of dueEnrollments) {
    try {
      await processEnrollmentStep(enrollment, db);
    } catch (err) {
      console.error(`[DripSequences] Error processing enrollment ${enrollment.id}:`, err);
    }
  }
}

async function processEnrollmentStep(enrollment: any, db: any): Promise<void> {
  // Get the sequence
  const [sequence] = await db
    .select()
    .from(campaignSequences)
    .where(eq(campaignSequences.id, enrollment.sequenceId))
    .limit(1);

  if (!sequence || !sequence.isActive) {
    await db
      .update(campaignEnrollments)
      .set({ status: "stopped", stoppedReason: "sequence_inactive", completedAt: new Date() })
      .where(eq(campaignEnrollments.id, enrollment.id));
    return;
  }

  // Get all active steps ordered
  const steps = await db
    .select()
    .from(campaignSequenceSteps)
    .where(
      and(
        eq(campaignSequenceSteps.sequenceId, enrollment.sequenceId),
        eq(campaignSequenceSteps.isActive, true)
      )
    )
    .orderBy(asc(campaignSequenceSteps.stepOrder));

  if (steps.length === 0) {
    await db
      .update(campaignEnrollments)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(campaignEnrollments.id, enrollment.id));
    return;
  }

  // currentStep is the index of the step to send next
  const stepIndex = enrollment.currentStep;
  if (stepIndex >= steps.length) {
    // All steps done
    await db
      .update(campaignEnrollments)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(campaignEnrollments.id, enrollment.id));
    return;
  }

  const step = steps[stepIndex];

  // Get lead
  const [lead] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, enrollment.leadId))
    .limit(1);

  if (!lead) {
    await db
      .update(campaignEnrollments)
      .set({ status: "stopped", stoppedReason: "lead_not_found", completedAt: new Date() })
      .where(eq(campaignEnrollments.id, enrollment.id));
    return;
  }

  // Check stop conditions
  if (sequence.stopOnAppointment) {
    const hasAppointment = lead.status === "appointment_booked" || lead.appointmentBooked;
    if (hasAppointment) {
      await db
        .update(campaignEnrollments)
        .set({ status: "stopped", stoppedReason: "appointment_booked", completedAt: new Date() })
        .where(eq(campaignEnrollments.id, enrollment.id));
      console.log(`[DripSequences] Stopped enrollment ${enrollment.id} — appointment booked`);
      return;
    }
  }

  // Resolve sender identity: client senderEmail → agency FROM_EMAIL env fallback
  let resolvedFromEmail = process.env.FROM_EMAIL || "noreply@crmplatform.com";
  let resolvedFromName: string | undefined;
  if (lead.clientId) {
    const [clientRow] = await db
      .select({
        senderEmail: clients.senderEmail,
        senderName: clients.senderName,
        name: clients.name,
      })
      .from(clients)
      .where(eq(clients.id, lead.clientId))
      .limit(1);
    if (clientRow?.senderEmail) {
      resolvedFromEmail = clientRow.senderEmail;
      resolvedFromName = clientRow.senderName ?? clientRow.name ?? undefined;
    }
  }

  // Send the message
  let sendStatus = "sent";
  let externalId: string | null = null;
  let errorMessage: string | null = null;

  const body = applyMergeTags(step.body, lead);
  const subject = step.subject ? applyMergeTags(step.subject, lead) : undefined;

  try {
    if (step.channel === "email" && lead.email) {
      const fromField = resolvedFromName
        ? `${resolvedFromName} <${resolvedFromEmail}>`
        : resolvedFromEmail;
      const result = await sendEmail({
        to: [lead.email],
        from: fromField,
        subject: subject || "Following up",
        html: body.includes("<") ? body : `<p>${body.replace(/\n/g, "<br>")}</p>`,
        text: body,
      });
      externalId = result?.messageId ?? null;
      console.log(`[DripSequences] Email sent to ${lead.email} from ${fromField} (step ${stepIndex + 1})`);
    } else if (step.channel === "sms" && lead.phone) {
      const result = await sendSMS({ to: lead.phone, body });
      externalId = result?.messageId ?? null;
      console.log(`[DripSequences] SMS sent to ${lead.phone} (step ${stepIndex + 1})`);
    } else {
      sendStatus = "skipped";
      errorMessage = `No ${step.channel} contact info available`;
    }
  } catch (err: any) {
    sendStatus = "failed";
    errorMessage = err.message ?? "Unknown error";
    console.error(`[DripSequences] Failed to send step ${step.id}:`, err);
  }

  // Log the step
  await db.insert(campaignStepLogs).values({
    enrollmentId: enrollment.id,
    stepId: step.id,
    leadId: enrollment.leadId,
    channel: step.channel,
    status: sendStatus,
    externalId,
    errorMessage,
  });

  // Advance to next step
  const nextStepIndex = stepIndex + 1;
  if (nextStepIndex >= steps.length) {
    // Sequence complete
    await db
      .update(campaignEnrollments)
      .set({ status: "completed", completedAt: new Date(), currentStep: nextStepIndex })
      .where(eq(campaignEnrollments.id, enrollment.id));
  } else {
    const nextStep = steps[nextStepIndex];
    const nextStepAt = new Date(Date.now() + nextStep.delayHours * 60 * 60 * 1000);
    await db
      .update(campaignEnrollments)
      .set({ currentStep: nextStepIndex, nextStepAt })
      .where(eq(campaignEnrollments.id, enrollment.id));
  }
}

/**
 * Auto-enroll a new lead in all active sequences matching its lead type.
 * Called from the lead creation flow.
 */
export async function autoEnrollLead(leadId: number, agencyId: number, leadType?: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Find active sequences that match this lead type and trigger on lead_created
  const sequences = await db
    .select()
    .from(campaignSequences)
    .where(
      and(
        eq(campaignSequences.agencyId, agencyId),
        eq(campaignSequences.isActive, true),
        eq(campaignSequences.triggerEvent, "lead_created")
      )
    );

  const matchingSequences = sequences.filter((seq) => {
    if (!seq.leadType || seq.leadType === "all") return true;
    if (!leadType) return false;
    return seq.leadType.toLowerCase() === leadType.toLowerCase();
  });

  for (const seq of matchingSequences) {
    try {
      const [firstStep] = await db
        .select()
        .from(campaignSequenceSteps)
        .where(
          and(
            eq(campaignSequenceSteps.sequenceId, seq.id),
            eq(campaignSequenceSteps.isActive, true)
          )
        )
        .orderBy(asc(campaignSequenceSteps.stepOrder))
        .limit(1);

      const nextStepAt = firstStep
        ? new Date(Date.now() + firstStep.delayHours * 60 * 60 * 1000)
        : null;

      await db.insert(campaignEnrollments).values({
        sequenceId: seq.id,
        leadId,
        agencyId,
        status: "active",
        currentStep: 0,
        nextStepAt,
      });

      console.log(`[DripSequences] Auto-enrolled lead ${leadId} in sequence "${seq.name}"`);
    } catch (err) {
      console.error(`[DripSequences] Failed to auto-enroll lead ${leadId} in seq ${seq.id}:`, err);
    }
  }
}

// ─── Helper ──────────────────────────────────────────────────────────────────

async function getAgencyId(userId: number, db: any): Promise<number> {
  // Try to find agency where this user is the owner
  const [agency] = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.ownerId, userId))
    .limit(1);

  if (agency) return agency.id;

  // Fallback: get first agency
  const [fallback] = await db
    .select({ id: agencies.id })
    .from(agencies)
    .limit(1);

  if (fallback) return fallback.id;

  throw new TRPCError({ code: "NOT_FOUND", message: "No agency found for user" });
}
