import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getAllAgencies,
  getAgencyById,
  updateAgency,
  getClientsByAgencyId,
  getClientByUserId,
  createClient,
  updateClient,
  getLeadsByAgencyId,
  getLeadsByClientId,
  createLead,
  updateLead,
  getLeadActivities,
  createLeadActivity,
  getLeadSourceMappingsByAgency,
  createLeadSourceMapping,
  updateLeadSourceMapping,
  deleteLeadSourceMapping,
  getDb,
} from "../db";
import { clients as clientsTable } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { ensureLinkedSeoClient, upsertUser as upsertSeoUser, getUserByOpenId } from "../seo-db";
import { pushNewLead } from "../push-triggers";

// Middleware to check if user is admin or super_admin
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // ============= AGENCY MANAGEMENT =============
  
  listAgencies: adminProcedure.query(async () => {
    const agencyList = await getAllAgencies();
    // Enrich each agency with the CRM client record linked to the agency owner
    // Falls back to agency_id lookup for accounts without a Manus user yet
    const enriched = await Promise.all(
      agencyList.map(async (agency) => {
        let client = agency.ownerId ? await getClientByUserId(agency.ownerId) : undefined;
        // Fallback: find client by agency_id if no user-linked client found
        if (!client) {
          const db = await getDb();
          if (db) {
            const rows = await db.select().from(clientsTable).where(eq(clientsTable.agencyId, agency.id)).limit(1);
            client = rows[0];
          }
        }
        return {
          ...agency,
          clientId: client?.id ?? null,
          clientUserId: agency.ownerId,
          clientName: client?.name ?? agency.name,
        };
      })
    );
    return enriched;
  }),

  getAgency: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const agency = await getAgencyById(input.id);
      if (!agency) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agency not found",
        });
      }
      return agency;
    }),

  activateAgency: adminProcedure
    .input(z.object({ 
      id: z.number(),
      strategyCallDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      await updateAgency(input.id, {
        strategyCallBooked: true,
        strategyCallDate: input.strategyCallDate,
        status: "active",
      });
      return { success: true };
    }),

  updateAgencyStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending_payment", "pending_call", "active", "suspended"]),
    }))
    .mutation(async ({ input }) => {
      await updateAgency(input.id, { status: input.status });
      return { success: true };
    }),

  updateAvatarStatus: adminProcedure
    .input(z.object({
      id: z.number(),
      avatarStatus: z.enum(["pending", "recording_scheduled", "in_progress", "completed"]),
    }))
    .mutation(async ({ input }) => {
      await updateAgency(input.id, { avatarStatus: input.avatarStatus });
      return { success: true };
    }),

  updateElevenLabsAccount: adminProcedure
    .input(z.object({
      id: z.number(),
      email: z.string().email(),
      status: z.enum(["not_created", "pending", "active", "credentials_shared"]),
    }))
    .mutation(async ({ input }) => {
      await updateAgency(input.id, {
        elevenLabsEmail: input.email,
        elevenLabsStatus: input.status,
      });
      return { success: true };
    }),

  updateHeyGenAccount: adminProcedure
    .input(z.object({
      id: z.number(),
      email: z.string().email(),
      status: z.enum(["not_created", "pending", "active", "credentials_shared"]),
    }))
    .mutation(async ({ input }) => {
      await updateAgency(input.id, {
        heygenEmail: input.email,
        heygenStatus: input.status,
      });
      return { success: true };
    }),

  // ============= CLIENT MANAGEMENT =============

  listClients: adminProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      return await getClientsByAgencyId(input.agencyId);
    }),

  createClient: adminProcedure
    .input(z.object({
      agencyId: z.number(),
      name: z.string(),
      email: z.string().email(),
      phone: z.string().optional(),
      subscriptionTier: z.enum(["starter", "pro", "enterprise", "done_for_you"]),
      businessType: z.enum(["loan_officer", "real_estate"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Calculate trial end date (90 days from now)
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 90);

      const result = await createClient({
        agencyId: input.agencyId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        subscriptionTier: input.subscriptionTier,
        subscriptionStatus: "trial",
        trialEndDate,
        accessMode: "limited", // Start with limited access
      });

      // Auto-provision a linked SEO client so content pipeline is ready immediately
      try {
        // Ensure the admin user exists in seo_users
        await upsertSeoUser({
          openId: ctx.user.openId,
          name: ctx.user.name,
          email: ctx.user.email,
          role: "admin",
        });
        const seoUser = await getUserByOpenId(ctx.user.openId);
        if (seoUser) {
          const crmClientId = (result as any)[0]?.insertId ?? (result as any).insertId;
          if (crmClientId) {
            await ensureLinkedSeoClient({
              crmClientId,
              name: input.name,
              email: input.email,
              phone: input.phone,
              businessType: input.businessType,
              seoUserId: seoUser.id,
            });
          }
        }
      } catch (seoErr) {
        // Non-fatal: log but don't block CRM client creation
        console.error("[SEO] Failed to auto-provision SEO client:", seoErr);
      }

      return { success: true };
    }),

  updateClientAccess: adminProcedure
    .input(z.object({
      clientId: z.number(),
      accessMode: z.enum(["limited", "full", "read_only"]),
    }))
    .mutation(async ({ input }) => {
      await updateClient(input.clientId, { accessMode: input.accessMode });
      return { success: true };
    }),

  updateClientTier: adminProcedure
    .input(z.object({
      clientId: z.number(),
      tier: z.enum(["starter", "pro", "enterprise", "done_for_you"]),
    }))
    .mutation(async ({ input }) => {
      await updateClient(input.clientId, { subscriptionTier: input.tier });
      return { success: true };
    }),

  // ============= LEAD MANAGEMENT =============

  listLeads: adminProcedure
    .input(z.object({ 
      agencyId: z.number().optional(),
      clientId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      if (input.clientId) {
        return await getLeadsByClientId(input.clientId);
      } else if (input.agencyId) {
        return await getLeadsByAgencyId(input.agencyId);
      }
      return [];
    }),

  createLead: adminProcedure
    .input(z.object({
      clientId: z.number(),
      agencyId: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const lead = await createLead(input);
      // Fire push notification for new lead (non-blocking)
      pushNewLead({
        leadId: lead.id,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || "",
        source: input.source || "Manual",
        email: input.email,
      }).catch(e => console.error("[Admin createLead] Push notification failed:", e));
      return { success: true };
    }),

  updateLeadStatus: adminProcedure
    .input(z.object({
      leadId: z.number(),
      status: z.enum(["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]),
    }))
    .mutation(async ({ input }) => {
      await updateLead(input.leadId, { status: input.status });
      
      // Log status change activity
      await createLeadActivity({
        leadId: input.leadId,
        activityType: "status_change",
        description: `Status changed to ${input.status}`,
      });
      
      return { success: true };
    }),

  getLeadActivities: adminProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ input }) => {
      return await getLeadActivities(input.leadId);
    }),

  addLeadNote: adminProcedure
    .input(z.object({
      leadId: z.number(),
      note: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await createLeadActivity({
        leadId: input.leadId,
        activityType: "note",
        description: input.note,
        performedBy: ctx.user.id,
      });
      return { success: true };
    }),

  // ============= LEAD SOURCE ASSISTANT MAPPING =============

  getLeadSourceMappings: adminProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input }) => {
      return await getLeadSourceMappingsByAgency(input.agencyId);
    }),

  createLeadSourceMapping: adminProcedure
    .input(z.object({
      agencyId: z.number(),
      leadSource: z.string(),
      vapiAssistantId: z.string(),
      autoCallEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      await createLeadSourceMapping(input);
      return { success: true };
    }),

  updateLeadSourceMapping: adminProcedure
    .input(z.object({
      id: z.number(),
      vapiAssistantId: z.string().optional(),
      autoCallEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateLeadSourceMapping(id, data);
      return { success: true };
    }),

  deleteLeadSourceMapping: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteLeadSourceMapping(input.id);
      return { success: true };
    }),

  // ============= CLIENT SENDER EMAIL =============

  updateClientSenderEmail: adminProcedure
    .input(z.object({
      clientId: z.number(),
      senderEmail: z.string().email().optional().or(z.literal("")),
      senderName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const data: Record<string, any> = {};
      if (input.senderEmail !== undefined) data.senderEmail = input.senderEmail || null;
      if (input.senderName !== undefined) data.senderName = input.senderName || null;
      // Reset verification whenever the email changes
      if (input.senderEmail !== undefined) data.senderEmailVerified = false;
      await updateClient(input.clientId, data);
      return { success: true };
    }),

  markClientSenderVerified: adminProcedure
    .input(z.object({
      clientId: z.number(),
      verified: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      await updateClient(input.clientId, { senderEmailVerified: input.verified });
      return { success: true };
    }),

  getClientById: adminProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [row] = await db
        .select()
        .from(clientsTable)
        .where(eq(clientsTable.id, input.clientId))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      return row;
    }),
});
