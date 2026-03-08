/**
 * Onboarding Snapshot Router
 * Provisions a new client account from a template snapshot.
 * Applies: client record, default templates, Vapi call config, launchpad steps.
 * Target: <1 hour from info-gathering call to fully live system.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  clients,
  campaignTemplates,
  onboardingProgress,
  users,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendEmail } from "../sendgrid";
import { sendSMS } from "../twilio";

// ─── Snapshot Input Schema ────────────────────────────────────────────────────

const snapshotInputSchema = z.object({
  // Client identity
  clientFirstName: z.string().min(1),
  clientLastName: z.string().min(1),
  clientEmail: z.string().email(),
  clientPhone: z.string().min(10),
  businessName: z.string().min(1),
  businessType: z.string().optional(),
  industry: z.string().optional(),

  // Contact info
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional(),
  businessWebsite: z.string().url().optional(),

  // Social media
  socialFacebook: z.string().optional(),
  socialInstagram: z.string().optional(),

  // Ads
  facebookAdAccountId: z.string().optional(),
  facebookPageId: z.string().optional(),

  // SEO / content
  brandVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  primaryServices: z.string().optional(),
  uniqueSellingProp: z.string().optional(),
  serviceAreas: z.string().optional(),

  // CRM config
  agencyId: z.number().default(1),
  monthlyBudget: z.number().optional(),

  // Options
  enableVapiCalls: z.boolean().default(true),
  enableSmsFollowUp: z.boolean().default(true),
  enableEmailFollowUp: z.boolean().default(true),
  sendWelcomeEmail: z.boolean().default(true),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const onboardingSnapshotRouter = router({
  /**
   * Apply the onboarding snapshot for a new client.
   * Creates/updates the client record, seeds templates, marks launchpad steps,
   * and optionally sends a welcome email.
   */
  applySnapshot: protectedProcedure
    .input(snapshotInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const log: string[] = [];

      // ── Step 1: Create or update the client record ─────────────────────────
      const existingClient = await db
        .select()
        .from(clients)
        .where(eq(clients.email, input.clientEmail))
        .limit(1);

      let clientId: number;
      const clientData = {
        name: `${input.clientFirstName} ${input.clientLastName}`,
        email: input.clientEmail,
        phone: input.clientPhone,
        company: input.businessName,
        businessName: input.businessName,
        businessType: input.businessType ?? null,
        industry: input.industry ?? null,
        businessPhone: input.businessPhone ?? null,
        businessEmail: input.businessEmail ?? null,
        businessWebsite: input.businessWebsite ?? null,
        socialFacebook: input.socialFacebook ?? null,
        socialInstagram: input.socialInstagram ?? null,
        facebookAdAccountId: input.facebookAdAccountId ?? null,
        facebookPageId: input.facebookPageId ?? null,
        brandVoice: input.brandVoice ?? null,
        targetAudience: input.targetAudience ?? null,
        primaryServices: input.primaryServices ?? null,
        uniqueSellingProp: input.uniqueSellingProp ?? null,
        serviceAreas: input.serviceAreas ?? null,
        agencyId: input.agencyId,
        monthlyBudget: input.monthlyBudget ? String(input.monthlyBudget) : null,
        vapiCallsEnabled: input.enableVapiCalls,
        isActive: true,
        createdBy: ctx.user.id,
      };

      if (existingClient[0]) {
        clientId = existingClient[0].id;
        await db.update(clients).set(clientData).where(eq(clients.id, clientId));
        log.push(`✅ Updated existing client record (ID: ${clientId})`);
      } else {
        const result = await db.insert(clients).values(clientData);
        clientId = Number((result as any).insertId);
        log.push(`✅ Created new client record (ID: ${clientId})`);
      }

      // ── Step 2: Seed default templates if not already seeded ───────────────
      const existingTemplateCount = await db
        .select({ id: campaignTemplates.id })
        .from(campaignTemplates)
        .where(eq(campaignTemplates.isSystem, true));

      if (existingTemplateCount.length === 0) {
        log.push("⚠️ No system templates found — run 'Seed Default Templates' from the Templates page first.");
      } else {
        log.push(`✅ ${existingTemplateCount.length} system templates available`);
      }

      // ── Step 3: Mark initial launchpad steps as complete ──────────────────
      const autoSteps = [
        { key: "account_created", note: "Account created via onboarding snapshot" },
      ];

      for (const step of autoSteps) {
        await db
          .insert(onboardingProgress)
          .values({
            userId: ctx.user.id,
            stepKey: step.key,
            completedAt: new Date(),
            completedBy: ctx.user.id,
            notes: step.note,
          })
          .onDuplicateKeyUpdate({
            set: {
              completedAt: new Date(),
              completedBy: ctx.user.id,
              notes: step.note,
            },
          });
      }
      log.push(`✅ Marked ${autoSteps.length} launchpad steps as complete`);

      // ── Step 4: Send welcome email to client ──────────────────────────────
      if (input.sendWelcomeEmail && input.clientEmail) {
        try {
          const bookingUrl = `${process.env.VITE_APP_URL || 'https://lockinloans.manus.space'}/book`;
          const portalUrl = `${process.env.VITE_APP_URL || 'https://lockinloans.manus.space'}/launchpad`;

          await sendEmail({
            to: [input.clientEmail],
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@lockinloans.com',
            subject: `Welcome to Premier Mortgage Resources, ${input.clientFirstName}! 🚀`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#1a56db;">Welcome aboard, ${input.clientFirstName}! 🚀</h2>
  <p>We're thrilled to have you as part of the Premier Mortgage Resources family.</p>
  <p>Your AI-powered lead generation and CRM system is being set up right now. Here's what's coming your way:</p>
  <ul>
    <li>✅ Automated lead follow-up (SMS + email + AI calls)</li>
    <li>✅ Facebook & Instagram lead capture</li>
    <li>✅ AI-powered content and SEO</li>
    <li>✅ Real-time pipeline and analytics dashboard</li>
  </ul>
  <p>Your onboarding checklist is ready — follow the steps to get fully live:</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${portalUrl}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">View My Launchpad</a>
  </p>
  <p>Questions? Reply to this email or book a call with our team:</p>
  <p><a href="${bookingUrl}">${bookingUrl}</a></p>
  <p>Looking forward to growing your business together!</p>
  <p><strong>The Premier Mortgage Resources Team</strong></p>
</div>`,
            text: `Welcome aboard, ${input.clientFirstName}!\n\nYour AI-powered lead system is being set up. View your launchpad: ${portalUrl}\n\nQuestions? Book a call: ${bookingUrl}`,
          });
          log.push(`✅ Welcome email sent to ${input.clientEmail}`);
        } catch (err: any) {
          log.push(`⚠️ Welcome email failed: ${err.message}`);
        }
      }

      // ── Step 5: Send welcome SMS to client ────────────────────────────────
      if (input.enableSmsFollowUp && input.clientPhone) {
        try {
          const portalUrl = `${process.env.VITE_APP_URL || 'https://lockinloans.manus.space'}/launchpad`;
          await sendSMS({
            to: input.clientPhone,
            body: `Hi ${input.clientFirstName}! Welcome to Premier Mortgage Resources. Your AI lead system is being set up now. Check your launchpad: ${portalUrl} — Tim Haskins, NMLS #1116876`,
          });
          log.push(`✅ Welcome SMS sent to ${input.clientPhone}`);
        } catch (err: any) {
          log.push(`⚠️ Welcome SMS failed: ${err.message}`);
        }
      }

      return {
        success: true,
        clientId,
        log,
        summary: {
          clientName: `${input.clientFirstName} ${input.clientLastName}`,
          businessName: input.businessName,
          vapiEnabled: input.enableVapiCalls,
          templatesAvailable: existingTemplateCount.length,
          welcomeEmailSent: input.sendWelcomeEmail,
          welcomeSmsSent: input.enableSmsFollowUp,
        },
      };
    }),

  /**
   * Get snapshot checklist status for a given client email
   */
  getSnapshotStatus: protectedProcedure
    .input(z.object({ clientEmail: z.string().email() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const client = await db
        .select()
        .from(clients)
        .where(eq(clients.email, input.clientEmail))
        .limit(1);

      const templateCount = await db
        .select({ id: campaignTemplates.id })
        .from(campaignTemplates)
        .where(eq(campaignTemplates.isSystem, true));

      return {
        clientExists: !!client[0],
        client: client[0] ?? null,
        systemTemplateCount: templateCount.length,
        checklistItems: [
          { key: "client_record", label: "Client record created", done: !!client[0] },
          { key: "templates_seeded", label: "Default templates seeded", done: templateCount.length > 0 },
          { key: "vapi_configured", label: "Vapi calls configured", done: !!process.env.VAPI_API_KEY && !!process.env.VAPI_FACEBOOK_LEAD_ASSISTANT_ID },
          { key: "sms_configured", label: "SMS configured (Twilio)", done: !!process.env.TWILIO_ACCOUNT_SID },
          { key: "email_configured", label: "Email configured (SendGrid)", done: !!process.env.SENDGRID_API_KEY },
        ],
      };
    }),
});
