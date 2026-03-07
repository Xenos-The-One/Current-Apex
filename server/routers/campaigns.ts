import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { campaignTemplates, emailCampaigns, smsCampaigns } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const campaignsRouter = router({
  // ── Email Campaigns ──────────────────────────────────────────────────────
  listEmail: protectedProcedure
    .input(z.object({ agencyId: z.number(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(emailCampaigns)
        .where(eq(emailCampaigns.agencyId, input.agencyId))
        .orderBy(desc(emailCampaigns.createdAt))
        .limit(input.limit).offset(input.offset);
    }),

  getEmailById: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [campaign] = await db.select().from(emailCampaigns)
        .where(and(eq(emailCampaigns.id, input.id), eq(emailCampaigns.agencyId, input.agencyId))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      return campaign;
    }),

  createEmail: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1),
      subject: z.string().min(1),
      fromName: z.string().optional(),
      fromEmail: z.string().email().optional(),
      content: z.string().min(1),
      audienceFilter: z.any().optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(emailCampaigns).values({ ...input, createdByUserId: ctx.user.id, audienceFilter: input.audienceFilter ? JSON.stringify(input.audienceFilter) : null });
      return { id: (result as any).insertId };
    }),

  updateEmail: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      name: z.string().optional(),
      subject: z.string().optional(),
      content: z.string().optional(),
      fromName: z.string().optional(),
      fromEmail: z.string().optional(),
      status: z.enum(["draft", "scheduled", "sending", "sent", "paused", "cancelled"]).optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      await db.update(emailCampaigns).set(rest).where(and(eq(emailCampaigns.id, id), eq(emailCampaigns.agencyId, agencyId)));
      return { success: true };
    }),

  deleteEmail: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(emailCampaigns).where(and(eq(emailCampaigns.id, input.id), eq(emailCampaigns.agencyId, input.agencyId)));
      return { success: true };
    }),

  // ── SMS Campaigns ────────────────────────────────────────────────────────
  listSms: protectedProcedure
    .input(z.object({ agencyId: z.number(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(smsCampaigns)
        .where(eq(smsCampaigns.agencyId, input.agencyId))
        .orderBy(desc(smsCampaigns.createdAt))
        .limit(input.limit).offset(input.offset);
    }),

  createSms: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1),
      message: z.string().min(1),
      fromNumber: z.string().optional(),
      audienceFilter: z.any().optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(smsCampaigns).values({ ...input, createdByUserId: ctx.user.id, audienceFilter: input.audienceFilter ? JSON.stringify(input.audienceFilter) : null });
      return { id: (result as any).insertId };
    }),

  updateSms: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      name: z.string().optional(),
      message: z.string().optional(),
      status: z.enum(["draft", "scheduled", "sending", "sent", "paused", "cancelled"]).optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      await db.update(smsCampaigns).set(rest).where(and(eq(smsCampaigns.id, id), eq(smsCampaigns.agencyId, agencyId)));
      return { success: true };
    }),

  deleteSms: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(smsCampaigns).where(and(eq(smsCampaigns.id, input.id), eq(smsCampaigns.agencyId, input.agencyId)));
      return { success: true };
    }),

  // ── Templates ────────────────────────────────────────────────────────────
  listTemplates: protectedProcedure
    .input(z.object({ agencyId: z.number(), type: z.enum(["email", "sms"]).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(campaignTemplates.agencyId, input.agencyId)];
      if (input.type) conditions.push(eq(campaignTemplates.type, input.type));
      return db.select().from(campaignTemplates).where(and(...conditions)).orderBy(campaignTemplates.name);
    }),

  createTemplate: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string().min(1),
      type: z.enum(["email", "sms"]),
      subject: z.string().optional(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(campaignTemplates).values(input);
      return { id: (result as any).insertId };
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(campaignTemplates).where(and(eq(campaignTemplates.id, input.id), eq(campaignTemplates.agencyId, input.agencyId)));
      return { success: true };
    }),

  // ── Send (via SendGrid / Twilio) ─────────────────────────────────────────
  sendEmail: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      agencyId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [campaign] = await db.select().from(emailCampaigns)
        .where(and(eq(emailCampaigns.id, input.campaignId), eq(emailCampaigns.agencyId, input.agencyId))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });

      const sendgridKey = process.env.SENDGRID_API_KEY;
      if (!sendgridKey) {
        // Mark as sent in demo mode
        await db.update(emailCampaigns).set({ status: "sent", sentAt: new Date() })
          .where(eq(emailCampaigns.id, input.campaignId));
        return { success: true, demo: true, message: "Demo mode: SENDGRID_API_KEY not configured" };
      }

      try {
        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: { "Authorization": `Bearer ${sendgridKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: campaign.fromEmail || "noreply@example.com" }] }],
            from: { email: campaign.fromEmail || "noreply@example.com", name: campaign.fromName || "CRM" },
            subject: campaign.subject,
            content: [{ type: "text/html", value: campaign.content }],
          }),
        });
        if (!response.ok) throw new Error(`SendGrid error: ${response.status}`);
        await db.update(emailCampaigns).set({ status: "sent", sentAt: new Date() })
          .where(eq(emailCampaigns.id, input.campaignId));
        return { success: true };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),

  sendSms: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      agencyId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [campaign] = await db.select().from(smsCampaigns)
        .where(and(eq(smsCampaigns.id, input.campaignId), eq(smsCampaigns.agencyId, input.agencyId))).limit(1);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });

      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioSid || !twilioToken || !twilioPhone) {
        await db.update(smsCampaigns).set({ status: "sent", sentAt: new Date() })
          .where(eq(smsCampaigns.id, input.campaignId));
        return { success: true, demo: true, message: "Demo mode: Twilio credentials not configured" };
      }

      try {
        const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: "POST",
          headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ From: twilioPhone, To: campaign.fromNumber || twilioPhone, Body: campaign.message }),
        });
        if (!response.ok) throw new Error(`Twilio error: ${response.status}`);
        await db.update(smsCampaigns).set({ status: "sent", sentAt: new Date() })
          .where(eq(smsCampaigns.id, input.campaignId));
        return { success: true };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),
});
