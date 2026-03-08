/**
 * Template Seeding Router
 * Seeds all default SMS/email follow-up sequences for Premier Mortgage Resources.
 * Admin-only. Safe to run multiple times (upserts by name).
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { campaignTemplates } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Template Definitions ────────────────────────────────────────────────────

const DEFAULT_TEMPLATES = [
  // ── 1. Instant Welcome (SMS) ─────────────────────────────────────────────
  {
    name: "Welcome — Instant SMS",
    type: "sms" as const,
    category: "welcome",
    content: "Hi {{firstName}}! Thanks for your interest in a home loan. Tim Haskins (NMLS #1116876) from Premier Mortgage Resources will be reaching out to you shortly. Reply STOP to opt out.",
    variables: ["firstName"],
    isSystem: true,
  },
  // ── 2. Instant Welcome (Email) ───────────────────────────────────────────
  {
    name: "Welcome — Instant Email",
    type: "email" as const,
    category: "welcome",
    subject: "Welcome, {{firstName}}! Your mortgage consultation is almost ready",
    content: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#1a56db;">Hi {{firstName}},</h2>
  <p>Thank you for your interest in a home loan with Premier Mortgage Resources!</p>
  <p><strong>Tim Haskins (NMLS #1116876)</strong> will be reaching out to you shortly to discuss your options.</p>
  <p>In the meantime, you can book a consultation at your convenience:</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="{{bookingUrl}}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Book My Consultation</a>
  </p>
  <p style="color:#666;font-size:13px;">Premier Mortgage Resources &bull; NMLS #1116876<br/>Reply to this email if you have any questions.</p>
</div>`,
    variables: ["firstName", "bookingUrl"],
    isSystem: true,
  },
  // ── 3. Day 1 Follow-Up (SMS) ─────────────────────────────────────────────
  {
    name: "Day 1 Follow-Up — SMS",
    type: "sms" as const,
    category: "follow_up",
    content: "Hi {{firstName}}, this is Tim Haskins from Premier Mortgage Resources. I wanted to follow up on your home loan inquiry. Are you available for a quick 10-minute call today? Reply YES and I'll call you right away, or visit {{bookingUrl}} to pick a time. Reply STOP to opt out.",
    variables: ["firstName", "bookingUrl"],
    isSystem: true,
  },
  // ── 4. Day 1 Follow-Up (Email) ───────────────────────────────────────────
  {
    name: "Day 1 Follow-Up — Email",
    type: "email" as const,
    category: "follow_up",
    subject: "{{firstName}}, let's talk about your home loan options",
    content: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#1a56db;">Hi {{firstName}},</h2>
  <p>I wanted to personally follow up on your home loan inquiry from yesterday.</p>
  <p>At Premier Mortgage Resources, we specialize in helping people like you navigate the mortgage process with confidence. Whether you're buying your first home, refinancing, or exploring your options — I'm here to help.</p>
  <p><strong>Here's what I can do for you:</strong></p>
  <ul>
    <li>Pre-qualify you in as little as 15 minutes</li>
    <li>Compare rates from multiple lenders to find you the best deal</li>
    <li>Guide you through every step of the process</li>
  </ul>
  <p style="text-align:center;margin:24px 0;">
    <a href="{{bookingUrl}}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Schedule My Free Consultation</a>
  </p>
  <p>Looking forward to speaking with you,</p>
  <p><strong>Tim Haskins</strong><br/>NMLS #1116876 | Premier Mortgage Resources<br/>📞 {{agentPhone}}</p>
</div>`,
    variables: ["firstName", "bookingUrl", "agentPhone"],
    isSystem: true,
  },
  // ── 5. Day 3 Nurture (SMS) ───────────────────────────────────────────────
  {
    name: "Day 3 Nurture — SMS",
    type: "sms" as const,
    category: "nurture",
    content: "Hi {{firstName}}, Tim from Premier Mortgage Resources here. Just checking in — did you get a chance to look at your loan options? Rates are still great right now. Book a quick call: {{bookingUrl}} Reply STOP to opt out.",
    variables: ["firstName", "bookingUrl"],
    isSystem: true,
  },
  // ── 6. Day 3 Nurture (Email) ─────────────────────────────────────────────
  {
    name: "Day 3 Nurture — Email",
    type: "email" as const,
    category: "nurture",
    subject: "{{firstName}}, mortgage rates are moving — here's what you need to know",
    content: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#1a56db;">Hi {{firstName}},</h2>
  <p>I wanted to share a quick market update that could affect your home purchase or refinance.</p>
  <p>Mortgage rates have been fluctuating, and locking in the right rate at the right time can save you thousands over the life of your loan. The good news? I can help you navigate this.</p>
  <p><strong>Did you know?</strong></p>
  <ul>
    <li>A 0.5% difference in rate on a $400,000 loan = ~$120/month savings</li>
    <li>Pre-qualification takes just 15 minutes and doesn't affect your credit score</li>
    <li>We work with 20+ lenders to find you the best rate available</li>
  </ul>
  <p style="text-align:center;margin:24px 0;">
    <a href="{{bookingUrl}}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Get My Free Rate Quote</a>
  </p>
  <p>Tim Haskins | NMLS #1116876 | Premier Mortgage Resources</p>
</div>`,
    variables: ["firstName", "bookingUrl"],
    isSystem: true,
  },
  // ── 7. Day 7 Re-Engagement (SMS) ─────────────────────────────────────────
  {
    name: "Day 7 Re-Engagement — SMS",
    type: "sms" as const,
    category: "re_engagement",
    content: "Hi {{firstName}}, it's Tim from Premier Mortgage Resources. I haven't heard back and wanted to make sure I didn't miss you. Are you still looking for a home loan? Reply YES and I'll reach out, or reply STOP to unsubscribe.",
    variables: ["firstName"],
    isSystem: true,
  },
  // ── 8. Day 7 Re-Engagement (Email) ───────────────────────────────────────
  {
    name: "Day 7 Re-Engagement — Email",
    type: "email" as const,
    category: "re_engagement",
    subject: "Still thinking about it, {{firstName}}? No pressure — just here to help",
    content: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#1a56db;">Hi {{firstName}},</h2>
  <p>I noticed we haven't connected yet, and I completely understand — buying a home or refinancing is a big decision and takes time.</p>
  <p>I just wanted to let you know that I'm still here whenever you're ready. There's no pressure and no obligation — just a free conversation about your options.</p>
  <p>Many of my clients tell me that one 15-minute call completely changed how they thought about the process. I'd love to do the same for you.</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="{{bookingUrl}}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Let's Talk — Book a Free Call</a>
  </p>
  <p>If you've already found what you need or this isn't the right time, no worries at all. I wish you the best!</p>
  <p>Tim Haskins | NMLS #1116876 | Premier Mortgage Resources</p>
</div>`,
    variables: ["firstName", "bookingUrl"],
    isSystem: true,
  },
  // ── 9. Appointment Confirmation (SMS) ────────────────────────────────────
  {
    name: "Appointment Confirmation — SMS",
    type: "sms" as const,
    category: "appointment",
    content: "Hi {{firstName}}! Your consultation with Tim Haskins is confirmed for {{appointmentDate}} at {{appointmentTime}}. We'll call you at {{phone}}. Reply STOP to opt out.",
    variables: ["firstName", "appointmentDate", "appointmentTime", "phone"],
    isSystem: true,
  },
  // ── 10. Appointment Confirmation (Email) ─────────────────────────────────
  {
    name: "Appointment Confirmation — Email",
    type: "email" as const,
    category: "appointment",
    subject: "Your consultation is confirmed, {{firstName}}!",
    content: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#1a56db;">Your consultation is confirmed! 🎉</h2>
  <p>Hi {{firstName}},</p>
  <p>We're looking forward to speaking with you. Here are your appointment details:</p>
  <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0;">
    <p style="margin:0;"><strong>Date:</strong> {{appointmentDate}}</p>
    <p style="margin:8px 0 0;"><strong>Time:</strong> {{appointmentTime}}</p>
    <p style="margin:8px 0 0;"><strong>With:</strong> Tim Haskins, NMLS #1116876</p>
    <p style="margin:8px 0 0;"><strong>Phone:</strong> {{agentPhone}}</p>
  </div>
  <p><strong>To prepare for your call:</strong></p>
  <ul>
    <li>Have your income information handy (pay stubs, W-2s)</li>
    <li>Know your approximate credit score (we can check it for free)</li>
    <li>Think about your ideal purchase price or refinance goal</li>
  </ul>
  <p>See you soon!</p>
  <p>Tim Haskins | NMLS #1116876 | Premier Mortgage Resources</p>
</div>`,
    variables: ["firstName", "appointmentDate", "appointmentTime", "agentPhone"],
    isSystem: true,
  },
  // ── 11. Appointment Reminder — 24hr (SMS) ────────────────────────────────
  {
    name: "Appointment Reminder 24hr — SMS",
    type: "sms" as const,
    category: "appointment",
    content: "Reminder: Your mortgage consultation with Tim Haskins is tomorrow at {{appointmentTime}}. He'll call you at {{phone}}. Questions? Reply to this message. Reply STOP to opt out.",
    variables: ["appointmentTime", "phone"],
    isSystem: true,
  },
  // ── 12. Appointment Reminder — 1hr (SMS) ─────────────────────────────────
  {
    name: "Appointment Reminder 1hr — SMS",
    type: "sms" as const,
    category: "appointment",
    content: "Hi {{firstName}}! Your consultation with Tim Haskins is in 1 hour at {{appointmentTime}}. He'll call you at {{phone}}. See you soon! Reply STOP to opt out.",
    variables: ["firstName", "appointmentTime", "phone"],
    isSystem: true,
  },
  // ── 13. Post-Appointment Follow-Up (SMS) ─────────────────────────────────
  {
    name: "Post-Appointment Follow-Up — SMS",
    type: "sms" as const,
    category: "post_appointment",
    content: "Hi {{firstName}}, great speaking with you today! I'll send over your personalized loan options shortly. In the meantime, feel free to reply with any questions. - Tim, NMLS #1116876",
    variables: ["firstName"],
    isSystem: true,
  },
  // ── 14. Post-Appointment Follow-Up (Email) ───────────────────────────────
  {
    name: "Post-Appointment Follow-Up — Email",
    type: "email" as const,
    category: "post_appointment",
    subject: "Your personalized loan options, {{firstName}}",
    content: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#1a56db;">Hi {{firstName}},</h2>
  <p>It was great speaking with you today! As promised, here's a summary of what we discussed and your next steps.</p>
  <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0;">
    <p style="margin:0;font-weight:bold;">Your Next Steps:</p>
    <ol style="margin:12px 0 0;padding-left:20px;">
      <li>Review the loan options I'll send to your email within 24 hours</li>
      <li>Gather your documents (pay stubs, W-2s, bank statements)</li>
      <li>Let me know which option looks best and we'll move forward</li>
    </ol>
  </div>
  <p>I'm committed to making this process as smooth as possible for you. Don't hesitate to reach out with any questions.</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="{{bookingUrl}}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Schedule a Follow-Up Call</a>
  </p>
  <p>Tim Haskins | NMLS #1116876 | Premier Mortgage Resources<br/>📞 {{agentPhone}}</p>
</div>`,
    variables: ["firstName", "bookingUrl", "agentPhone"],
    isSystem: true,
  },
  // ── 15. Referral Request (SMS) ────────────────────────────────────────────
  {
    name: "Referral Request — SMS",
    type: "sms" as const,
    category: "referral",
    content: "Hi {{firstName}}, Tim from Premier Mortgage Resources. I hope your home loan process went smoothly! If you know anyone looking to buy or refinance, I'd love to help them too. Just reply with their name and number and I'll take great care of them. Thanks! Reply STOP to opt out.",
    variables: ["firstName"],
    isSystem: true,
  },
  // ── 16. Referral Request (Email) ─────────────────────────────────────────
  {
    name: "Referral Request — Email",
    type: "email" as const,
    category: "referral",
    subject: "{{firstName}}, know anyone who could use a great mortgage rate?",
    content: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#1a56db;">Hi {{firstName}},</h2>
  <p>I hope your home loan experience with Premier Mortgage Resources exceeded your expectations!</p>
  <p>I'm reaching out because the best compliment you can give me is a referral. If you know anyone who is:</p>
  <ul>
    <li>Looking to buy a home</li>
    <li>Interested in refinancing their current mortgage</li>
    <li>Curious about their home equity options</li>
  </ul>
  <p>I'd love to help them the same way I helped you. Just forward this email or share my contact info:</p>
  <div style="background:#f0f4ff;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
    <p style="margin:0;font-weight:bold;">Tim Haskins | NMLS #1116876</p>
    <p style="margin:8px 0 0;">Premier Mortgage Resources</p>
    <p style="margin:8px 0 0;">📞 {{agentPhone}}</p>
    <p style="margin:8px 0 0;"><a href="{{bookingUrl}}">Book a Free Consultation</a></p>
  </div>
  <p>Thank you for your trust — it means the world to me!</p>
  <p>Tim Haskins | NMLS #1116876</p>
</div>`,
    variables: ["firstName", "bookingUrl", "agentPhone"],
    isSystem: true,
  },
];

// ─── Router ──────────────────────────────────────────────────────────────────

export const seedTemplatesRouter = router({
  /**
   * Seed all default templates (admin only, idempotent)
   */
  seedDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let created = 0;
      let updated = 0;

      for (const tpl of DEFAULT_TEMPLATES) {
        // Check if template with same name already exists
        const existing = await db
          .select({ id: campaignTemplates.id })
          .from(campaignTemplates)
          .where(
            and(
              eq(campaignTemplates.name, tpl.name),
              eq(campaignTemplates.isSystem, true)
            )
          )
          .limit(1);

        if (existing[0]) {
          // Update existing
          await db
            .update(campaignTemplates)
            .set({
              type: tpl.type,
              category: tpl.category,
              subject: tpl.subject ?? null,
              content: tpl.content,
              variables: JSON.stringify(tpl.variables),
            })
            .where(eq(campaignTemplates.id, existing[0].id));
          updated++;
        } else {
          // Insert new
          await db.insert(campaignTemplates).values({
            agencyId: null,
            name: tpl.name,
            type: tpl.type,
            category: tpl.category,
            subject: tpl.subject ?? null,
            content: tpl.content,
            variables: JSON.stringify(tpl.variables),
            isSystem: true,
            createdBy: ctx.user.id,
          });
          created++;
        }
      }

      return {
        success: true,
        created,
        updated,
        total: DEFAULT_TEMPLATES.length,
        message: `Seeded ${created} new templates, updated ${updated} existing templates.`,
      };
    }),

  /**
   * Get template count by category (for dashboard display)
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const allTemplates = await db
        .select({
          type: campaignTemplates.type,
          category: campaignTemplates.category,
          isSystem: campaignTemplates.isSystem,
        })
        .from(campaignTemplates);

      const stats = {
        total: allTemplates.length,
        sms: allTemplates.filter(t => t.type === "sms").length,
        email: allTemplates.filter(t => t.type === "email").length,
        system: allTemplates.filter(t => t.isSystem).length,
        custom: allTemplates.filter(t => !t.isSystem).length,
        categories: {} as Record<string, number>,
      };

      for (const t of allTemplates) {
        const cat = t.category || "uncategorized";
        stats.categories[cat] = (stats.categories[cat] || 0) + 1;
      }

      return stats;
    }),
});
