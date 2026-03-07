import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, like } from "drizzle-orm";
import { z } from "zod";
import { agencies, leads, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const agenciesRouter = router({
  list: adminProcedure
    .input(z.object({ search: z.string().optional(), status: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [];
      if (input.search) conditions.push(like(agencies.name, `%${input.search}%`));
      if (input.status) conditions.push(eq(agencies.status, input.status as any));
      const rows = await db.select().from(agencies)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(agencies.createdAt))
        .limit(input.limit).offset(input.offset);
      return rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [agency] = await db.select().from(agencies).where(eq(agencies.id, input.id)).limit(1);
      if (!agency) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "super_admin" && ctx.user.agencyId !== input.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return agency;
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      address: z.string().optional(),
      maxUsers: z.number().default(5),
      maxLeads: z.number().default(500),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const existing = await db.select().from(agencies).where(eq(agencies.slug, input.slug)).limit(1);
      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "Slug already exists" });
      const [result] = await db.insert(agencies).values({ ...input, status: "trial" });
      return { id: (result as any).insertId };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      website: z.string().optional(),
      address: z.string().optional(),
      status: z.enum(["active", "suspended", "trial", "cancelled"]).optional(),
      maxUsers: z.number().optional(),
      maxLeads: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(agencies).set(data).where(eq(agencies.id, id));
      return { success: true };
    }),

  getStats: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.agencyId, input.id));
      const [leadCount] = await db.select({ count: count() }).from(leads).where(eq(leads.agencyId, input.id));
      return { users: userCount?.count ?? 0, leads: leadCount?.count ?? 0 };
    }),

  listUsers: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (ctx.user.role !== "super_admin" && ctx.user.agencyId !== input.agencyId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.select().from(users).where(eq(users.agencyId, input.agencyId)).orderBy(users.name);
    }),
});
