import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { conversations } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const conversationsRouter = router({
  list: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      channel: z.string().optional(),
      isRead: z.boolean().optional(),
      limit: z.number().default(30),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(conversations.agencyId, input.agencyId)];
      if (input.channel) conditions.push(eq(conversations.channel, input.channel as any));
      if (input.isRead !== undefined) conditions.push(eq(conversations.isRead, input.isRead));
      return db.select().from(conversations)
        .where(and(...conditions))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(input.limit).offset(input.offset);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [conv] = await db.select().from(conversations)
        .where(and(eq(conversations.id, input.id), eq(conversations.agencyId, input.agencyId)))
        .limit(1);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
      return conv;
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(conversations)
        .set({ isRead: true })
        .where(and(eq(conversations.id, input.id), eq(conversations.agencyId, input.agencyId)));
      return { success: true };
    }),

  create: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      leadId: z.number().optional(),
      borrowerId: z.number().optional(),
      channel: z.enum(["sms", "email", "facebook", "instagram", "whatsapp"]),
      contactName: z.string().optional(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
      lastMessagePreview: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(conversations).values({
        ...input,
        lastMessageAt: new Date(),
      });
      return { id: (result as any).insertId };
    }),
});
