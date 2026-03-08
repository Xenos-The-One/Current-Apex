import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../../_core/llm";
import { getContentById } from "../../seo-db";
import axios from "axios";

/** Fetch a URL and extract basic on-page SEO signals */
async function crawlUrl(url: string) {
  const res = await axios.get(url, {
    timeout: 12000,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SEOCrawler/1.0)" },
    maxRedirects: 5,
    responseType: "text",
  });
  const html: string = res.data as string;

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : "";

  // Meta description
  const metaDescMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : "";

  // Meta keywords
  const metaKwMatch = html.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']*)["']/i);
  const metaKeywords = metaKwMatch ? metaKwMatch[1].trim() : "";

  // Headings
  const h1s = (html.match(/<h1[^>]*>[^<]*<\/h1>/gi) || []).map(h => h.replace(/<[^>]+>/g, "").trim());
  const h2s = (html.match(/<h2[^>]*>[^<]*<\/h2>/gi) || []).map(h => h.replace(/<[^>]+>/g, "").trim());
  const h3s = (html.match(/<h3[^>]*>[^<]*<\/h3>/gi) || []).map(h => h.replace(/<[^>]+>/g, "").trim());

  // Body text
  // Extract body text by stripping all tags (no dotall needed)
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  // Images
  const imgTags = html.match(/<img[^>]+>/gi) || [];
  const imgWithoutAlt = imgTags.filter(img => !/alt=["'][^"']+["']/i.test(img)).length;

  // Links
  let origin = "";
  try { origin = new URL(url).origin; } catch {}
  const internalLinks = origin
    ? (html.match(new RegExp(`href=["']${origin}[^"']*`, "gi")) || []).length
    : 0;
  const externalLinks = (html.match(/href=["']https?:\/\//gi) || []).length - internalLinks;

  // Canonical & robots
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const robotsMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);

  // Open Graph
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);

  return {
    url,
    pageTitle,
    metaDescription,
    metaKeywords,
    h1s,
    h2s,
    h3s,
    wordCount,
    imgCount: imgTags.length,
    imgWithoutAlt,
    internalLinks,
    externalLinks: Math.max(0, externalLinks),
    canonical: canonicalMatch ? canonicalMatch[1] : "",
    robots: robotsMatch ? robotsMatch[1] : "",
    ogTitle: ogTitleMatch ? ogTitleMatch[1] : "",
    ogDescription: ogDescMatch ? ogDescMatch[1] : "",
    ogImage: ogImageMatch ? ogImageMatch[1] : "",
    bodyTextSnippet: bodyText.slice(0, 3000),
  };
}

export const seoAuditRouter = router({
  // Run a full SEO audit on content using AI
  analyze: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      targetKeywords: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const content = await getContentById(input.contentId);
      if (!content) throw new Error("Content not found");

      const contentText = content.content || "";
      const title = content.title || "";
      const topic = content.topic || "";

      // Basic text analysis (no AI needed)
      const wordCount = contentText.split(/\s+/).filter(Boolean).length;
      const sentenceCount = contentText.split(/[.!?]+/).filter(Boolean).length;
      const paragraphCount = contentText.split(/\n\n+/).filter(Boolean).length;
      const avgWordsPerSentence = sentenceCount > 0 ? Math.round(wordCount / sentenceCount) : 0;

      // Heading analysis
      const h1Matches = contentText.match(/^#\s+.+$/gm) || [];
      const h2Matches = contentText.match(/^##\s+.+$/gm) || [];
      const h3Matches = contentText.match(/^###\s+.+$/gm) || [];
      const headingCount = h1Matches.length + h2Matches.length + h3Matches.length;

      // Link analysis
      const internalLinks = (contentText.match(/\[.*?\]\(\/.*?\)/g) || []).length;
      const externalLinks = (contentText.match(/\[.*?\]\(https?:\/\/.*?\)/g) || []).length;

      // Image analysis
      const imageCount = (contentText.match(/!\[.*?\]\(.*?\)/g) || []).length;

      // Keyword analysis
      const keywords = input.targetKeywords || [topic];
      const keywordAnalysis = keywords.map(kw => {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = contentText.match(regex) || [];
        const count = matches.length;
        const density = wordCount > 0 ? ((count / wordCount) * 100).toFixed(2) : "0";
        const inTitle = title.toLowerCase().includes(kw.toLowerCase());
        const inFirstParagraph = contentText.split(/\n\n/)[0]?.toLowerCase().includes(kw.toLowerCase()) || false;
        const inHeadings = [...h1Matches, ...h2Matches, ...h3Matches].some(h => h.toLowerCase().includes(kw.toLowerCase()));

        return {
          keyword: kw,
          count,
          density: parseFloat(density),
          inTitle,
          inFirstParagraph,
          inHeadings,
        };
      });

      // AI-powered deep analysis
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert SEO analyst. Analyze the following blog content and provide a detailed SEO audit. Return your analysis as JSON with this exact structure:
{
  "overallScore": <number 0-100>,
  "readabilityScore": <number 0-100>,
  "seoScore": <number 0-100>,
  "contentQualityScore": <number 0-100>,
  "technicalSeoScore": <number 0-100>,
  "metaDescription": "<suggested meta description under 160 chars>",
  "suggestedTitle": "<SEO-optimized title suggestion>",
  "issues": [
    {"severity": "critical|warning|info", "category": "keyword|structure|readability|technical|content", "message": "<description>", "suggestion": "<how to fix>"}
  ],
  "strengths": ["<list of things done well>"],
  "improvements": ["<prioritized list of improvements>"]
}`
          },
          {
            role: "user",
            content: `Title: ${title}\nTopic: ${topic}\nTarget Keywords: ${keywords.join(", ")}\n\nContent:\n${contentText.substring(0, 8000)}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "seo_audit",
            strict: true,
            schema: {
              type: "object",
              properties: {
                overallScore: { type: "number" },
                readabilityScore: { type: "number" },
                seoScore: { type: "number" },
                contentQualityScore: { type: "number" },
                technicalSeoScore: { type: "number" },
                metaDescription: { type: "string" },
                suggestedTitle: { type: "string" },
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      severity: { type: "string" },
                      category: { type: "string" },
                      message: { type: "string" },
                      suggestion: { type: "string" },
                    },
                    required: ["severity", "category", "message", "suggestion"],
                    additionalProperties: false,
                  }
                },
                strengths: { type: "array", items: { type: "string" } },
                improvements: { type: "array", items: { type: "string" } },
              },
              required: ["overallScore", "readabilityScore", "seoScore", "contentQualityScore", "technicalSeoScore", "metaDescription", "suggestedTitle", "issues", "strengths", "improvements"],
              additionalProperties: false,
            }
          }
        }
      });

      let aiAnalysis;
      try {
        aiAnalysis = JSON.parse((response.choices[0].message.content as string) || "{}");
      } catch {
        aiAnalysis = {
          overallScore: 0,
          readabilityScore: 0,
          seoScore: 0,
          contentQualityScore: 0,
          technicalSeoScore: 0,
          metaDescription: "",
          suggestedTitle: "",
          issues: [],
          strengths: [],
          improvements: [],
        };
      }

      return {
        contentId: input.contentId,
        title,
        topic,
        metrics: {
          wordCount,
          sentenceCount,
          paragraphCount,
          avgWordsPerSentence,
          headingCount,
          h1Count: h1Matches.length,
          h2Count: h2Matches.length,
          h3Count: h3Matches.length,
          internalLinks,
          externalLinks,
          imageCount,
          readingTime: Math.ceil(wordCount / 200),
        },
        keywordAnalysis,
        aiAnalysis,
      };
    }),

  /** Live crawl a public URL and run AI-powered on-page SEO analysis */
  liveCrawl: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      targetKeywords: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      // Crawl the page
      let crawled;
      try {
        crawled = await crawlUrl(input.url);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Could not fetch the URL. ${msg}`);
      }

      const keywords = input.targetKeywords?.length ? input.targetKeywords : [];

      // Keyword analysis against body text
      const keywordAnalysis = keywords.map(kw => {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        const matches = crawled.bodyTextSnippet.match(regex) || [];
        const count = matches.length;
        const density = crawled.wordCount > 0 ? ((count / crawled.wordCount) * 100).toFixed(2) : "0";
        return {
          keyword: kw,
          count,
          density: parseFloat(density),
          inTitle: crawled.pageTitle.toLowerCase().includes(kw.toLowerCase()),
          inFirstParagraph: crawled.bodyTextSnippet.slice(0, 500).toLowerCase().includes(kw.toLowerCase()),
          inHeadings: [...crawled.h1s, ...crawled.h2s, ...crawled.h3s].some(h => h.toLowerCase().includes(kw.toLowerCase())),
        };
      });

      // AI analysis of the crawled content
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert SEO analyst. Analyze the following live webpage data and return a JSON SEO audit with this exact structure:
{
  "overallScore": <number 0-100>,
  "readabilityScore": <number 0-100>,
  "seoScore": <number 0-100>,
  "contentQualityScore": <number 0-100>,
  "technicalSeoScore": <number 0-100>,
  "metaDescription": "<suggested meta description under 160 chars>",
  "suggestedTitle": "<SEO-optimized title suggestion>",
  "issues": [{"severity": "critical|warning|info", "category": "keyword|structure|readability|technical|content", "message": "<description>", "suggestion": "<how to fix>"}],
  "strengths": ["<things done well>"],
  "improvements": ["<prioritized improvements>"]
}`,
          },
          {
            role: "user",
            content: `URL: ${input.url}
Page Title: ${crawled.pageTitle}
Meta Description: ${crawled.metaDescription || "(missing)"}
Meta Keywords: ${crawled.metaKeywords || "(none)"}
H1s: ${crawled.h1s.join(" | ") || "(none)"}
H2s: ${crawled.h2s.slice(0, 8).join(" | ") || "(none)"}
H3s: ${crawled.h3s.slice(0, 8).join(" | ") || "(none)"}
Word Count: ${crawled.wordCount}
Images: ${crawled.imgCount} total, ${crawled.imgWithoutAlt} missing alt text
Internal Links: ${crawled.internalLinks}
External Links: ${crawled.externalLinks}
Canonical: ${crawled.canonical || "(not set)"}
Robots: ${crawled.robots || "(not set)"}
OG Title: ${crawled.ogTitle || "(not set)"}
Target Keywords: ${keywords.join(", ") || "(none specified)"}

Body Text Snippet:
${crawled.bodyTextSnippet}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "live_seo_audit",
            strict: true,
            schema: {
              type: "object",
              properties: {
                overallScore: { type: "number" },
                readabilityScore: { type: "number" },
                seoScore: { type: "number" },
                contentQualityScore: { type: "number" },
                technicalSeoScore: { type: "number" },
                metaDescription: { type: "string" },
                suggestedTitle: { type: "string" },
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      severity: { type: "string" },
                      category: { type: "string" },
                      message: { type: "string" },
                      suggestion: { type: "string" },
                    },
                    required: ["severity", "category", "message", "suggestion"],
                    additionalProperties: false,
                  },
                },
                strengths: { type: "array", items: { type: "string" } },
                improvements: { type: "array", items: { type: "string" } },
              },
              required: ["overallScore", "readabilityScore", "seoScore", "contentQualityScore", "technicalSeoScore", "metaDescription", "suggestedTitle", "issues", "strengths", "improvements"],
              additionalProperties: false,
            },
          },
        },
      });

      let aiAnalysis;
      try {
        aiAnalysis = JSON.parse((response.choices[0].message.content as string) || "{}");
      } catch {
        aiAnalysis = {
          overallScore: 0, readabilityScore: 0, seoScore: 0,
          contentQualityScore: 0, technicalSeoScore: 0,
          metaDescription: "", suggestedTitle: "", issues: [], strengths: [], improvements: [],
        };
      }

      return {
        url: input.url,
        crawled,
        metrics: {
          wordCount: crawled.wordCount,
          headingCount: crawled.h1s.length + crawled.h2s.length + crawled.h3s.length,
          h1Count: crawled.h1s.length,
          h2Count: crawled.h2s.length,
          h3Count: crawled.h3s.length,
          internalLinks: crawled.internalLinks,
          externalLinks: crawled.externalLinks,
          imageCount: crawled.imgCount,
          imgWithoutAlt: crawled.imgWithoutAlt,
          readingTime: Math.ceil(crawled.wordCount / 200),
          hasMetaDescription: !!crawled.metaDescription,
          hasCanonical: !!crawled.canonical,
          hasOgTags: !!(crawled.ogTitle || crawled.ogDescription),
        },
        keywordAnalysis,
        aiAnalysis,
      };
    }),
});
