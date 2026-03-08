import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { googleAnalyticsConnections } from "../../../drizzle/seo-schema";
import { eq, and } from "drizzle-orm";
import {
  getGAConnection,
  fetchGAMetrics,
  fetchGAPageMetrics,
  fetchKeywordData,
  syncContentPerformance,
} from "../../googleAnalytics";

export const googleAnalyticsRouter = router({
  // Get GA connection for a client
  get: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return getGAConnection(input.clientId);
    }),

  // Create or update GA connection
  upsert: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        propertyId: z.string(),
        viewId: z.string().optional(),
        serviceAccountEmail: z.string().optional(),
        serviceAccountKey: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if connection exists
      const existing = await getGAConnection(input.clientId);

      if (existing) {
        // Update existing
        await db
          .update(googleAnalyticsConnections)
          .set({
            propertyId: input.propertyId,
            viewId: input.viewId,
            serviceAccountEmail: input.serviceAccountEmail,
            serviceAccountKey: input.serviceAccountKey,
            updatedAt: new Date(),
          })
          .where(eq(googleAnalyticsConnections.id, existing.id));

        return { success: true, id: existing.id };
      } else {
        // Create new
        await db.insert(googleAnalyticsConnections).values({
          clientId: input.clientId,
          propertyId: input.propertyId,
          viewId: input.viewId,
          serviceAccountEmail: input.serviceAccountEmail,
          serviceAccountKey: input.serviceAccountKey,
          isActive: 1,
          createdBy: ctx.user.id,
        });

        return { success: true };
      }
    }),

  // Delete GA connection
  delete: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const connection = await getGAConnection(input.clientId);
      if (!connection) {
        return { success: false, message: "Connection not found" };
      }

      await db
        .delete(googleAnalyticsConnections)
        .where(eq(googleAnalyticsConnections.id, connection.id));

      return { success: true };
    }),

  // Fetch traffic metrics
  getMetrics: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      return fetchGAMetrics(input.clientId, input.startDate, input.endDate);
    }),

  // Fetch page metrics
  getPageMetrics: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return fetchGAPageMetrics(
        input.clientId,
        input.startDate,
        input.endDate,
        input.limit
      );
    }),

  // Fetch keyword data
  getKeywords: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return fetchKeywordData(
        input.clientId,
        input.startDate,
        input.endDate,
        input.limit
      );
    }),

  // Sync content performance
  sync: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      return syncContentPerformance(input.clientId);
    }),
});
