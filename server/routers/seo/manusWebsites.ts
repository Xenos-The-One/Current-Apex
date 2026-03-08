import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { manusWebsites, manusPublishHistory, content } from "../../../drizzle/seo-schema";
import { eq, and, desc } from "drizzle-orm";
import { createManusWebProject, getManusWebProject, publishToManusWebsite } from "../../_core/manusWebdev";

/**
 * Manus Websites Router - handles Manus website creation and content publishing
 */
export const manusWebsitesRouter = router({
  // Get all Manus websites for a client
  getWebsites: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return db
        .select()
        .from(manusWebsites)
        .where(eq(manusWebsites.clientId, input.clientId))
        .orderBy(desc(manusWebsites.createdAt));
    }),

  // Create a new Manus website for a client
  createWebsite: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      projectName: z.string().min(1),
      projectTitle: z.string().min(1),
      projectDescription: z.string().optional(),
      template: z.enum(["web-static", "web-db-user"]).default("web-static"),
      features: z.array(z.string()).optional(),
      designStandardId: z.number().optional(), // Optional design standard to apply
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Create the Manus web project via API
        const projectInfo = await createManusWebProject({
          name: input.projectName,
          title: input.projectTitle,
          description: input.projectDescription,
          template: input.template,
          features: input.features,
        });

        // Store in database
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const [website] = await db.insert(manusWebsites).values({
          clientId: input.clientId,
          projectId: projectInfo.projectId,
          versionId: projectInfo.versionId,
          projectName: input.projectName,
          projectTitle: input.projectTitle,
          projectDescription: input.projectDescription || null,
          previewUrl: projectInfo.url,
          template: input.template,
          features: JSON.stringify(input.features || []),
          status: "active",
          createdBy: ctx.user.id,
        });

        return {
          success: true,
          id: website.insertId,
          projectId: projectInfo.projectId,
          url: projectInfo.url,
          message: "Manus website created successfully!",
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to create website",
        };
      }
    }),

  // Update website information
  updateWebsite: protectedProcedure
    .input(z.object({
      id: z.number(),
      projectTitle: z.string().min(1).optional(),
      projectDescription: z.string().optional(),
      customDomain: z.string().optional(),
      publishedUrl: z.string().optional(),
      isActive: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const { id, ...updates } = input;
      await db
        .update(manusWebsites)
        .set(updates)
        .where(eq(manusWebsites.id, id));
      
      return { success: true };
    }),

  // Delete/archive a website
  deleteWebsite: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // Soft delete by setting isActive to 0
      await db
        .update(manusWebsites)
        .set({ isActive: 0, status: "archived" })
        .where(eq(manusWebsites.id, input.id));
      
      return { success: true };
    }),

  // Refresh website status from Manus API
  refreshWebsite: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get website from database
        const [website] = await db
          .select()
          .from(manusWebsites)
          .where(eq(manusWebsites.id, input.id));

        if (!website) {
          throw new Error('Website not found');
        }

        // Get latest info from Manus API
        const projectInfo = await getManusWebProject(website.projectId);

        // Update database
        await db
          .update(manusWebsites)
          .set({
            versionId: projectInfo.versionId,
            previewUrl: projectInfo.url,
            status: projectInfo.status as "creating" | "active" | "error" | "archived",
          })
          .where(eq(manusWebsites.id, input.id));

        return {
          success: true,
          projectInfo,
        };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Failed to refresh website",
        };
      }
    }),

  // Publish content to a Manus website
  publishToManus: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      websiteId: z.number(),
      slug: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        // Get content
        const [contentData] = await db
          .select()
          .from(content)
          .where(eq(content.id, input.contentId));

        if (!contentData) {
          throw new Error('Content not found');
        }

        // Get website
        const [website] = await db
          .select()
          .from(manusWebsites)
          .where(eq(manusWebsites.id, input.websiteId));

        if (!website) {
          throw new Error('Website not found');
        }

        // Publish to Manus website
        const result = await publishToManusWebsite({
          projectId: website.projectId,
          title: contentData.title,
          content: contentData.content,
          slug: input.slug,
        });

        // Record publish history
        const db2 = await getDb();
        if (db2) {
          await db2.insert(manusPublishHistory).values({
            contentId: input.contentId,
            websiteId: input.websiteId,
            publishedUrl: result.url || null,
            slug: input.slug || null,
            success: result.success ? 1 : 0,
            errorMessage: result.success ? null : result.message,
            publishedBy: ctx.user.id,
          });

          // Update website last deployed timestamp if successful
          if (result.success) {
            await db2
              .update(manusWebsites)
              .set({ lastDeployedAt: new Date() })
              .where(eq(manusWebsites.id, input.websiteId));
          }
        }

        return result;
      } catch (error) {
        const db3 = await getDb();
        if (db3) {
          // Record failed publish attempt
          await db3.insert(manusPublishHistory).values({
            contentId: input.contentId,
            websiteId: input.websiteId,
            success: 0,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            publishedBy: ctx.user.id,
          });
        }

        return {
          success: false,
          message: error instanceof Error ? error.message : 'Publishing failed',
        };
      }
    }),

  // Get publish history for content
  getPublishHistory: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      return db
        .select({
          id: manusPublishHistory.id,
          websiteId: manusPublishHistory.websiteId,
          publishedUrl: manusPublishHistory.publishedUrl,
          slug: manusPublishHistory.slug,
          success: manusPublishHistory.success,
          errorMessage: manusPublishHistory.errorMessage,
          publishedAt: manusPublishHistory.publishedAt,
          projectName: manusWebsites.projectName,
          projectTitle: manusWebsites.projectTitle,
          previewUrl: manusWebsites.previewUrl,
        })
        .from(manusPublishHistory)
        .leftJoin(
          manusWebsites,
          eq(manusPublishHistory.websiteId, manusWebsites.id)
        )
        .where(eq(manusPublishHistory.contentId, input.contentId))
        .orderBy(desc(manusPublishHistory.publishedAt));
    }),
});
