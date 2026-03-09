import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { clients, contentApprovals, onboardingProgress, users } from "../../drizzle/schema";
import { seoClients } from "../../drizzle/seo-schema";
import { eq, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ─── Input schemas ────────────────────────────────────────────────────────────
const step1Schema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.string().min(1, "Business type is required"),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal("")),
  businessWebsite: z.string().optional(),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

const step2Schema = z.object({
  primaryServices: z.string().min(1, "Please describe your services"),
  uniqueSellingProp: z.string().optional(),
  serviceAreas: z.string().optional(),
  targetAudience: z.string().optional(),
  brandVoice: z.string().optional(),
});

const step3Schema = z.object({
  socialFacebook: z.string().optional(),
  socialInstagram: z.string().optional(),
  socialLinkedin: z.string().optional(),
  facebookAdAccountId: z.string().optional(),
  facebookPageId: z.string().optional(),
  websiteUrl: z.string().optional(),
  websitePlatform: z.string().optional(),
});

const step4Schema = z.object({
  preferredPublishDays: z.string().optional(), // JSON array: ["Monday","Wednesday","Friday"]
  preferredPublishTime: z.string().optional(), // e.g. "9:00 AM"
  reportingKpis: z.string().optional(),
  companyColors: z.string().optional(), // JSON: {"primary":"#hex","secondary":"#hex"}
});

// ─── Helper: get or create seo_client for a client ───────────────────────────
async function getOrCreateSeoClient(clientId: number, agencyId: number, db: any) {
  const existing = await db
    .select()
    .from(seoClients)
    .where(eq(seoClients.crmClientId, clientId))
    .limit(1);
  if (existing.length > 0) return existing[0];

  // Get client info to pre-fill
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) throw new Error("Client not found");

  const result = await db.insert(seoClients).values({
    agencyId,
    name: client.name,
    email: client.email,
    crmClientId: clientId,
    isActive: true,
    createdBy: 1, // system
  });
  const newId = Number((result as any)[0]?.insertId ?? (result as any).insertId);
  const [created] = await db.select().from(seoClients).where(eq(seoClients.id, newId));
  return created;
}

// ─── Helper: generate content via LLM ────────────────────────────────────────
async function generateOnboardingContent(seoClient: any): Promise<Array<{
  contentType: "social_post" | "email" | "sms" | "ad_copy" | "video_script";
  platform: string;
  title: string;
  content: string;
  reasoning: string;
}>> {
  const businessContext = `
Business: ${seoClient.businessName || seoClient.name}
Industry: ${seoClient.businessType || "mortgage/real estate"}
Services: ${seoClient.primaryServices || "mortgage lending, home loans, refinancing"}
Unique Value: ${seoClient.uniqueSellingProp || "personalized service, fast closings"}
Target Audience: ${seoClient.targetAudience || "homebuyers, homeowners looking to refinance"}
Brand Voice: ${seoClient.brandVoice || "professional, trustworthy, approachable"}
Service Areas: ${seoClient.serviceAreas || "local area"}
Website: ${seoClient.websiteUrl || ""}
`.trim();

  const prompt = `You are an expert SEO content strategist and social media manager for a mortgage and real estate marketing agency.

Generate 12 pieces of SEO-optimized content for this client:
${businessContext}

Create exactly:
- 3 Facebook posts (engaging, educational, with a clear CTA; include 2-3 relevant hashtags)
- 3 Instagram posts (visual-friendly, punchy, 5-7 hashtags including local area tags)
- 2 LinkedIn posts (professional thought leadership; include industry keywords naturally)
- 2 SEO-optimized blog posts (include: H1 title with primary keyword, 150-word opening paragraph, meta description under 160 chars, 3 suggested H2 subheadings)
- 2 website page copy pieces (one homepage hero section with headline + subheadline + CTA, one services page description)

SEO requirements for all content:
- Include primary keywords naturally (e.g. "[city] mortgage broker", "home loans [service area]", "refinance [city]")
- Write for the target audience: ${seoClient.targetAudience || "homebuyers and homeowners"}
- Use the brand voice: ${seoClient.brandVoice || "professional, trustworthy, approachable"}
- Include location-specific terms from their service areas: ${seoClient.serviceAreas || "local area"}
- Every piece should have a clear call-to-action

For each piece, include:
- A compelling title
- The full content (complete, ready to publish)
- A brief reasoning (1-2 sentences) explaining the SEO strategy and why this content will perform well

Return as JSON array with this exact structure:
[
  {
    "platform": "Facebook",
    "contentType": "social_post",
    "title": "...",
    "content": "...",
    "reasoning": "..."
  }
]

Make every piece specific to their business. Never use generic filler content. Reference their actual services, location, and unique value proposition.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert social media content strategist for mortgage and real estate businesses. Always return valid JSON arrays.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "content_batch",
          strict: true,
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    platform: { type: "string" },
                    contentType: {
                      type: "string",
                      enum: ["social_post", "email", "sms", "ad_copy", "video_script"],
                    },
                    title: { type: "string" },
                    content: { type: "string" },
                    reasoning: { type: "string" },
                  },
                  required: ["platform", "contentType", "title", "content", "reasoning"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = response?.choices?.[0]?.message?.content;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.items || [];
  } catch (err) {
    console.error("[ClientOnboarding] LLM content generation failed:", err);
    return [];
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const clientOnboardingRouter = router({
  // Alias used by ClientWebsite page
  getMyOnboarding: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const [client] = await db.select().from(clients).where(eq(clients.userId, ctx.user.id));
    if (!client) return null;
    const seoClientRows = await db.select().from(seoClients).where(eq(seoClients.crmClientId, client.id));
    const seoClient = seoClientRows[0] || null;
    return {
      websiteUrl: seoClient?.websiteUrl || (client as any).websiteUrl || null,
      businessName: seoClient?.businessName || client.name || null,
      businessWebsite: seoClient?.businessWebsite || null,
    };
  }),

  // Get current onboarding status for the logged-in client
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    // Find client record for this user
    const [client] = await db.select().from(clients).where(eq(clients.userId, ctx.user.id));
    if (!client) return { hasClient: false, onboardingComplete: false, currentStep: 1, seoClient: null };

    // Find seo_client record
    const seoClientRows = await db.select().from(seoClients).where(eq(seoClients.crmClientId, client.id));
    const seoClient = seoClientRows[0] || null;

    // Check onboarding progress steps
    const progressRows = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.clientId, client.id));

    const completedSteps = progressRows.filter((r: any) => r.completedAt).map((r: any) => r.stepKey);
    const onboardingComplete = completedSteps.includes("onboarding_form_complete");

    // Determine current step
    let currentStep = 1;
    if (completedSteps.includes("step_1_business_info")) currentStep = 2;
    if (completedSteps.includes("step_2_services_brand")) currentStep = 3;
    if (completedSteps.includes("step_3_social_connections")) currentStep = 4;
    if (onboardingComplete) currentStep = 5;

    return {
      hasClient: true,
      clientId: client.id,
      agencyId: client.agencyId,
      onboardingComplete,
      currentStep,
      seoClient,
      completedSteps,
    };
  }),

  // Save step 1: Business Info
  saveStep1: protectedProcedure
    .input(step1Schema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [client] = await db.select().from(clients).where(eq(clients.userId, ctx.user.id));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client account not found" });

      const seoClient = await getOrCreateSeoClient(client.id, client.agencyId, db);

      await db.update(seoClients).set({
        businessName: input.businessName,
        businessType: input.businessType,
        businessPhone: input.businessPhone,
        businessEmail: input.businessEmail,
        businessWebsite: input.businessWebsite,
        businessAddress: input.businessAddress,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
      }).where(eq(seoClients.id, seoClient.id));

      // Mark step complete
      await markStepComplete(db, client.id, "step_1_business_info");

      return { success: true, seoClientId: seoClient.id };
    }),

  // Save step 2: Services & Brand
  saveStep2: protectedProcedure
    .input(step2Schema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [client] = await db.select().from(clients).where(eq(clients.userId, ctx.user.id));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client account not found" });

      const seoClient = await getOrCreateSeoClient(client.id, client.agencyId, db);

      await db.update(seoClients).set({
        primaryServices: input.primaryServices,
        uniqueSellingProp: input.uniqueSellingProp,
        serviceAreas: input.serviceAreas,
        targetAudience: input.targetAudience,
        brandVoice: input.brandVoice,
      }).where(eq(seoClients.id, seoClient.id));

      await markStepComplete(db, client.id, "step_2_services_brand");
      return { success: true };
    }),

  // Save step 3: Social Connections
  saveStep3: protectedProcedure
    .input(step3Schema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [client] = await db.select().from(clients).where(eq(clients.userId, ctx.user.id));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client account not found" });

      const seoClient = await getOrCreateSeoClient(client.id, client.agencyId, db);

      await db.update(seoClients).set({
        socialFacebook: input.socialFacebook,
        socialInstagram: input.socialInstagram,
        socialLinkedin: input.socialLinkedin,
        facebookAdAccountId: input.facebookAdAccountId,
        facebookPageId: input.facebookPageId,
        websiteUrl: input.websiteUrl,
        websitePlatform: input.websitePlatform,
      }).where(eq(seoClients.id, seoClient.id));

      await markStepComplete(db, client.id, "step_3_social_connections");
      return { success: true };
    }),

  // Save step 4: Publishing Preferences + trigger content generation
  completeOnboarding: protectedProcedure
    .input(step4Schema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [client] = await db.select().from(clients).where(eq(clients.userId, ctx.user.id));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client account not found" });

      const seoClient = await getOrCreateSeoClient(client.id, client.agencyId, db);

      // Save step 4 data
      await db.update(seoClients).set({
        preferredPublishDays: input.preferredPublishDays,
        preferredPublishTime: input.preferredPublishTime,
        reportingKpis: input.reportingKpis,
        companyColors: input.companyColors,
      }).where(eq(seoClients.id, seoClient.id));

      // Mark all steps complete
      await markStepComplete(db, client.id, "step_4_publishing_prefs");
      await markStepComplete(db, client.id, "onboarding_form_complete");
      await markStepComplete(db, client.id, "profile_complete");

      // Fetch the fully updated seo_client for content generation
      const [updatedSeoClient] = await db.select().from(seoClients).where(eq(seoClients.id, seoClient.id));

      // Generate content in the background (don't await — return immediately)
      generateAndQueueContent(db, client, updatedSeoClient, ctx.user.id).catch((err) => {
        console.error("[ClientOnboarding] Background content generation failed:", err);
      });

      return {
        success: true,
        message: "Onboarding complete! Your first content batch is being generated and will appear in Content Approvals within 60 seconds.",
      };
    }),

  // Request a fresh content batch with optional guidance notes
  requestRegenerate: protectedProcedure
    .input(z.object({
      guidanceNotes: z.string().optional(), // e.g. "more formal tone", "focus on refinancing"
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [client] = await db.select().from(clients).where(eq(clients.userId, ctx.user.id));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client account not found" });

      const seoClientRows = await db.select().from(seoClients).where(eq(seoClients.crmClientId, client.id));
      if (!seoClientRows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Please complete Account Setup first" });

      const seoClient = seoClientRows[0];

      // Merge guidance notes into the seoClient context for the LLM
      const enrichedSeoClient = input.guidanceNotes
        ? { ...seoClient, brandVoice: `${seoClient.brandVoice || ""} [Client guidance: ${input.guidanceNotes}]`.trim() }
        : seoClient;

      // Kick off generation in the background
      generateAndQueueContent(db, client, enrichedSeoClient, ctx.user.id).catch((err) => {
        console.error("[ClientOnboarding] Regenerate content generation failed:", err);
      });

      return {
        success: true,
        message: "Your new content batch is being generated. It will appear in Content Approvals within 60 seconds.",
      };
    }),

  // Check content generation status
  getContentCount: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { pending: 0, total: 0 };

    const [client] = await db.select().from(clients).where(eq(clients.userId, ctx.user.id));
    if (!client) return { pending: 0, total: 0 };

    const all = await db
      .select()
      .from(contentApprovals)
      .where(eq(contentApprovals.clientId, client.id));

    const pending = all.filter((c: any) => c.status === "pending").length;
    return { pending, total: all.length };
  }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function markStepComplete(db: any, clientId: number, stepKey: string) {
  const existing = await db
    .select()
    .from(onboardingProgress)
    .where(and(eq(onboardingProgress.clientId, clientId), eq(onboardingProgress.stepKey, stepKey)));

  if (existing.length > 0) {
    await db
      .update(onboardingProgress)
      .set({ completedAt: new Date(), completedBy: clientId })
      .where(and(eq(onboardingProgress.clientId, clientId), eq(onboardingProgress.stepKey, stepKey)));
  } else {
    await db.insert(onboardingProgress).values({
      clientId,
      stepKey,
      completedAt: new Date(),
      completedBy: clientId,
    });
  }
}

async function generateAndQueueContent(db: any, client: any, seoClient: any, userId: number) {
  console.log(`[ClientOnboarding] Starting content generation for client ${client.id} (${client.name})`);

  const contentItems = await generateOnboardingContent(seoClient);

  if (contentItems.length === 0) {
    console.warn("[ClientOnboarding] No content generated — LLM returned empty array");
    return;
  }

  const brandName = seoClient.businessName || client.name;

  for (const item of contentItems) {
    try {
      await db.insert(contentApprovals).values({
        agencyId: client.agencyId,
        clientId: client.id,
        contentType: item.contentType,
        platform: item.platform,
        brand: brandName,
        title: item.title,
        content: item.content,
        reasoning: item.reasoning,
        status: "pending",
        approverName: client.name,
        approverPhone: client.phone || null,
        createdBy: userId,
      });
    } catch (err) {
      console.error("[ClientOnboarding] Failed to insert content approval:", err);
    }
  }

  console.log(`[ClientOnboarding] ✅ Queued ${contentItems.length} content items for client ${client.id}`);
}
