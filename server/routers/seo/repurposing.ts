import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { createRepurposedContent, getRepurposedContent, deleteRepurposedContent } from "../../seo-db";
import { invokeLLM } from "../../_core/llm";

export const repurposingRouter = router({
  generateRepurposed: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      format: z.enum(["social-snippet", "email-summary", "short-form", "infographic-script", "video-script"]),
      originalContent: z.string(),
      platform: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const prompts: { [key: string]: string } = {
        "social-snippet": "Create a concise, engaging social media post (max 280 characters) based on this content. Make it shareable and include relevant hashtags.",
        "email-summary": "Create a compelling email summary (2-3 paragraphs) that captures the key points of this content and encourages readers to click through.",
        "short-form": "Create a short-form version (100-150 words) of this content suitable for quick reading on mobile devices.",
        "infographic-script": "Create a script for an infographic that visualizes the key points of this content. Include section titles and bullet points.",
        "video-script": "Create a video script (2-3 minutes) based on this content. Include an engaging intro, main points, and a call-to-action.",
      };

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a content repurposing expert." },
          { role: "user", content: `${prompts[input.format]}\n\nOriginal content:\n${input.originalContent}` },
        ],
      });

      const repurposedText = response.choices[0]?.message?.content || "";

      const repurposedId = await createRepurposedContent({
        contentId: input.contentId,
        format: input.format,
        content: repurposedText,
        platform: input.platform || null,
        createdBy: ctx.user.id,
      });

      return { id: repurposedId, content: repurposedText };
    }),

  getRepurposed: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ input }) => {
      return await getRepurposedContent(input.contentId);
    }),

  deleteRepurposed: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteRepurposedContent(input.id);
      return { success: true };
    }),
});
