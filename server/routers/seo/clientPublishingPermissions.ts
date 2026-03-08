/**
 * Client Publishing Permissions Router
 *
 * Manages role-based access controls for what publishing actions
 * client portal users are allowed to perform.
 */

import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../seo-db";
import { clientPublishingPermissions } from "../../../drizzle/seo-schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const clientPublishingPermissionsRouter = router({
  /** Get permissions for a client (creates default if not exists) */
  getPermissions: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [existing] = await db
        .select()
        .from(clientPublishingPermissions)
        .where(eq(clientPublishingPermissions.clientId, input.clientId))
        .limit(1);

      if (existing) {
        return {
          ...existing,
          allowedWordPressIds: existing.allowedWordPressIds
            ? JSON.parse(existing.allowedWordPressIds)
            : null,
          allowedManusIds: existing.allowedManusIds
            ? JSON.parse(existing.allowedManusIds)
            : null,
        };
      }

      // Return defaults without persisting (lazy creation on first save)
      return {
        id: null,
        clientId: input.clientId,
        canPublishToWordPress: 0,
        canPublishToManus: 0,
        canSchedulePublishing: 0,
        canApproveContent: 1,
        canRequestRevisions: 1,
        allowedWordPressIds: null,
        allowedManusIds: null,
        updatedBy: null,
        createdAt: null,
        updatedAt: null,
      };
    }),

  /** Save / update permissions for a client */
  savePermissions: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        canPublishToWordPress: z.boolean(),
        canPublishToManus: z.boolean(),
        canSchedulePublishing: z.boolean(),
        canApproveContent: z.boolean(),
        canRequestRevisions: z.boolean(),
        allowedWordPressIds: z.array(z.number()).nullable().optional(),
        allowedManusIds: z.array(z.number()).nullable().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

      const [existing] = await db
        .select({ id: clientPublishingPermissions.id })
        .from(clientPublishingPermissions)
        .where(eq(clientPublishingPermissions.clientId, input.clientId))
        .limit(1);

      const values = {
        canPublishToWordPress: input.canPublishToWordPress ? 1 : 0,
        canPublishToManus: input.canPublishToManus ? 1 : 0,
        canSchedulePublishing: input.canSchedulePublishing ? 1 : 0,
        canApproveContent: input.canApproveContent ? 1 : 0,
        canRequestRevisions: input.canRequestRevisions ? 1 : 0,
        allowedWordPressIds:
          input.allowedWordPressIds != null
            ? JSON.stringify(input.allowedWordPressIds)
            : null,
        allowedManusIds:
          input.allowedManusIds != null
            ? JSON.stringify(input.allowedManusIds)
            : null,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(clientPublishingPermissions)
          .set(values)
          .where(eq(clientPublishingPermissions.clientId, input.clientId));
        return { success: true, id: existing.id };
      }

      const [result] = await db.insert(clientPublishingPermissions).values({
        clientId: input.clientId,
        ...values,
        createdAt: new Date(),
      });
      return { success: true, id: result.insertId };
    }),
});
