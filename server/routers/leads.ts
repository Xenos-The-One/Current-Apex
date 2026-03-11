import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { 
  createLead, 
  getLeadsByAgency,
  getLeadById,
  updateLead,
  deleteLead,
  createLeadActivity,
  getLeadActivities,
  bulkCreateLeads
} from "../db";
import { makeVapiCall } from "../vapi";
import { sendSmartAlert } from "../ai-operations-director";
import { scheduleLeadFollowUp } from "../lead-automation";
import { pushNewLead, pushLeadStatusChange } from "../push-triggers";
import { TRPCError } from "@trpc/server";
import { tagLeadAsRefiProspect, untagLeadAsRefiProspect, getRefiDripStatus } from "../refi-drip";
import { sendSMS } from "../twilio";
import { sendEmail } from "../sendgrid";
import { isTestLead } from "../test-lead-utils";

export const leadsRouter = router({
  // PUBLIC lead capture - for landing pages, Facebook ads, webinars (NO LOGIN REQUIRED)
  capture: publicProcedure
    .input(z.object({
      agencyId: z.number().default(1),
      clientId: z.number().default(1),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().min(10),
      source: z.string(),
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]).default("new"),
      loanType: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Format phone to E.164
      const digits = input.phone.replace(/\D/g, "");
      if (digits.length === 10) input.phone = `+1${digits}`;
      else if (digits.length === 11 && digits.startsWith("1")) input.phone = `+${digits}`;
      else if (!input.phone.startsWith("+")) input.phone = `+1${digits}`;
      
      console.log(`[Lead Capture] 🆕 New lead: ${input.firstName} ${input.lastName} | Phone: ${input.phone} | Source: ${input.source}`);
      const lead = await createLead(input);
      
      // Log activity
      await createLeadActivity({
        leadId: lead.id,
        activityType: "note",
        description: `Lead captured from ${input.source} (public form)`,
        performedBy: 1, // System
      });

      // Send smart alert for new lead
      try {
        await sendSmartAlert("new_lead", {
          leadName: `${input.firstName} ${input.lastName}`,
          leadPhone: input.phone,
          leadSource: input.source,
        });
      } catch (e) {
        console.error("[Lead Capture] Alert failed:", e);
      }

      // Send push notification for new lead
      try {
        await pushNewLead({
          leadId: lead.id,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          source: input.source,
          email: input.email,
        });
      } catch (e) {
        console.error("[Lead Capture] Push notification failed:", e);
      }
      
      // Send instant welcome SMS to the lead
      if (input.phone && !isTestLead({ email: input.email, phone: input.phone })) {
        try {
          const smsBody = `Hi ${input.firstName}! Thanks for your interest in a home loan. Tim Haskins (NMLS #1116876) from Premier Mortgage Resources will be reaching out to you shortly. Reply STOP to opt out.`;
          const smsResult = await sendSMS({ to: input.phone, body: smsBody });
          if (smsResult.success) {
            console.log(`[Lead Capture] ✅ Welcome SMS sent to ${input.phone}`);
          } else {
            console.error(`[Lead Capture] ❌ Welcome SMS failed: ${smsResult.error}`);
          }
        } catch (smsErr) {
          console.error("[Lead Capture] ❌ Exception sending welcome SMS:", smsErr);
        }
      }

      // Send instant welcome email to the lead (if email provided)
      if (input.email && !isTestLead({ email: input.email, phone: input.phone })) {
        try {
          const bookingUrl = `${process.env.VITE_APP_URL || 'https://lockinloans.manus.space'}/book`;
          const emailResult = await sendEmail({
            to: [input.email],
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@lockinloans.com',
            subject: `Welcome, ${input.firstName}! Your mortgage consultation is almost ready`,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#1a56db;">Hi ${input.firstName},</h2>
  <p>Thank you for your interest in a home loan with Premier Mortgage Resources!</p>
  <p><strong>Tim Haskins (NMLS #1116876)</strong> will be reaching out to you shortly to discuss your options.</p>
  <p>In the meantime, you can book a consultation at your convenience:</p>
  <p style="text-align:center;margin:24px 0;">
    <a href="${bookingUrl}" style="background:#1a56db;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;">Book My Consultation</a>
  </p>
  <p style="color:#666;font-size:13px;">Premier Mortgage Resources &bull; NMLS #1116876<br/>Reply to this email if you have any questions.</p>
</div>`,
            text: `Hi ${input.firstName},\n\nThank you for your interest in a home loan with Premier Mortgage Resources!\n\nTim Haskins (NMLS #1116876) will be reaching out to you shortly.\n\nBook your consultation: ${bookingUrl}\n\nPremier Mortgage Resources`,
          });
          if (emailResult.success) {
            console.log(`[Lead Capture] ✅ Welcome email sent to ${input.email}`);
          } else {
            console.error(`[Lead Capture] ❌ Welcome email failed: ${emailResult.error}`);
          }
        } catch (emailErr) {
          console.error("[Lead Capture] ❌ Exception sending welcome email:", emailErr);
        }
      }

      // Schedule Vapi auto-call (5 minutes during business hours, next 9 AM otherwise)
      if (input.phone && !isTestLead({ email: input.email, phone: input.phone })) {
        try {
          await scheduleLeadFollowUp(lead.id, input.phone, input.firstName, input.source, input.clientId);
          console.log(`[Lead Capture] ✅ Vapi call scheduled for ${input.firstName}`);
        } catch (vapiErr) {
          console.error("[Lead Capture] ❌ Exception scheduling Vapi call:", vapiErr);
        }
      }

      console.log(`[Lead Capture] ✅ Lead #${lead.id} created for ${input.firstName} — SMS + email sent, Vapi call scheduled`);
      return { success: true, leadId: lead.id };
    }),

  // Get all leads for an agency
  list: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]).optional(),
      leadSource: z.string().optional(),
      contactType: z.enum(["borrower", "real_estate_agent", "attorney", "insurance_agent", "title_company", "builder_developer", "lender", "other"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      let leads = await getLeadsByAgency(
        input.agencyId,
        input.status,
        input.leadSource,
        input.limit,
        input.offset
      );
      // Filter by contactType if provided
      if (input.contactType) {
        leads = leads.filter(l => (l as any).contactType === input.contactType);
      }
      return leads;
    }),

  // Get single lead by ID
  get: protectedProcedure
    .input(z.object({
      leadId: z.number(),
    }))
    .query(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead not found",
        });
      }
      return lead;
    }),

  // Create single lead
  create: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      clientId: z.number(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().min(10),
      source: z.string(),
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]).default("new"),
      loanType: z.string().optional(),
      propertyAddress: z.string().optional(),
      propertyCity: z.string().optional(),
      propertyState: z.string().optional(),
      propertyZip: z.string().optional(),
      estimatedPurchasePrice: z.number().optional(),
      downPaymentAmount: z.number().optional(),
      notes: z.string().optional(),
      referringAgent: z.string().optional(),
      referringBrokerage: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const lead = await createLead(input);
      
      // Log activity
      await createLeadActivity({
        leadId: lead.id,
        activityType: "note",
        description: `Lead created from ${input.source}`,
        performedBy: ctx.user.id,
      });

      // Send smart alert for high-value leads (estimated purchase price >= $500k)
      if (input.estimatedPurchasePrice && input.estimatedPurchasePrice >= 500000) {
        await sendSmartAlert("hot_lead", {
          leadName: `${input.firstName} ${input.lastName}`,
          leadPhone: input.phone,
          leadSource: input.source,
          estimatedValue: input.estimatedPurchasePrice,
        });
      }
      
      // Auto Vapi calls disabled - Tim handles calls manually now
      console.log(`[Lead Capture] ✅ Lead #${lead.id} created for ${input.firstName} - Tim will call manually`);

      return lead;
    }),

  // Bulk import leads from CSV
  bulkImport: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      clientId: z.number(),
      leads: z.array(z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().optional(),
        phone: z.string().optional(),
        source: z.string(),
        loanType: z.string().optional(),
        propertyAddress: z.string().optional(),
        propertyCity: z.string().optional(),
        propertyState: z.string().optional(),
        propertyZip: z.string().optional(),
        estimatedPurchasePrice: z.number().optional(),
        downPaymentAmount: z.number().optional(),
        notes: z.string().optional(),
        referringAgent: z.string().optional(),
        referringBrokerage: z.string().optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = await bulkCreateLeads(
        input.agencyId,
        input.clientId,
        input.leads
      );

      const importedCount = (results as any).count ?? (Array.isArray(results) ? results.length : 0);

      return {
        success: true,
        imported: importedCount,
        leads: [],
      };
    }),

  // Update lead
  update: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]).optional(),
      notes: z.string().optional(),
      loanType: z.string().optional(),
      propertyAddress: z.string().optional(),
      propertyCity: z.string().optional(),
      propertyState: z.string().optional(),
      propertyZip: z.string().optional(),
      estimatedPurchasePrice: z.number().optional(),
      downPaymentAmount: z.number().optional(),
      isTest: z.boolean().optional(),
      // Tier 1 fields
      contactType: z.enum(["borrower", "real_estate_agent", "attorney", "insurance_agent", "title_company", "builder_developer", "lender", "other"]).optional(),
      loanAmount: z.number().optional(),
      probability: z.number().min(0).max(100).optional(),
      partnerTier: z.enum(["bronze", "silver", "gold", "platinum"]).optional(),
      partnerStage: z.enum(["prospect", "contacted", "meeting_scheduled", "active_partner", "top_partner"]).optional(),
      assignedToUserId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get current lead for status comparison
      const currentLead = await getLeadById(input.leadId);
      const oldStatus = currentLead?.status || 'unknown';
      
      const updateData = {
        ...input,
        loanAmount: input.loanAmount !== undefined ? String(input.loanAmount) : undefined,
      };
      const lead = await updateLead(input.leadId, updateData);
      
      // Log activity
      await createLeadActivity({
        leadId: input.leadId,
        activityType: "status_change",
        description: `Lead updated${input.status ? ` - Status: ${oldStatus} → ${input.status}` : ''}`,
        performedBy: ctx.user.id,
      });

      // Push notification for significant status changes
      if (input.status && input.status !== oldStatus && currentLead) {
        try {
          await pushLeadStatusChange({
            leadId: input.leadId,
            firstName: currentLead.firstName || '',
            lastName: currentLead.lastName || '',
            oldStatus,
            newStatus: input.status,
          });
        } catch (e) {
          console.error("[Lead Update] Push notification failed:", e);
        }
      }

      return lead;
    }),

  // Delete lead
  delete: protectedProcedure
    .input(z.object({
      leadId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await deleteLead(input.leadId);
      return { success: true };
    }),

  // Get lead activities/timeline
  activities: protectedProcedure
    .input(z.object({
      leadId: z.number(),
    }))
    .query(async ({ input }) => {
      const activities = await getLeadActivities(input.leadId);
      return activities;
    }),

  // ─── Refi Drip Procedures ────────────────────────────────────────────────────

  // Tag a lead as a refi prospect and start the 14-day drip sequence
  tagRefiProspect: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await tagLeadAsRefiProspect(input.leadId);
      if (!result.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
      }
      return result;
    }),

  // Remove the refi prospect tag and stop the drip
  untagRefiProspect: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await untagLeadAsRefiProspect(input.leadId);
      if (!result.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: result.message });
      }
      return result;
    }),

  // Get the current refi drip status for a lead
  getRefiDripStatus: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      return await getRefiDripStatus(input.leadId);
    }),

  // Add activity/note to lead
  addActivity: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      activityType: z.enum(["call", "email", "sms", "note", "appointment", "status_change"]),
      description: z.string(),
      scheduledDate: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const activity = await createLeadActivity({
        leadId: input.leadId,
        activityType: input.activityType,
        description: input.description,
        performedBy: ctx.user.id,
      });
      return activity;
    }),
});
