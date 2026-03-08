import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { appNotifications } from "../../../drizzle/seo-schema";
import { eq, desc, and } from "drizzle-orm";

export const appNotificationsRouter = router({
  /** Return the most recent 50 notifications */
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(appNotifications)
      .orderBy(desc(appNotifications.createdAt))
      .limit(50);
  }),

  /** Count of unread notifications (for sidebar badge) */
  unreadCount: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return 0;
    const rows = await db
      .select({ id: appNotifications.id })
      .from(appNotifications)
      .where(eq(appNotifications.isRead, 0));
    return rows.length;
  }),

  /** Mark a single notification as read */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      await db
        .update(appNotifications)
        .set({ isRead: 1 })
        .where(eq(appNotifications.id, input.id));
    }),

  /** Mark all notifications as read */
  markAllRead: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return;
    await db
      .update(appNotifications)
      .set({ isRead: 1 })
      .where(eq(appNotifications.isRead, 0));
  }),

  /** Create a new in-app notification (called from other routers) */
  create: protectedProcedure
    .input(
      z.object({
        type: z.string().default("info"),
        title: z.string().min(1),
        message: z.string().min(1),
        contentId: z.number().optional(),
        clientId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      await db.insert(appNotifications).values({
        type: input.type,
        title: input.title,
        message: input.message,
        contentId: input.contentId ?? null,
        clientId: input.clientId ?? null,
        isRead: 0,
      });
    }),

  /** Delete a notification */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      await db
        .delete(appNotifications)
        .where(eq(appNotifications.id, input.id));
    }),

  /** Clear all read notifications */
  clearRead: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return;
    await db
      .delete(appNotifications)
      .where(eq(appNotifications.isRead, 1));
  }),
});
