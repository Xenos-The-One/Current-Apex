import { TRPCError } from "@trpc/server";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { teamNotifications } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ agencyId: z.number(), limit: z.number().default(30) }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(teamNotifications)
        .where(and(eq(teamNotifications.agencyId, input.agencyId), eq(teamNotifications.userId, ctx.user.id)))
        .orderBy(desc(teamNotifications.createdAt))
        .limit(input.limit);
    }),

  unreadCount: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.select({ count: count() }).from(teamNotifications)
        .where(and(eq(teamNotifications.agencyId, input.agencyId), eq(teamNotifications.userId, ctx.user.id), eq(teamNotifications.isRead, false)));
      return { count: result?.count ?? 0 };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(teamNotifications).set({ isRead: true }).where(eq(teamNotifications.id, input.id));
      return { success: true };
    }),

  markAllRead: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(teamNotifications).set({ isRead: true })
        .where(and(eq(teamNotifications.agencyId, input.agencyId), eq(teamNotifications.userId, ctx.user.id)));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(teamNotifications).where(eq(teamNotifications.id, input.id));
      return { success: true };
    }),

  create: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      userId: z.number(),
      type: z.enum(["new_lead", "appointment_reminder", "campaign_sent", "call_completed", "task_due", "workflow_triggered", "document_uploaded", "system"]),
      title: z.string(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(teamNotifications).values(input);
      return { id: (result as any).insertId };
    }),
});
