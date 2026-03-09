/**
 * Public Features Router
 * Handles: public booking pages, partner portal, and advanced reports
 */
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { clients, leads, referralPartners, appointments, leadActivities, agencies } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, count, sql, isNotNull, inArray } from "drizzle-orm";
import crypto from "crypto";

// ─── BOOKING PAGE ─────────────────────────────────────────────────────────────

export const publicFeaturesRouter = router({

  // Get public booking page info by slug
  getBookingPage: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [client] = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          agencyId: clients.agencyId,
          bookingSlug: clients.bookingSlug,
          bookingTitle: clients.bookingTitle,
          bookingDescription: clients.bookingDescription,
          bookingActive: clients.bookingActive,
        })
        .from(clients)
        .where(eq(clients.bookingSlug, input.slug))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking page not found" });
      }
      if (!client.bookingActive) {
        throw new TRPCError({ code: "FORBIDDEN", message: "This booking page is currently unavailable" });
      }

      // Get agency info for branding
      const [agency] = await db
        .select({ name: agencies.name, businessType: agencies.businessType })
        .from(agencies)
        .where(eq(agencies.id, client.agencyId))
        .limit(1);

      return {
        clientId: client.id,
        agencyId: client.agencyId,
        name: client.name,
        email: client.email,
        phone: client.phone,
        bookingTitle: client.bookingTitle || `Book a Free Consultation with ${client.name}`,
        bookingDescription: client.bookingDescription || "Schedule your free 30-minute mortgage consultation. We'll review your goals and find the best loan options for you.",
        businessType: agency?.businessType || "loan_officer",
        agencyName: agency?.name || "",
      };
    }),

  // Update booking page settings (protected)
  updateBookingPage: protectedProcedure
    .input(z.object({
      bookingSlug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
      bookingTitle: z.string().max(255).optional(),
      bookingDescription: z.string().max(1000).optional(),
      bookingActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Find the client record for this user
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.userId, ctx.user.id))
        .limit(1);

      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });

      // Check slug uniqueness
      const [existing] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.bookingSlug, input.bookingSlug))
        .limit(1);

      if (existing && existing.id !== client.id) {
        throw new TRPCError({ code: "CONFLICT", message: "This URL slug is already taken. Please choose a different one." });
      }

      await db.update(clients).set({
        bookingSlug: input.bookingSlug,
        bookingTitle: input.bookingTitle,
        bookingDescription: input.bookingDescription,
        bookingActive: input.bookingActive,
      }).where(eq(clients.id, client.id));

      return { success: true, slug: input.bookingSlug };
    }),

  // Get current user's booking page settings
  getMyBookingSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [client] = await db
      .select({
        bookingSlug: clients.bookingSlug,
        bookingTitle: clients.bookingTitle,
        bookingDescription: clients.bookingDescription,
        bookingActive: clients.bookingActive,
        name: clients.name,
      })
      .from(clients)
      .where(eq(clients.userId, ctx.user.id))
      .limit(1);

    return client || null;
  }),

  // ─── PARTNER PORTAL ─────────────────────────────────────────────────────────

  // Generate a portal access token for a partner (admin only)
  generatePartnerToken: protectedProcedure
    .input(z.object({ partnerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const token = crypto.randomBytes(32).toString("hex");

      await db.update(referralPartners)
        .set({ portalToken: token })
        .where(eq(referralPartners.id, input.partnerId));

      return { token, portalUrl: `/partner-portal?token=${token}` };
    }),

  // Get partner portal data by token (public — no auth required)
  getPartnerPortal: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [partner] = await db
        .select()
        .from(referralPartners)
        .where(eq(referralPartners.portalToken, input.token))
        .limit(1);

      if (!partner) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired portal link" });
      }

      // Update last accessed timestamp
      await db.update(referralPartners)
        .set({ portalLastAccessed: new Date() })
        .where(eq(referralPartners.id, partner.id));

      // Get all leads referred by this partner (using source field as 'referral' + partner name match)
      const referredLeads = await db
        .select({
          id: leads.id,
          firstName: leads.firstName,
          lastName: leads.lastName,
          status: leads.status,
          loanType: leads.loanType,
          loanAmount: leads.loanAmount,
          createdAt: leads.createdAt,
          lastContactDate: leads.lastContactDate,
          appointmentDate: leads.appointmentDate,
          probability: leads.probability,
        })
        .from(leads)
        .where(sql`${leads.source} LIKE ${'%referral%'} OR ${leads.notes} LIKE ${'%' + partner.firstName + ' ' + partner.lastName + '%'}`)
        .orderBy(desc(leads.createdAt))
        .limit(100);

      // Compute summary stats
      const totalReferrals = referredLeads.length;
      const activeLeads = referredLeads.filter(l => !["closed_won", "closed_lost"].includes(l.status)).length;
      const closedWon = referredLeads.filter(l => l.status === "closed_won").length;
      const appointmentsSet = referredLeads.filter(l => ["appointment_set", "appointment_completed", "closed_won"].includes(l.status)).length;
      const totalVolume = referredLeads
        .filter(l => l.status === "closed_won" && l.loanAmount)
        .reduce((sum, l) => sum + Number(l.loanAmount || 0), 0);

      // Map lead statuses to partner-friendly labels (no sensitive info)
      const statusLabels: Record<string, string> = {
        new: "Received",
        contacted: "In Review",
        qualified: "Qualified",
        appointment_set: "Consultation Scheduled",
        appointment_completed: "Consultation Complete",
        closed_won: "Closed",
        closed_lost: "Not Proceeding",
      };

      return {
        partner: {
          id: partner.id,
          firstName: partner.firstName,
          lastName: partner.lastName,
          company: partner.company,
          partnerType: partner.partnerType,
          relationshipStatus: partner.relationshipStatus,
        },
        stats: {
          totalReferrals,
          activeLeads,
          closedWon,
          appointmentsSet,
          totalVolume,
          conversionRate: totalReferrals > 0 ? Math.round((closedWon / totalReferrals) * 100) : 0,
        },
        leads: referredLeads.map(l => ({
          id: l.id,
          name: `${l.firstName} ${l.lastName[0]}.`, // Partial name for privacy
          status: statusLabels[l.status] || l.status,
          loanType: l.loanType,
          createdAt: l.createdAt,
          lastUpdate: l.lastContactDate || l.createdAt,
          appointmentDate: l.appointmentDate,
          probability: l.probability,
        })),
      };
    }),

  // ─── ADVANCED REPORTS ──────────────────────────────────────────────────────

  getAdvancedReports: protectedProcedure
    .input(z.object({
      dateRange: z.enum(["7d", "30d", "90d", "ytd", "all"]).default("30d"),
      clientId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Determine date range
      const now = new Date();
      let startDate: string | null = null;
      if (input.dateRange === "7d") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      } else if (input.dateRange === "30d") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      } else if (input.dateRange === "90d") {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      } else if (input.dateRange === "ytd") {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 19).replace('T', ' ');
      }

      // Determine which clients to query
      let clientIds: number[] = [];
      if (ctx.user.role === "admin" || ctx.user.role === "super_admin") {
        const allClients = await db.select({ id: clients.id }).from(clients);
        clientIds = allClients.map(c => c.id);
      } else {
        const [myClient] = await db
          .select({ id: clients.id })
          .from(clients)
          .where(eq(clients.userId, ctx.user.id))
          .limit(1);
        if (myClient) clientIds = [myClient.id];
      }

      if (input.clientId && clientIds.includes(input.clientId)) {
        clientIds = [input.clientId];
      }

      if (clientIds.length === 0) return emptyReport();

      // Build where clause
      const baseWhere = startDate
        ? sql`${leads.clientId} IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)}) AND ${leads.createdAt} >= ${startDate}`
        : sql`${leads.clientId} IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})`;

      // ── 1. Total leads ──
      const [totalLeadsRow] = await db
        .select({ count: count() })
        .from(leads)
        .where(baseWhere);
      const totalLeads = totalLeadsRow?.count || 0;

      // ── 2. Status breakdown ──
      const statusBreakdown = await db
        .select({ status: leads.status, count: count() })
        .from(leads)
        .where(baseWhere)
        .groupBy(leads.status);

      // ── 3. Source ROI ──
      const sourceBreakdown = await db
        .select({
          source: leads.source,
          total: count(),
          closedWon: sql<number>`SUM(CASE WHEN ${leads.status} = 'closed_won' THEN 1 ELSE 0 END)`,
          appointmentsSet: sql<number>`SUM(CASE WHEN ${leads.status} IN ('appointment_set','appointment_completed','closed_won') THEN 1 ELSE 0 END)`,
          avgScore: sql<number>`AVG(${leads.score})`,
          totalLoanVolume: sql<number>`SUM(CASE WHEN ${leads.status} = 'closed_won' THEN COALESCE(${leads.loanAmount}, 0) ELSE 0 END)`,
        })
        .from(leads)
        .where(baseWhere)
        .groupBy(leads.source)
        .orderBy(sql`SUM(CASE WHEN ${leads.status} = 'closed_won' THEN 1 ELSE 0 END) DESC`);

      // ── 4. Funnel conversion rates ──
      const contacted = statusBreakdown.find(s => s.status === "contacted")?.count || 0;
      const qualified = statusBreakdown.find(s => s.status === "qualified")?.count || 0;
      const apptSet = (statusBreakdown.find(s => s.status === "appointment_set")?.count || 0) +
        (statusBreakdown.find(s => s.status === "appointment_completed")?.count || 0) +
        (statusBreakdown.find(s => s.status === "closed_won")?.count || 0);
      const closedWon = statusBreakdown.find(s => s.status === "closed_won")?.count || 0;
      const closedLost = statusBreakdown.find(s => s.status === "closed_lost")?.count || 0;

      // ── 5. Revenue estimate ──
      const [revenueRow] = await db
        .select({ total: sql<number>`SUM(COALESCE(${leads.loanAmount}, 0))` })
        .from(leads)
        .where(sql`${baseWhere} AND ${leads.status} = 'closed_won'`);
      const closedLoanVolume = Number(revenueRow?.total || 0);
      const estimatedRevenue = closedLoanVolume * 0.01; // ~1% commission estimate

      // ── 6. Lead score distribution ──
      const scoreDistribution = await db
        .select({
          tier: leads.scoreTier,
          count: count(),
        })
        .from(leads)
        .where(baseWhere)
        .groupBy(leads.scoreTier);

      // ── 7. Daily lead volume (last 30 days) ──
      const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 19).replace('T', ' ');
      const dailyVolume = await db
        .select({
          date: sql<string>`DATE(MIN(${leads.createdAt}))`,
          count: count(),
        })
        .from(leads)
        .where(and(
          inArray(leads.clientId, clientIds),
          sql`${leads.createdAt} >= ${thirtyDaysAgoStr}`
        ))
        .groupBy(sql`DATE(${leads.createdAt})`)
        .orderBy(sql`DATE(${leads.createdAt})`);

      // ── 8. Appointments ──
      // Get agency IDs from the client IDs
      const clientAgencyRows = await db
        .select({ agencyId: clients.agencyId })
        .from(clients)
        .where(inArray(clients.id, clientIds));
      const agencyIds = [...new Set(clientAgencyRows.map(r => r.agencyId).filter((id): id is number => id !== null))];
      const [totalApptsRow] = agencyIds.length > 0
        ? await db
            .select({ count: count() })
            .from(appointments)
            .where(startDate
              ? and(inArray(appointments.agencyId, agencyIds), sql`${appointments.createdAt} >= ${startDate}`)
              : inArray(appointments.agencyId, agencyIds)
            )
        : [{ count: 0 }];
      const totalAppointments = totalApptsRow?.count || 0;

      // ── 9. Loan type breakdown ──
      const loanTypeBreakdown = await db
        .select({ loanType: leads.loanType, count: count() })
        .from(leads)
        .where(sql`${baseWhere} AND ${leads.loanType} IS NOT NULL`)
        .groupBy(leads.loanType);

      // ── 10. Referral partner performance ──
      const partnerPerformance: Array<{ partnerId: number | null; referrals: number; closedWon: number }> = [];

      return {
        dateRange: input.dateRange,
        totalLeads,
        totalAppointments,
        closedWon,
        closedLost,
        closedLoanVolume,
        estimatedRevenue,
        conversionRate: totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0,
        appointmentRate: totalLeads > 0 ? Math.round((apptSet / totalLeads) * 100) : 0,
        funnel: {
          leads: totalLeads,
          contacted,
          qualified,
          appointmentsSet: apptSet,
          closedWon,
        },
        sourceBreakdown: sourceBreakdown.map(s => ({
          source: s.source || "Unknown",
          total: s.total,
          closedWon: Number(s.closedWon),
          appointmentsSet: Number(s.appointmentsSet),
          avgScore: Math.round(Number(s.avgScore) || 0),
          totalLoanVolume: Number(s.totalLoanVolume),
          conversionRate: s.total > 0 ? Math.round((Number(s.closedWon) / s.total) * 100) : 0,
        })),
        statusBreakdown: statusBreakdown.map(s => ({ status: s.status, count: s.count })),
        scoreDistribution: scoreDistribution.map(s => ({ tier: s.tier || "cold", count: s.count })),
        dailyVolume: dailyVolume.map(d => ({ date: d.date, count: d.count })),
        loanTypeBreakdown: loanTypeBreakdown.map(l => ({ type: l.loanType || "other", count: l.count })),
        partnerPerformance,
      };
    }),
});

function emptyReport() {
  return {
    dateRange: "30d" as const,
    totalLeads: 0,
    totalAppointments: 0,
    closedWon: 0,
    closedLost: 0,
    closedLoanVolume: 0,
    estimatedRevenue: 0,
    conversionRate: 0,
    appointmentRate: 0,
    funnel: { leads: 0, contacted: 0, qualified: 0, appointmentsSet: 0, closedWon: 0 },
    sourceBreakdown: [],
    statusBreakdown: [],
    scoreDistribution: [],
    dailyVolume: [],
    loanTypeBreakdown: [],
    partnerPerformance: [],
  };
}
