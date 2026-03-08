import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../../_core/llm";
import { getDb } from "../../seo-db";
import { seoClients as clients } from "../../../drizzle/seo-schema";

export const aiClientSuggestionsRouter = router({
  /**
   * Generate AI-suggested potential clients based on the agency's existing client base
   * and a user-provided niche/industry description.
   */
  suggest: protectedProcedure
    .input(
      z.object({
        niche: z.string().min(2).max(200),
        location: z.string().optional(),
        count: z.number().min(1).max(10).default(5),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      const existingClients = await db!.select({ name: clients.name, company: clients.company, industry: clients.industry }).from(clients).limit(20);

      const existingContext =
        existingClients.length > 0
          ? `Current agency clients include: ${existingClients.map((c: any) => `${c.name}${c.company ? ` (${c.company})` : ""}${c.industry ? ` in ${c.industry}` : ""}`).join(", ")}.`
          : "The agency has no existing clients yet.";

      const locationContext = input.location ? ` Focus on businesses in or near ${input.location}.` : "";

      const prompt = `You are an expert business development consultant for a digital marketing agency specializing in AI-powered SEO and content creation.

${existingContext}

The agency wants to expand into the following niche: "${input.niche}".${locationContext}

Generate ${input.count} specific, realistic potential client suggestions for this agency. For each suggestion, provide:
1. A realistic business name
2. The type of business / industry
3. Why they would benefit from AI SEO content services
4. An estimated monthly budget range (USD)
5. A short outreach pitch (1-2 sentences)

Return a JSON array with exactly ${input.count} objects. Each object must have these exact fields:
- businessName (string)
- industry (string)
- reason (string, 1 sentence)
- budgetRange (string, e.g. "$1,500 – $3,000/mo")
- pitch (string, 1-2 sentences)
- matchScore (number 1-100, how well they fit the agency's profile)`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a business development expert. Always respond with valid JSON only, no markdown." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "client_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                suggestions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      businessName: { type: "string" },
                      industry: { type: "string" },
                      reason: { type: "string" },
                      budgetRange: { type: "string" },
                      pitch: { type: "string" },
                      matchScore: { type: "number" },
                    },
                    required: ["businessName", "industry", "reason", "budgetRange", "pitch", "matchScore"],
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

      const rawContent = response.choices?.[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

      const parsed = JSON.parse(content);
      return parsed.suggestions as Array<{
        businessName: string;
        industry: string;
        reason: string;
        budgetRange: string;
        pitch: string;
        matchScore: number;
      }>;
    }),
});
