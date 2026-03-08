/**
 * Notification Routing Configuration
 * 
 * TARIQ (dev/owner): All system, dev, agent, analytics, campaign, error notifications
 * TEAM (tim.haskins@pmrloans.com): Only lead-related and appointment-related notifications
 * 
 * This centralizes all notification routing decisions.
 */

import { sendEmail } from "./sendgrid";

// Email addresses
const TARIQ_EMAIL = process.env.TARIQ_EMAIL || "tariqhaskins@indigolabsai.com";
const TEAM_EMAIL = process.env.TIM_EMAIL || "haskinstim57@gmail.com";
// FIX: FROM_EMAIL must be a SendGrid-verified sender address.
// Using tariqhaskins@indigolabsai.com as the verified sender.
// If you want to use a custom domain, verify it in SendGrid Settings → Sender Authentication.
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@lockinloans.com";

export type NotificationCategory = 
  | "lead_new"           // New lead came in → TEAM
  | "lead_hot"           // Hot lead alert → TEAM + TARIQ
  | "lead_status"        // Lead status changed → TEAM
  | "appointment_new"    // New appointment booked → TEAM
  | "appointment_reminder" // Appointment reminder → TEAM
  | "appointment_noshow" // No-show alert → TEAM
  | "appointment_completed" // Appointment completed → TEAM
  | "agent_report"       // AI agent report → TARIQ
  | "agent_error"        // AI agent error → TARIQ
  | "system_health"      // System health check → TARIQ
  | "system_error"       // System error → TARIQ
  | "campaign_update"    // Campaign performance → TARIQ
  | "analytics_report"   // Analytics/metrics → TARIQ
  | "webinar_milestone"  // Webinar registration milestone → TARIQ
  | "daily_standup"      // Daily standup → TARIQ
  | "weekly_report"      // Weekly report → TARIQ
  | "content_ready"      // Content ready for approval → TARIQ
  | "billing_alert"      // Billing/payment alert → TARIQ
  | "dev_notification";  // Development/deployment → TARIQ

interface NotificationRouting {
  toTariq: boolean;
  toTeam: boolean;
}

const ROUTING_MAP: Record<NotificationCategory, NotificationRouting> = {
  // Lead notifications → TEAM only (unless hot → both)
  lead_new: { toTariq: false, toTeam: true },
  lead_hot: { toTariq: true, toTeam: true },
  lead_status: { toTariq: false, toTeam: true },
  
  // Appointment notifications → TEAM only
  appointment_new: { toTariq: false, toTeam: true },
  appointment_reminder: { toTariq: false, toTeam: true },
  appointment_noshow: { toTariq: false, toTeam: true },
  appointment_completed: { toTariq: false, toTeam: true },
  
  // Everything else → TARIQ only
  agent_report: { toTariq: true, toTeam: false },
  agent_error: { toTariq: true, toTeam: false },
  system_health: { toTariq: true, toTeam: false },
  system_error: { toTariq: true, toTeam: false },
  campaign_update: { toTariq: true, toTeam: false },
  analytics_report: { toTariq: true, toTeam: false },
  webinar_milestone: { toTariq: true, toTeam: false },
  daily_standup: { toTariq: true, toTeam: false },
  weekly_report: { toTariq: true, toTeam: false },
  content_ready: { toTariq: true, toTeam: false },
  billing_alert: { toTariq: true, toTeam: false },
  dev_notification: { toTariq: true, toTeam: false },
};

/**
 * Get the email recipients for a given notification category
 */
export function getRecipients(category: NotificationCategory): string[] {
  const routing = ROUTING_MAP[category];
  if (!routing) {
    console.warn(`[Notification Routing] Unknown category: ${category}, defaulting to Tariq`);
    return [TARIQ_EMAIL];
  }

  const recipients: string[] = [];
  if (routing.toTariq) recipients.push(TARIQ_EMAIL);
  if (routing.toTeam) recipients.push(TEAM_EMAIL);
  return recipients;
}

/**
 * Send a routed notification email
 * Automatically routes to the correct recipients based on category
 */
export async function sendRoutedNotification(params: {
  category: NotificationCategory;
  subject: string;
  html: string;
  text?: string;
}) {
  const recipients = getRecipients(params.category);
  
  if (recipients.length === 0) {
    console.warn(`[Notification Routing] No recipients for category: ${params.category}`);
    return { success: false, error: "No recipients" };
  }

  console.log(`[Notification Routing] Sending ${params.category} to: ${recipients.join(", ")}`);

  const result = await sendEmail({
    to: recipients,
    from: FROM_EMAIL,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });

  return result;
}

/**
 * Quick helper: Send dev/system notification to Tariq only
 */
export async function notifyTariq(subject: string, html: string) {
  return sendEmail({
    to: [TARIQ_EMAIL],
    from: FROM_EMAIL,
    subject: `[Sterling CRM] ${subject}`,
    html,
  });
}

/**
 * Quick helper: Send lead/appointment notification to team only
 */
export async function notifyTeam(subject: string, html: string) {
  return sendEmail({
    to: [TEAM_EMAIL],
    from: FROM_EMAIL,
    subject,
    html,
  });
}

// Export constants for use elsewhere
export { TARIQ_EMAIL, TEAM_EMAIL, FROM_EMAIL };
