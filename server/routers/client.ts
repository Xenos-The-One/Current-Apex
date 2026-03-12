import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getClientByUserId,
  getClientById,
  getAgencyById,
  getAgencyByOwnerId,
  getClientsByAgencyId,
  getLeadsByAgencyId,
  getLeadsByClientId,
  getLeadsByClientIdPaginated,
  getDistinctLeadTags,
  createLead,
  updateLead,
  getLeadActivities,
  createLeadActivity,
  getLeadById,
  getLeadSourceMapping,
  getDb,
  ensureClientProfile,
} from "../db";
import { appointments, leads, contentApprovals, referralPartners, smartLists } from "../../drizzle/schema";
import { eq, and, count, or, like, sql, inArray } from "drizzle-orm";
import { pushAppointmentBooked } from "../push-triggers";

// ─── Admin Impersonation Helper ──────────────────────────────────────────────
// When an admin sends the x-impersonate-client-id header, resolve to that client
// instead of the admin's own client profile. This lets admins "login as client".
const ADMIN_ROLES = ["admin", "super_admin", "agency_owner"];

async function resolveClient(ctx: { user: { id: number; role: string }; req: any }) {
  const isAdmin = ADMIN_ROLES.includes(ctx.user.role);

  // Check for impersonation header
  if (isAdmin) {
    const impersonateId = ctx.req.headers["x-impersonate-client-id"];
    if (impersonateId) {
      const clientId = parseInt(impersonateId, 10);
      if (!isNaN(clientId)) {
        const client = await getClientById(clientId);
        if (client) return client;
      }
    }
  }

  // Fall back to the user's own client profile
  let client = await getClientByUserId(ctx.user.id);
  if (!client) {
    client = await ensureClientProfile(ctx.user) ?? undefined;
  }
  return client;
}

// Check if the user is admin (for bypassing clientId ownership checks)
function isAdminUser(role: string) {
  return ADMIN_ROLES.includes(role);
}

export const clientRouter = router({
  // ============= CLIENT INFO =============
  
  // ============= DASHBOARD STATS =============
  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const client = await resolveClient(ctx);
    // Admin users without a linked client record — return empty stats
    if (!client) {
      return {
        totalLeads: 0, newLeads: 0, contacted: 0, qualified: 0, appointmentSet: 0,
        closedWon: 0, closedLost: 0, hotLeads: 0, warmLeads: 0,
        totalAppointments: 0, completedAppointments: 0, scheduledAppointments: 0,
        showRate: 0, conversionRate: 0, estimatedRevenue: 0, estimatedDeals: 0,
        pendingApprovalsCount: 0, recentLeads: [], leadsThisWeek: 0, leadsThisMonth: 0,
        successScore: 0, leadSources: [], client: null,
      };
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const clientLeads = await db.select().from(leads).where(eq(leads.clientId, client.id));
    const totalLeads = clientLeads.length;
    const newLeads = clientLeads.filter(l => l.status === "new").length;
    const contacted = clientLeads.filter(l => l.status === "contacted").length;
    const qualified = clientLeads.filter(l => l.status === "qualified").length;
    const appointmentSet = clientLeads.filter(l => l.status === "appointment_set" || l.status === "appointment_completed").length;
    const closedWon = clientLeads.filter(l => l.status === "closed_won").length;
    const closedLost = clientLeads.filter(l => l.status === "closed_lost").length;
    const hotLeads = clientLeads.filter(l => (l.score || 0) >= 80).length;
    const warmLeads = clientLeads.filter(l => (l.score || 0) >= 40 && (l.score || 0) < 80).length;

    const clientAppointments = client.agencyId
      ? await db.select().from(appointments).where(eq(appointments.agencyId, client.agencyId))
      : [];
    const totalAppointments = clientAppointments.length;
    const completedAppointments = clientAppointments.filter(a => a.status === "completed").length;
    const scheduledAppointments = clientAppointments.filter(a => a.status === "scheduled" || a.status === "confirmed").length;
    const showRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;
    const conversionRate = totalLeads > 0 ? Math.round((appointmentSet / totalLeads) * 100) : 0;
    const estimatedDeals = Math.round(completedAppointments * 0.2);
    const estimatedRevenue = estimatedDeals * 3000;

    const pendingApprovals = await db.select({ cnt: count() })
      .from(contentApprovals)
      .where(and(
        eq(contentApprovals.status, "pending"),
        eq(contentApprovals.clientId, client.id)
      ));
    const pendingApprovalsCount = pendingApprovals[0]?.cnt || 0;

    const recentLeads = clientLeads
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const leadsThisWeek = clientLeads.filter(l => new Date(l.createdAt) >= oneWeekAgo).length;
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    const leadsThisMonth = clientLeads.filter(l => new Date(l.createdAt) >= oneMonthAgo).length;

    let successScore = 0;
    if (totalLeads > 0) successScore += 20;
    if (totalLeads >= 10) successScore += 10;
    if (contacted > 0) successScore += 15;
    if (appointmentSet > 0) successScore += 20;
    if (completedAppointments > 0) successScore += 15;
    if (closedWon > 0) successScore += 20;
    successScore = Math.min(100, successScore);

    const sourceMap: Record<string, number> = {};
    clientLeads.forEach(l => {
      const src = l.source || "Unknown";
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const leadSources = Object.entries(sourceMap)
      .map(([source, cnt]) => ({ source, count: cnt }))
      .sort((a, b) => b.count - a.count);

    return {
      totalLeads, newLeads, contacted, qualified, appointmentSet,
      closedWon, closedLost, hotLeads, warmLeads,
      totalAppointments, completedAppointments, scheduledAppointments,
      showRate, conversionRate, estimatedRevenue, estimatedDeals,
      pendingApprovalsCount, recentLeads, leadsThisWeek, leadsThisMonth,
      successScore, leadSources,
      client: {
        id: client.id, name: client.name,
        subscriptionTier: client.subscriptionTier,
        subscriptionStatus: client.subscriptionStatus,
        accessMode: client.accessMode,
        trialEndDate: client.trialEndDate,
      },
    };
  }),

  getMyInfo: protectedProcedure.query(async ({ ctx }) => {
    const client = await resolveClient(ctx);
    // Admin users without a linked client record — return null gracefully
    if (!client) return null;

    const agency = await getAgencyById(client.agencyId);
    
    return {
      client,
      agency,
    };
  }),

  // ============= LEAD MANAGEMENT =============

  listMyLeads: protectedProcedure
    .input(z.object({
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(200).default(100),
      search: z.string().optional(),
      tag: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      // Skip access mode check for admins
      if (!isAdminUser(ctx.user.role) && client.accessMode === "limited") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Limited access mode. Please complete your strategy call to unlock full access.",
        });
      }

      const offset = (input.page - 1) * input.limit;
      const result = await getLeadsByClientIdPaginated(
        client.id,
        input.limit,
        offset,
        input.status,
        input.search,
        input.tag
      );
      return { leads: result.leads, total: result.total, page: input.page, limit: input.limit };
    }),

  getLead: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      const lead = await getLeadById(input.leadId);
      // Admins can view any lead; clients can only view their own
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      if (!isAdminUser(ctx.user.role) && lead.clientId !== client.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      return lead;
    }),

  createLead: protectedProcedure
    .input(z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      businessName: z.string().optional(),
      tags: z.array(z.string()).optional(),
      // Tier 1 fields
      contactType: z.enum(["borrower", "real_estate_agent", "attorney", "insurance_agent", "title_company", "builder_developer", "lender", "other"]).optional(),
      loanAmount: z.number().optional(),
      loanType: z.enum(["purchase", "refinance", "heloc", "reverse_mortgage", "construction", "other"]).optional(),
      probability: z.number().min(0).max(100).optional(),
      partnerTier: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
      partnerStage: z.enum(["prospect", "contacted", "meeting_scheduled", "active_partner", "top_partner"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      // Only block read-only access — limited/trial users can still add contacts
      if (!isAdminUser(ctx.user.role)) {
        if (client.accessMode === "read_only") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Read-only access. Contact your agency administrator.",
          });
        }
      }

      const leadResult = await createLead({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        company: input.businessName,
        source: input.source || "manual",
        notes: input.notes,
        contactType: input.contactType,
        loanAmount: input.loanAmount ? String(input.loanAmount) : undefined,
        loanType: input.loanType,
        probability: input.probability,
        partnerTier: input.partnerTier,
        partnerStage: input.partnerStage,
        tags: input.tags ? JSON.stringify(input.tags) : undefined,
        clientId: client.id,
        agencyId: client.agencyId,
      });

      // Check if auto-call is enabled for this lead source
      if (input.source) {
        const mapping = await getLeadSourceMapping(client.agencyId, input.source);
        if (mapping && mapping.autoCallEnabled) {
          // TODO: Trigger Vapi call with mapping.vapiAssistantId
        }
      }

      return { success: true };
    }),

  updateLeadStatus: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      // Skip access mode check for admins
      if (!isAdminUser(ctx.user.role) && client.accessMode !== "full") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify leads",
        });
      }

      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      if (!isAdminUser(ctx.user.role) && lead.clientId !== client.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      await updateLead(input.leadId, { status: input.status });
      
      // Log status change
      await createLeadActivity({
        leadId: input.leadId,
        activityType: "status_change",
        description: `Status changed to ${input.status}`,
        performedBy: ctx.user.id,
      });

      return { success: true };
    }),

  getLeadActivities: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      if (!isAdminUser(ctx.user.role) && lead.clientId !== client.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      return await getLeadActivities(input.leadId);
    }),

  addLeadNote: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      note: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      // Skip access mode check for admins
      if (!isAdminUser(ctx.user.role) && client.accessMode !== "full") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to add notes",
        });
      }

      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      if (!isAdminUser(ctx.user.role) && lead.clientId !== client.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      await createLeadActivity({
        leadId: input.leadId,
        activityType: "note",
        description: input.note,
        performedBy: ctx.user.id,
      });

      return { success: true };
    }),

  // Log a manual call with outcome, duration, and notes
  logCall: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      outcome: z.enum(["connected", "no_answer", "voicemail", "busy", "wrong_number", "callback_requested"]),
      duration: z.number().min(0).optional(), // seconds
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      }
      if (!isAdminUser(ctx.user.role) && client.accessMode !== "full") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to log calls" });
      }
      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      if (!isAdminUser(ctx.user.role) && lead.clientId !== client.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      const outcomeLabels: Record<string, string> = {
        connected: "Connected - Spoke with lead",
        no_answer: "No Answer",
        voicemail: "Left Voicemail",
        busy: "Line Busy",
        wrong_number: "Wrong Number",
        callback_requested: "Callback Requested",
      };

      const durationStr = input.duration 
        ? ` (${Math.floor(input.duration / 60)}m ${input.duration % 60}s)` 
        : "";
      const notesStr = input.notes ? `\n${input.notes}` : "";
      const description = `Manual call: ${outcomeLabels[input.outcome]}${durationStr}${notesStr}`;

      await createLeadActivity({
        leadId: input.leadId,
        activityType: "call",
        description,
        callDuration: input.duration,
        performedBy: ctx.user.id,
      });

      // Update lead status to "contacted" if it's still "new"
      const db = await getDb();
      if (db && lead.status === "new" && input.outcome === "connected") {
        await db.update(leads)
          .set({ status: "contacted", lastContactDate: new Date() })
          .where(eq(leads.id, input.leadId));
      } else if (db && input.outcome === "connected") {
        await db.update(leads)
          .set({ lastContactDate: new Date() })
          .where(eq(leads.id, input.leadId));
      }

      return { success: true };
    }),

  // Book an appointment for a lead
  bookLeadAppointment: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      appointmentDate: z.date(),
      appointmentType: z.enum(["consultation", "application", "closing", "follow_up"]).default("consultation"),
      duration: z.number().min(15).max(120).default(30),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      }
      if (!isAdminUser(ctx.user.role) && client.accessMode !== "full") {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to book appointments" });
      }
      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      if (!isAdminUser(ctx.user.role) && lead.clientId !== client.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Create appointment
      const result = await db.insert(appointments).values({
        agencyId: client.agencyId,
        leadId: input.leadId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email || "",
        phone: lead.phone || "",
        appointmentDate: input.appointmentDate,
        duration: input.duration,
        appointmentType: input.appointmentType,
        notes: input.notes,
        source: lead.source || "Manual",
        assignedTo: "loan_officer",
        status: "scheduled",
      });

      // Update lead status
      await db.update(leads)
        .set({
          status: "appointment_set",
          appointmentBookedAt: new Date(),
          appointmentDate: input.appointmentDate,
        })
        .where(eq(leads.id, input.leadId));

      // Log activity
      await createLeadActivity({
        leadId: input.leadId,
        activityType: "appointment",
        description: `Appointment booked for ${input.appointmentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${input.appointmentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} (${input.appointmentType})`,
        performedBy: ctx.user.id,
      });

      // Send push notification
      try {
        await pushAppointmentBooked({
          firstName: lead.firstName,
          lastName: lead.lastName || "",
          appointmentDate: input.appointmentDate.toISOString(),
          source: "Manual",
        });
      } catch (e) {
        console.error("[Book Appointment] Push notification failed:", e);
      }

      return { success: true };
    }),

  // ============= TIER 2: SLA ALERTS =============

  getSlaAlerts: protectedProcedure.query(async ({ ctx }) => {
    const client = await resolveClient(ctx);
    if (!client) return { newNotContacted: 0, noActivityIn7Days: 0, coldLeads: 0, newNotContactedLeads: [] };
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const now = Date.now();
    const h24 = 24 * 60 * 60 * 1000;
    const d7 = 7 * 24 * 60 * 60 * 1000;
    const d14 = 14 * 24 * 60 * 60 * 1000;

    const clientLeads = await db.select().from(leads).where(eq(leads.clientId, client.id));
    const activeLeads = clientLeads.filter(l => l.status !== "closed_won" && l.status !== "closed_lost");

    // New leads not contacted within 24h
    const newNotContacted = activeLeads.filter(l =>
      l.status === "new" &&
      (now - new Date(l.createdAt).getTime()) > h24
    );

    // Any active lead with no contact in 7 days
    const noActivityIn7Days = activeLeads.filter(l => {
      const lastContact = l.lastContactDate ? new Date(l.lastContactDate).getTime() : new Date(l.createdAt).getTime();
      return (now - lastContact) > d7;
    });

    // Cold leads (no activity in 14+ days)
    const coldLeads = activeLeads.filter(l => {
      const lastContact = l.lastContactDate ? new Date(l.lastContactDate).getTime() : new Date(l.createdAt).getTime();
      return (now - lastContact) > d14;
    });

    return {
      newNotContacted: newNotContacted.length,
      noActivityIn7Days: noActivityIn7Days.length,
      coldLeads: coldLeads.length,
      newNotContactedLeads: newNotContacted.slice(0, 5).map(l => ({ id: l.id, firstName: l.firstName, lastName: l.lastName, createdAt: l.createdAt })),
    };
  }),

  // ============= TIER 2: DATE-RANGE FILTERED STATS =============

  dashboardStatsByRange: protectedProcedure
    .input(z.object({
      range: z.enum(["today", "this_week", "this_month", "last_30_days", "last_90_days", "ytd"]).default("this_month"),
    }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) return { totalLeads: 0, newLeads: 0, contacted: 0, qualified: 0, appointmentSet: 0, closedWon: 0, closedLost: 0, conversionRate: 0, range: input.range };
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const now = new Date();
      let startDate: Date;
      switch (input.range) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "this_week": {
          const day = now.getDay();
          startDate = new Date(now);
          startDate.setDate(now.getDate() - day);
          startDate.setHours(0, 0, 0, 0);
          break;
        }
        case "this_month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case "last_30_days":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "last_90_days":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "ytd":
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const allLeads = await db.select().from(leads).where(eq(leads.clientId, client.id));
      const rangeLeads = allLeads.filter(l => new Date(l.createdAt) >= startDate);

      const newLeads = rangeLeads.filter(l => l.status === "new").length;
      const contacted = rangeLeads.filter(l => l.status === "contacted").length;
      const qualified = rangeLeads.filter(l => l.status === "qualified").length;
      const appointmentSet = rangeLeads.filter(l => l.status === "appointment_set" || l.status === "appointment_completed").length;
      const closedWon = rangeLeads.filter(l => l.status === "closed_won").length;
      const totalLeads = rangeLeads.length;
      const conversionRate = totalLeads > 0 ? Math.round((appointmentSet / totalLeads) * 100) : 0;

      const allAppointments = client.agencyId
        ? await db.select().from(appointments).where(eq(appointments.agencyId, client.agencyId))
        : [];
      const rangeAppts = allAppointments.filter(a => new Date(a.createdAt) >= startDate);
      const completedAppts = rangeAppts.filter(a => a.status === "completed").length;
      const scheduledAppts = rangeAppts.filter(a => a.status === "scheduled" || a.status === "confirmed").length;
      const estimatedRevenue = Math.round(completedAppts * 0.2) * 3000;

      // Pipeline value = sum of loan amounts for active leads in range
      const pipelineValue = rangeLeads
        .filter(l => l.status !== "closed_lost")
        .reduce((sum, l) => sum + (parseFloat(l.loanAmount || "0") || 0), 0);

      return {
        range: input.range,
        startDate: startDate.toISOString(),
        totalLeads, newLeads, contacted, qualified, appointmentSet, closedWon,
        conversionRate, completedAppts, scheduledAppts, estimatedRevenue, pipelineValue,
      };
    }),

  // ============= TIER 2: QUICK ACTIONS =============

  quickActionSendWelcome: protectedProcedure
    .mutation(async ({ ctx }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const h24 = 24 * 60 * 60 * 1000;
      const allLeads = await db.select().from(leads).where(eq(leads.clientId, client.id));
      const newLeads = allLeads.filter(l =>
        l.status === "new" &&
        l.email &&
        (Date.now() - new Date(l.createdAt).getTime()) <= h24
      );

      return { count: newLeads.length, message: `${newLeads.length} new lead(s) from the last 24h would receive a welcome email. Configure SendGrid to activate sending.` };
    }),

  quickActionReengage: protectedProcedure
    .mutation(async ({ ctx }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const d14 = 14 * 24 * 60 * 60 * 1000;
      const allLeads = await db.select().from(leads).where(eq(leads.clientId, client.id));
      const coldLeads = allLeads.filter(l => {
        if (l.status === "closed_won" || l.status === "closed_lost") return false;
        const lastContact = l.lastContactDate ? new Date(l.lastContactDate).getTime() : new Date(l.createdAt).getTime();
        return (Date.now() - lastContact) > d14 && l.email;
      });

      return { count: coldLeads.length, message: `${coldLeads.length} cold lead(s) not contacted in 14+ days would receive a re-engagement email.` };
    }),

  quickActionRateDropAlert: protectedProcedure
    .mutation(async ({ ctx }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const allLeads = await db.select().from(leads).where(eq(leads.clientId, client.id));
      const activeWithEmail = allLeads.filter(l =>
        l.status !== "closed_won" && l.status !== "closed_lost" && l.email
      );

      return { count: activeWithEmail.length, message: `${activeWithEmail.length} active lead(s) would receive a rate drop alert email.` };
    }),

  // ============= TIER 2: PIPELINE TYPE FILTER =============

  listLeadsByPipeline: protectedProcedure
    .input(z.object({
      pipelineType: z.enum(["loan", "sales"]).default("loan"),
      status: z.string().optional(),
      contactType: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) return [];
      if (!isAdminUser(ctx.user.role) && client.accessMode === "limited") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Limited access mode." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      let allLeads = await db.select().from(leads).where(eq(leads.clientId, client.id));;

      // Filter by pipeline type
      allLeads = allLeads.filter(l => (l.pipelineType || "loan") === input.pipelineType);

      // Filter by status if provided
      if (input.status) allLeads = allLeads.filter(l => l.status === input.status);

      // Filter by contact type if provided
      if (input.contactType) allLeads = allLeads.filter(l => l.contactType === input.contactType);

      return allLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),

  // ─── Global Search ────────────────────────────────────────────────────────
  globalSearch: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) return { leads: [], appointments: [], total: 0 };
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const q = `%${input.query.trim()}%`;

      // Search leads
      const leadResults = await db.select({
        id: leads.id,
        firstName: leads.firstName,
        lastName: leads.lastName,
        email: leads.email,
        phone: leads.phone,
        status: leads.status,
        contactType: leads.contactType,
        createdAt: leads.createdAt,
      }).from(leads).where(
        and(
          eq(leads.clientId, client.id),
          or(
            like(leads.firstName, q),
            like(leads.lastName, q),
            like(leads.email, q),
            like(leads.phone, q)
          )
        )
      ).limit(8);

      // Search referral partners
      const partnerResults = await db.select({
        id: referralPartners.id,
        firstName: referralPartners.firstName,
        lastName: referralPartners.lastName,
        email: referralPartners.email,
        phone: referralPartners.phone,
        company: referralPartners.company,
        partnerType: referralPartners.partnerType,
      }).from(referralPartners).where(
        and(
          eq(referralPartners.clientId, client.id),
          or(
            like(referralPartners.firstName, q),
            like(referralPartners.lastName, q),
            like(referralPartners.email, q),
            like(referralPartners.phone, q),
            like(referralPartners.company, q)
          )
        )
      ).limit(5);

      // Search appointments
      const apptResults = await db.select({
        id: appointments.id,
        firstName: appointments.firstName,
        lastName: appointments.lastName,
        email: appointments.email,
        phone: appointments.phone,
        appointmentDate: appointments.appointmentDate,
        status: appointments.status,
        appointmentType: appointments.appointmentType,
      }).from(appointments).where(
        client.agencyId
          ? and(
              eq(appointments.agencyId, client.agencyId),
              or(
                like(appointments.firstName, q),
                like(appointments.lastName, q),
                like(appointments.email, q),
                like(appointments.phone, q)
              )
            )
          : or(
              like(appointments.firstName, q),
              like(appointments.lastName, q),
              like(appointments.email, q),
              like(appointments.phone, q)
            )
      ).limit(5);

      return {
        leads: leadResults.map(l => ({ ...l, type: "lead" as const })),
        partners: partnerResults.map(p => ({ ...p, type: "partner" as const })),
        appointments: apptResults.map(a => ({ ...a, type: "appointment" as const })),
        total: leadResults.length + partnerResults.length + apptResults.length,
      };
    }),

  // ─── Bulk Lead Assignment ─────────────────────────────────────────────────
  bulkAssignLeads: protectedProcedure
    .input(z.object({
      leadIds: z.array(z.number()).min(1).max(100),
      assignedToUserId: z.number().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      let updated = 0;
      for (const leadId of input.leadIds) {
        const result = await db.update(leads)
          .set({ assignedToUserId: input.assignedToUserId })
          .where(and(eq(leads.id, leadId), eq(leads.clientId, client.id)));
        if ((result as any)[0]?.affectedRows > 0) updated++;
      }
      return { updated, total: input.leadIds.length };
    }),

  // ─── Bulk Status Update ───────────────────────────────────────────────────
  bulkUpdateLeadStatus: protectedProcedure
    .input(z.object({
      leadIds: z.array(z.number()).min(1).max(500),
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      // Batch update in chunks of 100 to avoid huge IN clauses
      let updated = 0;
      const chunkSize = 100;
      for (let i = 0; i < input.leadIds.length; i += chunkSize) {
        const chunk = input.leadIds.slice(i, i + chunkSize);
        const result = await db.update(leads)
          .set({ status: input.status, updatedAt: new Date() })
          .where(and(
            inArray(leads.id, chunk),
            eq(leads.clientId, client.id)
          ));
        updated += (result as any)[0]?.affectedRows ?? 0;
      }
      return { updated, total: input.leadIds.length };
    }),

  // ─── Get distinct lead tags for this client ───────────────────────────────
  getMyLeadTags: protectedProcedure
    .query(async ({ ctx }) => {
      const client = await resolveClient(ctx);
      if (!client) return [];
      return getDistinctLeadTags(client.id);
    }),

  // ─── Contact Type Counts (for sidebar subcategories) ──────────────────────
  getContactTypeCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const client = await resolveClient(ctx);
      if (!client) return { byType: {}, total: 0 };
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db.select({
        contactType: leads.contactType,
        cnt: count(leads.id),
      }).from(leads)
        .where(eq(leads.clientId, client.id))
        .groupBy(leads.contactType);
      const totalLeads = rows.reduce((sum, r) => sum + Number(r.cnt), 0);
      const byType: Record<string, number> = {};
      for (const r of rows) {
        byType[r.contactType ?? "borrower"] = Number(r.cnt);
      }
      return { total: totalLeads, byType };
    }),

  // ─── Extended stats for client dashboard ─────────────────────────────────
  extendedStats: protectedProcedure.query(async ({ ctx }) => {
    const IS_ADMIN = ADMIN_ROLES.includes(ctx.user.role);
    let allLeads: any[] = [];
    let allClients: any[] = [];

    if (IS_ADMIN) {
      const agency = await getAgencyByOwnerId(ctx.user.id);
      if (agency) {
        allLeads = await getLeadsByAgencyId(agency.id);
        allClients = await getClientsByAgencyId(agency.id);
      }
    } else {
      let client = await getClientByUserId(ctx.user.id);
      if (!client) client = await ensureClientProfile(ctx.user) ?? undefined;
      if (client) {
        allLeads = await getLeadsByClientId(client.id);
        allClients = [client];
      }
    }

    // Active leads
    const activeStatuses = ["new", "contacted", "qualified", "appointment_set"];
    const activeLeads = allLeads.filter((l: any) => activeStatuses.includes(l.status)).length;

    // Show rate
    const db = await getDb();
    let showRate = 0;
    let totalAppointments = 0;
    let completedAppointments = 0;
    if (db) {
      let apptRows: any[] = [];
      if (IS_ADMIN) {
        const agency = await getAgencyByOwnerId(ctx.user.id);
        if (agency) apptRows = await db.select().from(appointments).where(eq(appointments.agencyId, agency.id));
      } else if (allClients[0]?.agencyId) {
        apptRows = await db.select().from(appointments).where(eq(appointments.agencyId, allClients[0].agencyId));
      }
      totalAppointments = apptRows.length;
      completedAppointments = apptRows.filter((a: any) => a.status === "completed").length;
      showRate = totalAppointments > 0 ? Math.round((completedAppointments / totalAppointments) * 100) : 0;
    }

    // Revenue
    const closedWon = allLeads.filter((l: any) => l.status === "closed_won").length;
    const estimatedRevenue = allLeads
      .filter((l: any) => l.status === "closed_won")
      .reduce((sum: number, l: any) => sum + (l.dealValue || 3000), 0) || closedWon * 3000;

    // SEO performance
    let seoScore = 0;
    let seoViews = 0;
    let seoClicks = 0;
    let seoPublished = 0;
    try {
      const { getSeoClientByCrmId, getDb: getSeoDb } = await import("../seo-db");
      const { content: contentTable, contentAnalytics, contentQualityScores } = await import("../../drizzle/seo-schema");
      const { eq: eqSeo } = await import("drizzle-orm");
      const seoDb = await getSeoDb();
      if (seoDb) {
        const allContent: any[] = [];
        for (const c of allClients) {
          const sc = await getSeoClientByCrmId(c.id);
          if (sc) {
            const rows = await seoDb.select().from(contentTable).where(eqSeo(contentTable.clientId, sc.id));
            allContent.push(...rows);
          }
        }
        if (allContent.length > 0) {
          const contentIds = new Set(allContent.map((c: any) => c.id));
          const [analytics, scores] = await Promise.all([
            seoDb.select().from(contentAnalytics),
            seoDb.select().from(contentQualityScores),
          ]);
          const ca = analytics.filter((a: any) => contentIds.has(a.contentId));
          const cs = scores.filter((s: any) => contentIds.has(s.contentId));
          seoViews = ca.reduce((sum: number, a: any) => sum + (a.views || 0), 0);
          seoClicks = ca.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0);
          seoScore = cs.length > 0 ? Math.round(cs.reduce((sum: number, s: any) => sum + s.overallScore, 0) / cs.length) : 0;
          seoPublished = allContent.filter((c: any) => c.status === "published").length;
        }
      }
    } catch (_) { /* SEO DB not available */ }

    // Total engagement (lead activities)
    let totalEngagement = 0;
    if (db) {
      const { leadActivities } = await import("../../drizzle/schema");
      const { inArray } = await import("drizzle-orm");
      const leadIds = allLeads.map((l: any) => l.id);
      if (leadIds.length > 0) {
        const actRows = await db.select({ cnt: count() }).from(leadActivities).where(inArray(leadActivities.leadId, leadIds));
        totalEngagement = Number(actRows[0]?.cnt || 0);
      }
    }

    // Top 10% badge
    const conversionRate = allLeads.length > 0 ? Math.round((closedWon / allLeads.length) * 100) : 0;
    const isTop10Percent = conversionRate >= 15 || showRate >= 70 || closedWon >= 5;

    return {
      activeLeads,
      totalLeads: allLeads.length,
      showRate,
      totalAppointments,
      completedAppointments,
      estimatedRevenue,
      closedWon,
      seoScore,
      seoViews,
      seoClicks,
      seoPublished,
      totalEngagement,
      conversionRate,
      isTop10Percent,
      clientCount: allClients.length,
    };
  }),

  // ─── Update Lead Details ──────────────────────────────────────────────────
  updateLead: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional(),
      company: z.string().optional(),
      businessName: z.string().optional(), // alias for company
      source: z.string().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]).optional(),
      contactType: z.enum(["borrower", "real_estate_agent", "attorney", "insurance_agent", "title_company", "builder_developer", "lender", "other"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const lead = await getLeadById(input.leadId);
      if (!lead || (!isAdminUser(ctx.user.role) && lead.clientId !== client.id)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      const { leadId, tags, businessName, ...rest } = input;
      const updateData: any = { ...rest };
      // businessName is an alias for company
      if (businessName !== undefined) updateData.company = businessName;
      if (tags !== undefined) updateData.tags = JSON.stringify(tags);
      if (Object.keys(updateData).length > 0) {
        await updateLead(leadId, updateData);
      }
      return { success: true };
    }),

  // ─── Delete Lead ──────────────────────────────────────────────────────────
  deleteLead: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const lead = await getLeadById(input.leadId);
      if (!lead || (!isAdminUser(ctx.user.role) && lead.clientId !== client.id)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(leads).where(eq(leads.id, input.leadId));
      return { success: true };
    }),

  // ─── Bulk Delete Leads ────────────────────────────────────────────────────
  bulkDeleteLeads: protectedProcedure
    .input(z.object({ leadIds: z.array(z.number()).min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      let deleted = 0;
      const chunkSize = 100;
      for (let i = 0; i < input.leadIds.length; i += chunkSize) {
        const chunk = input.leadIds.slice(i, i + chunkSize);
        const result = await db.delete(leads).where(and(inArray(leads.id, chunk), eq(leads.clientId, client.id)));
        deleted += (result as any)[0]?.affectedRows ?? 0;
      }
      return { deleted };
    }),

  // ─── Bulk Add Tag ─────────────────────────────────────────────────────────
  bulkAddTag: protectedProcedure
    .input(z.object({ leadIds: z.array(z.number()).min(1).max(500), tag: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      let updated = 0;
      const chunkSize = 100;
      for (let i = 0; i < input.leadIds.length; i += chunkSize) {
        const chunk = input.leadIds.slice(i, i + chunkSize);
        // Use JSON_ARRAY_APPEND to add tag if not already present
        const result = await db.execute(
          sql`UPDATE leads SET tags = IF(JSON_SEARCH(tags, 'one', ${input.tag}) IS NULL, JSON_ARRAY_APPEND(COALESCE(tags, '[]'), '$', ${input.tag}), tags) WHERE id IN (${sql.join(chunk.map(id => sql`${id}`), sql`, `)}) AND client_id = ${client.id}`
        );
        updated += (result as any)[0]?.affectedRows ?? 0;
      }
      return { updated };
    }),

  // ─── Bulk Remove Tag ──────────────────────────────────────────────────────
  bulkRemoveTag: protectedProcedure
    .input(z.object({ leadIds: z.array(z.number()).min(1).max(500), tag: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      let updated = 0;
      const chunkSize = 100;
      for (let i = 0; i < input.leadIds.length; i += chunkSize) {
        const chunk = input.leadIds.slice(i, i + chunkSize);
        const result = await db.execute(
          sql`UPDATE leads SET tags = JSON_REMOVE(tags, IFNULL(JSON_UNQUOTE(JSON_SEARCH(tags, 'one', ${input.tag})), '$[999]')) WHERE id IN (${sql.join(chunk.map(id => sql`${id}`), sql`, `)}) AND client_id = ${client.id} AND JSON_SEARCH(tags, 'one', ${input.tag}) IS NOT NULL`
        );
        updated += (result as any)[0]?.affectedRows ?? 0;
      }
      return { updated };
    }),

  // ─── Smart Lists CRUD ─────────────────────────────────────────────────────
  getSmartLists: protectedProcedure
    .query(async ({ ctx }) => {
      const client = await resolveClient(ctx);
      if (!client) return [];
      const db = await getDb();
      if (!db) return [];
      return db.select().from(smartLists).where(eq(smartLists.clientId, client.id));
    }),

  createSmartList: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100), filters: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.insert(smartLists).values({ clientId: client.id, name: input.name, filters: input.filters });
      return { success: true };
    }),

  updateSmartList: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).max(100).optional(), filters: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { id, ...data } = input;
      await db.update(smartLists).set(data).where(and(eq(smartLists.id, id), eq(smartLists.clientId, client.id)));
      return { success: true };
    }),

  deleteSmartList: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.delete(smartLists).where(and(eq(smartLists.id, input.id), eq(smartLists.clientId, client.id)));
      return { success: true };
    }),
});
