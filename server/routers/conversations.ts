import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { conversationMessages, conversations } from "../../drizzle/schema";
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

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(conversationMessages)
        .where(eq(conversationMessages.conversationId, input.conversationId))
        .orderBy(asc(conversationMessages.createdAt))
        .limit(input.limit);
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string().min(1),
      direction: z.enum(["inbound", "outbound"]).default("outbound"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Get conversation to find agencyId
      const [conv] = await db.select().from(conversations)
        .where(eq(conversations.id, input.conversationId)).limit(1);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND" });
      const [result] = await db.insert(conversationMessages).values({
        conversationId: input.conversationId,
        agencyId: conv.agencyId,
        direction: input.direction,
        content: input.content,
        sentByUserId: ctx.user.id,
        status: "sent",
      });
      // Update conversation last message
      await db.update(conversations)
        .set({ lastMessageAt: new Date(), lastMessagePreview: input.content.slice(0, 100), isRead: true })
        .where(eq(conversations.id, input.conversationId));
      return { id: (result as any).insertId };
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
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(conversations).values({
        ...input,
        lastMessageAt: new Date(),
      });
      return { id: (result as any).insertId };
    }),
});
