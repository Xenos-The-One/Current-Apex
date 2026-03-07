import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { campaignTemplates, emailCampaigns, smsCampaigns } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const campaignsRouter = router({
  // ── Email Campaigns ──────────────────────────────────────────────────────
  listEmail: protectedProcedure
    .input(z.object({ agencyId: z.number(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(emailCampaigns)
        .where(eq(emailCampaigns.agencyId, input.agencyId))
        .orderBy(desc(emailCampaigns.createdAt))
        .limit(input.limit).offset(input.offset);
    }),

  getEmailById: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [campaign] = await db.select().from(emailCampaigns)
        .where(and(eq(emailCampaigns.id, input.id), eq(emailCampaigns.agencyId, input.agencyId))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      return campaign;
    }),

  createEmail: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1),
      subject: z.string().min(1),
      fromName: z.string().optional(),
      fromEmail: z.string().email().optional(),
      content: z.string().min(1),
      audienceFilter: z.any().optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(emailCampaigns).values({ ...input, createdByUserId: ctx.user.id, audienceFilter: input.audienceFilter ? JSON.stringify(input.audienceFilter) : null });
      return { id: (result as any).insertId };
    }),

  updateEmail: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      name: z.string().optional(),
      subject: z.string().optional(),
      content: z.string().optional(),
      fromName: z.string().optional(),
      fromEmail: z.string().optional(),
      status: z.enum(["draft", "scheduled", "sending", "sent", "paused", "cancelled"]).optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      await db.update(emailCampaigns).set(rest).where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.agencyId, agencyId)));
      return { success: true };
    }),

  deleteEmail: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(emailCampaigns).where(and(eq(emailCampaigns.id, input.id), eq(emailCampaigns.agencyId, input.agencyId)));
      return { success: true };
    }),

  // ── SMS Campaigns ────────────────────────────────────────────────────────
  listSms: protectedProcedure
    .input(z.object({ agencyId: z.number(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(smsCampaigns)
        .where(eq(smsCampaigns.agencyId, input.agencyId))
        .orderBy(desc(smsCampaigns.createdAt))
        .limit(input.limit).offset(input.offset);
    }),

  createSms: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1),
      message: z.string().min(1),
      fromNumber: z.string().optional(),
      audienceFilter: z.any().optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(smsCampaigns).values({ ...input, createdByUserId: ctx.user.id, audienceFilter: input.audienceFilter ? JSON.stringify(input.audienceFilter) : null });
      return { id: (result as any).insertId };
    }),

  updateSms: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      name: z.string().optional(),
      message: z.string().optional(),
      status: z.enum(["draft", "scheduled", "sending", "sent", "paused", "cancelled"]).optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      await db.update(smsCampaigns).set(rest).where(and(eq(smsCampaigns.id, id), eq(smsCampaigns.agencyId, agencyId)));
      return { success: true };
    }),

  deleteSms: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(smsCampaigns).where(and(eq(smsCampaigns.id, input.id), eq(smsCampaigns.agencyId, input.agencyId)));
      return { success: true };
    }),

  // ── Templates ────────────────────────────────────────────────────────────
  listTemplates: protectedProcedure
    .input(z.object({ agencyId: z.number(), type: z.enum(["email", "sms"]).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(campaignTemplates.agencyId, input.agencyId)];
      if (input.type) conditions.push(eq(campaignTemplates.type, input.type));
      return db.select().from(campaignTemplates).where(and(...conditions)).orderBy(campaignTemplates.name);
    }),

  createTemplate: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1),
      type: z.enum(["email", "sms"]),
      subject: z.string().optional(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(campaignTemplates).values(input);
      return { id: (result as any).insertId };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(campaignTemplates).where(and(eq(campaignTemplates.id, input.id), eq(campaignTemplates.agencyId, input.agencyId)));
      return { success: true };
    }),
});
