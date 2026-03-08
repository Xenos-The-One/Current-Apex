import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { wordpressPublishHistory, manusPublishHistory, content, wordpressConnections, manusWebsites } from "../../../drizzle/seo-schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

/**
 * Publishing Analytics Router - tracks and analyzes publishing performance across platforms
 */
export const publishingAnalyticsRouter = router({
  // Get overall publishing statistics
  getOverallStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // WordPress stats
    const [wpStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        successful: sql<number>`SUM(CASE WHEN ${wordpressPublishHistory.success} = 1 THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN ${wordpressPublishHistory.success} = 0 THEN 1 ELSE 0 END)`,
      })
      .from(wordpressPublishHistory);

    // Manus stats
    const [manusStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        successful: sql<number>`SUM(CASE WHEN ${manusPublishHistory.success} = 1 THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN ${manusPublishHistory.success} = 0 THEN 1 ELSE 0 END)`,
      })
      .from(manusPublishHistory);

    return {
      wordpress: {
        total: Number(wpStats?.total || 0),
        successful: Number(wpStats?.successful || 0),
        failed: Number(wpStats?.failed || 0),
        successRate: wpStats?.total ? (Number(wpStats.successful) / Number(wpStats.total)) * 100 : 0,
      },
      manus: {
        total: Number(manusStats?.total || 0),
        successful: Number(manusStats?.successful || 0),
        failed: Number(manusStats?.failed || 0),
        successRate: manusStats?.total ? (Number(manusStats.successful) / Number(manusStats.total)) * 100 : 0,
      },
      combined: {
        total: Number(wpStats?.total || 0) + Number(manusStats?.total || 0),
        successful: Number(wpStats?.successful || 0) + Number(manusStats?.successful || 0),
        failed: Number(wpStats?.failed || 0) + Number(manusStats?.failed || 0),
      },
    };
  }),

  // Get publishing history for a specific content
  getContentPublishHistory: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // WordPress history
      const wpHistory = await db
        .select({
          id: wordpressPublishHistory.id,
          platform: sql<string>`'wordpress'`,
          siteName: wordpressConnections.siteName,
          url: wordpressPublishHistory.wordpressPostUrl,
          success: wordpressPublishHistory.success,
          errorMessage: wordpressPublishHistory.errorMessage,
          publishedAt: wordpressPublishHistory.publishedAt,
        })
        .from(wordpressPublishHistory)
        .leftJoin(wordpressConnections, eq(wordpressPublishHistory.connectionId, wordpressConnections.id))
        .where(eq(wordpressPublishHistory.contentId, input.contentId))
        .orderBy(desc(wordpressPublishHistory.publishedAt));

      // Manus history
      const manusHistoryData = await db
        .select({
          id: manusPublishHistory.id,
          platform: sql<string>`'manus'`,
          siteName: manusWebsites.projectTitle,
          url: manusPublishHistory.publishedUrl,
          success: manusPublishHistory.success,
          errorMessage: manusPublishHistory.errorMessage,
          publishedAt: manusPublishHistory.publishedAt,
        })
        .from(manusPublishHistory)
        .leftJoin(manusWebsites, eq(manusPublishHistory.websiteId, manusWebsites.id))
        .where(eq(manusPublishHistory.contentId, input.contentId))
        .orderBy(desc(manusPublishHistory.publishedAt));

      // Combine and sort by date
      const combined = [...wpHistory, ...manusHistoryData].sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      return combined;
    }),

  // Get top performing content by publish count
  getTopPublishedContent: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Get content with publish counts
      const topContent = await db
        .select({
          contentId: content.id,
          title: content.title,
          wpPublishCount: sql<number>`(
            SELECT COUNT(*) 
            FROM ${wordpressPublishHistory} 
            WHERE ${wordpressPublishHistory.contentId} = ${content.id} 
            AND ${wordpressPublishHistory.success} = 1
          )`,
          manusPublishCount: sql<number>`(
            SELECT COUNT(*) 
            FROM ${manusPublishHistory} 
            WHERE ${manusPublishHistory.contentId} = ${content.id} 
            AND ${manusPublishHistory.success} = 1
          )`,
        })
        .from(content)
        .orderBy(sql`(
          (SELECT COUNT(*) FROM ${wordpressPublishHistory} WHERE ${wordpressPublishHistory.contentId} = ${content.id} AND ${wordpressPublishHistory.success} = 1) +
          (SELECT COUNT(*) FROM ${manusPublishHistory} WHERE ${manusPublishHistory.contentId} = ${content.id} AND ${manusPublishHistory.success} = 1)
        ) DESC`)
        .limit(input.limit);

      return topContent.map(item => ({
        ...item,
        totalPublishes: Number(item.wpPublishCount) + Number(item.manusPublishCount),
      }));
    }),

  // Get recent publishing activity
  getRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // WordPress recent activity
      const wpActivity = await db
        .select({
          id: wordpressPublishHistory.id,
          platform: sql<string>`'wordpress'`,
          contentTitle: content.title,
          siteName: wordpressConnections.siteName,
          url: wordpressPublishHistory.wordpressPostUrl,
          success: wordpressPublishHistory.success,
          publishedAt: wordpressPublishHistory.publishedAt,
        })
        .from(wordpressPublishHistory)
        .leftJoin(content, eq(wordpressPublishHistory.contentId, content.id))
        .leftJoin(wordpressConnections, eq(wordpressPublishHistory.connectionId, wordpressConnections.id))
        .orderBy(desc(wordpressPublishHistory.publishedAt))
        .limit(input.limit);

      // Manus recent activity
      const manusActivity = await db
        .select({
          id: manusPublishHistory.id,
          platform: sql<string>`'manus'`,
          contentTitle: content.title,
          siteName: manusWebsites.projectTitle,
          url: manusPublishHistory.publishedUrl,
          success: manusPublishHistory.success,
          publishedAt: manusPublishHistory.publishedAt,
        })
        .from(manusPublishHistory)
        .leftJoin(content, eq(manusPublishHistory.contentId, content.id))
        .leftJoin(manusWebsites, eq(manusPublishHistory.websiteId, manusWebsites.id))
        .orderBy(desc(manusPublishHistory.publishedAt))
        .limit(input.limit);

      // Combine and sort by date
      const combined = [...wpActivity, ...manusActivity]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, input.limit);

      return combined;
    }),

  // Get publishing trends over time (last 30 days)
  getPublishingTrends: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // WordPress trends
    const wpTrends = await db
      .select({
        date: sql<string>`DATE(${wordpressPublishHistory.publishedAt}) as date`,
        count: sql<number>`COUNT(*) as count`,
        successful: sql<number>`SUM(CASE WHEN ${wordpressPublishHistory.success} = 1 THEN 1 ELSE 0 END) as successful`,
      })
      .from(wordpressPublishHistory)
      .where(gte(wordpressPublishHistory.publishedAt, thirtyDaysAgo))
      .groupBy(sql`date`)
      .orderBy(sql`date`);

    // Manus trends
    const manusTrends = await db
      .select({
        date: sql<string>`DATE(${manusPublishHistory.publishedAt}) as date`,
        count: sql<number>`COUNT(*) as count`,
        successful: sql<number>`SUM(CASE WHEN ${manusPublishHistory.success} = 1 THEN 1 ELSE 0 END) as successful`,
      })
      .from(manusPublishHistory)
      .where(gte(manusPublishHistory.publishedAt, thirtyDaysAgo))
      .groupBy(sql`date`)
      .orderBy(sql`date`);

    return {
      wordpress: wpTrends,
      manus: manusTrends,
    };
  }),
});
