import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { recurringPlans } from "../../../drizzle/seo-schema";
import { getDb } from "../../seo-db";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../../_core/llm";
import { generateImage } from "../../_core/imageGeneration";
import { content } from "../../../drizzle/seo-schema";

export const recurringPlansRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(recurringPlans).where(eq(recurringPlans.createdBy, ctx.user.id));
  }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        planName: z.string().min(1),
        frequency: z.enum(["daily", "weekly", "biweekly", "monthly"]),
        postsPerCycle: z.number().min(1).max(10),
        topicTemplate: z.string().optional(),
        customPrompt: z.string().optional(),
        aiModel: z.string().optional(),
        enableWebResearch: z.boolean().default(true),
        enableImageGeneration: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Duplicate check: same planName (case-insensitive) + same clientId for this user
      const existing = await db
        .select()
        .from(recurringPlans)
        .where(eq(recurringPlans.createdBy, ctx.user.id));
      const nameLower = input.planName.trim().toLowerCase();
      const duplicate = existing.find(
        (p) =>
          p.planName.trim().toLowerCase() === nameLower &&
          p.clientId === input.clientId
      );
      if (duplicate) {
        throw new Error(
          `A plan named "${duplicate.planName}" already exists for this client. Please use a different name or edit the existing plan.`
        );
      }

      // Calculate next run date based on frequency
      const now = new Date();
      const nextRunDate = new Date(now);
      switch (input.frequency) {
        case "daily":
          nextRunDate.setDate(now.getDate() + 1);
          break;
        case "weekly":
          nextRunDate.setDate(now.getDate() + 7);
          break;
        case "biweekly":
          nextRunDate.setDate(now.getDate() + 14);
          break;
        case "monthly":
          nextRunDate.setMonth(now.getMonth() + 1);
          break;
      }

      const result = await db.insert(recurringPlans).values({
        ...input,
        aiModel: input.aiModel || "gemini-2.5-flash",
        enableWebResearch: input.enableWebResearch ? 1 : 0,
        enableImageGeneration: input.enableImageGeneration ? 1 : 0,
        nextRunDate,
        createdBy: ctx.user.id,
      });

      return { success: true, id: result[0].insertId };
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const plan = await db.select().from(recurringPlans).where(eq(recurringPlans.id, input.id)).limit(1);
      if (!plan[0]) throw new Error("Plan not found");

      await db
        .update(recurringPlans)
        .set({ isActive: plan[0].isActive ? 0 : 1 })
        .where(eq(recurringPlans.id, input.id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(recurringPlans).where(eq(recurringPlans.id, input.id));
      return { success: true };
    }),

  runNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const plan = await db.select().from(recurringPlans).where(eq(recurringPlans.id, input.id)).limit(1);
      if (!plan[0]) throw new Error("Plan not found");

      const planData = plan[0];

      // Generate topics based on template
      const topics: string[] = [];
      if (planData.topicTemplate) {
        // Use AI to generate specific topics from template
        const topicPrompt = `Generate ${planData.postsPerCycle} unique blog post topics based on this template: "${planData.topicTemplate}". Return only the topics, one per line.`;
        const topicResponse = await invokeLLM({
          messages: [{ role: "user", content: topicPrompt }],
        });
        const topicContent = topicResponse.choices[0]?.message?.content;
        const topicText = typeof topicContent === 'string' ? topicContent : '';
        const generatedTopics = topicText.split("\n").filter((t: string) => t.trim());
        topics.push(...generatedTopics.slice(0, planData.postsPerCycle));
      } else {
        // Generate generic topics
        for (let i = 0; i < planData.postsPerCycle; i++) {
          topics.push(`Blog Post ${i + 1} - ${new Date().toLocaleDateString()}`);
        }
      }

      // Generate content for each topic
      for (const topic of topics) {
        let blogContent = "";
        let imageUrl: string | null = null;

        // Generate blog content
        const contentPrompt = planData.customPrompt
          ? `${planData.customPrompt}\n\nTopic: ${topic}`
          : `Write a comprehensive, SEO-optimized blog post about: ${topic}`;

        const contentResponse = await invokeLLM({
          messages: [{ role: "user", content: contentPrompt }],
        });
        const messageContent = contentResponse.choices[0]?.message?.content;
        blogContent = typeof messageContent === 'string' ? messageContent : '';

        // Generate image if enabled
        if (planData.enableImageGeneration) {
          try {
            const imageResult = await generateImage({
              prompt: `Professional blog featured image for: ${topic}`,
            });
            imageUrl = imageResult.url || null;
          } catch (error) {
            console.error("Image generation failed:", error);
          }
        }

        // Save content to database
        await db.insert(content).values({
          clientId: planData.clientId,
          topic,
          title: topic,
          content: blogContent,
          status: "draft",
          imageUrl,
          aiModel: "gpt-4o",
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          createdBy: ctx.user.id,
        });
      }

      // Update last run date and calculate next run
      const now = new Date();
      const nextRunDate = new Date(now);
      switch (planData.frequency) {
        case "daily":
          nextRunDate.setDate(now.getDate() + 1);
          break;
        case "weekly":
          nextRunDate.setDate(now.getDate() + 7);
          break;
        case "biweekly":
          nextRunDate.setDate(now.getDate() + 14);
          break;
        case "monthly":
          nextRunDate.setMonth(now.getMonth() + 1);
          break;
      }

      await db
        .update(recurringPlans)
        .set({ lastRunDate: now, nextRunDate })
        .where(eq(recurringPlans.id, input.id));

      return { success: true, generatedCount: topics.length };
    }),
});
