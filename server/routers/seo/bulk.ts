import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { createContent } from "../../seo-db";
import { invokeLLM } from "../../_core/llm";
import { generateImage } from "../../_core/imageGeneration";

export const bulkRouter = router({
  generate: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      topics: z.array(z.string().min(1)).min(1),
      customPrompt: z.string().optional(),
      shouldGenerateImage: z.boolean().default(true),
      enableWebResearch: z.boolean().default(true),
      aiModel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { clientId, topics, customPrompt, shouldGenerateImage, enableWebResearch, aiModel } = input;
      const results: any[] = [];

      for (const topic of topics) {
        try {
          let inputTokens = 0;
          let outputTokens = 0;
          let urlsFetched = 0;
          let urlsFailed = 0;
          let webSearches = 0;
          let researchContext = "";

          if (enableWebResearch) {
            try {
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
                const searchResults = searchResponse.data.results;
                for (const result of searchResults.slice(0, 3)) {
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

          const systemPrompt = customPrompt || "You are an expert SEO content writer. Create engaging, well-structured blog posts that are informative and optimized for search engines.";
          const userPrompt = `Write a comprehensive blog post about: ${topic}${researchContext ? `\n\nUse this research context:\n${researchContext}` : ""}`;

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

          const lines = generatedContent.split("\n").filter((l: string) => l.trim());
          const title = lines[0]?.replace(/^#\s*/, "").substring(0, 500) || topic;

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
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            urlsFetched,
            urlsFailed,
            webSearches,
          });

          results.push({ topic, success: true, contentId });
        } catch (error) {
          results.push({ topic, success: false, error: String(error) });
        }
      }

      return { results, totalGenerated: results.filter((r: any) => r.success).length };
    }),
});
