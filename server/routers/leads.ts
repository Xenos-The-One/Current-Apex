import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gte, like, lte, or } from "drizzle-orm";
import { z } from "zod";
import { leadActivities, leadTasks, leads } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const leadInputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  company: z.string().optional(),
  contactType: z.enum(["borrower", "re_agent", "attorney", "insurance", "title_co", "builder", "lender", "other"]).default("borrower"),
  status: z.enum(["new", "contacted", "qualified", "appointment_set", "converted", "lost", "nurturing"]).default("new"),
  pipelineStage: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]).default("new"),
  source: z.enum(["social_media", "referral", "webinar", "import", "manual", "facebook_ads", "website", "cold_call", "other"]).default("manual"),
  loanAmount: z.string().optional(),
  propertyAddress: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignedUserId: z.number().optional(),
  nextFollowUpAt: z.date().optional(),
});

export const leadsRouter = router({
  list: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      search: z.string().optional(),
      contactType: z.string().optional(),
      status: z.string().optional(),
      pipelineStage: z.string().optional(),
      source: z.string().optional(),
      assignedUserId: z.number().optional(),
      minScore: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
      sortBy: z.enum(["createdAt", "score", "lastName", "nextFollowUpAt"]).default("createdAt"),
      sortDir: z.enum(["asc", "desc"]).default("desc"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(leads.agencyId, input.agencyId)];
      if (input.search) {
        conditions.push(or(
          like(leads.firstName, `%${input.search}%`),
          like(leads.lastName, `%${input.search}%`),
          like(leads.email, `%${input.search}%`),
          like(leads.phone, `%${input.search}%`)
        ) as any);
      }
      if (input.contactType) conditions.push(eq(leads.contactType, input.contactType as any));
      if (input.status) conditions.push(eq(leads.status, input.status as any));
      if (input.pipelineStage) conditions.push(eq(leads.pipelineStage, input.pipelineStage as any));
      if (input.source) conditions.push(eq(leads.source, input.source as any));
      if (input.assignedUserId) conditions.push(eq(leads.assignedUserId, input.assignedUserId));
      if (input.minScore !== undefined) conditions.push(gte(leads.score, input.minScore));

      const orderFn = input.sortDir === "asc" ? asc : desc;
      const orderCol = input.sortBy === "score" ? leads.score : input.sortBy === "lastName" ? leads.lastName : input.sortBy === "nextFollowUpAt" ? leads.nextFollowUpAt : leads.createdAt;

      const rows = await db.select().from(leads)
        .where(and(...conditions))
        .orderBy(orderFn(orderCol as any))
        .limit(input.limit).offset(input.offset);

      const [total] = await db.select({ count: count() }).from(leads).where(and(...conditions));
      return { leads: rows, total: total?.count ?? 0 };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [lead] = await db.select().from(leads)
        .where(and(eq(leads.id, input.id), eq(leads.agencyId, input.agencyId))).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      const activities = await db.select().from(leadActivities)
        .where(eq(leadActivities.leadId, input.id))
        .orderBy(desc(leadActivities.createdAt)).limit(50);
      const tasks = await db.select().from(leadTasks)
        .where(eq(leadTasks.leadId, input.id))
        .orderBy(asc(leadTasks.dueAt));
      return { ...lead, activities, tasks };
    }),

  create: protectedProcedure
    .input(z.object({ agencyId: z.number() }).merge(leadInputSchema))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { agencyId, tags, ...rest } = input;
      const [result] = await db.insert(leads).values({
        ...rest,
        agencyId,
        tags: tags ? JSON.stringify(tags) : null,
        assignedUserId: rest.assignedUserId ?? ctx.user.id,
      });
      const insertId = (result as any).insertId;
      await db.insert(leadActivities).values({
        leadId: insertId, agencyId, userId: ctx.user.id,
        type: "note", subject: "Lead created", content: `Lead created by ${ctx.user.name}`,
      });
      return { id: insertId };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }).merge(leadInputSchema.partial()))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, tags, ...rest } = input;
      const updateData: any = { ...rest };
      if (tags !== undefined) updateData.tags = JSON.stringify(tags);
      await db.update(leads).set(updateData).where(and(eq(leads.id, id), eq(leads.agencyId, agencyId)));
      if (rest.status) {
        await db.insert(leadActivities).values({
          leadId: id, agencyId, userId: ctx.user.id,
          type: "status_change", subject: "Status updated", content: `Status changed to ${rest.status}`,
        });
      }
      return { success: true };
    }),

  updateStage: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number(), pipelineStage: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(leads).set({ pipelineStage: input.pipelineStage }).where(and(eq(leads.id, input.id), eq(leads.agencyId, input.agencyId)));
      await db.insert(leadActivities).values({
        leadId: input.id, agencyId: input.agencyId, userId: ctx.user.id,
        type: "status_change", subject: "Stage moved", content: `Moved to ${input.pipelineStage}`,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(leads).where(and(eq(leads.id, input.id), eq(leads.agencyId, input.agencyId)));
      return { success: true };
    }),

  bulkImport: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      rows: z.array(z.object({
        firstName: z.string(),
        lastName: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        source: z.string().optional(),
        contactType: z.string().optional(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let imported = 0;
      for (const row of input.rows) {
        try {
          await db.insert(leads).values({
            agencyId: input.agencyId,
            firstName: row.firstName || "Unknown",
            lastName: row.lastName,
            email: row.email,
            phone: row.phone,
            company: row.company,
            source: (row.source as any) || "import",
            contactType: (row.contactType as any) || "borrower",
            notes: row.notes,
            assignedUserId: ctx.user.id,
          });
          imported++;
        } catch (_) {}
      }
      return { imported, total: input.rows.length };
    }),

  addActivity: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      agencyId: z.number(),
      type: z.enum(["call", "email", "sms", "note", "task", "appointment", "status_change", "score_change", "import", "ai_call"]),
      subject: z.string().optional(),
      content: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(leadActivities).values({ ...input, userId: ctx.user.id });
      await db.update(leads).set({ lastContactedAt: new Date() }).where(eq(leads.id, input.leadId));
      return { id: (result as any).insertId };
    }),

  addTask: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      agencyId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      dueAt: z.date().optional(),
      assignedUserId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(leadTasks).values({ ...input, assignedUserId: input.assignedUserId ?? ctx.user.id });
      return { id: (result as any).insertId };
    }),

  updateTask: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["pending", "in_progress", "completed", "cancelled"]) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const completedAt = input.status === "completed" ? new Date() : null;
      await db.update(leadTasks).set({ status: input.status, completedAt: completedAt ?? undefined }).where(eq(leadTasks.id, input.id));
      return { success: true };
    }),

  listTasks: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(leadTasks)
        .where(eq(leadTasks.agencyId, input.agencyId))
        .orderBy(asc(leadTasks.dueAt));
    }),

  completeTask: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(leadTasks).set({ status: "completed", completedAt: new Date() }).where(eq(leadTasks.id, input.id));
      return { success: true };
    }),

  getKanban: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const allLeads = await db.select().from(leads)
        .where(eq(leads.agencyId, input.agencyId))
        .orderBy(desc(leads.score), desc(leads.createdAt));
      const stages = ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
      const kanban: Record<string, typeof allLeads> = {};
      for (const stage of stages) kanban[stage] = allLeads.filter(l => l.pipelineStage === stage);
      return kanban;
    }),
});
