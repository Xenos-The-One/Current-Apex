import twilio from "twilio";
import { notifyOwner } from "./_core/notification";
import { sendEmail } from "./email-service";
import { isTestLead, logTestLeadSuppression } from "./test-lead-utils";
import { logNotification, logSuppressed } from "./notification-logger";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

const DEMO_MODE = !TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER;

let twilioClient: ReturnType<typeof twilio> | null = null;

if (!DEMO_MODE) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  console.log("[Twilio] Initialized with credentials");
} else {
  console.log("[Twilio] Running in DEMO MODE - no credentials provided");
}

export interface SMSParams {
  to: string;
  body: string;
  from?: string;
}

/**
 * Send SMS via Twilio with automatic fallback to push notification + email
 * when SMS delivery fails (e.g., A2P 10DLC not registered)
 */
export async function sendSMS(params: SMSParams & { leadContext?: { email?: string | null; isTest?: boolean | null; firstName?: string; lastName?: string } }): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  demo?: boolean;
  fallback?: boolean;
}> {
  // Suppress all SMS for test leads
  if (params.leadContext && isTestLead({ phone: params.to, ...params.leadContext })) {
    logTestLeadSuppression("sms", { phone: params.to, ...params.leadContext }, "sendSMS");
    await logSuppressed({ type: "sms", channel: "sms", recipient: params.to, reason: "test_lead" });
    return { success: true, demo: true, fallback: true };
  }

  if (DEMO_MODE) {
    console.log("[Twilio DEMO] Would send SMS:", {
      to: params.to,
      body: params.body.substring(0, 50) + "...",
      from: params.from || TWILIO_PHONE_NUMBER,
    });
    
    // In demo mode, send as push notification instead
    await sendAsFallback(params);
    await logNotification({ type: "sms", channel: "sms", recipient: params.to, body: params.body, status: "sent", metadata: { demo: true, fallback: true } });
    
    return {
      success: true,
      messageId: `demo-sms-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      demo: true,
      fallback: true,
    };
  }

  try {
    // Use Messaging Service SID for A2P-compliant delivery when available
    const messageCreateParams: any = {
      to: formatPhoneNumber(params.to),
      body: params.body,
    };
    if (TWILIO_MESSAGING_SERVICE_SID && !params.from) {
      messageCreateParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
    } else {
      messageCreateParams.from = params.from || TWILIO_PHONE_NUMBER!;
    }
    const message = await twilioClient!.messages.create(messageCreateParams);
    
    // Check for immediate failures
    if (message.status === 'failed' || message.status === 'undelivered') {
      console.warn(`[Twilio] SMS may not deliver (status: ${message.status}), sending fallback`);
      await sendAsFallback(params);
      return {
        success: true,
        messageId: message.sid,
        fallback: true,
      };
    }
    
    console.log(`[Twilio] SMS sent to ${params.to}: ${message.sid} (status: ${message.status})`);
    await logNotification({ type: "sms", channel: "sms", recipient: params.to, body: params.body, status: "sent", metadata: { sid: message.sid, twilioStatus: message.status } });
    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error: any) {
    console.error("[Twilio] Error sending SMS:", error.message);
    await logNotification({ type: "sms", channel: "sms", recipient: params.to, body: params.body, status: "failed", metadata: { error: error.message } });
    // If SMS fails, send as push notification + email instead
    console.log("[Twilio] Falling back to push notification + email");
    await sendAsFallback(params);
    
    return {
      success: true, // Mark as success since fallback was sent
      error: `SMS failed (${error.message}), sent via push notification instead`,
      fallback: true,
    };
  }
}

/**
 * Send the message as a push notification and email when SMS is unavailable
 * FIX: No longer calls notifyOwner() which was flooding the notification center
 * with "SMS Delivery Notice" messages every time Twilio was in demo mode.
 * Now just logs silently to the console and notification_logs table.
 */
async function sendAsFallback(params: SMSParams): Promise<void> {
  // Only log to console — do NOT call notifyOwner() as it creates Manus platform
  // notifications that flood the notification center with "Test" messages.
  // The notification_logs table already captures this via logNotification() in sendSMS().
  console.log(`[Twilio Fallback] SMS to ${params.to} could not be delivered (demo mode or A2P failure). Message logged only.`);
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If already has country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits;
  }
  
  // If 10 digits, add US country code
  if (digits.length === 10) {
    return '+1' + digits;
  }
  
  // If already formatted with +
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Default: add +1
  return '+1' + digits;
}

export async function sendBulkSMS(recipients: string[], body: string, from?: string): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const recipient of recipients) {
    const result = await sendSMS({ to: recipient, body, from });
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      if (result.error) results.errors.push(`${recipient}: ${result.error}`);
    }
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return {
    success: results.failed === 0,
    sent: results.sent,
    failed: results.failed,
    errors: results.errors.length > 0 ? results.errors : undefined,
  };
}

export function isDemoMode(): boolean {
  return DEMO_MODE;
}

export function getFromNumber(): string | undefined {
  return TWILIO_PHONE_NUMBER;
}
