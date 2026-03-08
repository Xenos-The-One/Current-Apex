import { getDb } from "./seo-db";
import { content, contentAnalytics } from "../drizzle/seo-schema";
import { eq, desc, and, gte } from "drizzle-orm";

/**
 * Track performance metrics for published content
 * This is a simplified tracking system - can be extended with Google Analytics/Search Console APIs
 */

export interface PerformanceMetrics {
  contentId: number;
  views: number;
  clicks: number;
  impressions: number;
  averagePosition: number;
  ctr: number; // Click-through rate
  conversionRate: number;
  conversions: number;
}

/**
 * Update performance metrics for content
 */
export async function updatePerformanceMetrics(metrics: PerformanceMetrics) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if analytics record exists
  const existing = await db.select()
    .from(contentAnalytics)
    .where(eq(contentAnalytics.contentId, metrics.contentId))
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    await db.update(contentAnalytics)
      .set({
        views: metrics.views,
        clicks: metrics.clicks,
        shares: existing[0].shares, // Preserve existing shares
        recordedAt: new Date(),
      })
      .where(eq(contentAnalytics.contentId, metrics.contentId));
  } else {
    // Create new record
    await db.insert(contentAnalytics).values({
      contentId: metrics.contentId,
      views: metrics.views,
      clicks: metrics.clicks,
      shares: 0,
      engagementRate: 0,
      avgTimeOnPage: 0,
      conversions: metrics.conversions,
      recordedAt: new Date(),
    });
  }

  return { success: true };
}

/**
 * Get performance metrics for content
 */
export async function getContentPerformance(contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [analytics] = await db.select()
    .from(contentAnalytics)
    .where(eq(contentAnalytics.contentId, contentId))
    .limit(1);

  if (!analytics) {
    return {
      views: 0,
      clicks: 0,
      shares: 0,
      avgTimeOnPage: 0,
      engagementRate: 0,
      conversions: 0,
    };
  }

  return analytics;
}

/**
 * Get top performing content
 */
export async function getTopPerformingContent(limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const topContent = await db.select({
    id: content.id,
    title: content.title,
    topic: content.topic,
    status: content.status,
    views: contentAnalytics.views,
    clicks: contentAnalytics.clicks,
    shares: contentAnalytics.shares,
    engagementRate: contentAnalytics.engagementRate,
    conversions: contentAnalytics.conversions,
  })
    .from(content)
    .leftJoin(contentAnalytics, eq(content.id, contentAnalytics.contentId))
    .where(eq(content.status, "approved"))
    .orderBy(desc(contentAnalytics.views))
    .limit(limit);

  return topContent;
}

/**
 * Get performance summary for all content
 */
export async function getPerformanceSummary() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allAnalytics = await db.select()
    .from(contentAnalytics);

  const totalViews = allAnalytics.reduce((sum, a) => sum + (a.views || 0), 0);
  const totalClicks = allAnalytics.reduce((sum, a) => sum + (a.clicks || 0), 0);
  const totalShares = allAnalytics.reduce((sum, a) => sum + (a.shares || 0), 0);
  const totalConversions = allAnalytics.reduce((sum, a) => sum + (a.conversions || 0), 0);
  
  const avgEngagementRate = allAnalytics.length > 0
    ? allAnalytics.reduce((sum, a) => sum + (a.engagementRate || 0), 0) / allAnalytics.length
    : 0;

  return {
    totalViews,
    totalClicks,
    totalShares,
    totalConversions,
    avgEngagementRate,
    contentCount: allAnalytics.length,
  };
}

/**
 * Track content view (simple internal tracking)
 */
export async function trackContentView(contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select()
    .from(contentAnalytics)
    .where(eq(contentAnalytics.contentId, contentId))
    .limit(1);

  if (existing) {
    await db.update(contentAnalytics)
      .set({
        views: (existing.views || 0) + 1,
        recordedAt: new Date(),
      })
      .where(eq(contentAnalytics.contentId, contentId));
  } else {
    await db.insert(contentAnalytics).values({
      contentId,
      views: 1,
      clicks: 0,
      shares: 0,
      engagementRate: 0,
      avgTimeOnPage: 0,
      conversions: 0,
      recordedAt: new Date(),
    });
  }

  return { success: true };
}

/**
 * Track content click
 */
export async function trackContentClick(contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select()
    .from(contentAnalytics)
    .where(eq(contentAnalytics.contentId, contentId))
    .limit(1);

  if (existing) {
    await db.update(contentAnalytics)
      .set({
        clicks: (existing.clicks || 0) + 1,
        recordedAt: new Date(),
      })
      .where(eq(contentAnalytics.contentId, contentId));
  }

  return { success: true };
}

/**
 * Get performance trends over time
 */
export async function getPerformanceTrends(days: number = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const since = new Date();
  since.setDate(since.getDate() - days);

  const recentAnalytics = await db.select({
    contentId: contentAnalytics.contentId,
    title: content.title,
    views: contentAnalytics.views,
    clicks: contentAnalytics.clicks,
    recordedAt: contentAnalytics.recordedAt,
  })
    .from(contentAnalytics)
    .leftJoin(content, eq(contentAnalytics.contentId, content.id))
    .where(gte(contentAnalytics.recordedAt, since))
    .orderBy(desc(contentAnalytics.recordedAt));

  return recentAnalytics;
}
