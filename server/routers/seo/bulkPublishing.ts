import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { content, wordpressConnections, manusWebsites, wordpressPublishHistory, manusPublishHistory } from "../../../drizzle/seo-schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Bulk Publishing Router - handles publishing content to multiple platforms simultaneously
 */
export const bulkPublishingRouter = router({
  // Publish content to multiple WordPress sites and Manus websites
  publishToMultiplePlatforms: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      wordpressConnectionIds: z.array(z.number()).optional(),
      wordpressStatus: z.enum(["draft", "publish", "pending"]).default("draft"),
      manusWebsiteIds: z.array(z.number()).optional(),
      manusSlug: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
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

      const results = {
        wordpress: [] as Array<{ connectionId: number; siteName: string; success: boolean; message: string; url?: string }>,
        manus: [] as Array<{ websiteId: number; projectTitle: string; success: boolean; message: string; url?: string }>,
      };

      // Publish to WordPress sites
      if (input.wordpressConnectionIds && input.wordpressConnectionIds.length > 0) {
        const connections = await db
          .select()
          .from(wordpressConnections)
          .where(inArray(wordpressConnections.id, input.wordpressConnectionIds));

        for (const connection of connections) {
          try {
            // Build WordPress REST API URL
            const apiUrl = `${connection.siteUrl}/wp-json/wp/v2/posts`;

            // Convert markdown to HTML (basic conversion)
            const htmlContent = contentData.content
              .replace(/^### (.*$)/gim, '<h3>$1</h3>')
              .replace(/^## (.*$)/gim, '<h2>$1</h2>')
              .replace(/^# (.*$)/gim, '<h1>$1</h1>')
              .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/gim, '<em>$1</em>')
              .replace(/\n\n/g, '</p><p>')
              .replace(/\n/g, '<br/>');

            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${connection.username}:${connection.applicationPassword}`).toString('base64')}`,
              },
              body: JSON.stringify({
                title: contentData.title,
                content: `<p>${htmlContent}</p>`,
                status: input.wordpressStatus,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              results.wordpress.push({
                connectionId: connection.id,
                siteName: connection.siteName,
                success: true,
                message: 'Published successfully',
                url: data.link,
              });

              // Record success
              await db.insert(wordpressPublishHistory).values({
                contentId: input.contentId,
                connectionId: connection.id,
                wordpressPostId: data.id,
                wordpressPostUrl: data.link,
                publishStatus: input.wordpressStatus,
                success: 1,
                publishedBy: ctx.user.id,
              });
            } else {
              const errorText = await response.text();
              results.wordpress.push({
                connectionId: connection.id,
                siteName: connection.siteName,
                success: false,
                message: `Failed: ${response.status} - ${errorText}`,
              });

              // Record failure
              await db.insert(wordpressPublishHistory).values({
                contentId: input.contentId,
                connectionId: connection.id,
                wordpressPostId: 0, // No post ID on failure
                publishStatus: input.wordpressStatus,
                success: 0,
                errorMessage: errorText,
                publishedBy: ctx.user.id,
              });
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.wordpress.push({
              connectionId: connection.id,
              siteName: connection.siteName,
              success: false,
              message: errorMessage,
            });

            // Record failure
            await db.insert(wordpressPublishHistory).values({
              contentId: input.contentId,
              connectionId: connection.id,
              wordpressPostId: 0, // No post ID on failure
              publishStatus: input.wordpressStatus,
              success: 0,
              errorMessage,
              publishedBy: ctx.user.id,
            });
          }
        }
      }

      // Publish to Manus websites
      if (input.manusWebsiteIds && input.manusWebsiteIds.length > 0) {
        const websites = await db
          .select()
          .from(manusWebsites)
          .where(inArray(manusWebsites.id, input.manusWebsiteIds));

        // Import publishToManusWebsite dynamically to avoid circular dependencies
        const { publishToManusWebsite } = await import("../../_core/manusWebdev");

        for (const website of websites) {
          try {
            const result = await publishToManusWebsite({
              projectId: website.projectId,
              title: contentData.title,
              content: contentData.content,
              slug: input.manusSlug,
            });

            results.manus.push({
              websiteId: website.id,
              projectTitle: website.projectTitle,
              success: result.success,
              message: result.message,
              url: result.url,
            });

            // Record publish attempt
            await db.insert(manusPublishHistory).values({
              contentId: input.contentId,
              websiteId: website.id,
              publishedUrl: result.url || null,
              slug: input.manusSlug || null,
              success: result.success ? 1 : 0,
              errorMessage: result.success ? null : result.message,
              publishedBy: ctx.user.id,
            });

            // Update website last deployed timestamp if successful
            if (result.success) {
              await db
                .update(manusWebsites)
                .set({ lastDeployedAt: new Date() })
                .where(eq(manusWebsites.id, website.id));
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.manus.push({
              websiteId: website.id,
              projectTitle: website.projectTitle,
              success: false,
              message: errorMessage,
            });

            // Record failure
            await db.insert(manusPublishHistory).values({
              contentId: input.contentId,
              websiteId: website.id,
              success: 0,
              errorMessage,
              publishedBy: ctx.user.id,
            });
          }
        }
      }

      // Calculate summary
      const wordpressSuccess = results.wordpress.filter(r => r.success).length;
      const wordpressTotal = results.wordpress.length;
      const manusSuccess = results.manus.filter(r => r.success).length;
      const manusTotal = results.manus.length;

      return {
        success: (wordpressSuccess + manusSuccess) > 0,
        results,
        summary: {
          wordpress: { success: wordpressSuccess, total: wordpressTotal },
          manus: { success: manusSuccess, total: manusTotal },
        },
      };
    }),
});
