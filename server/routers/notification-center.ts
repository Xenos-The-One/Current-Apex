/**
 * Notification Center Router
 * Provides:
 *  - getNotificationLogs: paginated feed of all notification events
 *  - sendTestCampaign: fires every stage of a campaign to a test email
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../seo-db";
import { notificationLogs, emailTemplates, inboundEmails } from "../../drizzle/seo-schema";
import { desc, eq, and, gte, like, or, sql } from "drizzle-orm";
import { sendEmail } from "../email-service";
import { logNotification } from "../notification-logger";
import { notifyOwner } from "../_core/notification";

// ─── getNotificationLogs ─────────────────────────────────────────────────────
const getNotificationLogsInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
  channel: z.enum(["email", "sms", "push", "in_app", "all"]).default("all"),
  status: z.enum(["sent", "failed", "suppressed", "all"]).default("all"),
  type: z.string().optional(),
  search: z.string().optional(),
  since: z.number().optional(), // Unix ms timestamp
});

export const notificationCenterRouter = router({
  getNotificationLogs: protectedProcedure
    .input(getNotificationLogsInput)
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const offset = (input.page - 1) * input.limit;

      const conditions: ReturnType<typeof eq>[] = [];

      if (input.channel !== "all") {
        conditions.push(eq(notificationLogs.channel, input.channel));
      }
      if (input.status !== "all") {
        conditions.push(eq(notificationLogs.status, input.status));
      }
      if (input.since) {
        conditions.push(gte(notificationLogs.createdAt, new Date(input.since)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, countRows] = await Promise.all([
        db
          .select()
          .from(notificationLogs)
          .where(whereClause)
          .orderBy(desc(notificationLogs.createdAt))
          .limit(input.limit)
          .offset(offset),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(notificationLogs)
          .where(whereClause),
      ]);

      const total = Number(countRows[0]?.count ?? 0);

      return {
        logs: rows,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),

  // ─── getNotificationStats ───────────────────────────────────────────────────
  getNotificationStats: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        sent: sql<number>`SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
        suppressed: sql<number>`SUM(CASE WHEN status = 'suppressed' THEN 1 ELSE 0 END)`,
        emails: sql<number>`SUM(CASE WHEN channel = 'email' THEN 1 ELSE 0 END)`,
        sms: sql<number>`SUM(CASE WHEN channel = 'sms' THEN 1 ELSE 0 END)`,
        push: sql<number>`SUM(CASE WHEN channel = 'push' THEN 1 ELSE 0 END)`,
      })
      .from(notificationLogs);

    return {
      total: Number(stats?.total ?? 0),
      sent: Number(stats?.sent ?? 0),
      failed: Number(stats?.failed ?? 0),
      suppressed: Number(stats?.suppressed ?? 0),
      emails: Number(stats?.emails ?? 0),
      sms: Number(stats?.sms ?? 0),
      push: Number(stats?.push ?? 0),
    };
  }),

  // ─── sendTestCampaign ───────────────────────────────────────────────────────
  sendTestCampaign: protectedProcedure
    .input(
      z.object({
        campaignType: z.enum([
          "new_lead_welcome",
          "appointment_confirmation",
          "appointment_reminder_24h",
          "appointment_reminder_2h",
          "post_appointment_followup",
          "webinar_confirmation",
          "webinar_reminder_24h",
          "webinar_reminder_1h",
          "webinar_last_chance",
          "sales_followup_day1",
          "sales_followup_day3",
          "sales_followup_day7",
          "birthday_notification",
          "anniversary_6month",
          "anniversary_1year",
          "rank_alert",
          "seo_audit_report",
        ]),
        testEmail: z.string().email(),
        testName: z.string().default("Test Lead"),
        testPhone: z.string().default("+15551234567"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { campaignType, testEmail, testName, testPhone } = input;
      const now = new Date();
      const apptDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const templates: Record<string, { subject: string; html: string }> = {
        new_lead_welcome: {
          subject: "🏠 Welcome! We received your inquiry",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1e40af">Hi ${testName},</h2>
            <p>Thanks for reaching out! We've received your inquiry and a loan specialist will be in touch within the next few minutes.</p>
            <p>In the meantime, you can <a href="#" style="color:#1e40af">book a time that works for you</a>.</p>
            <p style="color:#6b7280;font-size:12px">NMLS #1116876 | This is a test email sent from Agency CRM</p>
          </div>`,
        },
        appointment_confirmation: {
          subject: "✅ Appointment Confirmed — ${testName}",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#16a34a">Your Appointment is Confirmed!</h2>
            <p>Hi ${testName},</p>
            <p>Your consultation is scheduled for <strong>${apptDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${apptDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</strong>.</p>
            <p>We'll send you a reminder 24 hours before your appointment.</p>
            <p style="color:#6b7280;font-size:12px">NMLS #1116876 | This is a test email sent from Agency CRM</p>
          </div>`,
        },
        appointment_reminder_24h: {
          subject: "⏰ Reminder: Your appointment is tomorrow",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#d97706">Appointment Reminder</h2>
            <p>Hi ${testName},</p>
            <p>Just a reminder that your consultation is <strong>tomorrow at ${apptDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</strong>.</p>
            <p>Please have your recent pay stubs and bank statements ready.</p>
            <p style="color:#6b7280;font-size:12px">NMLS #1116876 | This is a test email sent from Agency CRM</p>
          </div>`,
        },
        appointment_reminder_2h: {
          subject: "🔔 Your appointment is in 2 hours",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#d97706">See You Soon!</h2>
            <p>Hi ${testName},</p>
            <p>Your consultation is in <strong>2 hours</strong>. We're looking forward to speaking with you!</p>
            <p>If you need to reschedule, please call us immediately.</p>
            <p style="color:#6b7280;font-size:12px">NMLS #1116876 | This is a test email sent from Agency CRM</p>
          </div>`,
        },
        post_appointment_followup: {
          subject: "Thank you for meeting with us, ${testName}",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1e40af">Thank You!</h2>
            <p>Hi ${testName},</p>
            <p>It was great speaking with you today. As discussed, here are your next steps:</p>
            <ol>
              <li>Gather your last 2 years of tax returns</li>
              <li>Pull your credit report at AnnualCreditReport.com</li>
              <li>Reply to this email with any questions</li>
            </ol>
            <p style="color:#6b7280;font-size:12px">NMLS #1116876 | This is a test email sent from Agency CRM</p>
          </div>`,
        },
        webinar_confirmation: {
          subject: "🎉 You're registered! Homebuyers Webinar",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#7c3aed">You're In!</h2>
            <p>Hi ${testName},</p>
            <p>You're registered for the <strong>First-Time Homebuyers Webinar</strong>.</p>
            <p><strong>Date:</strong> ${apptDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}<br>
            <strong>Time:</strong> 7:00 PM PST</p>
            <p>We'll send you the Zoom link 24 hours before the event.</p>
            <p style="color:#6b7280;font-size:12px">NMLS #1116876 | This is a test email sent from Agency CRM</p>
          </div>`,
        },
        webinar_reminder_24h: {
          subject: "📅 Webinar Tomorrow — Don't Forget!",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#7c3aed">Webinar Tomorrow!</h2>
            <p>Hi ${testName},</p>
            <p>The First-Time Homebuyers Webinar is <strong>tomorrow at 7:00 PM PST</strong>.</p>
            <p><a href="https://zoom.us/j/test" style="background:#7c3aed;color:white;padding:12px 24px;text-decoration:none;border-radius:6px">Join Zoom Meeting</a></p>
            <p style="color:#6b7280;font-size:12px">NMLS #1116876 | This is a test email sent from Agency CRM</p>
          </div>`,
        },
        webinar_reminder_1h: {
          subject: "🚀 Webinar starts in 1 hour!",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#7c3aed">Starting Soon!</h2>
            <p>Hi ${testName},</p>
            <p>The webinar starts in <strong>1 hour</strong>. Click below to join:</p>
            <p><a href="https://zoom.us/j/test" style="background:#7c3aed;color:white;padding:12px 24px;text-decoration:none;border-radius:6px">Join Now</a></p>
            <p style="color:#6b7280;font-size:12px">NMLS #1116876 | This is a test email sent from Agency CRM</p>
          </div>`,
        },
        webinar_last_chance: {
          subject: "⚡ Last chance — Webinar starting NOW",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">We're Going Live!</h2>
            <p>Hi ${testName},</p>
            <p>The webinar is starting <strong>right now</strong>. Join us!</p>
            <p><a href="https://zoom.us/j/test" style="background:#dc2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px">Join Live Now</a></p>
            <p style="color:#6b7280;font-size:12px">NMLS #1116876 | This is a test email sent from Agency CRM</p>
          </div>`,
        },
        sales_followup_day1: {
          subject: "Quick follow-up from Tim — Premier Mortgage Resources",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <p>Hi ${testName},</p>
            <p>I wanted to follow up on your recent inquiry about home financing. I'd love to answer any questions you have.</p>
            <p>Are you available for a quick 15-minute call this week?</p>
            <p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p>
            <p style="color:#6b7280;font-size:12px">This is a test email sent from Agency CRM</p>
          </div>`,
        },
        sales_followup_day3: {
          subject: "Still thinking about buying a home?",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <p>Hi ${testName},</p>
            <p>I know life gets busy. I just wanted to check in — rates are moving and I want to make sure you don't miss a great opportunity.</p>
            <p>Reply to this email or call me directly at any time.</p>
            <p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p>
            <p style="color:#6b7280;font-size:12px">This is a test email sent from Agency CRM</p>
          </div>`,
        },
        sales_followup_day7: {
          subject: "One last thing, ${testName}",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <p>Hi ${testName},</p>
            <p>I don't want to keep filling your inbox, but I did want to leave the door open. If you're ever ready to explore your options, I'm here.</p>
            <p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p>
            <p style="color:#6b7280;font-size:12px">This is a test email sent from Agency CRM</p>
          </div>`,
        },
        birthday_notification: {
          subject: "🎂 Happy Birthday, ${testName}!",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#ec4899">Happy Birthday! 🎉</h2>
            <p>Hi ${testName},</p>
            <p>Wishing you a wonderful birthday! We're grateful to have had the opportunity to help you with your home journey.</p>
            <p>Best wishes,<br>Tim & Belinda Haskins<br>Premier Mortgage Resources | NMLS #1116876</p>
            <p style="color:#6b7280;font-size:12px">This is a test email sent from Agency CRM</p>
          </div>`,
        },
        anniversary_6month: {
          subject: "🏠 6 Months in Your New Home!",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#16a34a">6-Month Home Anniversary!</h2>
            <p>Hi ${testName},</p>
            <p>It's been 6 months since you closed on your home — congratulations! 🎉</p>
            <p>With rates changing, now might be a great time to review your mortgage. Would you like a free rate check?</p>
            <p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p>
            <p style="color:#6b7280;font-size:12px">This is a test email sent from Agency CRM</p>
          </div>`,
        },
        anniversary_1year: {
          subject: "🎊 1 Year in Your Home — Happy Anniversary!",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#16a34a">1-Year Home Anniversary!</h2>
            <p>Hi ${testName},</p>
            <p>One full year in your home! We hope you're loving it.</p>
            <p>Your home has likely appreciated in value. Would you like to explore refinancing options or a cash-out refi?</p>
            <p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p>
            <p style="color:#6b7280;font-size:12px">This is a test email sent from Agency CRM</p>
          </div>`,
        },
        rank_alert: {
          subject: "📉 Keyword Rank Alert — Position Drop Detected",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#dc2626">Rank Alert</h2>
            <p>Hi,</p>
            <p>A keyword for your client has dropped below the alert threshold:</p>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Keyword</strong></td><td style="padding:8px;border:1px solid #e5e7eb">best mortgage rates las vegas</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Previous Position</strong></td><td style="padding:8px;border:1px solid #e5e7eb">12</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Current Position</strong></td><td style="padding:8px;border:1px solid #e5e7eb">28</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Alert Threshold</strong></td><td style="padding:8px;border:1px solid #e5e7eb">Position 20</td></tr>
            </table>
            <p style="color:#6b7280;font-size:12px">This is a test email sent from Agency CRM</p>
          </div>`,
        },
        seo_audit_report: {
          subject: "📊 SEO Audit Report — Test Client",
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1e40af">SEO Audit Report</h2>
            <p>Here is the latest SEO audit for <strong>Test Client</strong>:</p>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Overall Score</strong></td><td style="padding:8px;border:1px solid #e5e7eb">72/100</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Top Issue</strong></td><td style="padding:8px;border:1px solid #e5e7eb">Missing meta descriptions on 8 pages</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Keywords Tracked</strong></td><td style="padding:8px;border:1px solid #e5e7eb">24</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb"><strong>Content Published</strong></td><td style="padding:8px;border:1px solid #e5e7eb">12 articles</td></tr>
            </table>
            <p style="color:#6b7280;font-size:12px">This is a test email sent from Agency CRM</p>
          </div>`,
        },
      };

      const template = templates[campaignType];
      if (!template) {
        throw new Error(`Unknown campaign type: ${campaignType}`);
      }

      // Replace placeholders
      const subject = template.subject.replace(/\$\{testName\}/g, testName);
      const html = template.html.replace(/\$\{testName\}/g, testName).replace(/\$\{testPhone\}/g, testPhone);

      // Send the test email — sendEmail handles logging to notification_logs internally
      const emailResult = await sendEmail({
        to: testEmail,
        from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
        subject: `[TEST] ${subject}`,
        html,
      });

      // Notify owner
      await notifyOwner({
        title: emailResult.success ? "Test Campaign Sent" : "Test Campaign Failed",
        content: emailResult.success
          ? `Campaign "${campaignType}" test email sent to ${testEmail} by ${ctx.user.name ?? ctx.user.email}`
          : `Campaign "${campaignType}" FAILED for ${testEmail}: ${emailResult.error}`,
      });

      return { success: emailResult.success, campaignType, sentTo: testEmail, error: emailResult.error };
    }),

  // ─── sendAllTestCampaigns ───────────────────────────────────────────────────
  // Fires all 17 campaign templates sequentially and returns per-campaign results.
  sendAllTestCampaigns: protectedProcedure
    .input(
      z.object({
        testEmail: z.string().email(),
        testName: z.string().default("Test Lead"),
        testPhone: z.string().default("+15551234567"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { testEmail, testName, testPhone } = input;

      const ALL_CAMPAIGN_TYPES = [
        "new_lead_welcome",
        "appointment_confirmation",
        "appointment_reminder_24h",
        "appointment_reminder_2h",
        "post_appointment_followup",
        "webinar_confirmation",
        "webinar_reminder_24h",
        "webinar_reminder_1h",
        "webinar_last_chance",
        "sales_followup_day1",
        "sales_followup_day3",
        "sales_followup_day7",
        "birthday_notification",
        "anniversary_6month",
        "anniversary_1year",
        "rank_alert",
        "seo_audit_report",
      ] as const;

      const results: Array<{ campaignType: string; success: boolean; error?: string }> = [];

      for (const campaignType of ALL_CAMPAIGN_TYPES) {
        try {
          const now = new Date();
          const apptDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

          const templates: Record<string, { subject: string; html: string }> = {
            new_lead_welcome: {
              subject: "🏠 Welcome! We received your inquiry",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#1e40af">Hi ${testName},</h2><p>Thanks for reaching out! We've received your inquiry and a loan specialist will be in touch within the next few minutes.</p><p style="color:#6b7280;font-size:12px">NMLS #1116876 | Test email from Agency CRM</p></div>`,
            },
            appointment_confirmation: {
              subject: `✅ Appointment Confirmed — ${testName}`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#16a34a">Your Appointment is Confirmed!</h2><p>Hi ${testName},</p><p>Your consultation is scheduled for <strong>${apptDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at ${apptDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</strong>.</p><p style="color:#6b7280;font-size:12px">NMLS #1116876 | Test email from Agency CRM</p></div>`,
            },
            appointment_reminder_24h: {
              subject: "⏰ Reminder: Your appointment is tomorrow",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#d97706">Appointment Reminder</h2><p>Hi ${testName},</p><p>Your consultation is <strong>tomorrow at ${apptDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</strong>.</p><p style="color:#6b7280;font-size:12px">NMLS #1116876 | Test email from Agency CRM</p></div>`,
            },
            appointment_reminder_2h: {
              subject: "🔔 Your appointment is in 2 hours",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#d97706">See You Soon!</h2><p>Hi ${testName},</p><p>Your consultation is in <strong>2 hours</strong>.</p><p style="color:#6b7280;font-size:12px">NMLS #1116876 | Test email from Agency CRM</p></div>`,
            },
            post_appointment_followup: {
              subject: `Thank you for meeting with us, ${testName}`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#1e40af">Thank You!</h2><p>Hi ${testName},</p><p>It was great speaking with you today. Next steps: gather tax returns, pull credit report, reply with questions.</p><p style="color:#6b7280;font-size:12px">NMLS #1116876 | Test email from Agency CRM</p></div>`,
            },
            webinar_confirmation: {
              subject: "🎉 You're registered! Homebuyers Webinar",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#7c3aed">You're In!</h2><p>Hi ${testName},</p><p>You're registered for the <strong>First-Time Homebuyers Webinar</strong> on ${apptDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} at 7:00 PM PST.</p><p style="color:#6b7280;font-size:12px">NMLS #1116876 | Test email from Agency CRM</p></div>`,
            },
            webinar_reminder_24h: {
              subject: "📅 Webinar Tomorrow — Don't Forget!",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#7c3aed">Webinar Tomorrow!</h2><p>Hi ${testName},</p><p>The First-Time Homebuyers Webinar is <strong>tomorrow at 7:00 PM PST</strong>.</p><p style="color:#6b7280;font-size:12px">NMLS #1116876 | Test email from Agency CRM</p></div>`,
            },
            webinar_reminder_1h: {
              subject: "🚀 Webinar starts in 1 hour!",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#7c3aed">Starting Soon!</h2><p>Hi ${testName},</p><p>The webinar starts in <strong>1 hour</strong>.</p><p style="color:#6b7280;font-size:12px">NMLS #1116876 | Test email from Agency CRM</p></div>`,
            },
            webinar_last_chance: {
              subject: "⚡ Last chance — Webinar starting NOW",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#dc2626">We're Going Live!</h2><p>Hi ${testName},</p><p>The webinar is starting <strong>right now</strong>.</p><p style="color:#6b7280;font-size:12px">NMLS #1116876 | Test email from Agency CRM</p></div>`,
            },
            sales_followup_day1: {
              subject: "Quick follow-up from Tim — Premier Mortgage Resources",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><p>Hi ${testName},</p><p>I wanted to follow up on your recent inquiry about home financing. Are you available for a quick 15-minute call this week?</p><p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p><p style="color:#6b7280;font-size:12px">Test email from Agency CRM</p></div>`,
            },
            sales_followup_day3: {
              subject: "Still thinking about buying a home?",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><p>Hi ${testName},</p><p>Rates are moving and I want to make sure you don't miss a great opportunity. Reply or call me anytime.</p><p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p><p style="color:#6b7280;font-size:12px">Test email from Agency CRM</p></div>`,
            },
            sales_followup_day7: {
              subject: `One last thing, ${testName}`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><p>Hi ${testName},</p><p>I don't want to keep filling your inbox, but I did want to leave the door open. If you're ever ready to explore your options, I'm here.</p><p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p><p style="color:#6b7280;font-size:12px">Test email from Agency CRM</p></div>`,
            },
            birthday_notification: {
              subject: `🎂 Happy Birthday, ${testName}!`,
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#ec4899">Happy Birthday! 🎉</h2><p>Hi ${testName},</p><p>Wishing you a wonderful birthday! We're grateful to have had the opportunity to help you with your home journey.</p><p>Best wishes,<br>Tim & Belinda Haskins<br>Premier Mortgage Resources | NMLS #1116876</p><p style="color:#6b7280;font-size:12px">Test email from Agency CRM</p></div>`,
            },
            anniversary_6month: {
              subject: "🏠 6 Months in Your New Home!",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#16a34a">6-Month Home Anniversary!</h2><p>Hi ${testName},</p><p>It's been 6 months since you closed on your home — congratulations! 🎉 With rates changing, now might be a great time to review your mortgage.</p><p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p><p style="color:#6b7280;font-size:12px">Test email from Agency CRM</p></div>`,
            },
            anniversary_1year: {
              subject: "🎊 1 Year in Your Home — Happy Anniversary!",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#16a34a">1-Year Home Anniversary!</h2><p>Hi ${testName},</p><p>One full year in your home! Your home has likely appreciated in value. Would you like to explore refinancing options?</p><p>Best,<br>Tim Haskins<br>Premier Mortgage Resources | NMLS #1116876</p><p style="color:#6b7280;font-size:12px">Test email from Agency CRM</p></div>`,
            },
            rank_alert: {
              subject: "📉 Keyword Rank Alert — Position Drop Detected",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#dc2626">Rank Alert</h2><p>A keyword has dropped below the alert threshold: <strong>best mortgage rates las vegas</strong> moved from position 12 to 28 (threshold: 20).</p><p style="color:#6b7280;font-size:12px">Test email from Agency CRM</p></div>`,
            },
            seo_audit_report: {
              subject: "📊 SEO Audit Report — Test Client",
              html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><h2 style="color:#1e40af">SEO Audit Report</h2><p>Overall Score: <strong>72/100</strong>. Top issue: Missing meta descriptions on 8 pages. Keywords tracked: 24. Content published: 12 articles.</p><p style="color:#6b7280;font-size:12px">Test email from Agency CRM</p></div>`,
            },
          };

          const template = templates[campaignType];
          if (!template) throw new Error(`Unknown campaign type: ${campaignType}`);

          const subject = template.subject;
          const html = template.html;

          const emailResult = await sendEmail({
            to: testEmail,
            from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
            subject: `[TEST] ${subject}`,
            html,
          });

          // sendEmail already logs to notification_logs (both success and failure)
          // Just record the result here
          if (emailResult.success) {
            results.push({ campaignType, success: true });
          } else {
            results.push({ campaignType, success: false, error: emailResult.error ?? "Send failed" });
          }
        } catch (err: any) {
          results.push({ campaignType, success: false, error: err.message });
        }
      }

      const sent = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      await notifyOwner({
        title: `Campaign Test Run Complete`,
        content: `All 17 campaigns tested by ${ctx.user.name ?? ctx.user.email}: ${sent} sent, ${failed} failed`,
      });

      return { results, sent, failed, total: results.length, sentTo: testEmail };
    }),

  // ─── Email Template CRUD ─────────────────────────────────────────────────────────
  getEmailTemplates: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    const templates = await db.select().from(emailTemplates).orderBy(emailTemplates.category, emailTemplates.name);
    return templates;
  }),

  upsertEmailTemplate: protectedProcedure
    .input(z.object({
      campaignType: z.string().min(1),
      name: z.string().min(1),
      description: z.string().optional(),
      fromAddress: z.string().email().default("noreply@lockinloans.com"),
      subject: z.string().min(1),
      html: z.string().min(1),
      category: z.string().default("general"),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.insert(emailTemplates).values(input).onDuplicateKeyUpdate({
        set: {
          name: input.name,
          description: input.description,
          fromAddress: input.fromAddress,
          subject: input.subject,
          html: input.html,
          category: input.category,
          isActive: input.isActive,
        },
      });
      const [updated] = await db.select().from(emailTemplates).where(eq(emailTemplates.campaignType, input.campaignType));
      return updated;
    }),

  deleteEmailTemplate: protectedProcedure
    .input(z.object({ campaignType: z.string() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(emailTemplates).where(eq(emailTemplates.campaignType, input.campaignType));
      return { success: true };
    }),

  sendTemplateTest: protectedProcedure
    .input(z.object({
      campaignType: z.string(),
      testEmail: z.string().email(),
      testName: z.string().default("Test User"),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.campaignType, input.campaignType));
      if (!template) throw new Error(`Template not found: ${input.campaignType}`);
      const html = template.html
        .replace(/\{\{name\}\}/g, input.testName)
        .replace(/\{\{firstName\}\}/g, input.testName.split(" ")[0]);
      const result = await sendEmail({
        to: input.testEmail,
        from: template.fromAddress,
        subject: `[TEST] ${template.subject}`,
        html,
      });
      return result;
    }),

  // ─── Inbound Email (Client Reply) Inbox ─────────────────────────────────────────
  getInboundEmails: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(50),
      isRead: z.boolean().optional(),
      isReplied: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const offset = (input.page - 1) * input.limit;
      const conditions = [];
      if (input.isRead !== undefined) conditions.push(eq(inboundEmails.isRead, input.isRead));
      if (input.isReplied !== undefined) conditions.push(eq(inboundEmails.isReplied, input.isReplied));
      const rows = await db.select().from(inboundEmails)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(inboundEmails.createdAt))
        .limit(input.limit)
        .offset(offset);
      const [{ total }] = await db.select({ total: sql<number>`COUNT(*)` }).from(inboundEmails)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      const [{ unread }] = await db.select({ unread: sql<number>`SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END)` }).from(inboundEmails);
      return { emails: rows, total: Number(total), unread: Number(unread ?? 0), page: input.page, limit: input.limit };
    }),

  markEmailRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(inboundEmails).set({ isRead: true }).where(eq(inboundEmails.id, input.id));
      return { success: true };
    }),

  replyToEmail: protectedProcedure
    .input(z.object({
      id: z.number(),
      replyBody: z.string().min(1),
      replyHtml: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [email] = await db.select().from(inboundEmails).where(eq(inboundEmails.id, input.id));
      if (!email) throw new Error("Email not found");
      const html = input.replyHtml ?? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><p>${input.replyBody.replace(/\n/g, "<br>")}</p><p style="color:#6b7280;font-size:12px;margin-top:20px">Tim Haskins | Premier Mortgage Resources | NMLS #1116876<br>tim.haskins@pmrloans.com</p></div>`;
      const result = await sendEmail({
        to: email.fromEmail,
        from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
        subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
        html,
      });
      if (result.success) {
        await db.update(inboundEmails).set({
          isReplied: true,
          repliedAt: new Date(),
          replyBody: input.replyBody,
          isRead: true,
        }).where(eq(inboundEmails.id, input.id));
      }
      return result;
    }),

  deleteInboundEmail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(inboundEmails).where(eq(inboundEmails.id, input.id));
      return { success: true };
    }),

  getInboundEmailStats: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    const [stats] = await db.select({
      total: sql<number>`COUNT(*)`,
      unread: sql<number>`SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END)`,
      unreplied: sql<number>`SUM(CASE WHEN is_replied = 0 THEN 1 ELSE 0 END)`,
    }).from(inboundEmails);
    return { total: Number(stats.total), unread: Number(stats.unread ?? 0), unreplied: Number(stats.unreplied ?? 0) };
  }),
});
