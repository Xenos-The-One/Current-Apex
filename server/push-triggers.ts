/**
 * Push Notification Triggers
 *
 * Centralized module that sends push notifications for all critical CRM events.
 * FIX: Now calls BOTH sendPushBroadcast (device push) AND createAndPushNotification
 * (in-app notification center) so events appear in the notification center UI.
 *
 * Events covered:
 * 1. New lead captured (from any source: form, Facebook, webinar)
 * 2. Appointment booked (self-booked or via Vapi)
 * 3. Vapi call completed (with or without appointment)
 * 4. Lead status changed to key milestones
 * 5. Webinar registration
 * 6. System alerts (errors, milestones)
 */

import { sendPushBroadcast, createAndPushNotification } from "./routers/notifications";
import { logNotification } from "./notification-logger";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

/**
 * Format current time for push notification body (Pacific Time)
 */
function nowPT(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  }) + " PT";
}

/**
 * Get all admin/owner user IDs to create in-app notifications for them
 * FIX: Looks up Tariq and Tim by their user_id in team_members
 */
async function getOwnerUserIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    // Return ALL linked team member user_ids (not just smart_alerts_enabled)
    // so both Tariq (930023) and Tim (1) always receive in-app notifications
    const result = await db.execute(
      sql.raw("SELECT DISTINCT user_id FROM team_members WHERE user_id IS NOT NULL")
    ) as any;
    const rows = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : [];
    return rows.map((r: any) => r.user_id).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Create in-app notifications for all admin users
 * FIX: This is the missing piece — push-triggers was only sending device pushes
 * but never creating rows in team_notifications, so the notification center was empty
 */
async function createInAppForAllAdmins(params: {
  type: string;
  title: string;
  body: string;
  priority?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}) {
  const userIds = await getOwnerUserIds();
  for (const userId of userIds) {
    await createAndPushNotification({
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      priority: params.priority || "normal",
      actionUrl: params.actionUrl,
      metadata: params.metadata,
    }).catch(err => console.error(`[Push Triggers] Failed to create in-app notification for user ${userId}:`, err));
  }
}

/**
 * Push notification when a new lead is captured
 * FIX: Now also creates in-app notification so it shows in notification center
 */
export async function pushNewLead(params: {
  leadId: number;
  firstName: string;
  lastName: string;
  phone: string;
  source: string;
  email?: string;
}) {
  const { firstName, lastName, phone, source, leadId } = params;
  const title = "🆕 New Lead Captured!";
  const body = `${firstName} ${lastName} from ${source}\nPhone: ${phone}\n${nowPT()}`;

  try {
    // Device push (broadcast to all subscribed devices)
    const result = await sendPushBroadcast({
      title,
      body,
      tag: "new_lead",
      data: { url: "/leads" },
    });
    console.log(`[Push Triggers] New lead push sent: ${result.sent} delivered, ${result.failed} failed`);

    // FIX: Also create in-app notification for notification center
    await createInAppForAllAdmins({
      type: "new_lead",
      title,
      body,
      priority: "high",
      actionUrl: `/leads`,
      metadata: { leadId, source },
    });

    await logNotification({
      type: "push",
      channel: "push",
      recipient: "Team",
      subject: "New Lead Captured",
      body: `${firstName} ${lastName} from ${source} — Phone: ${phone}`,
      status: result.sent > 0 ? "sent" : "failed",
      metadata: { leadId, source, sent: result.sent, failed: result.failed },
    });
    return result;
  } catch (error) {
    console.error("[Push Triggers] Failed to send new lead push:", error);
    await logNotification({ type: "push", channel: "push", recipient: "Team", subject: "New Lead Captured", status: "failed", metadata: { error: String(error) } });
    return { sent: 0, failed: 0 };
  }
}

/**
 * Push notification when a Facebook lead comes in
 */
export async function pushFacebookLead(params: {
  leadId: number;
  firstName: string;
  lastName: string;
  phone: string;
  formName?: string;
  adName?: string;
}) {
  const { firstName, lastName, phone, formName, adName, leadId } = params;
  const title = "📘 Facebook Lead!";
  const body = `${firstName} ${lastName}\nPhone: ${phone}${formName ? `\nForm: ${formName}` : ''}${adName ? `\nAd: ${adName}` : ''}\n${nowPT()}`;

  try {
    const result = await sendPushBroadcast({
      title,
      body,
      tag: "facebook_lead",
      data: { url: "/leads" },
    });

    // FIX: Create in-app notification
    await createInAppForAllAdmins({
      type: "new_lead",
      title,
      body,
      priority: "high",
      actionUrl: `/leads`,
      metadata: { leadId, source: "facebook", formName, adName },
    });

    await logNotification({
      type: "push",
      channel: "push",
      recipient: "Team",
      subject: "Facebook Lead",
      body: `${firstName} ${lastName} — Phone: ${phone}`,
      status: result.sent > 0 ? "sent" : "failed",
      metadata: { leadId, formName, adName, sent: result.sent, failed: result.failed },
    });
    return result;
  } catch (error) {
    console.error("[Push Triggers] Failed to send Facebook lead push:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Push notification when an appointment is booked
 * FIX: Now also creates in-app notification
 */
export async function pushAppointmentBooked(params: {
  firstName: string;
  lastName: string;
  phone: string;
  appointmentDate: Date;
  source?: string;
  appointmentId?: number;
}) {
  const { firstName, lastName, phone, appointmentDate, source, appointmentId } = params;

  const dateStr = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles',
  });
  const timeStr = appointmentDate.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles',
  });

  const title = "📅 Appointment Booked!";
  const body = `${firstName} ${lastName} booked for ${dateStr} at ${timeStr} PT\nPhone: ${phone}${source ? `\nSource: ${source}` : ''}\nReceived: ${nowPT()}`;

  try {
    const result = await sendPushBroadcast({
      title,
      body,
      tag: "appointment_booked",
      data: { url: "/appointments" },
    });

    // FIX: Create in-app notification
    await createInAppForAllAdmins({
      type: "appointment_booked",
      title,
      body,
      priority: "high",
      actionUrl: "/appointments",
      metadata: { appointmentId, source },
    });

    await logNotification({
      type: "push",
      channel: "push",
      recipient: "Team",
      subject: "Appointment Booked",
      body: `${firstName} ${lastName} booked for ${dateStr} at ${timeStr}`,
      status: result.sent > 0 ? "sent" : "failed",
      metadata: { source, sent: result.sent, failed: result.failed },
    });
    return result;
  } catch (error) {
    console.error("[Push Triggers] Failed to send appointment booked push:", error);
    await logNotification({ type: "push", channel: "push", recipient: "Team", subject: "Appointment Booked", status: "failed", metadata: { error: String(error) } });
    return { sent: 0, failed: 0 };
  }
}

/**
 * Push notification when Vapi AI books an appointment
 */
export async function pushVapiAppointmentBooked(params: {
  firstName: string;
  lastName: string;
  phone: string;
  appointmentDate: Date;
  callDuration?: number;
  loanType?: string;
}) {
  const { firstName, lastName, phone, appointmentDate, callDuration, loanType } = params;

  const dateStr = appointmentDate.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles',
  });
  const timeStr = appointmentDate.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles',
  });
  const durationStr = callDuration ? `${Math.round(callDuration / 60)}min call` : '';

  const title = "🤖 AI Booked Appointment!";
  const body = `Sarah (AI) booked ${firstName} ${lastName}\n${dateStr} at ${timeStr} PT${durationStr ? ` (${durationStr})` : ''}${loanType ? `\nLoan: ${loanType}` : ''}\nReceived: ${nowPT()}`;

  try {
    const result = await sendPushBroadcast({
      title,
      body,
      tag: "vapi_appointment",
      data: { url: "/appointments" },
    });

    await createInAppForAllAdmins({
      type: "appointment_booked",
      title,
      body,
      priority: "high",
      actionUrl: "/appointments",
      metadata: { loanType, callDuration, source: "vapi" },
    });

    await logNotification({
      type: "push",
      channel: "push",
      recipient: "Team",
      subject: "AI Booked Appointment",
      body: `Sarah (AI) booked ${firstName} ${lastName} for ${dateStr} at ${timeStr}`,
      status: result.sent > 0 ? "sent" : "failed",
      metadata: { loanType, callDuration, sent: result.sent, failed: result.failed },
    });
    return result;
  } catch (error) {
    console.error("[Push Triggers] Failed to send Vapi appointment push:", error);
    await logNotification({ type: "push", channel: "push", recipient: "Team", subject: "AI Booked Appointment", status: "failed", metadata: { error: String(error) } });
    return { sent: 0, failed: 0 };
  }
}

/**
 * Push notification when Vapi call completes WITHOUT appointment
 */
export async function pushVapiCallCompleted(params: {
  firstName: string;
  lastName: string;
  phone: string;
  callDuration?: number;
  callSummary?: string;
  outcome?: string;
}) {
  const { firstName, lastName, callDuration, callSummary, outcome } = params;

  const durationStr = callDuration ? `${Math.round(callDuration / 60)}min` : 'unknown duration';
  const summarySnippet = callSummary ? callSummary.substring(0, 80) : 'No summary';

  const title = "📞 AI Call Completed";
  const body = `${firstName} ${lastName} (${durationStr})\n${outcome || summarySnippet}\n${nowPT()}`;

  try {
    const result = await sendPushBroadcast({
      title,
      body,
      tag: "vapi_call_completed",
      data: { url: "/call-review" },
    });

    await createInAppForAllAdmins({
      type: "vapi_call",
      title,
      body,
      priority: "normal",
      actionUrl: "/call-review",
      metadata: { callDuration, outcome },
    });

    await logNotification({
      type: "push",
      channel: "push",
      recipient: "Team",
      subject: "AI Call Completed",
      body: `${firstName} ${lastName} (${durationStr}) — ${outcome || summarySnippet}`,
      status: result.sent > 0 ? "sent" : "failed",
      metadata: { callDuration, outcome, sent: result.sent, failed: result.failed },
    });
    return result;
  } catch (error) {
    console.error("[Push Triggers] Failed to send Vapi call completed push:", error);
    await logNotification({ type: "push", channel: "push", recipient: "Team", subject: "AI Call Completed", status: "failed", metadata: { error: String(error) } });
    return { sent: 0, failed: 0 };
  }
}

/**
 * Push notification when Vapi call is initiated
 */
export async function pushVapiCallInitiated(params: {
  firstName: string;
  lastName: string;
  phone: string;
  source: string;
}) {
  const { firstName, lastName, phone, source } = params;

  const title = "📱 AI Calling Lead...";
  const body = `Sarah is calling ${firstName} ${lastName}\nPhone: ${phone}\nSource: ${source}\n${nowPT()}`;

  try {
    const result = await sendPushBroadcast({
      title,
      body,
      tag: "vapi_call_initiated",
      data: { url: "/leads" },
    });

    await createInAppForAllAdmins({
      type: "vapi_call",
      title,
      body,
      priority: "normal",
      actionUrl: "/leads",
      metadata: { source },
    });

    await logNotification({
      type: "push",
      channel: "push",
      recipient: "Team",
      subject: "AI Calling Lead",
      body: `Sarah is calling ${firstName} ${lastName} — Phone: ${phone}`,
      status: result.sent > 0 ? "sent" : "failed",
      metadata: { source, sent: result.sent, failed: result.failed },
    });
    return result;
  } catch (error) {
    console.error("[Push Triggers] Failed to send Vapi call initiated push:", error);
    await logNotification({ type: "push", channel: "push", recipient: "Team", subject: "AI Calling Lead", status: "failed", metadata: { error: String(error) } });
    return { sent: 0, failed: 0 };
  }
}

/**
 * Push notification for lead status changes to key milestones
 * FIX: Now also creates in-app notification
 */
export async function pushLeadStatusChange(params: {
  leadId: number;
  firstName: string;
  lastName: string;
  oldStatus: string;
  newStatus: string;
}) {
  const { firstName, lastName, oldStatus, newStatus, leadId } = params;

  // Only push for significant status changes
  const significantStatuses = ['qualified', 'appointment_set', 'closed_won', 'closed_lost'];
  if (!significantStatuses.includes(newStatus)) return { sent: 0, failed: 0 };

  const statusLabels: Record<string, string> = {
    qualified: "✅ Lead Qualified",
    appointment_set: "📅 Appointment Set",
    closed_won: "🎉 Deal Won!",
    closed_lost: "❌ Deal Lost",
  };

  const title = statusLabels[newStatus] || `Lead Status: ${newStatus}`;
  const body = `${firstName} ${lastName}: ${oldStatus} → ${newStatus}\n${nowPT()}`;

  try {
    const result = await sendPushBroadcast({
      title,
      body,
      tag: "lead_status_change",
      data: { url: "/leads" },
    });

    await createInAppForAllAdmins({
      type: "lead_status_change",
      title,
      body,
      priority: newStatus === "closed_won" ? "high" : "normal",
      actionUrl: `/leads`,
      metadata: { leadId, oldStatus, newStatus },
    });

    await logNotification({
      type: "push",
      channel: "push",
      recipient: "Team",
      subject: title,
      body: `${firstName} ${lastName}: ${oldStatus} → ${newStatus}`,
      status: result.sent > 0 ? "sent" : "failed",
      metadata: { leadId, oldStatus, newStatus, sent: result.sent, failed: result.failed },
    });
    return result;
  } catch (error) {
    console.error("[Push Triggers] Failed to send lead status change push:", error);
    await logNotification({ type: "push", channel: "push", recipient: "Team", subject: "Lead Status Change", status: "failed", metadata: { error: String(error) } });
    return { sent: 0, failed: 0 };
  }
}

/**
 * Push notification for webinar registration milestone
 */
export async function pushWebinarMilestone(params: {
  registrantName: string;
  totalRegistrations: number;
  webinarTitle: string;
}) {
  const { registrantName, totalRegistrations, webinarTitle } = params;

  const title = "🎯 Webinar Registration!";
  const body = `${registrantName} just registered!\nTotal: ${totalRegistrations} for "${webinarTitle}"\n${nowPT()}`;

  try {
    const result = await sendPushBroadcast({
      title,
      body,
      tag: "webinar_registration",
      data: { url: "/analytics" },
    });

    await createInAppForAllAdmins({
      type: "webinar_milestone",
      title,
      body,
      priority: "normal",
      actionUrl: "/analytics",
      metadata: { totalRegistrations, webinarTitle },
    });

    await logNotification({
      type: "push",
      channel: "push",
      recipient: "Team",
      subject: "Webinar Registration",
      body: `${registrantName} registered — Total: ${totalRegistrations}`,
      status: result.sent > 0 ? "sent" : "failed",
      metadata: { totalRegistrations, sent: result.sent, failed: result.failed },
    });
    return result;
  } catch (error) {
    console.error("[Push Triggers] Failed to send webinar milestone push:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Push notification for system alerts
 */
export async function pushSystemAlert(params: {
  title: string;
  message: string;
  priority?: "low" | "normal" | "high" | "urgent";
  actionUrl?: string;
}) {
  const { title, message, priority = "normal", actionUrl = "/notifications" } = params;

  try {
    const result = await sendPushBroadcast({
      title,
      body: message,
      tag: "system_alert",
      data: { url: actionUrl },
    });

    await createInAppForAllAdmins({
      type: "system",
      title,
      body: message,
      priority,
      actionUrl,
    });

    await logNotification({
      type: "push",
      channel: "push",
      recipient: "Team",
      subject: title,
      body: message,
      status: result.sent > 0 ? "sent" : "failed",
      metadata: { sent: result.sent, failed: result.failed },
    });
    return result;
  } catch (error) {
    console.error("[Push Triggers] Failed to send system alert push:", error);
    return { sent: 0, failed: 0 };
  }
}

// Alias for backward compatibility — webinars router imports this name
export const pushWebinarRegistration = pushWebinarMilestone;
