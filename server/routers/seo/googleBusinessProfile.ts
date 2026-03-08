import { protectedProcedure, router } from "../../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../../seo-db";
import { gbpConnections, gbpLocations, gbpPosts } from "../../../drizzle/seo-schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "../../_core/llm";
import { storagePut } from "../../storage";

// ── Helpers ────────────────────────────────────────────────────────────────

async function gbpRequest(
  accessToken: string,
  path: string,
  method = "GET",
  body?: unknown
) {
  const url = path.startsWith("http")
    ? path
    : `https://mybusiness.googleapis.com/v4/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `GBP API error ${res.status}: ${text}`,
    });
  }
  return res.json();
}

async function getConnection(connectionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const [conn] = await db
    .select()
    .from(gbpConnections)
    .where(and(eq(gbpConnections.id, connectionId), eq(gbpConnections.createdBy, userId)));
  if (!conn) throw new TRPCError({ code: "NOT_FOUND", message: "Connection not found" });
  return { db, conn };
}

// ── Router ─────────────────────────────────────────────────────────────────

export const googleBusinessProfileRouter = router({
  /**
   * List all GBP connections for a client (or all clients if clientId = 0)
   */
  listConnections: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(gbpConnections)
        .where(
          input.clientId > 0
            ? and(eq(gbpConnections.clientId, input.clientId), eq(gbpConnections.createdBy, ctx.user.id))
            : eq(gbpConnections.createdBy, ctx.user.id)
        )
        .orderBy(desc(gbpConnections.createdAt));
      return rows.map((r) => ({ ...r, accessToken: "***" }));
    }),

  /**
   * Add a GBP connection using a Google OAuth access token.
   * The client must obtain the token via Google OAuth consent screen
   * (scope: https://www.googleapis.com/auth/business.manage).
   * We store the token and fetch the account name to confirm it works.
   */
  addConnection: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        accessToken: z.string().min(10),
        refreshToken: z.string().optional(),
        tokenExpiresAt: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      // Verify token by fetching accounts
      let accountName = "Google Business Account";
      let accountId = "unknown";
      try {
        const data = await gbpRequest(input.accessToken, "accounts");
        const account = data.accounts?.[0];
        if (account) {
          accountName = account.accountName || account.name || "Google Business Account";
          accountId = account.name || "unknown";
        }
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid access token — could not connect to Google Business Profile API. Please check the token and try again.",
        });
      }

      const [result] = await db.insert(gbpConnections).values({
        clientId: input.clientId,
        createdBy: ctx.user.id,
        accountName,
        accountId,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken ?? null,
        tokenExpiresAt: input.tokenExpiresAt ?? 0,
      });

      return { id: (result as any).insertId, accountName, accountId };
    }),

  /**
   * Delete a GBP connection (and cascade-delete locations and posts)
   */
  deleteConnection: protectedProcedure
    .input(z.object({ connectionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { db } = await getConnection(input.connectionId, ctx.user.id);
      await db.delete(gbpConnections).where(eq(gbpConnections.id, input.connectionId));
      return { success: true };
    }),

  /**
   * Fetch and cache locations for a connection
   */
  syncLocations: protectedProcedure
    .input(z.object({ connectionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { db, conn } = await getConnection(input.connectionId, ctx.user.id);

      const data = await gbpRequest(conn.accessToken, `${conn.accountId}/locations?readMask=name,title,storefrontAddress,phoneNumbers,websiteUri`);
      const locations: Array<{ name: string; title?: string; storefrontAddress?: { addressLines?: string[] }; phoneNumbers?: { primaryPhone?: string }; websiteUri?: string }> = data.locations || [];

      // Delete old cached locations
      await db.delete(gbpLocations).where(eq(gbpLocations.connectionId, input.connectionId));

      // Insert fresh
      for (const loc of locations) {
        await db.insert(gbpLocations).values({
          connectionId: input.connectionId,
          locationId: loc.name,
          locationName: loc.title || loc.name,
          address: loc.storefrontAddress?.addressLines?.join(", ") ?? null,
          phone: loc.phoneNumbers?.primaryPhone ?? null,
          websiteUrl: loc.websiteUri ?? null,
        });
      }

      return { synced: locations.length };
    }),

  /**
   * List cached locations for a connection
   */
  listLocations: protectedProcedure
    .input(z.object({ connectionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { db } = await getConnection(input.connectionId, ctx.user.id);
      return db
        .select()
        .from(gbpLocations)
        .where(eq(gbpLocations.connectionId, input.connectionId));
    }),

  /**
   * Create and publish a GBP post immediately
   */
  publishPost: protectedProcedure
    .input(
      z.object({
        connectionId: z.number(),
        locationId: z.string(),
        locationName: z.string().optional(),
        postType: z.enum(["STANDARD", "EVENT", "OFFER", "PRODUCT"]).default("STANDARD"),
        summary: z.string().min(1).max(1500),
        callToActionType: z.string().optional(),
        callToActionUrl: z.string().url().optional(),
        eventTitle: z.string().optional(),
        eventStartDate: z.string().optional(),
        eventEndDate: z.string().optional(),
        imageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { conn } = await getConnection(input.connectionId, ctx.user.id);

      // Build GBP API payload
      const payload: Record<string, unknown> = {
        languageCode: "en",
        summary: input.summary,
        topicType: input.postType,
      };
      if (input.callToActionType && input.callToActionUrl) {
        payload.callToAction = { actionType: input.callToActionType, url: input.callToActionUrl };
      }
      if (input.postType === "EVENT" && input.eventTitle) {
        payload.event = {
          title: input.eventTitle,
          schedule: {
            startDate: input.eventStartDate,
            endDate: input.eventEndDate,
          },
        };
      }
      if (input.imageUrl) {
        payload.media = [{ mediaFormat: "PHOTO", sourceUrl: input.imageUrl }];
      }

      let gbpPostName: string | null = null;
      let status: "published" | "failed" = "published";
      let errorMessage: string | null = null;

      try {
        const result = await gbpRequest(
          conn.accessToken,
          `${input.locationId}/localPosts`,
          "POST",
          payload
        );
        gbpPostName = result.name ?? null;
      } catch (err) {
        status = "failed";
        errorMessage = err instanceof Error ? err.message : String(err);
      }

      const [ins] = await db.insert(gbpPosts).values({
        connectionId: input.connectionId,
        locationId: input.locationId,
        locationName: input.locationName ?? null,
        postType: input.postType,
        summary: input.summary,
        callToActionType: input.callToActionType ?? null,
        callToActionUrl: input.callToActionUrl ?? null,
        eventTitle: input.eventTitle ?? null,
        eventStartDate: input.eventStartDate ?? null,
        eventEndDate: input.eventEndDate ?? null,
        imageUrl: input.imageUrl ?? null,
        status,
        publishedAt: status === "published" ? Date.now() : 0,
        gbpPostName,
        errorMessage,
        createdBy: ctx.user.id,
      });

      if (status === "failed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: errorMessage ?? "Failed to publish post" });
      }

      return { id: (ins as any).insertId, gbpPostName };
    }),

  /**
   * List posts for a connection (optionally filtered by locationId)
   */
  listPosts: protectedProcedure
    .input(z.object({ connectionId: z.number(), locationId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const { db } = await getConnection(input.connectionId, ctx.user.id);
      const rows = await db
        .select()
        .from(gbpPosts)
        .where(
          input.locationId
            ? and(eq(gbpPosts.connectionId, input.connectionId), eq(gbpPosts.locationId, input.locationId))
            : eq(gbpPosts.connectionId, input.connectionId)
        )
        .orderBy(desc(gbpPosts.createdAt));
      return rows;
    }),

  /**
   * Upload an image to S3 and return a public URL for use in GBP posts.
   * Accepts base64-encoded image data from the frontend.
   */
  uploadImage: protectedProcedure
    .input(
      z.object({
        base64: z.string().min(10),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).default("image/jpeg"),
        fileName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ext = input.mimeType.split("/")[1] ?? "jpg";
      const name = input.fileName?.replace(/[^a-zA-Z0-9._-]/g, "-") ?? `gbp-image.${ext}`;
      const key = `gbp-images/${ctx.user.id}-${Date.now()}-${name}`;
      const buffer = Buffer.from(input.base64, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  /**
   * AI-generate a GBP post summary from a topic
   */
  generatePostContent: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(3),
        postType: z.enum(["STANDARD", "EVENT", "OFFER", "PRODUCT"]).default("STANDARD"),
        businessName: z.string().optional(),
        tone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const typeHints: Record<string, string> = {
        STANDARD: "an informative update or news post",
        EVENT: "an event announcement",
        OFFER: "a special offer or promotion",
        PRODUCT: "a product or service highlight",
      };
      const prompt = `Write a Google Business Profile post (${typeHints[input.postType]}) about: "${input.topic}".${input.businessName ? ` Business: ${input.businessName}.` : ""}${input.tone ? ` Tone: ${input.tone}.` : ""}
Requirements:
- Maximum 1500 characters
- Engaging and action-oriented
- Include a clear call to action
- No hashtags
- Return ONLY the post text, no extra commentary`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert local SEO content writer specialising in Google Business Profile posts." },
          { role: "user", content: prompt },
        ],
      });

      const text = response.choices[0]?.message?.content;
      return { summary: typeof text === "string" ? text.trim() : "" };
    }),
});
