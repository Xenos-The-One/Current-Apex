/**
 * Daily Content Approval Digest
 * Sends a summary email to admins listing:
 *   - All pending content approvals (not yet approved/rejected)
 *   - Content items with new unread client comments
 * Runs daily at 8 AM EST.
 */
import { getDb } from "../db";
import { contentApprovals, contentComments, users, clients } from "../../drizzle/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { sendEmail } from "../email-service";

const ADMIN_EMAIL = process.env.OWNER_EMAIL ?? process.env.SENDGRID_FROM_EMAIL ?? "";
const ADMIN_NAME = process.env.OWNER_NAME ?? "Admin";

export async function sendDailyContentDigest() {
  const db = await getDb();
  if (!db) {
    console.warn("[DailyDigest] Database unavailable, skipping digest");
    return;
  }

  try {
    // 1. Pending approvals
    const pending = await db
      .select({
        id: contentApprovals.id,
        title: contentApprovals.title,
        contentType: contentApprovals.contentType,
        platform: contentApprovals.platform,
        brand: contentApprovals.brand,
        createdAt: contentApprovals.createdAt,
      })
      .from(contentApprovals)
      .where(eq(contentApprovals.status, "pending"))
      .orderBy(contentApprovals.createdAt);

    // 2. Items with unread client comments (unread by admin)
    const unreadCommentItems = await db
      .select({
        contentApprovalId: contentComments.contentApprovalId,
        unreadCount: sql<number>`count(*)`,
        title: contentApprovals.title,
        brand: contentApprovals.brand,
      })
      .from(contentComments)
      .innerJoin(contentApprovals, eq(contentComments.contentApprovalId, contentApprovals.id))
      .where(
        and(
          eq(contentComments.isReadByAdmin, false),
          ne(contentComments.authorRole, "admin"),
        )
      )
      .groupBy(contentComments.contentApprovalId, contentApprovals.title, contentApprovals.brand);

    // Skip if nothing to report
    if (pending.length === 0 && unreadCommentItems.length === 0) {
      console.log("[DailyDigest] Nothing to report today, skipping email");
      return;
    }

    // Build HTML email
    const pendingSection = pending.length > 0
      ? `
        <h2 style="color:#1a1a1a;font-size:16px;margin-top:24px;">📋 Pending Approvals (${pending.length})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0;">Title</th>
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0;">Type</th>
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0;">Platform</th>
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0;">Brand</th>
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0;">Created</th>
            </tr>
          </thead>
          <tbody>
            ${pending.map((item, i) => `
              <tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"};">
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.title ?? "Untitled"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.contentType ?? "-"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.platform ?? "-"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.brand ?? "-"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${new Date(item.createdAt).toLocaleDateString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `
      : `<p style="color:#666;font-size:13px;">✅ No pending approvals today.</p>`;

    const commentsSection = unreadCommentItems.length > 0
      ? `
        <h2 style="color:#1a1a1a;font-size:16px;margin-top:24px;">💬 Unread Client Comments (${unreadCommentItems.length} item${unreadCommentItems.length !== 1 ? "s" : ""})</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0;">Title</th>
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0;">Brand</th>
              <th style="text-align:left;padding:8px 12px;border-bottom:1px solid #e0e0e0;">Unread Comments</th>
            </tr>
          </thead>
          <tbody>
            ${unreadCommentItems.map((item, i) => `
              <tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"};">
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.title ?? "Untitled"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">${item.brand ?? "-"}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#dc2626;font-weight:600;">${item.unreadCount}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `
      : `<p style="color:#666;font-size:13px;">✅ No unread client comments today.</p>`;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#1a1a1a;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Daily Content Digest</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
          <p style="margin-top:0;">Hi ${ADMIN_NAME},</p>
          <p>Here's your daily content summary. Log in to review and take action.</p>
          ${pendingSection}
          ${commentsSection}
          <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;">
            <a href="${process.env.VITE_FRONTEND_FORGE_API_URL ?? "#"}/content-approvals"
               style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">
              Review Content →
            </a>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!ADMIN_EMAIL) {
      console.warn("[DailyDigest] No admin email configured, skipping send");
      return;
    }

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Daily Content Digest — ${pending.length} pending, ${unreadCommentItems.length} with new comments`,
      html,
      text: `Daily Content Digest\n\nPending approvals: ${pending.length}\nItems with unread comments: ${unreadCommentItems.length}\n\nLog in to review.`,
    });

    console.log(`[DailyDigest] ✅ Sent to ${ADMIN_EMAIL} — ${pending.length} pending, ${unreadCommentItems.length} with unread comments`);
  } catch (err) {
    console.error("[DailyDigest] Failed to send digest:", err);
  }
}
