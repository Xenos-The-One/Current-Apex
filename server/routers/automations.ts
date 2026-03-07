import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { automationExecutions, automationWorkflowSteps, automationWorkflows } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const automationsRouter = router({
  listWorkflows: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(automationWorkflows)
        .where(eq(automationWorkflows.agencyId, input.agencyId))
        .orderBy(desc(automationWorkflows.createdAt));
    }),

  getWorkflow: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [workflow] = await db.select().from(automationWorkflows)
        .where(and(eq(automationWorkflows.id, input.id), eq(automationWorkflows.agencyId, input.agencyId))).limit(1);
      if (!workflow) throw new TRPCError({ code: "NOT_FOUND" });
      const steps = await db.select().from(automationWorkflowSteps)
        .where(eq(automationWorkflowSteps.workflowId, input.id))
        .orderBy(automationWorkflowSteps.stepOrder);
      return { ...workflow, steps };
    }),

  createWorkflow: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1),
      description: z.string().optional(),
      trigger: z.enum(["new_lead", "lead_status_change", "email_opened", "email_clicked", "sms_replied", "appointment_booked", "appointment_cancelled", "form_submitted", "tag_added", "score_threshold", "manual"]),
      triggerConfig: z.any().optional(),
      steps: z.array(z.object({
        stepOrder: z.number(),
        type: z.enum(["send_email", "send_sms", "create_task", "update_lead_status", "add_tag", "remove_tag", "wait_delay", "condition", "place_call", "create_appointment", "notify_user", "webhook"]),
        config: z.any(),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { steps, agencyId, triggerConfig, ...workflowData } = input;
      const [result] = await db.insert(automationWorkflows).values({
        ...workflowData,
        agencyId,
        createdByUserId: ctx.user.id,
        triggerConfig: triggerConfig ? JSON.stringify(triggerConfig) : null,
      });
      const workflowId = (result as any).insertId;
      if (steps?.length) {
        for (const step of steps) {
          await db.insert(automationWorkflowSteps).values({ ...step, workflowId, config: JSON.stringify(step.config) });
        }
      }
      return { id: workflowId };
    }),

  updateWorkflow: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      steps: z.array(z.object({
        stepOrder: z.number(),
        type: z.enum(["send_email", "send_sms", "create_task", "update_lead_status", "add_tag", "remove_tag", "wait_delay", "condition", "place_call", "create_appointment", "notify_user", "webhook"]),
        config: z.any(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, steps, ...rest } = input;
      await db.update(automationWorkflows).set(rest).where(and(eq(automationWorkflows.id, id), eq(automationWorkflows.agencyId, agencyId)));
      if (steps) {
        await db.delete(automationWorkflowSteps).where(eq(automationWorkflowSteps.workflowId, id));
        for (const step of steps) {
          await db.insert(automationWorkflowSteps).values({ ...step, workflowId: id, config: JSON.stringify(step.config) });
        }
      }
      return { success: true };
    }),

  deleteWorkflow: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(automationWorkflowSteps).where(eq(automationWorkflowSteps.workflowId, input.id));
      await db.delete(automationWorkflows).where(and(eq(automationWorkflows.id, input.id), eq(automationWorkflows.agencyId, input.agencyId)));
      return { success: true };
    }),

  getExecutionLogs: protectedProcedure
    .input(z.object({ workflowId: z.number(), agencyId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(automationExecutions)
        .where(and(eq(automationExecutions.workflowId, input.workflowId), eq(automationExecutions.agencyId, input.agencyId)))
        .orderBy(desc(automationExecutions.startedAt))
        .limit(input.limit);
    }),
});
