import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";
import { getDb } from "../db";
import { campaignTemplates } from "../../drizzle/schema";
import { eq, or, isNull } from "drizzle-orm";

export const campaignsMonitoringRouter = router({
  /**
   * List all campaigns
   */
  list: protectedProcedure
    .input(
      z.object({
        agencyId: z.number(),
        dateRange: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const conn = await mysql.createConnection(ENV.databaseUrl);

      try {
        let whereClause = "WHERE agency_id = ?";
        const params: any[] = [input.agencyId];

        if (input.dateRange && input.dateRange !== 'all_time') {
          const dateConditions: Record<string, string> = {
            today: "AND DATE(created_at) = CURDATE()",
            yesterday: "AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
            last_7_days: "AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
            last_30_days: "AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)",
          };
          whereClause += ` ${dateConditions[input.dateRange] || ''}`;
        }

        const [campaigns] = await conn.query<any>(
          `SELECT * FROM campaigns ${whereClause} ORDER BY created_at DESC`,
          params
        );

        return campaigns;
      } finally {
        await conn.end();
      }
    }),

  /**
   * Get campaign messages
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().optional(),
        dateRange: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const conn = await mysql.createConnection(ENV.databaseUrl);

      try {
        let whereClause = "WHERE 1=1";
        const params: any[] = [];

        if (input.campaignId) {
          whereClause += " AND campaign_id = ?";
          params.push(input.campaignId);
        }

        if (input.dateRange && input.dateRange !== 'all_time') {
          const dateConditions: Record<string, string> = {
            today: "AND DATE(created_at) = CURDATE()",
            yesterday: "AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
            last_7_days: "AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
            last_30_days: "AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)",
          };
          whereClause += ` ${dateConditions[input.dateRange] || ''}`;
        }

        const [messages] = await conn.query<any>(
          `SELECT * FROM campaign_messages ${whereClause} ORDER BY created_at DESC LIMIT 100`,
          params
        );

        return messages;
      } finally {
        await conn.end();
      }
    }),

  /**
   * Get campaign stats
   */
  getStats: protectedProcedure
    .input(
      z.object({
        agencyId: z.number(),
        dateRange: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const conn = await mysql.createConnection(ENV.databaseUrl);

      try {
        let whereClause = "WHERE c.agency_id = ?";
        const params: any[] = [input.agencyId];

        if (input.dateRange && input.dateRange !== 'all_time') {
          const dateConditions: Record<string, string> = {
            today: "AND DATE(cm.created_at) = CURDATE()",
            yesterday: "AND DATE(cm.created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)",
            last_7_days: "AND cm.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)",
            last_30_days: "AND cm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)",
          };
          whereClause += ` ${dateConditions[input.dateRange] || ''}`;
        }

        const [stats] = await conn.query<any>(
          `SELECT 
            COUNT(*) as totalSent,
            SUM(CASE WHEN cm.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
            SUM(CASE WHEN cm.status = 'opened' THEN 1 ELSE 0 END) as opened,
            SUM(CASE WHEN cm.status = 'clicked' THEN 1 ELSE 0 END) as clicked,
            SUM(CASE WHEN cm.status IN ('failed', 'bounced') THEN 1 ELSE 0 END) as failed,
            ROUND(SUM(CASE WHEN cm.status = 'delivered' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as deliveryRate,
            ROUND(SUM(CASE WHEN cm.status = 'opened' THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as openRate,
            ROUND(SUM(CASE WHEN cm.status IN ('failed', 'bounced') THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) as failureRate
          FROM campaigns c
          LEFT JOIN campaign_messages cm ON c.id = cm.campaign_id
          ${whereClause}`,
          params
        );

        return stats[0] || {
          totalSent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          failed: 0,
          deliveryRate: 0,
          openRate: 0,
          failureRate: 0,
        };
      } finally {
        await conn.end();
      }
    }),

  /**
   * List campaign templates (email + SMS) for the given agency
   */
  listTemplates: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        const templates = await db
          .select()
          .from(campaignTemplates)
          .where(
            or(
              eq(campaignTemplates.agencyId, input.agencyId),
              isNull(campaignTemplates.agencyId)
            )
          );
        return templates;
      } catch {
        return [];
      }
    }),
});
