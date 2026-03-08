import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

export const accountRouter = router({
  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        phone: users.phone,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id));

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    return user;
  }),

  // Update profile (name, email, phone)
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().max(320).optional(),
        phone: z.string().max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.phone !== undefined) updateData.phone = input.phone;

      if (Object.keys(updateData).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No fields to update",
        });
      }

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // Upload avatar
  uploadAvatar: protectedProcedure
    .input(
      z.object({
        base64: z.string(),
        mimeType: z.string().regex(/^image\/(jpeg|png|gif|webp)$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const buffer = Buffer.from(input.base64, "base64");

      // Max 5MB
      if (buffer.length > 5 * 1024 * 1024) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Image must be less than 5MB",
        });
      }

      const ext = input.mimeType.split("/")[1];
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      const fileKey = `avatars/${ctx.user.id}-${randomSuffix}.${ext}`;

      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      await db
        .update(users)
        .set({ avatarUrl: url })
        .where(eq(users.id, ctx.user.id));

      return { url };
    }),

  // Remove avatar
  removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

    await db
      .update(users)
      .set({ avatarUrl: null })
      .where(eq(users.id, ctx.user.id));

    return { success: true };
  }),
});
