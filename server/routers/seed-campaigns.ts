/**
 * Seed Campaigns Router
 * Seeds pre-built DSCR, Fix & Flip, and Old Leads re-engagement sequences
 * for Optimal Lending Solutions (Kyle).
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { campaignSequences, campaignSequenceSteps } from "../../drizzle/schema-campaigns";
import { agencies } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// ─── Campaign Copy (from Playbook) ────────────────────────────────────────────

const CAMPAIGNS = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DSCR NEW LEAD — 10-step sequence over 21 days
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "DSCR New Lead Follow-Up",
    description: "Automated 21-day follow-up for DSCR rental property leads. Stops when appointment is booked.",
    leadType: "dscr",
    triggerEvent: "lead_created",
    stopOnAppointment: true,
    stopOnReply: true,
    steps: [
      {
        stepOrder: 1,
        channel: "sms",
        delayHours: 0,
        subject: null,
        body: `Hi {{firstName}}! This is Kyle from Optimal Lending Solutions. I saw you're interested in a DSCR loan for your rental property — I'd love to help you get funded fast, no tax returns needed. Can we hop on a quick 10-min call today? 📞 Reply YES and I'll call you right now!`,
      },
      {
        stepOrder: 2,
        channel: "email",
        delayHours: 1,
        subject: "Your DSCR Loan — Let's Get You Funded (No Tax Returns Required)",
        body: `Hi {{firstName}},

I'm Kyle at Optimal Lending Solutions, and I specialize in DSCR loans for real estate investors just like you.

Here's the short version of what makes DSCR loans different:

✅ You qualify based on the property's rental income — NOT your personal income
✅ No tax returns, no W-2, no employment verification
✅ Close in your LLC
✅ Loan amounts from $100K to $5M+
✅ Competitive rates — often better than conventional investment loans

Whether you're buying your first rental or scaling a portfolio, I can help you get funded fast.

👉 Book your free 15-minute strategy call here: {{bookingUrl}}

Or just reply to this email and I'll reach out personally.

Talk soon,
Kyle
Optimal Lending Solutions
info@optimallendingsolutions.com`,
      },
      {
        stepOrder: 3,
        channel: "sms",
        delayHours: 24,
        subject: null,
        body: `Hey {{firstName}}, Kyle here again from Optimal Lending. Just wanted to make sure you got my message yesterday. DSCR loans are perfect for investors who want to qualify without showing income. Want me to run the numbers on your deal? Takes 5 minutes. Reply YES 👍`,
      },
      {
        stepOrder: 4,
        channel: "email",
        delayHours: 48,
        subject: "Quick Question About Your Rental Property, {{firstName}}",
        body: `Hi {{firstName}},

Quick question — what's the monthly rent (or projected rent) on the property you're looking to finance?

That's literally all I need to tell you if you qualify for a DSCR loan and what rate you'd get.

Here's how it works:
• If rent ÷ monthly payment = 1.0 or higher → you qualify ✅
• Most of my clients qualify on their first try

I've helped investors close DSCR loans in as little as 3 weeks. No tax returns. No drama.

Just reply with the rent amount and I'll get back to you within the hour.

Kyle
Optimal Lending Solutions`,
      },
      {
        stepOrder: 5,
        channel: "sms",
        delayHours: 72,
        subject: null,
        body: `{{firstName}} — I don't want you to miss out on today's rates. DSCR loans are moving fast and I have a few spots open this week for strategy calls. Takes 10 minutes and I'll tell you exactly what you qualify for. Book here: {{bookingUrl}}`,
      },
      {
        stepOrder: 6,
        channel: "email",
        delayHours: 120,
        subject: "Real Investor Story: How Marcus Closed 3 DSCR Loans Without a Single Tax Return",
        body: `Hi {{firstName}},

I want to share a quick story about one of my clients.

Marcus is a self-employed investor in Texas. He had 4 rental properties but his accountant had written off so much income that he couldn't qualify for a conventional loan. Banks kept turning him down.

Then he found me.

Within 3 weeks, Marcus closed his first DSCR loan. The property rented for $2,400/month. His payment was $1,800/month. DSCR = 1.33. Done.

He's now done 3 more deals with me. All DSCR. All closed without a single tax return.

{{firstName}}, if you're sitting on a deal right now, don't let your tax returns hold you back.

👉 Let's talk: {{bookingUrl}}

Kyle
Optimal Lending Solutions`,
      },
      {
        stepOrder: 7,
        channel: "sms",
        delayHours: 168,
        subject: null,
        body: `Hey {{firstName}}, it's Kyle. I know life gets busy. Just a friendly reminder that I'm here when you're ready to move on your rental property deal. No pressure — just want to make sure you have the right lender in your corner. Reply anytime 🙌`,
      },
      {
        stepOrder: 8,
        channel: "email",
        delayHours: 240,
        subject: "{{firstName}}, Are You Still Looking at Investment Properties?",
        body: `Hi {{firstName}},

I've reached out a few times and I want to make sure I'm not bothering you.

If you're still actively looking at investment properties and need DSCR financing, I'd love to help.

If the timing isn't right, no worries at all — just reply "NOT NOW" and I'll check back in 30 days.

But if you ARE ready to move forward, here's what I need from you to get started:

1. Property address (or general area)
2. Expected monthly rent
3. Purchase price or estimated value

That's it. I'll have a pre-approval ready within 24 hours.

Reply to this email or book a call: {{bookingUrl}}

Kyle`,
      },
      {
        stepOrder: 9,
        channel: "sms",
        delayHours: 336,
        subject: null,
        body: `{{firstName}} — last check-in from Kyle at Optimal Lending. Rates are still competitive and I have DSCR programs with as little as 20% down. If you have a deal in the pipeline, let's talk before rates move. {{bookingUrl}}`,
      },
      {
        stepOrder: 10,
        channel: "email",
        delayHours: 504,
        subject: "Closing the Loop, {{firstName}}",
        body: `Hi {{firstName}},

This will be my last follow-up for now.

I've genuinely enjoyed reaching out, and I hope the information I've shared about DSCR loans has been helpful — even if the timing hasn't been right.

When you're ready to move on an investment property — whether it's in 30 days or 6 months — I'd love to be your lender.

Here's what I promise:
✓ No tax returns required
✓ Close in your LLC
✓ Fast closings (3–4 weeks typical)
✓ Honest communication — I'll tell you exactly what you qualify for

Bookmark my booking link for when you're ready: {{bookingUrl}}

Wishing you success with your portfolio,
Kyle
Optimal Lending Solutions
info@optimallendingsolutions.com`,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. FIX & FLIP NEW LEAD — 8-step sequence over 14 days
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Fix & Flip New Lead Follow-Up",
    description: "Fast 14-day follow-up for Fix & Flip leads. Urgency-focused — flippers move fast.",
    leadType: "fix_flip",
    triggerEvent: "lead_created",
    stopOnAppointment: true,
    stopOnReply: true,
    steps: [
      {
        stepOrder: 1,
        channel: "sms",
        delayHours: 0,
        subject: null,
        body: `Hi {{firstName}}! Kyle here from Optimal Lending Solutions. I saw you're interested in a Fix & Flip loan. I can close in as little as 7 days — faster than most cash buyers. Want to talk today? Reply YES and I'll call you right now 🔨`,
      },
      {
        stepOrder: 2,
        channel: "email",
        delayHours: 1,
        subject: "Your Fix & Flip Loan — Close in 7 Days, No Income Verification",
        body: `Hi {{firstName}},

I'm Kyle at Optimal Lending Solutions, and I fund Fix & Flip deals fast.

Here's what my Fix & Flip program looks like:

🏗️ Up to 90% of purchase price + 100% of rehab costs
📅 Close in as little as 7–14 business days
💰 Interest-only payments during renovation
🏢 Must close in an LLC (I can refer you to an attorney if needed)
📋 No income verification — we qualify on the deal, not you

Whether you're a first-time flipper or a seasoned pro, I can help you move fast and beat the competition.

👉 Book your free deal review: {{bookingUrl}}

Or just reply with your deal details and I'll run the numbers for you.

Kyle
Optimal Lending Solutions`,
      },
      {
        stepOrder: 3,
        channel: "sms",
        delayHours: 24,
        subject: null,
        body: `{{firstName}}, Kyle here. In the Fix & Flip world, speed is everything. I've helped investors close before competing cash offers because I move FAST. Do you have a deal under contract or in the pipeline? Let's talk: {{bookingUrl}}`,
      },
      {
        stepOrder: 4,
        channel: "email",
        delayHours: 48,
        subject: "The Fix & Flip Formula: How to Calculate Your Max Offer",
        body: `Hi {{firstName}},

Before you make an offer on your next flip, here's the formula I use with all my clients:

THE 70% RULE:
Max Offer = (ARV × 70%) − Rehab Costs

Example:
• ARV (After Repair Value): $350,000
• Rehab Costs: $50,000
• Max Offer: ($350,000 × 70%) − $50,000 = $195,000

If you can get the property at or below $195,000, it's likely a good deal.

Once you have a deal, here's what I need to get you funded:
1. Property address
2. Purchase price
3. Estimated ARV
4. Estimated rehab budget

I can have a pre-approval letter ready within 24 hours.

Ready to run your deal? {{bookingUrl}}

Kyle`,
      },
      {
        stepOrder: 5,
        channel: "sms",
        delayHours: 72,
        subject: null,
        body: `Hey {{firstName}} — quick question. Do you have an LLC set up? All my Fix & Flip loans close in an entity. If you don't have one yet, I can refer you to an attorney who can set it up in 48 hours. Just reply and I'll connect you.`,
      },
      {
        stepOrder: 6,
        channel: "email",
        delayHours: 120,
        subject: "Case Study: Jennifer Made $42K on Her First Flip (Funded in 10 Days)",
        body: `Hi {{firstName}},

I want to share a quick win from one of my clients.

Jennifer was a first-time flipper in Florida. She found a property at $180K with an ARV of $290K and $40K in rehab. She needed to move fast — there were 3 other offers.

I funded her in 10 days.

She renovated in 6 weeks, sold for $285K, and walked away with $42K profit after all costs.

Here's what made it work:
✓ Fast approval — I said yes within 24 hours
✓ 85% LTC — she only needed $27K out of pocket
✓ Interest-only payments — kept her cash flow tight during renovation
✓ No income verification — I qualified her on the deal

{{firstName}}, if you have a deal or are actively looking, let's talk before someone else grabs it.

👉 {{bookingUrl}}

Kyle`,
      },
      {
        stepOrder: 7,
        channel: "sms",
        delayHours: 168,
        subject: null,
        body: `{{firstName}}, I know the market moves fast. If you've found a deal or are close to one, I want to be your lender. I close faster than anyone and I don't require income docs. Let's connect: {{bookingUrl}}`,
      },
      {
        stepOrder: 8,
        channel: "email",
        delayHours: 336,
        subject: "Still Looking for Fix & Flip Financing, {{firstName}}?",
        body: `Hi {{firstName}},

I've reached out a few times and I don't want to be a pest.

If you're actively flipping or planning to, I'd love to be your go-to lender. If the timing isn't right, just reply "PAUSE" and I'll check back in 60 days.

But if you have a deal — even if it's early stage — let's talk. I can give you a same-day pre-approval so you can make offers with confidence.

Book a quick call: {{bookingUrl}}

Or just reply with your deal details.

Kyle
Optimal Lending Solutions
info@optimallendingsolutions.com`,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. OLD LEADS RE-ENGAGEMENT — 6-step sequence over 30 days
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Old Leads Re-Engagement",
    description: "30-day re-engagement campaign for cold/old leads who never booked. Soft touch, value-first.",
    leadType: "old_lead",
    triggerEvent: "manual",
    stopOnAppointment: true,
    stopOnReply: true,
    steps: [
      {
        stepOrder: 1,
        channel: "email",
        delayHours: 0,
        subject: "Hey {{firstName}} — Are You Still Thinking About Investment Properties?",
        body: `Hi {{firstName}},

It's Kyle from Optimal Lending Solutions. We connected a while back about investment property financing, and I wanted to check in.

A lot has changed in the lending world recently, and I wanted to make sure you have the most up-to-date information.

Here's what's new:
📊 DSCR rates have improved — qualifying is easier than ever
🔨 Fix & Flip programs now fund up to 90% LTC
🏢 New LLC-friendly programs with faster closings
💡 No income verification — we qualify on the property, not you

If you're still thinking about investing — or if you have a deal in the pipeline — I'd love to reconnect.

👉 Book a free 15-minute call: {{bookingUrl}}

No pressure. Just want to make sure you have the right lender when you're ready.

Kyle
Optimal Lending Solutions`,
      },
      {
        stepOrder: 2,
        channel: "sms",
        delayHours: 48,
        subject: null,
        body: `Hey {{firstName}}, it's Kyle from Optimal Lending. We talked a while back about investment property financing. Rates have gotten better and I have some new programs I think you'd love. Want to reconnect? {{bookingUrl}}`,
      },
      {
        stepOrder: 3,
        channel: "email",
        delayHours: 168,
        subject: "Free Resource: The Investor's Guide to DSCR & Fix-and-Flip Loans",
        body: `Hi {{firstName}},

I put together a free guide that breaks down everything you need to know about DSCR and Fix & Flip loans — including how to qualify, what rates look like, and how to structure your deals.

Here's what's inside:
📖 How DSCR is calculated (and how to know if your deal qualifies)
🏗️ The Fix & Flip formula for calculating your max offer
❓ Answers to the most common investor questions
✅ Exactly what you need to get started

👉 Download it free here: {{bookingUrl}}

(You can also book a call on that page if you want to talk through your specific situation.)

Kyle`,
      },
      {
        stepOrder: 4,
        channel: "sms",
        delayHours: 336,
        subject: null,
        body: `{{firstName}} — Kyle here. Just checking in one more time. If you have a deal or are actively looking, I'd love to help. I close DSCR loans in 3 weeks and Fix & Flip in 7-14 days. No tax returns. No W-2. Just the deal. Ready when you are: {{bookingUrl}}`,
      },
      {
        stepOrder: 5,
        channel: "email",
        delayHours: 504,
        subject: "{{firstName}}, What Would It Take to Move Forward?",
        body: `Hi {{firstName}},

I'll be direct — I've followed up a few times and I don't want to keep bothering you if the timing isn't right.

So let me ask: what would it take for you to move forward on an investment property?

Is it:
❓ You're waiting for the right deal to come along?
❓ You're not sure if you'd qualify?
❓ You need more time to save for a down payment?
❓ Something else?

Just reply and let me know. I'm not here to pressure you — I genuinely want to help when the time is right.

Kyle
Optimal Lending Solutions`,
      },
      {
        stepOrder: 6,
        channel: "email",
        delayHours: 720,
        subject: "Staying in Touch, {{firstName}}",
        body: `Hi {{firstName}},

This is my last scheduled follow-up for now.

I've enjoyed reaching out, and I hope the information I've shared has been useful — even if the timing hasn't been right.

When you're ready to move on an investment property, I'd love to be your lender. Here's what I can promise:

✓ DSCR loans — qualify on rental income, not your W-2
✓ Fix & Flip loans — close in 7–14 days
✓ No tax returns required
✓ Competitive rates and honest advice

Keep my booking link handy for when you're ready: {{bookingUrl}}

Wishing you success,
Kyle
Optimal Lending Solutions
info@optimallendingsolutions.com`,
      },
    ],
  },
];

// ─── Router ───────────────────────────────────────────────────────────────────

export const seedCampaignsRouter = router({
   seedPrebuiltCampaigns: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Resolve agencyId for the seeding admin
      const [ownedAgency] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.ownerId, ctx.user.id)).limit(1);
      const agencyId = ownedAgency?.id ?? (await db.select({ id: agencies.id }).from(agencies).limit(1).then(r => r[0]?.id));
      if (!agencyId) throw new TRPCError({ code: "NOT_FOUND", message: "No agency found" });

      const results: string[] = [];
      for (const campaign of CAMPAIGNS) {
        // Check if already exists
        const [existing] = await db
          .select({ id: campaignSequences.id })
          .from(campaignSequences)
          .where(eq(campaignSequences.name, campaign.name))
          .limit(1);

        if (existing) {
          results.push(`SKIPPED (already exists): ${campaign.name}`);
          continue;
        }

        // Insert sequence
        const [inserted] = await db.insert(campaignSequences).values({
          name: campaign.name,
          description: campaign.description,
          leadType: campaign.leadType,
          triggerEvent: campaign.triggerEvent,
          stopOnAppointment: campaign.stopOnAppointment,
          stopOnReply: campaign.stopOnReply,
          agencyId,
          clientId: null,
          isActive: true,
          createdBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const sequenceId = (inserted as any).insertId;

        // Insert steps
        for (const step of campaign.steps) {
          await db.insert(campaignSequenceSteps).values({
            sequenceId,
            stepOrder: step.stepOrder,
            channel: step.channel as "email" | "sms",
            delayHours: step.delayHours,
            subject: step.subject,
            body: step.body,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        results.push(`CREATED: ${campaign.name} (${campaign.steps.length} steps)`);
      }

      return { success: true, results };
    }),

  getSeededCampaigns: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    return db
      .select({
        id: campaignSequences.id,
        name: campaignSequences.name,
        leadType: campaignSequences.leadType,
        isActive: campaignSequences.isActive,
      })
      .from(campaignSequences)
      .where(eq(campaignSequences.isActive, true));
  }),

  /** Return the static campaign definitions for display in the UI (no DB needed) */
  listPrebuiltTemplates: protectedProcedure.query(() => {
    return CAMPAIGNS.map((c, index) => ({
      index,
      name: c.name,
      description: c.description,
      leadType: c.leadType as string,
      triggerEvent: c.triggerEvent,
      stopOnAppointment: c.stopOnAppointment,
      stopOnReply: c.stopOnReply,
      stepCount: c.steps.length,
      steps: c.steps.map(s => ({
        stepOrder: s.stepOrder,
        channel: s.channel,
        delayHours: s.delayHours,
        subject: s.subject ?? null,
        preview: s.body.slice(0, 140) + (s.body.length > 140 ? "..." : ""),
      })),
    }));
  }),

  /** Install a single pre-built campaign for a specific client */
  installForClient: protectedProcedure
    .input(z.object({
      campaignIndex: z.number().min(0).max(2), // 0=DSCR, 1=Fix&Flip, 2=Old Leads
      clientId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Resolve agencyId
      const [ownedAgency] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.ownerId, ctx.user.id)).limit(1);
      const agencyId = ownedAgency?.id ?? (await db.select({ id: agencies.id }).from(agencies).limit(1).then(r => r[0]?.id));
      if (!agencyId) throw new TRPCError({ code: "NOT_FOUND", message: "No agency found" });

      const campaign = CAMPAIGNS[input.campaignIndex];
      if (!campaign) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid campaign index" });

      // Check if already installed
      const whereClause = input.clientId != null
        ? and(eq(campaignSequences.name, campaign.name), eq(campaignSequences.clientId, input.clientId))
        : eq(campaignSequences.name, campaign.name);
      const [existing] = await db.select({ id: campaignSequences.id }).from(campaignSequences).where(whereClause).limit(1);
      if (existing) {
        return { success: true, alreadyExists: true, sequenceId: existing.id, message: `"${campaign.name}" is already installed.` };
      }

      // Insert sequence
      const [inserted] = await db.insert(campaignSequences).values({
        name: campaign.name,
        description: campaign.description,
        leadType: campaign.leadType,
        triggerEvent: campaign.triggerEvent,
        stopOnAppointment: campaign.stopOnAppointment,
        stopOnReply: campaign.stopOnReply,
        agencyId,
        clientId: input.clientId != null ? input.clientId : null,
        isActive: true,
        createdBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const sequenceId = (inserted as any).insertId;

      // Insert steps
      for (const step of campaign.steps) {
        await db.insert(campaignSequenceSteps).values({
          sequenceId,
          stepOrder: step.stepOrder,
          channel: step.channel as "email" | "sms",
          delayHours: step.delayHours,
          subject: step.subject,
          body: step.body,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return {
        success: true,
        alreadyExists: false,
        sequenceId,
        message: `"${campaign.name}" installed successfully with ${campaign.steps.length} steps.`,
      };
    }),
});
