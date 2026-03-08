import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { notifyOwner } from "../../_core/notification";
import { getContentById, getClientById } from "../../seo-db";

export const notificationsRouter = router({
  // Send notification when content is ready for review
  contentReadyForReview: protectedProcedure
    .input(z.object({
      contentId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const content = await getContentById(input.contentId);
      if (!content) throw new Error("Content not found");

      const client = await getClientById(content.clientId);
      const clientName = client?.name || "Unknown Client";

      const sent = await notifyOwner({
        title: `📝 Content Ready for Review`,
        content: `New content "${content.title}" for client "${clientName}" is ready for review.\n\nTopic: ${content.topic}\nStatus: ${content.status}\nProgress: ${content.progress}%`,
      });

      return { sent };
    }),

  // Send notification when content is approved
  contentApproved: protectedProcedure
    .input(z.object({
      contentId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const content = await getContentById(input.contentId);
      if (!content) throw new Error("Content not found");

      const client = await getClientById(content.clientId);
      const clientName = client?.name || "Unknown Client";

      const sent = await notifyOwner({
        title: `✅ Content Approved`,
        content: `Content "${content.title}" for client "${clientName}" has been approved and is ready for publishing.`,
      });

      return { sent };
    }),

  // Send notification when a new brief is submitted
  briefSubmitted: protectedProcedure
    .input(z.object({
      briefTitle: z.string(),
      clientName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const sent = await notifyOwner({
        title: `📋 New Content Brief Submitted`,
        content: `A new content brief "${input.briefTitle}" has been submitted by client "${input.clientName}". Please review and start content generation.`,
      });

      return { sent };
    }),

  // Send notification when content is generated
  contentGenerated: protectedProcedure
    .input(z.object({
      contentId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const content = await getContentById(input.contentId);
      if (!content) throw new Error("Content not found");

      const client = await getClientById(content.clientId);
      const clientName = client?.name || "Unknown Client";

      const sent = await notifyOwner({
        title: `🤖 AI Content Generated`,
        content: `New AI-generated content "${content.title}" for client "${clientName}" has been created.\n\nTokens used: ${content.totalTokens || 0}\nStatus: Draft - awaiting review`,
      });

      return { sent };
    }),

  // Send notification when content is published
  contentPublished: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      platform: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const content = await getContentById(input.contentId);
      if (!content) throw new Error("Content not found");

      const client = await getClientById(content.clientId);
      const clientName = client?.name || "Unknown Client";

      const sent = await notifyOwner({
        title: `🚀 Content Published`,
        content: `Content "${content.title}" for client "${clientName}" has been published${input.platform ? ` to ${input.platform}` : ""}.`,
      });

      return { sent };
    }),

  // Send a custom notification
  sendCustom: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      content: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const sent = await notifyOwner({
        title: input.title,
        content: input.content,
      });
      return { sent };
    }),
});
