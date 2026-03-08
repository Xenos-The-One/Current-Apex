import { router, protectedProcedure } from "../../_core/trpc";
import { invokeLLM } from "../../_core/llm";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { wordpressConnections, wordpressPublishHistory, content } from "../../../drizzle/seo-schema";
import { eq, desc } from "drizzle-orm";

/** Build a Basic Auth header from WP credentials */
function wpAuth(username: string, appPassword: string) {
  return `Basic ${Buffer.from(`${username}:${appPassword}`).toString("base64")}`;
}

/**
 * WordPress Router - handles WordPress site connections and publishing
 */
export const wordpressRouter = router({
  // ── Connection management ──────────────────────────────────────────────────

  getConnections: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const query = db.select().from(wordpressConnections);
      if (input.clientId !== -1) {
        return query.where(eq(wordpressConnections.clientId, input.clientId)).orderBy(desc(wordpressConnections.createdAt));
      }
      return query.orderBy(desc(wordpressConnections.createdAt));
    }),

  addConnection: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      siteName: z.string().min(1),
      siteUrl: z.string().url(),
      username: z.string().min(1),
      applicationPassword: z.string().min(1),
      defaultStatus: z.enum(["draft", "publish", "pending"]).default("draft"),
      defaultAuthorId: z.number().optional(),
      defaultCategoryId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [connection] = await db.insert(wordpressConnections).values({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id: connection.insertId };
    }),

  updateConnection: protectedProcedure
    .input(z.object({
      id: z.number(),
      siteName: z.string().min(1).optional(),
      siteUrl: z.string().url().optional(),
      username: z.string().min(1).optional(),
      applicationPassword: z.string().min(1).optional(),
      defaultStatus: z.enum(["draft", "publish", "pending"]).optional(),
      defaultAuthorId: z.number().optional(),
      defaultCategoryId: z.number().optional(),
      isActive: z.number().min(0).max(1).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { id, ...updates } = input;
      await db.update(wordpressConnections).set(updates).where(eq(wordpressConnections.id, id));
      return { success: true };
    }),

  deleteConnection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(wordpressConnections).where(eq(wordpressConnections.id, input.id));
      return { success: true };
    }),

  testConnection: protectedProcedure
    .input(z.object({
      siteUrl: z.string().url(),
      username: z.string().min(1),
      applicationPassword: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(`${input.siteUrl}/wp-json/wp/v2/users/me`, {
          headers: { Authorization: wpAuth(input.username, input.applicationPassword) },
        });
        if (!response.ok) throw new Error(`WordPress API error: ${response.status}`);
        const userData = await response.json();
        return { success: true, message: `Connected successfully as ${userData.name}`, userId: userData.id };
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : "Connection failed" };
      }
    }),

  // ── Publish new post ───────────────────────────────────────────────────────

  publishToWordPress: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      connectionId: z.number(),
      publishStatus: z.enum(["draft", "publish", "pending"]).default("draft"),
      /** Optional Yoast SEO meta title override */
      seoTitle: z.string().optional(),
      /** Optional Yoast SEO meta description override */
      seoDescription: z.string().optional(),
      /** Publish as page instead of post */
      asPage: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [contentData] = await db.select().from(content).where(eq(content.id, input.contentId));
        if (!contentData) throw new Error("Content not found");

        const [connection] = await db
          .select()
          .from(wordpressConnections)
          .where(eq(wordpressConnections.id, input.connectionId));
        if (!connection) throw new Error("WordPress connection not found");

        const auth = wpAuth(connection.username, connection.applicationPassword);
        const endpoint = input.asPage ? "pages" : "posts";

        // Build post body — include Yoast meta if provided
        const postData: Record<string, unknown> = {
          title: contentData.title,
          content: contentData.content,
          status: input.publishStatus,
          author: connection.defaultAuthorId || undefined,
          categories: (!input.asPage && connection.defaultCategoryId) ? [connection.defaultCategoryId] : undefined,
        };

        // Yoast SEO fields (requires Yoast plugin with REST API support)
        if (input.seoTitle || input.seoDescription) {
          postData.meta = {
            ...(input.seoTitle ? { _yoast_wpseo_title: input.seoTitle } : {}),
            ...(input.seoDescription ? { _yoast_wpseo_metadesc: input.seoDescription } : {}),
          };
        }

        const response = await fetch(`${connection.siteUrl}/wp-json/wp/v2/${endpoint}`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify(postData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
        }

        const wpPost = await response.json();

        await db.insert(wordpressPublishHistory).values({
          contentId: input.contentId,
          connectionId: input.connectionId,
          wordpressPostId: wpPost.id,
          wordpressPostUrl: wpPost.link,
          publishStatus: input.publishStatus,
          success: 1,
          publishedBy: ctx.user.id,
        });

        await db.update(wordpressConnections)
          .set({ lastPublishedAt: new Date() })
          .where(eq(wordpressConnections.id, input.connectionId));

        return { success: true, postId: wpPost.id, postUrl: wpPost.link, message: `Published successfully as ${input.publishStatus}` };
      } catch (error) {
        const db2 = await getDb();
        if (db2) {
          await db2.insert(wordpressPublishHistory).values({
            contentId: input.contentId,
            connectionId: input.connectionId,
            wordpressPostId: 0,
            publishStatus: input.publishStatus,
            success: 0,
            errorMessage: error instanceof Error ? error.message : "Unknown error",
            publishedBy: ctx.user.id,
          });
        }
        return { success: false, message: error instanceof Error ? error.message : "Publishing failed" };
      }
    }),

  // ── Edit / update an existing WordPress post or page ──────────────────────

  updatePost: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      wordpressPostId: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      status: z.enum(["draft", "publish", "pending", "private"]).optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional(),
      isPage: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [connection] = await db
        .select()
        .from(wordpressConnections)
        .where(eq(wordpressConnections.id, input.connectionId));
      if (!connection) throw new Error("WordPress connection not found");

      const auth = wpAuth(connection.username, connection.applicationPassword);
      const endpoint = input.isPage ? "pages" : "posts";

      const updateData: Record<string, unknown> = {};
      if (input.title) updateData.title = input.title;
      if (input.content) updateData.content = input.content;
      if (input.status) updateData.status = input.status;
      if (input.seoTitle || input.seoDescription) {
        updateData.meta = {
          ...(input.seoTitle ? { _yoast_wpseo_title: input.seoTitle } : {}),
          ...(input.seoDescription ? { _yoast_wpseo_metadesc: input.seoDescription } : {}),
        };
      }

      const response = await fetch(
        `${connection.siteUrl}/wp-json/wp/v2/${endpoint}/${input.wordpressPostId}`,
        {
          method: "PUT",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
      }

      const updated = await response.json();
      return { success: true, postId: updated.id, postUrl: updated.link };
    }),

  // ── List existing posts or pages from WordPress ────────────────────────────

  listRemotePosts: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      type: z.enum(["posts", "pages"]).default("posts"),
      perPage: z.number().min(1).max(100).default(20),
      page: z.number().min(1).default(1),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [connection] = await db
        .select()
        .from(wordpressConnections)
        .where(eq(wordpressConnections.id, input.connectionId));
      if (!connection) throw new Error("WordPress connection not found");

      const auth = wpAuth(connection.username, connection.applicationPassword);
      const url = `${connection.siteUrl}/wp-json/wp/v2/${input.type}?per_page=${input.perPage}&page=${input.page}&_fields=id,title,link,status,date,modified,yoast_head_json`;

      const response = await fetch(url, { headers: { Authorization: auth } });
      if (!response.ok) throw new Error(`WordPress API error: ${response.status}`);

      const posts = await response.json();
      const total = parseInt(response.headers.get("X-WP-Total") ?? "0", 10);
      const totalPages = parseInt(response.headers.get("X-WP-TotalPages") ?? "1", 10);

      return {
        posts: posts.map((p: any) => ({
          id: p.id,
          title: p.title?.rendered ?? "",
          url: p.link,
          status: p.status,
          date: p.date,
          modified: p.modified,
          seoTitle: p.yoast_head_json?.title ?? null,
          seoDescription: p.yoast_head_json?.description ?? null,
        })),
        total,
        totalPages,
      };
    }),

  // ── Bulk SEO audit of existing WordPress content ──────────────────────────

  bulkSeoAudit: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      type: z.enum(["posts", "pages"]).default("posts"),
      /** Max posts to audit in one call */
      limit: z.number().min(1).max(50).default(10),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [connection] = await db
        .select()
        .from(wordpressConnections)
        .where(eq(wordpressConnections.id, input.connectionId));
      if (!connection) throw new Error("WordPress connection not found");

      const auth = wpAuth(connection.username, connection.applicationPassword);
      const url = `${connection.siteUrl}/wp-json/wp/v2/${input.type}?per_page=${input.limit}&status=publish&_fields=id,title,link,content,yoast_head_json`;

      const response = await fetch(url, { headers: { Authorization: auth } });
      if (!response.ok) throw new Error(`WordPress API error: ${response.status}`);

      const posts: any[] = await response.json();

      // Score each post with AI
      const { invokeLLM } = await import("../../_core/llm");

      const results = await Promise.all(
        posts.map(async (post) => {
          const title = post.title?.rendered ?? "";
          const rawContent = (post.content?.rendered ?? "").replace(/<[^>]+>/g, " ").slice(0, 1500);
          const existingSeoTitle = post.yoast_head_json?.title ?? "";
          const existingSeoDesc = post.yoast_head_json?.description ?? "";

          try {
            const llmRes = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content:
                    "You are an SEO expert. Analyse the given blog post and return a JSON object with these fields: score (0-100 integer), issues (array of short strings), suggestedSeoTitle (string, max 60 chars), suggestedMetaDescription (string, max 155 chars). Be concise.",
                },
                {
                  role: "user",
                  content: `Title: ${title}\nExisting SEO title: ${existingSeoTitle}\nExisting meta desc: ${existingSeoDesc}\nContent excerpt: ${rawContent}`,
                },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "seo_audit",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      score: { type: "integer" },
                      issues: { type: "array", items: { type: "string" } },
                      suggestedSeoTitle: { type: "string" },
                      suggestedMetaDescription: { type: "string" },
                    },
                    required: ["score", "issues", "suggestedSeoTitle", "suggestedMetaDescription"],
                    additionalProperties: false,
                  },
                },
              },
            });

            const parsed = JSON.parse(llmRes.choices[0].message.content as string);
            return {
              postId: post.id,
              title,
              url: post.link,
              score: parsed.score,
              issues: parsed.issues,
              suggestedSeoTitle: parsed.suggestedSeoTitle,
              suggestedMetaDescription: parsed.suggestedMetaDescription,
              existingSeoTitle,
              existingSeoDesc,
            };
          } catch {
            return {
              postId: post.id,
              title,
              url: post.link,
              score: 0,
              issues: ["AI analysis failed"],
              suggestedSeoTitle: "",
              suggestedMetaDescription: "",
              existingSeoTitle,
              existingSeoDesc,
            };
          }
        })
      );

      return { results, audited: results.length };
    }),

  // ── Image alt-text optimization ───────────────────────────────────────────

  optimizeImageAltText: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      /** WP media item ID to update */
      mediaId: z.number(),
      /** New alt text to set */
      altText: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [connection] = await db
        .select()
        .from(wordpressConnections)
        .where(eq(wordpressConnections.id, input.connectionId));
      if (!connection) throw new Error("WordPress connection not found");

      const auth = wpAuth(connection.username, connection.applicationPassword);

      const response = await fetch(
        `${connection.siteUrl}/wp-json/wp/v2/media/${input.mediaId}`,
        {
          method: "PUT",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ alt_text: input.altText }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WordPress API error: ${response.status} - ${errorText}`);
      }

      const updated = await response.json();
      return { success: true, mediaId: updated.id, altText: updated.alt_text };
    }),

  /** List media items missing alt text for bulk optimization */
  listMediaMissingAltText: protectedProcedure
    .input(z.object({
      connectionId: z.number(),
      perPage: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [connection] = await db
        .select()
        .from(wordpressConnections)
        .where(eq(wordpressConnections.id, input.connectionId));
      if (!connection) throw new Error("WordPress connection not found");

      const auth = wpAuth(connection.username, connection.applicationPassword);
      const url = `${connection.siteUrl}/wp-json/wp/v2/media?per_page=${input.perPage}&media_type=image&_fields=id,title,source_url,alt_text`;

      const response = await fetch(url, { headers: { Authorization: auth } });
      if (!response.ok) throw new Error(`WordPress API error: ${response.status}`);

      const media: any[] = await response.json();
      return media
        .filter((m) => !m.alt_text || m.alt_text.trim() === "")
        .map((m) => ({
          id: m.id,
          title: m.title?.rendered ?? "",
          url: m.source_url,
          altText: m.alt_text,
        }));
    }),

  // ── Publish history ────────────────────────────────────────────────────────

  getPublishHistory: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db
        .select({
          id: wordpressPublishHistory.id,
          connectionId: wordpressPublishHistory.connectionId,
          wordpressPostId: wordpressPublishHistory.wordpressPostId,
          wordpressPostUrl: wordpressPublishHistory.wordpressPostUrl,
          publishStatus: wordpressPublishHistory.publishStatus,
          success: wordpressPublishHistory.success,
          errorMessage: wordpressPublishHistory.errorMessage,
          publishedAt: wordpressPublishHistory.publishedAt,
          siteName: wordpressConnections.siteName,
          siteUrl: wordpressConnections.siteUrl,
        })
        .from(wordpressPublishHistory)
        .leftJoin(wordpressConnections, eq(wordpressPublishHistory.connectionId, wordpressConnections.id))
        .where(eq(wordpressPublishHistory.contentId, input.contentId))
        .orderBy(desc(wordpressPublishHistory.publishedAt));
    }),

  // ── AI Alt Text Generation ─────────────────────────────────────────────────
  generateAltText: protectedProcedure
    .input(z.object({ imageUrl: z.string().url() }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an accessibility expert. Generate concise, descriptive alt text for images to improve SEO and accessibility. Return only the alt text, no quotes or extra explanation." },
          { role: "user", content: [{ type: "image_url", image_url: { url: input.imageUrl, detail: "low" } }, { type: "text", text: "Write a concise alt text description for this image (max 125 characters)." }] },
        ],
      });
      const altText = (response as any).choices?.[0]?.message?.content?.trim() ?? "";
      return { altText };
    }),
});
