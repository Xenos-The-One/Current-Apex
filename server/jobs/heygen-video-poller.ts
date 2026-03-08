/**
 * HeyGen Video Poller
 *
 * Runs every 60 seconds. Checks all contentPackages where heygenVideoStatus = 'processing'.
 * On completion: updates URL, moves package to 'pending_approval', sends push notification.
 * On failure: marks failed, sends alert notification.
 */

import { getDb } from "../seo-db";
import { getVideoStatus } from "../heygen";
import { notifyOwner } from "../_core/notification";

export async function pollHeyGenVideos(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { contentPackages } = await import("../../drizzle/seo-schema");
  const { eq } = await import("drizzle-orm");

  // Find all packages with videos currently processing
  const processing = await db
    .select()
    .from(contentPackages)
    .where(eq(contentPackages.heygenVideoStatus, "processing"));

  if (processing.length === 0) return;

  console.log(`[HeyGen Poller] Checking ${processing.length} video(s) in progress...`);

  for (const pkg of processing) {
    if (!pkg.heygenVideoId) continue;

    try {
      const status = await getVideoStatus(pkg.heygenVideoId);

      if (status.status === "completed" && status.video_url) {
        // Video is ready — move to pending_approval
        await db.update(contentPackages)
          .set({
            heygenVideoStatus: "completed",
            heygenVideoUrl: status.video_url,
            heygenThumbnailUrl: status.thumbnail_url ?? null,
            status: "pending_approval",
          })
          .where(eq(contentPackages.id, pkg.id));

        console.log(`[HeyGen Poller] ✅ Video ready for package #${pkg.id} (keyword: "${pkg.keyword}")`);

        // Notify owner
        await notifyOwner({
          title: "Content Package Ready for Approval",
          content: `The video for "${pkg.keyword}" has finished rendering. Review and approve the full content package (blog + video + social + email) in the Content Hub.`,
        });

      } else if (status.status === "failed") {
        // Video failed — mark package as failed
        await db.update(contentPackages)
          .set({
            heygenVideoStatus: "failed",
            status: "failed",
            errorMessage: status.error ?? "HeyGen video rendering failed",
          })
          .where(eq(contentPackages.id, pkg.id));

        console.error(`[HeyGen Poller] ❌ Video failed for package #${pkg.id}: ${status.error}`);

        await notifyOwner({
          title: "Content Package Video Failed",
          content: `HeyGen video rendering failed for keyword "${pkg.keyword}". Error: ${status.error ?? "Unknown error"}. You can reject and regenerate the package.`,
        });

      } else {
        // Still processing — log and continue
        console.log(`[HeyGen Poller] ⏳ Package #${pkg.id} still ${status.status}...`);
      }
    } catch (err) {
      console.error(`[HeyGen Poller] Error checking video ${pkg.heygenVideoId}:`, err);
    }
  }
}
