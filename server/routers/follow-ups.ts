import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import {
  getClientByUserId,
  getClientById,
  getLeadsByClientId,
  getLeadsByAgencyId,
  getAgencyByOwnerId,
  getAllAgencies,
  getLeadActivities,
  getDb,
  createLeadActivity,
  updateLead,
} from "../db";
import { leads, leadActivities } from "../../drizzle/schema";
import { eq, and, desc, isNull, lt, or, sql, gte, gt } from "drizzle-orm";
import { sendSMS } from "../twilio";
import { sendEmail as sendEmailService } from "../email-service";

const ADMIN_ROLES = ["admin", "super_admin", "agency_owner"];

async function resolveClientForFollowUps(ctx: { user: { id: number; role: string }; req: any }) {
  const isAdmin = ADMIN_ROLES.includes(ctx.user.role);
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
  return await getClientByUserId(ctx.user.id);
}

// ─── Shared suggestion builder ────────────────────────────────────────────────
type Suggestion = {
  leadId: number;
  leadName: string;
  phone: string | null;
  email: string | null;
  status: string;
  source: string | null;
  urgency: "high" | "medium" | "low";
  reason: string;
  suggestedAction: string;
  daysSinceLastContact: number | null;
  daysSinceCreated: number;
  score: number;
  snoozedUntil: string | null;
};

function buildSuggestions(clientLeads: any[], includeSnoozed = false): Suggestion[] {
  const now = new Date();
  const suggestions: Suggestion[] = [];

  for (const lead of clientLeads) {
    // Skip snoozed leads unless explicitly requested
    if (!includeSnoozed && lead.snoozedUntil && new Date(lead.snoozedUntil) > now) {
      continue;
    }

    const daysSinceCreated = Math.floor(
      (now.getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysSinceLastContact = lead.lastContactDate
      ? Math.floor(
          (now.getTime() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
        )
      : null;

    // Skip closed leads
    if (lead.status === "closed_won" || lead.status === "closed_lost") continue;

    // 1. NEW leads — always suggest follow-up immediately (speed-to-lead is critical)
    if (lead.status === "new") {
      suggestions.push({
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        source: lead.source,
        urgency: daysSinceCreated >= 3 ? "high" : daysSinceCreated >= 1 ? "medium" : "high",
        reason: daysSinceCreated === 0
          ? `New lead just added — contact within 5 minutes for best conversion`
          : `New lead waiting ${daysSinceCreated} day${daysSinceCreated > 1 ? "s" : ""} for first contact`,
        suggestedAction: lead.phone
          ? `Call ${lead.firstName} at ${lead.phone} — first contact is critical within 24 hours`
          : `Email ${lead.firstName} — no phone number available, send introductory email`,
        daysSinceLastContact,
        daysSinceCreated,
        score: lead.score || 0,
        snoozedUntil: lead.snoozedUntil ? new Date(lead.snoozedUntil).toISOString() : null,
      });
      continue;
    }

    // 2. CONTACTED leads with no follow-up in 3+ days (MEDIUM urgency)
    if (lead.status === "contacted" && daysSinceLastContact !== null && daysSinceLastContact >= 3) {
      suggestions.push({
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        source: lead.source,
        urgency: daysSinceLastContact >= 7 ? "high" : "medium",
        reason: `No follow-up in ${daysSinceLastContact} days after initial contact`,
        suggestedAction: `Follow up with ${lead.firstName} — they may have gone cold. Try a different approach (text if you called, call if you emailed)`,
        daysSinceLastContact,
        daysSinceCreated,
        score: lead.score || 0,
        snoozedUntil: lead.snoozedUntil ? new Date(lead.snoozedUntil).toISOString() : null,
      });
      continue;
    }

    // 3. QUALIFIED leads not moved to appointment (MEDIUM urgency)
    if (lead.status === "qualified" && daysSinceLastContact !== null && daysSinceLastContact >= 2) {
      suggestions.push({
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        source: lead.source,
        urgency: "medium",
        reason: `Qualified lead waiting ${daysSinceLastContact} days — ready to book appointment`,
        suggestedAction: `Book a consultation with ${lead.firstName} — they're qualified and waiting. Offer specific time slots.`,
        daysSinceLastContact,
        daysSinceCreated,
        score: lead.score || 0,
        snoozedUntil: lead.snoozedUntil ? new Date(lead.snoozedUntil).toISOString() : null,
      });
      continue;
    }

    // 4. APPOINTMENT_SET but appointment date has passed without completion (HIGH urgency)
    if (lead.status === "appointment_set" && lead.appointmentDate) {
      const apptDate = new Date(lead.appointmentDate);
      if (apptDate < now) {
        suggestions.push({
          leadId: lead.id,
          leadName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
          phone: lead.phone,
          email: lead.email,
          status: lead.status,
          source: lead.source,
          urgency: "high",
          reason: `Appointment was scheduled for ${apptDate.toLocaleDateString()} but not marked as completed`,
          suggestedAction: `Update ${lead.firstName}'s appointment status — did they show? If yes, mark completed. If no-show, reschedule immediately.`,
          daysSinceLastContact,
          daysSinceCreated,
          score: lead.score || 0,
          snoozedUntil: lead.snoozedUntil ? new Date(lead.snoozedUntil).toISOString() : null,
        });
        continue;
      }
    }

    // 5. HOT leads (score >= 80) that haven't been contacted recently (HIGH urgency)
    if (
      (lead.score || 0) >= 80 &&
      lead.status !== "appointment_set" &&
      daysSinceLastContact !== null &&
      daysSinceLastContact >= 2
    ) {
      suggestions.push({
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName || ""}`.trim(),
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        source: lead.source,
        urgency: "high",
        reason: `Hot lead (score: ${lead.score}) with no contact in ${daysSinceLastContact} days`,
        suggestedAction: `Priority: Call ${lead.firstName} now — high-intent lead cooling off. Mention their specific interest.`,
        daysSinceLastContact,
        daysSinceCreated,
        score: lead.score || 0,
        snoozedUntil: lead.snoozedUntil ? new Date(lead.snoozedUntil).toISOString() : null,
      });
      continue;
    }
  }

  // Sort by urgency (high first) then by days since last contact (longest first)
  suggestions.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    return (b.daysSinceLastContact || b.daysSinceCreated) - (a.daysSinceLastContact || a.daysSinceCreated);
  });

  return suggestions;
}

export const followUpsRouter = router({
  // ─── Dashboard widget: top 10 suggestions ────────────────────────────────
  getSuggested: protectedProcedure.query(async ({ ctx }) => {
    const client = await resolveClientForFollowUps(ctx);
    let clientLeads: any[] = [];

    if (!client) {
      // Admin/agency_owner without impersonation — show leads across their entire agency
      const isAdmin = ADMIN_ROLES.includes(ctx.user.role);
      if (isAdmin) {
        let agency = await getAgencyByOwnerId(ctx.user.id);
        if (!agency) {
          // Fallback: use the first available agency (handles seed data where owner_id may differ)
          const allAgencies = await getAllAgencies();
          if (allAgencies.length > 0) agency = allAgencies[0];
        }
        if (agency) {
          clientLeads = await getLeadsByAgencyId(agency.id);
        }
      }
      if (clientLeads.length === 0) {
        return { suggestions: [], summary: "No leads found. Add leads to see follow-up suggestions." };
      }
    } else {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      clientLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.clientId, client.id))
        .orderBy(desc(leads.createdAt));
      if (clientLeads.length === 0) {
        return {
          suggestions: [],
          summary: "No leads found. Start capturing leads to see follow-up suggestions.",
        };
      }
    }

    const allSuggestions = buildSuggestions(clientLeads);
    const topSuggestions = allSuggestions.slice(0, 10);

    let summary = "";
    if (topSuggestions.length > 0) {
      const highCount = topSuggestions.filter((s) => s.urgency === "high").length;
      const mediumCount = topSuggestions.filter((s) => s.urgency === "medium").length;
      summary = `${topSuggestions.length} leads need your attention`;
      if (highCount > 0) summary += ` (${highCount} urgent)`;
      if (mediumCount > 0) summary += ` (${mediumCount} medium priority)`;
      summary += ". Focus on the urgent ones first to prevent leads from going cold.";
    } else {
      summary = "All leads are on track. Great job staying on top of your follow-ups!";
    }

    return { suggestions: topSuggestions, summary };
  }),

  // ─── Full page: all suggestions with filters ─────────────────────────────
  getAllSuggested: protectedProcedure
    .input(
      z.object({
        urgency: z.enum(["all", "high", "medium", "low"]).default("all"),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const client = await resolveClientForFollowUps(ctx);
      let clientLeads: any[] = [];
      if (!client) {
        const isAdmin = ADMIN_ROLES.includes(ctx.user.role);
        if (isAdmin) {
          let agency = await getAgencyByOwnerId(ctx.user.id);
          if (!agency) {
            const allAgencies = await getAllAgencies();
            if (allAgencies.length > 0) agency = allAgencies[0];
          }
          if (agency) clientLeads = await getLeadsByAgencyId(agency.id);
        }
        if (clientLeads.length === 0) {
          return { suggestions: [], summary: "No leads found.", counts: { high: 0, medium: 0, low: 0, total: 0 }, completionRate: 0, snoozedCount: 0 };
        }
      } else {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        clientLeads = await db
          .select()
          .from(leads)
          .where(eq(leads.clientId, client.id))
          .orderBy(desc(leads.createdAt));
        if (clientLeads.length === 0) {
          return {
            suggestions: [],
            summary: "No leads found.",
            counts: { high: 0, medium: 0, low: 0, total: 0 },
            completionRate: 0,
            snoozedCount: 0,
          };
        }
      }

      const allSuggestions = buildSuggestions(clientLeads);

      // Count snoozed leads
      const now = new Date();
      const snoozedCount = clientLeads.filter(
        (l) => l.snoozedUntil && new Date(l.snoozedUntil) > now
      ).length;

      const counts = {
        high: allSuggestions.filter((s) => s.urgency === "high").length,
        medium: allSuggestions.filter((s) => s.urgency === "medium").length,
        low: allSuggestions.filter((s) => s.urgency === "low").length,
        total: allSuggestions.length,
      };

      // Completion rate: leads contacted in last 7 days / total leads needing follow-up last 7 days
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentlyContacted = clientLeads.filter(
        (l) => l.lastContactDate && new Date(l.lastContactDate) >= sevenDaysAgo
      ).length;
      const totalActive = clientLeads.filter(
        (l) => l.status !== "closed_won" && l.status !== "closed_lost"
      ).length;
      const completionRate = totalActive > 0 ? Math.round((recentlyContacted / totalActive) * 100) : 0;

      let filtered = allSuggestions;
      if (input.urgency !== "all") {
        filtered = filtered.filter((s) => s.urgency === input.urgency);
      }
      if (input.search) {
        const q = input.search.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.leadName.toLowerCase().includes(q) ||
            (s.phone && s.phone.includes(q)) ||
            (s.email && s.email.toLowerCase().includes(q))
        );
      }

      const summary =
        counts.total > 0
          ? `${counts.total} leads need attention${counts.high > 0 ? ` — ${counts.high} urgent` : ""}`
          : "All leads are on track. Great job staying on top of your follow-ups!";

      return { suggestions: filtered, summary, counts, completionRate, snoozedCount };
    }),

  // ─── AI message drafting ──────────────────────────────────────────────────
  getMessageSuggestion: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        channel: z.enum(["sms", "email", "call_script"]).default("sms"),
      })
    )
     .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForFollowUps(ctx);
      if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "No client profile linked. Select a client to manage." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      const activities = await db
        .select()
        .from(leadActivities)
        .where(eq(leadActivities.leadId, input.leadId))
        .orderBy(desc(leadActivities.createdAt))
        .limit(5);

      const activitySummary = activities
        .map((a) => `${a.activityType}: ${a.description} (${new Date(a.createdAt).toLocaleDateString()})`)
        .join("\n");

      const channelInstructions = {
        sms: "Write a short, friendly SMS message (under 160 characters). Be conversational and include a clear call-to-action.",
        email:
          "Write a professional but warm email with a subject line. Keep it concise (3-4 sentences max). Include a clear next step.",
        call_script:
          "Write a brief call script with an opening line, key talking points, and a closing that books an appointment.",
      };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a follow-up message assistant for a mortgage loan officer. ${channelInstructions[input.channel]}
            
The loan officer's name is ${client.name}. Be professional but personable. Focus on helping the lead with their mortgage needs.
Never be pushy. Always provide value. Reference their specific situation when possible.`,
          },
          {
            role: "user",
            content: `Generate a follow-up ${input.channel === "call_script" ? "call script" : input.channel} for this lead:

Name: ${lead.firstName} ${lead.lastName || ""}
Status: ${lead.status}
Source: ${lead.source || "Unknown"}
Score: ${lead.score || 0}/140
Days since created: ${Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
Last contact: ${lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleDateString() : "Never contacted"}
Notes: ${lead.notes || "None"}

Recent activity:
${activitySummary || "No recent activity"}`,
          },
        ],
      });

      const message =
        response.choices?.[0]?.message?.content || "Unable to generate suggestion. Please try again.";

      return { message, channel: input.channel, leadName: `${lead.firstName} ${lead.lastName || ""}`.trim() };
    }),

  // ─── Mark a lead as contacted ─────────────────────────────────────────────
  markContacted: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        channel: z.enum(["call", "sms", "email"]).default("call"),
        note: z.string().optional(),
      })
    )
     .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForFollowUps(ctx);
      if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "No client profile linked. Select a client to manage." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      // Update lastContactDate; promote "new" → "contacted"
      const updateData: any = { lastContactDate: new Date() };
      if (lead.status === "new") updateData.status = "contacted";
      await updateLead(input.leadId, updateData);

      // Log the activity
      await createLeadActivity({
        leadId: input.leadId,
        activityType: input.channel,
        description: input.note || `Marked as contacted via ${input.channel} from Follow-Ups page`,
        performedBy: ctx.user.id,
      });

      return { success: true };
    }),

  // ─── Bulk mark multiple leads as contacted ────────────────────────────────
  bulkMarkContacted: protectedProcedure
    .input(
      z.object({
        leadIds: z.array(z.number()).min(1).max(50),
        channel: z.enum(["call", "sms", "email"]).default("call"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForFollowUps(ctx);
      if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "No client profile linked. Select a client to manage." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      let updated = 0;
      for (const leadId of input.leadIds) {
        const [lead] = await db.select().from(leads).where(
          and(eq(leads.id, leadId), eq(leads.clientId, client.id))
        ).limit(1);
        if (!lead) continue;

        const updateData: any = { lastContactDate: new Date() };
        if (lead.status === "new") updateData.status = "contacted";
        await updateLead(leadId, updateData);
        await createLeadActivity({
          leadId,
          activityType: input.channel,
          description: `Bulk marked as contacted via ${input.channel}`,
          performedBy: ctx.user.id,
        });
        updated++;
      }

      return { success: true, updated };
    }),

  // ─── Snooze a follow-up for a lead ───────────────────────────────────────
  snooze: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        days: z.number().min(1).max(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForFollowUps(ctx);
      if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "No client profile linked. Select a client to manage." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [lead] = await db.select().from(leads).where(
        and(eq(leads.id, input.leadId), eq(leads.clientId, client.id))
      ).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      const snoozedUntil = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);
      await updateLead(input.leadId, { snoozedUntil } as any);

      await createLeadActivity({
        leadId: input.leadId,
        activityType: "note",
        description: `Follow-up snoozed for ${input.days} day${input.days > 1 ? "s" : ""} until ${snoozedUntil.toLocaleDateString()}`,
        performedBy: ctx.user.id,
      });

      return { success: true, snoozedUntil: snoozedUntil.toISOString() };
    }),

  // ─── Bulk snooze multiple leads ───────────────────────────────────────────
  bulkSnooze: protectedProcedure
    .input(
      z.object({
        leadIds: z.array(z.number()).min(1).max(50),
        days: z.number().min(1).max(30),
      })
    )
      .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForFollowUps(ctx);
      if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "No client profile linked. Select a client to manage." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const snoozedUntil = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000);
      let updated = 0;
      for (const leadId of input.leadIds) {
        const [lead] = await db.select().from(leads).where(
          and(eq(leads.id, leadId), eq(leads.clientId, client.id))
        ).limit(1);
        if (!lead) continue;
        await updateLead(leadId, { snoozedUntil } as any);
        updated++;
      }

      return { success: true, updated, snoozedUntil: snoozedUntil.toISOString() };
    }),

  // ─── Get completion stats ─────────────────────────────────────────────────
  getCompletionStats: protectedProcedure.query(async ({ ctx }) => {
    const client = await resolveClientForFollowUps(ctx);
    if (!client) return { weeklyRate: 0, monthlyRate: 0, contactedThisWeek: 0, contactedThisMonth: 0, totalActive: 0, snoozedCount: 0 };

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.clientId, client.id));

    const activeLeads = allLeads.filter(
      (l) => l.status !== "closed_won" && l.status !== "closed_lost"
    );

    const contactedThisWeek = activeLeads.filter(
      (l) => l.lastContactDate && new Date(l.lastContactDate) >= sevenDaysAgo
    ).length;

    const contactedThisMonth = activeLeads.filter(
      (l) => l.lastContactDate && new Date(l.lastContactDate) >= thirtyDaysAgo
    ).length;

    const weeklyRate = activeLeads.length > 0
      ? Math.round((contactedThisWeek / activeLeads.length) * 100)
      : 0;

    const monthlyRate = activeLeads.length > 0
      ? Math.round((contactedThisMonth / activeLeads.length) * 100)
      : 0;

    const snoozedCount = activeLeads.filter(
      (l) => l.snoozedUntil && new Date(l.snoozedUntil) > now
    ).length;

    return {
      weeklyRate,
      monthlyRate,
      contactedThisWeek,
      contactedThisMonth,
      totalActive: activeLeads.length,
      snoozedCount,
    };
  }),

  // ─── Send an email directly from the follow-ups panel ──────────────────
  sendFollowUpEmail: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForFollowUps(ctx);
      if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "No client profile linked." });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      if (!lead.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Lead has no email address" });
      const result = await sendEmailService({
        to: lead.email,
        subject: input.subject,
        html: input.body.replace(/\n/g, "<br>"),
      });
      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Email failed to send",
        });
      }
      // Update lastContactDate and log activity
      await updateLead(input.leadId, { lastContactDate: new Date() });
      await createLeadActivity({
        leadId: input.leadId,
        activityType: "email",
        description: `Email sent: "${input.subject}"`,
        performedBy: ctx.user.id,
      });
      // ── Upsert conversation record so message appears in Conversations page ──
      try {
        const agencyId = client.agencyId || client.agency_id;
        const contactName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.email;
        const messageContent = `Subject: ${input.subject}\n\n${input.body}`;
        // Find existing email conversation for this lead
        const [existingRows] = await (db as any).execute(
          `SELECT id FROM conversations WHERE agencyId = ? AND leadId = ? AND channel = 'email' AND isArchived = 0 LIMIT 1`,
          [agencyId, lead.id]
        );
        let convId: number;
        if ((existingRows as any[]).length > 0) {
          convId = (existingRows as any[])[0].id;
          await (db as any).execute(
            `UPDATE conversations SET lastMessageAt = NOW(), lastMessagePreview = ?, isRead = 0, updatedAt = NOW() WHERE id = ?`,
            [messageContent.slice(0, 200), convId]
          );
        } else {
          const [ins] = await (db as any).execute(
            `INSERT INTO conversations (agencyId, leadId, channel, contactName, contactEmail, lastMessageAt, lastMessagePreview, isRead, isArchived, createdAt, updatedAt) VALUES (?, ?, 'email', ?, ?, NOW(), ?, 0, 0, NOW(), NOW())`,
            [agencyId, lead.id, contactName, lead.email, messageContent.slice(0, 200)]
          );
          convId = (ins as any).insertId;
        }
        await (db as any).execute(
          `INSERT INTO conversation_messages (conversationId, agencyId, direction, content, status, sentByUserId, createdAt) VALUES (?, ?, 'outbound', ?, 'sent', ?, NOW())`,
          [convId, agencyId, messageContent, ctx.user.id]
        );
      } catch (e) {
        console.error("[followUp] Failed to log email to conversations:", e);
      }
      return { success: true, demo: result.demo };
    }),

  // ─── Send an SMS directly from the follow-ups page ───────────────────────
  sendFollowUpSMS: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        message: z.string().min(1).max(1600),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClientForFollowUps(ctx);
      if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "No client profile linked. Select a client to manage." });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      if (!lead.phone) throw new TRPCError({ code: "BAD_REQUEST", message: "Lead has no phone number" });

      const result = await sendSMS({
        to: lead.phone,
        body: input.message,
        leadContext: {
          email: lead.email,
          isTest: lead.isTest,
          firstName: lead.firstName || undefined,
          lastName: lead.lastName || undefined,
        },
      });

      if (!result.success && !result.demo) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "SMS failed to send",
        });
      }

      // Update lastContactDate and log activity
      await updateLead(input.leadId, { lastContactDate: new Date() });
      await createLeadActivity({
        leadId: input.leadId,
        activityType: "sms",
        description: `SMS sent: "${input.message.substring(0, 80)}${input.message.length > 80 ? "..." : ""}"`,
        performedBy: ctx.user.id,
      });

      // ── Upsert conversation record so message appears in Conversations page ──
      try {
        const agencyId = client.agencyId || client.agency_id;
        const contactName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || lead.phone;
        // Find existing SMS conversation for this lead
        const [existingRows] = await (db as any).execute(
          `SELECT id FROM conversations WHERE agencyId = ? AND leadId = ? AND channel = 'sms' AND isArchived = 0 LIMIT 1`,
          [agencyId, lead.id]
        );
        let convId: number;
        if ((existingRows as any[]).length > 0) {
          convId = (existingRows as any[])[0].id;
          await (db as any).execute(
            `UPDATE conversations SET lastMessageAt = NOW(), lastMessagePreview = ?, isRead = 0, updatedAt = NOW() WHERE id = ?`,
            [input.message.slice(0, 200), convId]
          );
        } else {
          const [ins] = await (db as any).execute(
            `INSERT INTO conversations (agencyId, leadId, channel, contactName, contactPhone, lastMessageAt, lastMessagePreview, isRead, isArchived, createdAt, updatedAt) VALUES (?, ?, 'sms', ?, ?, NOW(), ?, 0, 0, NOW(), NOW())`,
            [agencyId, lead.id, contactName, lead.phone, input.message.slice(0, 200)]
          );
          convId = (ins as any).insertId;
        }
        await (db as any).execute(
          `INSERT INTO conversation_messages (conversationId, agencyId, direction, content, status, sentByUserId, createdAt) VALUES (?, ?, 'outbound', ?, 'sent', ?, NOW())`,
          [convId, agencyId, input.message, ctx.user.id]
        );
      } catch (e) {
        console.error("[followUp] Failed to log SMS to conversations:", e);
      }

      return { success: true, demo: result.demo };
    }),
});
