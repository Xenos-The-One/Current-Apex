import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { pushSubscriptions, teamNotifications } from "../../drizzle/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import webpush from "web-push";

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = "mailto:admin@indigolabs.ai";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log("[Web Push] VAPID keys configured");
} else {
  console.warn("[Web Push] VAPID keys not configured - push notifications disabled");
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushToUser(userId: number, payload: {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, string>;
  icon?: string;
}) {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)));

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: payload.icon || "/icon-192x192.png",
          badge: "/icon-96x96.png",
          tag: payload.tag || "default",
          data: payload.data || { url: "/notifications" },
        })
      );
      sent++;
      await db.update(pushSubscriptions).set({ lastUsed: new Date() }).where(eq(pushSubscriptions.id, sub.id));
    } catch (err: any) {
      console.error(`[Web Push] Failed to send to subscription ${sub.id}:`, err.statusCode || err.message);
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.update(pushSubscriptions).set({ isActive: false }).where(eq(pushSubscriptions.id, sub.id));
      }
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send push notification to a team member by their team_members table ID
 * FIX: Also looks up user_id from team_members to send via userId path if available
 */
export async function sendPushToTeamMember(teamMemberId: number, payload: {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, string>;
}) {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  // FIX: First try to get the user_id for this team member and send via userId
  const memberResult = await db.execute(
    sql.raw(`SELECT user_id FROM team_members WHERE id = ${teamMemberId} LIMIT 1`)
  ) as any;
  const member = Array.isArray(memberResult) ? memberResult[0]?.[0] : memberResult?.[0];
  
  if (member?.user_id) {
    // Send via userId path (more reliable - linked to their actual login)
    return sendPushToUser(member.user_id, payload);
  }

  // Fallback: send via teamMemberId subscriptions
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.teamMemberId, teamMemberId), eq(pushSubscriptions.isActive, true)));

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: "/icon-192x192.png",
          badge: "/icon-96x96.png",
          tag: payload.tag || "default",
          data: payload.data || { url: "/notifications" },
        })
      );
      sent++;
      await db.update(pushSubscriptions).set({ lastUsed: new Date() }).where(eq(pushSubscriptions.id, sub.id));
    } catch (err: any) {
      console.error(`[Web Push] Failed to send to team sub ${sub.id}:`, err.statusCode || err.message);
      if (err.statusCode === 410 || err.statusCode === 404) {
        await db.update(pushSubscriptions).set({ isActive: false }).where(eq(pushSubscriptions.id, sub.id));
      }
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send push to ALL active subscriptions (broadcast)
 */
export async function sendPushBroadcast(payload: {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, string>;
}) {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.isActive, true));

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    // Skip and deactivate subscriptions with invalid p256dh keys
    if (!sub.p256dh || sub.p256dh.length < 80) {
      await db.update(pushSubscriptions).set({ isActive: false }).where(eq(pushSubscriptions.id, sub.id));
      failed++;
      continue;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: "/icon-192x192.png",
          badge: "/icon-96x96.png",
          tag: payload.tag || "broadcast",
          data: payload.data || { url: "/notifications" },
        })
      );
      sent++;
      await db.update(pushSubscriptions).set({ lastUsed: new Date() }).where(eq(pushSubscriptions.id, sub.id));
    } catch (err: any) {
      const statusCode = err.statusCode || err.status;
      console.log(`[Push Broadcast] Failed sub ${sub.id}: status=${statusCode}, err=${err.message || 'unknown'}`);
      if (statusCode === 410 || statusCode === 404 || statusCode === 403) {
        await db.update(pushSubscriptions).set({ isActive: false }).where(eq(pushSubscriptions.id, sub.id));
      }
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Create a notification in the database AND send push
 * FIX: When userId is provided, always use userId path for both DB storage and push delivery
 * FIX: When only teamMemberId is provided, look up user_id from team_members table
 */
export async function createAndPushNotification(params: {
  userId?: number;
  teamMemberId?: number;
  teamMemberName?: string;
  type: string;
  title: string;
  body: string;
  priority?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) return null;

  // FIX: If only teamMemberId provided, look up the user_id
  let resolvedUserId = params.userId;
  if (!resolvedUserId && params.teamMemberId) {
    const memberResult = await db.execute(
      sql.raw(`SELECT user_id FROM team_members WHERE id = ${params.teamMemberId} LIMIT 1`)
    ) as any;
    const member = Array.isArray(memberResult) ? memberResult[0]?.[0] : memberResult?.[0];
    if (member?.user_id) {
      resolvedUserId = member.user_id;
    }
  }

  // Insert notification into database — always store with userId so the list query finds it
  const result = await db.insert(teamNotifications).values({
    userId: resolvedUserId || null,
    teamMemberId: params.teamMemberId || null,
    teamMemberName: params.teamMemberName || null,
    type: params.type as any,
    title: params.title,
    body: params.body,
    priority: (params.priority || "normal") as any,
    actionUrl: params.actionUrl || null,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    pushSent: false,
  });

  // Send push notification
  let pushResult = { sent: 0, failed: 0 };

  if (resolvedUserId) {
    pushResult = await sendPushToUser(resolvedUserId, {
      title: params.title,
      body: params.body,
      tag: params.type,
      data: { url: params.actionUrl || "/notifications" },
    });
  } else if (params.teamMemberId) {
    pushResult = await sendPushToTeamMember(params.teamMemberId, {
      title: params.title,
      body: params.body,
      tag: params.type,
      data: { url: params.actionUrl || "/notifications" },
    });
  }

  // Update push sent status
  if (pushResult.sent > 0) {
    const notifId = (result as any)[0]?.insertId || (result as any).insertId;
    if (notifId) {
      await db.update(teamNotifications)
        .set({ pushSent: true, pushSentAt: new Date() })
        .where(eq(teamNotifications.id, notifId));
    }
  }

  return { notificationId: (result as any)[0]?.insertId || (result as any).insertId, pushResult };
}

export const notificationsRouter = router({
  /**
   * Subscribe to push notifications
   */
  subscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string(),
      p256dh: z.string().min(80, "Invalid push key - please re-enable notifications"),
      auth: z.string(),
      deviceName: z.string().optional(),
      teamMemberId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!input.p256dh || input.p256dh.length < 80) {
        console.warn(`[Push Subscribe] Rejected subscription with invalid p256dh key (${input.p256dh?.length || 0} chars) for user ${ctx.user?.id}`);
        throw new Error("Invalid push subscription key. Please clear site data and re-enable notifications.");
      }

      const existing = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, input.endpoint));

      if (existing.length > 0) {
        await db.update(pushSubscriptions)
          .set({
            p256dh: input.p256dh,
            auth: input.auth,
            userId: ctx.user?.id || null,
            teamMemberId: input.teamMemberId || null,
            deviceName: input.deviceName || null,
            isActive: true,
            lastUsed: new Date(),
          })
          .where(eq(pushSubscriptions.endpoint, input.endpoint));
        return { success: true, updated: true };
      }

      await db.insert(pushSubscriptions).values({
        userId: ctx.user?.id || null,
        teamMemberId: input.teamMemberId || null,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        deviceName: input.deviceName || null,
        isActive: true,
      });

      return { success: true, updated: false };
    }),

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe: protectedProcedure
    .input(z.object({
      endpoint: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(pushSubscriptions)
        .set({ isActive: false })
        .where(eq(pushSubscriptions.endpoint, input.endpoint));

      return { success: true };
    }),

  /**
   * Get notification list for current user
   * FIX: Now shows notifications by userId OR by teamMemberId (for team members without user accounts)
   */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      unreadOnly: z.boolean().default(false),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { notifications: [], total: 0 };

      const userId = ctx.user?.id;
      if (!userId) return { notifications: [], total: 0 };

      // FIX: Look up the team_member_id for this user so we can also show
      // notifications that were created before user_id was linked
      const memberResult = await db.execute(
        sql.raw(`SELECT id FROM team_members WHERE user_id = ${userId} LIMIT 1`)
      ) as any;
      const teamMemberId = Array.isArray(memberResult)
        ? memberResult[0]?.[0]?.id
        : memberResult?.[0]?.id;

      // Build condition: show notifications for this userId OR this teamMemberId
      const userCondition = teamMemberId
        ? or(eq(teamNotifications.userId, userId), eq(teamNotifications.teamMemberId, teamMemberId))
        : eq(teamNotifications.userId, userId);

      const conditions = input.unreadOnly
        ? and(userCondition, eq(teamNotifications.isRead, false))
        : userCondition;

      const notifications = await db
        .select()
        .from(teamNotifications)
        .where(conditions)
        .orderBy(desc(teamNotifications.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(teamNotifications)
        .where(conditions);

      return {
        notifications,
        total: countResult[0]?.count || 0,
      };
    }),

  /**
   * Get unread count for badge
   * FIX: Also counts notifications by teamMemberId
   */
  unreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { count: 0 };

      const userId = ctx.user?.id;
      if (!userId) return { count: 0 };

      const memberResult = await db.execute(
        sql.raw(`SELECT id FROM team_members WHERE user_id = ${userId} LIMIT 1`)
      ) as any;
      const teamMemberId = Array.isArray(memberResult)
        ? memberResult[0]?.[0]?.id
        : memberResult?.[0]?.id;

      const userCondition = teamMemberId
        ? or(eq(teamNotifications.userId, userId), eq(teamNotifications.teamMemberId, teamMemberId))
        : eq(teamNotifications.userId, userId);

      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(teamNotifications)
        .where(and(userCondition, eq(teamNotifications.isRead, false)));

      return { count: result[0]?.count || 0 };
    }),

  /**
   * Mark notification as read
   */
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;
      const memberResult = await db.execute(
        sql.raw(`SELECT id FROM team_members WHERE user_id = ${userId} LIMIT 1`)
      ) as any;
      const teamMemberId = Array.isArray(memberResult)
        ? memberResult[0]?.[0]?.id
        : memberResult?.[0]?.id;

      const ownerCondition = teamMemberId
        ? or(eq(teamNotifications.userId, userId), eq(teamNotifications.teamMemberId, teamMemberId))
        : eq(teamNotifications.userId, userId);

      await db.update(teamNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(eq(teamNotifications.id, input.id), ownerCondition));

      return { success: true };
    }),

  /**
   * Mark all notifications as read
   */
  markAllRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;
      const memberResult = await db.execute(
        sql.raw(`SELECT id FROM team_members WHERE user_id = ${userId} LIMIT 1`)
      ) as any;
      const teamMemberId = Array.isArray(memberResult)
        ? memberResult[0]?.[0]?.id
        : memberResult?.[0]?.id;

      const ownerCondition = teamMemberId
        ? or(eq(teamNotifications.userId, userId), eq(teamNotifications.teamMemberId, teamMemberId))
        : eq(teamNotifications.userId, userId);

      await db.update(teamNotifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(ownerCondition, eq(teamNotifications.isRead, false)));

      return { success: true };
    }),

  /**
   * Send a test push notification to current user
   * FIX: Renamed title to make it clearly a test, and added confirmation guard on frontend
   */
  testPush: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const result = await createAndPushNotification({
        userId,
        type: "system",
        title: "✅ Push Test — Setup Verified",
        body: "Your push notifications are working correctly. This is a one-time test notification.",
        priority: "low",
        actionUrl: "/notifications",
      });

      return { success: true, result };
    }),

  /**
   * Get push subscription status for current user
   */
  subscriptionStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { subscribed: false, devices: [] };

      const userId = ctx.user?.id;
      if (!userId) return { subscribed: false, devices: [] };

      const subs = await db
        .select({
          id: pushSubscriptions.id,
          deviceName: pushSubscriptions.deviceName,
          isActive: pushSubscriptions.isActive,
          lastUsed: pushSubscriptions.lastUsed,
          createdAt: pushSubscriptions.createdAt,
        })
        .from(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)));

      return {
        subscribed: subs.length > 0,
        devices: subs,
      };
    }),

  /**
   * Clean up stale/duplicate push subscriptions for current user
   * Keeps only the most recent active subscription per user
   */
  cleanupSubscriptions: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = ctx.user!.id;

      // Get all active subs for this user, ordered by most recent
      const allSubs = await db
        .select()
        .from(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.isActive, true)))
        .orderBy(desc(pushSubscriptions.lastUsed));

      // Keep the most recent one, deactivate the rest
      if (allSubs.length > 1) {
        const idsToDeactivate = allSubs.slice(1).map(s => s.id);
        for (const id of idsToDeactivate) {
          await db.update(pushSubscriptions).set({ isActive: false }).where(eq(pushSubscriptions.id, id));
        }
        return { cleaned: idsToDeactivate.length, kept: 1 };
      }

      return { cleaned: 0, kept: allSubs.length };
    }),

  /**
   * Get VAPID public key for push subscription registration
   * This allows the frontend to subscribe without needing VITE_VAPID_PUBLIC_KEY in env
   */
  getVapidPublicKey: publicProcedure
    .query(() => {
      return {
        publicKey: VAPID_PUBLIC_KEY || null,
        enabled: !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
      };
    }),
});
