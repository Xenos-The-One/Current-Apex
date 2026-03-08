import { protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { pipelineCards } from "../../../drizzle/seo-schema";
import { eq, and } from "drizzle-orm";

export const pipelineRouter = {
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(pipelineCards).where(eq(pipelineCards.createdBy, ctx.user.id));
  }),

  create: protectedProcedure
    .input(z.object({
      businessName: z.string().min(1),
      industry: z.string().optional(),
      budgetRange: z.string().optional(),
      matchScore: z.number().min(0).max(100).default(0),
      stage: z.enum(["prospect", "contacted", "proposal", "onboarded"]).default("prospect"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Duplicate check: same businessName (case-insensitive) for this user
      const existing = await db
        .select()
        .from(pipelineCards)
        .where(eq(pipelineCards.createdBy, ctx.user.id));
      const nameLower = input.businessName.trim().toLowerCase();
      const duplicate = existing.find(
        (c) => c.businessName.trim().toLowerCase() === nameLower
      );
      if (duplicate) {
        throw new Error(
          `"${duplicate.businessName}" is already in your pipeline (stage: ${duplicate.stage}). Update the existing card instead.`
        );
      }

      const result = await db.insert(pipelineCards).values({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id: result[0].insertId };
    }),

  updateCard: protectedProcedure
    .input(z.object({
      id: z.number(),
      businessName: z.string().min(1),
      industry: z.string().optional(),
      budgetRange: z.string().optional(),
      matchScore: z.number().min(0).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Duplicate check: same name but different id
      const existing = await db.select().from(pipelineCards).where(eq(pipelineCards.createdBy, ctx.user.id));
      const nameLower = input.businessName.trim().toLowerCase();
      const duplicate = existing.find(
        (c) => c.id !== input.id && c.businessName.trim().toLowerCase() === nameLower
      );
      if (duplicate) {
        throw new Error(`"${duplicate.businessName}" already exists in your pipeline.`);
      }
      await db.update(pipelineCards)
        .set({
          businessName: input.businessName,
          industry: input.industry,
          budgetRange: input.budgetRange,
          matchScore: input.matchScore,
          updatedAt: new Date(),
        })
        .where(and(eq(pipelineCards.id, input.id), eq(pipelineCards.createdBy, ctx.user.id)));
      return { success: true };
    }),

  snooze: protectedProcedure
    .input(z.object({
      id: z.number(),
      days: z.number().min(1).max(30), // snooze for N days; 0 = clear snooze
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const snoozedUntil = input.days > 0
        ? Date.now() + input.days * 86_400_000
        : 0;
      await db.update(pipelineCards)
        .set({ snoozedUntil, updatedAt: new Date() })
        .where(and(eq(pipelineCards.id, input.id), eq(pipelineCards.createdBy, ctx.user.id)));
      return { success: true, snoozedUntil };
    }),

  updateStage: protectedProcedure
    .input(z.object({
      id: z.number(),
      stage: z.enum(["prospect", "contacted", "proposal", "onboarded"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(pipelineCards)
        .set({ stage: input.stage, updatedAt: new Date() })
        .where(and(eq(pipelineCards.id, input.id), eq(pipelineCards.createdBy, ctx.user.id)));
      return { success: true };
    }),

  updateNotes: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(pipelineCards)
        .set({ notes: input.notes, updatedAt: new Date() })
        .where(and(eq(pipelineCards.id, input.id), eq(pipelineCards.createdBy, ctx.user.id)));
      return { success: true };
    }),

  updateDueDate: protectedProcedure
    .input(z.object({
      id: z.number(),
      dueDate: z.number().nullable(), // UTC timestamp ms, null to clear
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.update(pipelineCards)
        .set({ dueDate: input.dueDate ?? 0, updatedAt: new Date() })
        .where(and(eq(pipelineCards.id, input.id), eq(pipelineCards.createdBy, ctx.user.id)));
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(pipelineCards)
        .where(and(eq(pipelineCards.id, input.id), eq(pipelineCards.createdBy, ctx.user.id)));
      return { success: true };
    }),
};
