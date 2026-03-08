import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { campaignTemplates } from "../../drizzle/schema";
import { eq, and, or, isNull } from "drizzle-orm";

export const templatesRouter = router({
  list: protectedProcedure
    .input(z.object({
      type: z.enum(["email", "sms"]).optional(),
      agencyId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const conditions = [];
      
      // Show system templates + user's agency templates
      if (input.agencyId) {
        conditions.push(
          or(
            eq(campaignTemplates.isSystem, true),
            eq(campaignTemplates.agencyId, input.agencyId)
          )!
        );
      } else {
        // Admin can see all
        if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
          conditions.push(eq(campaignTemplates.isSystem, true));
        }
      }

      if (input.type) {
        conditions.push(eq(campaignTemplates.type, input.type));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const templates = await db
        .select()
        .from(campaignTemplates)
        .where(whereClause)
        .orderBy(campaignTemplates.createdAt);

      return templates.map(t => ({
        ...t,
        variables: t.variables ? JSON.parse(t.variables) : [],
      }));
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const template = await db
        .select()
        .from(campaignTemplates)
        .where(eq(campaignTemplates.id, input.id))
        .limit(1);

      if (!template[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      return {
        ...template[0],
        variables: template[0].variables ? JSON.parse(template[0].variables) : [],
      };
    }),

  create: protectedProcedure
    .input(z.object({
      agencyId: z.number().optional(),
      name: z.string().min(1),
      type: z.enum(["email", "sms"]),
      category: z.string().optional(),
      subject: z.string().optional(),
      content: z.string().min(1),
      variables: z.array(z.string()).optional(),
      isSystem: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Only admin can create system templates
      if (input.isSystem && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can create system templates" });
      }

      const result = await db.insert(campaignTemplates).values({
        agencyId: input.agencyId || null,
        name: input.name,
        type: input.type,
        category: input.category || null,
        subject: input.subject || null,
        content: input.content,
        variables: input.variables ? JSON.stringify(input.variables) : null,
        isSystem: input.isSystem,
        createdBy: ctx.user.id,
      });

      return { id: Number((result as any).insertId) };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      category: z.string().optional(),
      subject: z.string().optional(),
      content: z.string().min(1).optional(),
      variables: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if template exists and user can edit it
      const existing = await db
        .select()
        .from(campaignTemplates)
        .where(eq(campaignTemplates.id, input.id))
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      // Can't edit system templates unless admin
      if (existing[0].isSystem && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot edit system templates" });
      }

      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.subject !== undefined) updateData.subject = input.subject;
      if (input.content) updateData.content = input.content;
      if (input.variables) updateData.variables = JSON.stringify(input.variables);

      await db
        .update(campaignTemplates)
        .set(updateData)
        .where(eq(campaignTemplates.id, input.id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if template exists
      const existing = await db
        .select()
        .from(campaignTemplates)
        .where(eq(campaignTemplates.id, input.id))
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      // Can't delete system templates
      if (existing[0].isSystem) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete system templates" });
      }

      await db
        .delete(campaignTemplates)
        .where(eq(campaignTemplates.id, input.id));

      return { success: true };
    }),
});
