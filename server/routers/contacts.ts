import { TRPCError } from "@trpc/server";
import { and, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { referralPartners } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const contactsRouter = router({
  listPartners: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      search: z.string().optional(),
      partnerType: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(referralPartners.agencyId, input.agencyId)];
      if (input.search) {
        conditions.push(or(
          like(referralPartners.firstName, `%${input.search}%`),
          like(referralPartners.lastName, `%${input.search}%`),
          like(referralPartners.company, `%${input.search}%`),
          like(referralPartners.email, `%${input.search}%`)
        ) as any);
      }
      if (input.partnerType) conditions.push(eq(referralPartners.partnerType, input.partnerType as any));
      if (input.status) conditions.push(eq(referralPartners.status, input.status as any));
      return db.select().from(referralPartners)
        .where(and(...conditions))
        .orderBy(desc(referralPartners.referralCount), referralPartners.firstName)
        .limit(input.limit).offset(input.offset);
    }),

  getPartnerById: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [partner] = await db.select().from(referralPartners)
        .where(and(eq(referralPartners.id, input.id), eq(referralPartners.agencyId, input.agencyId))).limit(1);
      if (!partner) throw new TRPCError({ code: "NOT_FOUND" });
      return partner;
    }),

  createPartner: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      company: z.string().optional(),
      partnerType: z.enum(["attorney", "title_co", "builder", "re_agent", "insurance", "lender", "accountant", "financial_advisor", "other"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(referralPartners).values({ ...input, assignedUserId: ctx.user.id });
      return { id: (result as any).insertId };
    }),

  updatePartner: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      partnerType: z.string().optional(),
      status: z.enum(["active", "inactive", "prospect"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      await db.update(referralPartners).set(rest as any).where(and(eq(referralPartners.id, id), eq(referralPartners.agencyId, agencyId)));
      return { success: true };
    }),

  deletePartner: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(referralPartners).where(and(eq(referralPartners.id, input.id), eq(referralPartners.agencyId, input.agencyId)));
      return { success: true };
    }),
});
