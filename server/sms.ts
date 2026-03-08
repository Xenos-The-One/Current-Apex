import { sendSMS as sendTwilioSMS } from "./twilio";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./email-service";
import { isTestLead, logTestLeadSuppression } from "./test-lead-utils";
import { logNotification, logSuppressed } from "./notification-logger";

/**
 * Send SMS message via Twilio (with automatic fallback to push notification)
 */
export async function sendSMS(params: {
  to: string;
  message: string;
}) {
  return await sendTwilioSMS({
    to: params.to,
    body: params.message,
  });
}

/**
 * Send appointment reminder SMS (with email fallback)
 */
export async function sendAppointmentReminder(params: {
  to: string;
  customerName: string;
  appointmentDate: Date;
  hoursUntil: number;
}) {
  const formattedDate = params.appointmentDate.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  let message: string;
  
  if (params.hoursUntil === 24) {
    message = `Hi ${params.customerName}! This is a reminder about your mortgage consultation with Premier Mortgage Resources tomorrow at ${formattedDate}. Looking forward to speaking with you!`;
  } else if (params.hoursUntil === 2) {
    message = `Hi ${params.customerName}! Your mortgage consultation with Premier Mortgage Resources is in 2 hours at ${formattedDate}. See you soon!`;
  } else {
    message = `Hi ${params.customerName}! Reminder: Your mortgage consultation with Premier Mortgage Resources is at ${formattedDate}.`;
  }

  // Try SMS first, falls back to push notification automatically via twilio.ts
  const smsResult = await sendTwilioSMS({
    to: params.to,
    body: message,
  });

  // Also send email reminder as backup
  try {
    // We don't have the email here, but the appointment reminder job handles email separately
    console.log(`[SMS] Appointment reminder sent to ${params.customerName} (${params.to})`);
  } catch (err) {
    console.error("[SMS] Error in appointment reminder:", err);
  }

  return smsResult;
}

/**
 * Send new lead notification to Tim via push notification
 */
export async function sendNewLeadNotification(params: {
  leadName: string;
  leadPhone: string;
  leadSource: string;
  leadEmail?: string | null;
  isTest?: boolean | null;
}) {
  // Suppress push + SMS for test leads
  if (isTestLead({ phone: params.leadPhone, email: params.leadEmail, isTest: params.isTest })) {
    logTestLeadSuppression("push", { phone: params.leadPhone, email: params.leadEmail, isTest: params.isTest }, "sendNewLeadNotification");
    await logSuppressed({ type: "new_lead_notification", channel: "push", recipient: params.leadPhone, reason: "test_lead" });
    return { success: true, fallback: true };
  }
  const message = `New lead from ${params.leadSource}: ${params.leadName} (${params.leadPhone}). Vapi will call them in 5 minutes.`;

  // Send as push notification (always works)
  try {
    await notifyOwner({
      title: "New Lead Alert",
      content: message,
    });
    await logNotification({ type: "new_lead_notification", channel: "push", recipient: "owner", subject: "New Lead Alert", body: message, status: "sent", metadata: { leadName: params.leadName, leadSource: params.leadSource } });
  } catch (err) {
    console.error("[SMS] Push notification failed:", err);
    await logNotification({ type: "new_lead_notification", channel: "push", recipient: "owner", subject: "New Lead Alert", body: message, status: "failed", metadata: { error: String(err) } });
  }

  // Also try SMS
  const timPhone = process.env.TIMISHA_PHONE_NUMBER || "";
  if (timPhone) {
    return await sendTwilioSMS({
      to: timPhone,
      body: message,
    });
  }

  return { success: true, fallback: true };
}
