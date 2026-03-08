import sgMail from "@sendgrid/mail";
import { logNotification } from "./notification-logger";

// Check if SendGrid is configured (reads key dynamically each call)
const isInitialized = !!process.env.SENDGRID_API_KEY;
if (isInitialized) {
  console.log("[EmailService] ✅ SendGrid initialized successfully");
} else {
  console.warn("[EmailService] No SendGrid API key found");
}

// Verified SendGrid sender — noreply@lockinloans.com is verified and ready.
// reply-to is set to tim.haskins@pmrloans.com so any replies go to Tim.
export const DEFAULT_FROM_EMAIL = process.env.FROM_EMAIL || "noreply@lockinloans.com";
export const DEFAULT_FROM_NAME = process.env.FROM_NAME || "Lock In Loans";
export const DEFAULT_REPLY_TO = "tim.haskins@pmrloans.com";

/**
 * Standard email footer disclaimer — appended to every outgoing email.
 */
export function getEmailFooter(): string {
  return `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;line-height:1.6;">
  <p style="margin:0 0 4px 0;">
    <strong>Please do not reply to this email.</strong> This mailbox is not monitored.
  </p>
  <p style="margin:0 0 4px 0;">
    To reach Tim directly, email <a href="mailto:tim.haskins@pmrloans.com" style="color:#6b7280;">tim.haskins@pmrloans.com</a>
    or call <a href="tel:+17025551234" style="color:#6b7280;">your direct line</a>.
  </p>
  <p style="margin:0;">
    &copy; ${new Date().getFullYear()} Lock In Loans | Tim Haskins, NMLS# 123456 | PMR Loans
  </p>
</div>`;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64
    type: string;
    disposition?: string;
  }>;
  skipFooter?: boolean; // set true only for transactional emails that already have their own footer
}

/**
 * Send a single email
 */
export async function sendEmail(options: SendEmailOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  // Read API key dynamically on each call so hot-reloaded env changes take effect
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error("[EmailService] SendGrid not initialized");
    return {
      success: false,
      error: "Email service not configured",
    };
  }
  sgMail.setApiKey(apiKey);

  const fromAddress = options.from || DEFAULT_FROM_EMAIL;
  const fromName = options.fromName || DEFAULT_FROM_NAME;
  const replyTo = options.replyTo || DEFAULT_REPLY_TO;

  // Append disclaimer footer unless caller explicitly opts out
  const htmlBody = options.skipFooter
    ? options.html
    : options.html + getEmailFooter();

  try {
    console.log(`[EmailService] Sending email to: ${options.to}, subject: ${options.subject}, from: ${fromAddress}`);

    const msg: any = {
      to: options.to,
      from: { email: fromAddress, name: fromName },
      replyTo: replyTo,
      subject: options.subject,
      html: htmlBody,
    };

    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments;
    }

    const response = await sgMail.send(msg);
    const messageId = response[0].headers["x-message-id"];

    console.log(`[EmailService] ✅ Email sent successfully. Message ID: ${messageId}`);
    await logNotification({
      type: "email",
      channel: "email",
      recipient: options.to,
      subject: options.subject,
      body: options.html.replace(/<[^>]+>/g, " ").slice(0, 500),
      status: "sent",
      metadata: { messageId: messageId as string, from: fromAddress },
    });
    return {
      success: true,
      messageId: messageId as string,
    };
  } catch (error: any) {
    // Extract the most useful error message from SendGrid response
    const sgErrors = error.response?.body?.errors;
    const sgErrorMsg = sgErrors?.[0]?.message ?? error.message ?? "Failed to send email";
    const fullError = `${sgErrorMsg}${error.code ? ` (code: ${error.code})` : ``}`;
    
    console.error("[EmailService] ❌ Failed to send email:", {
      error: fullError,
      code: error.code,
      response: error.response?.body,
    });
    
    // Always log failures so they appear in the Notification Center
    await logNotification({
      type: "email",
      channel: "email",
      recipient: options.to,
      subject: options.subject,
      body: `FAILED: ${fullError}`,
      status: "failed",
      metadata: { error: fullError, from: fromAddress, sgErrors },
    });
    
    return {
      success: false,
      error: fullError,
    };
  }
}

/**
 * Send bulk emails
 */
export async function sendBulkEmails(
  recipients: string[],
  options: Omit<SendEmailOptions, "to">
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  if (!isInitialized) {
    console.error("[EmailService] SendGrid not initialized");
    return {
      success: false,
      sent: 0,
      failed: recipients.length,
      errors: ["Email service not configured"],
    };
  }

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  const fromAddress = options.from || DEFAULT_FROM_EMAIL;
  const fromName = options.fromName || DEFAULT_FROM_NAME;
  const replyTo = options.replyTo || DEFAULT_REPLY_TO;
  const htmlBody = options.skipFooter ? options.html : options.html + getEmailFooter();

  console.log(`[EmailService] Sending bulk emails to ${recipients.length} recipients`);

  // Send in batches of 100 to avoid rate limits
  const batchSize = 100;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    try {
      const msg: any = {
        to: batch,
        from: { email: fromAddress, name: fromName },
        replyTo: replyTo,
        subject: options.subject,
        html: htmlBody,
      };

      if (options.attachments && options.attachments.length > 0) {
        msg.attachments = options.attachments;
      }

      await sgMail.send(msg);
      results.sent += batch.length;
      console.log(`[EmailService] ✅ Batch sent (${batch.length} emails)`);
    } catch (error: any) {
      results.failed += batch.length;
      const errorMsg = error.message || "Unknown error";
      results.errors.push(errorMsg);
      console.error(`[EmailService] ❌ Batch failed:`, errorMsg);
    }
  }

  return {
    success: results.failed === 0,
    sent: results.sent,
    failed: results.failed,
    errors: results.errors,
  };
}

/**
 * Check if email service is ready
 */
export function isEmailServiceReady(): boolean {
  return isInitialized;
}
