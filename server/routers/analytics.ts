import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { appointments, borrowers, callLogs, emailCampaigns, leads, marketAnalytics, smsCampaigns, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const analyticsRouter = router({
  getDashboard: protectedProcedure
    .input(z.object({ agencyId: z.number(), startDate: z.date().optional(), endDate: z.date().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const start = input.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = input.endDate ?? new Date();

      const [totalLeads] = await db.select({ count: count() }).from(leads).where(eq(leads.agencyId, input.agencyId));
      const [newLeads] = await db.select({ count: count() }).from(leads).where(and(eq(leads.agencyId, input.agencyId), gte(leads.createdAt, start), lte(leads.createdAt, end)));
      const [convertedLeads] = await db.select({ count: count() }).from(leads).where(and(eq(leads.agencyId, input.agencyId), eq(leads.status, "converted")));
      const [totalBorrowers] = await db.select({ count: count() }).from(borrowers).where(eq(borrowers.agencyId, input.agencyId));
      const [totalAppointments] = await db.select({ count: count() }).from(appointments).where(and(eq(appointments.agencyId, input.agencyId), gte(appointments.startAt, start)));
      const [totalCalls] = await db.select({ count: count() }).from(callLogs).where(and(eq(callLogs.agencyId, input.agencyId), gte(callLogs.createdAt, start)));
      const [totalUsers] = await db.select({ count: count() }).from(users).where(eq(users.agencyId, input.agencyId));

      // Lead source breakdown
      const sourceBreakdown = await db.select({ source: leads.source, count: count() })
        .from(leads).where(eq(leads.agencyId, input.agencyId))
        .groupBy(leads.source);

      // Pipeline stage breakdown
      const stageBreakdown = await db.select({ stage: leads.pipelineStage, count: count() })
        .from(leads).where(eq(leads.agencyId, input.agencyId))
        .groupBy(leads.pipelineStage);

      // Contact type breakdown
      const typeBreakdown = await db.select({ type: leads.contactType, count: count() })
        .from(leads).where(eq(leads.agencyId, input.agencyId))
        .groupBy(leads.contactType);

      return {
        kpis: {
          totalLeads: totalLeads?.count ?? 0,
          newLeads: newLeads?.count ?? 0,
          convertedLeads: convertedLeads?.count ?? 0,
          conversionRate: totalLeads?.count ? Math.round(((convertedLeads?.count ?? 0) / totalLeads.count) * 100) : 0,
          totalBorrowers: totalBorrowers?.count ?? 0,
          totalAppointments: totalAppointments?.count ?? 0,
          totalCalls: totalCalls?.count ?? 0,
          totalUsers: totalUsers?.count ?? 0,
        },
        sourceBreakdown,
        stageBreakdown,
        typeBreakdown,
      };
    }),

  getFunnel: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const stages = ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won"] as const;
      const funnel = [];
      for (const stage of stages) {
        const [row] = await db.select({ count: count() }).from(leads)
          .where(and(eq(leads.agencyId, input.agencyId), eq(leads.pipelineStage, stage)));
        funnel.push({ stage, count: row?.count ?? 0 });
      }
      return funnel;
    }),

  getTeamMetrics: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agentUsers = await db.select().from(users).where(eq(users.agencyId, input.agencyId));
      const metrics = [];
      for (const user of agentUsers) {
        const [leadCount] = await db.select({ count: count() }).from(leads).where(and(eq(leads.agencyId, input.agencyId), eq(leads.assignedUserId, user.id)));
        const [convertedCount] = await db.select({ count: count() }).from(leads).where(and(eq(leads.agencyId, input.agencyId), eq(leads.assignedUserId, user.id), eq(leads.status, "converted")));
        const [apptCount] = await db.select({ count: count() }).from(appointments).where(and(eq(appointments.agencyId, input.agencyId), eq(appointments.userId, user.id)));
        metrics.push({
          user: { id: user.id, name: user.name, email: user.email },
          leads: leadCount?.count ?? 0,
          converted: convertedCount?.count ?? 0,
          appointments: apptCount?.count ?? 0,
          conversionRate: leadCount?.count ? Math.round(((convertedCount?.count ?? 0) / leadCount.count) * 100) : 0,
        });
      }
      return metrics.sort((a, b) => b.converted - a.converted);
    }),

  getCampaignStats: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const emailStats = await db.select().from(emailCampaigns)
        .where(eq(emailCampaigns.agencyId, input.agencyId))
        .orderBy(desc(emailCampaigns.createdAt)).limit(10);
      const smsStats = await db.select().from(smsCampaigns)
        .where(eq(smsCampaigns.agencyId, input.agencyId))
        .orderBy(desc(smsCampaigns.createdAt)).limit(10);
      return { email: emailStats, sms: smsStats };
    }),

  getMarketAnalytics: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(marketAnalytics)
        .where(eq(marketAnalytics.agencyId, input.agencyId))
        .orderBy(desc(marketAnalytics.createdAt))
        .limit(20);
    }),

  createMarketNote: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      marketArea: z.string().optional(),
      notes: z.string().optional(),
      reportDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(marketAnalytics).values({
        agencyId: input.agencyId,
        marketArea: input.marketArea,
        notes: input.notes,
        reportDate: input.reportDate ?? new Date(),
      });
      return { id: (result as any).insertId };
    }),
});
