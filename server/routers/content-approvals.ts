import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb, getClientByUserId, createSocialMediaPost } from "../db";
import { contentApprovals, clients } from "../../drizzle/schema";
import { seoClients } from "../../drizzle/seo-schema";
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
      await db
        .update(contentApprovals)
        .set({ status: "approved", approvedAt: new Date() })
        .where(eq(contentApprovals.id, input.approvalId));
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
      await db
        .update(contentApprovals)
        .set({ status: "rejected", feedback: input.feedback })
        .where(eq(contentApprovals.id, input.approvalId));
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
