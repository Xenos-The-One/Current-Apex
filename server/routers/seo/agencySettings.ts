import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { agencySettings } from "../../../drizzle/seo-schema";
import { eq } from "drizzle-orm";

export const agencySettingsRouter = router({
  // Get all settings
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return {};
    const rows = await db.select().from(agencySettings);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.settingKey] = row.settingValue || "";
    }
    return settings;
  }),

  // Update a setting
  update: protectedProcedure
    .input(z.object({
      key: z.string(),
      value: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.insert(agencySettings)
        .values({ settingKey: input.key, settingValue: input.value })
        .onDuplicateKeyUpdate({ set: { settingValue: input.value } });
      
      return { success: true };
    }),

  // Update multiple settings at once
  updateBatch: protectedProcedure
    .input(z.object({
      settings: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      for (const [key, value] of Object.entries(input.settings)) {
        await db.insert(agencySettings)
          .values({ settingKey: key, settingValue: value })
          .onDuplicateKeyUpdate({ set: { settingValue: value } });
      }
      
      return { success: true };
    }),

  // Get default prompt templates
  getPromptTemplates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(agencySettings);
    const templates = rows
      .filter(r => r.settingKey.startsWith("prompt_template_"))
      .map(r => ({
        id: r.settingKey,
        name: r.settingKey.replace("prompt_template_", "").replace(/_/g, " "),
        prompt: r.settingValue || "",
      }));
    return templates;
  }),

  // Save a prompt template
  savePromptTemplate: protectedProcedure
    .input(z.object({
      name: z.string(),
      prompt: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const key = `prompt_template_${input.name.replace(/\s+/g, "_").toLowerCase()}`;
      await db.insert(agencySettings)
        .values({ settingKey: key, settingValue: input.prompt })
        .onDuplicateKeyUpdate({ set: { settingValue: input.prompt } });
      
      return { success: true };
    }),

  // Delete a prompt template
  deletePromptTemplate: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(agencySettings).where(eq(agencySettings.settingKey, input.key));
      return { success: true };
    }),
});
