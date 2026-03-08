import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  automationWorkflows,
  automationWorkflowSteps,
  automationExecutions,
  automationStepLogs,
  clients,
  agencies,
  leads,
} from "../../drizzle/schema";
import { eq, and, desc, sql, count, inArray } from "drizzle-orm";
import { sendEmail } from "../sendgrid";
import { sendSMS } from "../twilio";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const workflowStepSchema = z.object({
  nodeId: z.string().optional(),
  stepOrder: z.number(),
  stepType: z.enum([
    "email", "sms", "wait", "condition",
    "vapi_call", "tag_lead", "update_status", "assign_user",
    "webhook", "internal_note", "split_test",
  ]),
  label: z.string().optional(),
  delayMinutes: z.number().default(0),
  delayUnit: z.enum(["minutes", "hours", "days"]).default("minutes"),
  subject: z.string().optional(),
  content: z.string().optional(),
  templateId: z.number().optional(),
  actionConfig: z.string().optional(), // JSON string
  conditionField: z.string().optional(),
  conditionOperator: z.string().optional(),
  conditionValue: z.string().optional(),
  nextStepIfTrue: z.number().optional(),
  nextStepIfFalse: z.number().optional(),
});

const triggerEnum = z.enum([
  "webinar_registration", "appointment_booking", "lead_created",
  "lead_status_change", "lead_tag_added", "lead_score_changed",
  "appointment_missed", "datacrawl_import", "manual", "time_based",
  "form_submitted", "sms_reply_received", "email_opened", "email_clicked",
]);

// ─── Helper: resolve client for current user ─────────────────────────────────

async function resolveClientForWorkflows(ctx: any) {
  const db = await getDb();
  if (!db) return null;

  const impersonatedClientId = ctx.req?.headers?.["x-impersonate-client-id"];
  if (impersonatedClientId) {
    const [client] = await db.select().from(clients).where(eq(clients.id, parseInt(impersonatedClientId))).limit(1);
    return client || null;
  }

  const [client] = await db.select().from(clients).where(eq(clients.userId, ctx.user.id)).limit(1);
  return client || null;
}

// ─── Pre-built workflow templates ────────────────────────────────────────────

const WORKFLOW_TEMPLATES = [
  {
    name: "New Lead Welcome Sequence",
    description: "Automatically welcome new leads with an immediate SMS, then follow up by email at Day 1, Day 3, and Day 7.",
    trigger: "lead_created" as const,
    category: "lead_nurture",
    steps: [
      { stepOrder: 1, stepType: "sms" as const, label: "Instant Welcome SMS", delayMinutes: 2, delayUnit: "minutes" as const, content: "Hi {{firstName}}! This is {{agentName}} from {{company}}. I saw you were interested in a mortgage — I'd love to help! When's a good time to chat? Reply STOP to opt out." },
      { stepOrder: 2, stepType: "wait" as const, label: "Wait 1 Day", delayMinutes: 1440, delayUnit: "minutes" as const },
      { stepOrder: 3, stepType: "email" as const, label: "Day 1 Follow-Up Email", delayMinutes: 0, delayUnit: "minutes" as const, subject: "Your Mortgage Journey Starts Here, {{firstName}}", content: "<p>Hi {{firstName}},</p><p>I wanted to follow up on your mortgage inquiry. I work with buyers and homeowners across {{state}} to find the best rates and programs for their situation.</p><p>Would you be open to a quick 15-minute call to discuss your goals?</p><p>Best,<br>{{agentName}}<br>{{phone}}</p>" },
      { stepOrder: 4, stepType: "wait" as const, label: "Wait 2 More Days", delayMinutes: 2880, delayUnit: "minutes" as const },
      { stepOrder: 5, stepType: "sms" as const, label: "Day 3 Check-In SMS", delayMinutes: 0, delayUnit: "minutes" as const, content: "Hey {{firstName}}, just checking in! Have any mortgage questions? I'm here to help — no pressure. — {{agentName}}" },
      { stepOrder: 6, stepType: "wait" as const, label: "Wait 4 More Days", delayMinutes: 5760, delayUnit: "minutes" as const },
      { stepOrder: 7, stepType: "email" as const, label: "Day 7 Value Email", delayMinutes: 0, delayUnit: "minutes" as const, subject: "Are You Getting the Best Mortgage Rate, {{firstName}}?", content: "<p>Hi {{firstName}},</p><p>Many homeowners don't realize they could save hundreds per month by refinancing or choosing the right loan program. I'd love to run a free analysis for you.</p><p>Click below to schedule a quick call:</p><p><a href='{{bookingLink}}'>Schedule My Free Consultation</a></p><p>Talk soon,<br>{{agentName}}</p>" },
    ],
  },
  {
    name: "Refi Prospect Drip",
    description: "7-day drip campaign for homeowners with rates over 6% who may benefit from refinancing.",
    trigger: "lead_tag_added" as const,
    category: "refi",
    steps: [
      { stepOrder: 1, stepType: "email" as const, label: "Refi Intro Email", delayMinutes: 30, delayUnit: "minutes" as const, subject: "Could You Save $400/Month, {{firstName}}?", content: "<p>Hi {{firstName}},</p><p>If your current mortgage rate is over 6%, you may be leaving money on the table every single month. I've helped homeowners in {{state}} reduce their payments significantly through refinancing.</p><p>Let me run a free savings analysis for you — no obligation, no pressure.</p><p><a href='{{bookingLink}}'>Get My Free Savings Analysis</a></p><p>Best,<br>{{agentName}}<br>{{phone}}</p>" },
      { stepOrder: 2, stepType: "wait" as const, label: "Wait 3 Days", delayMinutes: 4320, delayUnit: "minutes" as const },
      { stepOrder: 3, stepType: "sms" as const, label: "Day 3 Refi SMS", delayMinutes: 0, delayUnit: "minutes" as const, content: "Hi {{firstName}}, did you get my email about potentially lowering your mortgage payment? Rates have shifted — let's see if you qualify. — {{agentName}}" },
      { stepOrder: 4, stepType: "wait" as const, label: "Wait 4 More Days", delayMinutes: 5760, delayUnit: "minutes" as const },
      { stepOrder: 5, stepType: "email" as const, label: "Day 7 Urgency Email", delayMinutes: 0, delayUnit: "minutes" as const, subject: "Last Chance: Rates Are Moving, {{firstName}}", content: "<p>Hi {{firstName}},</p><p>I don't want you to miss this window. Mortgage rates are always moving, and the right time to act is now. I've helped clients in {{state}} save thousands over the life of their loan.</p><p>Let's connect this week — it only takes 15 minutes.</p><p><a href='{{bookingLink}}'>Book My 15-Minute Call</a></p><p>— {{agentName}}</p>" },
    ],
  },
  {
    name: "Appointment Reminder Sequence",
    description: "Send reminders 24 hours and 1 hour before a scheduled appointment to reduce no-shows.",
    trigger: "appointment_booking" as const,
    category: "appointment",
    steps: [
      { stepOrder: 1, stepType: "email" as const, label: "Booking Confirmation", delayMinutes: 5, delayUnit: "minutes" as const, subject: "Appointment Confirmed — {{appointmentDate}}", content: "<p>Hi {{firstName}},</p><p>Your appointment with {{agentName}} is confirmed for <strong>{{appointmentDate}}</strong>.</p><p>{{agentName}} will call you at <strong>{{phone}}</strong> at the scheduled time. Please make sure you're available.</p><p>To reschedule, reply to this email or call {{agentPhone}}.</p><p>Looking forward to speaking with you!</p><p>— {{agentName}}</p>" },
      { stepOrder: 2, stepType: "wait" as const, label: "Wait Until 24h Before", delayMinutes: 1440, delayUnit: "minutes" as const },
      { stepOrder: 3, stepType: "sms" as const, label: "24h Reminder SMS", delayMinutes: 0, delayUnit: "minutes" as const, content: "Reminder: Your mortgage consultation with {{agentName}} is tomorrow! They'll call you at your scheduled time. Questions? Call {{agentPhone}}." },
      { stepOrder: 4, stepType: "wait" as const, label: "Wait Until 1h Before", delayMinutes: 1380, delayUnit: "minutes" as const },
      { stepOrder: 5, stepType: "sms" as const, label: "1h Reminder SMS", delayMinutes: 0, delayUnit: "minutes" as const, content: "Your call with {{agentName}} is in 1 hour! They'll call you shortly. See you soon! 📞" },
    ],
  },
  {
    name: "Cold Lead Re-Engagement",
    description: "Re-engage leads that have gone silent for 14+ days with a fresh outreach sequence.",
    trigger: "manual" as const,
    category: "lead_nurture",
    steps: [
      { stepOrder: 1, stepType: "sms" as const, label: "Re-Engagement SMS", delayMinutes: 0, delayUnit: "minutes" as const, content: "Hi {{firstName}}, it's {{agentName}}! I know life gets busy — just wanted to check in. Are you still thinking about your mortgage goals? Happy to help whenever you're ready. 😊" },
      { stepOrder: 2, stepType: "wait" as const, label: "Wait 2 Days", delayMinutes: 2880, delayUnit: "minutes" as const },
      { stepOrder: 3, stepType: "email" as const, label: "Re-Engagement Email", delayMinutes: 0, delayUnit: "minutes" as const, subject: "Still Here for You, {{firstName}}", content: "<p>Hi {{firstName}},</p><p>I wanted to reach out one more time. Whether you're buying, refinancing, or just exploring options — I'm here to help with zero pressure.</p><p>Many of my clients in {{state}} were in the same position before we found the perfect solution for them.</p><p>Would a quick 10-minute call work this week?</p><p><a href='{{bookingLink}}'>Pick a Time That Works</a></p><p>— {{agentName}}</p>" },
    ],
  },
  {
    name: "Referral Partner Nurture",
    description: "Nurture real estate agents and other referral partners with value-driven content.",
    trigger: "lead_created" as const,
    category: "partner",
    steps: [
      { stepOrder: 1, stepType: "email" as const, label: "Partner Welcome Email", delayMinutes: 60, delayUnit: "minutes" as const, subject: "Let's Build Something Great Together, {{firstName}}", content: "<p>Hi {{firstName}},</p><p>Thank you for connecting! I work with real estate professionals across {{state}} to make sure their clients get fast pre-approvals and smooth closings.</p><p>Here's what I bring to the table:</p><ul><li>Pre-approval letters within 24 hours</li><li>Clear communication throughout the process</li><li>Competitive rates across 10+ loan programs</li></ul><p>Let's schedule a quick intro call to see how we can help each other's clients.</p><p><a href='{{bookingLink}}'>Schedule a Partner Call</a></p><p>— {{agentName}}</p>" },
      { stepOrder: 2, stepType: "wait" as const, label: "Wait 1 Week", delayMinutes: 10080, delayUnit: "minutes" as const },
      { stepOrder: 3, stepType: "sms" as const, label: "Week 1 Check-In", delayMinutes: 0, delayUnit: "minutes" as const, content: "Hi {{firstName}}, {{agentName}} here! Do you have any buyers who need pre-approval? I can usually turn those around in 24 hours. Let me know!" },
    ],
  },
  {
    name: "Post-Close Anniversary Follow-Up",
    description: "Reach out to past clients on their closing anniversary to generate referrals and refi opportunities.",
    trigger: "time_based" as const,
    category: "retention",
    steps: [
      { stepOrder: 1, stepType: "email" as const, label: "Anniversary Email", delayMinutes: 0, delayUnit: "minutes" as const, subject: "Happy Home Anniversary, {{firstName}}! 🏠", content: "<p>Hi {{firstName}},</p><p>Can you believe it's already been a year since you closed on your home? Congratulations!</p><p>I just wanted to check in and see how everything is going. If you know anyone who's thinking about buying or refinancing, I'd love to help them the same way I helped you.</p><p>Also, if your current rate is over 6%, it might be worth a quick conversation about refinancing options.</p><p>Thanks again for trusting me with such an important milestone.</p><p>— {{agentName}}</p>" },
    ],
  },
];

// ─── Router ──────────────────────────────────────────────────────────────────

export const workflowsRouter = router({
  // List all workflows for the current client
  list: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions = [eq(automationWorkflows.agencyId, client.agencyId)];
      if (input?.isActive !== undefined) conditions.push(eq(automationWorkflows.isActive, input.isActive));

      const workflows = await db
        .select()
        .from(automationWorkflows)
        .where(and(...conditions))
        .orderBy(desc(automationWorkflows.createdAt));

      // Get step counts for each workflow
      const workflowIds = workflows.map(w => w.id);
      let stepCounts: Record<number, number> = {};
      if (workflowIds.length > 0) {
        const counts = await db
          .select({
            workflowId: automationWorkflowSteps.workflowId,
            count: count(),
          })
          .from(automationWorkflowSteps)
          .where(inArray(automationWorkflowSteps.workflowId, workflowIds))
          .groupBy(automationWorkflowSteps.workflowId);
        stepCounts = Object.fromEntries(counts.map(c => [c.workflowId, c.count]));
      }

      return workflows.map(w => ({
        ...w,
        stepCount: stepCounts[w.id] || 0,
      }));
    }),

  // Get a single workflow with its steps
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [workflow] = await db
        .select()
        .from(automationWorkflows)
        .where(and(
          eq(automationWorkflows.id, input.id),
          eq(automationWorkflows.agencyId, client.agencyId),
        ))
        .limit(1);

      if (!workflow) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });

      const steps = await db
        .select()
        .from(automationWorkflowSteps)
        .where(eq(automationWorkflowSteps.workflowId, input.id))
        .orderBy(automationWorkflowSteps.stepOrder);

      return { ...workflow, steps };
    }),

  // Create a new workflow
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      trigger: triggerEnum,
      triggerConditions: z.string().optional(),
      category: z.string().optional(),
      steps: z.array(workflowStepSchema).optional(),
      canvasNodes: z.string().optional(),
      canvasEdges: z.string().optional(),
      canvasViewport: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(automationWorkflows).values({
        agencyId: client.agencyId,
        name: input.name,
        description: input.description,
        trigger: input.trigger,
        triggerConditions: input.triggerConditions,
        category: input.category,
        canvasNodes: input.canvasNodes,
        canvasEdges: input.canvasEdges,
        canvasViewport: input.canvasViewport,
        isActive: false, // Start inactive until user activates
        createdBy: ctx.user.id,
      });

      const workflowId = (result as any).insertId as number;

      // Insert steps if provided
      if (input.steps && input.steps.length > 0) {
        await db.insert(automationWorkflowSteps).values(
          input.steps.map(step => ({
            workflowId,
            nodeId: step.nodeId,
            stepOrder: step.stepOrder,
            stepType: step.stepType,
            label: step.label,
            delayMinutes: step.delayMinutes,
            delayUnit: step.delayUnit,
            subject: step.subject,
            content: step.content,
            templateId: step.templateId,
            actionConfig: step.actionConfig,
            conditionField: step.conditionField,
            conditionOperator: step.conditionOperator,
            conditionValue: step.conditionValue,
          }))
        );
      }

      return { id: workflowId, success: true };
    }),

  // Update a workflow (name, description, trigger, canvas state)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      trigger: triggerEnum.optional(),
      triggerConditions: z.string().optional(),
      category: z.string().optional(),
      isActive: z.boolean().optional(),
      canvasNodes: z.string().optional(),
      canvasEdges: z.string().optional(),
      canvasViewport: z.string().optional(),
      steps: z.array(workflowStepSchema).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.trigger !== undefined) updateData.trigger = input.trigger;
      if (input.triggerConditions !== undefined) updateData.triggerConditions = input.triggerConditions;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.canvasNodes !== undefined) updateData.canvasNodes = input.canvasNodes;
      if (input.canvasEdges !== undefined) updateData.canvasEdges = input.canvasEdges;
      if (input.canvasViewport !== undefined) updateData.canvasViewport = input.canvasViewport;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(automationWorkflows)
          .set(updateData)
          .where(and(
            eq(automationWorkflows.id, input.id),
            eq(automationWorkflows.agencyId, client.agencyId),
          ));
      }

      // If steps are provided, replace all steps
      if (input.steps !== undefined) {
        await db.delete(automationWorkflowSteps).where(eq(automationWorkflowSteps.workflowId, input.id));

        if (input.steps.length > 0) {
          await db.insert(automationWorkflowSteps).values(
            input.steps.map(step => ({
              workflowId: input.id,
              nodeId: step.nodeId,
              stepOrder: step.stepOrder,
              stepType: step.stepType,
              label: step.label,
              delayMinutes: step.delayMinutes,
              delayUnit: step.delayUnit,
              subject: step.subject,
              content: step.content,
              templateId: step.templateId,
              actionConfig: step.actionConfig,
              conditionField: step.conditionField,
              conditionOperator: step.conditionOperator,
              conditionValue: step.conditionValue,
            }))
          );
        }
      }

      return { success: true };
    }),

  // Toggle workflow active/inactive
  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(automationWorkflows)
        .set({ isActive: input.isActive })
        .where(and(
          eq(automationWorkflows.id, input.id),
          eq(automationWorkflows.agencyId, client.agencyId),
        ));

      return { success: true, isActive: input.isActive };
    }),

  // Delete a workflow
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Delete steps first, then executions, then workflow
      await db.delete(automationWorkflowSteps).where(eq(automationWorkflowSteps.workflowId, input.id));
      await db.delete(automationExecutions).where(eq(automationExecutions.workflowId, input.id));
      await db.delete(automationWorkflows).where(and(
        eq(automationWorkflows.id, input.id),
        eq(automationWorkflows.agencyId, client.agencyId),
      ));

      return { success: true };
    }),

  // Get pre-built templates
  getTemplates: protectedProcedure.query(async () => {
    return WORKFLOW_TEMPLATES.map((t, i) => ({
      id: `template_${i}`,
      ...t,
      stepCount: t.steps.length,
    }));
  }),

  // Install a template as a new workflow
  installTemplate: protectedProcedure
    .input(z.object({ templateIndex: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const template = WORKFLOW_TEMPLATES[input.templateIndex];
      if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const [result] = await db.insert(automationWorkflows).values({
        agencyId: client.agencyId,
        name: template.name,
        description: template.description,
        trigger: template.trigger,
        category: template.category,
        isActive: false,
        isTemplate: false,
        createdBy: ctx.user.id,
      });

      const workflowId = (result as any).insertId as number;

      await db.insert(automationWorkflowSteps).values(
        template.steps.map(step => ({
          workflowId,
          stepOrder: step.stepOrder,
          stepType: step.stepType,
          label: step.label,
          delayMinutes: step.delayMinutes,
          delayUnit: step.delayUnit,
          subject: (step as any).subject,
          content: (step as any).content,
        }))
      );

      return { id: workflowId, success: true };
    }),

  // Get execution stats for a workflow
  getStats: protectedProcedure
    .input(z.object({ workflowId: z.number() }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const executions = await db
        .select({
          status: automationExecutions.status,
          count: count(),
        })
        .from(automationExecutions)
        .where(eq(automationExecutions.workflowId, input.workflowId))
        .groupBy(automationExecutions.status);

      const stats = {
        active: 0,
        completed: 0,
        paused: 0,
        failed: 0,
        total: 0,
      };

      for (const row of executions) {
        stats[row.status as keyof typeof stats] = row.count;
        stats.total += row.count;
      }

      return stats;
    }),

  // Manually enroll a lead into a workflow
  enrollLead: protectedProcedure
    .input(z.object({
      workflowId: z.number(),
      leadId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get the lead
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      // Get the first step
      const [firstStep] = await db
        .select()
        .from(automationWorkflowSteps)
        .where(eq(automationWorkflowSteps.workflowId, input.workflowId))
        .orderBy(automationWorkflowSteps.stepOrder)
        .limit(1);

      const nextExecutionAt = firstStep
        ? new Date(Date.now() + (firstStep.delayMinutes || 0) * 60 * 1000)
        : new Date();

      await db.insert(automationExecutions).values({
        workflowId: input.workflowId,
        leadId: input.leadId,
        contactEmail: lead.email || "",
        contactPhone: lead.phone || undefined,
        contactName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
        status: "active",
        currentStepId: firstStep?.id,
        nextExecutionAt,
      });

      // Update enrolled count
      await db
        .update(automationWorkflows)
        .set({ enrolledCount: sql`enrolled_count + 1` })
        .where(eq(automationWorkflows.id, input.workflowId));

      return { success: true };
    }),

  // Get active executions for a workflow
  getExecutions: protectedProcedure
    .input(z.object({
      workflowId: z.number(),
      status: z.enum(["active", "completed", "paused", "failed"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const conditions = [eq(automationExecutions.workflowId, input.workflowId)];
      if (input.status) conditions.push(eq(automationExecutions.status, input.status));

      const executions = await db
        .select()
        .from(automationExecutions)
        .where(and(...conditions))
        .orderBy(desc(automationExecutions.createdAt))
        .limit(50);

      return executions;
    }),

  // Save canvas state (called frequently during drag-and-drop editing)
  saveCanvas: protectedProcedure
    .input(z.object({
      id: z.number(),
      canvasNodes: z.string(),
      canvasEdges: z.string(),
      canvasViewport: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForWorkflows(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(automationWorkflows)
        .set({
          canvasNodes: input.canvasNodes,
          canvasEdges: input.canvasEdges,
          canvasViewport: input.canvasViewport,
        })
        .where(and(
          eq(automationWorkflows.id, input.id),
          eq(automationWorkflows.agencyId, client.agencyId),
        ));

      return { success: true };
    }),

  // Get dashboard summary stats
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const client = await resolveClientForWorkflows(ctx);
    if (!client) throw new TRPCError({ code: "NOT_FOUND" });

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const [activeWorkflows] = await db
      .select({ count: count() })
      .from(automationWorkflows)
      .where(and(
        eq(automationWorkflows.agencyId, client.agencyId),
        eq(automationWorkflows.isActive, true),
      ));

    const [totalWorkflows] = await db
      .select({ count: count() })
      .from(automationWorkflows)
      .where(eq(automationWorkflows.agencyId, client.agencyId));

    const [activeExecutions] = await db
      .select({ count: count() })
      .from(automationExecutions)
      .leftJoin(automationWorkflows, eq(automationExecutions.workflowId, automationWorkflows.id))
      .where(and(
        eq(automationWorkflows.agencyId, client.agencyId),
        eq(automationExecutions.status, "active"),
      ));

    const [completedExecutions] = await db
      .select({ count: count() })
      .from(automationExecutions)
      .leftJoin(automationWorkflows, eq(automationExecutions.workflowId, automationWorkflows.id))
      .where(and(
        eq(automationWorkflows.agencyId, client.agencyId),
        eq(automationExecutions.status, "completed"),
      ));

    return {
      activeWorkflows: activeWorkflows?.count || 0,
      totalWorkflows: totalWorkflows?.count || 0,
      activeExecutions: activeExecutions?.count || 0,
      completedExecutions: completedExecutions?.count || 0,
    };
  }),
});
