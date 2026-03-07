import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { aiScripts, callLogs, leadSourceAssistantMappings, vapiAssistants } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const vapiRouter = router({
  listCalls: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      leadId: z.number().optional(),
      status: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(callLogs.agencyId, input.agencyId)];
      if (input.leadId) conditions.push(eq(callLogs.leadId, input.leadId));
      if (input.status) conditions.push(eq(callLogs.status, input.status as any));
      return db.select().from(callLogs).where(and(...conditions)).orderBy(desc(callLogs.createdAt)).limit(input.limit).offset(input.offset);
    }),

  getCallById: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [call] = await db.select().from(callLogs).where(and(eq(callLogs.id, input.id), eq(callLogs.agencyId, input.agencyId))).limit(1);
      if (!call) throw new TRPCError({ code: "NOT_FOUND" });
      return call;
    }),

  placeCall: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      leadId: z.number().optional(),
      toNumber: z.string().min(10),
      assistantId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Log the call attempt (actual Vapi API call would happen here with VAPI_API_KEY)
      const [result] = await db.insert(callLogs).values({
        agencyId: input.agencyId,
        leadId: input.leadId,
        userId: ctx.user.id,
        direction: "outbound",
        status: "initiated",
        toNumber: input.toNumber,
        startedAt: new Date(),
      });
      return { id: (result as any).insertId, status: "initiated" };
    }),

  updateCall: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      status: z.enum(["initiated", "ringing", "in_progress", "completed", "failed", "no_answer", "busy", "cancelled"]).optional(),
      duration: z.number().optional(),
      recordingUrl: z.string().optional(),
      transcript: z.string().optional(),
      summary: z.string().optional(),
      sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
      appointmentBooked: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      const updateData: any = { ...rest };
      if (rest.status === "completed") updateData.endedAt = new Date();
      await db.update(callLogs).set(updateData).where(and(eq(callLogs.id, id), eq(callLogs.agencyId, agencyId)));
      return { success: true };
    }),

  listAssistants: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(vapiAssistants).where(eq(vapiAssistants.agencyId, input.agencyId));
    }),

  createAssistant: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1),
      leadSource: z.string().optional(),
      systemPrompt: z.string().optional(),
      firstMessage: z.string().optional(),
      voice: z.string().default("jennifer"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(vapiAssistants).values(input);
      return { id: (result as any).insertId };
    }),

  listScripts: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(aiScripts).where(eq(aiScripts.agencyId, input.agencyId)).orderBy(desc(aiScripts.createdAt));
    }),

  createScript: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1),
      purpose: z.enum(["cold_call", "follow_up", "appointment_booking", "re_engagement", "referral_request", "other"]),
      script: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(aiScripts).values(input);
      return { id: (result as any).insertId };
    }),

  deleteScript: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(aiScripts).where(and(eq(aiScripts.id, input.id), eq(aiScripts.agencyId, input.agencyId)));
      return { success: true };
    }),

  // ─── Lead Source → Assistant Mappings ─────────────────────────────────────
  listSourceMappings: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(leadSourceAssistantMappings)
        .where(eq(leadSourceAssistantMappings.agencyId, input.agencyId));
    }),

  createSourceMapping: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      leadSource: z.string().min(1),
      vapiAssistantId: z.number(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(leadSourceAssistantMappings).values(input);
      return { id: (result as any).insertId };
    }),

  deleteSourceMapping: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(leadSourceAssistantMappings)
        .where(and(eq(leadSourceAssistantMappings.id, input.id), eq(leadSourceAssistantMappings.agencyId, input.agencyId)));
      return { success: true };
    }),
});
