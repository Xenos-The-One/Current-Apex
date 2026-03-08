/**
 * Google Search Console Router
 *
 * Manages credentials and provides SEO performance data endpoints.
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import {
  searchConsoleCredentials,
  searchConsoleMetrics,
  seoClients,
} from "../../../drizzle/seo-schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { fetchSearchConsoleData, fetchSearchConsoleSummary } from "../../googleSearchConsole";

export const searchConsoleRouter = router({
  // ── Credential Management ──────────────────────────────────────────────────

  /** List all Search Console credentials for a client */
  getCredentials: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      return db
        .select({
          id: searchConsoleCredentials.id,
          clientId: searchConsoleCredentials.clientId,
          siteUrl: searchConsoleCredentials.siteUrl,
          isActive: searchConsoleCredentials.isActive,
          lastSyncedAt: searchConsoleCredentials.lastSyncedAt,
          createdAt: searchConsoleCredentials.createdAt,
        })
        .from(searchConsoleCredentials)
        .where(eq(searchConsoleCredentials.clientId, input.clientId))
        .orderBy(desc(searchConsoleCredentials.createdAt));
    }),

  /** Add or update Search Console credentials */
  saveCredentials: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(), // omit to create
        clientId: z.number(),
        siteUrl: z.string().url(),
        accessToken: z.string().optional(),
        refreshToken: z.string().optional(),
        googleClientId: z.string().optional(),
        googleClientSecret: z.string().optional(),
        serviceAccountEmail: z.string().optional(),
        serviceAccountKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      if (input.id) {
        await db
          .update(searchConsoleCredentials)
          .set({
            siteUrl: input.siteUrl,
            accessToken: input.accessToken ?? null,
            refreshToken: input.refreshToken ?? null,
            googleClientId: input.googleClientId ?? null,
            googleClientSecret: input.googleClientSecret ?? null,
            serviceAccountEmail: input.serviceAccountEmail ?? null,
            serviceAccountKey: input.serviceAccountKey ?? null,
            updatedAt: new Date(),
          })
          .where(eq(searchConsoleCredentials.id, input.id));
        return { success: true, id: input.id };
      }

      const [result] = await db.insert(searchConsoleCredentials).values({
        clientId: input.clientId,
        siteUrl: input.siteUrl,
        accessToken: input.accessToken ?? null,
        refreshToken: input.refreshToken ?? null,
        googleClientId: input.googleClientId ?? null,
        googleClientSecret: input.googleClientSecret ?? null,
        serviceAccountEmail: input.serviceAccountEmail ?? null,
        serviceAccountKey: input.serviceAccountKey ?? null,
        isActive: 1,
        createdBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: result.insertId };
    }),

  /** Delete credentials */
  deleteCredentials: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.delete(searchConsoleCredentials).where(eq(searchConsoleCredentials.id, input.id));
      return { success: true };
    }),

  // ── Data Fetching ──────────────────────────────────────────────────────────

  /** Manually trigger a data sync for a credential */
  syncNow: protectedProcedure
    .input(z.object({ credentialId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [cred] = await db
        .select()
        .from(searchConsoleCredentials)
        .where(eq(searchConsoleCredentials.id, input.credentialId))
        .limit(1);

      if (!cred) throw new TRPCError({ code: "NOT_FOUND", message: "Credentials not found" });

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 28);

      try {
        const data = await fetchSearchConsoleData({
          siteUrl: cred.siteUrl,
          accessToken: cred.accessToken,
          refreshToken: cred.refreshToken,
          clientId: cred.googleClientId,
          clientSecret: cred.googleClientSecret,
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const row of data) {
          await db.insert(searchConsoleMetrics).values({
            clientId: cred.clientId,
            credentialId: cred.id,
            query: row.query,
            page: row.page,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: Math.round((row.ctr || 0) * 10000),
            position: Math.round((row.position || 0) * 100),
            recordedDate: today,
            createdAt: new Date(),
          });
        }

        await db
          .update(searchConsoleCredentials)
          .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
          .where(eq(searchConsoleCredentials.id, cred.id));

        return { success: true, rowsSynced: data.length };
      } catch (err: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Sync failed: ${err.message}`,
        });
      }
    }),

  /** Get top queries for a client */
  getTopQueries: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        limit: z.number().default(20),
        days: z.number().default(28),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const rows = await db
        .select({
          query: searchConsoleMetrics.query,
          totalClicks: sql<number>`SUM(${searchConsoleMetrics.clicks})`,
          totalImpressions: sql<number>`SUM(${searchConsoleMetrics.impressions})`,
          avgCtr: sql<number>`AVG(${searchConsoleMetrics.ctr})`,
          avgPosition: sql<number>`AVG(${searchConsoleMetrics.position})`,
        })
        .from(searchConsoleMetrics)
        .where(
          and(
            eq(searchConsoleMetrics.clientId, input.clientId),
            gte(searchConsoleMetrics.recordedDate, since)
          )
        )
        .groupBy(searchConsoleMetrics.query)
        .orderBy(sql`SUM(${searchConsoleMetrics.clicks}) DESC`)
        .limit(input.limit);

      return rows.map((r) => ({
        query: r.query,
        clicks: Number(r.totalClicks),
        impressions: Number(r.totalImpressions),
        ctr: Number(r.avgCtr) / 100, // back to percentage
        position: Number(r.avgPosition) / 100,
      }));
    }),

  /** Get top pages for a client */
  getTopPages: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        limit: z.number().default(20),
        days: z.number().default(28),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const rows = await db
        .select({
          page: searchConsoleMetrics.page,
          totalClicks: sql<number>`SUM(${searchConsoleMetrics.clicks})`,
          totalImpressions: sql<number>`SUM(${searchConsoleMetrics.impressions})`,
          avgCtr: sql<number>`AVG(${searchConsoleMetrics.ctr})`,
          avgPosition: sql<number>`AVG(${searchConsoleMetrics.position})`,
        })
        .from(searchConsoleMetrics)
        .where(
          and(
            eq(searchConsoleMetrics.clientId, input.clientId),
            gte(searchConsoleMetrics.recordedDate, since)
          )
        )
        .groupBy(searchConsoleMetrics.page)
        .orderBy(sql`SUM(${searchConsoleMetrics.clicks}) DESC`)
        .limit(input.limit);

      return rows.map((r) => ({
        page: r.page,
        clicks: Number(r.totalClicks),
        impressions: Number(r.totalImpressions),
        ctr: Number(r.avgCtr) / 100,
        position: Number(r.avgPosition) / 100,
      }));
    }),

  /** Get summary metrics for a client */
  getSummary: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        days: z.number().default(28),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const [summary] = await db
        .select({
          totalClicks: sql<number>`SUM(${searchConsoleMetrics.clicks})`,
          totalImpressions: sql<number>`SUM(${searchConsoleMetrics.impressions})`,
          avgCtr: sql<number>`AVG(${searchConsoleMetrics.ctr})`,
          avgPosition: sql<number>`AVG(${searchConsoleMetrics.position})`,
        })
        .from(searchConsoleMetrics)
        .where(
          and(
            eq(searchConsoleMetrics.clientId, input.clientId),
            gte(searchConsoleMetrics.recordedDate, since)
          )
        );

      return {
        totalClicks: Number(summary?.totalClicks ?? 0),
        totalImpressions: Number(summary?.totalImpressions ?? 0),
        avgCtr: Number(summary?.avgCtr ?? 0) / 100,
        avgPosition: Number(summary?.avgPosition ?? 0) / 100,
      };
    }),

  /** Get position history for a specific query (for sparkline charts) */
  getQueryHistory: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        query: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const since = new Date();
      since.setDate(since.getDate() - input.days);
      const rows = await db
        .select({
          date: searchConsoleMetrics.recordedDate,
          avgPosition: sql<number>`AVG(${searchConsoleMetrics.position})`,
          totalClicks: sql<number>`SUM(${searchConsoleMetrics.clicks})`,
        })
        .from(searchConsoleMetrics)
        .where(
          and(
            eq(searchConsoleMetrics.clientId, input.clientId),
            eq(searchConsoleMetrics.query, input.query),
            gte(searchConsoleMetrics.recordedDate, since)
          )
        )
        .groupBy(searchConsoleMetrics.recordedDate)
        .orderBy(searchConsoleMetrics.recordedDate);
      return rows.map((r) => ({
        date: r.date,
        position: Number(r.avgPosition) / 100,
        clicks: Number(r.totalClicks),
      }));
    }),

  /** Get daily trend data for charts */
  getDailyTrend: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        days: z.number().default(28),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const rows = await db
        .select({
          date: searchConsoleMetrics.recordedDate,
          totalClicks: sql<number>`SUM(${searchConsoleMetrics.clicks})`,
          totalImpressions: sql<number>`SUM(${searchConsoleMetrics.impressions})`,
          avgPosition: sql<number>`AVG(${searchConsoleMetrics.position})`,
        })
        .from(searchConsoleMetrics)
        .where(
          and(
            eq(searchConsoleMetrics.clientId, input.clientId),
            gte(searchConsoleMetrics.recordedDate, since)
          )
        )
        .groupBy(searchConsoleMetrics.recordedDate)
        .orderBy(searchConsoleMetrics.recordedDate);

      return rows.map((r) => ({
        date: r.date,
        clicks: Number(r.totalClicks),
        impressions: Number(r.totalImpressions),
        position: Number(r.avgPosition) / 100,
      }));
    }),
});
