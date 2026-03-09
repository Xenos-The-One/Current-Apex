import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getClientByUserId,
  createSocialMediaPost,
  getSocialMediaPostsByClientId,
  getSocialMediaPostById,
  updateSocialMediaPost,
  deleteSocialMediaPost,
  getDb,
} from "../db";
import { socialMediaPosts } from "../../drizzle/schema";
import { desc } from "drizzle-orm";

const ADMIN_ROLES = ["admin", "super_admin", "agency_owner"];

export const socialRouter = router({
  // ============= POST MANAGEMENT =============

  listPosts: protectedProcedure.query(async ({ ctx }) => {
    const client = await getClientByUserId(ctx.user.id);
    if (!client) {
      // Admin users without a linked client profile — return all posts
      if (ADMIN_ROLES.includes(ctx.user.role)) {
        const db = await getDb();
        if (!db) return [];
        return await db
          .select()
          .from(socialMediaPosts)
          .orderBy(desc(socialMediaPosts.scheduledDate))
          .limit(300);
      }
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Client profile not found",
      });
    }

    // Check access mode
    if (client.accessMode === "limited") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Limited access mode. Please complete your strategy call to unlock full access.",
      });
    }

    return await getSocialMediaPostsByClientId(client.id);
  }),

  // Admin: list all posts across all clients (for oversight tab)
  listAllPosts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return await db
      .select()
      .from(socialMediaPosts)
      .orderBy(desc(socialMediaPosts.scheduledDate))
      .limit(300);
  }),

  getPost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .query(async ({ ctx, input }) => {
      const client = await getClientByUserId(ctx.user.id);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      const post = await getSocialMediaPostById(input.postId);
      if (!post || post.clientId !== client.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      return post;
    }),

  createPost: protectedProcedure
    .input(z.object({
      platform: z.enum(["facebook", "instagram", "linkedin"]),
      content: z.string(),
      mediaUrls: z.array(z.string()).optional(),
      scheduledDate: z.date(),
      status: z.enum(["draft", "scheduled"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await getClientByUserId(ctx.user.id);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      // Check access mode
      if (client.accessMode !== "full") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: client.accessMode === "limited"
            ? "Limited access mode. Please complete your strategy call to unlock full access."
            : "Read-only access. Contact your agency administrator.",
        });
      }

      await createSocialMediaPost({
        clientId: client.id,
        agencyId: client.agencyId,
        platform: input.platform,
        content: input.content,
        mediaUrls: input.mediaUrls ? JSON.stringify(input.mediaUrls) : undefined,
        scheduledDate: input.scheduledDate,
        status: input.status || "draft",
        createdBy: ctx.user.id,
      });

      return { success: true };
    }),

  updatePost: protectedProcedure
    .input(z.object({
      postId: z.number(),
      content: z.string().optional(),
      mediaUrls: z.array(z.string()).optional(),
      scheduledDate: z.date().optional(),
      status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await getClientByUserId(ctx.user.id);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      // Check access mode
      if (client.accessMode !== "full") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify posts",
        });
      }

      const post = await getSocialMediaPostById(input.postId);
      if (!post || post.clientId !== client.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      const { postId, ...updates } = input;
      await updateSocialMediaPost(postId, {
        ...updates,
        mediaUrls: updates.mediaUrls ? JSON.stringify(updates.mediaUrls) : undefined,
      });

      return { success: true };
    }),

  // Reschedule a post (used by drag-and-drop calendar)
  reschedulePost: protectedProcedure
    .input(z.object({
      postId: z.number(),
      scheduledDate: z.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await getClientByUserId(ctx.user.id);
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
      }
      const post = await getSocialMediaPostById(input.postId);
      if (!post || post.clientId !== client.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      await updateSocialMediaPost(input.postId, { scheduledDate: input.scheduledDate });
      return { success: true };
    }),

  deletePost: protectedProcedure
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await getClientByUserId(ctx.user.id);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      // Check access mode
      if (client.accessMode !== "full") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete posts",
        });
      }

      const post = await getSocialMediaPostById(input.postId);
      if (!post || post.clientId !== client.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }

      await deleteSocialMediaPost(input.postId);
      return { success: true };
    }),
});
