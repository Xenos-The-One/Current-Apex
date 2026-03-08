import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { agencies, invoices, subscriptionPlans } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const billingRouter = router({
  listPlans: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(subscriptionPlans.monthlyPrice);
  }),

  createPlan: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      slug: z.string().min(1),
      description: z.string().optional(),
      monthlyPrice: z.string(),
      annualPrice: z.string().optional(),
      maxUsers: z.number().default(5),
      maxLeads: z.number().default(500),
      maxCampaigns: z.number().default(10),
      features: z.array(z.string()).optional(),
      stripePriceIdMonthly: z.string().optional(),
      stripePriceIdAnnual: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { features, ...rest } = input;
      const [result] = await db.insert(subscriptionPlans).values({ ...rest, features: features ? JSON.stringify(features) : null });
      return { id: (result as any).insertId };
    }),

  getAgencyBilling: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (ctx.user.role !== "super_admin" && ctx.user.agencyId !== input.agencyId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const [agency] = await db.select().from(agencies).where(eq(agencies.id, input.agencyId)).limit(1);
      const recentInvoices = await db.select().from(invoices)
        .where(eq(invoices.agencyId, input.agencyId))
        .orderBy(desc(invoices.createdAt)).limit(12);
      let plan = null;
      if (agency?.subscriptionPlanId) {
        const [p] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, agency.subscriptionPlanId)).limit(1);
        plan = p;
      }
      return { agency, plan, invoices: recentInvoices };
    }),

  listInvoices: adminProcedure
    .input(z.object({ agencyId: z.number(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(invoices)
        .where(eq(invoices.agencyId, input.agencyId))
        .orderBy(desc(invoices.createdAt))
        .limit(input.limit);
    }),

  assignPlan: adminProcedure
    .input(z.object({ agencyId: z.number(), planId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, input.planId)).limit(1);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      await db.update(agencies).set({
        subscriptionPlanId: input.planId,
        maxUsers: plan.maxUsers ?? 5,
        maxLeads: plan.maxLeads ?? 500,
        status: "active",
      }).where(eq(agencies.id, input.agencyId));
      return { success: true };
    }),
});
