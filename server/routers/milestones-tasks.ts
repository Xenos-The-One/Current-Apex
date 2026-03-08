import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getClientByUserId, getClientById } from "../db";
import { loanMilestones, leadTasks, leads } from "../../drizzle/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";

const ADMIN_ROLES = ["admin", "super_admin", "agency_owner"];

async function resolveClient(ctx: { user: { id: number; role: string }; req: any }) {
  const isAdmin = ADMIN_ROLES.includes(ctx.user.role);
  if (isAdmin) {
    const impersonateId = ctx.req.headers["x-impersonate-client-id"];
    if (impersonateId) {
      const clientId = parseInt(impersonateId, 10);
      if (!isNaN(clientId)) {
        const client = await getClientById(clientId);
        if (client) return client;
      }
    }
  }
  return await getClientByUserId(ctx.user.id);
}

// ─── Default loan milestones for a new borrower ───────────────────────────────
const DEFAULT_MILESTONES = [
  { key: "pre_approval", label: "Pre-Approval", order: 1 },
  { key: "application_submitted", label: "Application Submitted", order: 2 },
  { key: "processing", label: "Processing", order: 3 },
  { key: "appraisal_ordered", label: "Appraisal Ordered", order: 4 },
  { key: "underwriting", label: "Underwriting", order: 5 },
  { key: "conditional_approval", label: "Conditional Approval", order: 6 },
  { key: "clear_to_close", label: "Clear to Close", order: 7 },
  { key: "closing_scheduled", label: "Closing Scheduled", order: 8 },
  { key: "funded", label: "Funded", order: 9 },
];

export const milestonesTasksRouter = router({
  // ─── LOAN MILESTONES ──────────────────────────────────────────────────────

  // Get milestones for a lead (auto-creates defaults if none exist)
  getMilestones: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify lead belongs to client
      const [lead] = await db.select().from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.clientId, client.id)))
        .limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      let milestones = await db.select().from(loanMilestones)
        .where(and(eq(loanMilestones.leadId, input.leadId), eq(loanMilestones.clientId, client.id)))
        .orderBy(asc(loanMilestones.sortOrder));

      // Auto-create defaults if none exist
      if (milestones.length === 0) {
        const inserts = DEFAULT_MILESTONES.map((m) => ({
          leadId: input.leadId,
          clientId: client.id,
          milestoneKey: m.key,
          milestoneLabel: m.label,
          status: "pending" as const,
          sortOrder: m.order,
          notifyBorrower: false,
          notifyAgent: false,
        }));
        await db.insert(loanMilestones).values(inserts);
        milestones = await db.select().from(loanMilestones)
          .where(and(eq(loanMilestones.leadId, input.leadId), eq(loanMilestones.clientId, client.id)))
          .orderBy(asc(loanMilestones.sortOrder));
      }

      return milestones;
    }),

  // Update a milestone status
  updateMilestone: protectedProcedure
    .input(
      z.object({
        milestoneId: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "blocked"]),
        notes: z.string().optional(),
        notifyBorrower: z.boolean().optional(),
        notifyAgent: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [milestone] = await db.select().from(loanMilestones)
        .where(and(eq(loanMilestones.id, input.milestoneId), eq(loanMilestones.clientId, client.id)))
        .limit(1);
      if (!milestone) throw new TRPCError({ code: "NOT_FOUND", message: "Milestone not found" });

      const updateData: any = {
        status: input.status,
        notes: input.notes !== undefined ? input.notes : milestone.notes,
        notifyBorrower: input.notifyBorrower !== undefined ? input.notifyBorrower : milestone.notifyBorrower,
        notifyAgent: input.notifyAgent !== undefined ? input.notifyAgent : milestone.notifyAgent,
      };

      if (input.status === "completed" && milestone.status !== "completed") {
        updateData.completedAt = new Date();
      } else if (input.status !== "completed") {
        updateData.completedAt = null;
      }

      await db.update(loanMilestones)
        .set(updateData)
        .where(eq(loanMilestones.id, input.milestoneId));

      return { success: true };
    }),

  // Reset milestones for a lead (start fresh)
  resetMilestones: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.delete(loanMilestones)
        .where(and(eq(loanMilestones.leadId, input.leadId), eq(loanMilestones.clientId, client.id)));

      const inserts = DEFAULT_MILESTONES.map((m) => ({
        leadId: input.leadId,
        clientId: client.id,
        milestoneKey: m.key,
        milestoneLabel: m.label,
        status: "pending" as const,
        sortOrder: m.order,
        notifyBorrower: false,
        notifyAgent: false,
      }));
      await db.insert(loanMilestones).values(inserts);

      return { success: true };
    }),

  // ─── LEAD TASKS ───────────────────────────────────────────────────────────

  // Get tasks for a lead
  getTasks: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const tasks = await db.select().from(leadTasks)
        .where(and(eq(leadTasks.leadId, input.leadId), eq(leadTasks.clientId, client.id)))
        .orderBy(asc(leadTasks.dueDate), desc(leadTasks.createdAt));

      return tasks;
    }),

  // Get all pending tasks for the client (for a task dashboard)
  getAllPendingTasks: protectedProcedure.query(async ({ ctx }) => {
    const client = await resolveClient(ctx);
    if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

    const tasks = await db.select({
      id: leadTasks.id,
      leadId: leadTasks.leadId,
      clientId: leadTasks.clientId,
      title: leadTasks.title,
      description: leadTasks.description,
      dueDate: leadTasks.dueDate,
      priority: leadTasks.priority,
      status: leadTasks.status,
      assignedToUserId: leadTasks.assignedToUserId,
      completedAt: leadTasks.completedAt,
      createdAt: leadTasks.createdAt,
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
    })
      .from(leadTasks)
      .innerJoin(leads, eq(leadTasks.leadId, leads.id))
      .where(
        and(
          eq(leadTasks.clientId, client.id),
          sql`${leadTasks.status} != 'completed' AND ${leadTasks.status} != 'cancelled'`
        )
      )
      .orderBy(asc(leadTasks.dueDate), desc(leadTasks.priority));

    return tasks;
  }),

  // Create a task
  createTask: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        dueDate: z.string().optional(), // ISO date string
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        assignedToUserId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify lead belongs to client
      const [lead] = await db.select().from(leads)
        .where(and(eq(leads.id, input.leadId), eq(leads.clientId, client.id)))
        .limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      const [result] = await db.insert(leadTasks).values({
        leadId: input.leadId,
        clientId: client.id,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        priority: input.priority,
        status: "pending",
        assignedToUserId: input.assignedToUserId || null,
        createdByUserId: ctx.user.id,
      });

      return { success: true, taskId: (result as any).insertId };
    }),

  // Update a task
  updateTask: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        dueDate: z.string().nullable().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        assignedToUserId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [task] = await db.select().from(leadTasks)
        .where(and(eq(leadTasks.id, input.taskId), eq(leadTasks.clientId, client.id)))
        .limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });

      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate ? new Date(input.dueDate) : null;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.status !== undefined) {
        updateData.status = input.status;
        if (input.status === "completed" && task.status !== "completed") {
          updateData.completedAt = new Date();
        } else if (input.status !== "completed") {
          updateData.completedAt = null;
        }
      }
      if (input.assignedToUserId !== undefined) updateData.assignedToUserId = input.assignedToUserId;

      await db.update(leadTasks).set(updateData).where(eq(leadTasks.id, input.taskId));

      return { success: true };
    }),

  // Delete a task
  deleteTask: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db.delete(leadTasks)
        .where(and(eq(leadTasks.id, input.taskId), eq(leadTasks.clientId, client.id)));

      return { success: true };
    }),
});
