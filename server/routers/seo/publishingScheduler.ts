import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { publishingSchedules, content, wordpressConnections, manusWebsites } from "../../../drizzle/seo-schema";
import { eq, desc, and, lte, gte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Publishing Scheduler Router - manages scheduled publishing tasks
 */
export const publishingSchedulerRouter = router({
  // Create a new publishing schedule
  create: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      scheduledFor: z.date(),
      publishToWordPress: z.boolean().default(false),
      wordpressConnectionIds: z.array(z.number()).optional(),
      wordpressStatus: z.enum(["draft", "publish", "pending"]).default("draft"),
      publishToManus: z.boolean().default(false),
      manusWebsiteIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Validate that at least one platform is selected
      if (!input.publishToWordPress && !input.publishToManus) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Must select at least one platform to publish to',
        });
      }

      // Validate scheduled time is in the future
      if (input.scheduledFor <= new Date()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Scheduled time must be in the future',
        });
      }

      // Verify content exists
      const [contentExists] = await db
        .select({ id: content.id })
        .from(content)
        .where(eq(content.id, input.contentId))
        .limit(1);

      if (!contentExists) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Content not found',
        });
      }

      const [result] = await db.insert(publishingSchedules).values({
        contentId: input.contentId,
        publishToWordPress: input.publishToWordPress ? 1 : 0,
        wordpressConnectionIds: input.wordpressConnectionIds ? JSON.stringify(input.wordpressConnectionIds) : null,
        wordpressStatus: input.wordpressStatus,
        publishToManus: input.publishToManus ? 1 : 0,
        manusWebsiteIds: input.manusWebsiteIds ? JSON.stringify(input.manusWebsiteIds) : null,
        scheduledFor: input.scheduledFor,
        status: "pending",
        createdBy: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        success: true,
        id: result.insertId,
        message: 'Publishing scheduled successfully',
      };
    }),

  // Get all schedules with optional filters
  getSchedules: protectedProcedure
    .input(z.object({
      contentId: z.number().optional(),
      status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      let conditions = [];
      
      if (input?.contentId) {
        conditions.push(eq(publishingSchedules.contentId, input.contentId));
      }
      
      if (input?.status) {
        conditions.push(eq(publishingSchedules.status, input.status));
      }
      
      if (input?.startDate) {
        conditions.push(gte(publishingSchedules.scheduledFor, input.startDate));
      }
      
      if (input?.endDate) {
        conditions.push(lte(publishingSchedules.scheduledFor, input.endDate));
      }

      const schedules = await db
        .select({
          id: publishingSchedules.id,
          contentId: publishingSchedules.contentId,
          contentTitle: content.title,
          publishToWordPress: publishingSchedules.publishToWordPress,
          wordpressConnectionIds: publishingSchedules.wordpressConnectionIds,
          wordpressStatus: publishingSchedules.wordpressStatus,
          publishToManus: publishingSchedules.publishToManus,
          manusWebsiteIds: publishingSchedules.manusWebsiteIds,
          scheduledFor: publishingSchedules.scheduledFor,
          status: publishingSchedules.status,
          executedAt: publishingSchedules.executedAt,
          errorMessage: publishingSchedules.errorMessage,
          createdAt: publishingSchedules.createdAt,
        })
        .from(publishingSchedules)
        .leftJoin(content, eq(publishingSchedules.contentId, content.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(publishingSchedules.scheduledFor));

      return schedules.map(schedule => ({
        ...schedule,
        wordpressConnectionIds: schedule.wordpressConnectionIds ? JSON.parse(schedule.wordpressConnectionIds) : [],
        manusWebsiteIds: schedule.manusWebsiteIds ? JSON.parse(schedule.manusWebsiteIds) : [],
      }));
    }),

  // Get schedule by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const [schedule] = await db
        .select()
        .from(publishingSchedules)
        .where(eq(publishingSchedules.id, input.id))
        .limit(1);

      if (!schedule) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      return {
        ...schedule,
        wordpressConnectionIds: schedule.wordpressConnectionIds ? JSON.parse(schedule.wordpressConnectionIds) : [],
        manusWebsiteIds: schedule.manusWebsiteIds ? JSON.parse(schedule.manusWebsiteIds) : [],
      };
    }),

  // Update a schedule
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      scheduledFor: z.date().optional(),
      publishToWordPress: z.boolean().optional(),
      wordpressConnectionIds: z.array(z.number()).optional(),
      wordpressStatus: z.enum(["draft", "publish", "pending"]).optional(),
      publishToManus: z.boolean().optional(),
      manusWebsiteIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Check if schedule exists and is still pending
      const [existing] = await db
        .select()
        .from(publishingSchedules)
        .where(eq(publishingSchedules.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      if (existing.status !== "pending") {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot update a schedule that is not pending',
        });
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (input.scheduledFor !== undefined) {
        if (input.scheduledFor <= new Date()) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Scheduled time must be in the future',
          });
        }
        updateData.scheduledFor = input.scheduledFor;
      }

      if (input.publishToWordPress !== undefined) {
        updateData.publishToWordPress = input.publishToWordPress ? 1 : 0;
      }

      if (input.wordpressConnectionIds !== undefined) {
        updateData.wordpressConnectionIds = JSON.stringify(input.wordpressConnectionIds);
      }

      if (input.wordpressStatus !== undefined) {
        updateData.wordpressStatus = input.wordpressStatus;
      }

      if (input.publishToManus !== undefined) {
        updateData.publishToManus = input.publishToManus ? 1 : 0;
      }

      if (input.manusWebsiteIds !== undefined) {
        updateData.manusWebsiteIds = JSON.stringify(input.manusWebsiteIds);
      }

      await db
        .update(publishingSchedules)
        .set(updateData)
        .where(eq(publishingSchedules.id, input.id));

      return {
        success: true,
        message: 'Schedule updated successfully',
      };
    }),

  // Cancel a schedule
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Check if schedule exists and is still pending
      const [existing] = await db
        .select()
        .from(publishingSchedules)
        .where(eq(publishingSchedules.id, input.id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Schedule not found',
        });
      }

      if (existing.status !== "pending") {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot cancel a schedule that is not pending',
        });
      }

      await db
        .update(publishingSchedules)
        .set({
          status: "failed",
          errorMessage: "Cancelled by user",
          updatedAt: new Date(),
        })
        .where(eq(publishingSchedules.id, input.id));

      return {
        success: true,
        message: 'Schedule cancelled successfully',
      };
    }),

  // Get pending schedules that need to be executed
  getPendingExecutions: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const now = new Date();

      const pending = await db
        .select({
          id: publishingSchedules.id,
          contentId: publishingSchedules.contentId,
          publishToWordPress: publishingSchedules.publishToWordPress,
          wordpressConnectionIds: publishingSchedules.wordpressConnectionIds,
          wordpressStatus: publishingSchedules.wordpressStatus,
          publishToManus: publishingSchedules.publishToManus,
          manusWebsiteIds: publishingSchedules.manusWebsiteIds,
          scheduledFor: publishingSchedules.scheduledFor,
        })
        .from(publishingSchedules)
        .where(
          and(
            eq(publishingSchedules.status, "pending"),
            lte(publishingSchedules.scheduledFor, now)
          )
        )
        .orderBy(publishingSchedules.scheduledFor);

      return pending.map(schedule => ({
        ...schedule,
        wordpressConnectionIds: schedule.wordpressConnectionIds ? JSON.parse(schedule.wordpressConnectionIds) : [],
        manusWebsiteIds: schedule.manusWebsiteIds ? JSON.parse(schedule.manusWebsiteIds) : [],
      }));
    }),

  // Mark schedule as processing
  markProcessing: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db
        .update(publishingSchedules)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(publishingSchedules.id, input.id));

      return { success: true };
    }),

  // Mark schedule as completed
  markCompleted: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db
        .update(publishingSchedules)
        .set({
          status: "completed",
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(publishingSchedules.id, input.id));

      return { success: true };
    }),

  // Mark schedule as failed
  markFailed: protectedProcedure
    .input(z.object({
      id: z.number(),
      errorMessage: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db
        .update(publishingSchedules)
        .set({
          status: "failed",
          errorMessage: input.errorMessage,
          executedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(publishingSchedules.id, input.id));

      return { success: true };
    }),

  // Manually trigger scheduled publishing job (for testing/admin use)
  triggerScheduledPublishing: protectedProcedure
    .mutation(async () => {
      const { triggerScheduledPublishing } = await import("../jobs/scheduledPublishing");
      return await triggerScheduledPublishing();
    }),
});
