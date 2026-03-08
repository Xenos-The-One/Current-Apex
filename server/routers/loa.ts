import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getLoaAssignment,
  getLoasByLoUserId,
  createLoaAssignment,
  deactivateLoaAssignment,
  getAllLoaAssignments,
  getLeadsByClientId,
  createLead,
  updateLead,
  getLeadById,
  getLeadActivities,
  createLeadActivity,
} from "../db";


// Middleware to verify LOA role and inject their LO's data context
const loaProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "loa" && ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "LOA or admin access required" });
  }
  
  if (ctx.user.role === "loa") {
    const assignment = await getLoaAssignment(ctx.user.id);
    if (!assignment) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No active LOA assignment found" });
    }
    return next({ ctx: { ...ctx, loaAssignment: assignment } });
  }
  
  // Admin can access everything
  return next({ ctx: { ...ctx, loaAssignment: null } });
});

export const loaRouter = router({
  // ============= LOA INFO =============
  
  getMyAssignment: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "loa") {
      throw new TRPCError({ code: "FORBIDDEN", message: "LOA access required" });
    }
    
    const assignment = await getLoaAssignment(ctx.user.id);
    if (!assignment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active LOA assignment" });
    }
    
    return assignment;
  }),

  // ============= LOA LEAD MANAGEMENT =============
  
  listLeads: loaProcedure
    .input(z.object({
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const assignment = (ctx as any).loaAssignment;
      if (!assignment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No LOA assignment" });
      }
      
      const leads = await getLeadsByClientId(assignment.clientId);
      return leads;
    }),

  getLeadDetail: loaProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const assignment = (ctx as any).loaAssignment;
      const lead = await getLeadById(input.leadId);
      
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      
      // Verify lead belongs to the LOA's assigned client
      if (assignment && lead.clientId !== assignment.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Lead does not belong to your assigned LO" });
      }
      
      const activities = await getLeadActivities(input.leadId);
      return { lead, activities };
    }),

  createLead: loaProcedure
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = (ctx as any).loaAssignment;
      if (!assignment) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No LOA assignment" });
      }
      
      const lead = await createLead({
        ...input,
        clientId: assignment.clientId,
        agencyId: assignment.agencyId,
        status: "new",
      });
      
      return lead;
    }),

  updateLead: loaProcedure
    .input(z.object({
      leadId: z.number(),
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]).optional(),
      notes: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = (ctx as any).loaAssignment;
      const lead = await getLeadById(input.leadId);
      
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      
      if (assignment && lead.clientId !== assignment.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Lead does not belong to your assigned LO" });
      }
      
      const { leadId, ...updateData } = input;
      await updateLead(leadId, updateData);
      return { success: true };
    }),

  addLeadActivity: loaProcedure
    .input(z.object({
      leadId: z.number(),
      activityType: z.enum(["call", "email", "sms", "note", "status_change", "appointment"]),
      description: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const assignment = (ctx as any).loaAssignment;
      const lead = await getLeadById(input.leadId);
      
      if (!lead) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }
      
      if (assignment && lead.clientId !== assignment.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Lead does not belong to your assigned LO" });
      }
      
      await createLeadActivity({
        leadId: input.leadId,
        activityType: input.activityType,
        description: input.description,
        performedBy: ctx.user.id,
      });
      
      return { success: true };
    }),

  // ============= ADMIN: LOA MANAGEMENT =============
  
  listAssignments: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    
    const assignments = await getAllLoaAssignments();
    return assignments;
  }),

  assignLoa: protectedProcedure
    .input(z.object({
      loaUserId: z.number(),
      loUserId: z.number(),
      agencyId: z.number(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      
      await createLoaAssignment(input);
      return { success: true };
    }),

  removeAssignment: protectedProcedure
    .input(z.object({ assignmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      
      await deactivateLoaAssignment(input.assignmentId);
      return { success: true };
    }),
});
