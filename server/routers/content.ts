import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { contentApprovals, socialMediaPosts } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const contentRouter = router({
  listPosts: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      platform: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(socialMediaPosts.agencyId, input.agencyId)];
      if (input.platform) conditions.push(eq(socialMediaPosts.platform, input.platform as any));
      if (input.status) conditions.push(eq(socialMediaPosts.status, input.status as any));
      return db.select().from(socialMediaPosts).where(and(...conditions)).orderBy(desc(socialMediaPosts.createdAt)).limit(input.limit);
    }),

  createPost: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      platform: z.enum(["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok"]),
      content: z.string().min(1),
      mediaUrls: z.array(z.string()).optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { mediaUrls, ...rest } = input;
      const [result] = await db.insert(socialMediaPosts).values({
        ...rest,
        createdByUserId: ctx.user.id,
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        status: "draft",
      });
      return { id: (result as any).insertId };
    }),

  updatePost: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      content: z.string().optional(),
      status: z.enum(["draft", "pending_approval", "approved", "scheduled", "published", "rejected"]).optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      await db.update(socialMediaPosts).set(rest).where(and(eq(socialMediaPosts.id, id), eq(socialMediaPosts.agencyId, agencyId)));
      return { success: true };
    }),

  deletePost: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(socialMediaPosts).where(and(eq(socialMediaPosts.id, input.id), eq(socialMediaPosts.agencyId, input.agencyId)));
      return { success: true };
    }),

  listApprovals: protectedProcedure
    .input(z.object({ agencyId: z.number(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(contentApprovals.agencyId, input.agencyId)];
      if (input.status) conditions.push(eq(contentApprovals.status, input.status as any));
      return db.select().from(contentApprovals).where(and(...conditions)).orderBy(desc(contentApprovals.createdAt));
    }),

  requestApproval: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      contentType: z.enum(["social_post", "email_campaign", "sms_campaign", "blog_post"]),
      contentId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(contentApprovals).values({ ...input, requestedByUserId: ctx.user.id });
      return { id: (result as any).insertId };
    }),

  reviewApproval: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      status: z.enum(["approved", "rejected", "revision_requested"]),
      comments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      await db.update(contentApprovals).set({ ...rest, reviewedByUserId: ctx.user.id })
        .where(and(eq(contentApprovals.id, id), eq(contentApprovals.agencyId, agencyId)));
      return { success: true };
    }),
});
