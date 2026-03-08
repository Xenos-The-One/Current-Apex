/**
 * Notification Logger
 * Writes every outbound notification (email, SMS, push, in_app) to the notification_logs table.
 * Import logNotification() from any send helper to instrument it.
 */

import { getDb } from "./seo-db";
import { notificationLogs } from "../drizzle/seo-schema";

export type NotificationChannel = "email" | "sms" | "push" | "in_app";
export type NotificationStatus = "sent" | "failed" | "suppressed";

export interface LogNotificationParams {
  type: string;               // e.g. "new_lead", "appointment_reminder", "rank_alert"
  channel: NotificationChannel;
  recipient: string;          // email address or phone number
  subject?: string;
  body?: string;
  status: NotificationStatus;
  suppressed?: boolean;
  suppressionReason?: string;
  leadId?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Write a notification event to the notification_logs table.
 * Never throws — silently catches DB errors so it never breaks the caller.
 */
export async function logNotification(params: LogNotificationParams): Promise<void> {
  try {
    const db = (await getDb())!;
    await db.insert(notificationLogs).values({
      type: params.type,
      channel: params.channel,
      recipient: params.recipient,
      subject: params.subject ?? null,
      body: params.body ? params.body.slice(0, 2000) : null, // cap at 2000 chars
      status: params.status,
      suppressed: params.suppressed ?? false,
      suppressionReason: params.suppressionReason ?? null,
      leadId: params.leadId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });
  } catch (err) {
    // Never let logging break the caller
    console.error("[NotificationLogger] Failed to log notification:", err);
  }
}

/**
 * Convenience: log a suppressed test lead event
 */
export async function logSuppressed(params: {
  type: string;
  channel: NotificationChannel;
  recipient: string;
  leadId?: number;
  reason?: string;
}): Promise<void> {
  return logNotification({
    type: params.type,
    channel: params.channel,
    recipient: params.recipient,
    status: "suppressed",
    suppressed: true,
    suppressionReason: params.reason ?? "test_lead",
    leadId: params.leadId,
  });
}
