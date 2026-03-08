import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { onboardingProgress, users, clients, leads, appointments } from "../../drizzle/schema";
import { eq, count } from "drizzle-orm";

// ─── Launchpad Step Definitions ──────────────────────────────────────────────
// These are the canonical onboarding steps every sub-account must complete.
// stepKey is the unique identifier stored in the DB.

export const LAUNCHPAD_STEPS = [
  // ── Phase 1: Account Setup ──────────────────────────────────────────────
  {
    phase: "Account Setup",
    phaseIcon: "🚀",
    steps: [
      {
        key: "account_created",
        title: "Account Created",
        description: "Your account has been set up and you're logged in.",
        detail: "You're in! Your CRM account is ready to go.",
        autoDetect: true, // always true — if they're here, account exists
        ctaLabel: null,
        ctaPath: null,
        order: 1,
      },
      {
        key: "profile_complete",
        title: "Complete Your Profile",
        description: "Add your name, phone number, and company details.",
        detail: "This helps us personalize your CRM and makes sure leads see the right contact info.",
        autoDetect: true, // auto-detect: user has phone set
        ctaLabel: "Update Profile",
        ctaPath: "/account",
        order: 2,
      },
      {
        key: "booking_page_setup",
        title: "Set Up Your Booking Page",
        description: "Create your personal appointment booking link to share with leads.",
        detail: "This is the link you'll share on social media and in emails so leads can book directly with you.",
        autoDetect: false,
        ctaLabel: "Set Up Booking Page",
        ctaPath: "/account",
        order: 3,
      },
    ],
  },
  // ── Phase 2: Connect Your Tools ─────────────────────────────────────────
  {
    phase: "Connect Your Tools",
    phaseIcon: "🔗",
    steps: [
      {
        key: "facebook_connected",
        title: "Connect Facebook Ads",
        description: "Link your Facebook account so leads from your ads flow directly into the CRM.",
        detail: "Once connected, every lead from your Facebook ads will automatically appear in your pipeline and get an instant follow-up call.",
        autoDetect: false,
        ctaLabel: "Connect Facebook",
        ctaPath: "/account",
        order: 4,
      },
      {
        key: "calendar_connected",
        title: "Connect Your Calendar",
        description: "Sync Google Calendar so appointments show up automatically.",
        detail: "When a lead books an appointment, it will appear on your calendar instantly — no manual entry needed.",
        autoDetect: false,
        ctaLabel: "Connect Calendar",
        ctaPath: "/account",
        order: 5,
      },
      {
        key: "notifications_enabled",
        title: "Enable Push Notifications",
        description: "Get instant alerts on your phone when a new lead comes in.",
        detail: "Never miss a hot lead. Enable notifications and you'll get a ping the second someone fills out your form.",
        autoDetect: false,
        ctaLabel: "Enable Notifications",
        ctaPath: "/notifications",
        order: 6,
      },
      {
        key: "seo_content_setup",
        title: "Review Your AI Content Plan",
        description: "Your AI SEO content strategy is ready — review and approve your first content pieces.",
        detail: "Our AI automatically creates SEO-optimized blog posts, social content, and video scripts for your brand. Review and approve them in the Content Approvals section to start publishing.",
        autoDetect: false,
        ctaLabel: "Review Content",
        ctaPath: "/content-approvals",
        order: 7,
      },
    ],
  },
  // ── Phase 3: Launch Your Campaign ───────────────────────────────────────
  {
    phase: "Launch Your Campaign",
    phaseIcon: "📣",
    steps: [
      {
        key: "first_lead_received",
        title: "Receive Your First Lead",
        description: "Your first lead has entered the CRM — the system is working!",
        detail: "Once your Facebook ad or booking link is live, leads will start flowing in automatically.",
        autoDetect: true, // auto-detect: check if client has any leads
        ctaLabel: "View Pipeline",
        ctaPath: "/leads",
        order: 8,
      },
      {
        key: "first_appointment_booked",
        title: "Book Your First Appointment",
        description: "A lead has booked a consultation — your funnel is converting!",
        detail: "This means your system is working end-to-end. Leads are coming in and booking time with you.",
        autoDetect: true, // auto-detect: check if client has any appointments
        ctaLabel: "View Calendar",
        ctaPath: "/appointments",
        order: 9,
      },
      {
        key: "ai_script_reviewed",
        title: "Review Your AI Call Script",
        description: "Review and approve the AI voice script that calls your leads.",
        detail: "Your AI assistant will call every new lead within minutes. Make sure the script sounds like you and answers common questions.",
        autoDetect: false,
        ctaLabel: "Review Script",
        ctaPath: "/ai-scripts",
        order: 10,
      },
    ],
  },
  // ── Phase 4: Go Live ─────────────────────────────────────────────────────
  {
    phase: "Go Live",
    phaseIcon: "🎯",
    steps: [
      {
        key: "strategy_call_completed",
        title: "Complete Your Strategy Call",
        description: "Join a 1-on-1 onboarding call with our team to review your setup.",
        detail: "We'll walk through your entire funnel, make sure everything is connected, and answer any questions before you go live.",
        autoDetect: false,
        ctaLabel: "Book Strategy Call",
        ctaPath: "/appointments",
        order: 11,
      },
      {
        key: "first_campaign_launched",
        title: "Launch Your First Campaign",
        description: "Your first ad campaign or email campaign is live and generating leads.",
        detail: "This is the moment everything comes together. Your AI is calling leads, booking appointments, and you're growing.",
        autoDetect: false,
        ctaLabel: "Create Campaign",
        ctaPath: "/campaigns",
        order: 12,
      },
      {
        key: "system_fully_live",
        title: "System Fully Live 🎉",
        description: "Congratulations! Your AI-powered lead system is fully operational.",
        detail: "You've completed setup. Your AI is now working 24/7 to call leads, book appointments, and grow your business while you sleep.",
        autoDetect: false,
        ctaLabel: null,
        ctaPath: null,
        order: 13,
      },
    ],
  },
];

// Flatten all steps for easy lookup
export const ALL_STEPS = LAUNCHPAD_STEPS.flatMap(p => p.steps);

// ─── Router ──────────────────────────────────────────────────────────────────

export const launchpadRouter = router({
  // Get launchpad progress for the current user (or a specific user if admin)
  getProgress: protectedProcedure
    .input(z.object({ targetUserId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "super_admin" || ctx.user.role === "admin";
      const userId = (isAdmin && input?.targetUserId) ? input.targetUserId : ctx.user.id;

      const db = (await getDb())!;
      // Get manually marked steps from DB
      const dbProgress = await db
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.userId, userId));

      const completedKeys = new Set(
        dbProgress
          .filter(p => p.completedAt !== null)
          .map(p => p.stepKey)
      );

      // Auto-detect steps based on real data
      // 1. account_created — always true
      completedKeys.add("account_created");

      // 2. profile_complete — user has phone set
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1) as any[];
      if (targetUser[0]?.phone) {
        completedKeys.add("profile_complete");
      }

      // 3. first_lead_received — check if client has any leads
      const clientRecord = await db.select().from(clients).where(eq(clients.userId, userId)).limit(1) as any[];
      if (clientRecord[0]) {
        const leadCountResult = await db
          .select({ count: count() })
          .from(leads)
          .where(eq(leads.clientId, clientRecord[0].id));
        if ((leadCountResult[0]?.count ?? 0) > 0) {
          completedKeys.add("first_lead_received");
        }

        // 4. first_appointment_booked — check if client has any appointments
        // appointments table uses agencyId (not clientId) for scoping
        const apptCountResult = clientRecord[0].agencyId
          ? await db
              .select({ count: count() })
              .from(appointments)
              .where(eq(appointments.agencyId, clientRecord[0].agencyId))
          : [{ count: 0 }];
        if ((apptCountResult[0]?.count ?? 0) > 0) {
          completedKeys.add("first_appointment_booked");
        }
      }

      // Build response with all steps and their completion status
      const stepsWithStatus = LAUNCHPAD_STEPS.map(phase => ({
        phase: phase.phase,
        phaseIcon: phase.phaseIcon,
        steps: phase.steps.map(step => {
          const dbEntry = dbProgress.find(p => p.stepKey === step.key);
          return {
            ...step,
            completed: completedKeys.has(step.key),
            completedAt: dbEntry?.completedAt ?? null,
            completedBy: dbEntry?.completedBy ?? null,
            notes: dbEntry?.notes ?? null,
          };
        }),
      }));

      const totalSteps = ALL_STEPS.length;
      const completedCount = ALL_STEPS.filter(s => completedKeys.has(s.key)).length;
      const progressPercent = Math.round((completedCount / totalSteps) * 100);

      // Find next incomplete step
      const nextStep = ALL_STEPS.find(s => !completedKeys.has(s.key)) ?? null;

      return {
        userId,
        phases: stepsWithStatus,
        totalSteps,
        completedCount,
        progressPercent,
        nextStep,
        isComplete: completedCount === totalSteps,
      };
    }),

  // Mark a step as complete (admin can do this for any user, clients only for themselves)
  markStepComplete: protectedProcedure
    .input(z.object({
      stepKey: z.string(),
      targetUserId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "super_admin" || ctx.user.role === "admin";
      const userId = (isAdmin && input.targetUserId) ? input.targetUserId : ctx.user.id;

      // Validate step key
      const validStep = ALL_STEPS.find(s => s.key === input.stepKey);
      if (!validStep) throw new Error("Invalid step key");

      const db = (await getDb())!;
      // Upsert the progress record
      await db
        .insert(onboardingProgress)
        .values({
          userId,
          stepKey: input.stepKey,
          completedAt: new Date(),
          completedBy: isAdmin ? ctx.user.id : null,
          notes: input.notes ?? null,
        })
        .onDuplicateKeyUpdate({
          set: {
            completedAt: new Date(),
            completedBy: isAdmin ? ctx.user.id : null,
            notes: input.notes ?? null,
          },
        });

      return { success: true };
    }),

  // Unmark a step (admin only — for corrections)
  unmarkStep: protectedProcedure
    .input(z.object({
      stepKey: z.string(),
      targetUserId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const isAdmin = ctx.user.role === "super_admin" || ctx.user.role === "admin";
      if (!isAdmin) throw new Error("Admin access required");

      const userId = input.targetUserId ?? ctx.user.id;

      const db = (await getDb())!;
      await db
        .insert(onboardingProgress)
        .values({
          userId,
          stepKey: input.stepKey,
          completedAt: null,
          completedBy: ctx.user.id,
        })
        .onDuplicateKeyUpdate({
          set: {
            completedAt: null,
            completedBy: ctx.user.id,
          },
        });

      return { success: true };
    }),

  // Get all clients' launchpad progress (super_admin overview)
  getAllClientsProgress: protectedProcedure
    .query(async ({ ctx }) => {
      const isAdmin = ctx.user.role === "super_admin" || ctx.user.role === "admin";
      if (!isAdmin) throw new Error("Admin access required");

      const db = (await getDb())!;
      const allClients = await db
        .select({
          userId: clients.userId,
          clientName: clients.name,
          clientEmail: clients.email,
        })
        .from(clients)
        .where(eq(clients.userId, clients.userId)); // get all clients with user accounts

      return allClients;
    }),
});
