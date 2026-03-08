import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { invokeLLM } from "../../_core/llm";
import { saveQualityScore, getQualityScore, getContentById } from "../../seo-db";

export const qualityScoreRouter = router({
  analyze: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .mutation(async ({ input }) => {
      const contentData = await getContentById(input.contentId);
      if (!contentData) throw new Error("Content not found");

      const analysisPrompt = `Analyze the following blog post content and provide quality scores. Return a JSON object with these exact fields:
- readabilityScore (0-100): How easy the content is to read (consider sentence length, vocabulary, structure)
- seoScore (0-100): SEO optimization quality (consider keyword usage, headings, meta-friendliness, length)
- toneScore (0-100): Professional tone consistency and appropriateness
- engagementScore (0-100): How engaging and compelling the content is (consider hooks, storytelling, CTAs)
- readabilityDetails: Brief explanation of readability assessment
- seoDetails: Brief explanation of SEO assessment
- toneDetails: Brief explanation of tone assessment
- engagementDetails: Brief explanation of engagement assessment
- suggestions: Array of 3-5 specific improvement suggestions

Title: ${contentData.title}

Content:
${contentData.content.substring(0, 4000)}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a content quality analyst. Analyze content and return structured JSON scores." },
          { role: "user", content: analysisPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "quality_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                readabilityScore: { type: "integer", description: "0-100 readability score" },
                seoScore: { type: "integer", description: "0-100 SEO score" },
                toneScore: { type: "integer", description: "0-100 tone score" },
                engagementScore: { type: "integer", description: "0-100 engagement score" },
                readabilityDetails: { type: "string", description: "Readability analysis details" },
                seoDetails: { type: "string", description: "SEO analysis details" },
                toneDetails: { type: "string", description: "Tone analysis details" },
                engagementDetails: { type: "string", description: "Engagement analysis details" },
                suggestions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Improvement suggestions",
                },
              },
              required: [
                "readabilityScore", "seoScore", "toneScore", "engagementScore",
                "readabilityDetails", "seoDetails", "toneDetails", "engagementDetails",
                "suggestions",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const messageContent = response.choices[0]?.message?.content;
      const analysis = typeof messageContent === "string" ? JSON.parse(messageContent) : {};

      const overallScore = Math.round(
        (analysis.readabilityScore + analysis.seoScore + analysis.toneScore + analysis.engagementScore) / 4
      );

      await saveQualityScore({
        contentId: input.contentId,
        overallScore,
        readabilityScore: analysis.readabilityScore,
        seoScore: analysis.seoScore,
        toneScore: analysis.toneScore,
        engagementScore: analysis.engagementScore,
        readabilityDetails: analysis.readabilityDetails,
        seoDetails: analysis.seoDetails,
        toneDetails: analysis.toneDetails,
        engagementDetails: analysis.engagementDetails,
        suggestions: JSON.stringify(analysis.suggestions),
      });

      return {
        overallScore,
        ...analysis,
      };
    }),

  getScore: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ input }) => {
      return await getQualityScore(input.contentId);
    }),
});
