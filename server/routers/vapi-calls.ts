import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { listVapiCalls, getVapiCall } from "../vapi";
import { getDb } from "../db";
import { leads, leadActivities } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const vapiCallsRouter = router({
  /**
   * Get all Vapi calls from the API
   */
  listCalls: protectedProcedure
    .input(z.object({
      assistantId: z.string().optional(),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      try {
        const calls = await listVapiCalls({
          assistantId: input.assistantId,
          limit: input.limit,
        });
        
        return { success: true, calls };
      } catch (error: any) {
        console.error("[Vapi Calls] Error fetching calls:", error);
        return { 
          success: false, 
          error: error.response?.data?.message || error.message,
          calls: []
        };
      }
    }),

  /**
   * Get detailed call information
   */
  getCall: protectedProcedure
    .input(z.object({
      callId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const call = await getVapiCall(input.callId);
        return { success: true, call };
      } catch (error: any) {
        console.error("[Vapi Calls] Error fetching call:", error);
        return { 
          success: false, 
          error: error.response?.data?.message || error.message 
        };
      }
    }),

  /**
   * Get call history for a specific lead
   */
  getLeadCallHistory: protectedProcedure
    .input(z.object({
      leadId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Get lead info
      const [lead] = await db.select()
        .from(leads)
        .where(eq(leads.id, input.leadId))
        .limit(1);

      if (!lead) {
        return { success: false, error: "Lead not found" };
      }

      // Get all call activities for this lead
      const activities = await db.select()
        .from(leadActivities)
        .where(eq(leadActivities.leadId, input.leadId))
        .orderBy(desc(leadActivities.createdAt));

      const callActivities = activities.filter(a => a.activityType === "call" && a.vapiCallId);

      return {
        success: true,
        lead: {
          id: lead.id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
          status: lead.status,
        },
        calls: callActivities.map(activity => ({
          id: activity.id,
          vapiCallId: activity.vapiCallId,
          description: activity.description,
          callDuration: activity.callDuration,
          callRecordingUrl: activity.callRecordingUrl,
          createdAt: activity.createdAt,
        })),
      };
    }),

  /**
   * Get all leads with their call status
   */
  getLeadsWithCallStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      // Get all leads
      const allLeads = await db.select()
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(100);

      // For each lead, get their call activities
      const leadsWithCalls = await Promise.all(
        allLeads.map(async (lead) => {
          const activities = await db.select()
            .from(leadActivities)
            .where(eq(leadActivities.leadId, lead.id))
            .orderBy(desc(leadActivities.createdAt));

          const callActivities = activities.filter(a => a.activityType === "call");
          const lastCall = callActivities[0];

          return {
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone,
            email: lead.email,
            source: lead.source,
            status: lead.status,
            vapiCallInitiated: lead.vapiCallInitiated,
            appointmentBookedAt: lead.appointmentBookedAt,
            createdAt: lead.createdAt,
            callCount: callActivities.length,
            lastCall: lastCall ? {
              vapiCallId: lastCall.vapiCallId,
              description: lastCall.description,
              callDuration: lastCall.callDuration,
              callRecordingUrl: lastCall.callRecordingUrl,
              createdAt: lastCall.createdAt,
            } : null,
          };
        })
      );

      return { success: true, leads: leadsWithCalls };
    }),
});
