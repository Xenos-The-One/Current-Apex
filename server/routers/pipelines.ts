/**
 * Pipelines Router
 *
 * Full CRUD for pipelines, stages, and opportunities.
 * Supports kanban board, list view, drag-and-drop stage moves,
 * bulk actions, and sample data seeding.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, inArray, desc, asc, like, gte, lte, or, sql } from "drizzle-orm";
import { pipelines, pipelineStages, opportunities, opportunityActivities } from "../../drizzle/schema-pipeline";
import { agencies } from "../../drizzle/schema";

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getAgencyId(userId: number, db: ReturnType<typeof getDb>): Promise<number> {
  const rows = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.userId, userId)).limit(1);
  if (rows.length > 0) return rows[0].id;
  // sub-account: look up via clients table
  const { clients } = await import("../../drizzle/schema");
  const clientRows = await db.select({ agencyId: clients.agencyId }).from(clients).where(eq(clients.userId, userId)).limit(1);
  if (clientRows.length > 0) return clientRows[0].agencyId;
  throw new TRPCError({ code: "NOT_FOUND", message: "No agency found for user" });
}

async function getClientId(userId: number, db: ReturnType<typeof getDb>): Promise<number | null> {
  const { clients } = await import("../../drizzle/schema");
  const rows = await db.select({ id: clients.id }).from(clients).where(eq(clients.userId, userId)).limit(1);
  return rows.length > 0 ? rows[0].id : null;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const pipelinesRouter = router({

  // ── Pipeline CRUD ──────────────────────────────────────────────────────────

  listPipelines: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const agencyId = await getAgencyId(ctx.user.id, db);
    const clientId = await getClientId(ctx.user.id, db);
    const pipelineList = await db.select().from(pipelines)
      .where(
        clientId
          ? and(eq(pipelines.agencyId, agencyId), or(eq(pipelines.clientId, clientId), sql`${pipelines.clientId} IS NULL`))
          : eq(pipelines.agencyId, agencyId)
      )
      .orderBy(desc(pipelines.isDefault), asc(pipelines.name));

    // Attach stages to each pipeline
    const allStages = await db.select().from(pipelineStages)
      .where(inArray(pipelineStages.pipelineId, pipelineList.map(p => p.id)))
      .orderBy(asc(pipelineStages.stageOrder));

    return pipelineList.map(p => ({
      ...p,
      stages: allStages.filter(s => s.pipelineId === p.id),
    }));
  }),

  createPipeline: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      isDefault: z.boolean().optional(),
      stages: z.array(z.object({
        name: z.string(),
        color: z.string().optional(),
        probability: z.number().min(0).max(100).optional(),
        slaHours: z.number().optional(),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);
      const clientId = await getClientId(ctx.user.id, db);

      if (input.isDefault) {
        await db.update(pipelines).set({ isDefault: false }).where(eq(pipelines.agencyId, agencyId));
      }

      const [result] = await db.insert(pipelines).values({
        agencyId,
        clientId: clientId ?? null,
        name: input.name,
        description: input.description ?? null,
        isDefault: input.isDefault ?? false,
        createdBy: ctx.user.id,
      });
      const pipelineId = result.insertId;

      const defaultStages = input.stages ?? [
        { name: "New Lead", color: "#6366f1", probability: 10 },
        { name: "Attempted Contact", color: "#8b5cf6", probability: 20 },
        { name: "Qualified", color: "#3b82f6", probability: 30 },
        { name: "Appointment Set", color: "#06b6d4", probability: 50 },
        { name: "Application Started", color: "#10b981", probability: 60 },
        { name: "Docs Received", color: "#f59e0b", probability: 70 },
        { name: "Underwriting", color: "#f97316", probability: 80 },
        { name: "Approved", color: "#84cc16", probability: 90 },
        { name: "Closed Won", color: "#22c55e", probability: 100 },
        { name: "Closed Lost", color: "#ef4444", probability: 0 },
      ];

      await db.insert(pipelineStages).values(
        defaultStages.map((s, i) => ({
          pipelineId,
          name: s.name,
          color: s.color ?? "#6366f1",
          stageOrder: i,
          probability: s.probability ?? 0,
          slaHours: s.slaHours ?? null,
        }))
      );

      return { id: pipelineId };
    }),

  updatePipeline: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);
      if (input.isDefault) {
        await db.update(pipelines).set({ isDefault: false }).where(eq(pipelines.agencyId, agencyId));
      }
      await db.update(pipelines).set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      }).where(and(eq(pipelines.id, input.id), eq(pipelines.agencyId, agencyId)));
      return { success: true };
    }),

  deletePipeline: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);
      // Delete all stages and opportunities first
      const stages = await db.select({ id: pipelineStages.id }).from(pipelineStages).where(eq(pipelineStages.pipelineId, input.id));
      if (stages.length > 0) {
        await db.delete(pipelineStages).where(eq(pipelineStages.pipelineId, input.id));
      }
      const opps = await db.select({ id: opportunities.id }).from(opportunities).where(eq(opportunities.pipelineId, input.id));
      if (opps.length > 0) {
        await db.delete(opportunities).where(eq(opportunities.pipelineId, input.id));
      }
      await db.delete(pipelines).where(and(eq(pipelines.id, input.id), eq(pipelines.agencyId, agencyId)));
      return { success: true };
    }),

  // ── Stage CRUD ─────────────────────────────────────────────────────────────

  addStage: protectedProcedure
    .input(z.object({
      pipelineId: z.number(),
      name: z.string().min(1),
      color: z.string().optional(),
      probability: z.number().min(0).max(100).optional(),
      slaHours: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const maxOrder = await db.select({ maxOrder: sql<number>`MAX(${pipelineStages.stageOrder})` })
        .from(pipelineStages).where(eq(pipelineStages.pipelineId, input.pipelineId));
      const nextOrder = (maxOrder[0]?.maxOrder ?? -1) + 1;
      const [result] = await db.insert(pipelineStages).values({
        pipelineId: input.pipelineId,
        name: input.name,
        color: input.color ?? "#6366f1",
        stageOrder: nextOrder,
        probability: input.probability ?? 0,
        slaHours: input.slaHours ?? null,
      });
      return { id: result.insertId };
    }),

  updateStage: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      color: z.string().optional(),
      probability: z.number().min(0).max(100).optional(),
      slaHours: z.number().optional(),
      stageOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.update(pipelineStages).set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.probability !== undefined && { probability: input.probability }),
        ...(input.slaHours !== undefined && { slaHours: input.slaHours }),
        ...(input.stageOrder !== undefined && { stageOrder: input.stageOrder }),
      }).where(eq(pipelineStages.id, input.id));
      return { success: true };
    }),

  deleteStage: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(pipelineStages).where(eq(pipelineStages.id, input.id));
      return { success: true };
    }),

  reorderStages: protectedProcedure
    .input(z.object({
      stages: z.array(z.object({ id: z.number(), stageOrder: z.number() })),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      for (const s of input.stages) {
        await db.update(pipelineStages).set({ stageOrder: s.stageOrder }).where(eq(pipelineStages.id, s.id));
      }
      return { success: true };
    }),

  // ── Opportunities CRUD ─────────────────────────────────────────────────────

  listOpportunities: protectedProcedure
    .input(z.object({
      pipelineId: z.number().optional(),
      stageId: z.number().optional(),
      status: z.enum(["open", "won", "lost"]).optional(),
      search: z.string().optional(),
      ownerId: z.number().optional(),
      minValue: z.number().optional(),
      maxValue: z.number().optional(),
      sortBy: z.enum(["newest", "oldest", "highest_value", "lowest_value", "recently_updated", "alphabetical"]).optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);
      const clientId = await getClientId(ctx.user.id, db);

      let query = db.select().from(opportunities).where(
        and(
          eq(opportunities.agencyId, agencyId),
          clientId ? or(eq(opportunities.clientId, clientId), sql`${opportunities.clientId} IS NULL`) : undefined,
          input.pipelineId ? eq(opportunities.pipelineId, input.pipelineId) : undefined,
          input.stageId ? eq(opportunities.stageId, input.stageId) : undefined,
          input.status ? eq(opportunities.status, input.status) : undefined,
          input.ownerId ? eq(opportunities.ownerId, input.ownerId) : undefined,
          input.search ? or(
            like(opportunities.name, `%${input.search}%`),
            like(opportunities.contactName, `%${input.search}%`),
            like(opportunities.companyName, `%${input.search}%`),
          ) : undefined,
          input.minValue ? gte(opportunities.value, String(input.minValue)) : undefined,
          input.maxValue ? lte(opportunities.value, String(input.maxValue)) : undefined,
        )
      );

      const sortMap: Record<string, any> = {
        newest: desc(opportunities.createdAt),
        oldest: asc(opportunities.createdAt),
        highest_value: desc(opportunities.value),
        lowest_value: asc(opportunities.value),
        recently_updated: desc(opportunities.updatedAt),
        alphabetical: asc(opportunities.name),
      };
      const orderBy = sortMap[input.sortBy ?? "newest"] ?? desc(opportunities.createdAt);

      const rows = await db.select().from(opportunities)
        .where(
          and(
            eq(opportunities.agencyId, agencyId),
            clientId ? or(eq(opportunities.clientId, clientId), sql`${opportunities.clientId} IS NULL`) : undefined,
            input.pipelineId ? eq(opportunities.pipelineId, input.pipelineId) : undefined,
            input.stageId ? eq(opportunities.stageId, input.stageId) : undefined,
            input.status ? eq(opportunities.status, input.status) : undefined,
            input.ownerId ? eq(opportunities.ownerId, input.ownerId) : undefined,
            input.search ? or(
              like(opportunities.name, `%${input.search}%`),
              like(opportunities.contactName, `%${input.search}%`),
              like(opportunities.companyName, `%${input.search}%`),
            ) : undefined,
            input.minValue ? gte(opportunities.value, String(input.minValue)) : undefined,
            input.maxValue ? lte(opportunities.value, String(input.maxValue)) : undefined,
          )
        )
        .orderBy(orderBy)
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return rows;
    }),

  getOpportunity: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);
      const rows = await db.select().from(opportunities)
        .where(and(eq(opportunities.id, input.id), eq(opportunities.agencyId, agencyId)))
        .limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
      const opp = rows[0];
      const activities = await db.select().from(opportunityActivities)
        .where(eq(opportunityActivities.opportunityId, input.id))
        .orderBy(desc(opportunityActivities.createdAt))
        .limit(50);
      return { ...opp, activities };
    }),

  createOpportunity: protectedProcedure
    .input(z.object({
      pipelineId: z.number(),
      stageId: z.number(),
      name: z.string().min(1),
      contactId: z.number().optional(),
      contactName: z.string().optional(),
      companyName: z.string().optional(),
      value: z.number().optional(),
      status: z.enum(["open", "won", "lost"]).optional(),
      source: z.string().optional(),
      ownerName: z.string().optional(),
      tags: z.array(z.string()).optional(),
      expectedCloseDate: z.string().optional(),
      notes: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);
      const clientId = await getClientId(ctx.user.id, db);
      const stageName = await db.select({ name: pipelineStages.name }).from(pipelineStages).where(eq(pipelineStages.id, input.stageId)).limit(1);
      const [result] = await db.insert(opportunities).values({
        agencyId,
        clientId: clientId ?? null,
        pipelineId: input.pipelineId,
        stageId: input.stageId,
        name: input.name,
        contactId: input.contactId ?? null,
        contactName: input.contactName ?? null,
        companyName: input.companyName ?? null,
        value: input.value ? String(input.value) : null,
        status: input.status ?? "open",
        source: input.source ?? null,
        ownerName: input.ownerName ?? null,
        tags: input.tags ?? [],
        expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
        notes: input.notes ?? null,
        priority: input.priority ?? "medium",
        createdBy: ctx.user.id,
      });
      // Log activity
      await db.insert(opportunityActivities).values({
        opportunityId: result.insertId,
        type: "note",
        content: `Opportunity created in stage "${stageName[0]?.name ?? "Unknown"}"`,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name ?? "Unknown",
      });
      return { id: result.insertId };
    }),

  updateOpportunity: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      contactName: z.string().optional(),
      companyName: z.string().optional(),
      value: z.number().optional(),
      status: z.enum(["open", "won", "lost"]).optional(),
      source: z.string().optional(),
      ownerName: z.string().optional(),
      tags: z.array(z.string()).optional(),
      expectedCloseDate: z.string().optional().nullable(),
      notes: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);
      const { id, ...fields } = input;
      await db.update(opportunities).set({
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.contactName !== undefined && { contactName: fields.contactName }),
        ...(fields.companyName !== undefined && { companyName: fields.companyName }),
        ...(fields.value !== undefined && { value: String(fields.value) }),
        ...(fields.status !== undefined && { status: fields.status }),
        ...(fields.source !== undefined && { source: fields.source }),
        ...(fields.ownerName !== undefined && { ownerName: fields.ownerName }),
        ...(fields.tags !== undefined && { tags: fields.tags }),
        ...(fields.expectedCloseDate !== undefined && { expectedCloseDate: fields.expectedCloseDate ? new Date(fields.expectedCloseDate) : null }),
        ...(fields.notes !== undefined && { notes: fields.notes }),
        ...(fields.priority !== undefined && { priority: fields.priority }),
      }).where(and(eq(opportunities.id, id), eq(opportunities.agencyId, agencyId)));
      return { success: true };
    }),

  moveStage: protectedProcedure
    .input(z.object({
      opportunityId: z.number(),
      newStageId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);
      const opp = await db.select({ stageId: opportunities.stageId, name: opportunities.name })
        .from(opportunities).where(and(eq(opportunities.id, input.opportunityId), eq(opportunities.agencyId, agencyId))).limit(1);
      if (!opp.length) throw new TRPCError({ code: "NOT_FOUND" });

      const [fromStage, toStage] = await Promise.all([
        db.select({ name: pipelineStages.name }).from(pipelineStages).where(eq(pipelineStages.id, opp[0].stageId)).limit(1),
        db.select({ name: pipelineStages.name }).from(pipelineStages).where(eq(pipelineStages.id, input.newStageId)).limit(1),
      ]);

      await db.update(opportunities).set({
        stageId: input.newStageId,
        stageEnteredAt: new Date(),
      }).where(eq(opportunities.id, input.opportunityId));

      await db.insert(opportunityActivities).values({
        opportunityId: input.opportunityId,
        type: "stage_change",
        content: `Moved from "${fromStage[0]?.name ?? "Unknown"}" to "${toStage[0]?.name ?? "Unknown"}"`,
        fromStage: fromStage[0]?.name ?? null,
        toStage: toStage[0]?.name ?? null,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name ?? "Unknown",
      });
      return { success: true };
    }),

  deleteOpportunity: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);
      await db.delete(opportunityActivities).where(eq(opportunityActivities.opportunityId, input.id));
      await db.delete(opportunities).where(and(eq(opportunities.id, input.id), eq(opportunities.agencyId, agencyId)));
      return { success: true };
    }),

  addNote: protectedProcedure
    .input(z.object({
      opportunityId: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(opportunityActivities).values({
        opportunityId: input.opportunityId,
        type: "note",
        content: input.content,
        createdBy: ctx.user.id,
        createdByName: ctx.user.name ?? "Unknown",
      });
      return { success: true };
    }),

  // ── Bulk Actions ───────────────────────────────────────────────────────────

  bulkAction: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      action: z.enum(["change_stage", "assign_owner", "add_tags", "remove_tags", "delete", "mark_won", "mark_lost", "move_pipeline"]),
      stageId: z.number().optional(),
      ownerName: z.string().optional(),
      tags: z.array(z.string()).optional(),
      pipelineId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const agencyId = await getAgencyId(ctx.user.id, db);

      switch (input.action) {
        case "change_stage":
          if (!input.stageId) throw new TRPCError({ code: "BAD_REQUEST", message: "stageId required" });
          await db.update(opportunities).set({ stageId: input.stageId, stageEnteredAt: new Date() })
            .where(and(inArray(opportunities.id, input.ids), eq(opportunities.agencyId, agencyId)));
          break;
        case "assign_owner":
          if (!input.ownerName) throw new TRPCError({ code: "BAD_REQUEST", message: "ownerName required" });
          await db.update(opportunities).set({ ownerName: input.ownerName })
            .where(and(inArray(opportunities.id, input.ids), eq(opportunities.agencyId, agencyId)));
          break;
        case "mark_won":
          await db.update(opportunities).set({ status: "won" })
            .where(and(inArray(opportunities.id, input.ids), eq(opportunities.agencyId, agencyId)));
          break;
        case "mark_lost":
          await db.update(opportunities).set({ status: "lost" })
            .where(and(inArray(opportunities.id, input.ids), eq(opportunities.agencyId, agencyId)));
          break;
        case "delete":
          for (const id of input.ids) {
            await db.delete(opportunityActivities).where(eq(opportunityActivities.opportunityId, id));
          }
          await db.delete(opportunities).where(and(inArray(opportunities.id, input.ids), eq(opportunities.agencyId, agencyId)));
          break;
        case "move_pipeline":
          if (!input.pipelineId) throw new TRPCError({ code: "BAD_REQUEST", message: "pipelineId required" });
          const firstStage = await db.select({ id: pipelineStages.id }).from(pipelineStages)
            .where(eq(pipelineStages.pipelineId, input.pipelineId)).orderBy(asc(pipelineStages.stageOrder)).limit(1);
          if (!firstStage.length) throw new TRPCError({ code: "NOT_FOUND", message: "No stages in target pipeline" });
          await db.update(opportunities).set({ pipelineId: input.pipelineId, stageId: firstStage[0].id })
            .where(and(inArray(opportunities.id, input.ids), eq(opportunities.agencyId, agencyId)));
          break;
        case "add_tags":
          if (!input.tags?.length) break;
          const oppsToTag = await db.select({ id: opportunities.id, tags: opportunities.tags })
            .from(opportunities).where(and(inArray(opportunities.id, input.ids), eq(opportunities.agencyId, agencyId)));
          for (const opp of oppsToTag) {
            const existing = (opp.tags as string[]) ?? [];
            const merged = Array.from(new Set([...existing, ...(input.tags ?? [])]));
            await db.update(opportunities).set({ tags: merged }).where(eq(opportunities.id, opp.id));
          }
          break;
        case "remove_tags":
          if (!input.tags?.length) break;
          const oppsToUntag = await db.select({ id: opportunities.id, tags: opportunities.tags })
            .from(opportunities).where(and(inArray(opportunities.id, input.ids), eq(opportunities.agencyId, agencyId)));
          for (const opp of oppsToUntag) {
            const filtered = ((opp.tags as string[]) ?? []).filter(t => !input.tags?.includes(t));
            await db.update(opportunities).set({ tags: filtered }).where(eq(opportunities.id, opp.id));
          }
          break;
      }
      return { success: true, affected: input.ids.length };
    }),

  // ── Seed Sample Data ───────────────────────────────────────────────────────

  seedSampleData: protectedProcedure.mutation(async ({ ctx }) => {
    const db = getDb();
    const agencyId = await getAgencyId(ctx.user.id, db);
    const clientId = await getClientId(ctx.user.id, db);

    // Check if already seeded
    const existing = await db.select({ id: pipelines.id }).from(pipelines).where(eq(pipelines.agencyId, agencyId)).limit(1);
    if (existing.length > 0) return { message: "Sample data already exists" };

    const pipelineDefs = [
      {
        name: "DSCR Loan Pipeline",
        description: "Debt Service Coverage Ratio rental property loans",
        isDefault: true,
        stages: [
          { name: "New Lead", color: "#6366f1", probability: 10 },
          { name: "Attempted Contact", color: "#8b5cf6", probability: 20 },
          { name: "Qualified", color: "#3b82f6", probability: 35 },
          { name: "Appointment Set", color: "#06b6d4", probability: 50 },
          { name: "Application Started", color: "#10b981", probability: 65 },
          { name: "Docs Received", color: "#f59e0b", probability: 75 },
          { name: "Underwriting", color: "#f97316", probability: 85 },
          { name: "Approved", color: "#84cc16", probability: 95 },
          { name: "Closed Won", color: "#22c55e", probability: 100 },
          { name: "Closed Lost", color: "#ef4444", probability: 0 },
        ],
      },
      {
        name: "Fix & Flip Pipeline",
        description: "Short-term bridge loans for fix and flip investors",
        isDefault: false,
        stages: [
          { name: "New Lead", color: "#6366f1", probability: 10 },
          { name: "Contacted", color: "#8b5cf6", probability: 25 },
          { name: "Property Identified", color: "#3b82f6", probability: 40 },
          { name: "LOI Submitted", color: "#06b6d4", probability: 55 },
          { name: "Term Sheet Issued", color: "#10b981", probability: 70 },
          { name: "In Underwriting", color: "#f59e0b", probability: 85 },
          { name: "Funded", color: "#22c55e", probability: 100 },
          { name: "Lost", color: "#ef4444", probability: 0 },
        ],
      },
      {
        name: "Referral Pipeline",
        description: "Realtor and partner referral opportunities",
        isDefault: false,
        stages: [
          { name: "Referral Received", color: "#6366f1", probability: 15 },
          { name: "Initial Call", color: "#3b82f6", probability: 30 },
          { name: "Pre-Qualified", color: "#06b6d4", probability: 50 },
          { name: "Application", color: "#10b981", probability: 70 },
          { name: "Processing", color: "#f59e0b", probability: 85 },
          { name: "Closed", color: "#22c55e", probability: 100 },
          { name: "Declined", color: "#ef4444", probability: 0 },
        ],
      },
    ];

    const createdPipelines: { id: number; stages: { id: number; name: string }[] }[] = [];

    for (const pDef of pipelineDefs) {
      const [pResult] = await db.insert(pipelines).values({
        agencyId,
        clientId: clientId ?? null,
        name: pDef.name,
        description: pDef.description,
        isDefault: pDef.isDefault,
        createdBy: ctx.user.id,
      });
      const pipelineId = pResult.insertId;
      await db.insert(pipelineStages).values(
        pDef.stages.map((s, i) => ({
          pipelineId,
          name: s.name,
          color: s.color,
          stageOrder: i,
          probability: s.probability,
        }))
      );
      const stageRows = await db.select({ id: pipelineStages.id, name: pipelineStages.name })
        .from(pipelineStages).where(eq(pipelineStages.pipelineId, pipelineId)).orderBy(asc(pipelineStages.stageOrder));
      createdPipelines.push({ id: pipelineId, stages: stageRows });
    }

    // Seed 60 sample opportunities spread across pipelines
    const contacts = [
      { name: "James Martinez", company: "Martinez Properties LLC", source: "Facebook Ad" },
      { name: "Sarah Johnson", company: "SJ Investments", source: "Referral" },
      { name: "Michael Chen", company: "Chen Capital Group", source: "Website" },
      { name: "Emily Davis", company: "Davis Real Estate", source: "Facebook Ad" },
      { name: "Robert Wilson", company: "Wilson Holdings", source: "Cold Outreach" },
      { name: "Jennifer Brown", company: "Brown Ventures", source: "Referral" },
      { name: "David Lee", company: "Lee Property Group", source: "Facebook Ad" },
      { name: "Amanda Taylor", company: "Taylor Investments", source: "Website" },
      { name: "Christopher Anderson", company: "Anderson Capital", source: "Referral" },
      { name: "Jessica Thomas", company: "Thomas Real Estate", source: "Facebook Ad" },
      { name: "Daniel Jackson", company: "Jackson Properties", source: "Website" },
      { name: "Ashley White", company: "White Group LLC", source: "Referral" },
      { name: "Matthew Harris", company: "Harris Investments", source: "Facebook Ad" },
      { name: "Stephanie Martin", company: "Martin Capital", source: "Cold Outreach" },
      { name: "Andrew Thompson", company: "Thompson Holdings", source: "Website" },
      { name: "Nicole Garcia", company: "Garcia Properties", source: "Referral" },
      { name: "Kevin Martinez", company: "KM Real Estate", source: "Facebook Ad" },
      { name: "Rachel Robinson", company: "Robinson Ventures", source: "Website" },
      { name: "Brandon Clark", company: "Clark Capital Group", source: "Referral" },
      { name: "Melissa Rodriguez", company: "Rodriguez Properties", source: "Facebook Ad" },
    ];

    const owners = ["Kyle Johnson", "Tim Anderson", "Sarah Mitchell", "Mike Torres"];
    const priorities = ["low", "medium", "high"] as const;
    const statuses = ["open", "open", "open", "open", "won", "lost"] as const;

    let oppCount = 0;
    for (const pipeline of createdPipelines) {
      for (let i = 0; i < 20; i++) {
        const contact = contacts[oppCount % contacts.length];
        const stage = pipeline.stages[Math.floor(Math.random() * Math.min(pipeline.stages.length, 6))];
        const value = Math.floor(Math.random() * 800000) + 150000;
        const daysAgo = Math.floor(Math.random() * 60);
        const closeDate = new Date();
        closeDate.setDate(closeDate.getDate() + Math.floor(Math.random() * 90) + 14);
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        const [oResult] = await db.insert(opportunities).values({
          agencyId,
          clientId: clientId ?? null,
          pipelineId: pipeline.id,
          stageId: stage.id,
          name: `${contact.name} - ${pipeline.id === createdPipelines[0].id ? "DSCR" : pipeline.id === createdPipelines[1].id ? "Fix & Flip" : "Referral"} Loan`,
          contactName: contact.name,
          companyName: contact.company,
          value: String(value),
          status,
          source: contact.source,
          ownerName: owners[Math.floor(Math.random() * owners.length)],
          tags: [pipeline.id === createdPipelines[0].id ? "dscr" : pipeline.id === createdPipelines[1].id ? "fix-flip" : "referral", priorities[Math.floor(Math.random() * priorities.length)]],
          expectedCloseDate: closeDate,
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          stageEnteredAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          createdBy: ctx.user.id,
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        });

        await db.insert(opportunityActivities).values({
          opportunityId: oResult.insertId,
          type: "note",
          content: `Opportunity created — ${contact.source} lead for ${value.toLocaleString("en-US", { style: "currency", currency: "USD" })} loan`,
          createdBy: ctx.user.id,
          createdByName: owners[0],
        });

        oppCount++;
      }
    }

    return { success: true, pipelines: createdPipelines.length, opportunities: oppCount };
  }),
});
