import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getClientByUserId } from "../db";
import { socialPlatformConnections } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

const SUPPORTED_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "google_business",
  "tiktok",
  "youtube",
  "pinterest",
  "threads",
] as const;

type Platform = (typeof SUPPORTED_PLATFORMS)[number];

async function resolveClient(userId: number) {
  const client = await getClientByUserId(userId);
  if (!client) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
  }
  return client;
}

export const socialConnectionsRouter = router({
  // ── List all platform connection statuses for the current client ──────────
  listConnections: protectedProcedure.query(async ({ ctx }) => {
    const client = await resolveClient(ctx.user.id);
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select()
      .from(socialPlatformConnections)
      .where(eq(socialPlatformConnections.clientId, client.id));

    // Fill in any missing platforms with disconnected defaults
    const connected = new Map(rows.map((r) => [r.platform, r]));
    return SUPPORTED_PLATFORMS.map((platform) => {
      const row = connected.get(platform);
      return {
        platform,
        connected: row?.connected ?? false,
        username: row?.username ?? null,
        pageName: row?.pageName ?? null,
        lastSyncAt: row?.lastSyncAt ?? null,
      };
    });
  }),

  // ── Connect a platform (upsert) ───────────────────────────────────────────
  connectPlatform: protectedProcedure
    .input(
      z.object({
        platform: z.enum(SUPPORTED_PLATFORMS),
        username: z.string().optional(),
        pageName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const existing = await db
        .select()
        .from(socialPlatformConnections)
        .where(
          and(
            eq(socialPlatformConnections.clientId, client.id),
            eq(socialPlatformConnections.platform, input.platform)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(socialPlatformConnections)
          .set({
            connected: true,
            username: input.username ?? existing[0].username,
            pageName: input.pageName ?? existing[0].pageName,
            lastSyncAt: new Date(),
          })
          .where(eq(socialPlatformConnections.id, existing[0].id));
      } else {
        await db.insert(socialPlatformConnections).values({
          clientId: client.id,
          platform: input.platform,
          connected: true,
          username: input.username ?? null,
          pageName: input.pageName ?? null,
          lastSyncAt: new Date(),
        });
      }

      return { success: true };
    }),

  // ── Disconnect a platform ─────────────────────────────────────────────────
  disconnectPlatform: protectedProcedure
    .input(z.object({ platform: z.enum(SUPPORTED_PLATFORMS) }))
    .mutation(async ({ ctx, input }) => {
      const client = await resolveClient(ctx.user.id);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      await db
        .update(socialPlatformConnections)
        .set({ connected: false })
        .where(
          and(
            eq(socialPlatformConnections.clientId, client.id),
            eq(socialPlatformConnections.platform, input.platform)
          )
        );

      return { success: true };
    }),

  // ── Generate a social post with AI ───────────────────────────────────────
  generatePost: protectedProcedure
    .input(
      z.object({
        platform: z.enum(SUPPORTED_PLATFORMS),
        topic: z.string().min(3).max(500),
        tone: z.enum(["professional", "friendly", "casual", "urgent", "inspirational"]).default("professional"),
        includeHashtags: z.boolean().default(true),
        includeCta: z.boolean().default(true),
        businessName: z.string().optional(),
        businessType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const PLATFORM_GUIDANCE: Record<Platform, string> = {
        facebook:
          "Facebook post (max 500 chars recommended). Conversational, engaging, may include emojis. End with a clear CTA.",
        instagram:
          "Instagram caption (max 2200 chars, but 125 chars show before 'more'). Engaging hook, storytelling, heavy hashtags (15–30) at end.",
        linkedin:
          "LinkedIn post (max 3000 chars). Professional, insightful, thought-leadership tone. Minimal hashtags (3–5). Line breaks for readability.",
        twitter:
          "X/Twitter post (max 280 chars). Punchy, direct, one key message. 1–2 hashtags max.",
        google_business:
          "Google Business Profile post (max 1500 chars). Informative, local SEO-friendly, include a CTA button label like 'Learn more' or 'Book now'.",
        tiktok:
          "TikTok caption (max 150 chars). Hook-first, trendy, use 3–5 hashtags. Describe the video concept briefly.",
        youtube:
          "YouTube description (first 150 chars visible). Keyword-rich, include timestamps if relevant, links, and CTA to subscribe.",
        pinterest:
          "Pinterest pin description (max 500 chars). Inspirational, keyword-rich for SEO, include a CTA.",
        threads:
          "Threads post (max 500 chars). Conversational, authentic, similar to Twitter but slightly longer.",
      };

      const systemPrompt = `You are an expert social media copywriter specializing in ${input.businessType ?? "professional services"} businesses.
Write platform-optimized posts that drive engagement and conversions.
Always respond with valid JSON matching the schema exactly.`;

      const userPrompt = `Write a ${input.platform} post for a ${input.businessType ?? "business"} called "${input.businessName ?? "the business"}".

Topic: ${input.topic}
Tone: ${input.tone}
Platform guidance: ${PLATFORM_GUIDANCE[input.platform as Platform]}
${input.includeHashtags ? "Include relevant hashtags." : "Do NOT include hashtags."}
${input.includeCta ? "Include a clear call-to-action." : "Do NOT include a CTA."}

Return JSON with:
- caption: the main post text (without hashtags)
- hashtags: string of hashtags (or empty string if not requested)
- cta: the call-to-action text (or empty string if not requested)
- charCount: total character count of caption + hashtags`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "social_post",
            strict: true,
            schema: {
              type: "object",
              properties: {
                caption: { type: "string" },
                hashtags: { type: "string" },
                cta: { type: "string" },
                charCount: { type: "number" },
              },
              required: ["caption", "hashtags", "cta", "charCount"],
              additionalProperties: false,
            },
          },
        },
      });

      const raw = response?.choices?.[0]?.message?.content;
      if (!raw) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });

      try {
        const parsed = JSON.parse(raw);
        return {
          caption: parsed.caption ?? "",
          hashtags: parsed.hashtags ?? "",
          cta: parsed.cta ?? "",
          charCount: parsed.charCount ?? 0,
          platform: input.platform,
        };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse AI response" });
      }
    }),
});
