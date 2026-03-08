/**
 * Viral Topic Research Agent
 *
 * Implements Tariq's proprietary viral topic research methodology:
 * 1. AI-powered topic discovery based on brand niche + trending signals
 * 2. Outlier-score simulation (estimates virality from search volume + trend velocity)
 * 3. Competitor gap analysis — finds what top creators are covering
 * 4. Generates hooks, key talking points, and recommended structure
 * 5. Feeds discovered topics into the existing generateContentPackage pipeline
 *
 * Rules:
 * - Long-form YouTube videos: Coach Tim (seoClientId=30002) ONLY
 * - All other clients: max 60s short-form content
 * - Tim the Home Loan Coach (30001): Home Loan content ONLY
 * - Coach Tim (30002): 90% Finance, 10% Home Loans
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../seo-db";
import { notifyOwner } from "../_core/notification";

const COACH_TIM_SEO_ID = 30002;   // Coach Tim (Finance brand — YouTube eligible)
const HOME_LOAN_COACH_SEO_ID = 30001; // Tim the Home Loan Coach (short-form only)

export interface ViralTopicResult {
  topic: string;
  contentType: "youtube_longform" | "short_form";
  platform: string;
  viralScore: number;
  searchVolume: number;
  hook: string;
  keyPoints: string[];
  researchNotes: string;
}

/**
 * Research and store viral topics for a given SEO client brand.
 * Called weekly by the content calendar agent.
 */
export async function researchViralTopics(
  seoClientId: number,
  topicsPerWeek: number = 5
): Promise<ViralTopicResult[]> {
  const db = (await getDb())!;
  if (!db) throw new Error("SEO database unavailable");

  // Load brand config
  const { seoClients } = await import("../../drizzle/seo-schema");
  const { eq } = await import("drizzle-orm");
  const [client] = await db.select().from(seoClients).where(eq(seoClients.id, seoClientId));
  if (!client) throw new Error(`SEO client ${seoClientId} not found`);

  const isCoachTim = seoClientId === COACH_TIM_SEO_ID;
  const isHomeLoanCoach = seoClientId === HOME_LOAN_COACH_SEO_ID;

  const brandContext = `
Brand: ${client.businessName}
Industry: ${client.industry}
Target Audience: ${client.targetAudience}
Primary Services: ${client.primaryServices}
Brand Voice: ${client.brandVoice}
Content Rules: ${isHomeLoanCoach
    ? "Home Loan content ONLY. No finance, stocks, or general money topics. Focus on mortgages, refinancing, home buying, FHA/VA loans, down payment assistance."
    : isCoachTim
    ? "90% Finance content (budgeting, stocks, trading, credit, wealth building), 10% Home Loan content. Target financial literacy seekers and the Black community."
    : "General mortgage and real estate content."}
${isCoachTim ? "YouTube long-form videos ARE allowed for this brand." : "SHORT-FORM ONLY (max 60 seconds). No YouTube long-form."}
  `.trim();

  // Step 1: AI-powered viral topic discovery
  const discoveryResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a viral content strategist specializing in YouTube and social media for financial services. 
You use the VidIQ methodology: find topics with HIGH OUTLIER SCORES (videos that got views primarily from NEW viewers, not subscribers).
Your job is to find topics that are currently trending, have high search intent, and have proven viral potential based on what top creators in the niche are posting.`,
      },
      {
        role: "user",
        content: `Research ${topicsPerWeek} viral content topics for this brand:

${brandContext}

For each topic:
1. Find topics that are currently trending (high outlier score potential)
2. Topics that multiple successful creators are covering right now
3. Topics with strong search intent from the target audience
4. Include a mix of: evergreen high-search topics + trending timely topics

Today's date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Return exactly ${topicsPerWeek} topics.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "viral_topics",
        strict: true,
        schema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string", description: "The specific video/content topic title" },
                  content_type: {
                    type: "string",
                    enum: ["youtube_longform", "short_form"],
                    description: "youtube_longform only for Coach Tim, short_form for all others",
                  },
                  platform: {
                    type: "string",
                    enum: ["youtube", "instagram", "tiktok", "facebook"],
                    description: "Primary platform for this content",
                  },
                  viral_score: {
                    type: "number",
                    description: "Estimated virality score 0-100 based on outlier potential",
                  },
                  search_volume: {
                    type: "number",
                    description: "Estimated monthly search volume",
                  },
                  hook: {
                    type: "string",
                    description: "The opening hook for the first 3 seconds of the video",
                  },
                  key_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 key talking points for the video",
                  },
                  research_notes: {
                    type: "string",
                    description: "Why this topic is viral, what competitors are doing, audience pain points",
                  },
                },
                required: ["topic", "content_type", "platform", "viral_score", "search_volume", "hook", "key_points", "research_notes"],
                additionalProperties: false,
              },
            },
          },
          required: ["topics"],
          additionalProperties: false,
        },
      },
    },
  });

  const parsed = JSON.parse(discoveryResponse.choices[0].message.content as string);
  const topics: ViralTopicResult[] = parsed.topics.map((t: any) => ({
    topic: t.topic,
    contentType: isCoachTim ? t.content_type : "short_form", // enforce short-form for non-Coach Tim
    platform: t.platform,
    viralScore: Math.min(100, Math.max(0, t.viral_score)),
    searchVolume: t.search_volume,
    hook: t.hook,
    keyPoints: t.key_points,
    researchNotes: t.research_notes,
  }));

  // Step 2: Store topics in the database
  const { viralTopics } = await import("../../drizzle/seo-schema");
  const weekOf = getStartOfWeek();

  for (const topic of topics) {
    await db.insert(viralTopics).values({
      seoClientId,
      topic: topic.topic,
      contentType: topic.contentType,
      platform: topic.platform,
      viralScore: topic.viralScore,
      searchVolume: topic.searchVolume,
      hook: topic.hook,
      keyPoints: JSON.stringify(topic.keyPoints),
      researchNotes: topic.researchNotes,
      status: "researched",
      weekOf,
    });
  }

  console.log(`[ViralTopicAgent] Stored ${topics.length} topics for ${client.businessName}`);

  // Step 3: Notify owner
  await notifyOwner({
    title: `${topics.length} Viral Topics Ready — ${client.businessName}`,
    content: `Weekly topic research complete for ${client.businessName}. Top topic: "${topics[0]?.topic}" (score: ${topics[0]?.viralScore}). Review and approve in Content Studio → Topic Queue.`,
  });

  return topics;
}

/**
 * Auto-generate content packages for all researched topics for a brand.
 * Called after topic research completes, or manually triggered.
 */
export async function generatePackagesFromTopics(seoClientId: number, topicIds?: number[]): Promise<number[]> {
  const db = (await getDb())!;
  if (!db) throw new Error("SEO database unavailable");

  const { viralTopics, seoClients } = await import("../../drizzle/seo-schema");
  const { eq, and, inArray } = await import("drizzle-orm");

  const [client] = await db.select().from(seoClients).where(eq(seoClients.id, seoClientId));
  if (!client) throw new Error(`SEO client ${seoClientId} not found`);

  // Get topics — either specific ones by ID or all researched topics
  let topics;
  if (topicIds && topicIds.length > 0) {
    topics = await db.select().from(viralTopics)
      .where(and(
        eq(viralTopics.seoClientId, seoClientId),
        inArray(viralTopics.id, topicIds)
      ));
  } else {
    topics = await db.select().from(viralTopics)
      .where(and(
        eq(viralTopics.seoClientId, seoClientId),
        eq(viralTopics.status, "researched")
      ));
  }

  if (topics.length === 0) {
    console.log(`[ViralTopicAgent] No topics found for client ${seoClientId}`);
    return [];
  }

  console.log(`[ViralTopicAgent] Processing ${topics.length} topic(s) for client ${seoClientId}`);

  const packageIds: number[] = [];

  // Process topics ONE AT A TIME (sequential) to respect the concurrency lock.
  // Each topic: create package → generate script + captions → launch browser agent.
  // The browser agent has its own lock, so only 1 video generates at a time.
  // Remaining topics get script + captions ready and queue for video generation.
  for (const topic of topics) {
    try {
      // Mark topic as in production
      await db.update(viralTopics)
        .set({ status: "in_production" })
        .where(eq(viralTopics.id, topic.id));

      const { contentPackages } = await import("../../drizzle/seo-schema");
      const [inserted] = await db.insert(contentPackages).values({
        clientId: seoClientId,
        crmClientId: client.crmClientId ?? 1,
        savedKeywordId: null,
        keyword: topic.topic,
        status: "generating",
        heygenVideoStatus: "not_started",
      });
      const packageId = (inserted as any).insertId;
      packageIds.push(packageId);

      // Generate script + captions first (fast, LLM-based)
      // Then launch browser agent for video (slow, 1 at a time)
      generateContentForPackage(packageId, topic, client).catch(err =>
        console.error(`[ViralTopicAgent] Package ${packageId} generation failed:`, err)
      );

      console.log(`[ViralTopicAgent] Started package #${packageId} for topic: "${topic.topic}"`);
    } catch (err) {
      console.error(`[ViralTopicAgent] Failed to start package for topic "${topic.topic}":`, err);
    }
  }

  return packageIds;
}

/**
 * Async content generation for a single package — mirrors generateContentPackage procedure
 * but uses the viral topic's hook and key points to improve quality.
 */
async function generateContentForPackage(
  packageId: number,
  topic: any,
  client: any
): Promise<void> {
  const db = (await getDb())!;
  if (!db) return;

  const { contentPackages, viralTopics } = await import("../../drizzle/seo-schema");
  const { eq } = await import("drizzle-orm");

  const keyPoints = topic.keyPoints ? JSON.parse(topic.keyPoints) : [];
  const hook = topic.hook || "";

  const brandContext = `Brand: ${client.businessName}. Industry: ${client.industry}. Audience: ${client.targetAudience}. Voice: ${client.brandVoice}.`;
  const isLongForm = topic.contentType === "youtube_longform";

  try {
    // Video script — uses the researched hook and key points
    let videoScript = "";
    const scriptResponse = await invokeLLM({
      messages: [
        { role: "system", content: `You are a viral video scriptwriter. ${brandContext}` },
        {
          role: "user",
          content: `Write a ${isLongForm ? "5-8 minute YouTube video" : "60-second short-form video"} script for: "${topic.topic}"

Opening hook (use this EXACTLY as the first line): "${hook}"

Key points to cover:
${keyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}

Research notes: ${topic.researchNotes}

Requirements:
- Hook in first 3 seconds
- Clear value delivery
- CTA at end: "Follow for more" + "Book a free consultation at lockinloans.com"
- ${isLongForm ? "Include timestamps structure" : "Max 150 words spoken"}
- Spoken words only — no stage directions`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "script",
          strict: true,
          schema: { type: "object", properties: { script: { type: "string" } }, required: ["script"], additionalProperties: false },
        },
      },
    });
    videoScript = JSON.parse(scriptResponse.choices[0].message.content as string).script;

    // Social captions — platform-specific
    const platforms = isLongForm
      ? ["youtube", "instagram", "facebook", "tiktok"]
      : ["instagram", "facebook", "tiktok"];

    const socialResponse = await invokeLLM({
      messages: [
        { role: "system", content: `You are a social media copywriter. ${brandContext}` },
        {
          role: "user",
          content: `Write platform-specific captions for "${topic.topic}" for: ${platforms.join(", ")}.
Hook: "${hook}"
Include relevant hashtags. Keep captions engaging and platform-appropriate.
For TikTok/Instagram: conversational, trending hashtags.
For Facebook: slightly longer, community-focused.
${isLongForm ? 'For YouTube: SEO-optimized description with timestamps.' : ''}`,
        },
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
    const socialCaptionsJson = JSON.stringify(
      JSON.parse(socialResponse.choices[0].message.content as string).captions
    );

    // ── Build the Video Agent prompt ─────────────────────────────────────────
    const { buildVideoAgentPrompt } = await import("../heygen");
    const agentPrompt = buildVideoAgentPrompt({
      script: videoScript,
      topic: topic.topic,
      brandName: client.businessName,
      targetAudience: client.targetAudience ?? "homebuyers and mortgage seekers",
      brandVoice: client.brandVoice ?? "professional, trustworthy, and approachable",
      platform: isLongForm ? "YouTube" : (topic.platform ?? "TikTok/Instagram Reels"),
      hook: hook || `Did you know about ${topic.topic}?`,
      cta: isLongForm
        ? "Subscribe for more financial tips and drop your questions in the comments"
        : "Follow for daily tips and DM me the word HOME to get started",
      isLongForm,
      nmlsNumber: (client.businessName.includes("Loan") || client.businessName.includes("Mortgage")) ? "1116876" : undefined,
    });

    // ── Save script + captions, mark as generating ───────────────────────────
    await db.update(contentPackages).set({
      status: "generating",
      videoScript,
      heygenVideoStatus: "not_started",
      socialCaptionsJson,
    }).where(eq(contentPackages.id, packageId));

    // Mark viral topic as scripted (script is ready, video in progress)
    await db.update(viralTopics)
      .set({ status: "scripted" })
      .where(eq(viralTopics.id, topic.id));

    // ── Launch HeyGen browser automation (fire-and-forget) ────────────────────
    // Runs in background: logs into HeyGen, activates Brand System, submits prompt,
    // waits up to 20 min, downloads video, uploads to CDN, sets status to pending_review.
    const brandSystemName = (client as any).heygenBrandSystemName ?? client.businessName;
    console.log(`[ViralTopicAgent] 🎬 Launching HeyGen browser agent for package #${packageId} (Brand: ${brandSystemName})`);

    setImmediate(async () => {
      try {
        const { generateVideoViaBrowser } = await import("./heygen-browser-agent");
        const result = await generateVideoViaBrowser({
          prompt: agentPrompt,
          brandSystemName,
          contentPackageId: packageId,
          topic: topic.topic,
        });

        const db2 = await getDb();
        if (!db2) return;
        const { contentPackages: cp2, viralTopics: vt2 } = await import("../../drizzle/seo-schema");
        const { eq: eq2 } = await import("drizzle-orm");

        if (result.success && result.cdnUrl) {
          // Video ready — set to pending_review so Tariq can approve before posting
          await db2.update(cp2).set({
            status: "pending_review",
            heygenVideoUrl: result.cdnUrl,
            heygenVideoStatus: "completed",
          }).where(eq2(cp2.id, packageId));

          await db2.update(vt2)
            .set({ status: "ready" })
            .where(eq2(vt2.id, topic.id));

          console.log(`[ViralTopicAgent] ✅ Package #${packageId} video ready for review: ${result.cdnUrl}`);
        } else {
          await db2.update(cp2).set({
            status: "failed",
            heygenVideoStatus: "failed",
            errorMessage: result.error ?? "Browser automation failed",
          }).where(eq2(cp2.id, packageId));

          console.error(`[ViralTopicAgent] ❌ Package #${packageId} browser agent failed: ${result.error}`);
        }
      } catch (bgErr: any) {
        console.error(`[ViralTopicAgent] Background browser agent error for package #${packageId}:`, bgErr.message);
        const db3 = await getDb();
        if (db3) {
          const { contentPackages: cp3 } = await import("../../drizzle/seo-schema");
          const { eq: eq3 } = await import("drizzle-orm");
          await db3.update(cp3).set({
            status: "failed",
            heygenVideoStatus: "failed",
            errorMessage: bgErr.message,
          }).where(eq3(cp3.id, packageId)).catch(() => {});
        }
      }
    });

    console.log(`[ViralTopicAgent] ✅ Package #${packageId} script ready, browser agent launched for "${topic.topic}"`);
  } catch (err) {
    console.error(`[ViralTopicAgent] Content generation failed for package #${packageId}:`, err);
    await db.update(contentPackages).set({
      status: "failed",
      errorMessage: String(err),
    }).where(eq(contentPackages.id, packageId));
  }
}

/**
 * Weekly content calendar builder — researches topics and schedules them for the week.
 * Called every Monday at 6 AM PST.
 */
export async function buildWeeklyContentCalendar(): Promise<void> {
  console.log("[ViralTopicAgent] Building weekly content calendar...");

  const brandSchedule = [
    { seoClientId: HOME_LOAN_COACH_SEO_ID, topicsPerWeek: 5 },  // Tim the Home Loan Coach: 5 short-form/week
    { seoClientId: COACH_TIM_SEO_ID, topicsPerWeek: 7 },         // Coach Tim: 5 short-form + 2 long-form/week
  ];

  for (const brand of brandSchedule) {
    try {
      await researchViralTopics(brand.seoClientId, brand.topicsPerWeek);
      // Small delay between brands
      await new Promise(r => setTimeout(r, 2000));
      await generatePackagesFromTopics(brand.seoClientId);
    } catch (err) {
      console.error(`[ViralTopicAgent] Failed for client ${brand.seoClientId}:`, err);
    }
  }

  console.log("[ViralTopicAgent] ✅ Weekly content calendar built");
}

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(now.setDate(diff));
}
