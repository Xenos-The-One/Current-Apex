import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { leads, emailCampaigns, smsCampaigns, leadActivities } from "../../drizzle/schema";
import { sql, eq, and, gte, lte, count, desc } from "drizzle-orm";

// Middleware to check if user is admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const analyticsRouter = router({
  // ============= ADMIN ANALYTICS =============
  
  getOverviewMetrics: adminProcedure
    .input(z.object({
      agencyId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];
      if (input.agencyId) conditions.push(eq(leads.agencyId, input.agencyId));
      if (input.startDate) conditions.push(gte(leads.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(leads.createdAt, input.endDate));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Total leads
      const totalLeadsResult = await db
        .select({ count: count() })
        .from(leads)
        .where(whereClause);
      const totalLeads = totalLeadsResult[0]?.count || 0;

      // Leads by status
      const leadsByStatus = await db
        .select({
          status: leads.status,
          count: count(),
        })
        .from(leads)
        .where(whereClause)
        .groupBy(leads.status);

      // Conversion rates
      const newLeads = leadsByStatus.find(s => s.status === "new")?.count || 0;
      const contacted = leadsByStatus.find(s => s.status === "contacted")?.count || 0;
      const qualified = leadsByStatus.find(s => s.status === "qualified")?.count || 0;
      const appointments = leadsByStatus.find(s => s.status === "appointment_set")?.count || 0;
      const closedWon = leadsByStatus.find(s => s.status === "closed_won")?.count || 0;

      return {
        totalLeads,
        leadsByStatus,
        conversionRates: {
          newToContacted: newLeads > 0 ? (contacted / newLeads) * 100 : 0,
          contactedToQualified: contacted > 0 ? (qualified / contacted) * 100 : 0,
          qualifiedToAppointment: qualified > 0 ? (appointments / qualified) * 100 : 0,
          appointmentToClosed: appointments > 0 ? (closedWon / appointments) * 100 : 0,
          overallConversion: totalLeads > 0 ? (closedWon / totalLeads) * 100 : 0,
        },
      };
    }),

  getLeadSourcePerformance: adminProcedure
    .input(z.object({
      agencyId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];
      if (input.agencyId) conditions.push(eq(leads.agencyId, input.agencyId));
      if (input.startDate) conditions.push(gte(leads.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(leads.createdAt, input.endDate));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const sourcePerformance = await db
        .select({
          source: leads.source,
          total: count(),
          closedWon: sql<number>`SUM(CASE WHEN ${leads.status} = 'closed_won' THEN 1 ELSE 0 END)`,
          appointments: sql<number>`SUM(CASE WHEN ${leads.status} IN ('appointment_set', 'appointment_completed', 'closed_won') THEN 1 ELSE 0 END)`,
        })
        .from(leads)
        .where(whereClause)
        .groupBy(leads.source);

      return sourcePerformance.map(s => ({
        source: s.source || "Unknown",
        total: s.total,
        closedWon: Number(s.closedWon),
        appointments: Number(s.appointments),
        conversionRate: s.total > 0 ? (Number(s.closedWon) / s.total) * 100 : 0,
        appointmentRate: s.total > 0 ? (Number(s.appointments) / s.total) * 100 : 0,
      }));
    }),

  getCampaignPerformance: adminProcedure
    .input(z.object({
      agencyId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];
      if (input.agencyId) conditions.push(eq(emailCampaigns.agencyId, input.agencyId));
      if (input.startDate) conditions.push(gte(emailCampaigns.createdAt, input.startDate));
      if (input.endDate) conditions.push(lte(emailCampaigns.createdAt, input.endDate));

      const emailWhereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const smsConditions = [];
      if (input.agencyId) smsConditions.push(eq(smsCampaigns.agencyId, input.agencyId));
      if (input.startDate) smsConditions.push(gte(smsCampaigns.createdAt, input.startDate));
      if (input.endDate) smsConditions.push(lte(smsCampaigns.createdAt, input.endDate));

      const smsWhereClause = smsConditions.length > 0 ? and(...smsConditions) : undefined;

      // Email campaigns
      const emailStats = await db
        .select({
          total: count(),
          sent: sql<number>`SUM(CASE WHEN ${emailCampaigns.status} = 'sent' THEN 1 ELSE 0 END)`,
          totalSent: sql<number>`SUM(${emailCampaigns.sentCount})`,
          totalFailed: sql<number>`SUM(${emailCampaigns.failedCount})`,
          totalOpened: sql<number>`SUM(${emailCampaigns.openCount})`,
          totalClicked: sql<number>`SUM(${emailCampaigns.clickCount})`,
        })
        .from(emailCampaigns)
        .where(emailWhereClause);

      // SMS campaigns
      const smsStats = await db
        .select({
          total: count(),
          sent: sql<number>`SUM(CASE WHEN ${smsCampaigns.status} = 'sent' THEN 1 ELSE 0 END)`,
          totalSent: sql<number>`SUM(${smsCampaigns.sentCount})`,
          totalDelivered: sql<number>`SUM(${smsCampaigns.deliveredCount})`,
          totalFailed: sql<number>`SUM(${smsCampaigns.failedCount})`,
        })
        .from(smsCampaigns)
        .where(smsWhereClause);

      const emailData = emailStats[0] || { total: 0, sent: 0, totalSent: 0, totalFailed: 0, totalOpened: 0, totalClicked: 0 };
      const smsData = smsStats[0] || { total: 0, sent: 0, totalSent: 0, totalDelivered: 0, totalFailed: 0 };

      return {
        email: {
          totalCampaigns: emailData.total,
          sentCampaigns: Number(emailData.sent),
          totalSent: Number(emailData.totalSent),
          totalFailed: Number(emailData.totalFailed),
          totalOpened: Number(emailData.totalOpened),
          totalClicked: Number(emailData.totalClicked),
          failureRate: Number(emailData.totalSent) > 0 ? (Number(emailData.totalFailed) / Number(emailData.totalSent)) * 100 : 0,
          openRate: Number(emailData.totalSent) > 0 ? (Number(emailData.totalOpened) / Number(emailData.totalSent)) * 100 : 0,
          clickRate: Number(emailData.totalOpened) > 0 ? (Number(emailData.totalClicked) / Number(emailData.totalOpened)) * 100 : 0,
        },
        sms: {
          totalCampaigns: smsData.total,
          sentCampaigns: Number(smsData.sent),
          totalSent: Number(smsData.totalSent),
          totalDelivered: Number(smsData.totalDelivered),
          totalFailed: Number(smsData.totalFailed),
          deliveryRate: Number(smsData.totalSent) > 0 ? (Number(smsData.totalDelivered) / Number(smsData.totalSent)) * 100 : 0,
          failureRate: Number(smsData.totalSent) > 0 ? (Number(smsData.totalFailed) / Number(smsData.totalSent)) * 100 : 0,
        },
      };
    }),

  /**
   * Get conversion funnel statistics (simple version for quick overview)
   */
  conversionFunnel: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Total leads
    const totalLeadsResult = await db.select({ count: count() }).from(leads);
    const totalLeads = totalLeadsResult[0]?.count || 0;

    // Calls made (distinct leads with vapi_call activity)
    const callsResult = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${leadActivities.leadId})` })
      .from(leadActivities)
      .where(sql`${leadActivities.activityType} = 'call'`);
    const callsMade = Number(callsResult[0]?.count || 0);

    // Appointments booked
    const appointmentsResult = await db
      .select({ count: count() })
      .from(leads)
      .where(sql`${leads.status} IN ('appointment_set', 'appointment_completed', 'closed_won')`);
    const appointmentsBooked = appointmentsResult[0]?.count || 0;

    // Appointments completed
    const completedResult = await db
      .select({ count: count() })
      .from(leads)
      .where(eq(leads.status, 'appointment_completed'));
    const appointmentsCompleted = completedResult[0]?.count || 0;

    // Webinar signups (leads with "Webinar" in source)
    const webinarSignupsResult = await db
      .select({ count: count() })
      .from(leads)
      .where(sql`${leads.source} LIKE '%Webinar%'`);
    const webinarSignups = webinarSignupsResult[0]?.count || 0;

    // Source breakdown
    const sourceBreakdownResult = await db
      .select({
        source: leads.source,
        count: count(),
        appointmentsBooked: sql<number>`SUM(CASE WHEN ${leads.status} IN ('appointment_set', 'appointment_completed', 'closed_won') THEN 1 ELSE 0 END)`,
      })
      .from(leads)
      .groupBy(leads.source);

    return {
      totalLeads,
      callsMade,
      appointmentsBooked,
      appointmentsCompleted,
      webinarSignups,
      webinarAttendees: 0, // TODO: Track webinar attendance
      webinarToAppointment: 0, // TODO: Track webinar → appointment conversion
      sourceBreakdown: sourceBreakdownResult.map(s => ({
        source: s.source || "Unknown",
        count: s.count,
        appointmentsBooked: Number(s.appointmentsBooked),
      })),
    };
  }),

  getActivityTimeline: adminProcedure
    .input(z.object({
      agencyId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const conditions = [gte(leadActivities.createdAt, startDate)];
      if (input.agencyId) {
        // Join with leads to filter by agency
        const activities = await db
          .select({
            date: sql<string>`DATE(${leadActivities.createdAt})`,
            activityType: leadActivities.activityType,
            count: count(),
          })
          .from(leadActivities)
          .innerJoin(leads, eq(leadActivities.leadId, leads.id))
          .where(and(
            gte(leadActivities.createdAt, startDate),
            eq(leads.agencyId, input.agencyId)
          ))
          .groupBy(sql`DATE(${leadActivities.createdAt})`, leadActivities.activityType)
          .orderBy(desc(sql`DATE(${leadActivities.createdAt})`));

        return activities;
      }

      const activities = await db
        .select({
          date: sql<string>`DATE(${leadActivities.createdAt})`,
          activityType: leadActivities.activityType,
          count: count(),
        })
        .from(leadActivities)
        .where(and(...conditions))
        .groupBy(sql`DATE(${leadActivities.createdAt})`, leadActivities.activityType)
        .orderBy(desc(sql`DATE(${leadActivities.createdAt})`));

      return activities;
    }),
});
