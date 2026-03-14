// SEO Router - integrated into Agency CRM


import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { 
  getDb,
  getClientsByUser, 
  createClient, 
  updateClient, 
  deleteClient,
  getClientById,
  getContentWithClient,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  getContentByClient
} from "./seo-db";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { bulkRouter } from "./routers/seo/bulk";
import { templatesRouter } from "./routers/seo/templates";
import { collaborationRouter } from "./routers/seo/collaboration";
import { analyticsRouter } from "./routers/seo/analytics";
import { repurposingRouter } from "./routers/seo/repurposing";
import { qualityScoreRouter } from "./routers/seo/qualityScore";
import { webhooksRouter } from "./routers/seo/webhooks";
import { briefsRouter } from "./routers/seo/briefs";
import { notificationsRouter } from "./routers/seo/notifications";
import { seoAuditRouter } from "./routers/seo/seoAudit";
import { agencySettingsRouter } from "./routers/seo/agencySettings";
import { recurringPlansRouter } from "./routers/seo/recurringPlans";
import { googleAnalyticsRouter } from "./routers/seo/googleAnalytics";
import { wordpressRouter } from "./routers/seo/wordpress";
import { manusWebsitesRouter } from "./routers/seo/manusWebsites";
import { designStandardsRouter } from "./routers/seo/designStandards";
import { bulkPublishingRouter } from "./routers/seo/bulkPublishing";
import { publishingAnalyticsRouter } from "./routers/seo/publishingAnalytics";
import { publishingSchedulerRouter } from "./routers/seo/publishingScheduler";
import { searchConsoleRouter } from "./routers/seo/searchConsole";
import { clientPublishingPermissionsRouter } from "./routers/seo/clientPublishingPermissions";
import { appNotificationsRouter } from "./routers/seo/appNotifications";
import { aiClientSuggestionsRouter } from "./routers/seo/aiClientSuggestions";
import { pipelineRouter } from "./routers/seo/pipeline";
import { googleBusinessProfileRouter } from "./routers/seo/googleBusinessProfile";
import { keywordGapRouter } from "./routers/seo/keywordGap";

export const seoRouter = router({

  // Client management
  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getClientsByUser(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getClientById(input.id);
      }),
    getByCrmId: protectedProcedure
      .input(z.object({ crmClientId: z.number() }))
      .query(async ({ input }) => {
        const { getSeoClientByCrmId } = await import("./seo-db");
        return getSeoClientByCrmId(input.crmClientId);
      }),
    // Auto-provision an SEO client record for the current portal user.
    // Creates one linked to their CRM client if it doesn't exist yet.
    ensureForCurrentUser: protectedProcedure.mutation(async ({ ctx }) => {
      const { getClientByUserId, getClientByEmail } = await import("./db");
      const { ensureLinkedSeoClient, getFirstAdminSeoUser, getSeoClientByCrmId } = await import("./seo-db");
      console.log(`[ensureForCurrentUser] userId=${ctx.user.id} email=${ctx.user.email} role=${ctx.user.role}`);
      // Try by userId first, then fall back to email match (portal users may not have userId set on client record)
      let crmClient = await getClientByUserId(ctx.user.id);
      console.log(`[ensureForCurrentUser] byUserId result:`, crmClient ? `found id=${crmClient.id}` : 'not found');
      if (!crmClient && ctx.user.email) {
        crmClient = await getClientByEmail(ctx.user.email) ?? null;
        console.log(`[ensureForCurrentUser] byEmail result:`, crmClient ? `found id=${crmClient.id}` : 'not found');
      }
      if (!crmClient) {
        console.log(`[ensureForCurrentUser] No CRM client found for user ${ctx.user.id} — checking if they have an SEO user record`);
        // For admin/agency users who have an SEO user record but no CRM client,
        // create a self-SEO-client so they can generate content for themselves
        const { getDb } = await import("./seo-db");
        const { seoUsers, seoClients } = await import("../drizzle/seo-schema");
        const { eq, isNull } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return { seoClientId: null, created: false };
        // Find SEO user by email using only columns that exist in the actual DB table
        // (avoid schema mismatch — seoUsers schema has loginMethod/lastSignedIn that may not be migrated)
        let seoUser: { id: number; name: string; email: string; role: string } | undefined;
        if (ctx.user.email) {
          try {
            const rawClient = (db as any).$client.promise();
            const [rows] = await rawClient.query(
              'SELECT id, name, email, role FROM seo_users WHERE email = ? LIMIT 1',
              [ctx.user.email]
            );
            seoUser = Array.isArray(rows) ? rows[0] : undefined;
          } catch (e) {
            console.error('[ensureForCurrentUser] seo_users email lookup failed:', e);
          }
        }
        if (!seoUser) {
          console.log(`[ensureForCurrentUser] No SEO user found for email ${ctx.user.email}`);
          return { seoClientId: null, created: false };
        }
        // Check if a self-SEO-client already exists (crm_client_id IS NULL, createdBy = seoUser.id)
        // Use raw SQL to avoid Drizzle schema mismatch with unmigrated columns
        const dbClient = (db as any).$client.promise();
        const [existingRows] = await dbClient.query(
          'SELECT id, crm_client_id FROM seo_clients WHERE `createdBy` = ? AND crm_client_id IS NULL LIMIT 1',
          [seoUser.id]
        );
        const selfClient = Array.isArray(existingRows) ? existingRows[0] : undefined;
        if (selfClient) {
          console.log(`[ensureForCurrentUser] Found self-SEO-client id=${selfClient.id}`);
          return { seoClientId: selfClient.id, created: false };
        }
        // Create a self-SEO-client for this admin user
        const ownerName = ctx.user.name ?? seoUser.name ?? 'Agency Owner';
        const ownerEmail = ctx.user.email ?? seoUser.email ?? null;
        const [insertResult] = await dbClient.query(
          'INSERT INTO seo_clients (name, business_name, businessName, email, `createdBy`, isActive) VALUES (?, ?, ?, ?, ?, 1)',
          [ownerName, ownerName, ownerName, ownerEmail, seoUser.id]
        );
        const newId = (insertResult as any).insertId;
        console.log(`[ensureForCurrentUser] Created self-SEO-client id=${newId}`);
        return { seoClientId: newId, created: true };
      }
      const existing = await getSeoClientByCrmId(crmClient.id);
      console.log(`[ensureForCurrentUser] existingSeoClient:`, existing ? `found id=${existing.id}` : 'not found');
      if (existing) return { seoClientId: existing.id, created: false };
      const adminSeoUser = await getFirstAdminSeoUser();
      console.log(`[ensureForCurrentUser] adminSeoUser:`, adminSeoUser ? `found id=${adminSeoUser.id}` : 'not found');
      if (!adminSeoUser) return { seoClientId: null, created: false };
      const seoClientId = await ensureLinkedSeoClient({
        crmClientId: crmClient.id,
        name: (crmClient as any).name ?? ctx.user.name ?? "Client",
        email: (crmClient as any).email ?? ctx.user.email ?? undefined,
        phone: (crmClient as any).phone ?? undefined,
        businessType: (crmClient as any).businessType ?? undefined,
        seoUserId: adminSeoUser.id,
      });
      return { seoClientId, created: true };
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        company: z.string().optional(),
        notes: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
        businessName: z.string().optional(),
        businessType: z.string().optional(),
        industry: z.string().optional(),
        businessPhone: z.string().optional(),
        businessEmail: z.string().email().optional().or(z.literal("")),
        businessWebsite: z.string().optional(),
        businessAddress: z.string().optional(),
        websiteUrl: z.string().optional(),
        websitePlatform: z.string().optional(),
        websiteLoginUrl: z.string().optional(),
        websiteUsername: z.string().optional(),
        websitePassword: z.string().optional(),
        websiteNotes: z.string().optional(),
        socialFacebook: z.string().optional(),
        socialInstagram: z.string().optional(),
        socialLinkedin: z.string().optional(),
        socialTwitter: z.string().optional(),
        gscPropertyUrl: z.string().optional(),
        gscHasAccess: z.number().optional(),
        brandVoice: z.string().optional(),
        targetAudience: z.string().optional(),
        competitorUrls: z.string().optional(),
        preferredPublishDays: z.string().optional(),
        preferredPublishTime: z.string().optional(),
        primaryServices: z.string().optional(),
        uniqueSellingProp: z.string().optional(),
        serviceAreas: z.string().optional(),
        reportingKpis: z.string().optional(),
        reportingFrequency: z.string().optional(),
        companyColors: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Duplicate check: same name (case-insensitive) for this user
        const existingClients = await getClientsByUser(ctx.user.id);
        const nameLower = input.name.trim().toLowerCase();
        const duplicate = existingClients.find(
          (c) => c.name.trim().toLowerCase() === nameLower
        );
        if (duplicate) {
          throw new Error(`A client named "${duplicate.name}" already exists. Please use a different name or update the existing client.`);
        }
        const clientId = await createClient({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id: clientId };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional().or(z.literal("")),
        company: z.string().optional(),
        notes: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
        businessName: z.string().optional(),
        businessType: z.string().optional(),
        industry: z.string().optional(),
        businessPhone: z.string().optional(),
        businessEmail: z.string().email().optional().or(z.literal("")),
        businessWebsite: z.string().optional(),
        businessAddress: z.string().optional(),
        websiteUrl: z.string().optional(),
        websitePlatform: z.string().optional(),
        websiteLoginUrl: z.string().optional(),
        websiteUsername: z.string().optional(),
        websitePassword: z.string().optional(),
        websiteNotes: z.string().optional(),
        socialFacebook: z.string().optional(),
        socialInstagram: z.string().optional(),
        socialLinkedin: z.string().optional(),
        socialTwitter: z.string().optional(),
        monthlyBudget: z.string().optional(),
        budgetAlertThreshold: z.number().min(0).max(100).optional(),
        gscPropertyUrl: z.string().optional(),
        gscHasAccess: z.number().optional(),
        brandVoice: z.string().optional(),
        targetAudience: z.string().optional(),
        competitorUrls: z.string().optional(),
        preferredPublishDays: z.string().optional(),
        preferredPublishTime: z.string().optional(),
        primaryServices: z.string().optional(),
        uniqueSellingProp: z.string().optional(),
        serviceAreas: z.string().optional(),
        reportingKpis: z.string().optional(),
        reportingFrequency: z.string().optional(),
        companyColors: z.string().optional(),
        // AI Content Hub — HeyGen
        contentHubEnabled: z.number().optional(),
        heygenAvatarId: z.string().optional(),
        heygenVoiceId: z.string().optional(),
        heygenVideoFormat: z.enum(["portrait", "landscape", "square"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await updateClient(id, updates);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteClient(input.id);
        return { success: true };
      }),
    getMonthlyCost: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { getClientMonthlyCost } = await import("./budgetTracking");
        return { cost: await getClientMonthlyCost(input.clientId) };
      }),
    getBudgetStatus: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { checkClientBudgetAlert } = await import("./budgetTracking");
        return await checkClientBudgetAlert(input.clientId);
      }),
    gapAnalysis: protectedProcedure
      .input(
        z.object({
          clientId: z.number(),
          competitorUrls: z.array(z.string().url()).min(1).max(5),
        })
      )
      .mutation(async ({ input }) => {
        // Fetch client's existing content topics
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const { content } = await import("../drizzle/seo-schema");
        const { eq } = await import("drizzle-orm");
        const contentRows = await db
          .select({ title: content.title, topic: content.topic })
          .from(content)
          .where(eq(content.clientId, input.clientId));

        const existingTopics = contentRows
          .map((c: { title: string; topic: string }) => c.topic || c.title)
          .filter(Boolean)
          .join(", ");

        const prompt = `You are an expert SEO content strategist. Perform a content gap analysis.

Client's existing content topics:
${existingTopics || "(none yet)"}

Competitor URLs to analyse:
${input.competitorUrls.map((u, i) => `${i + 1}. ${u}`).join("\n")}

Based on typical content found on these competitor sites and the client's existing topics, identify:
1. Missing topic clusters the client should cover
2. Specific article/page ideas for each gap
3. Estimated search intent for each gap

Return a JSON object matching this schema exactly.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an SEO content strategist. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "gap_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  gaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        cluster: { type: "string", description: "Topic cluster name" },
                        description: { type: "string", description: "Why this gap matters" },
                        articleIdeas: {
                          type: "array",
                          items: { type: "string" },
                          description: "Specific article or page titles",
                        },
                        searchIntent: {
                          type: "string",
                          enum: ["informational", "navigational", "commercial", "transactional"],
                        },
                        priority: {
                          type: "string",
                          enum: ["high", "medium", "low"],
                        },
                      },
                      required: ["cluster", "description", "articleIdeas", "searchIntent", "priority"],
                      additionalProperties: false,
                    },
                  },
                  summary: { type: "string", description: "Overall gap analysis summary" },
                },
                required: ["gaps", "summary"],
                additionalProperties: false,
              },
            },
          },
        });

        const raw = response.choices[0]?.message?.content;
        if (typeof raw !== "string" || !raw) throw new Error("No response from AI");
        return JSON.parse(raw) as {
          gaps: {
            cluster: string;
            description: string;
            articleIdeas: string[];
            searchIntent: "informational" | "navigational" | "commercial" | "transactional";
            priority: "high" | "medium" | "low";
          }[];
          summary: string;
        };
      }),
    getClientStats: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./seo-db");
        const { content, contentAnalytics, contentQualityScores } = await import("../drizzle/seo-schema");
        const { eq, sum, count, avg } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return { totalContent: 0, approvedContent: 0, draftContent: 0, inProgressContent: 0, totalViews: 0, totalClicks: 0, avgQualityScore: null };
        // Content counts by status
        const contentRows = await db.select().from(content).where(eq(content.clientId, input.clientId));
        const totalContent = contentRows.length;
        const approvedContent = contentRows.filter(c => c.status === "approved").length;
        const draftContent = contentRows.filter(c => c.status === "draft").length;
        const inProgressContent = contentRows.filter(c => c.status === "in_progress").length;
        // Total views and clicks across all content for this client
        const contentIds = contentRows.map(c => c.id);
        let totalViews = 0;
        let totalClicks = 0;
        if (contentIds.length > 0) {
          const analyticsRows = await db.select().from(contentAnalytics);
          const clientAnalytics = analyticsRows.filter(a => contentIds.includes(a.contentId));
          totalViews = clientAnalytics.reduce((sum, a) => sum + (a.views ?? 0), 0);
          totalClicks = clientAnalytics.reduce((sum, a) => sum + (a.clicks ?? 0), 0);
        }
        // Average quality score
        let avgQualityScore: number | null = null;
        if (contentIds.length > 0) {
          const qualityRows = await db.select().from(contentQualityScores);
          const clientQuality = qualityRows.filter(q => contentIds.includes(q.contentId));
          if (clientQuality.length > 0) {
            avgQualityScore = Math.round(clientQuality.reduce((sum, q) => sum + q.overallScore, 0) / clientQuality.length);
          }
        }
        return { totalContent, approvedContent, draftContent, inProgressContent, totalViews, totalClicks, avgQualityScore };
      }),

    generateBrandVoice: protectedProcedure
      .input(
        z.object({
          websiteUrl: z.string().url(),
        })
      )
      .mutation(async ({ input }) => {
        // Fetch the website HTML (follow redirects, timeout 10s)
        let html = "";
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10_000);
          const res = await fetch(input.websiteUrl, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; ApexSEOBot/1.0)" },
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          html = await res.text();
        } catch (err: any) {
          throw new Error(`Could not fetch website: ${err?.message ?? String(err)}`);
        }

        // Strip HTML tags and collapse whitespace — keep first ~4000 chars for the AI
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&[a-z]+;/gi, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);

        if (text.length < 50) {
          throw new Error("Could not extract enough text from the website. Try a different URL.");
        }

        const prompt = `Analyse the following website copy and write a concise Brand Voice & Tone Guidelines description (150–250 words) suitable for guiding an AI content writer.

Cover:
- Overall tone (e.g. professional, conversational, authoritative, playful)
- Writing style (e.g. data-driven, storytelling, direct)
- Language preferences (e.g. avoids jargon, uses industry terms, first-person vs third-person)
- Target reader persona implied by the copy
- Any notable patterns (e.g. uses questions, short sentences, CTAs)

Website copy:
"""
${text}
"""

Return ONLY the brand voice description — no headings, no bullet points, no preamble.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert brand strategist and copywriter." },
            { role: "user", content: prompt },
          ],
        });

        const raw = response.choices[0]?.message?.content;
        if (typeof raw !== "string" || !raw.trim()) {
          throw new Error("AI did not return a brand voice description.");
        }
        return { brandVoice: raw.trim() };
      }),

    generateTargetAudience: protectedProcedure
      .input(z.object({ websiteUrl: z.string().url() }))
      .mutation(async ({ input }) => {
        let html = "";
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10_000);
          const res = await fetch(input.websiteUrl, {
            signal: controller.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; ApexSEOBot/1.0)" },
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          html = await res.text();
        } catch (err: any) {
          throw new Error(`Could not fetch website: ${err?.message ?? String(err)}`);
        }
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&[a-z]+;/gi, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);
        if (text.length < 50) throw new Error("Could not extract enough text from the website.");
        const prompt = `Analyse the following website copy and write a concise Target Audience Personas description (150–250 words) suitable for guiding an AI content writer.\n\nCover:\n- Primary persona (demographics, job title, pain points, goals)\n- Secondary persona if evident\n- Psychographic traits (values, motivations, objections)\n- Implied buying stage (awareness, consideration, decision)\n\nWebsite copy:\n"""\n${text}\n"""\n\nReturn ONLY the target audience description — no headings, no bullet points, no preamble.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert market researcher and customer persona strategist." },
            { role: "user", content: prompt },
          ],
        });
        const raw = response.choices[0]?.message?.content;
        if (typeof raw !== "string" || !raw.trim()) throw new Error("AI did not return a target audience description.");
        return { targetAudience: raw.trim() };
      }),

    // Brand voice history
    getBrandVoiceHistory: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { brandVoiceHistory } = await import("../drizzle/seo-schema");
        const { eq, desc } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        return db.select().from(brandVoiceHistory)
          .where(eq(brandVoiceHistory.clientId, input.clientId))
          .orderBy(desc(brandVoiceHistory.createdAt))
          .limit(20);
      }),

    saveBrandVoiceHistory: protectedProcedure
      .input(z.object({ clientId: z.number(), brandVoice: z.string().min(1), source: z.enum(["manual", "ai_generated"]).default("manual") }))
      .mutation(async ({ input }) => {
        const { brandVoiceHistory } = await import("../drizzle/seo-schema");
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.insert(brandVoiceHistory).values({
          clientId: input.clientId,
          brandVoice: input.brandVoice,
          source: input.source,
        });
        return { ok: true };
      }),
  }),

  // Ads Manager
  ads: router({
    list: protectedProcedure
      .input(z.object({ clientId: z.number().optional() }))
      .query(async ({ input }) => {
        const { ads } = await import("../drizzle/seo-schema");
        const { eq, desc } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        const query = db.select().from(ads).orderBy(desc(ads.createdAt));
        if (input.clientId) {
          return db.select().from(ads).where(eq(ads.clientId, input.clientId)).orderBy(desc(ads.createdAt));
        }
        return query;
      }),

    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        platform: z.enum(["google", "facebook"]),
        adType: z.enum(["search", "display", "responsive_search", "image", "video", "carousel"]).default("search"),
        headline1: z.string().max(30).optional(),
        headline2: z.string().max(30).optional(),
        headline3: z.string().max(30).optional(),
        description1: z.string().max(90).optional(),
        description2: z.string().max(90).optional(),
        primaryText: z.string().optional(),
        callToAction: z.string().optional(),
        destinationUrl: z.string().optional(),
        displayUrl: z.string().optional(),
        campaignName: z.string().optional(),
        adSetName: z.string().optional(),
        targetKeywords: z.string().optional(),
        targetAudience: z.string().optional(),
        budget: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { ads } = await import("../drizzle/seo-schema");
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [result] = await db.insert(ads).values({ ...input, createdBy: ctx.user.id });
        return { id: (result as any).insertId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        headline1: z.string().max(30).optional(),
        headline2: z.string().max(30).optional(),
        headline3: z.string().max(30).optional(),
        description1: z.string().max(90).optional(),
        description2: z.string().max(90).optional(),
        primaryText: z.string().optional(),
        callToAction: z.string().optional(),
        destinationUrl: z.string().optional(),
        displayUrl: z.string().optional(),
        campaignName: z.string().optional(),
        adSetName: z.string().optional(),
        targetKeywords: z.string().optional(),
        targetAudience: z.string().optional(),
        budget: z.string().optional(),
        status: z.enum(["draft", "ready", "active", "paused", "completed"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { ads } = await import("../drizzle/seo-schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { id, ...updates } = input;
        await db.update(ads).set(updates).where(eq(ads.id, id));
        return { ok: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { ads } = await import("../drizzle/seo-schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        await db.delete(ads).where(eq(ads.id, input.id));
        return { ok: true };
      }),

    generateCopy: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        platform: z.enum(["google", "facebook"]),
        adType: z.enum(["search", "display", "responsive_search", "image", "video", "carousel"]).default("search"),
        product: z.string(),
        targetAudience: z.string().optional(),
        brandVoice: z.string().optional(),
        companyColors: z.string().optional(),
        destinationUrl: z.string().optional(),
        keywords: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Fetch client data to enrich prompt with brand context if not provided
        let brandVoice = input.brandVoice;
        let companyColors = input.companyColors;
        if (!brandVoice || !companyColors) {
          try {
            const { seoClients: clients } = await import("../drizzle/seo-schema");
            const { eq } = await import("drizzle-orm");
            const db = await getDb();
            if (db) {
              const [clientData] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
              if (clientData) {
                if (!brandVoice && clientData.brandVoice) brandVoice = clientData.brandVoice;
                if (!companyColors && (clientData as any).companyColors) companyColors = (clientData as any).companyColors;
              }
            }
          } catch { /* non-fatal */ }
        }
        const colorNote = companyColors ? `\nBrand colours (hex): ${companyColors} — reference these when describing visual elements or CTAs.` : "";
        const isGoogle = input.platform === "google";
        const prompt = isGoogle
          ? `Write Google Ads copy for the following product/service.\n\nProduct: ${input.product}\nTarget audience: ${input.targetAudience || "general"}\nBrand voice: ${brandVoice || "professional"}${colorNote}\nLanding page: ${input.destinationUrl || "N/A"}\nKeywords: ${input.keywords || "N/A"}\n\nReturn JSON with these exact fields:\n{\n  "headline1": "max 30 chars",\n  "headline2": "max 30 chars",\n  "headline3": "max 30 chars",\n  "description1": "max 90 chars",\n  "description2": "max 90 chars",\n  "displayUrl": "example.com/path",\n  "callToAction": "e.g. Learn More"\n}\nAll character limits are strict. Return only valid JSON.`
          : `Write Facebook Ads copy for the following product/service.\n\nProduct: ${input.product}\nTarget audience: ${input.targetAudience || "general"}\nBrand voice: ${brandVoice || "professional"}${colorNote}\nLanding page: ${input.destinationUrl || "N/A"}\n\nReturn JSON with these exact fields:\n{\n  "headline1": "max 40 chars — ad headline",\n  "primaryText": "max 125 chars — main ad copy",\n  "description1": "max 30 chars — link description",\n  "callToAction": "e.g. Shop Now, Learn More, Sign Up"\n}\nReturn only valid JSON.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert paid advertising copywriter. Always return valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" } as any,
        });
        const raw = response.choices[0]?.message?.content;
        if (typeof raw !== "string") throw new Error("AI did not return ad copy.");
        try {
          return JSON.parse(raw);
        } catch {
          const match = raw.match(/\{[\s\S]*\}/);
          if (match) return JSON.parse(match[0]);
          throw new Error("Could not parse AI response as JSON.");
        }
      }),

    updateMetrics: protectedProcedure
      .input(z.object({
        id: z.number(),
        impressions: z.number().min(0),
        clicks: z.number().min(0),
        spend: z.string(),
        conversions: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        const { ads } = await import("../drizzle/seo-schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const { id, ...metrics } = input;
        await db.update(ads).set({ ...metrics, metricsUpdatedAt: new Date() }).where(eq(ads.id, id));
        return { ok: true };
      }),

    generateVariant: protectedProcedure
      .input(z.object({
        adId: z.number(),
        variantLabel: z.string().default("Variant B"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { ads } = await import("../drizzle/seo-schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("DB unavailable");
        const [original] = await db.select().from(ads).where(eq(ads.id, input.adId));
        if (!original) throw new Error("Ad not found");
        const isGoogle = original.platform === "google";
        const prompt = isGoogle
          ? `You are an expert Google Ads copywriter. Below is an existing ad. Write a DIFFERENT variant with fresh angles, different hooks, and alternative wording — but for the same product.

Original headline1: ${original.headline1 || ""}
Original headline2: ${original.headline2 || ""}
Original description1: ${original.description1 || ""}
Original description2: ${original.description2 || ""}

Return JSON: { "headline1": "max 30 chars", "headline2": "max 30 chars", "headline3": "max 30 chars", "description1": "max 90 chars", "description2": "max 90 chars", "callToAction": "e.g. Learn More" }. Return only valid JSON.`
          : `You are an expert Facebook Ads copywriter. Below is an existing ad. Write a DIFFERENT variant with a fresh angle and different emotional hook — but for the same product.

Original headline: ${original.headline1 || ""}
Original primary text: ${original.primaryText || ""}

Return JSON: { "headline1": "max 40 chars", "primaryText": "max 125 chars", "description1": "max 30 chars", "callToAction": "e.g. Shop Now" }. Return only valid JSON.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert paid advertising copywriter. Always return valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" } as any,
        });
        const raw = response.choices[0]?.message?.content;
        if (typeof raw !== "string") throw new Error("AI did not return variant copy.");
        let variantCopy: Record<string, string>;
        try { variantCopy = JSON.parse(raw); }
        catch { const m = raw.match(/\{[\s\S]*\}/); if (m) variantCopy = JSON.parse(m[0]); else throw new Error("Could not parse variant JSON."); }
        // Insert variant ad
        const [result] = await db.insert(ads).values({
          ...original,
          id: undefined as any,
          ...variantCopy,
          parentAdId: input.adId,
          variantLabel: input.variantLabel,
          status: "draft",
          impressions: 0, clicks: 0, spend: "0", conversions: 0,
          metricsUpdatedAt: null,
          createdBy: ctx.user.id,
          createdAt: undefined as any,
          updatedAt: undefined as any,
        });
        return { id: (result as any).insertId, ...variantCopy };
      }),
  }),

  // Model performance tracking
  modelPerformance: router({
    getMetrics: protectedProcedure.query(async () => {
      const { getModelPerformanceMetrics } = await import("./modelPerformance");
      return await getModelPerformanceMetrics();
    }),
    compareModels: protectedProcedure
      .input(z.object({
        model1: z.string(),
        model2: z.string(),
      }))
      .query(async ({ input }) => {
        const { compareModels } = await import("./modelPerformance");
        return await compareModels(input.model1, input.model2);
      }),
  }),

  // Reports aggregation
  reports: router({
    getSummary: protectedProcedure.query(async () => {
      const { getDb } = await import("./seo-db");
      const { content, seoClients: clients, contentQualityScores, contentAnalytics } = await import("../drizzle/seo-schema");
      const db = await getDb();
      if (!db) return null;

      let allContent: Awaited<ReturnType<typeof db.select>>[] = [];
      let allClients: Awaited<ReturnType<typeof db.select>>[] = [];
      let allScores: Awaited<ReturnType<typeof db.select>>[] = [];
      let allAnalytics: Awaited<ReturnType<typeof db.select>>[] = [];
      try {
        [allContent, allClients, allScores, allAnalytics] = await Promise.all([
          db.select().from(content) as Promise<typeof allContent>,
          db.select().from(clients) as Promise<typeof allClients>,
          db.select().from(contentQualityScores) as Promise<typeof allScores>,
          db.select().from(contentAnalytics) as Promise<typeof allAnalytics>,
        ]);
      } catch (e) {
        // DB connection may have dropped (ECONNRESET) — return null instead of throwing
        console.error('[seo.reports.getSummary] DB error:', (e as Error).message);
        return null;
      }

      // Content by status
      const statusCounts = allContent.reduce((acc: Record<string, number>, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});

      // Content by client
      const contentByClient = allClients.map(client => ({
        name: client.name,
        count: allContent.filter(c => c.clientId === client.id).length,
        approved: allContent.filter(c => c.clientId === client.id && c.status === 'approved').length,
      })).filter(c => c.count > 0);

      // Quality score distribution buckets
      const scoreBuckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
      allScores.forEach(s => {
        if (s.overallScore >= 80) scoreBuckets.excellent++;
        else if (s.overallScore >= 60) scoreBuckets.good++;
        else if (s.overallScore >= 40) scoreBuckets.fair++;
        else scoreBuckets.poor++;
      });
      const avgQualityScore = allScores.length > 0
        ? Math.round(allScores.reduce((sum, s) => sum + s.overallScore, 0) / allScores.length)
        : 0;

      // Content by AI model
      const modelCounts = allContent.reduce((acc: Record<string, number>, c) => {
        const m = c.aiModel || 'unknown';
        acc[m] = (acc[m] || 0) + 1;
        return acc;
      }, {});

      // Analytics totals
      const totalViews = allAnalytics.reduce((sum, a) => sum + (a.views || 0), 0);
      const totalClicks = allAnalytics.reduce((sum, a) => sum + (a.clicks || 0), 0);
      const totalImpressions = allAnalytics.reduce((sum, a) => sum + (a.shares || 0), 0);

      // Content created per month (last 6 months)
      const now = new Date();
      const monthlyOutput = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        const count = allContent.filter(c => {
          const cd = new Date(c.createdAt);
          return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
        }).length;
        return { label, count };
      });

      return {
        totalContent: allContent.length,
        totalClients: allClients.length,
        totalAnalyzed: allScores.length,
        avgQualityScore,
        statusCounts,
        contentByClient,
        scoreBuckets,
        modelCounts,
        totalViews,
        totalClicks,
        totalImpressions,
        monthlyOutput,
      };
    }),

    // ── Per-client report data ───────────────────────────────────────────────
    getClientReport: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./seo-db");
        const {
          content,
          clients,
          contentQualityScores,
          contentAnalytics,
          ads,
          searchConsoleMetrics,
        } = await import("../drizzle/seo-schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return null;

        const [clientRow] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
        if (!clientRow) return null;

        const [clientContent, clientScores, clientAnalytics, clientAds, kwMetrics] = await Promise.all([
          db.select().from(content).where(eq(content.clientId, input.clientId)),
          db.select().from(contentQualityScores)
            .leftJoin(content, eq(contentQualityScores.contentId, content.id))
            .where(eq(content.clientId, input.clientId)),
          db.select().from(contentAnalytics)
            .leftJoin(content, eq(contentAnalytics.contentId, content.id))
            .where(eq(content.clientId, input.clientId)),
          db.select().from(ads).where(eq(ads.clientId, input.clientId)),
          db.select().from(searchConsoleMetrics)
            .where(eq(searchConsoleMetrics.clientId, input.clientId))
            .limit(20),
        ]);

        const totalViews = clientAnalytics.reduce((s, a) => s + (a.contentAnalytics?.views || 0), 0);
        const totalClicks = clientAnalytics.reduce((s, a) => s + (a.contentAnalytics?.clicks || 0), 0);
        const scores = clientScores.map(r => r.contentQualityScores?.overallScore).filter((s): s is number => s != null);
        const avgQuality = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

        const statusCounts = clientContent.reduce((acc: Record<string, number>, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {});

        const now = new Date();
        const monthlyOutput = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
          const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
          const count = clientContent.filter(c => {
            const cd = new Date(c.createdAt);
            return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth();
          }).length;
          return { label, count };
        });

        const adSummary = {
          total: clientAds.length,
          active: clientAds.filter(a => a.status === 'active').length,
          totalImpressions: clientAds.reduce((s, a) => s + (a.impressions || 0), 0),
          totalClicks: clientAds.reduce((s, a) => s + (a.clicks || 0), 0),
          totalSpend: clientAds.reduce((s, a) => s + parseFloat(a.spend || '0'), 0),
          totalConversions: clientAds.reduce((s, a) => s + (a.conversions || 0), 0),
        };

        const topKeywords = kwMetrics
          .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
          .slice(0, 10)
          .map(k => ({
            query: k.query,
            clicks: k.clicks,
            impressions: k.impressions,
            position: (k.position || 0) / 100,
            ctr: (k.ctr || 0) / 100,
          }));

        const recentContent = clientContent
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
          .map(c => ({ id: c.id, title: c.title, status: c.status, type: c.contentType, createdAt: c.createdAt }));

        return {
          client: {
            id: clientRow.id,
            name: clientRow.name,
            company: clientRow.company,
            industry: clientRow.industry,
            websiteUrl: clientRow.websiteUrl,
            companyColors: (clientRow as any).companyColors || null,
          },
          generatedAt: new Date().toISOString(),
          contentSummary: {
            total: clientContent.length,
            statusCounts,
            avgQuality,
            totalViews,
            totalClicks,
            monthlyOutput,
          },
          adSummary,
          topKeywords,
          recentContent,
        };
      }),

    // ── Send report via email ─────────────────────────────────────────────────
    sendReport: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        toEmail: z.string().email(),
        toName: z.string(),
        reportHtml: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { sendClientReportEmail } = await import("./_core/email");
        const { getDb } = await import("./seo-db");
        const { seoClients: clients } = await import("../drizzle/seo-schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [clientRow] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
        if (!clientRow) throw new Error("Client not found");
        const result = await sendClientReportEmail({
          toEmail: input.toEmail,
          toName: input.toName,
          clientName: clientRow.name,
          reportHtml: input.reportHtml,
        });
        if (!result.success) {
          throw new Error(result.error ?? "Email send failed");
        }
        return { success: true, messageId: result.messageId };
      }),
  }),

  // Content management and generation
  content: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const items = await getContentWithClient(ctx.user.id);
      const { getDb } = await import("./seo-db");
      const { contentQualityScores } = await import("../drizzle/seo-schema");
      const db = await getDb();
      if (!db) return items.map(i => ({ ...i, qualityScore: null }));
      const scores = await db.select().from(contentQualityScores);
      const scoreMap = new Map(scores.map(s => [s.contentId, s.overallScore]));
      return items.map(i => ({ ...i, qualityScore: scoreMap.get(i.content.id) ?? null }));
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getContentById(input.id);
      }),
    listByClient: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ ctx, input }) => {
        const allContent = await getContentWithClient(ctx.user.id);
        return allContent.filter((item) => item.content.clientId === input.clientId).map((item) => item.content);
      }),
    // Portal endpoint: returns flat content items for the logged-in client user
    listForPortal: protectedProcedure.query(async ({ ctx }) => {
      const ADMIN_ROLES_SEO = ["admin", "super_admin", "agency_owner"];
      // For admin users, return all content they created (flat)
      if (ADMIN_ROLES_SEO.includes(ctx.user.role)) {
        const items = await getContentWithClient(ctx.user.id);
        return items.map(i => i.content);
      }
      // For client users: find CRM client → SEO client → content
      const { getDb: getMainDb } = await import("./db");
      const { clients: crmClientsTable } = await import("../drizzle/schema");
      const { seoClients: seoClientsTable, content: contentTable } = await import("../drizzle/seo-schema");
      const { eq } = await import("drizzle-orm");
      const mainDb = await getMainDb();
      if (!mainDb) return [];
      const [crmClient] = await mainDb.select().from(crmClientsTable).where(eq(crmClientsTable.userId, ctx.user.id));
      if (!crmClient) return [];
      const seoDb = await getDb();
      if (!seoDb) return [];
      const [seoClient] = await seoDb.select().from(seoClientsTable).where(eq(seoClientsTable.crmClientId, crmClient.id));
      if (!seoClient) return [];
      return await seoDb.select().from(contentTable).where(eq(contentTable.clientId, seoClient.id)).orderBy(contentTable.createdAt);
    }),
    generate: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        topic: z.string().min(1),
        customPrompt: z.string().optional(),
        shouldGenerateImage: z.boolean().default(true),
        enableWebResearch: z.boolean().default(true),
        aiModel: z.string().optional(),
        contentType: z.enum([
          // Website / SEO
          "blog-post", "how-to", "listicle", "case-study", "guide", "news",
          "faq", "service-page", "landing-page", "product-description",
          // Email
          "newsletter", "email-sequence", "promotional-email", "follow-up-email",
          // Social Media
          "social-post", "facebook-post", "instagram-caption", "linkedin-post",
          "twitter-post", "gbp-post", "carousel-copy", "promotional-social",
          "educational-social", "engagement-social",
          // PR / Authority
          "press-release", "announcement", "testimonial-story",
          // Long-Form / Resources
          "whitepaper", "lead-magnet", "guide-resource",
          // Legacy (kept for backward compat)
          "video-script"
        ]).default("blog-post"),
        contentSubtype: z.string().optional(), // e.g. "linkedin", "twitter", "instagram" for social-post
      }))
      .mutation(async ({ ctx, input }) => {
        const { clientId, topic, customPrompt, shouldGenerateImage, enableWebResearch, aiModel, contentType, contentSubtype } = input;

        // Duplicate check: same topic (case-insensitive) for the same client
        {
          const { getDb } = await import("./seo-db");
          const { content: contentTable } = await import("../drizzle/seo-schema");
          const { eq, and } = await import("drizzle-orm");
          const db = await getDb();
          if (db) {
            const existing = await db
              .select({ id: contentTable.id, title: contentTable.title })
              .from(contentTable)
              .where(and(eq(contentTable.clientId, clientId), eq(contentTable.createdBy, ctx.user.id)));
            const topicLower = topic.trim().toLowerCase();
            const dup = existing.find((c) => c.title.trim().toLowerCase() === topicLower);
            if (dup) {
              throw new Error(
                `Content titled "${dup.title}" already exists for this client. Edit the existing piece or use a different topic.`
              );
            }
          }
        }

        // Initialize tracking variables
        let inputTokens = 0;
        let outputTokens = 0;
        let urlsFetched = 0;
        let urlsFailed = 0;
        let webSearches = 0;
        let researchContext = "";

        // Track generation start time
        const generationStartTime = Date.now();

        // Perform web research if enabled
        if (enableWebResearch) {
          try {
            // Use axios to call the omni_search API for web research
            const axios = (await import("axios")).default;
            const searchResponse = await axios.post(
              `${process.env.BUILT_IN_FORGE_API_URL}/omni_search`,
              {
                query: topic,
                search_type: "info",
                max_results: 5,
              },
              {
                headers: {
                  Authorization: `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (searchResponse.data?.results) {
              webSearches = 1;
              const results = searchResponse.data.results;
              
              // Fetch content from URLs
              for (const result of results.slice(0, 3)) {
                try {
                  const urlResponse = await axios.get(result.url, { timeout: 5000 });
                  urlsFetched++;
                  researchContext += `\n\nSource: ${result.title}\n${result.snippet || ""}\n`;
                } catch {
                  urlsFailed++;
                }
              }
            }
          } catch (error) {
            console.error("Web research failed:", error);
          }
        }

        // Fetch client brand context for richer prompts
        let brandContext = "";
        try {
          const clientData = await getClientById(clientId);
          if (clientData) {
            const parts: string[] = [];
            if (clientData.brandVoice) parts.push(`Brand Voice: ${clientData.brandVoice}`);
            if (clientData.targetAudience) parts.push(`Target Audience: ${clientData.targetAudience}`);
            if (clientData.uniqueSellingProp) parts.push(`USP: ${clientData.uniqueSellingProp}`);
            if (clientData.primaryServices) parts.push(`Primary Services: ${clientData.primaryServices}`);
            if (clientData.serviceAreas) parts.push(`Service Areas: ${clientData.serviceAreas}`);
            if (clientData.competitorUrls) parts.push(`Competitors to differentiate from: ${clientData.competitorUrls}`);
            if ((clientData as any).companyColors) parts.push(`Brand Colours (hex): ${(clientData as any).companyColors} — reference these when describing visual elements, CTAs, or design suggestions in the content.`);
            if (parts.length > 0) brandContext = `\n\nClient Brand Context:\n${parts.join("\n")}`;
          }
        } catch { /* ignore */ }

        // Build content-type-specific system and user prompts
        const CONTENT_TYPE_PROMPTS: Record<string, { system: string; user: (t: string, sub?: string) => string }> = {
          "blog-post":         { system: "You are an expert SEO content writer. Create engaging, well-structured blog posts optimized for search engines.", user: (t) => `Write a comprehensive blog post about: ${t}` },
          "how-to":            { system: "You are an expert instructional writer. Create clear, step-by-step how-to guides.", user: (t) => `Write a detailed how-to guide on: ${t}` },
          "listicle":          { system: "You are an expert listicle writer. Create engaging numbered lists with rich descriptions.", user: (t) => `Write a listicle article about: ${t}` },
          "case-study":        { system: "You are an expert case study writer. Structure content with situation, approach, results, and key takeaways.", user: (t) => `Write a detailed case study about: ${t}` },
          "guide":             { system: "You are an expert guide writer. Create comprehensive, authoritative guides with clear sections.", user: (t) => `Write an ultimate guide on: ${t}` },
          "news":              { system: "You are a professional news writer. Write in inverted pyramid style — most important facts first.", user: (t) => `Write a news article about: ${t}` },
          "newsletter":        { system: "You are an expert email newsletter writer. Write in a conversational, engaging tone with a clear subject line, intro hook, main content, and CTA.", user: (t) => `Write a newsletter edition about: ${t}. Include: Subject Line, Preview Text, Opening Hook, Main Content, Key Takeaways, and a Call to Action.` },
          "email-sequence":    { system: "You are an expert email marketing copywriter. Write persuasive email sequences that nurture leads.", user: (t) => `Write a 5-email nurture sequence about: ${t}. Label each email (Email 1: Welcome, Email 2: Value, etc.) with Subject Line and Body.` },
          "social-post":       { system: "You are an expert social media copywriter. Write platform-optimised posts that drive engagement.", user: (t, sub) => `Write a ${sub || "social media"} post about: ${t}. Include relevant hashtags and a CTA.` },
          "press-release":     { system: "You are a professional PR writer. Write press releases in AP style with headline, dateline, lead paragraph, body, boilerplate, and contact info.", user: (t) => `Write a press release about: ${t}` },
          "landing-page":      { system: "You are an expert conversion copywriter. Write landing page copy with a compelling headline, subheadline, benefits, social proof, and CTA.", user: (t) => `Write landing page copy for: ${t}. Include: Headline, Subheadline, Hero Copy, 3 Key Benefits, Social Proof section, and CTA.` },
          "video-script":      { system: "You are an expert video script writer. Write engaging scripts with clear scene directions, hooks, and CTAs.", user: (t) => `Write a video script about: ${t}. Include: Hook (0-5s), Main Content with scene notes, and Outro CTA.` },
          "whitepaper":        { system: "You are an expert technical/business writer. Write authoritative whitepapers with executive summary, problem statement, solution, data, and conclusion.", user: (t) => `Write a whitepaper about: ${t}. Include: Executive Summary, Problem Statement, Solution Overview, Supporting Data, and Conclusion.` },
          "product-description": { system: "You are an expert e-commerce copywriter. Write compelling product descriptions that highlight features, benefits, and drive conversions.", user: (t) => `Write a product description for: ${t}. Include: Headline, Short Description, Key Features (bullet list), and Why Buy section.` },
          // New types
          "faq":                 { system: "You are an expert content writer specializing in FAQ pages. Write clear, helpful Q&A content that answers common customer questions and improves SEO.", user: (t) => `Write a comprehensive FAQ section about: ${t}. Include 8-12 questions with detailed answers, organized logically.` },
          "service-page":        { system: "You are an expert conversion copywriter specializing in service pages. Write persuasive, benefit-focused service page copy that converts visitors.", user: (t) => `Write service page copy for: ${t}. Include: Hero Headline, Service Overview, Key Benefits, Process/How It Works, Who It's For, and CTA.` },
          "promotional-email":   { system: "You are an expert email marketing copywriter. Write high-converting promotional emails with compelling subject lines and CTAs.", user: (t) => `Write a promotional email about: ${t}. Include: Subject Line, Preview Text, Headline, Body Copy, and CTA Button text.` },
          "follow-up-email":     { system: "You are an expert sales copywriter. Write warm, personalized follow-up emails that re-engage prospects and move them toward a decision.", user: (t) => `Write a follow-up email about: ${t}. Include: Subject Line, Personalized Opening, Value Reminder, Soft CTA, and P.S. line.` },
          "facebook-post":       { system: "You are an expert Facebook content creator. Write engaging Facebook posts that drive comments, shares, and reach. Use a conversational tone with a hook, story or value, and CTA.", user: (t) => `Write a Facebook post about: ${t}. Include a strong hook, main content (2-3 short paragraphs), and engagement CTA. Add relevant hashtags.` },
          "instagram-caption":   { system: "You are an expert Instagram copywriter. Write scroll-stopping captions with a strong first line, engaging body, and strategic hashtags.", user: (t) => `Write an Instagram caption about: ${t}. Include: Hook (first line), Story/Value (2-3 sentences), CTA, and 15-20 relevant hashtags.` },
          "linkedin-post":       { system: "You are an expert LinkedIn content creator. Write professional, thought-leadership posts that establish authority and drive engagement.", user: (t) => `Write a LinkedIn post about: ${t}. Use a bold opening line, structured body with insights or story, key takeaways, and a question or CTA to drive comments.` },
          "twitter-post":        { system: "You are an expert X/Twitter copywriter. Write punchy, engaging tweets and thread starters that drive retweets and replies.", user: (t) => `Write a Twitter/X post (or short thread of 3-5 tweets) about: ${t}. Keep each tweet under 280 characters. Include relevant hashtags.` },
          "gbp-post":            { system: "You are an expert Google Business Profile content writer. Write local SEO-optimized posts that drive calls, visits, and conversions.", user: (t) => `Write a Google Business Profile post about: ${t}. Keep it under 300 words, include a local angle, and end with a clear CTA (call, visit, book, etc.).` },
          "carousel-copy":       { system: "You are an expert social media carousel copywriter. Write slide-by-slide copy for educational or promotional carousels that keep people swiping.", user: (t) => `Write carousel copy about: ${t}. Create 6-8 slides with: Slide 1 (Hook), Slides 2-6 (Value/Steps), Slide 7 (Summary), Slide 8 (CTA). Label each slide.` },
          "promotional-social":  { system: "You are an expert social media copywriter specializing in promotional content. Write posts that drive action without feeling salesy.", user: (t) => `Write a promotional social media post about: ${t}. Lead with value or a limited-time angle, highlight the key benefit, and end with a clear CTA.` },
          "educational-social":  { system: "You are an expert educational content creator for social media. Write posts that teach something valuable and position the brand as an authority.", user: (t) => `Write an educational social media post about: ${t}. Use a 'Did you know?' or tip format, provide 3-5 actionable insights, and end with a follow-for-more CTA.` },
          "engagement-social":   { system: "You are an expert social media community manager. Write posts designed to spark conversations, comments, and shares.", user: (t) => `Write an engagement-focused social media post about: ${t}. Use a question, poll idea, or relatable scenario to invite responses. Keep it conversational and end with a direct question.` },
          "announcement":        { system: "You are an expert communications writer. Write clear, exciting announcements that generate buzz and inform your audience.", user: (t) => `Write an announcement about: ${t}. Include: Headline, What's happening, Why it matters, Key details, and Next steps or CTA.` },
          "testimonial-story":   { system: "You are an expert storytelling copywriter. Write compelling client success stories and testimonials that build trust and social proof.", user: (t) => `Write a client success story / testimonial piece about: ${t}. Structure it as: Challenge → Solution → Results → Client Quote → CTA.` },
          "lead-magnet":         { system: "You are an expert lead generation copywriter. Write compelling lead magnet copy that clearly communicates value and drives opt-ins.", user: (t) => `Write lead magnet copy for: ${t}. Include: Title, Subtitle, What You'll Learn (5-7 bullets), Who It's For, and Opt-In CTA.` },
          "guide-resource":      { system: "You are an expert resource guide writer. Write comprehensive, well-organized guide content that becomes a go-to reference for your audience.", user: (t) => `Write a guide/resource document about: ${t}. Include: Introduction, 5-7 main sections with subheadings, practical tips, and a conclusion with next steps.` },
        };
        const typeConfig = CONTENT_TYPE_PROMPTS[contentType] ?? CONTENT_TYPE_PROMPTS["blog-post"];
        const systemPrompt = customPrompt || typeConfig.system + " Always match the client's brand voice and write for their specific target audience.";
        const userPrompt = `${typeConfig.user(topic, contentSubtype)}${brandContext}${researchContext ? `\n\nUse this research context:\n${researchContext}` : ""}`;

        const llmResponse = await invokeLLM({
            messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const messageContent = llmResponse.choices[0]?.message?.content;
        const generatedContent = typeof messageContent === 'string' ? messageContent : "";
        inputTokens = llmResponse.usage?.prompt_tokens || 0;
        outputTokens = llmResponse.usage?.completion_tokens || 0;

        // Extract title from content (first line or generate one)
        const lines = generatedContent.split("\n").filter(l => l.trim());
        const title = lines[0]?.replace(/^#\s*/, "").substring(0, 500) || topic;

        // Generate featured image if requested
        let imageUrl = "";
        let imagePrompt = "";
        if (shouldGenerateImage) {
          try {
            imagePrompt = `Professional blog header image for: ${topic}`;
            const imageResult = await generateImage({ prompt: imagePrompt });
            imageUrl = imageResult.url || "";
          } catch (error) {
            console.error("Image generation failed:", error);
          }
        }

        // Calculate performance metrics
        const { calculateWordCount } = await import("./modelPerformance");
        const wordCount = calculateWordCount(generatedContent);
        const generationTimeMs = Date.now() - generationStartTime;

        // Save content to database
        const contentId = await createContent({
          clientId,
          createdBy: ctx.user.id,
          title,
          topic,
          content: generatedContent,
          imageUrl,
          imagePrompt,
          status: "draft",
          progress: 75,
          aiModel: aiModel || "gemini-2.5-flash",
          customPrompt: customPrompt || null,
          contentType: contentType as any,
          contentSubtype: contentSubtype || null,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          urlsFetched,
          urlsFailed,
          webSearches,
          wordCount,
          generationTimeMs,
        });

        // Check budget and send alert if needed
        try {
          const { checkAndAlertAfterGeneration } = await import("./budgetTracking");
          await checkAndAlertAfterGeneration(clientId);
        } catch (error) {
          console.error("Budget check failed:", error);
        }

        return { id: contentId, title, content: generatedContent, imageUrl };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        status: z.enum(["draft", "in_progress", "approved"]).optional(),
        progress: z.number().min(0).max(100).optional(),
        scheduledPublishDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, scheduledPublishDate, ...updates } = input;
        
        // Convert scheduledPublishDate string to Date if provided
        const finalUpdates: any = { ...updates };
        if (scheduledPublishDate) {
          finalUpdates.scheduledPublishDate = new Date(scheduledPublishDate);
        }
        
        // Check if status is changing to approved
        if (updates.status === "approved") {
          const contentData = await getContentById(id);
          if (contentData && contentData.status !== "approved") {
            // Update performance tracking
            const { calculateWordCount } = await import("./modelPerformance");
            const wordCount = calculateWordCount(contentData.content || "");
            await updateContent(id, {
              wasApproved: 1,
              approvedAt: new Date(),
              wordCount,
            });
            // Create in-app notification for approval
            try {
              const { getDb } = await import("./seo-db");
              const { appNotifications } = await import("../drizzle/seo-schema");
              const db = await getDb();
              if (db) {
                await db.insert(appNotifications).values({
                  type: "approval",
                  title: `Content Approved: ${contentData.title}`,
                  message: `"${contentData.title}" was approved by ${ctx.user.name || ctx.user.email || "a team member"}. Ready to publish!`,
                  contentId: id,
                  isRead: 0,
                });
              }
            } catch (e) {
              console.warn("[content] Failed to create approval notification:", e);
            }
            // Send approval notification to owner
            try {
              const { notifyOwner } = await import("./_core/notification");
              const contentPreview = contentData.content
                ? contentData.content.replace(/[#*\[\]()_`>-]/g, "").substring(0, 500)
                : "No content preview available";
              
              await notifyOwner({
                title: `Content Approved: ${contentData.title}`,
                content: `The blog post "${contentData.title}" has been approved by ${ctx.user.name || ctx.user.email || "a team member"}.\n\nTopic: ${contentData.topic || "N/A"}\n\nPreview:\n${contentPreview}...\n\nYou can now publish this content to the client's CMS via the Publishing page.`,
              });
            } catch (e) {
              console.error("Failed to send approval notification:", e);
            }
          }
        }
        
        await updateContent(id, finalUpdates);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteContent(input.id);
        return { success: true };
      }),
    regenerate: protectedProcedure
      .input(z.object({
        id: z.number(),
        aiModel: z.string(),
        customPrompt: z.string().optional(),
        shouldGenerateImage: z.boolean().default(false),
        enableWebResearch: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, aiModel, customPrompt, shouldGenerateImage, enableWebResearch } = input;
        
        // Get original content
        const originalContent = await getContentById(id);
        if (!originalContent) {
          throw new Error("Content not found");
        }

        // Track generation start time
        const generationStartTime = Date.now();
        let inputTokens = 0;
        let outputTokens = 0;
        let urlsFetched = 0;
        let urlsFailed = 0;
        let webSearches = 0;
        let researchContext = "";

        // Perform web research if enabled
        if (enableWebResearch) {
          try {
            const axios = (await import("axios")).default;
            const searchResponse = await axios.post(
              `${process.env.BUILT_IN_FORGE_API_URL}/omni_search`,
              {
                query: originalContent.topic,
                search_type: "info",
                max_results: 5,
              },
              {
                headers: {
                  Authorization: `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (searchResponse.data?.results) {
              webSearches = 1;
              const results = searchResponse.data.results;
              for (const result of results.slice(0, 3)) {
                try {
                  const urlResponse = await axios.get(result.url, { timeout: 5000 });
                  urlsFetched++;
                  researchContext += `\n\nSource: ${result.title}\n${result.snippet || ""}\n`;
                } catch {
                  urlsFailed++;
                }
              }
            }
          } catch (error) {
            console.error("Web research failed:", error);
          }
        }

        // Generate new content with AI
        const systemPrompt = customPrompt || "You are an expert SEO content writer. Create engaging, well-structured blog posts that are informative and optimized for search engines.";
        const userPrompt = `Write a comprehensive blog post about: ${originalContent.topic}${researchContext ? `\n\nUse this research context:\n${researchContext}` : ""}`;        

        const llmResponse = await invokeLLM({
            messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const messageContent = llmResponse.choices[0]?.message?.content;
        const generatedContent = typeof messageContent === 'string' ? messageContent : "";
        inputTokens = llmResponse.usage?.prompt_tokens || 0;
        outputTokens = llmResponse.usage?.completion_tokens || 0;

        // Extract title from content
        const lines = generatedContent.split("\n").filter(l => l.trim());
        const title = lines[0]?.replace(/^#\s*/, "").substring(0, 500) || originalContent.topic;

        // Generate featured image if requested
        let imageUrl = originalContent.imageUrl || "";
        let imagePrompt = originalContent.imagePrompt || "";
        if (shouldGenerateImage) {
          try {
            imagePrompt = `Professional blog header image for: ${originalContent.topic}`;
            const imageResult = await generateImage({ prompt: imagePrompt });
            imageUrl = imageResult.url || "";
          } catch (error) {
            console.error("Image generation failed:", error);
          }
        }

        // Calculate performance metrics
        const { calculateWordCount } = await import("./modelPerformance");
        const wordCount = calculateWordCount(generatedContent);
        const generationTimeMs = Date.now() - generationStartTime;

        // Update content with regenerated version
        await updateContent(id, {
          title,
          content: generatedContent,
          imageUrl,
          imagePrompt,
          aiModel,
          customPrompt: customPrompt || null,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          urlsFetched,
          urlsFailed,
          webSearches,
          wordCount,
          generationTimeMs,
          status: "draft",
          wasApproved: 0,
          approvedAt: null,
        });

        // Check budget and send alert if needed
        try {
          const { checkAndAlertAfterGeneration } = await import("./budgetTracking");
          await checkAndAlertAfterGeneration(originalContent.clientId);
        } catch (error) {
          console.error("Budget check failed:", error);
        }

        return { id, title, content: generatedContent, imageUrl };
      }),
    exportHtml: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const content = await getContentById(input.id);
        if (!content) throw new Error("Content not found");
        return {
          title: content.title,
          content: content.content,
          imageUrl: content.imageUrl,
          topic: content.topic,
          status: content.status,
          aiModel: content.aiModel,
          createdAt: content.createdAt,
        };
      }),
    schedule: protectedProcedure
      .input(z.object({
        contentId: z.number(),
        scheduledPublishDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        await updateContent(input.contentId, {
          scheduledPublishDate: input.scheduledPublishDate,
           isScheduled: 1,
        });
        return { success: true };
      }),

    // Generate or replace the featured image for a content piece
    generateImage: protectedProcedure
      .input(z.object({
        id: z.number(),
        customPrompt: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const contentData = await getContentById(input.id);
        if (!contentData) throw new Error("Content not found");
        const imagePrompt = input.customPrompt ||
          `Professional, high-quality blog header image for an article titled: "${contentData.title}". Topic: ${contentData.topic}. Clean, modern style suitable for a business blog.`;
        const imageResult = await generateImage({ prompt: imagePrompt });
        const imageUrl = imageResult.url || "";
        await updateContent(input.id, { imageUrl, imagePrompt });
        return { imageUrl, imagePrompt };
      }),

    // Change the AI model stored on a content piece (for future regenerations)
    changeModel: protectedProcedure
      .input(z.object({
        id: z.number(),
        aiModel: z.string(),
      }))
      .mutation(async ({ input }) => {
        await updateContent(input.id, { aiModel: input.aiModel });
        return { success: true };
      }),
  }),
  bulk: bulkRouter,
  templates: templatesRouter,
  collaboration: collaborationRouter,
  analytics: analyticsRouter,
  repurposing: repurposingRouter,
  qualityScore: qualityScoreRouter,
  webhooks: webhooksRouter,
  briefs: briefsRouter,
  notifications: notificationsRouter,
  seoAudit: seoAuditRouter,
  agencySettings: agencySettingsRouter,
  recurringPlans: recurringPlansRouter,

  // Keyword Research
  keywords: router({
    suggest: protectedProcedure
      .input(z.object({
        topic: z.string().min(1),
        count: z.number().min(1).max(20).optional(),
      }))
      .mutation(async ({ input }) => {
        const { getKeywordSuggestions } = await import("./keywordResearch");
        return await getKeywordSuggestions(input.topic, input.count);
      }),
    analyze: protectedProcedure
      .input(z.object({
        content: z.string().min(1),
        targetKeywords: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { analyzeContentKeywords } = await import("./keywordResearch");
        return await analyzeContentKeywords(input.content, input.targetKeywords);
      }),
    optimize: protectedProcedure
      .input(z.object({
        content: z.string().min(1),
        targetKeywords: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { optimizeContentForKeywords } = await import("./keywordResearch");
        return await optimizeContentForKeywords(input.content, input.targetKeywords);
      }),
  }),

  // Performance Tracking
  performance: router({
    getContentPerformance: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .query(async ({ input }) => {
        const { getContentPerformance } = await import("./performanceTracking");
        return await getContentPerformance(input.contentId);
      }),
    getTopPerforming: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        const { getTopPerformingContent } = await import("./performanceTracking");
        return await getTopPerformingContent(input.limit);
      }),
    getSummary: protectedProcedure.query(async () => {
      const { getPerformanceSummary } = await import("./performanceTracking");
      return await getPerformanceSummary();
    }),
    trackView: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .mutation(async ({ input }) => {
        const { trackContentView } = await import("./performanceTracking");
        return await trackContentView(input.contentId);
      }),
    trackClick: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .mutation(async ({ input }) => {
        const { trackContentClick } = await import("./performanceTracking");
        return await trackContentClick(input.contentId);
      }),
    getTrends: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ input }) => {
        const { getPerformanceTrends } = await import("./performanceTracking");
        return await getPerformanceTrends(input.days);
      }),
    getKeywordRankings: protectedProcedure
      .input(z.object({ clientId: z.number().optional(), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { searchConsoleMetrics, seoClients: clientsTable } = await import("../drizzle/seo-schema");
        const { desc, eq } = await import("drizzle-orm");
        const query = db
          .select({
            id: searchConsoleMetrics.id,
            query: searchConsoleMetrics.query,
            page: searchConsoleMetrics.page,
            clicks: searchConsoleMetrics.clicks,
            impressions: searchConsoleMetrics.impressions,
            ctr: searchConsoleMetrics.ctr,
            position: searchConsoleMetrics.position,
            recordedDate: searchConsoleMetrics.recordedDate,
            clientId: searchConsoleMetrics.clientId,
            clientName: clientsTable.name,
          })
          .from(searchConsoleMetrics)
          .leftJoin(clientsTable, eq(searchConsoleMetrics.clientId, clientsTable.id))
          .orderBy(searchConsoleMetrics.position)
          .limit(input.limit);
        if (input.clientId) {
          return query.where(eq(searchConsoleMetrics.clientId, input.clientId));
        }
        return query;
      }),
  }),

  // Google Analytics Integration
  googleAnalytics: googleAnalyticsRouter,
  wordpress: wordpressRouter,
  manusWebsites: manusWebsitesRouter,
  designStandards: designStandardsRouter,
  bulkPublishing: bulkPublishingRouter,
  publishingAnalytics: publishingAnalyticsRouter,
  publishingScheduler: publishingSchedulerRouter,

  // Portal Branding
  portalBranding: router({
    get: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { getPortalBranding } = await import("./seo-db");
        return await getPortalBranding(input.clientId);
      }),

    upsert: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        portalName: z.string().optional(),
        welcomeMessage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { upsertPortalBranding } = await import("./seo-db");
        return await upsertPortalBranding(input);
      }),
  }),

  // Client Portal Authentication
  clientPortal: router({
    // Invitation management
    createInvitation: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        email: z.string().email(),
        name: z.string(),
        role: z.enum(["client_admin", "client_viewer"]).default("client_viewer"),
        origin: z.string().optional(), // frontend passes window.location.origin
      }))
      .mutation(async ({ input }) => {
        const { createClientPortalInvitation } = await import("./clientPortalAuth");
        const result = await createClientPortalInvitation(input.clientId, input.email, input.name, input.role);

        // Build invite URL and notify owner
        const baseUrl = input.origin || "[your portal URL]";
        const inviteUrl = `${baseUrl}/portal/accept-invitation?token=${result.token}`;

        // Notify the portal owner
        try {
          const { notifyOwner } = await import("./_core/notification");
          await notifyOwner({
            title: `New Client Portal Invitation — ${input.name}`,
            content: `A portal invitation has been created for ${input.name} (${input.email}).\n\nRole: ${input.role}\nExpires: ${result.expiresAt.toUTCString()}\n\nInvitation link (forward this to the client):\n${inviteUrl}`,
          });
        } catch {
          // Notification failure should not block invitation creation
        }

        // Send branded invitation email directly to the client via Resend
        try {
          const { sendPortalInvitationEmail } = await import("./_core/email");
          // Get client name for the email
          const { getDb } = await import("./seo-db");
          const { seoClients: clients } = await import("../drizzle/seo-schema");
          const { eq } = await import("drizzle-orm");
          const db = await getDb();
          let clientName = "your account";
          if (db) {
            const [clientRow] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, input.clientId));
            if (clientRow) clientName = clientRow.name;
          }
          await sendPortalInvitationEmail({
            toEmail: input.email,
            toName: input.name,
            clientName,
            inviteUrl,
          });
        } catch {
          // Email failure should not block invitation creation
        }

        return result;
      }),
    
    // Accept invitation (public endpoint)
    acceptInvitation: publicProcedure
      .input(z.object({
        token: z.string(),
        password: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const { acceptInvitation } = await import("./clientPortalAuth");
        return await acceptInvitation(input.token, input.password);
      }),
    
    // Login (public endpoint)
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { loginClientPortalUser } = await import("./clientPortalAuth");
        return await loginClientPortalUser(input.email, input.password);
      }),
    
    // Get current user (requires client portal token)
    me: publicProcedure.query(async ({ ctx }) => {
      // This would need custom context handling for client portal tokens
      // For now, return null if not authenticated
      return null;
    }),
    
    // List portal users for a client
    listUsers: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { listClientPortalUsers } = await import("./clientPortalAuth");
        return await listClientPortalUsers(input.clientId);
      }),
    
    // Change password
    changePassword: publicProcedure
      .input(z.object({
        userId: z.number(),
        oldPassword: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const { changeClientPortalPassword } = await import("./clientPortalAuth");
        return await changeClientPortalPassword(input.userId, input.oldPassword, input.newPassword);
      }),
    
    // Deactivate user
    deactivateUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input }) => {
        const { deactivateClientPortalUser } = await import("./clientPortalAuth");
        return await deactivateClientPortalUser(input.userId);
      }),
  }),

  // Approval Workflow
  approvals: router({
    requestApproval: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { requestApproval } = await import("./approvalWorkflow");
        return await requestApproval(input.contentId, ctx.user.id);
      }),
    approve: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { approveContent } = await import("./approvalWorkflow");
        return await approveContent(input.contentId, ctx.user.id);
      }),
    requestRevision: protectedProcedure
      .input(z.object({ 
        contentId: z.number(),
        reason: z.string().min(1)
      }))
      .mutation(async ({ ctx, input }) => {
        const { requestRevision } = await import("./approvalWorkflow");
        return await requestRevision(input.contentId, ctx.user.id, input.reason);
      }),
    getPendingApprovals: protectedProcedure.query(async () => {
      const { getPendingApprovals } = await import("./approvalWorkflow");
      return await getPendingApprovals();
    }),
    getRevisionRequests: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .query(async ({ input }) => {
        const { getRevisionRequests } = await import("./approvalWorkflow");
        return await getRevisionRequests(input.contentId);
      }),
    completeRevision: protectedProcedure
      .input(z.object({ revisionId: z.number() }))
      .mutation(async ({ input }) => {
        const { completeRevision } = await import("./approvalWorkflow");
        return await completeRevision(input.revisionId);
      }),
    addComment: protectedProcedure
      .input(z.object({
        contentId: z.number(),
        comment: z.string().min(1)
      }))
      .mutation(async ({ ctx, input }) => {
        const { addComment } = await import("./approvalWorkflow");
        return await addComment(input.contentId, ctx.user.id, input.comment);
      }),
    getStats: protectedProcedure.query(async () => {
      const { getApprovalStats } = await import("./approvalWorkflow");
      return await getApprovalStats();
    }),
  }),

  // A/B Testing
  abTests: router({
    list: protectedProcedure.query(async () => {
      const { listABTests } = await import("./abTesting");
      return await listABTests();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const { getABTestById } = await import("./abTesting");
        return await getABTestById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        topic: z.string(),
        customPrompt: z.string().optional(),
        enableWebResearch: z.boolean().default(false),
        shouldGenerateImage: z.boolean().default(false),
        modelA: z.string(),
        modelB: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { createABTest, updateABTestResults } = await import("./abTesting");
        const { calculateWordCount } = await import("./modelPerformance");
        
        // Create A/B test record
        const testId = await createABTest({
          ...input,
          createdBy: ctx.user.id,
        });

        // Generate both versions
        const systemPrompt = input.customPrompt || "You are an expert SEO content writer. Create engaging, well-structured blog posts that are informative and optimized for search engines.";
        const userPrompt = `Write a comprehensive blog post about: ${input.topic}`;

        // Generate Version A
        const startTimeA = Date.now();
        const responseA = await invokeLLM({
            messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        const contentA = typeof responseA.choices[0]?.message?.content === 'string' 
          ? responseA.choices[0].message.content 
          : "";
        const titleA = contentA.split("\n").filter(l => l.trim())[0]?.replace(/^#\s*/, "").substring(0, 500) || input.topic;
        const generationTimeMsA = Date.now() - startTimeA;

        await updateABTestResults(testId, {
          version: "A",
          content: contentA,
          title: titleA,
          wordCount: calculateWordCount(contentA),
          generationTimeMs: generationTimeMsA,
          inputTokens: responseA.usage?.prompt_tokens || 0,
          outputTokens: responseA.usage?.completion_tokens || 0,
        });

        // Generate Version B
        const startTimeB = Date.now();
        const responseB = await invokeLLM({
            messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        const contentB = typeof responseB.choices[0]?.message?.content === 'string' 
          ? responseB.choices[0].message.content 
          : "";
        const titleB = contentB.split("\n").filter(l => l.trim())[0]?.replace(/^#\s*/, "").substring(0, 500) || input.topic;
        const generationTimeMsB = Date.now() - startTimeB;

        await updateABTestResults(testId, {
          version: "B",
          content: contentB,
          title: titleB,
          wordCount: calculateWordCount(contentB),
          generationTimeMs: generationTimeMsB,
          inputTokens: responseB.usage?.prompt_tokens || 0,
          outputTokens: responseB.usage?.completion_tokens || 0,
        });

        return { id: testId };
      }),
    setWinner: protectedProcedure
      .input(z.object({
        id: z.number(),
        winner: z.enum(["A", "B"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { setABTestWinner } = await import("./abTesting");
        await setABTestWinner(input.id, input.winner, input.notes);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { deleteABTest } = await import("./abTesting");
        await deleteABTest(input.id);
        return { success: true };
      }),
    analyzeWinner: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const { getABTestById } = await import("./abTesting");
        const test = await getABTestById(input.id);
        if (!test) throw new Error("Test not found");
        const prompt = `You are an expert SEO content analyst. Compare these two AI-generated blog post versions and recommend a winner.

Topic: ${test.topic}

Version A (${test.modelA}):
Title: ${test.titleA}
Word Count: ${test.wordCountA}
Generation Time: ${((test.generationTimeMsA ?? 0) / 1000).toFixed(1)}s
Content Preview: ${(test.contentA || "").substring(0, 800)}...

Version B (${test.modelB}):
Title: ${test.titleB}
Word Count: ${test.wordCountB}
Generation Time: ${((test.generationTimeMsB ?? 0) / 1000).toFixed(1)}s
Content Preview: ${(test.contentB || "").substring(0, 800)}...

Analyze both versions on: SEO optimization, readability, engagement potential, title effectiveness, content depth, and overall quality. Recommend a winner (A or B) with a clear explanation. Format your response as:
**Recommended Winner: [A or B]**

**Reasoning:**
[Your detailed analysis]`;
        const response = await invokeLLM({
          messages: [{ role: "user", content: prompt }],
        });
        const analysis = typeof response.choices[0]?.message?.content === 'string'
          ? response.choices[0].message.content
          : "Analysis unavailable";
        // Extract recommended winner from analysis
        const winnerMatch = analysis.match(/Recommended Winner:\s*\*?\*?([AB])\*?\*?/i);
        const recommendedWinner = winnerMatch ? winnerMatch[1] as "A" | "B" : null;
        return { analysis, recommendedWinner };
      }),
  }),

   searchConsole: searchConsoleRouter,
  clientPublishingPermissions: clientPublishingPermissionsRouter,
  appNotifications: appNotificationsRouter,
  aiClientSuggestions: aiClientSuggestionsRouter,
  pipeline: pipelineRouter,
   googleBusinessProfile: googleBusinessProfileRouter,
  keywordGap: keywordGapRouter,
  // Demo data seeding
  seed: router({
    run: protectedProcedure.mutation(async ({ ctx }) => {
      // Demo data seeding not available in this environment
      return { success: false, message: "Demo seeding not available" };
    }),
    check: protectedProcedure.query(async ({ ctx }) => {
      const existingClients = await getClientsByUser(ctx.user.id);
      return { hasData: existingClients.length > 0, clientCount: existingClients.length };
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type SeoRouter = typeof seoRouter;
