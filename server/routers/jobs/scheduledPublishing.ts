/**
 * Scheduled Publishing Job Processor
 * 
 * This module handles the execution of scheduled publishing tasks.
 * It should be called periodically (e.g., every minute) by a cron job or scheduler.
 */

import { getDb } from "../../seo-db";
import { publishingSchedules, content } from "../../../drizzle/seo-schema";
import { eq, and, lte } from "drizzle-orm";

export async function processScheduledPublishing() {
  const db = await getDb();
  if (!db) {
    console.error('[Scheduled Publishing] Database not available');
    return;
  }

  const now = new Date();

  // Get all pending schedules that are due
  const dueSchedules = await db
    .select({
      id: publishingSchedules.id,
      contentId: publishingSchedules.contentId,
      publishToWordPress: publishingSchedules.publishToWordPress,
      wordpressConnectionIds: publishingSchedules.wordpressConnectionIds,
      wordpressStatus: publishingSchedules.wordpressStatus,
      publishToManus: publishingSchedules.publishToManus,
      manusWebsiteIds: publishingSchedules.manusWebsiteIds,
      scheduledFor: publishingSchedules.scheduledFor,
    })
    .from(publishingSchedules)
    .where(
      and(
        eq(publishingSchedules.status, "pending"),
        lte(publishingSchedules.scheduledFor, now)
      )
    );

  if (dueSchedules.length === 0) {
    console.log('[Scheduled Publishing] No schedules due for execution');
    return;
  }

  console.log(`[Scheduled Publishing] Processing ${dueSchedules.length} scheduled tasks`);

  for (const schedule of dueSchedules) {
    try {
      // Mark as processing
      await db
        .update(publishingSchedules)
        .set({ status: "processing", updatedAt: new Date() })
        .where(eq(publishingSchedules.id, schedule.id));

      // Get content
      const [contentData] = await db
        .select()
        .from(content)
        .where(eq(content.id, schedule.contentId))
        .limit(1);

      if (!contentData) {
        throw new Error('Content not found');
      }

      // Use bulk publishing to execute the scheduled publish
      const routers = await import("../../routers");
      const mockContext = {
        user: {
          id: 1,
          name: "System",
          email: "system@internal",
          openId: "system",
          loginMethod: "internal",
          role: "admin" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        },
        req: {} as any,
        res: {} as any,
      };
      const caller = routers.appRouter.createCaller(mockContext);

      const result = await caller.bulkPublishing.publishToMultiplePlatforms({
        contentId: schedule.contentId,
        wordpressConnectionIds: schedule.publishToWordPress === 1 && schedule.wordpressConnectionIds
          ? JSON.parse(schedule.wordpressConnectionIds)
          : undefined,
        wordpressStatus: schedule.wordpressStatus || "draft",
        manusWebsiteIds: schedule.publishToManus === 1 && schedule.manusWebsiteIds
          ? JSON.parse(schedule.manusWebsiteIds)
          : undefined,
      });

      const hasSuccess = result.success;

      if (hasSuccess) {
        // Mark as completed
        await db
          .update(publishingSchedules)
          .set({
            status: "completed",
            executedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(publishingSchedules.id, schedule.id));

        console.log(`[Scheduled Publishing] Successfully executed schedule ${schedule.id}`);
      } else {
        // All publishing attempts failed
        const errorMessage = [
          ...result.results.wordpress.filter((r: any) => !r.success).map((r: any) => `WP: ${r.message}`),
          ...result.results.manus.filter((r: any) => !r.success).map((r: any) => `Manus: ${r.message}`),
        ].join('; ');

        await db
          .update(publishingSchedules)
          .set({
            status: "failed",
            errorMessage: errorMessage || "All publishing attempts failed",
            executedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(publishingSchedules.id, schedule.id));

        console.error(`[Scheduled Publishing] Failed to execute schedule ${schedule.id}: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error(`[Scheduled Publishing] Error processing schedule ${schedule.id}:`, error);

      // Mark as failed
      await db
        .update(publishingSchedules)
        .set({
          status: "failed",
          errorMessage: error.message || "Unknown error",
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(publishingSchedules.id, schedule.id));
    }
  }

  console.log('[Scheduled Publishing] Finished processing scheduled tasks');
}

// Export a function that can be called via API endpoint for manual triggering
export async function triggerScheduledPublishing() {
  try {
    await processScheduledPublishing();
    return { success: true, message: 'Scheduled publishing processed' };
  } catch (error: any) {
    console.error('[Scheduled Publishing] Error:', error);
    return { success: false, message: error.message };
  }
}
