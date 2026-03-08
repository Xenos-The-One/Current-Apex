import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getLoaAssignment, getClientByUserId } from "../db";
import { referralPartners, borrowers, agencies } from "../../drizzle/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";

// Reuse the same context resolver
async function resolveUserContext(user: { id: number; role: string }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  if (user.role === "admin") {
    const allAgencies = await db.select().from(agencies).limit(1);
    return { agencyId: allAgencies[0]?.id || 1, clientId: null as number | null, isAdmin: true, userId: user.id };
  }

  if (user.role === "loa") {
    const assignment = await getLoaAssignment(user.id);
    if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "No LOA assignment" });
    return { agencyId: assignment.agencyId, clientId: assignment.clientId, isAdmin: false, userId: user.id };
  }

  const { getClientByUserId: getClient } = await import("../db");
  const client = await getClient(user.id);
  if (client) return { agencyId: client.agencyId, clientId: client.id as number | null, isAdmin: false, userId: user.id };

  throw new TRPCError({ code: "FORBIDDEN", message: "No agency context found" });
}

const partnerCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  secondaryPhone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  brokerage: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  licenseState: z.string().optional().nullable(),
  nmls: z.string().optional().nullable(),
  yearsInBusiness: z.number().optional().nullable(),
  partnerType: z.enum([
    "real_estate_agent", "real_estate_broker", "financial_advisor",
    "insurance_agent", "attorney", "cpa", "builder", "past_client", "other"
  ]),
  specialties: z.string().optional().nullable(), // JSON array
  serviceAreas: z.string().optional().nullable(), // JSON array
  priceRangeMin: z.string().optional().nullable(),
  priceRangeMax: z.string().optional().nullable(),
  relationshipStatus: z.enum(["new", "active", "vip", "inactive", "lost"]).optional(),
  preferredContactMethod: z.enum(["phone", "email", "text"]).optional(),
  hasReferralAgreement: z.boolean().optional(),
  commissionSplit: z.string().optional().nullable(),
  referralFeeType: z.enum(["percentage", "flat_fee", "none"]).optional(),
  referralFeeAmount: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  nextFollowUpDate: z.date().optional().nullable(),
});

export const referralPartnersRouter = router({
  // ============= LIST PARTNERS =============
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      partnerType: z.string().optional(),
      relationshipStatus: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);
      const params = input ?? { search: undefined, partnerType: undefined, relationshipStatus: undefined, limit: 50, offset: 0 };
      const conditions: any[] = [eq(referralPartners.agencyId, userCtx.agencyId)];

      if (!userCtx.isAdmin && userCtx.clientId) {
        conditions.push(eq(referralPartners.clientId, userCtx.clientId));
      }

      if (params.search) {
        conditions.push(
          or(
            like(referralPartners.firstName, `%${params.search}%`),
            like(referralPartners.lastName, `%${params.search}%`),
            like(referralPartners.company, `%${params.search}%`),
            like(referralPartners.email, `%${params.search}%`),
          )
        );
      }

      if (params.partnerType) {
        conditions.push(eq(referralPartners.partnerType, params.partnerType as any));
      }
      if (params.relationshipStatus) {
        conditions.push(eq(referralPartners.relationshipStatus, params.relationshipStatus as any));
      }

      const rows = await db.select().from(referralPartners)
        .where(and(...conditions))
        .orderBy(desc(referralPartners.createdAt))
        .limit(params.limit ?? 50)
        .offset(params.offset ?? 0);

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(referralPartners)
        .where(and(...conditions));
      const total = Number(countResult[0]?.count || 0);

      return { partners: rows, total };
    }),

  // ============= GET SINGLE PARTNER =============
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);
      const conditions: any[] = [
        eq(referralPartners.id, input.id),
        eq(referralPartners.agencyId, userCtx.agencyId),
      ];
      if (!userCtx.isAdmin && userCtx.clientId) {
        conditions.push(eq(referralPartners.clientId, userCtx.clientId));
      }

      const [partner] = await db.select().from(referralPartners).where(and(...conditions));
      if (!partner) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });

      // Get referred borrowers
      const referredBorrowers = await db.select({
        id: borrowers.id,
        firstName: borrowers.firstName,
        lastName: borrowers.lastName,
        pipelineStatus: borrowers.pipelineStatus,
        desiredLoanAmount: borrowers.desiredLoanAmount,
        createdAt: borrowers.createdAt,
      }).from(borrowers)
        .where(eq(borrowers.referralPartnerId, input.id))
        .orderBy(desc(borrowers.createdAt));

      return { partner, referredBorrowers };
    }),

  // ============= CREATE PARTNER =============
  create: protectedProcedure
    .input(partnerCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);

      const insertData: any = {
        ...input,
        agencyId: userCtx.agencyId,
        clientId: userCtx.clientId,
        relationshipStatus: input.relationshipStatus || "new",
        relationshipStartDate: new Date(),
      };

      Object.keys(insertData).forEach(key => {
        if (insertData[key] === undefined) delete insertData[key];
      });

      const result = await db.insert(referralPartners).values(insertData);
      const insertId = Number((result as any)[0]?.insertId);

      return { id: insertId, success: true };
    }),

  // ============= UPDATE PARTNER =============
  update: protectedProcedure
    .input(partnerCreateSchema.partial().extend({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);
      const { id, ...updateData } = input;

      const conditions: any[] = [
        eq(referralPartners.id, id),
        eq(referralPartners.agencyId, userCtx.agencyId),
      ];
      if (!userCtx.isAdmin && userCtx.clientId) {
        conditions.push(eq(referralPartners.clientId, userCtx.clientId));
      }

      const [existing] = await db.select().from(referralPartners).where(and(...conditions));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });

      const cleanData: any = {};
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) cleanData[key] = value;
      });

      if (Object.keys(cleanData).length > 0) {
        await db.update(referralPartners).set(cleanData).where(eq(referralPartners.id, id));
      }

      return { success: true };
    }),

  // ============= DELETE PARTNER =============
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);
      if (!userCtx.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete partners" });
      }

      await db.delete(referralPartners).where(and(
        eq(referralPartners.id, input.id),
        eq(referralPartners.agencyId, userCtx.agencyId),
      ));

      return { success: true };
    }),

  // ============= STATS =============
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const userCtx = await resolveUserContext(ctx.user);
    const conditions: any[] = [eq(referralPartners.agencyId, userCtx.agencyId)];
    if (!userCtx.isAdmin && userCtx.clientId) {
      conditions.push(eq(referralPartners.clientId, userCtx.clientId));
    }

    const allPartners = await db.select().from(referralPartners).where(and(...conditions));
    const total = allPartners.length;

    const statusCounts: Record<string, number> = {};
    allPartners.forEach(p => {
      statusCounts[p.relationshipStatus] = (statusCounts[p.relationshipStatus] || 0) + 1;
    });

    const typeCounts: Record<string, number> = {};
    allPartners.forEach(p => {
      typeCounts[p.partnerType] = (typeCounts[p.partnerType] || 0) + 1;
    });

    const totalReferrals = allPartners.reduce((sum, p) => sum + (p.totalReferrals || 0), 0);
    const totalClosedReferrals = allPartners.reduce((sum, p) => sum + (p.closedReferrals || 0), 0);
    const totalVolume = allPartners.reduce((sum, p) => sum + parseFloat(p.totalReferralVolume as string || "0"), 0);

    return {
      total,
      statusCounts,
      typeCounts,
      totalReferrals,
      totalClosedReferrals,
      totalVolume,
    };
  }),
});
