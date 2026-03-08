import { z } from "zod";
import { protectedProcedure, router } from "../../_core/trpc";
import { addComment, getContentComments, updateCommentStatus, createRevision, getContentRevisions, getDb, updateContent } from "../../seo-db";
import { contentComments, content, seoClients as clients } from "../../../drizzle/seo-schema";
import { desc, eq } from "drizzle-orm";
import { notifyOwner } from "../../_core/notification";

export const collaborationRouter = router({
  // Comments
  addComment: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      comment: z.string().min(1),
      parentCommentId: z.number().optional(),
      mentions: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const commentId = await addComment({
        contentId: input.contentId,
        userId: ctx.user.id,
        comment: input.comment,
        parentCommentId: input.parentCommentId ?? null,
        mentions: input.mentions ? JSON.stringify(input.mentions) : null,
        status: "pending",
      });

      // Fire-and-forget: create in-app notification for new comment
      try {
        const db = await getDb();
        if (db) {
          const contentRows = await db.select({ title: content.title }).from(content).where(eq(content.id, input.contentId)).limit(1);
          const contentTitle = contentRows[0]?.title ?? `Content #${input.contentId}`;
          await db.insert((await import('../../../drizzle/seo-schema')).appNotifications).values({
            type: "comment",
            title: input.parentCommentId ? "New Reply on Content" : "New Comment on Content",
            message: `${ctx.user.name || "Someone"} ${input.parentCommentId ? "replied" : "commented"} on "${contentTitle}": ${input.comment.slice(0, 100)}${input.comment.length > 100 ? "..." : ""}`,
            contentId: input.contentId,
            isRead: 0,
          });
          // Also notify owner if there are @mentions
          if (input.mentions && input.mentions.length > 0) {
            await notifyOwner({
              title: `You were mentioned in a comment`,
              content: `@${input.mentions.join(", @")} was mentioned on "${contentTitle}": ${input.comment.slice(0, 200)}`,
            });
          }
        }
      } catch (e) {
        console.warn("[collaboration] Failed to create notification:", e);
      }

      return { id: commentId };
    }),

  /** Request a revision from a comment — moves content back to in_progress */
  requestRevision: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      commentId: z.number(),
      revisionNote: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Move content back to in_progress
      await updateContent(input.contentId, { status: "in_progress" });

      // Create a revision record linked to the comment
      await createRevision({
        contentId: input.contentId,
        userId: ctx.user.id,
        title: null,
        content: null,
        changeDescription: `Revision requested from comment: ${input.revisionNote}`,
        revisionNumber: Date.now(),
      });

      // Notify
      try {
        const db = await getDb();
        if (db) {
          const contentRows = await db.select({ title: content.title }).from(content).where(eq(content.id, input.contentId)).limit(1);
          const contentTitle = contentRows[0]?.title ?? `Content #${input.contentId}`;
          await db.insert((await import('../../../drizzle/seo-schema')).appNotifications).values({
            type: "revision",
            title: "Revision Requested",
            message: `${ctx.user.name || "Someone"} requested a revision on "${contentTitle}": ${input.revisionNote.slice(0, 150)}`,
            contentId: input.contentId,
            isRead: 0,
          });
        }
      } catch (e) {
        console.warn("[collaboration] Failed to create revision notification:", e);
      }

      return { success: true };
    }),

  /** Get recent unresolved comments across all content (for dashboard feed) */
  recentUnresolved: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          id: contentComments.id,
          comment: contentComments.comment,
          contentId: contentComments.contentId,
          createdAt: contentComments.createdAt,
          contentTitle: content.title,
          clientName: clients.name,
        })
        .from(contentComments)
        .leftJoin(content, eq(contentComments.contentId, content.id))
        .leftJoin(clients, eq(content.clientId, clients.id))
        .where(eq(contentComments.isResolved, 0))
        .orderBy(desc(contentComments.createdAt))
        .limit(input.limit);
      return rows;
    }),

  getComments: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ input }) => {
      const flat = await getContentComments(input.contentId);
      // Build threaded structure: top-level comments with nested replies
      const topLevel = flat.filter((c: any) => !c.parentCommentId);
      const replies = flat.filter((c: any) => !!c.parentCommentId);
      return topLevel.map((parent: any) => ({
        ...parent,
        mentions: parent.mentions ? JSON.parse(parent.mentions) : [],
        replies: replies
          .filter((r: any) => r.parentCommentId === parent.id)
          .map((r: any) => ({
            ...r,
            mentions: r.mentions ? JSON.parse(r.mentions) : [],
          })),
      }));
    }),

  resolveComment: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ input }) => {
      await updateCommentStatus(input.commentId, 1); // 1 = resolved
      return { success: true };
    }),

  // Revisions
  createRevision: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      title: z.string().optional(),
      content: z.string().optional(),
      changeDescription: z.string(),
      revisionNumber: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const revisionId = await createRevision({
        contentId: input.contentId,
        userId: ctx.user.id,
        title: input.title || null,
        content: input.content || null,
        changeDescription: input.changeDescription,
        revisionNumber: input.revisionNumber,
      });
      return { id: revisionId };
    }),

  getRevisions: protectedProcedure
    .input(z.object({ contentId: z.number() }))
    .query(async ({ input }) => {
      return await getContentRevisions(input.contentId);
    }),
});
