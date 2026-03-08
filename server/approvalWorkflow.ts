import { getDb } from "./seo-db";
import { content, contentComments, contentRevisions, seoUsers as users } from "../drizzle/seo-schema";
import { eq, and, desc } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

/**
 * Request approval for content
 */
export async function requestApproval(contentId: number, requestedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update content status to in_progress (pending approval)
  await db.update(content)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(content.id, contentId));

  // Get content details for notification
  const [contentData] = await db.select()
    .from(content)
    .where(eq(content.id, contentId))
    .limit(1);

  if (contentData) {
    // Notify owner about approval request
    await notifyOwner({
      title: "Content Approval Requested",
      content: `Content "${contentData.title}" is ready for review and approval.`
    });
  }

  return { success: true };
}

/**
 * Approve content
 */
export async function approveContent(contentId: number, approvedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(content)
    .set({ 
      status: "approved", 
      updatedAt: new Date(),
      wasApproved: 1,
      approvedAt: new Date()
    })
    .where(eq(content.id, contentId));

  // Get content details for notification
  const [contentData] = await db.select()
    .from(content)
    .where(eq(content.id, contentId))
    .limit(1);

  if (contentData) {
    await notifyOwner({
      title: "Content Approved",
      content: `Content "${contentData.title}" has been approved and is ready for publishing.`
    });
  }

  return { success: true };
}

/**
 * Request revision for content
 */
export async function requestRevision(
  contentId: number,
  requestedBy: number,
  reason: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create revision request
  await db.insert(contentRevisions).values({
    contentId,
    userId: requestedBy,
    requestedBy,
    reason,
    status: "pending",
    title: "",
    content: "",
    changeDescription: reason,
    revisionNumber: 1,
    createdAt: new Date(),
  });

  // Update content status back to draft for revision
  await db.update(content)
    .set({ 
      status: "draft", 
      updatedAt: new Date()
    })
    .where(eq(content.id, contentId));

  // Get content details for notification
  const [contentData] = await db.select()
    .from(content)
    .where(eq(content.id, contentId))
    .limit(1);

  if (contentData) {
    await notifyOwner({
      title: "Revision Requested",
      content: `Revision requested for "${contentData.title}": ${reason}`
    });
  }

  return { success: true };
}

/**
 * Get all pending approvals
 */
export async function getPendingApprovals() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const pendingContent = await db.select()
    .from(content)
    .where(eq(content.status, "in_progress"))
    .orderBy(desc(content.updatedAt));

  return pendingContent;
}

/**
 * Get revision requests for content
 */
export async function getRevisionRequests(contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const revisions = await db.select({
    id: contentRevisions.id,
    reason: contentRevisions.reason,
    status: contentRevisions.status,
    createdAt: contentRevisions.createdAt,
    completedAt: contentRevisions.completedAt,
    requestedBy: contentRevisions.requestedBy,
    userName: users.name,
  })
    .from(contentRevisions)
    .leftJoin(users, eq(contentRevisions.requestedBy, users.id))
    .where(eq(contentRevisions.contentId, contentId))
    .orderBy(desc(contentRevisions.createdAt));

  return revisions;
}

/**
 * Mark revision as completed
 */
export async function completeRevision(revisionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(contentRevisions)
    .set({ 
      status: "completed",
      completedAt: new Date()
    })
    .where(eq(contentRevisions.id, revisionId));

  // Get revision details to update content status
  const [revision] = await db.select()
    .from(contentRevisions)
    .where(eq(contentRevisions.id, revisionId))
    .limit(1);

  if (revision) {
    // Update content back to draft status
    await db.update(content)
      .set({ 
        status: "draft",
        updatedAt: new Date()
      })
      .where(eq(content.id, revision.contentId));
  }

  return { success: true };
}

/**
 * Add comment to content
 */
export async function addComment(
  contentId: number,
  userId: number,
  comment: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(contentComments).values({
    contentId,
    userId,
    comment,
    isResolved: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Get content details for notification
  const [contentData] = await db.select()
    .from(content)
    .where(eq(content.id, contentId))
    .limit(1);

  if (contentData) {
    await notifyOwner({
      title: "New Comment on Content",
      content: `New comment on "${contentData.title}": ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}`
    });
  }

  return { id: result.insertId };
}

/**
 * Get approval statistics
 */
export async function getApprovalStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Count pending approvals (in_progress status)
  const pending = await db.select()
    .from(content)
    .where(eq(content.status, "in_progress"));

  // Count approved
  const approved = await db.select()
    .from(content)
    .where(eq(content.wasApproved, 1));

  // Count revision requested (check revisions table)
  const revisionRequested = await db.select()
    .from(contentRevisions)
    .where(eq(contentRevisions.status, "pending"));

  return {
    pending: pending.length,
    approved: approved.length,
    revisionRequested: revisionRequested.length
  };
}
