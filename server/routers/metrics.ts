import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { leads, appointments } from "../../drizzle/schema";
import { eq, gte } from "drizzle-orm";

export const metricsRouter = router({
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    // Only allow admin users (Tariq and Tim)
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only administrators can access metrics dashboard",
      });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    // Get all leads
    const allLeads = await db.select().from(leads);
    const totalLeads = allLeads.length;

    // Get all appointments
    const allAppointments = await db.select().from(appointments);
    const appointmentsBooked = allAppointments.length;

    // Calculate show rate (appointments that were attended)
    const attendedAppointments = allAppointments.filter(
      (apt: any) => apt.status === "completed"
    );
    const showRate = appointmentsBooked > 0
      ? Math.round((attendedAppointments.length / appointmentsBooked) * 100)
      : 0;

    // Calculate conversion rate (leads to appointments), capped at 100%
    const conversionRate = totalLeads > 0
      ? Math.min(100, Math.round((appointmentsBooked / totalLeads) * 100))
      : 0;

    // Calculate revenue (assuming 20% close rate and $3K avg commission)
    const closedDeals = Math.round(attendedAppointments.length * 0.2);
    const revenueGenerated = closedDeals * 3000;

    // Get hot leads (score >= 80)
    const hotLeads = allLeads.filter((lead: any) => (lead.score || 0) >= 80).length;

    // Placeholder metrics (will be calculated from actual data)
    const callsMade = 0; // TODO: Get from Vapi call logs
    const answerRate = 0; // TODO: Calculate from Vapi data
    const emailsSent = 0; // TODO: Get from email campaigns
    const emailOpenRate = 0; // TODO: Calculate from SendGrid data

    // Daily activity (last 7 days)
    const dailyActivity: any[] = []; // TODO: Calculate daily metrics

    // Lead sources performance
    const leadSources: any[] = []; // TODO: Group leads by source and calculate metrics

    return {
      totalLeads,
      appointmentsBooked,
      showRate,
      conversionRate,
      revenueGenerated,
      hotLeads,
      callsMade,
      answerRate,
      emailsSent,
      emailOpenRate,
      dailyActivity,
      leadSources,
    };
  }),
});
