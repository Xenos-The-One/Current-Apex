import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { borrowers, loanMilestones } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const borrowersRouter = router({
  list: protectedProcedure
    .input(z.object({ agencyId: z.number(), search: z.string().optional(), milestone: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(borrowers)
        .where(eq(borrowers.agencyId, input.agencyId))
        .orderBy(desc(borrowers.createdAt))
        .limit(input.limit).offset(input.offset);
      return rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [borrower] = await db.select().from(borrowers)
        .where(and(eq(borrowers.id, input.id), eq(borrowers.agencyId, input.agencyId))).limit(1);
      if (!borrower) throw new TRPCError({ code: "NOT_FOUND" });
      const milestones = await db.select().from(loanMilestones)
        .where(eq(loanMilestones.borrowerId, input.id))
        .orderBy(loanMilestones.createdAt);
      return { ...borrower, milestones };
    }),

  create: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      leadId: z.number().optional(),
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      address: z.string().optional(),
      loanType: z.enum(["conventional", "fha", "va", "usda", "jumbo", "heloc", "refinance", "other"]).optional(),
      loanAmount: z.string().optional(),
      propertyAddress: z.string().optional(),
      propertyType: z.enum(["single_family", "condo", "townhouse", "multi_family", "commercial", "land", "other"]).optional(),
      purchasePrice: z.string().optional(),
      downPayment: z.string().optional(),
      creditScore: z.number().optional(),
      annualIncome: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { agencyId, ...rest } = input;
      const [result] = await db.insert(borrowers).values({ ...rest, agencyId, assignedUserId: ctx.user.id, currentMilestone: "inquiry" });
      const insertId = (result as any).insertId;
      // Create default milestones
      const defaultMilestones = ["inquiry", "pre_approval", "application", "processing", "underwriting", "conditional_approval", "clear_to_close", "closing", "funded"];
      for (const m of defaultMilestones) {
        await db.insert(loanMilestones).values({ borrowerId: insertId, agencyId, milestone: m, status: m === "inquiry" ? "in_progress" : "pending" });
      }
      return { id: insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      loanType: z.string().optional(),
      loanAmount: z.string().optional(),
      currentMilestone: z.string().optional(),
      creditScore: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      await db.update(borrowers).set(rest as any).where(and(eq(borrowers.id, id), eq(borrowers.agencyId, agencyId)));
      return { success: true };
    }),

  updateMilestone: protectedProcedure
    .input(z.object({
      borrowerId: z.number(),
      agencyId: z.number(),
      milestone: z.string(),
      status: z.enum(["pending", "in_progress", "completed", "failed"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const completedAt = input.status === "completed" ? new Date() : undefined;
      await db.update(loanMilestones)
        .set({ status: input.status, completedAt, notes: input.notes })
        .where(and(eq(loanMilestones.borrowerId, input.borrowerId), eq(loanMilestones.milestone, input.milestone)));
      if (input.status === "completed") {
        await db.update(borrowers).set({ currentMilestone: input.milestone as any }).where(eq(borrowers.id, input.borrowerId));
      }
      return { success: true };
    }),
});
