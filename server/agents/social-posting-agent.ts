/**
 * Social Posting Agent
 *
 * Reads approved content packages from the Content Hub and posts them
 * to Facebook, Instagram, TikTok, and YouTube.
 *
 * Flow:
 * 1. Find approved packages with completed HeyGen videos
 * 2. Match each package to the correct brand (Tim the Home Loan Coach or Coach Tim)
 * 3. Post to the correct platforms for that brand
 * 4. Update social_media_posts record with platform post ID
 * 5. Mark content package as "published"
 *
 * Platform rules:
 * - Tim the Home Loan Coach (seoClientId=30001): Facebook + Instagram + TikTok
 * - Coach Tim (seoClientId=30002): YouTube + Facebook + Instagram + TikTok
 */

import { getDb } from "../seo-db";
import { notifyOwner } from "../_core/notification";

const HOME_LOAN_COACH_SEO_ID = 30001;
const COACH_TIM_SEO_ID = 30002;

// Platform configs per brand
const BRAND_PLATFORMS: Record<number, string[]> = {
  [HOME_LOAN_COACH_SEO_ID]: ["facebook", "instagram", "tiktok"],
  [COACH_TIM_SEO_ID]: ["youtube", "facebook", "instagram", "tiktok"],
};

export interface PostResult {
  platform: string;
  success: boolean;
  platformPostId?: string;
  error?: string;
}

/**
 * Main entry point — scans for approved packages and posts them.
 * Called by cron job every 30 minutes.
 */
export async function processApprovedPackages(): Promise<void> {
  const db = await getDb();
  if (!db) return;

      const { contentPackages, seoClients } = await import("../../drizzle/seo-schema");
      const { eq, and } = await import("drizzle-orm");

      // Find approved packages with completed videos
      const approved = await db.select({
        pkg: contentPackages,
        client: seoClients,
      })
        .from(contentPackages)
        .innerJoin(seoClients, eq(contentPackages.clientId, seoClients.id))
        .where(and(
          eq(contentPackages.status, "approved"),
          eq(contentPackages.heygenVideoStatus, "completed")
        ));

  if (approved.length === 0) {
    console.log("[SocialPostingAgent] No approved packages ready to post");
    return;
  }

  console.log(`[SocialPostingAgent] Found ${approved.length} package(s) ready to post`);

  for (const { pkg, client } of approved) {
    try {
      await postPackageToSocial(pkg, client);
    } catch (err) {
      console.error(`[SocialPostingAgent] Failed to post package #${pkg.id}:`, err);
    }
  }
}

/**
 * Get the next available posting slot for a brand/platform based on its schedule.
 * Returns null if no schedule is configured (post immediately).
 */
async function getNextScheduledSlot(
  seoClientId: number,
  platform: string,
  afterMs: number = Date.now()
): Promise<Date | null> {
  try {
    const mysql = await import("mysql2/promise");
    const conn = await mysql.createConnection(process.env.DATABASE_URL!);

    const [schedRows] = await conn.execute(
      "SELECT * FROM brand_posting_schedules WHERE seo_client_id = ? AND platform = ? AND enabled = 1",
      [seoClientId, platform]
    ) as [any[], any];

    if (!schedRows.length) {
      await conn.end();
      return null; // No schedule = post immediately
    }

    const sched = schedRows[0];
    const daysOfWeek: number[] = typeof sched.days_of_week === "string" ? JSON.parse(sched.days_of_week) : sched.days_of_week;
    const postTimes: string[] = typeof sched.post_times === "string" ? JSON.parse(sched.post_times) : sched.post_times;
    const maxPerDay: number = sched.max_posts_per_day ?? 1;

    // Get already-scheduled posts for this brand/platform in the next 30 days
    const [existingPosts] = await conn.execute(
      `SELECT scheduled_at FROM social_posts
       WHERE seo_client_id = ? AND platform = ? AND scheduled_at > ?
       ORDER BY scheduled_at ASC`,
      [seoClientId, platform, afterMs]
    ) as [any[], any];
    await conn.end();

    // Find next available slot
    const now = new Date(afterMs);
    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const candidate = new Date(now.getTime() + dayOffset * 86400000);
      const dayOfWeek = candidate.getUTCDay();

      if (!daysOfWeek.includes(dayOfWeek)) continue;

      const dateKey = `${candidate.getUTCFullYear()}-${candidate.getUTCMonth()}-${candidate.getUTCDate()}`;
      const postsOnDay = existingPosts.filter((p: any) => {
        const d = new Date(p.scheduled_at);
        return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}` === dateKey;
      }).length;

      if (postsOnDay >= maxPerDay) continue;

      // Pick the first available time slot
      for (const timeStr of postTimes) {
        const [hh, mm] = timeStr.split(":").map(Number);
        const slotDate = new Date(candidate);
        slotDate.setUTCHours(hh + 8, mm, 0, 0); // PST offset (UTC-8)
        if (slotDate.getTime() > afterMs) {
          return slotDate;
        }
      }
    }
    return null; // No slot found in 60 days
  } catch (err) {
    console.error("[SocialPostingAgent] Schedule lookup failed:", err);
    return null;
  }
}

/**
 * Post a single approved content package to all platforms for its brand.
 * Respects brand posting schedules — schedules future posts instead of posting immediately
 * when a schedule is configured.
 */
export async function postPackageToSocial(pkg: any, client: any): Promise<PostResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const { contentPackages, socialPosts } = await import("../../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");

      const platforms = BRAND_PLATFORMS[client.id] ?? ["facebook", "instagram"];
      const captions: Array<{ platform: string; caption: string }> = pkg.socialCaptionsJson
        ? JSON.parse(pkg.socialCaptionsJson)
        : [];

  const results: PostResult[] = [];
  const now = Date.now();

  for (const platform of platforms) {
    const captionObj = captions.find(c => c.platform === platform) ?? captions[0];
    const caption = captionObj?.caption ?? pkg.keyword;

    try {
      // Check if there's a posting schedule for this brand/platform
      const scheduledSlot = await getNextScheduledSlot(client.id, platform, now);

      if (scheduledSlot && scheduledSlot.getTime() > now + 60000) {
        // Future slot found — schedule the post instead of posting immediately
        await db.insert(socialPosts).values({
          seoClientId: client.id,
          contentPackageId: pkg.id,
          platform: platform as any,
          postType: "video",
          caption,
          videoUrl: pkg.heygenVideoUrl,
          thumbnailUrl: pkg.heygenThumbnailUrl,
          status: "scheduled",
          scheduledAt: scheduledSlot,
          notes: `Scheduled for ${scheduledSlot.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} PST`,
        } as any);

        results.push({ platform, success: true, platformPostId: `scheduled:${scheduledSlot.toISOString()}` });
        console.log(`[SocialPostingAgent] 📅 ${platform}: scheduled for ${scheduledSlot.toISOString()}`);
        continue;
      }

      // No schedule or slot is now — post immediately
      let platformPostId: string | undefined;

      switch (platform) {
        case "facebook":
          platformPostId = await postToFacebook(pkg.heygenVideoUrl!, caption, client);
          break;
        case "instagram":
          platformPostId = await postToInstagram(pkg.heygenVideoUrl!, caption, client);
          break;
        case "tiktok":
          // TikTok requires manual upload via Creator Portal — create a draft record
          platformPostId = await createTikTokDraft(pkg.heygenVideoUrl!, caption, client);
          break;
        case "youtube":
          // YouTube requires OAuth — create a draft record for manual upload
          platformPostId = await createYouTubeDraft(pkg.heygenVideoUrl!, caption, pkg.keyword, client);
          break;
      }

      // Record the post in social_posts
      await db.insert(socialPosts).values({
        seoClientId: client.id,
        contentPackageId: pkg.id,
        platform: platform as any,
        postType: "video",
        caption,
        videoUrl: pkg.heygenVideoUrl,
        thumbnailUrl: pkg.heygenThumbnailUrl,
        platformPostId,
        status: platformPostId ? "posted" : "draft",
        postedAt: platformPostId ? new Date() : undefined,
        notes: platformPostId ? undefined : `Requires manual upload — draft created`,
      } as any);

      results.push({ platform, success: !!platformPostId, platformPostId });
      console.log(`[SocialPostingAgent] ${platformPostId ? "✅" : "📋"} ${platform}: ${platformPostId ?? "draft created"}`);
    } catch (err: any) {
      results.push({ platform, success: false, error: err.message });
      console.error(`[SocialPostingAgent] ❌ ${platform} failed:`, err.message);

      // Record failed post
      await db.insert(socialPosts).values({
        seoClientId: client.id,
        contentPackageId: pkg.id,
        platform: platform as any,
        postType: "video",
        caption,
        videoUrl: pkg.heygenVideoUrl,
        status: "failed",
        errorMessage: err.message,
      } as any);
    }
  }

  // Mark package as published
  const allPosted = results.some(r => r.success);
  if (allPosted) {
    await db.update(contentPackages)
      .set({ status: "published", publishedAt: new Date() })
      .where(eq(contentPackages.id, pkg.id));

    await notifyOwner({
      title: `Content Posted — ${client.businessName}`,
      content: `"${pkg.keyword}" posted to ${results.filter(r => r.success).map(r => r.platform).join(", ")}. ${results.filter(r => !r.success).length > 0 ? `Failed: ${results.filter(r => !r.success).map(r => r.platform).join(", ")}` : ""}`,
    });
  }

  return results;
}

/**
 * Post a video to Facebook Page.
 * Requires a valid Page Access Token with pages_manage_posts + video_upload permissions.
 */
async function postToFacebook(videoUrl: string, caption: string, client: any): Promise<string> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN not configured");

  // Get the page ID from client config
  const pageId = await getFacebookPageId(token, client);

  // Step 1: Initialize video upload
  const initResp = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/videos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: videoUrl,
        description: caption,
        access_token: token,
        published: true,
      }),
    }
  );

  const initData = await initResp.json() as any;
  if (initData.error) {
    throw new Error(`Facebook API error: ${initData.error.message}`);
  }

  return initData.id;
}

/**
 * Post a video to Instagram Business Account via Facebook Graph API.
 */
async function postToInstagram(videoUrl: string, caption: string, client: any): Promise<string> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN not configured");

  // Get Instagram Business Account ID linked to the Facebook Page
  const pageId = await getFacebookPageId(token, client);
  const igAccountResp = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${token}`
  );
  const igAccountData = await igAccountResp.json() as any;

  if (!igAccountData.instagram_business_account?.id) {
    throw new Error("No Instagram Business Account linked to this Facebook Page");
  }

  const igAccountId = igAccountData.instagram_business_account.id;

  // Step 1: Create media container
  const containerResp = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption,
        access_token: token,
      }),
    }
  );

  const containerData = await containerResp.json() as any;
  if (containerData.error) {
    throw new Error(`Instagram container error: ${containerData.error.message}`);
  }

  const containerId = containerData.id;

  // Step 2: Wait for container to be ready (poll up to 60s)
  let ready = false;
  for (let i = 0; i < 12; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const statusResp = await fetch(
      `https://graph.facebook.com/v19.0/${containerId}?fields=status_code&access_token=${token}`
    );
    const statusData = await statusResp.json() as any;
    if (statusData.status_code === "FINISHED") { ready = true; break; }
    if (statusData.status_code === "ERROR") throw new Error("Instagram media processing failed");
  }

  if (!ready) throw new Error("Instagram media container timed out");

  // Step 3: Publish
  const publishResp = await fetch(
    `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: token,
      }),
    }
  );

  const publishData = await publishResp.json() as any;
  if (publishData.error) {
    throw new Error(`Instagram publish error: ${publishData.error.message}`);
  }

  return publishData.id;
}

/**
 * TikTok requires manual upload via Creator Portal.
 * Creates a draft record with the video URL for Tariq/Tim to upload.
 */
async function createTikTokDraft(videoUrl: string, caption: string, client: any): Promise<string | undefined> {
  // TikTok Content Posting API requires TikTok for Business approval
  // For now, create a draft record and notify for manual upload
  console.log(`[SocialPostingAgent] TikTok draft created for ${client.businessName}: ${videoUrl}`);
  
  await notifyOwner({
    title: `TikTok Post Ready — ${client.businessName}`,
    content: `Video ready for TikTok upload. Caption: "${caption.substring(0, 100)}..." Video URL: ${videoUrl}`,
  });

  return undefined; // No platform ID until manually posted
}

/**
 * YouTube requires OAuth. Creates a draft record and notifies for upload.
 * Long-form videos are uploaded manually via YouTube Studio.
 */
async function createYouTubeDraft(videoUrl: string, description: string, title: string, client: any): Promise<string | undefined> {
  console.log(`[SocialPostingAgent] YouTube draft created for ${client.businessName}: ${title}`);

  await notifyOwner({
    title: `YouTube Video Ready — ${client.businessName}`,
    content: `Video ready for YouTube upload. Title: "${title}". Description ready. Video URL: ${videoUrl}`,
  });

  return undefined;
}

/**
 * Get the Facebook Page ID for a client.
 * Uses the page name stored in client.socialFacebook.
 */
async function getFacebookPageId(token: string, client: any): Promise<string> {
  // For Tim the Home Loan Coach — use the Home Loan Coach page
  // For Coach Tim — use Tim Haskins personal page
  const resp = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${token}`
  );
  const data = await resp.json() as any;

  if (data.error) {
    throw new Error(`Facebook token error: ${data.error.message}. Token may be expired — please refresh in Settings → Social Media.`);
  }

  const pages = data.data ?? [];
  if (pages.length === 0) {
    throw new Error("No Facebook Pages found for this token");
  }

  // Try to match by client's socialFacebook field
  if (client.socialFacebook) {
    const match = pages.find((p: any) =>
      p.name?.toLowerCase().includes(client.socialFacebook?.toLowerCase() ?? "") ||
      p.id === client.socialFacebook
    );
    if (match) return match.id;
  }

  // Default to first page
  return pages[0].id;
}

/**
 * Manually post a specific video URL to a platform.
 * Used from the Content Studio UI for Tim's Nevada video and future manual posts.
 */
export async function manualPost(params: {
  seoClientId: number;
  platform: "facebook" | "instagram" | "tiktok" | "youtube";
  videoUrl: string;
  caption: string;
  contentPackageId?: number;
}): Promise<PostResult> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const { seoClients, socialPosts } = await import("../../drizzle/seo-schema");
  const { eq } = await import("drizzle-orm");

  const [client] = await db.select().from(seoClients).where(eq(seoClients.id, params.seoClientId));
  if (!client) throw new Error(`SEO client ${params.seoClientId} not found`);

  let platformPostId: string | undefined;
  let error: string | undefined;

  try {
    switch (params.platform) {
      case "facebook":
        platformPostId = await postToFacebook(params.videoUrl, params.caption, client);
        break;
      case "instagram":
        platformPostId = await postToInstagram(params.videoUrl, params.caption, client);
        break;
      case "tiktok":
        platformPostId = await createTikTokDraft(params.videoUrl, params.caption, client);
        break;
      case "youtube":
        platformPostId = await createYouTubeDraft(params.videoUrl, params.caption, params.caption, client);
        break;
    }
  } catch (err: any) {
    error = err.message;
  }

  // Record in social_posts
  await db.insert(socialPosts).values({
    seoClientId: params.seoClientId,
    contentPackageId: params.contentPackageId,
    platform: params.platform,
    postType: "video",
    caption: params.caption,
    videoUrl: params.videoUrl,
    platformPostId,
    status: error ? "failed" : platformPostId ? "posted" : "draft",
    postedAt: platformPostId ? new Date() : undefined,
    errorMessage: error,
  } as any);

  return { platform: params.platform, success: !error, platformPostId, error };
}

/**
 * Fire all scheduled posts whose scheduled_at time has arrived.
 * Called every 5 minutes by cron. Reads social_posts with status='scheduled'
 * and scheduled_at <= now, then posts them to the appropriate platform.
 */
export async function fireScheduledPosts(): Promise<void> {
  try {
    const mysql = await import("mysql2/promise");
    const conn = await mysql.createConnection(process.env.DATABASE_URL!);

    const now = new Date();
    const [duePosts] = await conn.execute(
      `SELECT sp.*, sc.id as client_id, sc.businessName as business_name, sc.heygenAvatarId as heygen_avatar_id,
              sc.facebookPageId as facebook_page_id, sc.heygenBrandSystemName as brand_system_name
       FROM social_posts sp
       JOIN seo_clients sc ON sp.seo_client_id = sc.id
       WHERE sp.status = 'scheduled' AND sp.scheduled_at <= ?
       LIMIT 20`,
      [now]
    ) as [any[], any];

    if (!duePosts.length) {
      await conn.end();
      return;
    }

    console.log(`[ScheduledPostsExecutor] ${duePosts.length} post(s) due to fire`);

    for (const post of duePosts) {
      try {
        const client = {
          id: post.client_id,
          businessName: post.business_name,
          heygenAvatarId: post.heygen_avatar_id,
          facebookPageId: post.facebook_page_id,
          heygenBrandSystemName: post.brand_system_name,
        };

        let platformPostId: string | undefined;
        let error: string | undefined;

        try {
          switch (post.platform) {
            case "facebook":
              platformPostId = await postToFacebook(post.video_url, post.caption, client);
              break;
            case "instagram":
              platformPostId = await postToInstagram(post.video_url, post.caption, client);
              break;
            case "tiktok":
              platformPostId = await createTikTokDraft(post.video_url, post.caption, client);
              break;
            case "youtube":
              platformPostId = await createYouTubeDraft(post.video_url, post.caption, post.caption?.slice(0, 60) ?? "Video", client);
              break;
          }
        } catch (err: any) {
          error = err.message;
        }

        const newStatus = error ? "failed" : platformPostId ? "posted" : "draft";
        await conn.execute(
          `UPDATE social_posts SET status = ?, platform_post_id = ?, posted_at = ?, error_message = ? WHERE id = ?`,
          [newStatus, platformPostId ?? null, platformPostId ? now : null, error ?? null, post.id]
        );

        console.log(`[ScheduledPostsExecutor] ${newStatus === "posted" ? "✅" : newStatus === "draft" ? "📋" : "❌"} ${post.platform} post #${post.id}: ${platformPostId ?? error ?? "draft"}`);
      } catch (err: any) {
        console.error(`[ScheduledPostsExecutor] Failed to fire post #${post.id}:`, err.message);
        await conn.execute(
          `UPDATE social_posts SET status = 'failed', error_message = ? WHERE id = ?`,
          [err.message, post.id]
        );
      }
    }

    await conn.end();
  } catch (err: any) {
    console.error("[ScheduledPostsExecutor] Fatal error:", err.message);
  }
}
