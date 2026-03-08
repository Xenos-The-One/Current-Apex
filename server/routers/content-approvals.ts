import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getClientByUserId } from "../db";
import { contentApprovals, clients } from "../../drizzle/schema";
import { sendSMS } from "../twilio";
import { eq, and, desc } from "drizzle-orm";

// Roles that can see ALL approvals (not just their own)
const ADMIN_ROLES = ["super_admin", "admin", "agency_owner"] as const;

export const contentApprovalsRouter = router({
  // Create new content for approval
  create: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      contentType: z.enum(["video_script", "social_post", "email", "sms", "ad_copy"]),
      platform: z.string().optional(),
      brand: z.string(),
      title: z.string(),
      content: z.string(),
      reasoning: z.string().optional(),
      stats: z.object({
        expectedViews: z.number().optional(),
        expectedEngagement: z.number().optional(),
        benchmarkData: z.string().optional(),
      }).optional(),
      approverName: z.string(),
      approverPhone: z.string(),
      sendSmsNow: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get agency ID from context or client
      let agencyId: number;
      if (input.clientId) {
        const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId));
        if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        agencyId = client.agencyId;
      } else {
        // Assume first agency for now (in production, get from ctx.user)
        agencyId = 1;
      }

      // Create approval request
      const result = await db.insert(contentApprovals).values({
        agencyId,
        clientId: input.clientId,
        contentType: input.contentType,
        platform: input.platform,
        brand: input.brand,
        title: input.title,
        content: input.content,
        reasoning: input.reasoning,
        stats: input.stats ? JSON.stringify(input.stats) : null,
        status: "pending",
        approverName: input.approverName,
        approverPhone: input.approverPhone,
        createdBy: ctx.user.id,
      });

      const approvalId = Number((result as any).insertId);

      // Send SMS approval request if requested
      if (input.sendSmsNow) {
        await sendApprovalSMS(approvalId);
      }

      return {
        success: true,
        approvalId,
      };
    }),

  // Get all pending approvals (role-aware: clients only see their own)
  listPending: protectedProcedure
    .input(z.object({
      brand: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const isAdmin = (ADMIN_ROLES as readonly string[]).includes(ctx.user.role);

      let approvals = await db
        .select()
        .from(contentApprovals)
        .where(eq(contentApprovals.status, "pending"))
        .orderBy(desc(contentApprovals.createdAt));

      // Non-admin users only see content linked to their client record
      if (!isAdmin) {
        const clientRecord = await getClientByUserId(ctx.user.id);
        if (!clientRecord) return [];
        approvals = approvals.filter(a => a.clientId === clientRecord.id);
      }

      if (input.brand) {
        approvals = approvals.filter(a => a.brand === input.brand);
      }

      return approvals;
    }),

  // Get all approvals (with status filter, role-aware)
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "approved", "rejected", "revised"]).optional(),
      brand: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const isAdmin = (ADMIN_ROLES as readonly string[]).includes(ctx.user.role);

      let approvals = await db
        .select()
        .from(contentApprovals)
        .orderBy(desc(contentApprovals.createdAt));

      // Non-admin users only see content linked to their client record
      if (!isAdmin) {
        const clientRecord = await getClientByUserId(ctx.user.id);
        if (!clientRecord) return [];
        approvals = approvals.filter(a => a.clientId === clientRecord.id);
      }

      if (input.status) {
        approvals = approvals.filter(a => a.status === input.status);
      }

      if (input.brand) {
        approvals = approvals.filter(a => a.brand === input.brand);
      }

      return approvals;
    }),

  // Approve content
  approve: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(contentApprovals)
        .set({
          status: "approved",
          approvedAt: new Date(),
        })
        .where(eq(contentApprovals.id, input.approvalId));

      return { success: true };
    }),

  // Reject content with feedback
  reject: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
      feedback: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(contentApprovals)
        .set({
          status: "rejected",
          feedback: input.feedback,
          rejectedAt: new Date(),
        })
        .where(eq(contentApprovals.id, input.approvalId));

      return { success: true };
    }),

  // Send SMS approval request
  sendApprovalSMS: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
    }))
    .mutation(async ({ input }) => {
      await sendApprovalSMS(input.approvalId);
      return { success: true };
    }),

  // Batch create multiple content approvals
  batchCreate: protectedProcedure
    .input(z.object({
      approvals: z.array(z.object({
        clientId: z.number().optional(),
        contentType: z.enum(["video_script", "social_post", "email", "sms", "ad_copy"]),
        platform: z.string().optional(),
        brand: z.string(),
        title: z.string(),
        content: z.string(),
        reasoning: z.string().optional(),
        stats: z.object({
          expectedViews: z.number().optional(),
          expectedEngagement: z.number().optional(),
          benchmarkData: z.string().optional(),
        }).optional(),
      })),
      approverName: z.string(),
      approverPhone: z.string(),
      sendSmsNow: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const approvalIds: number[] = [];

      for (const approval of input.approvals) {
        // Get agency ID
        let agencyId: number;
        if (approval.clientId) {
          const [client] = await db.select().from(clients).where(eq(clients.id, approval.clientId));
          if (!client) continue;
          agencyId = client.agencyId;
        } else {
          agencyId = 1;
        }

        const result = await db.insert(contentApprovals).values({
          agencyId,
          clientId: approval.clientId,
          contentType: approval.contentType,
          platform: approval.platform,
          brand: approval.brand,
          title: approval.title,
          content: approval.content,
          reasoning: approval.reasoning,
          stats: approval.stats ? JSON.stringify(approval.stats) : null,
          status: "pending",
          approverName: input.approverName,
          approverPhone: input.approverPhone,
          createdBy: ctx.user.id,
        });

        approvalIds.push(Number((result as any).insertId));
      }

      // Send single SMS with summary
      if (input.sendSmsNow && approvalIds.length > 0) {
        await sendBatchApprovalSMS(approvalIds, input.approverName, input.approverPhone);
      }

      return {
        success: true,
        approvalIds,
      };
    }),
});

// Helper function to send SMS approval request
async function sendApprovalSMS(approvalId: number) {
  const db = await getDb();
  if (!db) return;

  const [approval] = await db
    .select()
    .from(contentApprovals)
    .where(eq(contentApprovals.id, approvalId));

  if (!approval || !approval.approverPhone) return;

  // Format content preview (first 100 chars)
  const contentPreview = approval.content.substring(0, 100) + (approval.content.length > 100 ? "..." : "");

  // Build SMS message
  let message = `Hi ${approval.approverName}! 🎬\n\n`;
  message += `New ${approval.contentType} for ${approval.brand}:\n`;
  message += `"${approval.title}"\n\n`;
  message += `Preview: ${contentPreview}\n\n`;

  if (approval.reasoning) {
    message += `Why this works: ${approval.reasoning.substring(0, 100)}...\n\n`;
  }

  message += `Reply:\n`;
  message += `APPROVE - to approve\n`;
  message += `REJECT - to reject\n`;
  message += `Or visit the dashboard to review`;

  // Send SMS
  const result = await sendSMS({
    to: approval.approverPhone,
    body: message,
  });

  if (result.success) {
    await db
      .update(contentApprovals)
      .set({
        smsApprovalSent: true,
        smsApprovalSentAt: new Date(),
      })
      .where(eq(contentApprovals.id, approvalId));
  }
}

// Helper function to send batch approval SMS
async function sendBatchApprovalSMS(approvalIds: number[], approverName: string, approverPhone: string) {
  const db = await getDb();
  if (!db) return;

  const approvals = await db
    .select()
    .from(contentApprovals)
    .where(eq(contentApprovals.id, approvalIds[0])); // Get first for brand info

  if (approvals.length === 0) return;

  const brand = approvals[0].brand;

  // Build batch SMS message
  let message = `Hi ${approverName}! 🎬\n\n`;
  message += `I created ${approvalIds.length} new ${approvals[0].contentType}s for ${brand}.\n\n`;
  message += `Please review them in the dashboard:\n`;
  message += `[Dashboard Link]\n\n`;
  message += `Each includes:\n`;
  message += `✅ Full script\n`;
  message += `✅ Statistical reasoning\n`;
  message += `✅ Expected performance\n\n`;
  message += `Reply APPROVE ALL or review individually.`;

  // Send SMS
  await sendSMS({
    to: approverPhone,
    body: message,
  });

  // Mark all as SMS sent
  for (const id of approvalIds) {
    await db
      .update(contentApprovals)
      .set({
        smsApprovalSent: true,
        smsApprovalSentAt: new Date(),
      })
      .where(eq(contentApprovals.id, id));
  }
}
