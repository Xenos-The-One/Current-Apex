/**
 * Competitor Keyword Gap Analysis Router
 *
 * Scrapes competitor pages, extracts keywords via AI, diffs against the
 * client's own GSC data, and surfaces gap opportunities with content briefs.
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import {
  competitorKeywords,
  gapAnalysisRuns,
  searchConsoleMetrics,
  seoClients as clients,
} from "../../../drizzle/seo-schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../../_core/llm";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Fetch the visible text content of a URL (basic HTTP fetch + HTML strip) */
async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SEOBot/1.0; +https://takeoffdigital.com.au/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    // Strip tags, scripts, styles — keep visible text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 8000); // Cap at 8k chars to stay within LLM context
    return text;
  } catch (err: any) {
    throw new Error(`Failed to fetch ${url}: ${err.message}`);
  }
}

/** Use AI to extract top keywords from page text */
async function extractKeywordsFromText(
  pageText: string,
  competitorUrl: string
): Promise<
  Array<{
    keyword: string;
    estimatedPosition: number;
    searchVolume: number;
    difficulty: "easy" | "medium" | "hard";
    opportunityScore: number;
  }>
> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an SEO expert. Extract the most important keywords from the provided webpage text. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: `Analyse this webpage content from ${competitorUrl} and extract the top 25 SEO keywords that this page is likely targeting or ranking for.

For each keyword provide:
- keyword: the search term (2-5 words ideally)
- estimatedPosition: estimated Google ranking position (1-50)
- searchVolume: estimated monthly search volume (100-50000)
- difficulty: "easy" (DA<30 sites rank), "medium" (DA 30-60), or "hard" (DA>60 required)
- opportunityScore: 0-100 (higher = better opportunity, consider volume vs difficulty)

Return ONLY a JSON array, no other text:
[{"keyword":"...", "estimatedPosition":5, "searchVolume":1200, "difficulty":"medium", "opportunityScore":72}, ...]

Webpage content:
${pageText}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "keyword_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  keyword: { type: "string" },
                  estimatedPosition: { type: "integer" },
                  searchVolume: { type: "integer" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                  opportunityScore: { type: "integer" },
                },
                required: ["keyword", "estimatedPosition", "searchVolume", "difficulty", "opportunityScore"],
                additionalProperties: false,
              },
            },
          },
          required: ["keywords"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return parsed.keywords ?? [];
  } catch {
    return [];
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

export const keywordGapRouter = router({
  /** List all gap analysis runs for a client */
  listRuns: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      return db
        .select()
        .from(gapAnalysisRuns)
        .where(eq(gapAnalysisRuns.clientId, input.clientId))
        .orderBy(desc(gapAnalysisRuns.createdAt))
        .limit(10);
    }),

  /** Run a new gap analysis for a client against their stored competitor URLs */
  runAnalysis: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        competitorUrls: z.array(z.string().url()).min(1).max(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Create a run record
      const [runResult] = await db.insert(gapAnalysisRuns).values({
        clientId: input.clientId,
        competitorUrls: JSON.stringify(input.competitorUrls),
        status: "running",
        totalGapKeywords: 0,
        createdBy: ctx.user.id,
        createdAt: new Date(),
      });
      const runId = runResult.insertId;

      try {
        // Get client's existing GSC keywords (to find gaps)
        const clientKeywords = await db
          .select({ query: searchConsoleMetrics.query })
          .from(searchConsoleMetrics)
          .where(eq(searchConsoleMetrics.clientId, input.clientId));
        const clientKeywordSet = new Set(
          clientKeywords.map((k) => k.query?.toLowerCase().trim()).filter(Boolean)
        );

        // Clear previous results for this client
        await db
          .delete(competitorKeywords)
          .where(eq(competitorKeywords.clientId, input.clientId));

        let totalGapCount = 0;

        // Process each competitor URL
        for (const url of input.competitorUrls) {
          let pageText: string;
          try {
            pageText = await fetchPageText(url);
          } catch {
            continue; // Skip URLs that fail to fetch
          }

          const extracted = await extractKeywordsFromText(pageText, url);

          // Insert each keyword, marking gaps
          for (const kw of extracted) {
            const isGap = !clientKeywordSet.has(kw.keyword.toLowerCase().trim()) ? 1 : 0;
            if (isGap) totalGapCount++;

            await db.insert(competitorKeywords).values({
              clientId: input.clientId,
              competitorUrl: url,
              keyword: kw.keyword,
              estimatedPosition: kw.estimatedPosition,
              searchVolume: kw.searchVolume,
              difficulty: kw.difficulty,
              opportunityScore: kw.opportunityScore,
              isGap,
              runId,
              createdAt: new Date(),
            });
          }
        }

        // Mark run as complete
        await db
          .update(gapAnalysisRuns)
          .set({
            status: "complete",
            totalGapKeywords: totalGapCount,
            completedAt: new Date(),
          })
          .where(eq(gapAnalysisRuns.id, runId));

        return { success: true, runId, totalGapKeywords: totalGapCount };
      } catch (err: any) {
        await db
          .update(gapAnalysisRuns)
          .set({ status: "error", errorMessage: err.message })
          .where(eq(gapAnalysisRuns.id, runId));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Gap analysis failed: ${err.message}`,
        });
      }
    }),

  /** Get gap keywords for a client (gaps only by default) */
  getGapKeywords: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        gapOnly: z.boolean().default(true),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const conditions = [eq(competitorKeywords.clientId, input.clientId)];
      if (input.gapOnly) conditions.push(eq(competitorKeywords.isGap, 1));
      if (input.difficulty) conditions.push(eq(competitorKeywords.difficulty, input.difficulty));

      const rows = await db
        .select()
        .from(competitorKeywords)
        .where(and(...conditions))
        .orderBy(desc(competitorKeywords.opportunityScore))
        .limit(input.limit);

      return rows;
    }),

  /** Get summary stats for a client's gap analysis */
  getSummary: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [stats] = await db
        .select({
          totalKeywords: sql<number>`COUNT(*)`,
          totalGaps: sql<number>`SUM(CASE WHEN ${competitorKeywords.isGap} = 1 THEN 1 ELSE 0 END)`,
          easyGaps: sql<number>`SUM(CASE WHEN ${competitorKeywords.isGap} = 1 AND ${competitorKeywords.difficulty} = 'easy' THEN 1 ELSE 0 END)`,
          mediumGaps: sql<number>`SUM(CASE WHEN ${competitorKeywords.isGap} = 1 AND ${competitorKeywords.difficulty} = 'medium' THEN 1 ELSE 0 END)`,
          hardGaps: sql<number>`SUM(CASE WHEN ${competitorKeywords.isGap} = 1 AND ${competitorKeywords.difficulty} = 'hard' THEN 1 ELSE 0 END)`,
          avgOpportunityScore: sql<number>`AVG(CASE WHEN ${competitorKeywords.isGap} = 1 THEN ${competitorKeywords.opportunityScore} END)`,
        })
        .from(competitorKeywords)
        .where(eq(competitorKeywords.clientId, input.clientId));

      return {
        totalKeywords: Number(stats?.totalKeywords ?? 0),
        totalGaps: Number(stats?.totalGaps ?? 0),
        easyGaps: Number(stats?.easyGaps ?? 0),
        mediumGaps: Number(stats?.mediumGaps ?? 0),
        hardGaps: Number(stats?.hardGaps ?? 0),
        avgOpportunityScore: Math.round(Number(stats?.avgOpportunityScore ?? 0)),
      };
    }),

  /** Generate an AI content brief for a gap keyword */
  suggestContent: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        keyword: z.string(),
        competitorUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Get client info for context
      const [client] = await db
        .select({ name: clients.name, industry: clients.industry, targetAudience: clients.targetAudience })
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are an expert SEO content strategist. Generate actionable content briefs.",
          },
          {
            role: "user",
            content: `Create a detailed content brief for the keyword "${input.keyword}" for client "${client?.name ?? "our client"}" in the ${client?.industry ?? "business"} industry.

Their competitor at ${input.competitorUrl} ranks for this keyword. We need to create content that outranks them.

Target audience: ${client?.targetAudience ?? "general business audience"}

Provide:
1. Recommended title (H1)
2. Meta description (150-160 chars)
3. Content angle / unique value proposition
4. Suggested H2 headings (5-7)
5. Key points to cover
6. Recommended word count
7. Internal linking opportunities
8. Call to action

Format as clear, actionable sections.`,
          },
        ],
      });

      const rawContent = response.choices?.[0]?.message?.content;
      const brief = typeof rawContent === "string" ? rawContent : "Unable to generate brief.";
      return {
        brief,
        keyword: input.keyword,
        competitorUrl: input.competitorUrl,
      };
    }),
});
