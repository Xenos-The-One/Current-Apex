import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { borrowers, agencies, clients } from "../../drizzle/schema";
import { eq, and, sql, gte, lte, isNotNull, count } from "drizzle-orm";

const dateRangeInput = z.object({
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(),
}).optional();

function buildDateFilter(startDate?: string, endDate?: string) {
  const conditions = [];
  if (startDate) conditions.push(gte(borrowers.createdAt, new Date(startDate)));
  if (endDate) conditions.push(lte(borrowers.createdAt, new Date(endDate)));
  return conditions;
}

export const marketAnalyticsRouter = router({
  // Pipeline funnel - count borrowers at each stage
  pipelineFunnel: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);

      const results = await db
        .select({
          status: borrowers.pipelineStatus,
          count: sql<number>`COUNT(*)`.as("count"),
        })
        .from(borrowers)
        .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
        .groupBy(borrowers.pipelineStatus);

      // Define the funnel order
      const funnelOrder = [
        "new", "contacted", "pre_qualified", "pre_approved", "house_hunting",
        "under_contract", "processing", "underwriting", "conditional_approval",
        "clear_to_close", "closed_funded", "closed_lost", "on_hold", "nurture"
      ];

      const statusLabels: Record<string, string> = {
        new: "New",
        contacted: "Contacted",
        pre_qualified: "Pre-Qualified",
        pre_approved: "Pre-Approved",
        house_hunting: "House Hunting",
        under_contract: "Under Contract",
        processing: "Processing",
        underwriting: "Underwriting",
        conditional_approval: "Conditional Approval",
        clear_to_close: "Clear to Close",
        closed_funded: "Closed/Funded",
        closed_lost: "Closed/Lost",
        on_hold: "On Hold",
        nurture: "Nurture",
      };

      const resultMap = new Map(results.map(r => [r.status, Number(r.count)]));

      return funnelOrder.map(status => ({
        status,
        label: statusLabels[status] || status,
        count: resultMap.get(status as any) || 0,
      }));
    }),

  // Loan type distribution
  loanTypeDistribution: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);
      const conditions = [isNotNull(borrowers.loanType), ...dateConditions];

      const results = await db
        .select({
          loanType: borrowers.loanType,
          count: sql<number>`COUNT(*)`.as("count"),
          totalAmount: sql<string>`COALESCE(SUM(desired_loan_amount), 0)`.as("totalAmount"),
        })
        .from(borrowers)
        .where(and(...conditions))
        .groupBy(borrowers.loanType);

      const labels: Record<string, string> = {
        conventional: "Conventional",
        fha: "FHA",
        va: "VA",
        usda: "USDA",
        jumbo: "Jumbo",
        non_qm: "Non-QM",
        bridge: "Bridge",
        hard_money: "Hard Money",
        other: "Other",
      };

      return results.map(r => ({
        loanType: r.loanType,
        label: labels[r.loanType || ""] || r.loanType || "Unknown",
        count: Number(r.count),
        totalAmount: parseFloat(r.totalAmount) || 0,
      }));
    }),

  // Credit score distribution
  creditScoreDistribution: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);
      const conditions = [isNotNull(borrowers.creditScoreRange), ...dateConditions];

      const results = await db
        .select({
          range: borrowers.creditScoreRange,
          count: sql<number>`COUNT(*)`.as("count"),
        })
        .from(borrowers)
        .where(and(...conditions))
        .groupBy(borrowers.creditScoreRange);

      const rangeOrder = [
        "below_580", "580_619", "620_659", "660_699", "700_739", "740_779", "780_plus", "unknown"
      ];

      const rangeLabels: Record<string, string> = {
        below_580: "Below 580",
        "580_619": "580-619",
        "620_659": "620-659",
        "660_699": "660-699",
        "700_739": "700-739",
        "740_779": "740-779",
        "780_plus": "780+",
        unknown: "Unknown",
      };

      const resultMap = new Map(results.map(r => [r.range, Number(r.count)]));

      return rangeOrder.map(range => ({
        range,
        label: rangeLabels[range] || range,
        count: resultMap.get(range as any) || 0,
      }));
    }),

  // Geographic distribution by state
  geographicDistribution: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);

      // Use target state first, fall back to current state
      const results = await db
        .select({
          state: sql<string>`COALESCE(target_state, state)`.as("state"),
          count: sql<number>`COUNT(*)`.as("count"),
          totalVolume: sql<string>`COALESCE(SUM(desired_loan_amount), 0)`.as("totalVolume"),
        })
        .from(borrowers)
        .where(
          dateConditions.length > 0
            ? and(sql`COALESCE(target_state, state) IS NOT NULL`, ...dateConditions)
            : sql`COALESCE(target_state, state) IS NOT NULL`
        )
        .groupBy(sql`COALESCE(target_state, state)`)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(20);

      return results.map(r => ({
        state: r.state,
        count: Number(r.count),
        totalVolume: parseFloat(r.totalVolume) || 0,
      }));
    }),

  // Loan amount distribution (ranges)
  loanAmountDistribution: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);
      const conditions = [isNotNull(borrowers.desiredLoanAmount), ...dateConditions];

      const results = await db
        .select({
          range: sql<string>`
            CASE
              WHEN desired_loan_amount < 100000 THEN 'under_100k'
              WHEN desired_loan_amount < 200000 THEN '100k_200k'
              WHEN desired_loan_amount < 300000 THEN '200k_300k'
              WHEN desired_loan_amount < 400000 THEN '300k_400k'
              WHEN desired_loan_amount < 500000 THEN '400k_500k'
              WHEN desired_loan_amount < 750000 THEN '500k_750k'
              WHEN desired_loan_amount < 1000000 THEN '750k_1m'
              ELSE 'over_1m'
            END
          `.as("range"),
          count: sql<number>`COUNT(*)`.as("count"),
          totalAmount: sql<string>`SUM(desired_loan_amount)`.as("totalAmount"),
        })
        .from(borrowers)
        .where(and(...conditions))
        .groupBy(sql`range`);

      const rangeOrder = [
        "under_100k", "100k_200k", "200k_300k", "300k_400k",
        "400k_500k", "500k_750k", "750k_1m", "over_1m"
      ];

      const rangeLabels: Record<string, string> = {
        under_100k: "Under $100K",
        "100k_200k": "$100K-$200K",
        "200k_300k": "$200K-$300K",
        "300k_400k": "$300K-$400K",
        "400k_500k": "$400K-$500K",
        "500k_750k": "$500K-$750K",
        "750k_1m": "$750K-$1M",
        over_1m: "Over $1M",
      };

      const resultMap = new Map(results.map(r => [r.range, { count: Number(r.count), total: parseFloat(r.totalAmount) || 0 }]));

      return rangeOrder.map(range => ({
        range,
        label: rangeLabels[range] || range,
        count: resultMap.get(range)?.count || 0,
        totalAmount: resultMap.get(range)?.total || 0,
      }));
    }),

  // Lead source performance
  leadSourcePerformance: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);
      const conditions = [isNotNull(borrowers.leadSource), ...dateConditions];

      const results = await db
        .select({
          source: borrowers.leadSource,
          total: sql<number>`COUNT(*)`.as("total"),
          closedFunded: sql<number>`SUM(CASE WHEN pipeline_status = 'closed_funded' THEN 1 ELSE 0 END)`.as("closedFunded"),
          closedLost: sql<number>`SUM(CASE WHEN pipeline_status = 'closed_lost' THEN 1 ELSE 0 END)`.as("closedLost"),
          totalVolume: sql<string>`COALESCE(SUM(CASE WHEN pipeline_status = 'closed_funded' THEN desired_loan_amount ELSE 0 END), 0)`.as("totalVolume"),
        })
        .from(borrowers)
        .where(and(...conditions))
        .groupBy(borrowers.leadSource)
        .orderBy(sql`COUNT(*) DESC`);

      const sourceLabels: Record<string, string> = {
        facebook_ad: "Facebook Ads",
        instagram_ad: "Instagram Ads",
        google_ad: "Google Ads",
        website: "Website",
        referral_agent: "Agent Referral",
        referral_past_client: "Past Client Referral",
        datacrawl: "Data Crawl",
        webinar: "Webinar",
        cold_call: "Cold Call",
        walk_in: "Walk-In",
        zillow: "Zillow",
        realtor_com: "Realtor.com",
        loan_depot: "LoanDepot",
        other: "Other",
      };

      return results.map(r => ({
        source: r.source,
        label: sourceLabels[r.source || ""] || r.source || "Unknown",
        total: Number(r.total),
        closedFunded: Number(r.closedFunded),
        closedLost: Number(r.closedLost),
        conversionRate: Number(r.total) > 0 ? Math.round((Number(r.closedFunded) / Number(r.total)) * 100) : 0,
        totalVolume: parseFloat(r.totalVolume) || 0,
      }));
    }),

  // Property type distribution
  propertyTypeDistribution: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);
      const conditions = [isNotNull(borrowers.propertyType), ...dateConditions];

      const results = await db
        .select({
          propertyType: borrowers.propertyType,
          count: sql<number>`COUNT(*)`.as("count"),
        })
        .from(borrowers)
        .where(and(...conditions))
        .groupBy(borrowers.propertyType);

      const labels: Record<string, string> = {
        single_family: "Single Family",
        condo: "Condo",
        townhouse: "Townhouse",
        multi_unit_2_4: "Multi-Unit (2-4)",
        multi_unit_5_plus: "Multi-Unit (5+)",
        manufactured: "Manufactured",
        land: "Land",
        commercial: "Commercial",
        other: "Other",
      };

      return results.map(r => ({
        propertyType: r.propertyType,
        label: labels[r.propertyType || ""] || r.propertyType || "Unknown",
        count: Number(r.count),
      }));
    }),

  // Purchase timeline / readiness
  timelineDistribution: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);
      const conditions = [isNotNull(borrowers.purchaseTimeline), ...dateConditions];

      const results = await db
        .select({
          timeline: borrowers.purchaseTimeline,
          count: sql<number>`COUNT(*)`.as("count"),
        })
        .from(borrowers)
        .where(and(...conditions))
        .groupBy(borrowers.purchaseTimeline);

      const labels: Record<string, string> = {
        ready_now: "Ready Now",
        "1_3_months": "1-3 Months",
        "3_6_months": "3-6 Months",
        "6_12_months": "6-12 Months",
        "12_plus_months": "12+ Months",
        just_exploring: "Just Exploring",
      };

      return results.map(r => ({
        timeline: r.timeline,
        label: labels[r.timeline || ""] || r.timeline || "Unknown",
        count: Number(r.count),
      }));
    }),

  // Summary stats
  summary: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);

      const [totals] = await db
        .select({
          totalBorrowers: sql<number>`COUNT(*)`.as("totalBorrowers"),
          totalLoanVolume: sql<string>`COALESCE(SUM(desired_loan_amount), 0)`.as("totalLoanVolume"),
          avgLoanAmount: sql<string>`COALESCE(AVG(desired_loan_amount), 0)`.as("avgLoanAmount"),
          closedFunded: sql<number>`SUM(CASE WHEN pipeline_status = 'closed_funded' THEN 1 ELSE 0 END)`.as("closedFunded"),
          closedLost: sql<number>`SUM(CASE WHEN pipeline_status = 'closed_lost' THEN 1 ELSE 0 END)`.as("closedLost"),
          activePipeline: sql<number>`SUM(CASE WHEN pipeline_status NOT IN ('closed_funded', 'closed_lost', 'on_hold', 'nurture') THEN 1 ELSE 0 END)`.as("activePipeline"),
          preApproved: sql<number>`SUM(CASE WHEN is_pre_approved = 1 THEN 1 ELSE 0 END)`.as("preApproved"),
          firstTimeBuyers: sql<number>`SUM(CASE WHEN is_first_time_buyer = 1 THEN 1 ELSE 0 END)`.as("firstTimeBuyers"),
          closedVolume: sql<string>`COALESCE(SUM(CASE WHEN pipeline_status = 'closed_funded' THEN desired_loan_amount ELSE 0 END), 0)`.as("closedVolume"),
        })
        .from(borrowers)
        .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);

      return {
        totalBorrowers: Number(totals?.totalBorrowers || 0),
        totalLoanVolume: parseFloat(totals?.totalLoanVolume || "0"),
        avgLoanAmount: parseFloat(totals?.avgLoanAmount || "0"),
        closedFunded: Number(totals?.closedFunded || 0),
        closedLost: Number(totals?.closedLost || 0),
        activePipeline: Number(totals?.activePipeline || 0),
        preApproved: Number(totals?.preApproved || 0),
        firstTimeBuyers: Number(totals?.firstTimeBuyers || 0),
        closedVolume: parseFloat(totals?.closedVolume || "0"),
        conversionRate: Number(totals?.totalBorrowers || 0) > 0
          ? Math.round((Number(totals?.closedFunded || 0) / Number(totals?.totalBorrowers || 0)) * 100)
          : 0,
      };
    }),

  // LO performance comparison (admin only)
  loPerformance: adminProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateConditions = buildDateFilter(input?.startDate, input?.endDate);

      const results = await db
        .select({
          clientId: borrowers.clientId,
          clientName: clients.name,
          total: sql<number>`COUNT(*)`.as("total"),
          closedFunded: sql<number>`SUM(CASE WHEN ${borrowers.pipelineStatus} = 'closed_funded' THEN 1 ELSE 0 END)`.as("closedFunded"),
          totalVolume: sql<string>`COALESCE(SUM(${borrowers.desiredLoanAmount}), 0)`.as("totalVolume"),
          closedVolume: sql<string>`COALESCE(SUM(CASE WHEN ${borrowers.pipelineStatus} = 'closed_funded' THEN ${borrowers.desiredLoanAmount} ELSE 0 END), 0)`.as("closedVolume"),
        })
        .from(borrowers)
        .leftJoin(clients, eq(borrowers.clientId, clients.id))
        .where(
          dateConditions.length > 0
            ? and(isNotNull(borrowers.clientId), ...dateConditions)
            : isNotNull(borrowers.clientId)
        )
        .groupBy(borrowers.clientId, clients.name)
        .orderBy(sql`COUNT(*) DESC`);

      return results.map(r => ({
        clientId: r.clientId,
        name: r.clientName || "Unknown LO",
        total: Number(r.total),
        closedFunded: Number(r.closedFunded),
        totalVolume: parseFloat(r.totalVolume) || 0,
        closedVolume: parseFloat(r.closedVolume) || 0,
        conversionRate: Number(r.total) > 0 ? Math.round((Number(r.closedFunded) / Number(r.total)) * 100) : 0,
      }));
    }),
});
