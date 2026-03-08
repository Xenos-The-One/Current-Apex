import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { designStandards } from "../../../drizzle/seo-schema";
import { eq, desc } from "drizzle-orm";

/**
 * Design Standards Router - manages agency design guidelines for website creation
 */
export const designStandardsRouter = router({
  // Get all design standards
  getAll: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    return db
      .select()
      .from(designStandards)
      .where(eq(designStandards.isActive, 1))
      .orderBy(desc(designStandards.isDefault), desc(designStandards.createdAt));
  }),

  // Get default design standard
  getDefault: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [standard] = await db
      .select()
      .from(designStandards)
      .where(eq(designStandards.isDefault, 1))
      .limit(1);
    return standard || null;
  }),

  // Get design standard by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const [standard] = await db
        .select()
        .from(designStandards)
        .where(eq(designStandards.id, input.id));
      return standard || null;
    }),

  // Create new design standard
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      designPrompt: z.string().min(1),
      referenceUrl: z.string().optional(),
      colorScheme: z.string().optional(),
      designStyle: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(designStandards)
          .set({ isDefault: 0 })
          .where(eq(designStandards.isDefault, 1));
      }

      const [result] = await db.insert(designStandards).values({
        name: input.name,
        description: input.description || null,
        designPrompt: input.designPrompt,
        referenceUrl: input.referenceUrl || null,
        colorScheme: input.colorScheme || null,
        designStyle: input.designStyle || null,
        isDefault: input.isDefault ? 1 : 0,
        createdBy: ctx.user.id,
      });

      return { success: true, id: result.insertId };
    }),

  // Update design standard
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      designPrompt: z.string().min(1).optional(),
      referenceUrl: z.string().optional(),
      colorScheme: z.string().optional(),
      designStyle: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { id, ...updates } = input;

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await db
          .update(designStandards)
          .set({ isDefault: 0 })
          .where(eq(designStandards.isDefault, 1));
      }

      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.designPrompt !== undefined) updateData.designPrompt = updates.designPrompt;
      if (updates.referenceUrl !== undefined) updateData.referenceUrl = updates.referenceUrl;
      if (updates.colorScheme !== undefined) updateData.colorScheme = updates.colorScheme;
      if (updates.designStyle !== undefined) updateData.designStyle = updates.designStyle;
      if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault ? 1 : 0;

      await db
        .update(designStandards)
        .set(updateData)
        .where(eq(designStandards.id, id));

      return { success: true };
    }),

  // Delete design standard
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Soft delete
      await db
        .update(designStandards)
        .set({ isActive: 0 })
        .where(eq(designStandards.id, input.id));

      return { success: true };
    }),

  // Initialize default Takeoff design standard (one-time setup)
  initializeDefault: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Check if default already exists
    const [existing] = await db
      .select()
      .from(designStandards)
      .where(eq(designStandards.isDefault, 1))
      .limit(1);

    if (existing) {
      return { success: false, message: "Default design standard already exists" };
    }

    const takeoffDesignPrompt = `Design: Builds elite, motion-driven website similar to https://takeoffdigitalsolutions.com/home-5234

Instructions:
You are a senior developer and creative director for a luxury web agency.

You build elite, motion-driven, premium websites

NOT generic.
Does NOT produce flat layouts, SaaS templates, or static designs.

────────────────────────
CORE PRINCIPLES
────────────────────────
• Every section must feel like an experience
• Interaction is mandatory (hover, tap, state, swipe, scroll)
• Motion must reinforce value — never decoration
• Visual hierarchy over copy volume
• Premium restraint over hype
• Systems > slogans

────────────────────────
TAKEOFF VISUAL BASELINE
────────────────────────
• Dark layered gradients
• Subtle glassmorphism
• Depth, elevation, and glow used intentionally
• Strong typography hierarchy (700–900)
• Clean spacing, editorial balance
• Confident, calm, authoritative tone

────────────────────────
ALLOWED INTERACTIONS
────────────────────────
• Hover / tap affordances
• Swipeable experiences (especially testimonials)
• State-based transitions
• Sequential step flows
• Live system demos
• Cost-of-inaction visuals
• Subtle momentum and easing
• Cinematic tap-to-expand galleries

────────────────────────
SPECIAL RULE: MARQUEE CAROUSEL (AUTHORITY STRIP)
────────────────────────
Whenever a marquee carousel (Authority Marquee) section is requested, always use the Takeoff signature format as the default baseline. This section is mandatory in every website and may be customized depending on the client, industry, and services. The marquee must include the scrolling track, dark gradient background, minimal typography, and pause-on-hover motion. It represents the Takeoff identity and should never be omitted or replaced with an alternative design. Do not add images to this section.

────────────────────────
SPECIAL RULE: HERO SECTIONS
────────────────────────
Hero sections must include a hero image and exactly two call-to-action buttons. No additional button-like icons are permitted.

────────────────────────
SPECIAL RULE: TESTIMONIAL SECTIONS
────────────────────────
Include a visible 5-star rating and a CTA button labeled 'Leave a Google Review'.

────────────────────────
SPECIAL RULE: SERVICE AREA SECTIONS
────────────────────────
Always request an embedded Google Maps iframe before generating this section.`;

    const [result] = await db.insert(designStandards).values({
      name: "Takeoff Premium Design",
      description: "Elite, motion-driven, premium website design standards based on Takeoff Digital Solutions",
      designPrompt: takeoffDesignPrompt,
      referenceUrl: "https://takeoffdigitalsolutions.com/home-5234",
      colorScheme: "dark",
      designStyle: "motion-driven",
      isDefault: 1,
      createdBy: ctx.user.id,
    });

    return { success: true, id: result.insertId, message: "Default Takeoff design standard initialized" };
  }),
});
