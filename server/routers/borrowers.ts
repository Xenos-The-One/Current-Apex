import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getLoaAssignment, getClientByUserId } from "../db";
import {
  borrowers,
  borrowerActivities,
  borrowerDocuments,
  referralPartners,
  agencies,
  clients,
  users,
  leads,
} from "../../drizzle/schema";
import { eq, and, desc, asc, like, or, sql, gte, lte, inArray } from "drizzle-orm";

// ============= HELPER: Resolve user's agency/client context =============

async function resolveUserContext(user: { id: number; role: string }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  if (user.role === "admin") {
    // Admin sees all - get the first agency (Sterling Marketing)
    const allAgencies = await db.select().from(agencies).limit(1);
    return {
      agencyId: allAgencies[0]?.id || 1,
      clientId: null as number | null,
      isAdmin: true,
      userId: user.id,
    };
  }

  if (user.role === "loa") {
    const assignment = await getLoaAssignment(user.id);
    if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "No LOA assignment" });
    return {
      agencyId: assignment.agencyId,
      clientId: assignment.clientId,
      isAdmin: false,
      userId: user.id,
    };
  }

  // client_user or agency_owner
  const client = await getClientByUserId(user.id);
  if (client) {
    return {
      agencyId: client.agencyId,
      clientId: client.id as number | null,
      isAdmin: false,
      userId: user.id,
    };
  }

  throw new TRPCError({ code: "FORBIDDEN", message: "No agency context found" });
}

// ============= BORROWER INPUT SCHEMAS =============

const borrowerCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  secondaryPhone: z.string().optional().nullable(),
  dateOfBirth: z.date().optional().nullable(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed", "separated"]).optional().nullable(),
  dependents: z.number().optional().nullable(),
  preferredContactMethod: z.enum(["phone", "email", "text", "mail"]).optional().nullable(),
  preferredLanguage: z.string().optional().nullable(),

  // Address
  currentAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  county: z.string().optional().nullable(),
  housingStatus: z.enum(["renting", "own_with_mortgage", "own_free_clear", "living_with_family", "other"]).optional().nullable(),
  monthlyRent: z.string().optional().nullable(),
  yearsAtAddress: z.number().optional().nullable(),

  // Employment
  employmentStatus: z.enum(["employed", "self_employed", "retired", "unemployed", "military", "student"]).optional().nullable(),
  employer: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  yearsEmployed: z.number().optional().nullable(),
  monthlyIncome: z.string().optional().nullable(),
  additionalIncome: z.string().optional().nullable(),
  additionalIncomeSource: z.string().optional().nullable(),
  annualIncome: z.string().optional().nullable(),

  // Financial
  creditScoreRange: z.enum(["below_580", "580_619", "620_659", "660_699", "700_739", "740_779", "780_plus", "unknown"]).optional().nullable(),
  creditScoreExact: z.number().optional().nullable(),
  totalDebt: z.string().optional().nullable(),
  monthlyDebtPayments: z.string().optional().nullable(),
  bankruptcyHistory: z.boolean().optional().nullable(),
  foreclosureHistory: z.boolean().optional().nullable(),
  savingsAmount: z.string().optional().nullable(),
  downPaymentAmount: z.string().optional().nullable(),
  downPaymentSource: z.enum(["savings", "gift", "grant", "401k", "sale_of_property", "dpa_program", "other"]).optional().nullable(),
  dtiRatio: z.string().optional().nullable(),

  // Loan
  loanPurpose: z.enum(["purchase", "refinance_rate_term", "refinance_cash_out", "heloc", "reverse_mortgage", "construction", "renovation", "other"]).optional().nullable(),
  loanType: z.enum(["conventional", "fha", "va", "usda", "jumbo", "non_qm", "bridge", "hard_money", "other"]).optional().nullable(),
  desiredLoanAmount: z.string().optional().nullable(),
  estimatedPropertyValue: z.string().optional().nullable(),
  interestRateQuoted: z.string().optional().nullable(),
  loanTerm: z.enum(["15_year", "20_year", "25_year", "30_year", "arm_5_1", "arm_7_1", "arm_10_1", "other"]).optional().nullable(),

  // Property
  propertyType: z.enum(["single_family", "condo", "townhouse", "multi_unit_2_4", "multi_unit_5_plus", "manufactured", "land", "commercial", "other"]).optional().nullable(),
  propertyUse: z.enum(["primary_residence", "second_home", "investment"]).optional().nullable(),
  targetPropertyAddress: z.string().optional().nullable(),
  targetCity: z.string().optional().nullable(),
  targetState: z.string().optional().nullable(),
  targetZipCode: z.string().optional().nullable(),

  // Current mortgage (refi)
  currentLender: z.string().optional().nullable(),
  currentLoanBalance: z.string().optional().nullable(),
  currentInterestRate: z.string().optional().nullable(),
  currentMonthlyPayment: z.string().optional().nullable(),

  // Eligibility
  isFirstTimeBuyer: z.boolean().optional().nullable(),
  isVaEligible: z.boolean().optional().nullable(),
  isDpaEligible: z.boolean().optional().nullable(),
  dpaProgram: z.string().optional().nullable(),
  isPreApproved: z.boolean().optional().nullable(),
  preApprovalAmount: z.string().optional().nullable(),

  // Pipeline
  pipelineStatus: z.enum([
    "new", "contacted", "pre_qualified", "pre_approved", "house_hunting",
    "under_contract", "processing", "underwriting", "conditional_approval",
    "clear_to_close", "closed_funded", "closed_lost", "on_hold", "nurture"
  ]).optional(),
  purchaseTimeline: z.enum(["ready_now", "1_3_months", "3_6_months", "6_12_months", "12_plus_months", "just_exploring"]).optional().nullable(),
  urgencyLevel: z.enum(["low", "medium", "high", "critical"]).optional().nullable(),

  // Source
  leadSource: z.enum([
    "facebook_ad", "instagram_ad", "google_ad", "website", "referral_agent",
    "referral_past_client", "datacrawl", "webinar", "cold_call", "walk_in",
    "zillow", "realtor_com", "loan_depot", "other"
  ]).optional().nullable(),
  leadSourceDetail: z.string().optional().nullable(),
  referralPartnerId: z.number().optional().nullable(),

  // Scoring
  borrowerScore: z.number().optional().nullable(),
  scoreTier: z.enum(["hot", "warm", "cold", "dead"]).optional().nullable(),

  // Communication
  optInEmail: z.boolean().optional(),
  optInSms: z.boolean().optional(),
  optInPhone: z.boolean().optional(),
  doNotContact: z.boolean().optional(),

  // Notes
  internalNotes: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),

  // Follow-up
  nextFollowUpDate: z.date().optional().nullable(),
});

const borrowerUpdateSchema = borrowerCreateSchema.partial().extend({
  id: z.number(),
});

// ============= ROUTER =============

export const borrowersRouter = router({
  // ============= LIST BORROWERS =============
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      pipelineStatus: z.string().optional(),
      scoreTier: z.string().optional(),
      loanType: z.string().optional(),
      leadSource: z.string().optional(),
      sortBy: z.enum(["name", "created", "score", "status", "followUp"]).default("created"),
      sortDir: z.enum(["asc", "desc"]).default("desc"),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);
      const params = input ?? { search: undefined, pipelineStatus: undefined, scoreTier: undefined, loanType: undefined, leadSource: undefined, sortBy: 'created' as const, sortDir: 'desc' as const, limit: 50, offset: 0 };
      const conditions: any[] = [eq(borrowers.agencyId, userCtx.agencyId)];

      // Multi-tenant: non-admin only sees their own borrowers
      if (!userCtx.isAdmin && userCtx.clientId) {
        conditions.push(eq(borrowers.clientId, userCtx.clientId));
      }

      if (params.search) {
        conditions.push(
          or(
            like(borrowers.firstName, `%${params.search}%`),
            like(borrowers.lastName, `%${params.search}%`),
            like(borrowers.email, `%${params.search}%`),
            like(borrowers.phone, `%${params.search}%`),
            like(borrowers.city, `%${params.search}%`)
          )
        );
      }

      if (params.pipelineStatus) {
        conditions.push(eq(borrowers.pipelineStatus, params.pipelineStatus as any));
      }
      if (params.scoreTier) {
        conditions.push(eq(borrowers.scoreTier, params.scoreTier as any));
      }
      if (params.loanType) {
        conditions.push(eq(borrowers.loanType, params.loanType as any));
      }
      if (params.leadSource) {
        conditions.push(eq(borrowers.leadSource, params.leadSource as any));
      }

      // Determine sort
      let orderBy: any;
      const dir = params.sortDir === "asc" ? asc : desc;
      switch (params.sortBy) {
        case "name": orderBy = dir(borrowers.lastName); break;
        case "score": orderBy = dir(borrowers.borrowerScore); break;
        case "status": orderBy = dir(borrowers.pipelineStatus); break;
        case "followUp": orderBy = dir(borrowers.nextFollowUpDate); break;
        default: orderBy = dir(borrowers.createdAt);
      }

      const rows = await db.select().from(borrowers)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(params.limit || 50)
        .offset(params.offset || 0);

      // Get total count
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(borrowers)
        .where(and(...conditions));
      const total = Number(countResult[0]?.count || 0);

      return { borrowers: rows, total };
    }),

  // ============= GET SINGLE BORROWER =============
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);
      const conditions: any[] = [
        eq(borrowers.id, input.id),
        eq(borrowers.agencyId, userCtx.agencyId),
      ];
      if (!userCtx.isAdmin && userCtx.clientId) {
        conditions.push(eq(borrowers.clientId, userCtx.clientId));
      }

      const [borrower] = await db.select().from(borrowers).where(and(...conditions));
      if (!borrower) throw new TRPCError({ code: "NOT_FOUND", message: "Borrower not found" });

      // Get activities
      const activities = await db.select().from(borrowerActivities)
        .where(eq(borrowerActivities.borrowerId, input.id))
        .orderBy(desc(borrowerActivities.activityDate))
        .limit(50);

      // Get documents
      const documents = await db.select().from(borrowerDocuments)
        .where(eq(borrowerDocuments.borrowerId, input.id))
        .orderBy(desc(borrowerDocuments.createdAt));

      // Get referral partner if linked
      let partner = null;
      if (borrower.referralPartnerId) {
        const [p] = await db.select().from(referralPartners)
          .where(eq(referralPartners.id, borrower.referralPartnerId));
        partner = p || null;
      }

      return { borrower, activities, documents, referralPartner: partner };
    }),

  // ============= CREATE BORROWER =============
  create: protectedProcedure
    .input(borrowerCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);

      const insertData: any = {
        ...input,
        agencyId: userCtx.agencyId,
        clientId: userCtx.clientId,
        assignedUserId: userCtx.userId,
        pipelineStatus: input.pipelineStatus || "new",
        pipelineStatusChangedAt: new Date(),
      };

      // Remove undefined/null values to let DB defaults work
      Object.keys(insertData).forEach(key => {
        if (insertData[key] === undefined) delete insertData[key];
      });

      const result = await db.insert(borrowers).values(insertData);
      const insertId = Number((result as any)[0]?.insertId);

      // Log activity
      if (insertId) {
        await db.insert(borrowerActivities).values({
          borrowerId: insertId,
          agencyId: userCtx.agencyId,
          performedByUserId: userCtx.userId,
          activityType: "system_auto",
          title: "Borrower profile created",
          description: `${input.firstName} ${input.lastName} added to the database`,
          activityDate: new Date(),
        });
      }

      return { id: insertId, success: true };
    }),

  // ============= UPDATE BORROWER =============
  update: protectedProcedure
    .input(borrowerUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);
      const { id, ...updateData } = input;

      // Verify access
      const conditions: any[] = [
        eq(borrowers.id, id),
        eq(borrowers.agencyId, userCtx.agencyId),
      ];
      if (!userCtx.isAdmin && userCtx.clientId) {
        conditions.push(eq(borrowers.clientId, userCtx.clientId));
      }

      const [existing] = await db.select().from(borrowers).where(and(...conditions));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Borrower not found" });

      // Track pipeline status change
      if (updateData.pipelineStatus && updateData.pipelineStatus !== existing.pipelineStatus) {
        (updateData as any).pipelineStatusChangedAt = new Date();

        await db.insert(borrowerActivities).values({
          borrowerId: id,
          agencyId: userCtx.agencyId,
          performedByUserId: userCtx.userId,
          activityType: "status_change",
          title: `Status changed: ${existing.pipelineStatus} → ${updateData.pipelineStatus}`,
          metadata: JSON.stringify({ oldStatus: existing.pipelineStatus, newStatus: updateData.pipelineStatus }),
          activityDate: new Date(),
        });
      }

      // Clean undefined values
      const cleanData: any = {};
      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) cleanData[key] = value;
      });

      if (Object.keys(cleanData).length > 0) {
        await db.update(borrowers).set(cleanData).where(eq(borrowers.id, id));
      }

      return { success: true };
    }),

  // ============= DELETE BORROWER =============
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);
      if (!userCtx.isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can delete borrowers" });
      }

      // Delete activities and documents first
      await db.delete(borrowerActivities).where(eq(borrowerActivities.borrowerId, input.id));
      await db.delete(borrowerDocuments).where(eq(borrowerDocuments.borrowerId, input.id));
      await db.delete(borrowers).where(and(
        eq(borrowers.id, input.id),
        eq(borrowers.agencyId, userCtx.agencyId),
      ));

      return { success: true };
    }),

  // ============= PIPELINE SUMMARY (for Kanban view) =============
  pipelineSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const userCtx = await resolveUserContext(ctx.user);
    const conditions: any[] = [eq(borrowers.agencyId, userCtx.agencyId)];
    if (!userCtx.isAdmin && userCtx.clientId) {
      conditions.push(eq(borrowers.clientId, userCtx.clientId));
    }

    const result = await db
      .select({
        status: borrowers.pipelineStatus,
        count: sql<number>`count(*)`,
        totalLoanAmount: sql<string>`COALESCE(SUM(CAST(desired_loan_amount AS DECIMAL(14,2))), 0)`,
      })
      .from(borrowers)
      .where(and(...conditions))
      .groupBy(borrowers.pipelineStatus);

    return result;
  }),

  // ============= ADD ACTIVITY =============
  addActivity: protectedProcedure
    .input(z.object({
      borrowerId: z.number(),
      activityType: z.enum([
        "note", "phone_call", "email_sent", "email_received", "sms_sent", "sms_received",
        "status_change", "document_uploaded", "document_requested",
        "pre_approval_issued", "pre_approval_expired",
        "appointment_scheduled", "appointment_completed", "appointment_no_show",
        "application_submitted", "application_updated",
        "credit_pulled", "income_verified", "appraisal_ordered", "appraisal_received",
        "underwriting_submitted", "conditional_approval", "clear_to_close",
        "closing_scheduled", "closed_funded",
        "referral_received", "referral_sent",
        "follow_up_scheduled", "follow_up_completed",
        "score_changed", "tag_added", "tag_removed",
        "system_auto"
      ]),
      title: z.string().min(1),
      description: z.string().optional(),
      callDuration: z.number().optional(),
      emailSubject: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);

      await db.insert(borrowerActivities).values({
        borrowerId: input.borrowerId,
        agencyId: userCtx.agencyId,
        performedByUserId: userCtx.userId,
        activityType: input.activityType,
        title: input.title,
        description: input.description,
        callDuration: input.callDuration,
        emailSubject: input.emailSubject,
        activityDate: new Date(),
      });

      // Update last contacted date
      if (["phone_call", "email_sent", "sms_sent"].includes(input.activityType)) {
        await db.update(borrowers)
          .set({ lastContactedAt: new Date() })
          .where(eq(borrowers.id, input.borrowerId));
      }

      return { success: true };
    }),

  // ============= GET ACTIVITIES =============
  getActivities: protectedProcedure
    .input(z.object({
      borrowerId: z.number(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      return await db.select().from(borrowerActivities)
        .where(eq(borrowerActivities.borrowerId, input.borrowerId))
        .orderBy(desc(borrowerActivities.activityDate))
        .limit(input.limit);
    }),

  // ============= ANALYTICS / STATS =============
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const userCtx = await resolveUserContext(ctx.user);
    const conditions: any[] = [eq(borrowers.agencyId, userCtx.agencyId)];
    if (!userCtx.isAdmin && userCtx.clientId) {
      conditions.push(eq(borrowers.clientId, userCtx.clientId));
    }

    const allBorrowers = await db.select().from(borrowers).where(and(...conditions));
    const total = allBorrowers.length;

    // Score tier breakdown
    const hot = allBorrowers.filter(b => b.scoreTier === "hot").length;
    const warm = allBorrowers.filter(b => b.scoreTier === "warm").length;
    const cold = allBorrowers.filter(b => b.scoreTier === "cold").length;
    const dead = allBorrowers.filter(b => b.scoreTier === "dead").length;

    // Pipeline counts
    const pipelineCounts: Record<string, number> = {};
    allBorrowers.forEach(b => {
      pipelineCounts[b.pipelineStatus] = (pipelineCounts[b.pipelineStatus] || 0) + 1;
    });

    // Loan type breakdown
    const loanTypes: Record<string, number> = {};
    allBorrowers.forEach(b => {
      if (b.loanType) loanTypes[b.loanType] = (loanTypes[b.loanType] || 0) + 1;
    });

    // Source breakdown
    const sources: Record<string, number> = {};
    allBorrowers.forEach(b => {
      if (b.leadSource) sources[b.leadSource] = (sources[b.leadSource] || 0) + 1;
    });

    // Total pipeline value
    const totalPipelineValue = allBorrowers.reduce((sum, b) => {
      return sum + (parseFloat(b.desiredLoanAmount as string) || 0);
    }, 0);

    // Average credit score
    const scoresWithValues = allBorrowers.filter(b => b.creditScoreExact);
    const avgCreditScore = scoresWithValues.length > 0
      ? Math.round(scoresWithValues.reduce((sum, b) => sum + (b.creditScoreExact || 0), 0) / scoresWithValues.length)
      : 0;

    // Follow-ups due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const followUpsDue = allBorrowers.filter(b => {
      if (!b.nextFollowUpDate) return false;
      const d = new Date(b.nextFollowUpDate);
      return d >= today && d < tomorrow;
    }).length;

    return {
      total,
      scoreTiers: { hot, warm, cold, dead },
      pipelineCounts,
      loanTypes,
      sources,
      totalPipelineValue,
      avgCreditScore,
      followUpsDue,
    };
  }),

  // ============= BULK UPDATE PIPELINE STATUS =============
  bulkUpdateStatus: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      pipelineStatus: z.enum([
        "new", "contacted", "pre_qualified", "pre_approved", "house_hunting",
        "under_contract", "processing", "underwriting", "conditional_approval",
        "clear_to_close", "closed_funded", "closed_lost", "on_hold", "nurture"
      ]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);

      await db.update(borrowers)
        .set({
          pipelineStatus: input.pipelineStatus,
          pipelineStatusChangedAt: new Date(),
        })
        .where(and(
          inArray(borrowers.id, input.ids),
          eq(borrowers.agencyId, userCtx.agencyId),
        ));

      return { success: true, updated: input.ids.length };
    }),

  // ============= CONVERT LEAD TO BORROWER =============
  convertFromLead: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      // Optional overrides / additional data
      loanType: z.enum(["conventional", "fha", "va", "usda", "jumbo", "non_qm", "bridge", "hard_money", "other"]).optional().nullable(),
      loanPurpose: z.enum(["purchase", "refinance_rate_term", "refinance_cash_out", "heloc", "reverse_mortgage", "construction", "renovation", "other"]).optional().nullable(),
      desiredLoanAmount: z.string().optional().nullable(),
      estimatedPropertyValue: z.string().optional().nullable(),
      pipelineStatus: z.enum([
        "new", "contacted", "pre_qualified", "pre_approved", "house_hunting",
        "under_contract", "processing", "underwriting", "conditional_approval",
        "clear_to_close", "closed_funded", "closed_lost", "on_hold", "nurture"
      ]).default("new"),
      internalNotes: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userCtx = await resolveUserContext(ctx.user);

      // Fetch the lead
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId));
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      // Check if already converted
      const [existing] = await db.select({ id: borrowers.id }).from(borrowers)
        .where(eq(borrowers.originalLeadId, input.leadId));
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This lead has already been converted to a borrower" });
      }

      // Map lead source to borrower lead source
      const sourceMap: Record<string, string> = {
        "Facebook Ad": "facebook_ad",
        "Instagram Ad": "instagram_ad",
        "Google Ad": "google_ad",
        "Website": "website",
        "Referral": "referral_agent",
        "Webinar": "webinar",
        "Cold Call": "cold_call",
        "Walk-In": "walk_in",
        "Zillow": "zillow",
        "Realtor.com": "realtor_com",
      };

      const mappedSource = lead.source ? (sourceMap[lead.source] || "other") : null;

      // Parse customFields from lead if available
      let customData: any = {};
      if (lead.customFields) {
        try { customData = JSON.parse(lead.customFields); } catch {}
      }

      const insertData: any = {
        agencyId: lead.agencyId,
        clientId: lead.clientId,
        assignedUserId: userCtx.userId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email || null,
        phone: lead.phone || null,
        leadSource: mappedSource,
        leadSourceDetail: lead.source,
        originalLeadId: lead.id,
        pipelineStatus: input.pipelineStatus,
        pipelineStatusChangedAt: new Date(),
        internalNotes: input.internalNotes || lead.notes || null,
        borrowerScore: lead.score || 0,
        scoreTier: lead.scoreTier || "cold",
      };

      // Add optional overrides
      if (input.loanType) insertData.loanType = input.loanType;
      if (input.loanPurpose) insertData.loanPurpose = input.loanPurpose;
      if (input.desiredLoanAmount) insertData.desiredLoanAmount = input.desiredLoanAmount;
      if (input.estimatedPropertyValue) insertData.estimatedPropertyValue = input.estimatedPropertyValue;

      // Map property fields from lead custom fields if available
      if (customData.propertyAddress) insertData.targetPropertyAddress = customData.propertyAddress;
      if (customData.propertyCity) insertData.targetCity = customData.propertyCity;
      if (customData.propertyState) insertData.targetState = customData.propertyState;
      if (customData.propertyZip) insertData.targetZipCode = customData.propertyZip;

      const result = await db.insert(borrowers).values(insertData);
      const insertId = Number((result as any)[0]?.insertId);

      // Log activity on the new borrower
      if (insertId) {
        await db.insert(borrowerActivities).values({
          borrowerId: insertId,
          agencyId: lead.agencyId,
          performedByUserId: userCtx.userId,
          activityType: "system_auto",
          title: "Converted from lead",
          description: `Converted from lead #${lead.id} (${lead.firstName} ${lead.lastName}). Original source: ${lead.source || "unknown"}`,
          activityDate: new Date(),
        });
      }

      return { id: insertId, success: true };
    }),
});
