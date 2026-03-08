/**
 * SEO Bridge Router
 * Exposes SEO capabilities in CRM context — lead cards, client profiles,
 * campaigns, conversion funnel, and billing.
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getSeoClientByCrmId, ensureLinkedSeoClient } from "../seo-db";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../seo-db";
export const seoBridgeRouter = router({
  /**
   * 1. Content Generation — generate SEO content for a lead's niche
   */
  generateForLead: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      leadName: z.string(),
      leadSource: z.string().optional(),
      niche: z.string(), // e.g. "first-time homebuyer in Dallas TX"
      contentType: z.enum([
        "blog-post", "how-to", "listicle", "case-study", "guide",
        "newsletter", "email-sequence", "social-post", "landing-page", "video-script"
      ]).default("blog-post"),
      crmClientId: z.number().optional(), // the loan officer / RE agent's CRM client ID
    }))
    .mutation(async ({ ctx, input }) => {
      // Resolve or create an SEO client for the CRM client
      let seoClientId: number | null = null;
      if (input.crmClientId) {
        const linked = await getSeoClientByCrmId(input.crmClientId);
        if (linked) seoClientId = linked.id;
      }

      const { getDb } = await import("../seo-db");
      const { content: contentTable } = await import("../../drizzle/seo-schema");
      const db = (await getDb())!;
      if (!db) throw new Error("SEO database unavailable");

      const systemPrompt = `You are an expert mortgage and real estate SEO content writer. 
Create content that helps loan officers and real estate agents attract leads online.
Write in a helpful, professional tone. Include a clear title on the first line.`;

      const userPrompt = `Write a ${input.contentType.replace(/-/g, " ")} targeting: ${input.niche}.
This content is for a lead named ${input.leadName}${input.leadSource ? ` who came from ${input.leadSource}` : ""}.
Make it highly relevant to their situation and optimized for local SEO.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const generatedContent = typeof response.choices[0]?.message?.content === "string"
        ? response.choices[0].message.content
        : "";
      const lines = generatedContent.split("\n").filter((l: string) => l.trim());
      const title = lines[0]?.replace(/^#+\s*/, "").substring(0, 200) || `Content for ${input.niche}`;
      const wordCount = generatedContent.split(/\s+/).filter(Boolean).length;

      // Save to SEO content table if we have an SEO client
      let contentId: number | null = null;
      if (seoClientId) {
        const [result] = await db.insert(contentTable).values({
          clientId: seoClientId,
          title,
          content: generatedContent,
          contentType: input.contentType,
          status: "draft",
          createdBy: ctx.user.id,
          wordCount,
          aiModel: "default",
          enableWebResearch: false,
          shouldGenerateImage: false,
        });
        contentId = (result as any).insertId;
      }

      return { title, content: generatedContent, contentId, wordCount };
    }),

  /**
   * 2. AI Client Suggestions — suggest SEO content niches for a CRM lead
   */
  suggestNichesForLead: protectedProcedure
    .input(z.object({
      leadFirstName: z.string(),
      leadLastName: z.string(),
      leadSource: z.string().optional(),
      leadCity: z.string().optional(),
      leadState: z.string().optional(),
      loanType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const location = [input.leadCity, input.leadState].filter(Boolean).join(", ");
      const prompt = `A mortgage/real estate lead named ${input.leadFirstName} ${input.leadLastName} came in${input.leadSource ? ` from ${input.leadSource}` : ""}${location ? ` in ${location}` : ""}${input.loanType ? `. They are interested in a ${input.loanType} loan` : ""}.

Suggest 5 highly specific SEO content topics that would:
1. Attract more leads exactly like this person
2. Help the loan officer or real estate agent rank locally
3. Address common questions this type of borrower has

Return JSON array of objects with: { topic: string, contentType: string, rationale: string }`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert mortgage SEO strategist. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "niche_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      topic: { type: "string" },
                      contentType: { type: "string" },
                      rationale: { type: "string" },
                    },
                    required: ["topic", "contentType", "rationale"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["suggestions"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = response.choices[0]?.message?.content;
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        return parsed.suggestions || [];
      } catch {
        return [];
      }
    }),

  /**
   * 3. SEO Audit — run a website SEO audit for a CRM client/agency
   */
  runAuditForClient: protectedProcedure
    .input(z.object({
      websiteUrl: z.string().url(),
      crmClientId: z.number().optional(),
      clientName: z.string().optional(),
      targetKeywords: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      // Use the crawlUrl helper from seoAudit internally
      const axios = (await import("axios")).default;
      const { invokeLLM: llm } = await import("../_core/llm");
      const res = await axios.get(input.websiteUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOCrawler/1.0)" },
        maxRedirects: 5,
        responseType: "text",
        timeout: 15000,
      });
      const html: string = res.data as string;
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : "";
      const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
      const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : "";
      const h1s = (html.match(/<h1[^>]*>[^<]*<\/h1>/gi) || []).map((h: string) => h.replace(/<[^>]+>/g, "").trim());
      const h2s = (html.match(/<h2[^>]*>[^<]*<\/h2>/gi) || []).map((h: string) => h.replace(/<[^>]+>/g, "").trim());
      const bodyText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
      const imgTags = html.match(/<img[^>]+>/gi) || [];
      const imgWithoutAlt = imgTags.filter((img: string) => !/alt=["'][^"']+["']/i.test(img)).length;

      const aiResponse = await llm({
        messages: [
          { role: "system", content: "You are an SEO expert. Analyze the page and return JSON with: overallScore (0-100), readabilityScore (0-100), seoScore (0-100), technicalSeoScore (0-100), metaDescription (suggested), suggestedTitle (string), issues (array of {severity, category, message, suggestion}), strengths (array of strings), improvements (array of strings)." },
          { role: "user", content: `URL: ${input.websiteUrl}\nTitle: ${pageTitle}\nMeta: ${metaDescription}\nH1s: ${h1s.join(" | ")}\nH2s: ${h2s.slice(0, 5).join(" | ")}\nWords: ${wordCount}\nImages without alt: ${imgWithoutAlt}\nKeywords: ${(input.targetKeywords || []).join(", ")}` },
        ],
      });
      const raw = aiResponse.choices[0]?.message?.content;
      let analysis: any = {};
      try { analysis = typeof raw === "string" ? JSON.parse(raw) : raw; } catch {}
      return { pageTitle, metaDescription, h1s, h2s, wordCount, imgWithoutAlt, ...analysis };
    }),

  /**
   * 4. Keyword Research — get keyword suggestions for a client's service area
   */
  keywordsForClient: protectedProcedure
    .input(z.object({
      topic: z.string().min(1),
      location: z.string().optional(),
      count: z.number().min(1).max(20).default(10),
    }))
    .mutation(async ({ input }) => {
      const { getKeywordSuggestions } = await import("../keywordResearch");
      const fullTopic = input.location ? `${input.topic} in ${input.location}` : input.topic;
      return await getKeywordSuggestions(fullTopic, input.count);
    }),

  /**
   * 5. Publishing Scheduler — schedule a piece of SEO content after appointment booking
   */
  schedulePostAppointment: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      appointmentDate: z.string(), // ISO date string
      publishToWordPress: z.boolean().default(false),
      wordpressConnectionIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../seo-db");
      const { publishingSchedules } = await import("../../drizzle/seo-schema");
      const db = (await getDb())!;
      if (!db) throw new Error("SEO database unavailable");

      // Schedule 3 days after appointment
      const apptDate = new Date(input.appointmentDate);
      const scheduledFor = new Date(apptDate.getTime() + 3 * 24 * 60 * 60 * 1000);

      const [result] = await db.insert(publishingSchedules).values({
        contentId: input.contentId,
        scheduledFor,
        publishToWordPress: input.publishToWordPress ? 1 : 0,
        wordpressConnectionIds: input.wordpressConnectionIds
          ? JSON.stringify(input.wordpressConnectionIds)
          : null,
        publishToManus: 0,
        status: "pending",
        createdBy: ctx.user.id,
      });

      return { scheduleId: (result as any).insertId, scheduledFor };
    }),

  /**
   * 6. Repurposing — repurpose SEO content into email or SMS campaign copy
   */
  repurposeForCampaign: protectedProcedure
    .input(z.object({
      contentId: z.number().optional(),
      rawContent: z.string().optional(), // if no contentId, use raw text
      format: z.enum(["email-summary", "social-snippet", "short-form", "video-script"]),
      platform: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let originalContent = input.rawContent || "";

      if (input.contentId && !originalContent) {
        const { getContentById } = await import("../seo-db");
        const contentData = await getContentById(input.contentId);
        if (contentData) originalContent = contentData.content;
      }

      if (!originalContent) throw new Error("No content provided");

      const { createRepurposedContent } = await import("../seo-db");
      const prompts: Record<string, string> = {
        "email-summary": "Create a compelling email summary (2-3 paragraphs) that captures the key points and encourages readers to click through. Include a subject line on the first line.",
        "social-snippet": "Create a concise, engaging social media post (max 280 characters). Make it shareable and include relevant hashtags.",
        "short-form": "Create a short-form version (100-150 words) suitable for quick reading on mobile devices.",
        "video-script": "Create a video script (2-3 minutes). Include an engaging intro, main points, and a call-to-action.",
      };

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a content repurposing expert for mortgage and real estate marketing." },
          { role: "user", content: `${prompts[input.format]}\n\nOriginal content:\n${originalContent.substring(0, 4000)}` },
        ],
      });

      const repurposedText = response.choices[0]?.message?.content || "";

      let repurposedId: number | null = null;
      if (input.contentId) {
        repurposedId = Number(await createRepurposedContent({
          contentId: input.contentId,
          format: input.format,
          content: repurposedText,
          platform: input.platform || null,
          createdBy: ctx.user.id,
        }));
      }

      return { id: repurposedId, content: repurposedText };
    }),

  /**
   * 7. SEO Analytics — get SEO performance summary for a CRM client
   */
  analyticsForClient: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .query(async ({ input }) => {
      const seoClient = await getSeoClientByCrmId(input.crmClientId);
      if (!seoClient) return null;

      const { getDb } = await import("../seo-db");
      const { content: contentTable, contentAnalytics, contentQualityScores } = await import("../../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");
      const db = (await getDb())!;
      if (!db) return null;

      const [clientContent, analytics, scores] = await Promise.all([
        db.select().from(contentTable).where(eq(contentTable.clientId, seoClient.id)),
        db.select().from(contentAnalytics),
        db.select().from(contentQualityScores),
      ]);

      const contentIds = new Set(clientContent.map((c: any) => c.id));
      const clientAnalytics = analytics.filter((a: any) => contentIds.has(a.contentId));
      const clientScores = scores.filter((s: any) => contentIds.has(s.contentId));

      const totalViews = clientAnalytics.reduce((sum: number, a: any) => sum + (a.views || 0), 0);
      const totalClicks = clientAnalytics.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0);
      const avgScore = clientScores.length > 0
        ? Math.round(clientScores.reduce((sum: number, s: any) => sum + s.overallScore, 0) / clientScores.length)
        : 0;

      const statusCounts = clientContent.reduce((acc: Record<string, number>, c: any) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});

      return {
        seoClientId: seoClient.id,
        totalContent: clientContent.length,
        totalViews,
        totalClicks,
        avgQualityScore: avgScore,
        statusCounts,
        published: statusCounts["published"] || 0,
        approved: statusCounts["approved"] || 0,
        draft: statusCounts["draft"] || 0,
      };
    }),

  /**
   * 8. Ads Manager — list/create ads for a CRM client's linked SEO client
   */
  adsForClient: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .query(async ({ input }) => {
      const seoClient = await getSeoClientByCrmId(input.crmClientId);
      if (!seoClient) return [];

      const { getDb } = await import("../seo-db");
      const { ads } = await import("../../drizzle/seo-schema");
      const { eq, desc } = await import("drizzle-orm");
      const db = (await getDb())!;
      if (!db) return [];

      return db.select().from(ads).where(eq(ads.clientId, seoClient.id)).orderBy(desc(ads.createdAt));
    }),

  createAdForClient: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      platform: z.enum(["google", "facebook"]),
      adType: z.enum(["search", "display", "responsive_search", "image", "video", "carousel"]).default("search"),
      headline1: z.string().max(30).optional(),
      headline2: z.string().max(30).optional(),
      description1: z.string().max(90).optional(),
      primaryText: z.string().optional(),
      callToAction: z.string().optional(),
      destinationUrl: z.string().optional(),
      campaignName: z.string().optional(),
      targetKeywords: z.string().optional(),
      budget: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { crmClientId, ...adData } = input;
      const seoClient = await getSeoClientByCrmId(crmClientId);
      if (!seoClient) throw new Error("No linked SEO client found. Please ensure the client has an SEO profile.");

      const { getDb } = await import("../seo-db");
      const { ads } = await import("../../drizzle/seo-schema");
      const db = (await getDb())!;
      if (!db) throw new Error("SEO database unavailable");

      const [result] = await db.insert(ads).values({
        ...adData,
        clientId: seoClient.id,
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId };
    }),

  /**
   * 9. A/B Testing — create an A/B test for a CRM client's funnel copy
   */
  createABTestForClient: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      topic: z.string().min(1),
      customPrompt: z.string().optional(),
      modelA: z.string().default("gpt-4o"),
      modelB: z.string().default("gpt-4o-mini"),
    }))
    .mutation(async ({ ctx, input }) => {
      const seoClient = await getSeoClientByCrmId(input.crmClientId);
      if (!seoClient) throw new Error("No linked SEO client found.");

      const { createABTest, updateABTestResults } = await import("../abTesting");
      const { calculateWordCount } = await import("../modelPerformance");

      const testId = await createABTest({
        clientId: seoClient.id,
        topic: input.topic,
        customPrompt: input.customPrompt,
        enableWebResearch: false,
        shouldGenerateImage: false,
        modelA: input.modelA,
        modelB: input.modelB,
        createdBy: ctx.user.id,
      });

      const systemPrompt = input.customPrompt || "You are an expert mortgage and real estate content writer. Create engaging landing page copy.";
      const userPrompt = `Write compelling landing page copy for: ${input.topic}`;

      const [responseA, responseB] = await Promise.all([
        invokeLLM({ model: input.modelA, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
        invokeLLM({ model: input.modelB, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
      ]);

      const contentA = typeof responseA.choices[0]?.message?.content === "string" ? responseA.choices[0].message.content : "";
      const contentB = typeof responseB.choices[0]?.message?.content === "string" ? responseB.choices[0].message.content : "";

      await Promise.all([
        updateABTestResults(testId, { version: "A", content: contentA, title: contentA.split("\n")[0]?.replace(/^#+\s*/, "").substring(0, 200) || input.topic, wordCount: calculateWordCount(contentA), generationTimeMs: 0, inputTokens: responseA.usage?.prompt_tokens || 0, outputTokens: responseA.usage?.completion_tokens || 0 }),
        updateABTestResults(testId, { version: "B", content: contentB, title: contentB.split("\n")[0]?.replace(/^#+\s*/, "").substring(0, 200) || input.topic, wordCount: calculateWordCount(contentB), generationTimeMs: 0, inputTokens: responseB.usage?.prompt_tokens || 0, outputTokens: responseB.usage?.completion_tokens || 0 }),
      ]);

      return { testId, contentA, contentB };
    }),

  /**
   * 10. Quality Score — analyze quality of a piece of content
   */
  analyzeQuality: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .mutation(async ({ input }) => {
      const { getContentById, saveQualityScore } = await import("../seo-db");
      const contentData = await getContentById(input.contentId);
      if (!contentData) throw new Error("Content not found");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a content quality analyst. Return only valid JSON." },
          { role: "user", content: `Analyze this content and return JSON with: readabilityScore (0-100), seoScore (0-100), toneScore (0-100), engagementScore (0-100), overallScore (0-100), suggestions (array of strings).\n\nTitle: ${contentData.title}\n\nContent:\n${contentData.content.substring(0, 3000)}` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "quality_scores",
            strict: true,
            schema: {
              type: "object",
              properties: {
                readabilityScore: { type: "number" },
                seoScore: { type: "number" },
                toneScore: { type: "number" },
                engagementScore: { type: "number" },
                overallScore: { type: "number" },
                suggestions: { type: "array", items: { type: "string" } },
              },
              required: ["readabilityScore", "seoScore", "toneScore", "engagementScore", "overallScore", "suggestions"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = response.choices[0]?.message?.content;
      const scores = typeof raw === "string" ? JSON.parse(raw) : raw;
      await saveQualityScore({ contentId: input.contentId, ...scores });
      return scores;
    }),

  /**
   * 11. Client Portal — send a portal invite to a CRM client
   */
  sendPortalInvite: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      name: z.string(),
      email: z.string().email(),
      role: z.enum(["client_admin", "client_viewer"]).default("client_admin"),
      baseUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Ensure SEO client exists
      const seoClient = await getSeoClientByCrmId(input.crmClientId);
      if (!seoClient) throw new Error("No linked SEO client found. Please ensure the client has an SEO profile.");

      const { createClientPortalInvitation } = await import("../clientPortalAuth");
      const result = await createClientPortalInvitation({
        name: input.name,
        email: input.email,
        role: input.role,
        clientId: seoClient.id,
        createdBy: ctx.user.id,
      });

      const baseUrl = input.baseUrl || "https://agencycrm-lmov9od5.manus.space";
      const inviteUrl = `${baseUrl}/seo/portal/accept-invitation?token=${result.token}`;

      const { sendPortalInvitationEmail } = await import("../_core/email");
      await sendPortalInvitationEmail({
        toEmail: input.email,
        toName: input.name,
        clientName: seoClient.name || input.name,
        inviteUrl,
      });

      return { inviteUrl, expiresAt: result.expiresAt };
    }),

  /**
   * 12. Recurring Plans — get/create recurring content plan for a CRM client
   */
  recurringPlansForClient: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .query(async ({ input }) => {
      const seoClient = await getSeoClientByCrmId(input.crmClientId);
      if (!seoClient) return [];

      const { getDb } = await import("../seo-db");
      const { recurringPlans } = await import("../../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");
      const db = (await getDb())!;
      if (!db) return [];

      return db.select().from(recurringPlans).where(eq(recurringPlans.clientId, seoClient.id));
    }),

  createRecurringPlanForClient: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      planName: z.string().min(1),
      frequency: z.enum(["weekly", "biweekly", "monthly"]),
      postsPerCycle: z.number().min(1).max(10).default(4),
      topicTemplate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { crmClientId, ...planData } = input;
      const seoClient = await getSeoClientByCrmId(crmClientId);
      if (!seoClient) throw new Error("No linked SEO client found.");

      const { getDb } = await import("../seo-db");
      const { recurringPlans } = await import("../../drizzle/seo-schema");
      const db = (await getDb())!;
      if (!db) throw new Error("SEO database unavailable");

      const [result] = await db.insert(recurringPlans).values({
        ...planData,
        clientId: seoClient.id,
        createdBy: ctx.user.id,
        status: "active",
        enableWebResearch: true,
        enableImageGeneration: false,
      });

      return { id: (result as any).insertId };
    }),

  /**
   * 13. Budget Tracking — get SEO spend for a CRM client
   */
  budgetForClient: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .mutation(async ({ input }) => {
      const seoClient = await getSeoClientByCrmId(input.crmClientId);
      if (!seoClient) return null;

      const { getClientMonthlyCost } = await import("../budgetTracking");
      const cost = await getClientMonthlyCost(seoClient.id);
      return { seoClientId: seoClient.id, monthlyCost: cost };
    }),

  // Aliases for UI naming consistency
  getKeywordsForClient: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .mutation(async ({ input }) => {
      const seoClient = await getSeoClientByCrmId(input.crmClientId);
      if (!seoClient) return [];
      const { keywords } = await import("../../drizzle/seo-schema");
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { eq } = await import("drizzle-orm");
      return db.select().from(keywords).where(eq(keywords.clientId, seoClient.id)).limit(20);
    }),

  getAdCampaignsForClient: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .query(async ({ input }) => {
      const seoClient = await getSeoClientByCrmId(input.crmClientId);
      if (!seoClient) return [];
      const { adCampaigns } = await import("../../drizzle/seo-schema");
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { eq } = await import("drizzle-orm");
      return db.select().from(adCampaigns).where(eq(adCampaigns.clientId, seoClient.id)).limit(10);
    }),

  createAbTest: protectedProcedure
    .input(z.object({ testName: z.string(), variantA: z.string(), variantB: z.string(), crmClientId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { createABTest } = await import("../abTesting");
      const seoClientId = input.crmClientId ? (await getSeoClientByCrmId(input.crmClientId))?.id ?? 1 : 1;
      return createABTest({
        clientId: seoClientId,
        topic: input.testName,
        customPrompt: `Variant A: ${input.variantA}\nVariant B: ${input.variantB}`,
        enableWebResearch: false,
        shouldGenerateImage: false,
        modelA: "default",
        modelB: "default",
        createdBy: ctx.user.id,
      });
    }),

  sendClientPortalInvite: protectedProcedure
    .input(z.object({ crmClientId: z.number(), email: z.string().email(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const seoClient = await getSeoClientByCrmId(input.crmClientId);
      if (!seoClient) throw new TRPCError({ code: "NOT_FOUND", message: "No linked SEO client found. Add the client first." });
      const { createClientPortalInvitation } = await import("../clientPortalAuth");
      return createClientPortalInvitation(seoClient.id, input.email, input.name || seoClient.name, "client_admin");
    }),

  schedulePublishForAppointment: protectedProcedure
    .input(z.object({ appointmentDate: z.string(), clientName: z.string(), topic: z.string(), crmClientId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const seoClientId = input.crmClientId ? (await getSeoClientByCrmId(input.crmClientId))?.id ?? null : null;
      const { content } = await import("../../drizzle/seo-schema");
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const title = `${input.topic} — ${input.clientName}`;
      const [row] = await db.insert(content).values({
        clientId: seoClientId,
        title,
        content: `Scheduled content for appointment on ${input.appointmentDate}: ${input.topic}`,
        contentType: "blog-post",
        status: "scheduled",
        createdBy: ctx.user.id,
        scheduledDate: new Date(input.appointmentDate),
        aiModel: "default",
        enableWebResearch: false,
        shouldGenerateImage: false,
      }).$returningId();
      return { contentId: row.id, title, scheduledDate: input.appointmentDate };
    }),

  getSeoStatsForClient: protectedProcedure
    .input(z.object({ crmClientId: z.number().optional() }))
    .query(async ({ input }) => {
      const { content: contentTable, contentAnalytics, contentQualityScores } = await import("../../drizzle/seo-schema");
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { eq, sql } = await import("drizzle-orm");
      let seoClientId: number | null = null;
      if (input.crmClientId) {
        const seoClient = await getSeoClientByCrmId(input.crmClientId);
        seoClientId = seoClient?.id ?? null;
      }
      const whereClause = seoClientId ? eq(contentTable.clientId, seoClientId) : sql`1=1`;
      const [clientContent, analytics, scores] = await Promise.all([
        db.select().from(contentTable).where(whereClause),
        db.select().from(contentAnalytics),
        db.select().from(contentQualityScores),
      ]);
      const contentIds = new Set(clientContent.map((c: any) => c.id));
      const clientAnalytics = analytics.filter((a: any) => contentIds.has(a.contentId));
      const clientScores = scores.filter((s: any) => contentIds.has(s.contentId));
      const totalViews = clientAnalytics.reduce((sum: number, a: any) => sum + (a.views || 0), 0);
      const avgScore = clientScores.length > 0
        ? Math.round(clientScores.reduce((sum: number, s: any) => sum + s.overallScore, 0) / clientScores.length)
        : 0;
      const statusCounts = clientContent.reduce((acc: Record<string, number>, c: any) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});
      return {
        totalContent: clientContent.length,
        publishedContent: statusCounts["published"] || 0,
        totalViews,
        avgQualityScore: avgScore,
        published: statusCounts["published"] || 0,
        approved: statusCounts["approved"] || 0,
        draft: statusCounts["draft"] || 0,
      };
    }),

  getRecentApprovedContent: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ input }) => {
      const { content, seoClients } = await import("../../drizzle/seo-schema");
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { eq, desc, inArray } = await import("drizzle-orm");
      const rows = await db.select({ id: content.id, title: content.title, clientId: content.clientId, content: content.content })
        .from(content)
        .where(eq(content.status, 'approved'))
        .orderBy(desc(content.createdAt))
        .limit(input.limit);
      const clientIds = [...new Set(rows.map(r => r.clientId).filter(Boolean))] as number[];
      const clients = clientIds.length > 0 ? await db.select({ id: seoClients.id, name: seoClients.name }).from(seoClients).where(inArray(seoClients.id, clientIds)) : [];
      return rows.map(r => ({ ...r, clientName: clients.find(c => c.id === r.clientId)?.name ?? 'Unknown' }));
    }),

  repurposeToSms: protectedProcedure
    .input(z.object({ contentId: z.number(), channel: z.literal('sms') }))
    .mutation(async ({ input }) => {
      const { content } = await import("../../drizzle/seo-schema");
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { eq } = await import("drizzle-orm");
      const [row] = await db.select().from(content).where(eq(content.id, input.contentId));
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Content not found" });
      const { invokeLLM } = await import("../_core/llm");
      const result = await invokeLLM({ messages: [
        { role: "system", content: "You are an SMS marketing expert. Convert blog content into a concise, compelling SMS message under 160 characters. Include a clear CTA. Return only the SMS text." },
        { role: "user", content: `Convert this blog post into an SMS campaign message:\n\nTitle: ${row.title}\n\n${row.content?.substring(0, 500)}` },
      ]});
      const smsText = result.choices[0].message.content as string;
      return { smsText: smsText.trim().substring(0, 160), originalTitle: row.title };
    }),

  /**
   * Save a keyword to a client's profile
   */
  saveKeyword: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      keyword: z.string().min(1),
      searchVolume: z.number().optional(),
      difficulty: z.number().optional(),
      relevance: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { savedKeywords } = await import("../../drizzle/seo-schema");
      const { sql } = await import("drizzle-orm");
      // Check for duplicate
      const existing = await db.execute(
        sql`SELECT id FROM savedKeywords WHERE crmClientId = ${input.crmClientId} AND keyword = ${input.keyword} LIMIT 1`
      ) as any;
      const rows = existing[0] as any[];
      if (rows && rows.length > 0) return { id: rows[0].id, duplicate: true };
      const result = await db.execute(
        sql`INSERT INTO savedKeywords (crmClientId, keyword, searchVolume, difficulty, relevance, savedBy) VALUES (${input.crmClientId}, ${input.keyword}, ${input.searchVolume ?? null}, ${input.difficulty ?? null}, ${input.relevance ?? null}, ${ctx.user.id})`
      ) as any;
      return { id: (result[0] as any).insertId, duplicate: false };
    }),

  /**
   * Get saved keywords for a CRM client
   */
  getSavedKeywords: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .query(async ({ input }) => {
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(
        sql`SELECT id, keyword, searchVolume, difficulty, relevance, createdAt FROM savedKeywords WHERE crmClientId = ${input.crmClientId} ORDER BY createdAt DESC LIMIT 50`
      ) as any;
      return (result[0] as any[]) || [];
    }),

  /**
   * Save an audit result to history
   */
  saveAuditResult: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      websiteUrl: z.string(),
      overallScore: z.number().optional(),
      seoScore: z.number().optional(),
      readabilityScore: z.number().optional(),
      technicalSeoScore: z.number().optional(),
      wordCount: z.number().optional(),
      imgWithoutAlt: z.number().optional(),
      pageTitle: z.string().optional(),
      issues: z.array(z.any()).optional(),
      strengths: z.array(z.string()).optional(),
      improvements: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(
        sql`INSERT INTO seoAuditHistory (crmClientId, websiteUrl, overallScore, seoScore, readabilityScore, technicalSeoScore, wordCount, imgWithoutAlt, pageTitle, issuesJson, strengthsJson, improvementsJson) VALUES (${input.crmClientId}, ${input.websiteUrl}, ${input.overallScore ?? null}, ${input.seoScore ?? null}, ${input.readabilityScore ?? null}, ${input.technicalSeoScore ?? null}, ${input.wordCount ?? null}, ${input.imgWithoutAlt ?? null}, ${input.pageTitle ?? null}, ${JSON.stringify(input.issues ?? [])}, ${JSON.stringify(input.strengths ?? [])}, ${JSON.stringify(input.improvements ?? [])})`
      ) as any;
      return { id: (result[0] as any).insertId };
    }),

  /**
   * Get audit history for a CRM client (for trend tracking)
   */
  getAuditHistory: protectedProcedure
    .input(z.object({ crmClientId: z.number(), limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ input }) => {
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { sql } = await import("drizzle-orm");
      const result = await db.execute(
        sql`SELECT id, websiteUrl, overallScore, seoScore, readabilityScore, technicalSeoScore, wordCount, pageTitle, createdAt FROM seoAuditHistory WHERE crmClientId = ${input.crmClientId} ORDER BY createdAt DESC LIMIT ${input.limit}`
      ) as any;
      return (result[0] as any[]) || [];
    }),

  /**
   * Delete a saved keyword by ID
   */
  deleteKeyword: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../seo-db");
      const db = (await getDb())!;
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`DELETE FROM savedKeywords WHERE id = ${input.id}`);
      return { success: true };
    }),

  /**
   * Send audit score email report to client via SendGrid
   */
  sendAuditEmailReport: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      clientEmail: z.string().email(),
      clientName: z.string(),
      websiteUrl: z.string(),
      overallScore: z.number(),
      seoScore: z.number(),
      readabilityScore: z.number(),
      technicalSeoScore: z.number(),
      issues: z.array(z.object({
        severity: z.string().optional(),
        message: z.string(),
        suggestion: z.string().optional(),
      })).optional(),
      strengths: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { sendEmail } = await import("../sendgrid");
      const scoreColor = (s: number) => s >= 80 ? "#16a34a" : s >= 60 ? "#ca8a04" : "#dc2626";
      const topIssues = (input.issues || []).slice(0, 3);
      const topStrengths = (input.strengths || []).slice(0, 3);
      const scoreCards = [
        { l: "Overall", s: input.overallScore },
        { l: "SEO", s: input.seoScore },
        { l: "Readability", s: input.readabilityScore },
        { l: "Technical", s: input.technicalSeoScore },
      ];
      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f8fafc">
          <h2 style="color:#1e40af;margin-bottom:4px">SEO Audit Report</h2>
          <p style="color:#64748b;margin-top:0">${input.websiteUrl}</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr>${scoreCards.map(({l,s}) =>
              `<td style="background:#fff;border-radius:8px;padding:12px;text-align:center;border:1px solid #e2e8f0;width:25%">
                <div style="font-size:12px;color:#64748b">${l}</div>
                <div style="font-size:28px;font-weight:bold;color:${scoreColor(s)}">${s}</div>
              </td>`).join("")}
            </tr>
          </table>
          ${topIssues.length > 0 ? `
          <h3 style="color:#dc2626;font-size:14px">Top Issues to Fix</h3>
          <ul style="padding-left:20px;color:#374151">
            ${topIssues.map(i => `<li style="margin-bottom:8px"><strong>${i.message}</strong>${i.suggestion ? `<br><span style="color:#64748b;font-size:13px">${i.suggestion}</span>` : ""}</li>`).join("")}
          </ul>` : ""}
          ${topStrengths.length > 0 ? `
          <h3 style="color:#16a34a;font-size:14px">What's Working Well</h3>
          <ul style="padding-left:20px;color:#374151">
            ${topStrengths.map(s => `<li style="margin-bottom:4px">${s}</li>`).join("")}
          </ul>` : ""}
          <p style="color:#64748b;font-size:12px;border-top:1px solid #e2e8f0;padding-top:12px;margin-top:20px">
            This report was generated by Sterling Marketing's AI SEO system.
          </p>
        </div>`;
      const result = await sendEmail({
        to: [input.clientEmail],
        from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
        subject: `SEO Audit Report — ${input.clientName} (Score: ${input.overallScore}/100)`,
        html,
      });
      return result;
    }),

  /**
   * Utility — get or create linked SEO client for a CRM client
   */
  getLinkedSeoClient: protectedProcedure
    .input(z.object({ crmClientId: z.number(), clientName: z.string().optional(), clientEmail: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const existing = await getSeoClientByCrmId(input.crmClientId);
      if (existing) return existing;

      if (input.clientName) {
        return await ensureLinkedSeoClient({
          crmClientId: input.crmClientId,
          name: input.clientName,
          email: input.clientEmail || null,
          seoUserId: ctx.user.id,
        });
      }
      return null;
    }),

  /**
   * Generate a branded PDF content calendar for a client
   */
  generateCalendarPDF: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      clientName: z.string(),
      keywords: z.array(z.object({
        keyword: z.string(),
        publishDate: z.string(),
        searchVolume: z.number().optional().nullable(),
        difficulty: z.number().optional().nullable(),
      })),
    }))
    .mutation(async ({ input }) => {
      const PDFDocument = (await import('pdfkit')).default;
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));

      await new Promise<void>((resolve) => {
        doc.on('end', resolve);

        // Header band
        doc.rect(0, 0, doc.page.width, 80).fill('#1e3a5f');
        doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
          .text('Sterling Marketing', 50, 20);
        doc.fontSize(11).font('Helvetica')
          .text('AI-Powered SEO Content Calendar', 50, 48);
        doc.fillColor('#94a3b8').fontSize(9)
          .text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
            doc.page.width - 200, 55, { align: 'right', width: 150 });

        // Client name
        doc.fillColor('#1e3a5f').fontSize(16).font('Helvetica-Bold')
          .text(input.clientName, 50, 100);
        doc.fillColor('#64748b').fontSize(10).font('Helvetica')
          .text('30-Day Content Publishing Schedule', 50, 122);

        // Divider
        doc.moveTo(50, 142).lineTo(doc.page.width - 50, 142).strokeColor('#e2e8f0').stroke();

        // Table header
        let y = 158;
        const col = { date: 50, keyword: 155, vol: 400, diff: 470 };
        doc.fillColor('#f1f5f9').rect(50, y - 6, doc.page.width - 100, 22).fill();
        doc.fillColor('#475569').fontSize(9).font('Helvetica-Bold');
        doc.text('PUBLISH DATE', col.date, y);
        doc.text('KEYWORD / TOPIC', col.keyword, y);
        doc.text('VOLUME', col.vol, y);
        doc.text('DIFFICULTY', col.diff, y);
        y += 24;

        // Table rows
        const rowColors = ['#eff6ff', '#f0fdf4', '#fefce8', '#fdf4ff', '#fff7ed'];
        input.keywords.forEach((kw, i) => {
          if (y > doc.page.height - 80) {
            doc.addPage();
            y = 60;
          }
          const bg = rowColors[i % rowColors.length];
          doc.fillColor(bg).rect(50, y - 4, doc.page.width - 100, 20).fill();
          doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold')
            .text(kw.publishDate, col.date, y, { width: 95 });
          doc.font('Helvetica').fillColor('#334155')
            .text(kw.keyword, col.keyword, y, { width: 235 });
          if (kw.searchVolume != null) {
            const vol = kw.searchVolume >= 1000 ? `${(kw.searchVolume / 1000).toFixed(1)}k` : String(kw.searchVolume);
            doc.fillColor('#0369a1').text(vol + '/mo', col.vol, y, { width: 60 });
          }
          if (kw.difficulty != null) {
            const dColor = kw.difficulty <= 30 ? '#16a34a' : kw.difficulty <= 60 ? '#ca8a04' : '#dc2626';
            doc.fillColor(dColor).text(`D:${kw.difficulty}`, col.diff, y, { width: 60 });
          }
          y += 22;
        });

        // Footer
        const footerY = doc.page.height - 40;
        doc.moveTo(50, footerY - 8).lineTo(doc.page.width - 50, footerY - 8).strokeColor('#e2e8f0').stroke();
        doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
          .text('Sterling Marketing · AI-Powered Lead Management', 50, footerY,
            { align: 'center', width: doc.page.width - 100 });

        doc.end();
      });

      const pdfBuffer = Buffer.concat(chunks);
      const base64 = pdfBuffer.toString('base64');
      return { base64, filename: `${input.clientName.replace(/\s+/g, '_')}_content_calendar.pdf` };
    }),

  /**
   * Send threshold email alert when audit score drops below threshold
   */
  sendAuditThresholdAlert: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      clientName: z.string(),
      websiteUrl: z.string(),
      overallScore: z.number(),
      threshold: z.number(),
      recipientEmail: z.string().email().default('tariqhaskins@indigolabsai.com'),
    }))
    .mutation(async ({ input }) => {
      const { sendEmail } = await import('../sendgrid');
      const result = await sendEmail({
        to: [input.recipientEmail],
        from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
        subject: `\u26a0\ufe0f SEO Score Alert: ${input.clientName} dropped below ${input.threshold}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#dc2626">\u26a0\ufe0f SEO Score Alert</h2>
            <p>The SEO audit for <strong>${input.clientName}</strong> returned a score below your alert threshold.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#fef2f2">
                <td style="padding:12px;border:1px solid #fecaca"><strong>Client</strong></td>
                <td style="padding:12px;border:1px solid #fecaca">${input.clientName}</td>
              </tr>
              <tr>
                <td style="padding:12px;border:1px solid #e5e7eb"><strong>Website</strong></td>
                <td style="padding:12px;border:1px solid #e5e7eb">${input.websiteUrl}</td>
              </tr>
              <tr style="background:#fef2f2">
                <td style="padding:12px;border:1px solid #fecaca"><strong>Overall Score</strong></td>
                <td style="padding:12px;border:1px solid #fecaca;color:#dc2626;font-weight:bold;font-size:20px">${input.overallScore}</td>
              </tr>
              <tr>
                <td style="padding:12px;border:1px solid #e5e7eb"><strong>Your Threshold</strong></td>
                <td style="padding:12px;border:1px solid #e5e7eb">${input.threshold}</td>
              </tr>
            </table>
            <p style="color:#6b7280;font-size:14px">Log in to the Sterling Marketing CRM to review the full audit report and take action.</p>
          </div>
        `,
      });
      return result;
    }),

  /**
   * Upload client logo for PDF branding (base64 → S3)
   */
  uploadClientLogo: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      base64Image: z.string(),
      mimeType: z.string().default('image/png'),
    }))
    .mutation(async ({ input }) => {
      const { storagePut } = await import('../storage');
      const buffer = Buffer.from(input.base64Image, 'base64');
      const ext = input.mimeType.split('/')[1] || 'png';
      const key = `client-logos/crm-${input.crmClientId}-logo-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  /**
   * Add a keyword rank position snapshot
   */
  addRankSnapshot: protectedProcedure
    .input(z.object({
      savedKeywordId: z.number(),
      crmClientId: z.number(),
      keyword: z.string(),
      position: z.number().nullable(),
      url: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      await conn.execute(
        'INSERT INTO keywordRankings (savedKeywordId, crmClientId, keyword, position, url, searchEngine) VALUES (?, ?, ?, ?, ?, ?)',
        [input.savedKeywordId, input.crmClientId, input.keyword, input.position, input.url ?? null, 'google']
      );
      await conn.end();
      return { success: true };
    }),

  /**
   * Get rank history for a saved keyword (last 12 snapshots)
   */
  getRankHistory: protectedProcedure
    .input(z.object({ savedKeywordId: z.number() }))
    .query(async ({ input }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        'SELECT * FROM keywordRankings WHERE savedKeywordId = ? ORDER BY recordedAt DESC LIMIT 12',
        [input.savedKeywordId]
      );
      await conn.end();
      return rows as any[];
    }),

  /**
   * Get all rank snapshots for a CRM client (for the rankings dashboard)
   */
  getAllRankSnapshots: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .query(async ({ input }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        'SELECT kr.*, sk.keyword, sk.searchVolume, sk.difficulty FROM keywordRankings kr LEFT JOIN savedKeywords sk ON kr.savedKeywordId = sk.id WHERE kr.crmClientId = ? ORDER BY kr.recordedAt DESC LIMIT 100',
        [input.crmClientId]
      );
      await conn.end();
      return rows as any[];
    }),

  /**
   * Competitor keyword gap analysis — AI identifies keywords competitor likely ranks for that client doesn't
   */
  competitorKeywordGap: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      competitorDomain: z.string(),
      clientNiche: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `You are an SEO competitor analysis expert. A client in the mortgage/real estate niche wants to find keyword gaps vs their competitor.

Competitor domain: ${input.competitorDomain}
Client niche: ${input.clientNiche || 'mortgage and real estate'}

Identify 10 high-value keywords that ${input.competitorDomain} likely ranks for that the client is probably missing. Focus on:
- Long-tail buyer-intent keywords
- Local SEO opportunities  
- Content gap keywords (guides, how-tos, comparisons)

Return JSON with a keywords array of 10 objects.`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are an SEO expert. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'keyword_gap',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                keywords: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      keyword: { type: 'string' },
                      estimatedVolume: { type: 'string' },
                      difficulty: { type: 'number' },
                      intent: { type: 'string' },
                      reason: { type: 'string' },
                    },
                    required: ['keyword', 'estimatedVolume', 'difficulty', 'intent', 'reason'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['keywords'],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices[0]?.message?.content ?? '{"keywords":[]}';
      const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      return (parsed.keywords || []) as Array<{ keyword: string; estimatedVolume: string; difficulty: number; intent: string; reason: string }>;
    }),

  /**
   * Export all rank snapshots for a client as CSV data
   */
  exportRankingsCSV: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .mutation(async ({ input }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        'SELECT kr.position, kr.recordedAt, sk.keyword, sk.searchVolume, sk.difficulty FROM keywordRankings kr LEFT JOIN savedKeywords sk ON kr.savedKeywordId = sk.id WHERE kr.crmClientId = ? ORDER BY sk.keyword, kr.recordedAt ASC',
        [input.crmClientId]
      );
      await conn.end();
      const data = rows as any[];
      const header = 'Keyword,Position,Search Volume,Difficulty,Date';
      const lines = data.map((r: any) =>
        `"${r.keyword || ''}",${r.position},${r.searchVolume || ''},${r.difficulty || ''},${new Date(r.recordedAt).toLocaleDateString()}`
      );
      return { csv: [header, ...lines].join('\n'), count: data.length };
    }),

  /**
   * Fetch live SERP positions via Google Search Console (AI-simulated)
   */
  fetchLiveRankings: protectedProcedure
    .input(z.object({ crmClientId: z.number(), keywords: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are a Google Search Console data simulator. Return realistic SERP position data for a mortgage/real estate website. Return JSON only.' },
          { role: 'user', content: `Simulate current Google SERP positions for these keywords. Return a JSON object with a "results" array where each item has: keyword (string), position (integer 1-100), impressions (integer), clicks (integer), ctr (number 0-1). Keywords: ${input.keywords.join(', ')}` },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'serp_positions',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                results: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      keyword: { type: 'string' },
                      position: { type: 'number' },
                      impressions: { type: 'number' },
                      clicks: { type: 'number' },
                      ctr: { type: 'number' },
                    },
                    required: ['keyword', 'position', 'impressions', 'clicks', 'ctr'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['results'],
              additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      return parsed.results as Array<{ keyword: string; position: number; impressions: number; clicks: number; ctr: number }>;
    }),

  /**
   * Schedule all gap keywords to content calendar
   */
  scheduleGapKeywords: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      keywords: z.array(z.object({
        keyword: z.string(),
        opportunityScore: z.number().optional(),
        estimatedVolume: z.string().optional(),
        difficulty: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const sorted = [...input.keywords].sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0));
      const now = new Date();
      const scheduled = sorted.map((kw, i) => {
        const publishDate = new Date(now);
        publishDate.setDate(now.getDate() + Math.round((i / Math.max(sorted.length - 1, 1)) * 29) + 1);
        return {
          keyword: kw.keyword,
          publishDate: publishDate.toISOString().split('T')[0],
          opportunityScore: kw.opportunityScore ?? 0,
          estimatedVolume: kw.estimatedVolume ?? '0',
          difficulty: kw.difficulty ?? 50,
        };
      });
      return scheduled;
    }),

  /**
   * Set a rank alert for a saved keyword — alert if rank drops below threshold position
   */
  setRankAlert: protectedProcedure
    .input(z.object({
      savedKeywordId: z.number(),
      crmClientId: z.number(),
      keyword: z.string(),
      thresholdPosition: z.number().min(1).max(100),
      alertEmail: z.string().email().optional(),
    }))
    .mutation(async ({ input }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      // Upsert: remove existing alert for this keyword then insert new one
      await conn.execute('DELETE FROM keywordRankAlerts WHERE savedKeywordId = ?', [input.savedKeywordId]);
      await conn.execute(
        'INSERT INTO keywordRankAlerts (savedKeywordId, crmClientId, keyword, thresholdPosition, alertEmail, isActive) VALUES (?, ?, ?, ?, ?, 1)',
        [input.savedKeywordId, input.crmClientId, input.keyword, input.thresholdPosition, input.alertEmail ?? 'tariqhaskins@indigolabsai.com']
      );
      await conn.end();
      return { success: true };
    }),

  /**
   * Get rank alert for a specific saved keyword
   */
  getRankAlert: protectedProcedure
    .input(z.object({ savedKeywordId: z.number() }))
    .query(async ({ input }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        'SELECT * FROM keywordRankAlerts WHERE savedKeywordId = ? AND isActive = 1 LIMIT 1',
        [input.savedKeywordId]
      );
      await conn.end();
      const alerts = rows as any[];
      return alerts[0] ?? null;
    }),

  /**
   * Get all active rank alerts for a CRM client
   */
  getAllRankAlerts: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .query(async ({ input }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        'SELECT * FROM keywordRankAlerts WHERE crmClientId = ? AND isActive = 1 ORDER BY createdAt DESC',
        [input.crmClientId]
      );
      await conn.end();
      return rows as any[];
    }),

  /**
   * Delete (remove) a rank alert for a saved keyword
   */
  deleteRankAlert: protectedProcedure
    .input(z.object({ savedKeywordId: z.number() }))
    .mutation(async ({ input }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      await conn.execute('DELETE FROM keywordRankAlerts WHERE savedKeywordId = ?', [input.savedKeywordId]);
      await conn.end();
      return { success: true };
    }),

  /**
   * Check all rank alerts for a client — fires push notification + email if threshold breached
   */
  checkRankAlerts: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .mutation(async ({ input }) => {
      const mysql2 = await import('mysql2/promise');
      const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
      const [alertRows] = await conn.execute(
        'SELECT * FROM keywordRankAlerts WHERE crmClientId = ? AND isActive = 1',
        [input.crmClientId]
      );
      const alerts = alertRows as any[];
      const triggered: Array<{ keyword: string; currentPosition: number; threshold: number }> = [];

      for (const alert of alerts) {
        const [snapRows] = await conn.execute(
          'SELECT position FROM keywordRankings WHERE savedKeywordId = ? ORDER BY recordedAt DESC LIMIT 1',
          [alert.savedKeywordId]
        );
        const snaps = snapRows as any[];
        if (snaps.length === 0) continue;
        const currentPosition = snaps[0].position;
        if (currentPosition === null || currentPosition === undefined) continue;
        // Alert when rank is WORSE than threshold (higher position number = lower rank)
        if (currentPosition > alert.thresholdPosition) {
          triggered.push({ keyword: alert.keyword, currentPosition, threshold: alert.thresholdPosition });
          await conn.execute('UPDATE keywordRankAlerts SET lastTriggeredAt = NOW() WHERE id = ?', [alert.id]);
          try {
            const { sendEmail } = await import('../sendgrid');
            await sendEmail({
              to: [alert.alertEmail || 'tariqhaskins@indigolabsai.com'],
              subject: `\u26a0\ufe0f Rank Alert: "${alert.keyword}" dropped to position #${currentPosition}`,
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
                  <h2 style="color:#dc2626;margin:0 0 16px;">\u26a0\ufe0f Keyword Rank Drop Alert</h2>
                  <p style="color:#374151;">A keyword you are tracking has dropped below your alert threshold.</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e5e7eb;">
                    <tr style="background:#f9fafb;"><td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Keyword</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${alert.keyword}</td></tr>
                    <tr><td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Current Position</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:700;">#${currentPosition}</td></tr>
                    <tr style="background:#f9fafb;"><td style="padding:10px 12px;font-weight:600;border-bottom:1px solid #e5e7eb;">Alert Threshold</td><td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">Position #${alert.thresholdPosition} (alert if worse)</td></tr>
                    <tr><td style="padding:10px 12px;font-weight:600;">Recommended Action</td><td style="padding:10px 12px;">Review content quality, backlinks, and on-page SEO for this keyword</td></tr>
                  </table>
                  <p style="color:#9ca3af;font-size:12px;margin-top:24px;">Sent by Sterling Marketing Agency CRM &bull; Rank Tracking System</p>
                </div>
              `,
            });
          } catch (e) {
            console.error('[RankAlert] Email send failed:', e);
          }
        }
      }
      await conn.end();
      return { triggered, total: alerts.length };
    }),

  // ─── Gap Keyword Content Brief Generator ───────────────────────────────────

  generateContentBrief: protectedProcedure
    .input(z.object({
      crmClientId: z.number(),
      keyword: z.string(),
      competitorDomain: z.string().optional(),
      estimatedVolume: z.number().optional(),
      difficulty: z.number().optional(),
      intent: z.string().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import('../_core/llm');
      const prompt = `You are an expert SEO content strategist. Generate a detailed, actionable content brief for the following gap keyword opportunity.

Keyword: "${input.keyword}"
Competitor Domain: ${input.competitorDomain || 'Unknown'}
Search Intent: ${input.intent || 'Unknown'}
Estimated Monthly Volume: ${input.estimatedVolume || 'Unknown'}
Difficulty Score: ${input.difficulty || 'Unknown'}/100
Why this is a gap: ${input.reason || 'Competitor ranks for this keyword but client does not'}

Generate a structured content brief with these exact fields:
- searchIntent: one of "informational", "transactional", "navigational", "commercial"
- targetAudience: 1-2 sentences describing who this content is for
- recommendedTitle: an SEO-optimized H1 title (60-70 characters)
- recommendedWordCount: ideal word count (number only, e.g. 1500)
- headings: array of 5-8 H2/H3 headings as strings
- internalLinks: array of 3-5 suggested internal link topic strings (topics the client should link to/from)
- writingBrief: 3-4 sentences describing what the content should cover, tone, and key points to hit
- callToAction: the primary CTA for this content (e.g. "Schedule a free consultation", "Get a mortgage quote")
- seoTips: array of 3-5 specific SEO tips for this keyword (meta description guidance, LSI keywords, schema markup, etc.)`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are an expert SEO content strategist. Always respond with valid JSON only, no markdown fences.' },
          { role: 'user', content: prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'content_brief',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                searchIntent: { type: 'string' },
                targetAudience: { type: 'string' },
                recommendedTitle: { type: 'string' },
                recommendedWordCount: { type: 'number' },
                headings: { type: 'array', items: { type: 'string' } },
                internalLinks: { type: 'array', items: { type: 'string' } },
                writingBrief: { type: 'string' },
                callToAction: { type: 'string' },
                seoTips: { type: 'array', items: { type: 'string' } },
              },
              required: ['searchIntent', 'targetAudience', 'recommendedTitle', 'recommendedWordCount', 'headings', 'internalLinks', 'writingBrief', 'callToAction', 'seoTips'],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = (response?.choices?.[0]?.message?.content ?? '{}') as string;
      let brief: any;
      try { brief = JSON.parse(raw); } catch { brief = {}; }

      // Persist to DB
      const mysql = await import('mysql2/promise');
      const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
      const [result] = await conn.execute(
        `INSERT INTO gapKeywordBriefs (crmClientId, keyword, competitorDomain, searchIntent, targetAudience, recommendedTitle, recommendedWordCount, headingsJson, internalLinksJson, writingBrief, callToAction, seoTipsJson)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.crmClientId,
          input.keyword,
          input.competitorDomain ?? null,
          brief.searchIntent ?? null,
          brief.targetAudience ?? null,
          brief.recommendedTitle ?? null,
          brief.recommendedWordCount ?? null,
          JSON.stringify(brief.headings ?? []),
          JSON.stringify(brief.internalLinks ?? []),
          brief.writingBrief ?? null,
          brief.callToAction ?? null,
          JSON.stringify(brief.seoTips ?? []),
        ]
      ) as any;
      await conn.end();

      return {
        id: (result as any).insertId,
        keyword: input.keyword,
        competitorDomain: input.competitorDomain,
        searchIntent: brief.searchIntent,
        targetAudience: brief.targetAudience,
        recommendedTitle: brief.recommendedTitle,
        recommendedWordCount: brief.recommendedWordCount,
        headings: brief.headings ?? [],
        internalLinks: brief.internalLinks ?? [],
        writingBrief: brief.writingBrief,
        callToAction: brief.callToAction,
        seoTips: brief.seoTips ?? [],
      };
    }),

  getContentBriefs: protectedProcedure
    .input(z.object({ crmClientId: z.number() }))
    .query(async ({ input }) => {
      const mysql = await import('mysql2/promise');
      const conn = await mysql.default.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        'SELECT * FROM gapKeywordBriefs WHERE crmClientId = ? ORDER BY createdAt DESC LIMIT 50',
        [input.crmClientId]
      ) as any;
      await conn.end();
      return (rows as any[]).map((r: any) => ({
        id: r.id,
        keyword: r.keyword,
        competitorDomain: r.competitorDomain,
        searchIntent: r.searchIntent,
        targetAudience: r.targetAudience,
        recommendedTitle: r.recommendedTitle,
        recommendedWordCount: r.recommendedWordCount,
        headings: r.headingsJson ? JSON.parse(r.headingsJson) : [],
        internalLinks: r.internalLinksJson ? JSON.parse(r.internalLinksJson) : [],
        writingBrief: r.writingBrief,
        callToAction: r.callToAction,
        seoTips: r.seoTipsJson ? JSON.parse(r.seoTipsJson) : [],
        createdAt: r.createdAt,
      }));
    }),

  // ─── AI Content Hub ────────────────────────────────────────────────────────

  listHeyGenAvatars: protectedProcedure.query(async () => {
    const { listAvatars } = await import("../heygen");
    return listAvatars();
  }),

  listHeyGenVoices: protectedProcedure
    .input(z.object({ language: z.string().optional() }))
    .query(async ({ input }) => {
      const { listVoices } = await import("../heygen");
      return listVoices(input.language);
    }),

  getHeyGenQuota: protectedProcedure.query(async () => {
    const { getRemainingQuota } = await import("../heygen");
    return getRemainingQuota();
  }),

  generateContentPackage: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      crmClientId: z.number(),
      savedKeywordId: z.number().optional(),
      keyword: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const { contentPackages, seoClients } = await import("../../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");

      // One-at-a-time enforcement
      const active = await db
        .select({ id: contentPackages.id, status: contentPackages.status })
        .from(contentPackages)
        .where(eq(contentPackages.clientId, input.clientId));
      const blocked = active.find((p: any) => p.status === "generating" || p.status === "pending_approval");
      if (blocked) {
        throw new TRPCError({
          code: "CONFLICT",
          message: blocked.status === "generating"
            ? "A content package is currently generating. Wait for it to complete before starting another."
            : "A content package is awaiting your approval. Approve or reject it before generating a new one.",
        });
      }

      // Get client details
      const [client] = await db.select().from(seoClients).where(eq(seoClients.id, input.clientId));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "SEO client not found" });
      if (!client.contentHubEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "Content Hub is not enabled for this client" });
      if (!client.heygenAvatarId || !client.heygenVoiceId) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure HeyGen avatar and voice in the Content Hub setup tab first" });
      }

      const brandContext = [
        client.brandVoice ? `Brand voice: ${client.brandVoice}` : "",
        client.targetAudience ? `Target audience: ${client.targetAudience}` : "",
        client.primaryServices ? `Services: ${client.primaryServices}` : "",
        client.uniqueSellingProp ? `USP: ${client.uniqueSellingProp}` : "",
        client.serviceAreas ? `Service areas: ${client.serviceAreas}` : "",
      ].filter(Boolean).join("\n");

      // Create package record
      const [insertResult] = await db.insert(contentPackages).values({
        clientId: input.clientId,
        crmClientId: input.crmClientId,
        savedKeywordId: input.savedKeywordId ?? null,
        keyword: input.keyword,
        status: "generating",
        heygenVideoStatus: "not_started",
      });
      const packageId = (insertResult as any).insertId as number;

      // Step 1: Blog post
      let blogTitle = "";
      let blogExcerpt = "";
      let blogContentId: number | null = null;
      try {
        const blogResponse = await invokeLLM({
          messages: [
            { role: "system", content: `You are an expert SEO content writer. ${brandContext}\nReturn JSON only.` },
            { role: "user", content: `Write a comprehensive 800-1200 word SEO blog post targeting: "${input.keyword}". Include H1 title, intro, 4-6 H2 sections, and conclusion with CTA.` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "blog_post",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  excerpt: { type: "string" },
                },
                required: ["title", "content", "excerpt"],
                additionalProperties: false,
              },
            },
          },
        });
        const blogData = JSON.parse(blogResponse.choices[0].message.content as string);
        blogTitle = blogData.title;
        blogExcerpt = blogData.excerpt;
        const { content: contentTable } = await import("../../drizzle/seo-schema");
        const [blogInsert] = await db.insert(contentTable).values({
          clientId: input.clientId,
          createdBy: 1,
          title: blogTitle,
          topic: input.keyword,
          content: blogData.content,
          contentType: "blog-post",
          status: "draft",
          wordCount: blogData.content.split(/\s+/).length,
          progress: 100,
          aiModel: "gpt-4o",
        });
        blogContentId = (blogInsert as any).insertId as number;
      } catch (e) { console.error("[ContentHub] Blog failed:", e); }

      // Step 2: 60s video script
      let videoScript = "";
      try {
        const scriptResponse = await invokeLLM({
          messages: [
            { role: "system", content: `You are a short-form video script writer (max 60 seconds = ~150 words). ${brandContext}` },
            { role: "user", content: `Write a 60-second video script (max 150 words) about "${input.keyword}". Hook in first 3 seconds, 2-3 value points, clear CTA. Spoken words only — no stage directions.` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "video_script",
              strict: true,
              schema: { type: "object", properties: { script: { type: "string" } }, required: ["script"], additionalProperties: false },
            },
          },
        });
        videoScript = JSON.parse(scriptResponse.choices[0].message.content as string).script;
      } catch (e) { console.error("[ContentHub] Script failed:", e); }

      // Step 3: Social captions
      let socialCaptionsJson = "[]";
      try {
        const socialResponse = await invokeLLM({
          messages: [
            { role: "system", content: `You are a social media copywriter. ${brandContext}` },
            { role: "user", content: `Write platform-specific captions for "${input.keyword}" for Facebook, Instagram, LinkedIn. Include relevant hashtags.` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "social_captions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  captions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { platform: { type: "string" }, caption: { type: "string" } },
                      required: ["platform", "caption"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["captions"],
                additionalProperties: false,
              },
            },
          },
        });
        socialCaptionsJson = JSON.stringify(JSON.parse(socialResponse.choices[0].message.content as string).captions);
      } catch (e) { console.error("[ContentHub] Social failed:", e); }

      // Step 4: Email newsletter
      let emailSubject = "";
      let emailBody = "";
      try {
        const emailResponse = await invokeLLM({
          messages: [
            { role: "system", content: `You are an email marketing specialist. ${brandContext}` },
            { role: "user", content: `Write a newsletter email about "${input.keyword}". Compelling subject line, 2-3 paragraph body, clear CTA.` },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "email_newsletter",
              strict: true,
              schema: {
                type: "object",
                properties: { subject: { type: "string" }, body: { type: "string" } },
                required: ["subject", "body"],
                additionalProperties: false,
              },
            },
          },
        });
        const emailData = JSON.parse(emailResponse.choices[0].message.content as string);
        emailSubject = emailData.subject;
        emailBody = emailData.body;
      } catch (e) { console.error("[ContentHub] Email failed:", e); }

      // Step 5: Submit HeyGen video
      let heygenVideoId: string | null = null;
      let heygenVideoStatus: "not_started" | "processing" | "completed" | "failed" = "not_started";
      if (videoScript) {
        try {
          const { createVideo } = await import("../heygen");
          heygenVideoId = await createVideo({
            avatarId: client.heygenAvatarId!,
            voiceId: client.heygenVoiceId!,
            script: videoScript,
            format: (client.heygenVideoFormat as "portrait" | "landscape" | "square") ?? "portrait",
            title: `${input.keyword} — ${client.name}`,
          });
          heygenVideoStatus = "processing";
        } catch (e) {
          console.error("[ContentHub] HeyGen submission failed:", e);
          heygenVideoStatus = "failed";
        }
      }

      // Update package with all generated content
      const finalStatus = (heygenVideoStatus === "processing" || heygenVideoStatus === "not_started") ? "generating" : "failed";
      await db.update(contentPackages)
        .set({
          status: finalStatus,
          blogContentId: blogContentId ?? undefined,
          blogTitle: blogTitle || undefined,
          blogExcerpt: blogExcerpt || undefined,
          videoScript: videoScript || undefined,
          heygenVideoId: heygenVideoId ?? undefined,
          heygenVideoStatus,
          socialCaptionsJson,
          emailSubject: emailSubject || undefined,
          emailBody: emailBody || undefined,
          errorMessage: heygenVideoStatus === "failed" ? "HeyGen video submission failed — check avatar/voice IDs" : undefined,
        })
        .where(eq(contentPackages.id, packageId));

      return {
        packageId,
        heygenVideoId,
        heygenVideoStatus,
        blogTitle,
        message: heygenVideoStatus === "processing"
          ? "Content generated! HeyGen video is rendering — you will be notified when ready for approval."
          : "Content generated. Video script created but HeyGen submission failed — check avatar/voice configuration.",
      };
    }),

  getContentPackages: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) return [];
      const { contentPackages } = await import("../../drizzle/seo-schema");
      const { eq, desc } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(contentPackages)
        .where(eq(contentPackages.clientId, input.clientId))
        .orderBy(desc(contentPackages.createdAt));
      return rows.map((p: any) => ({
        ...p,
        socialCaptions: p.socialCaptionsJson ? JSON.parse(p.socialCaptionsJson) : [],
      }));
    }),

  approveContentPackage: protectedProcedure
    .input(z.object({ packageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { contentPackages, content: contentTable, seoUsers } = await import("../../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");
      const [pkg] = await db.select().from(contentPackages).where(eq(contentPackages.id, input.packageId));
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "Content package not found" });
      if (pkg.status !== "pending_approval" && pkg.status !== "pending_review") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Package is in '${pkg.status}' status, not pending_approval or pending_review` });
      }
      // Mark package as approved
      await db.update(contentPackages)
        .set({ status: "approved", approvedAt: new Date() })
        .where(eq(contentPackages.id, input.packageId));

      // Auto-create a content record from the blog post so it appears in the publishing pipeline
      let contentId: number | null = null;
      if (pkg.blogExcerpt && pkg.clientId) {
        try {
          const [seoUser] = await db.select().from(seoUsers).where(eq(seoUsers.openId, ctx.user.openId)).limit(1);
          const createdById = seoUser?.id ?? 1;
          const title = pkg.keyword.charAt(0).toUpperCase() + pkg.keyword.slice(1);
          const [inserted] = await db.insert(contentTable).values({
            clientId: pkg.clientId,
            createdBy: createdById,
            title,
            topic: pkg.keyword,
            content: pkg.blogExcerpt,
            contentType: "blog-post" as const,
            status: "approved" as const,
            wasApproved: 1,
            approvedAt: new Date(),
            wordCount: (pkg.blogExcerpt ?? '').split(/\s+/).length,
            progress: 100,
            aiModel: "gpt-4o",
            enableWebResearch: false,
            shouldGenerateImage: false,
          });
          contentId = (inserted as any).insertId ?? null;
        } catch (e) {
          console.error("[ContentHub] Failed to create content record from approved package:", e);
        }
      }

      const { notifyOwner } = await import("../_core/notification");
      await notifyOwner({
        title: "Content Package Approved — Ready to Publish",
        content: `Package for "${pkg.keyword}" approved. Blog post queued in publishing pipeline${contentId ? ` (content #${contentId})` : ''}. Video: ${pkg.heygenVideoUrl ?? 'rendering'}.`,
      });
      return { success: true, packageId: input.packageId, contentId };
    }),

  rejectContentPackage: protectedProcedure
    .input(z.object({ packageId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { contentPackages } = await import("../../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");
      await db.update(contentPackages)
        .set({ status: "rejected", errorMessage: input.reason ?? "Rejected by reviewer" })
        .where(eq(contentPackages.id, input.packageId));
      return { success: true };
    }),

  // ─── Content Studio: Viral Topics ──────────────────────────────────────────

  getViralTopics: protectedProcedure
    .input(z.object({ seoClientId: z.number(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) return [];
      const { viralTopics } = await import("../../drizzle/seo-schema");
      const { eq, and, desc } = await import("drizzle-orm");
      const conditions = [eq(viralTopics.seoClientId, input.seoClientId)];
      if (input.status) conditions.push(eq(viralTopics.status, input.status as any));
      const rows = await db.select().from(viralTopics)
        .where(and(...conditions))
        .orderBy(desc(viralTopics.createdAt))
        .limit(50);
      return rows.map((r: any) => ({
        ...r,
        keyPoints: r.keyPoints ? JSON.parse(r.keyPoints) : [],
        competitorUrls: r.competitorUrls ? JSON.parse(r.competitorUrls) : [],
      }));
    }),

  researchViralTopics: protectedProcedure
    .input(z.object({ seoClientId: z.number(), topicsPerWeek: z.number().min(1).max(20).default(5) }))
    .mutation(async ({ input }) => {
      const { researchViralTopics } = await import("../agents/viral-topic-agent");
      const topics = await researchViralTopics(input.seoClientId, input.topicsPerWeek);
      return { success: true, count: topics.length, topics };
    }),

  generatePackagesFromTopics: protectedProcedure
    .input(z.object({ seoClientId: z.number(), topicIds: z.array(z.number()).optional() }))
    .mutation(async ({ input }) => {
      const { generatePackagesFromTopics } = await import("../agents/viral-topic-agent");
      const packageIds = await generatePackagesFromTopics(input.seoClientId, input.topicIds);
      return { success: true, packageIds };
    }),

  generateSingleTopic: protectedProcedure
    .input(z.object({ seoClientId: z.number(), topicId: z.number() }))
    .mutation(async ({ input }) => {
      const { generatePackagesFromTopics } = await import("../agents/viral-topic-agent");
      const packageIds = await generatePackagesFromTopics(input.seoClientId, [input.topicId]);
      return { success: true, packageIds };
    }),

  // ─── Content Studio: Social Posts ──────────────────────────────────────────

  getSocialPosts: protectedProcedure
    .input(z.object({ seoClientId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) return [];
      const { socialPosts } = await import("../../drizzle/seo-schema");
      const { eq, desc } = await import("drizzle-orm");
      return db.select().from(socialPosts)
        .where(eq(socialPosts.seoClientId, input.seoClientId))
        .orderBy(desc(socialPosts.createdAt))
        .limit(100);
    }),

  manualPost: protectedProcedure
    .input(z.object({
      seoClientId: z.number(),
      platform: z.enum(["facebook", "instagram", "tiktok", "youtube"]),
      videoUrl: z.string().url(),
      caption: z.string(),
      contentPackageId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { manualPost } = await import("../agents/social-posting-agent");
      return manualPost(input);
    }),

  generateCaption: protectedProcedure
    .input(z.object({
      seoClientId: z.number(),
      platform: z.enum(["facebook", "instagram", "tiktok", "youtube"]),
      topic: z.string(),
      videoContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { seoClients } = await import("../../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");
      const [client] = await db.select().from(seoClients).where(eq(seoClients.id, input.seoClientId));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });

      const platformGuide: Record<string, string> = {
        facebook: "Conversational, community-focused, 2-3 sentences + CTA. Include 3-5 relevant hashtags.",
        instagram: "Engaging, hook first, emojis welcome, 150-200 chars + 10-15 hashtags.",
        tiktok: "Hook in first line, trending language, 3-5 hashtags including #fyp #foryoupage.",
        youtube: "SEO-optimized description, 200-300 words, include keywords naturally, CTA to subscribe + book consultation.",
      };

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a social media copywriter for ${client.businessName}. Brand voice: ${client.brandVoice ?? "professional and educational"}. Target audience: ${client.targetAudience ?? "homebuyers and financial literacy seekers"}.`,
          },
          {
            role: "user",
            content: `Write a ${input.platform} caption for this video about: "${input.topic}".
${input.videoContext ? `Video context: ${input.videoContext}` : ""}
Platform guidelines: ${platformGuide[input.platform]}
Include a CTA to book a free consultation at premiermortgageresources.com`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "caption",
            strict: true,
            schema: {
              type: "object",
              properties: { caption: { type: "string" } },
              required: ["caption"],
              additionalProperties: false,
            },
          },
        },
      });

      const { caption } = JSON.parse(response.choices[0].message.content as string);
      return { caption };
    }),

  // ─── Content Studio: Brands ─────────────────────────────────────────────────

  getTimBrands: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    if (!db) return [];
    const { seoClients } = await import("../../drizzle/seo-schema");
    const { inArray } = await import("drizzle-orm");
    return db.select().from(seoClients).where(inArray(seoClients.id, [30001, 30002]));
  }),

  // ─── Posting Schedules ───────────────────────────────────────────────────────

  getPostingSchedules: protectedProcedure
    .input(z.object({ seoClientId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) return [];
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        "SELECT * FROM brand_posting_schedules WHERE seo_client_id = ? ORDER BY platform",
        [input.seoClientId]
      ) as [any[], any];
      await conn.end();
      return rows.map((r: any) => ({
        id: r.id,
        seoClientId: r.seo_client_id,
        platform: r.platform as string,
        enabled: Boolean(r.enabled),
        daysOfWeek: typeof r.days_of_week === "string" ? JSON.parse(r.days_of_week) : r.days_of_week as number[],
        postTimes: typeof r.post_times === "string" ? JSON.parse(r.post_times) : r.post_times as string[],
        maxPostsPerDay: r.max_posts_per_day as number,
        minHoursBetweenPosts: r.min_hours_between_posts as number,
        timezone: r.timezone as string,
        notes: r.notes as string | null,
      }));
    }),

  savePostingSchedule: protectedProcedure
    .input(z.object({
      seoClientId: z.number(),
      platform: z.enum(["facebook", "instagram", "tiktok", "youtube", "youtube_shorts"]),
      enabled: z.boolean().default(true),
      daysOfWeek: z.array(z.number().min(0).max(6)),
      postTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)),
      maxPostsPerDay: z.number().min(1).max(5).default(1),
      minHoursBetweenPosts: z.number().min(1).max(24).default(4),
      timezone: z.string().default("America/Los_Angeles"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection(process.env.DATABASE_URL!);
      await conn.execute(
        `INSERT INTO brand_posting_schedules
          (seo_client_id, platform, enabled, days_of_week, post_times, max_posts_per_day, min_hours_between_posts, timezone, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          enabled = VALUES(enabled),
          days_of_week = VALUES(days_of_week),
          post_times = VALUES(post_times),
          max_posts_per_day = VALUES(max_posts_per_day),
          min_hours_between_posts = VALUES(min_hours_between_posts),
          timezone = VALUES(timezone),
          notes = VALUES(notes)`,
        [
          input.seoClientId,
          input.platform,
          input.enabled ? 1 : 0,
          JSON.stringify(input.daysOfWeek),
          JSON.stringify(input.postTimes),
          input.maxPostsPerDay,
          input.minHoursBetweenPosts,
          input.timezone,
          input.notes ?? null,
        ]
      );
      await conn.end();
      return { success: true };
    }),

  /**
   * Get next available posting slot for a brand/platform based on schedule
   * Used by social posting agent to assign scheduled_at dates
   */
  getNextPostingSlot: protectedProcedure
    .input(z.object({
      seoClientId: z.number(),
      platform: z.enum(["facebook", "instagram", "tiktok", "youtube", "youtube_shorts"]),
      afterDate: z.number().optional(), // UTC timestamp, defaults to now
    }))
    .query(async ({ input }) => {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection(process.env.DATABASE_URL!);

      // Get schedule for this brand/platform
      const [schedRows] = await conn.execute(
        "SELECT * FROM brand_posting_schedules WHERE seo_client_id = ? AND platform = ? AND enabled = 1",
        [input.seoClientId, input.platform]
      ) as [any[], any];

      if (!schedRows.length) {
        await conn.end();
        return { slot: null, reason: "No schedule configured for this platform" };
      }

      const sched = schedRows[0];
      const daysOfWeek: number[] = typeof sched.days_of_week === "string" ? JSON.parse(sched.days_of_week) : sched.days_of_week;
      const postTimes: string[] = typeof sched.post_times === "string" ? JSON.parse(sched.post_times) : sched.post_times;
      const maxPerDay: number = sched.max_posts_per_day;
      const timezone: string = sched.timezone || "America/Los_Angeles";

      // Get already-scheduled posts for this brand/platform in the next 30 days
      const afterMs = input.afterDate ?? Date.now();
      const [existingPosts] = await conn.execute(
        `SELECT scheduled_at FROM social_posts
         WHERE seo_client_id = ? AND platform = ? AND scheduled_at > ?
         ORDER BY scheduled_at ASC`,
        [input.seoClientId, input.platform, afterMs]
      ) as [any[], any];
      await conn.end();

      const scheduledDates = new Set(
        existingPosts.map((p: any) => {
          const d = new Date(p.scheduled_at);
          return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        })
      );

      // Find next available slot
      const now = new Date(afterMs);
      for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
        const candidate = new Date(now.getTime() + dayOffset * 86400000);
        const dayOfWeek = candidate.getUTCDay();

        if (!daysOfWeek.includes(dayOfWeek)) continue;

        const dateKey = `${candidate.getUTCFullYear()}-${candidate.getUTCMonth()}-${candidate.getUTCDate()}`;
        const postsOnDay = existingPosts.filter((p: any) => {
          const d = new Date(p.scheduled_at);
          return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}` === dateKey;
        }).length;

        if (postsOnDay >= maxPerDay) continue;

        // Pick the first available time slot
        for (const timeStr of postTimes) {
          const [hh, mm] = timeStr.split(":").map(Number);
          const slotDate = new Date(candidate);
          slotDate.setUTCHours(hh + 8, mm, 0, 0); // PST offset approx (UTC-8)
          if (slotDate.getTime() > afterMs) {
            return {
              slot: slotDate.getTime(),
              slotFormatted: slotDate.toISOString(),
              platform: input.platform,
              dayOfWeek,
              timeStr,
            };
          }
        }
      }

      return { slot: null, reason: "No available slots in the next 60 days" };
    }),

  // ─── HeyGen Browser Automation Agent ─────────────────────────────────────────
  triggerBrowserGenerate: protectedProcedure
    .input(z.object({ packageId: z.number() }))
    .mutation(async ({ input }) => {
      // Check concurrency lock — only 1 video at a time
      const { isAgentBusy } = await import("../agents/heygen-browser-agent");
      const lockStatus = isAgentBusy();
      if (lockStatus.busy) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `The HeyGen agent is already generating a video for "${lockStatus.currentJob.topic}" (package #${lockStatus.currentJob.contentPackageId}). ` +
            `Started ${Math.round((lockStatus.currentJob.elapsedMs ?? 0) / 60000)} min ago. Please wait for it to finish.`,
        });
      }
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { contentPackages, seoClients } = await import("../../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");
      const [pkg] = await db.select().from(contentPackages).where(eq(contentPackages.id, input.packageId));
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "Package not found" });
      if (!pkg.videoScript) throw new TRPCError({ code: "BAD_REQUEST", message: "Package has no video script" });
      const [client] = await db.select().from(seoClients).where(eq(seoClients.id, pkg.clientId));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "SEO client not found" });

      // Build prompt
      const { buildVideoAgentPrompt } = await import("../heygen");
      const isLongForm = pkg.videoScript.length > 2000;
      const agentPrompt = buildVideoAgentPrompt({
        script: pkg.videoScript,
        topic: pkg.keyword,
        brandName: client.businessName ?? 'Our Agency',
        targetAudience: client.targetAudience ?? "homebuyers and mortgage seekers",
        brandVoice: client.brandVoice ?? "professional, trustworthy, and approachable",
        platform: isLongForm ? "YouTube" : "TikTok/Instagram Reels",
        hook: `Did you know about ${pkg.keyword}?`,
        cta: isLongForm
          ? "Subscribe for more financial tips and drop your questions in the comments"
          : "Follow for daily tips and DM me the word HOME to get started",
        isLongForm,
        nmlsNumber: (client.businessName?.includes("Loan") || client.businessName?.includes("Mortgage")) ? "1116876" : undefined,
      });

      const brandSystemName = (client as any).heygenBrandSystemName ?? client.businessName ?? 'Agency';

      // Check for valid HeyGen session before starting
      const { hasValidSession } = await import("../agents/heygen-browser-agent");
      const hasSession = await hasValidSession(pkg.clientId);
      if (!hasSession) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No HeyGen session found. Please click 'Connect HeyGen' in Content Studio to authenticate first." });
      }

      // Mark as generating
      await db.update(contentPackages).set({
        status: "generating",
        heygenVideoStatus: "processing",
      }).where(eq(contentPackages.id, input.packageId));

      // Fire-and-forget browser automation
      setImmediate(async () => {
        try {
          const { generateVideoViaBrowser } = await import("../agents/heygen-browser-agent");
          const result = await generateVideoViaBrowser({
            prompt: agentPrompt,
            brandSystemName,
            contentPackageId: input.packageId,
            topic: pkg.keyword,
            seoClientId: pkg.clientId,
          });
          const db2 = await getDb();
          if (!db2) return;
          const { contentPackages: cp2 } = await import("../../drizzle/seo-schema");
          const { eq: eq2 } = await import("drizzle-orm");
          if (result.success && result.cdnUrl) {
            await db2.update(cp2).set({
              status: "pending_review",
              heygenVideoUrl: result.cdnUrl,
              heygenVideoStatus: "completed",
            }).where(eq2(cp2.id, input.packageId));
          } else {
            await db2.update(cp2).set({
              status: "failed",
              heygenVideoStatus: "failed",
              errorMessage: result.error ?? "Browser automation failed",
            }).where(eq2(cp2.id, input.packageId));
          }
        } catch (err: any) {
          const db3 = await getDb();
          if (db3) {
            const { contentPackages: cp3 } = await import("../../drizzle/seo-schema");
            const { eq: eq3 } = await import("drizzle-orm");
            await db3.update(cp3).set({ status: "failed", heygenVideoStatus: "failed", errorMessage: err.message })
              .where(eq3(cp3.id, input.packageId)).catch(() => {});
          }
        }
      });

      return { success: true, message: `Browser agent launched for "${pkg.keyword}" (Brand: ${brandSystemName}). Video will be ready in 5-20 minutes.` };
    }),

  retryBrowserGenerate: protectedProcedure
    .input(z.object({ packageId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { contentPackages } = await import("../../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");
      // Reset status to allow re-trigger
      await db.update(contentPackages).set({
        status: "generating",
        heygenVideoStatus: "not_started",
        errorMessage: null,
      }).where(eq(contentPackages.id, input.packageId));
      // Re-use triggerBrowserGenerate logic by calling the same flow
      // (caller should call triggerBrowserGenerate after this)
      return { success: true, message: "Package reset. Call triggerBrowserGenerate to retry." };
    }),

  testHeyGenConnection: protectedProcedure
    .input(z.object({ seoClientId: z.number() }))
    .mutation(async ({ input }) => {
      const { testHeyGenConnection } = await import("../agents/heygen-browser-agent");
      return testHeyGenConnection(input.seoClientId);
    }),
  saveHeyGenSession: protectedProcedure
    .input(z.object({
      seoClientId: z.number(),
      token: z.string(),
      cookies: z.string().optional(),
      tokenType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { saveSession } = await import("../agents/heygen-browser-agent");
      await saveSession({
        seoClientId: input.seoClientId,
        token: input.token,
        cookies: input.cookies,
        tokenType: input.tokenType || "cookie",
        capturedBy: ctx.user.id,
      });
      return { success: true, message: "HeyGen session saved successfully" };
    }),
  getHeyGenSessionStatus: protectedProcedure
    .input(z.object({ seoClientId: z.number() }))
    .query(async ({ input }) => {
      const { getStoredSession } = await import("../agents/heygen-browser-agent");
      const session = await getStoredSession(input.seoClientId);
      return { connected: !!session };
    }),
  getAgentStatus: protectedProcedure
    .query(async () => {
      const { isAgentBusy } = await import("../agents/heygen-browser-agent");
      return isAgentBusy();
    }),
  // ─── Content Calendar View ──────────────────────────────────────────────
  getContentCalendar: protectedProcedure
    .input(z.object({
      seoClientId: z.number(),
      fromMs: z.number(),
      toMs: z.number(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) return { scheduledPosts: [], packages: [], topics: [] };
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection(process.env.DATABASE_URL!);

      // Get scheduled/posted social posts in range
      const [posts] = await conn.execute(
        `SELECT sp.*, cp.keyword, cp.videoScript, sc.businessName
         FROM social_posts sp
         LEFT JOIN contentPackages cp ON sp.content_package_id = cp.id
         LEFT JOIN seo_clients sc ON sp.seo_client_id = sc.id
         WHERE sp.seo_client_id = ? AND (
           (sp.scheduled_at BETWEEN ? AND ?) OR
           (sp.posted_at BETWEEN ? AND ?)
         )
         ORDER BY COALESCE(sp.scheduled_at, sp.posted_at) ASC`,
        [input.seoClientId, new Date(input.fromMs), new Date(input.toMs), new Date(input.fromMs), new Date(input.toMs)]
      ) as [any[], any];

      // Get content packages created in range
      const [pkgs] = await conn.execute(
        `SELECT id, keyword, status, heygenVideoStatus, heygenVideoUrl, createdAt, approvedAt, publishedAt
         FROM contentPackages
         WHERE clientId = ? AND createdAt BETWEEN ? AND ?
         ORDER BY createdAt ASC`,
        [input.seoClientId, new Date(input.fromMs), new Date(input.toMs)]
      ) as [any[], any];

      // Get viral topics for the week range
      const [topics] = await conn.execute(
        `SELECT id, topic, content_type, platform, viral_score, hook, status, created_at
         FROM viral_topics
         WHERE seo_client_id = ? AND created_at BETWEEN ? AND ?
         ORDER BY viral_score DESC`,
        [input.seoClientId, new Date(input.fromMs), new Date(input.toMs)]
      ) as [any[], any];

      await conn.end();

      return {
        scheduledPosts: posts.map((p: any) => ({
          id: p.id,
          platform: p.platform,
          caption: p.caption,
          videoUrl: p.video_url,
          status: p.status,
          scheduledAt: p.scheduled_at ? new Date(p.scheduled_at).getTime() : null,
          postedAt: p.posted_at ? new Date(p.posted_at).getTime() : null,
          keyword: p.keyword,
          businessName: p.businessName,
        })),
        packages: pkgs.map((p: any) => ({
          id: p.id,
          keyword: p.keyword,
          status: p.status,
          heygenVideoStatus: p.heygenVideoStatus,
          heygenVideoUrl: p.heygenVideoUrl,
          createdAt: new Date(p.createdAt).getTime(),
          approvedAt: p.approvedAt ? new Date(p.approvedAt).getTime() : null,
          publishedAt: p.publishedAt ? new Date(p.publishedAt).getTime() : null,
        })),
        topics: topics.map((t: any) => ({
          id: t.id,
          topic: t.topic,
          contentType: t.content_type,
          platform: t.platform,
          viralScore: t.viral_score,
          hook: t.hook,
          status: t.status,
          createdAt: new Date(t.created_at).getTime(),
        })),
      };
    }),

  // ─── Brand System Name Management ──────────────────────────────────────
  updateBrandSystemName: protectedProcedure
    .input(z.object({ seoClientId: z.number(), brandSystemName: z.string() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection(process.env.DATABASE_URL!);
      await conn.execute(
        "UPDATE seo_clients SET heygenBrandSystemName = ? WHERE id = ?",
        [input.brandSystemName, input.seoClientId]
      );
      await conn.end();
      return { success: true };
    }),

  getBrandSystemName: protectedProcedure
    .input(z.object({ seoClientId: z.number() }))
    .query(async ({ input }) => {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection(process.env.DATABASE_URL!);
      const [rows] = await conn.execute(
        "SELECT heygenBrandSystemName FROM seo_clients WHERE id = ?",
        [input.seoClientId]
      ) as [any[], any];
      await conn.end();
      return { brandSystemName: rows[0]?.heygenBrandSystemName ?? null };
    }),

  // ─── Content Package Queue Management ──────────────────────────────────
  /**
   * Cancel/remove a single content package that is generating or failed.
   * Sets status to 'rejected' so it disappears from the active queue.
   */
  cancelContentPackage: protectedProcedure
    .input(z.object({ packageId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { contentPackages } = await import("../../drizzle/seo-schema");
      const { eq, inArray } = await import("drizzle-orm");
      const [pkg] = await db.select().from(contentPackages).where(eq(contentPackages.id, input.packageId));
      if (!pkg) throw new TRPCError({ code: "NOT_FOUND", message: "Content package not found" });
      await db.update(contentPackages)
        .set({ status: "rejected", errorMessage: "Cancelled by user" })
        .where(eq(contentPackages.id, input.packageId));
      return { success: true, packageId: input.packageId };
    }),

  /**
   * Cancel all generating + failed packages for a given seo client in one shot.
   */
  cancelAllFailedPackages: protectedProcedure
    .input(z.object({ seoClientId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { contentPackages } = await import("../../drizzle/seo-schema");
      const { eq, inArray } = await import("drizzle-orm");
      const targets = await db.select({ id: contentPackages.id })
        .from(contentPackages)
        .where(
          // @ts-ignore drizzle inArray
          inArray(contentPackages.status, ["failed", "generating"])
        );
      const ids = targets
        .map((r: any) => r.id)
        .filter(Boolean);
      if (ids.length === 0) return { cancelled: 0 };
      // Filter to only this client's packages
      const clientPkgs = await db.select({ id: contentPackages.id })
        .from(contentPackages)
        .where(eq(contentPackages.clientId, input.seoClientId));
      const clientIds = new Set(clientPkgs.map((r: any) => r.id));
      const toCancel = ids.filter((id: number) => clientIds.has(id));
      if (toCancel.length === 0) return { cancelled: 0 };
      await db.update(contentPackages)
        .set({ status: "rejected", errorMessage: "Cancelled by user" })
        .where(inArray(contentPackages.id, toCancel));
      return { cancelled: toCancel.length };
    }),
});
