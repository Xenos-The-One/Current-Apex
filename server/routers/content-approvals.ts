import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getClientByUserId, createSocialMediaPost } from "../db";
import { contentApprovals, clients, users, teamNotifications, contentComments } from "../../drizzle/schema";
import { seoClients } from "../../drizzle/seo-schema";
import { sendSMS } from "../twilio";
import { sendEmail } from "../email-service";
import { eq, and, desc, sql, gt, ne, inArray } from "drizzle-orm";

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

  // Bulk approve all pending social posts and schedule them
  bulkApproveAndSchedule: protectedProcedure
    .input(z.object({
      approvalIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let approved = 0;
      let scheduled = 0;
      const errors: string[] = [];

      for (const approvalId of input.approvalIds) {
        try {
          // Approve the item
          await db
            .update(contentApprovals)
            .set({ status: "approved", approvedAt: new Date() })
            .where(eq(contentApprovals.id, approvalId));
          approved++;

          // Try to schedule if it's a social post
          const [approval] = await db
            .select()
            .from(contentApprovals)
            .where(eq(contentApprovals.id, approvalId));

          if (!approval) continue;

          const platformLower = (approval.platform || "").toLowerCase();
          const isSocial = ["facebook", "instagram", "linkedin", "twitter", "tiktok"].some((p) =>
            platformLower.includes(p)
          );

          if (isSocial && approval.clientId) {
            const [client] = await db.select().from(clients).where(eq(clients.id, approval.clientId));
            if (client) {
              const seoClientRows = await db
                .select()
                .from(seoClients)
                .where(eq(seoClients.crmClientId, approval.clientId));
              const seoClient = seoClientRows[0] || null;

              // Stagger publish dates by 1 day per post to avoid clustering
              const baseDate = computeNextPublishDate(
                seoClient?.preferredPublishDays || null,
                seoClient?.preferredPublishTime || null
              );
              // Add scheduled offset so posts don't all land on same day
              baseDate.setDate(baseDate.getDate() + scheduled);

              await createSocialMediaPost({
                clientId: approval.clientId,
                agencyId: client.agencyId,
                platform: mapPlatformToEnum(platformLower),
                content: approval.content,
                scheduledDate: baseDate,
                status: "scheduled",
                createdBy: ctx.user.id,
              });
              scheduled++;
            }
          }
        } catch (err: any) {
          errors.push(`ID ${approvalId}: ${err.message || "unknown error"}`);
        }
      }

      return {
        success: true,
        approved,
        scheduled,
        errors,
        message: `Approved ${approved} item${approved !== 1 ? "s" : ""}, scheduled ${scheduled} social post${scheduled !== 1 ? "s" : ""}.`,
      };
    }),

  // Auto-schedule an approved social post to the Social Media scheduler
  scheduleApprovedToSocial: protectedProcedure
    .input(z.object({
      approvalId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Fetch the approval
      const [approval] = await db
        .select()
        .from(contentApprovals)
        .where(eq(contentApprovals.id, input.approvalId));

      if (!approval) throw new TRPCError({ code: "NOT_FOUND", message: "Content approval not found" });

      // Only schedule social posts
      const platformLower = (approval.platform || "").toLowerCase();
      const isSocial = ["facebook", "instagram", "linkedin", "twitter", "tiktok"].some((p) =>
        platformLower.includes(p)
      );
      if (!isSocial) {
        return { success: false, message: "Only social posts can be scheduled" };
      }

      // Determine the client
      const clientId = approval.clientId;
      if (!clientId) throw new TRPCError({ code: "BAD_REQUEST", message: "No client associated with this approval" });

      const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      // Get publishing preferences from seo_clients
      const seoClientRows = await db
        .select()
        .from(seoClients)
        .where(eq(seoClients.crmClientId, clientId));
      const seoClient = seoClientRows[0] || null;

      // Calculate suggested publish date based on preferences
      const scheduledDate = computeNextPublishDate(
        seoClient?.preferredPublishDays || null,
        seoClient?.preferredPublishTime || null
      );

      // Map platform string to enum value
      const platformEnum = mapPlatformToEnum(platformLower);

      // Create the social media post in the scheduler
      await createSocialMediaPost({
        clientId,
        agencyId: client.agencyId,
        platform: platformEnum,
        content: approval.content,
        scheduledDate,
        status: "scheduled",
        createdBy: ctx.user.id,
      });

      return {
        success: true,
        message: `Scheduled to ${approval.platform} for ${scheduledDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} at ${scheduledDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`,
        scheduledDate,
      };
    }),

  // Admin: approve any content item (cross-client)
  adminApprove: protectedProcedure
    .input(z.object({ approvalId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const isAdmin = (ADMIN_ROLES as readonly string[]).includes(ctx.user.role);
      if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      // Fetch approval + client info before updating so we have email details
      const [approval] = await db.select().from(contentApprovals).where(eq(contentApprovals.id, input.approvalId)).limit(1);
      if (!approval) throw new TRPCError({ code: "NOT_FOUND", message: "Approval not found" });
      await db
        .update(contentApprovals)
        .set({ status: "approved", approvedAt: new Date() })
        .where(eq(contentApprovals.id, input.approvalId));
      // Send email notification to the client
      try {
        const clientRow = approval.clientId
          ? (await db.select().from(clients).where(eq(clients.id, approval.clientId)).limit(1))[0]
          : null;
        const clientEmail = clientRow?.email;
        if (clientEmail) {
          await sendEmail({
            to: clientEmail,
            subject: `\u2705 Your content has been approved: "${approval.title}"`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <h2 style="color:#16a34a;">Content Approved!</h2>
                <p>Great news! Your content piece has been reviewed and approved by the team.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:140px;">Title</td><td style="padding:8px;">${approval.title}</td></tr>
                  <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Type</td><td style="padding:8px;">${approval.contentType}</td></tr>
                  ${approval.platform ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Platform</td><td style="padding:8px;">${approval.platform}</td></tr>` : ""}
                </table>
                <p>Log in to your portal to view and schedule this content.</p>
              </div>`,
          });
        }
      } catch (emailErr) {
        console.warn("[adminApprove] Email notification failed:", emailErr);
      }
      return { success: true };
    }),

  // Admin: reject any content item (cross-client)
  adminReject: protectedProcedure
    .input(z.object({ approvalId: z.number(), feedback: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const isAdmin = (ADMIN_ROLES as readonly string[]).includes(ctx.user.role);
      if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
      // Fetch approval before updating
      const [approval] = await db.select().from(contentApprovals).where(eq(contentApprovals.id, input.approvalId)).limit(1);
      if (!approval) throw new TRPCError({ code: "NOT_FOUND", message: "Approval not found" });
      await db
        .update(contentApprovals)
        .set({ status: "rejected", feedback: input.feedback })
        .where(eq(contentApprovals.id, input.approvalId));
      // Send email notification to the client
      try {
        const clientRow = approval.clientId
          ? (await db.select().from(clients).where(eq(clients.id, approval.clientId)).limit(1))[0]
          : null;
        const clientEmail = clientRow?.email;
        if (clientEmail) {
          await sendEmail({
            to: clientEmail,
            subject: `\u26a0\ufe0f Content needs revision: "${approval.title}"`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
                <h2 style="color:#dc2626;">Content Needs Revision</h2>
                <p>Your content piece has been reviewed and requires some changes before it can be published.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;width:140px;">Title</td><td style="padding:8px;">${approval.title}</td></tr>
                  <tr><td style="padding:8px;background:#f9fafb;font-weight:bold;">Type</td><td style="padding:8px;">${approval.contentType}</td></tr>
                </table>
                <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;margin:16px 0;border-radius:4px;">
                  <p style="margin:0;font-weight:bold;">Feedback from the team:</p>
                  <p style="margin:8px 0 0 0;">${input.feedback}</p>
                </div>
                <p>Log in to your portal to request a new content batch with these notes in mind.</p>
              </div>`,
          });
        }
      } catch (emailErr) {
        console.warn("[adminReject] Email notification failed:", emailErr);
      }
      // Create 48-hour follow-up reminder for the admin
      try {
        await db.insert(teamNotifications).values({
          userId: ctx.user.id,
          type: "custom",
          title: `Follow-up: Did client request a new batch?`,
          body: `You rejected "${approval.title}" 48 hours ago. Check if the client has requested a new content batch in Content Approvals.`,
          priority: "normal",
          actionUrl: "/admin",
          metadata: JSON.stringify({
            approvalId: input.approvalId,
            approvalTitle: approval.title,
            type: "rejection_followup",
            reminderDue: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          }),
        });
      } catch (taskErr) {
        console.warn("[adminReject] Follow-up reminder creation failed:", taskErr);
      }
      return { success: true };
    }),

  // ─── Feedback Thread ──────────────────────────────────────────────────────

  // List all comments for a content item (also marks them as read for the current user's role)
  listComments: protectedProcedure
    .input(z.object({ contentApprovalId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const isAdmin = (ADMIN_ROLES as readonly string[]).includes(ctx.user.role);
      const rows = await db
        .select({
          id: contentComments.id,
          message: contentComments.message,
          authorRole: contentComments.authorRole,
          mentionedRole: contentComments.mentionedRole,
          isReadByAdmin: contentComments.isReadByAdmin,
          isReadByClient: contentComments.isReadByClient,
          createdAt: contentComments.createdAt,
          authorName: users.name,
        })
        .from(contentComments)
        .innerJoin(users, eq(contentComments.authorId, users.id))
        .where(eq(contentComments.contentApprovalId, input.contentApprovalId))
        .orderBy(contentComments.createdAt);
      // Mark unread comments as read for the viewer's role
      try {
        if (isAdmin) {
          await db.update(contentComments)
            .set({ isReadByAdmin: true })
            .where(and(
              eq(contentComments.contentApprovalId, input.contentApprovalId),
              eq(contentComments.isReadByAdmin, false),
              ne(contentComments.authorRole, "admin"),
            ));
        } else {
          await db.update(contentComments)
            .set({ isReadByClient: true })
            .where(and(
              eq(contentComments.contentApprovalId, input.contentApprovalId),
              eq(contentComments.isReadByClient, false),
              ne(contentComments.authorRole, "client"),
            ));
        }
      } catch (_) { /* non-critical */ }
      return rows;
    }),

  // Get unread comment counts per content item for the current user's role
  unreadCommentCounts: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return {};
      const isAdmin = (ADMIN_ROLES as readonly string[]).includes(ctx.user.role);
      // Count unread comments per contentApprovalId for the current viewer
      const rows = await db
        .select({
          contentApprovalId: contentComments.contentApprovalId,
          unread: sql<number>`count(*)`,
        })
        .from(contentComments)
        .where(
          isAdmin
            ? and(eq(contentComments.isReadByAdmin, false), ne(contentComments.authorRole, "admin"))
            : and(eq(contentComments.isReadByClient, false), ne(contentComments.authorRole, "client"))
        )
        .groupBy(contentComments.contentApprovalId);
      // Return as a map { [contentApprovalId]: count }
      return Object.fromEntries(rows.map(r => [r.contentApprovalId, Number(r.unread)]));
    }),

  // Add a comment to a content item
  addComment: protectedProcedure
    .input(z.object({
      contentApprovalId: z.number(),
      message: z.string().min(1).max(2000),
      mentionedRole: z.enum(["admin", "client"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [item] = await db
        .select({ id: contentApprovals.id, agencyId: contentApprovals.agencyId, title: contentApprovals.title })
        .from(contentApprovals)
        .where(eq(contentApprovals.id, input.contentApprovalId))
        .limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Content item not found" });

      const isAdmin = (ADMIN_ROLES as readonly string[]).includes(ctx.user.role);
      const authorRole = isAdmin ? "admin" : "client";

      // Detect @mention in message if not explicitly provided
      let mentionedRole = input.mentionedRole ?? null;
      if (!mentionedRole) {
        if (/@admin/i.test(input.message)) mentionedRole = "admin";
        else if (/@client/i.test(input.message)) mentionedRole = "client";
      }

      // When admin writes, mark as read by admin; when client writes, mark as read by client
      await db.insert(contentComments).values({
        contentApprovalId: input.contentApprovalId,
        agencyId: item.agencyId,
        authorId: ctx.user.id,
        authorRole,
        message: input.message,
        mentionedRole: mentionedRole ?? undefined,
        isReadByAdmin: isAdmin ? true : false,
        isReadByClient: isAdmin ? false : true,
      });

      // Notify the other party (or the mentioned role)
      const notifyRole = mentionedRole ?? (isAdmin ? "client" : "admin");
      const notifTitle = mentionedRole
        ? `You were mentioned in a content comment`
        : isAdmin ? "Admin replied to your content" : "Client left feedback";
      try {
        await db.insert(teamNotifications).values({
          userId: ctx.user.id,
          type: "content_comment",
          title: notifTitle,
          body: `${mentionedRole ? `@${notifyRole} ` : ""}New comment on "${item.title}": ${input.message.slice(0, 100)}${input.message.length > 100 ? "..." : ""}`,
          priority: mentionedRole ? "high" : "normal",
          actionUrl: isAdmin ? "/content-approvals" : "/my-content",
          metadata: JSON.stringify({ contentApprovalId: input.contentApprovalId, mentionedRole }),
        });
      } catch (notifErr) {
        console.warn("[addComment] Notification failed:", notifErr);
      }

      return { success: true };
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

// ─── Scheduling helpers ───────────────────────────────────────────────────────

/**
 * Map a free-form platform string to the socialMediaPosts enum value.
 * Defaults to "facebook" if unrecognised.
 */
function mapPlatformToEnum(platform: string): "facebook" | "instagram" | "linkedin" | "twitter" {
  if (platform.includes("instagram")) return "instagram";
  if (platform.includes("linkedin")) return "linkedin";
  if (platform.includes("twitter")) return "twitter";
  return "facebook";
}

/**
 * Compute the next suitable publish date based on the client's preferences.
 *
 * @param preferredDays  JSON array string like '["Monday","Wednesday","Friday"]'
 *                       or comma-separated like "Mon,Wed,Fri"
 * @param preferredTime  "9:00 AM" or "09:00" style string
 */
function computeNextPublishDate(
  preferredDays: string | null,
  preferredTime: string | null
): Date {
  const DAY_MAP: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  };

  // Parse preferred days
  let targetDays: number[] = [];
  if (preferredDays) {
    try {
      const parsed = JSON.parse(preferredDays);
      if (Array.isArray(parsed)) {
        targetDays = parsed
          .map((d: string) => DAY_MAP[d.toLowerCase().trim()])
          .filter((n) => n !== undefined);
      }
    } catch {
      // comma-separated fallback
      targetDays = preferredDays
        .split(",")
        .map((d) => DAY_MAP[d.toLowerCase().trim()])
        .filter((n) => n !== undefined);
    }
  }

  // Parse preferred time (default 9 AM)
  let hour = 9;
  let minute = 0;
  if (preferredTime) {
    const match = preferredTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      hour = parseInt(match[1], 10);
      minute = parseInt(match[2], 10);
      if (match[3]?.toUpperCase() === "PM" && hour < 12) hour += 12;
      if (match[3]?.toUpperCase() === "AM" && hour === 12) hour = 0;
    }
  }

  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(hour, minute, 0, 0);

  // If no preferred days, default to next weekday
  if (targetDays.length === 0) {
    // Move to tomorrow if we're past the preferred time today
    if (candidate <= now) {
      candidate.setDate(candidate.getDate() + 1);
    }
    // Skip weekends
    while (candidate.getDay() === 0 || candidate.getDay() === 6) {
      candidate.setDate(candidate.getDate() + 1);
    }
    return candidate;
  }

  // Find the next occurrence of a preferred day
  for (let i = 0; i <= 7; i++) {
    const check = new Date(now);
    check.setDate(now.getDate() + i);
    check.setHours(hour, minute, 0, 0);
    if (targetDays.includes(check.getDay()) && check > now) {
      return check;
    }
  }

  // Fallback: 3 days from now at preferred time
  const fallback = new Date(now);
  fallback.setDate(now.getDate() + 3);
  fallback.setHours(hour, minute, 0, 0);
  return fallback;
}
