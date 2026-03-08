import { z } from "zod";
import { router, protectedProcedure } from "../../_core/trpc";
import {
  createWebhookConfig,
  getAllWebhooks,
  getWebhooksByClient,
  getWebhookById,
  updateWebhookConfig,
  deleteWebhookConfig,
  createPublishLog,
  getPublishLogs,
  updatePublishLog,
  getContentById,
} from "../../seo-db";

// Convert markdown to basic HTML
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/(<li>[\s\S]*<\/li>)/gim, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/^(?!<[hul])/gim, "<p>")
    .replace(/(?<![>])$/gim, "</p>")
    .replace(/<p><\/p>/g, "")
    .replace(/---/g, "<hr />");
}

// Generate slug from title
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

// Build platform-specific payload and headers
function buildPlatformPayload(
  platform: string,
  content: { title: string; content: string | null; imageUrl: string | null; topic: string | null },
  webhook: { apiKey: string | null; authHeader: string | null; endpointUrl: string }
) {
  const htmlContent = content.content ? markdownToHtml(content.content) : "";
  const slug = slugify(content.title);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let payload: any = {};
  let url = webhook.endpointUrl;

  switch (platform) {
    case "wordpress": {
      // WordPress REST API v2: /wp-json/wp/v2/posts
      // Auth: Application Password (Basic) or JWT Bearer
      if (webhook.authHeader) {
        headers["Authorization"] = webhook.authHeader;
      } else if (webhook.apiKey) {
        headers["Authorization"] = `Bearer ${webhook.apiKey}`;
      }
      payload = {
        title: content.title,
        content: htmlContent,
        slug,
        status: "draft",
        excerpt: content.content
          ? content.content.replace(/[#*\[\]()_`>-]/g, "").substring(0, 300)
          : "",
        categories: [],
        tags: [],
        meta: {
          _seo_title: content.title,
          _seo_description: content.topic || "",
        },
      };
      // If there's a featured image URL, add it as a meta field
      // (WordPress requires uploading media separately for featured_media)
      if (content.imageUrl) {
        payload.meta._featured_image_url = content.imageUrl;
      }
      break;
    }

    case "ghost": {
      // Ghost Admin API: /ghost/api/admin/posts/
      // Auth: Uses JWT from Admin API key (id:secret format)
      if (webhook.apiKey) {
        // Ghost Admin API keys are in format "id:secret"
        // Generate JWT for Ghost Admin API
        const parts = webhook.apiKey.split(":");
        if (parts.length === 2) {
          // For Ghost, we need to create a JWT token
          // In production, use proper JWT signing. For now, pass as Bearer
          headers["Authorization"] = `Ghost ${webhook.apiKey}`;
        } else {
          headers["Authorization"] = `Bearer ${webhook.apiKey}`;
        }
      }
      if (webhook.authHeader) {
        headers["Authorization"] = webhook.authHeader;
      }
      headers["Content-Type"] = "application/json";

      payload = {
        posts: [
          {
            title: content.title,
            slug,
            html: htmlContent,
            status: "draft",
            feature_image: content.imageUrl || undefined,
            feature_image_alt: content.title,
            excerpt: content.content
              ? content.content.replace(/[#*\[\]()_`>-]/g, "").substring(0, 300)
              : "",
            tags: content.topic
              ? content.topic.split(",").map((t: string) => ({ name: t.trim() }))
              : [],
            meta_title: content.title,
            meta_description: content.topic || "",
            og_title: content.title,
            og_description: content.topic || "",
            twitter_title: content.title,
            twitter_description: content.topic || "",
          },
        ],
      };
      break;
    }

    case "webflow": {
      // Webflow CMS API v2: /v2/collections/{collection_id}/items
      // Auth: Bearer token
      if (webhook.apiKey) {
        headers["Authorization"] = `Bearer ${webhook.apiKey}`;
      }
      if (webhook.authHeader) {
        headers["Authorization"] = webhook.authHeader;
      }

      payload = {
        isArchived: false,
        isDraft: true,
        fieldData: {
          name: content.title,
          slug,
          "post-body": htmlContent,
          "post-summary": content.content
            ? content.content.replace(/[#*\[\]()_`>-]/g, "").substring(0, 300)
            : "",
          "main-image": content.imageUrl
            ? { url: content.imageUrl, alt: content.title }
            : undefined,
          "seo-title": content.title,
          "seo-description": content.topic || "",
        },
      };
      break;
    }

    case "custom":
    default: {
      if (webhook.apiKey) {
        headers["Authorization"] = `Bearer ${webhook.apiKey}`;
      }
      if (webhook.authHeader) {
        headers["Authorization"] = webhook.authHeader;
      }

      payload = {
        title: content.title,
        slug,
        content: content.content,
        htmlContent,
        imageUrl: content.imageUrl,
        topic: content.topic,
        excerpt: content.content
          ? content.content.replace(/[#*\[\]()_`>-]/g, "").substring(0, 300)
          : "",
        status: "draft",
        publishedAt: new Date().toISOString(),
        metadata: {
          seoTitle: content.title,
          seoDescription: content.topic || "",
          generator: "AI SEO Portal",
        },
      };
      break;
    }
  }

  return { payload, headers, url };
}

export const webhooksRouter = router({
  // List all webhook configs for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return getAllWebhooks(ctx.user.id);
  }),

  // List webhooks for a specific client
  listByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return getWebhooksByClient(input.clientId);
    }),

  // Create a new webhook config
  create: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        name: z.string().min(1),
        platform: z.enum(["wordpress", "ghost", "webflow", "custom"]),
        endpointUrl: z.string().url(),
        apiKey: z.string().optional(),
        authHeader: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createWebhookConfig({
        ...input,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  // Update a webhook config
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        endpointUrl: z.string().url().optional(),
        apiKey: z.string().optional(),
        authHeader: z.string().optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      await updateWebhookConfig(id, updates);
      return { success: true };
    }),

  // Delete a webhook config
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteWebhookConfig(input.id);
      return { success: true };
    }),

  // Test webhook connection
  testConnection: protectedProcedure
    .input(z.object({ webhookId: z.number() }))
    .mutation(async ({ input }) => {
      const webhook = await getWebhookById(input.webhookId);
      if (!webhook) throw new Error("Webhook not found");

      try {
        const axios = (await import("axios")).default;
        const headers: Record<string, string> = {};

        if (webhook.apiKey) {
          headers["Authorization"] = `Bearer ${webhook.apiKey}`;
        }
        if (webhook.authHeader) {
          headers["Authorization"] = webhook.authHeader;
        }

        // Platform-specific test endpoints
        let testUrl = webhook.endpointUrl;
        switch (webhook.platform) {
          case "wordpress":
            // WordPress: GET the posts endpoint to verify connection
            testUrl = webhook.endpointUrl.replace(/\/posts\/?$/, "/posts?per_page=1");
            break;
          case "ghost":
            // Ghost: GET posts to verify connection
            testUrl = webhook.endpointUrl.replace(/\/posts\/?$/, "/posts/?limit=1");
            break;
          case "webflow":
            // Webflow: GET the collection items
            testUrl = webhook.endpointUrl + "?limit=1";
            break;
        }

        const response = await axios.get(testUrl, {
          headers,
          timeout: 10000,
          validateStatus: () => true,
        });

        return {
          success: response.status >= 200 && response.status < 400,
          statusCode: response.status,
          message:
            response.status >= 200 && response.status < 400
              ? "Connection successful!"
              : `Server responded with status ${response.status}`,
        };
      } catch (error: any) {
        return {
          success: false,
          statusCode: 0,
          message: error.message || "Connection failed",
        };
      }
    }),

  // Preview the payload that will be sent
  previewPayload: protectedProcedure
    .input(
      z.object({
        contentId: z.number(),
        webhookId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const contentData = await getContentById(input.contentId);
      if (!contentData) throw new Error("Content not found");

      const webhook = await getWebhookById(input.webhookId);
      if (!webhook) throw new Error("Webhook not found");

      const { payload, headers, url } = buildPlatformPayload(
        webhook.platform,
        contentData,
        webhook
      );

      // Redact auth headers for preview
      const safeHeaders = { ...headers };
      if (safeHeaders["Authorization"]) {
        safeHeaders["Authorization"] = safeHeaders["Authorization"].substring(0, 15) + "...";
      }

      return {
        platform: webhook.platform,
        method: "POST",
        url,
        headers: safeHeaders,
        payload,
      };
    }),

  // Publish content to a webhook endpoint
  publish: protectedProcedure
    .input(
      z.object({
        contentId: z.number(),
        webhookId: z.number(),
        publishAsDraft: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const { contentId, webhookId } = input;

      // Get content and webhook details
      const contentData = await getContentById(contentId);
      if (!contentData) throw new Error("Content not found");

      const webhook = await getWebhookById(webhookId);
      if (!webhook) throw new Error("Webhook not found");

      // Create a publish log entry
      const logId = await createPublishLog({
        contentId,
        webhookId,
        status: "pending",
      });

      try {
        const axios = (await import("axios")).default;

        const { payload, headers, url } = buildPlatformPayload(
          webhook.platform,
          contentData,
          webhook
        );

        // Override status if publishing directly (not as draft)
        if (!input.publishAsDraft) {
          switch (webhook.platform) {
            case "wordpress":
              payload.status = "publish";
              break;
            case "ghost":
              if (payload.posts?.[0]) payload.posts[0].status = "published";
              break;
            case "webflow":
              payload.isDraft = false;
              break;
            case "custom":
              payload.status = "published";
              break;
          }
        }

        const response = await axios.post(url, payload, {
          headers,
          timeout: 30000,
        });

        // Extract the published URL if available
        let publishedUrl = "";
        switch (webhook.platform) {
          case "wordpress":
            publishedUrl = response.data?.link || "";
            break;
          case "ghost":
            publishedUrl = response.data?.posts?.[0]?.url || "";
            break;
          case "webflow":
            publishedUrl = response.data?.fieldData?.slug
              ? `${webhook.endpointUrl.split("/v2/")[0]}/${response.data.fieldData.slug}`
              : "";
            break;
        }

        // Update log with success
        await updatePublishLog(logId, {
          status: "success",
          responseCode: response.status,
          responseBody: JSON.stringify({
            publishedUrl,
            data: response.data,
          }).substring(0, 5000),
        });

        // Update webhook last published date
        await updateWebhookConfig(webhookId, { lastPublishedAt: new Date() });

        return {
          success: true,
          logId,
          responseCode: response.status,
          publishedUrl,
        };
      } catch (error: any) {
        const errorDetails = {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        };

        // Update log with failure
        await updatePublishLog(logId, {
          status: "failed",
          responseCode: error.response?.status || 0,
          responseBody: JSON.stringify(errorDetails).substring(0, 5000),
        });

        return {
          success: false,
          logId,
          error: error.message,
          responseCode: error.response?.status || 0,
          errorDetails: error.response?.data
            ? JSON.stringify(error.response.data).substring(0, 500)
            : undefined,
        };
      }
    }),

  // Get publish logs for a content item
  getLogs: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ input }) => {
      return getPublishLogs(input.contentId);
    }),
});
