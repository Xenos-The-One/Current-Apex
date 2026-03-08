import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { createTemplate, getTemplatesByUser, deleteTemplate } from "../../seo-db";
import { eq } from "drizzle-orm";

export const templatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getTemplatesByUser(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.enum(["product-review", "how-to", "listicle", "case-study", "comparison", "tutorial", "news", "opinion", "custom"]),
      prompt: z.string().min(1),
      structure: z.string().optional(),
      isPublic: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const templateId = await createTemplate({
        name: input.name,
        description: input.description || null,
        category: input.category,
        prompt: input.prompt,
        structure: input.structure || null,
        createdBy: ctx.user.id,
        isPublic: input.isPublic,
      });
      return { id: templateId };
    }),

  seedDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { defaultTemplates } = await import("../../templateSeeds");
      const { getDb } = await import("../../seo-db");
      const { contentTemplates } = await import("../../../drizzle/seo-schema");
      
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if templates already exist
      const existing = await db.select().from(contentTemplates).where(eq(contentTemplates.createdBy, ctx.user.id));
      if (existing.length > 0) {
        return { message: "Templates already seeded", count: 0 };
      }

      // Insert all default templates
      for (const template of defaultTemplates) {
        await createTemplate({
          ...template,
          createdBy: ctx.user.id,
          isPublic: 0,
        });
      }

      return { message: "Default templates added", count: defaultTemplates.length };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTemplate(input.id);
      return { success: true };
    }),
});
