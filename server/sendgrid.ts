import sgMail from "@sendgrid/mail";
import { logNotification } from "./notification-logger";

export interface EmailParams {
  to: string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string; // Base64 encoded content
    filename: string;
    type?: string; // MIME type
    disposition?: string; // 'attachment' or 'inline'
  }>;
}

export async function sendEmail(params: EmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
  demo?: boolean;
}> {
  // Read API key dynamically each time (not at module load)
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const DEMO_MODE = !SENDGRID_API_KEY;

  if (DEMO_MODE) {
    console.log("[SendGrid DEMO] Would send email:", {
      to: params.to.length + " recipients",
      subject: params.subject,
      from: params.from,
    });
    
    const demoId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await logNotification({
      type: "email",
      channel: "email",
      recipient: params.to.join(", "),
      subject: params.subject,
      body: params.text || (params.html ? params.html.replace(/<[^>]+>/g, " ").slice(0, 500) : undefined),
      status: "sent",
      metadata: { demo: true, from: params.from },
    });
    return {
      success: true,
      messageId: demoId,
      demo: true,
    };
  }

  try {
    // Set API key before sending
    sgMail.setApiKey(SENDGRID_API_KEY!);
    
    const msg: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.html) {
      msg.html = params.html;
    }
    if (params.text) {
      msg.text = params.text;
    }
    if (params.attachments) {
      msg.attachments = params.attachments;
    }

    console.log("[SendGrid] Sending email to:", params.to, "from:", params.from);
    const response = await sgMail.send(msg);
    const msgId = response[0].headers["x-message-id"] as string;
    console.log("[SendGrid] Email sent successfully. Message ID:", msgId);
    await logNotification({
      type: "email",
      channel: "email",
      recipient: params.to.join(", "),
      subject: params.subject,
      body: params.text || (params.html ? params.html.replace(/<[^>]+>/g, " ").slice(0, 500) : undefined),
      status: "sent",
      metadata: { messageId: msgId, from: params.from },
    });
    return {
      success: true,
      messageId: msgId,
    };
  } catch (error: any) {
    console.error("[SendGrid] Error sending email:", error.message || error);
    await logNotification({
      type: "email",
      channel: "email",
      recipient: params.to.join(", "),
      subject: params.subject,
      status: "failed",
      metadata: { error: error.message, from: params.from },
    });
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

export async function sendBulkEmail(params: EmailParams): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}> {
  // Read API key dynamically each time
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const DEMO_MODE = !SENDGRID_API_KEY;

  if (DEMO_MODE) {
    console.log("[SendGrid DEMO] Would send bulk email:", {
      recipients: params.to.length,
      subject: params.subject,
      from: params.from,
    });
    
    return {
      success: true,
      sent: params.to.length,
      failed: 0,
      errors: [],
    };
  }

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Set API key before sending
  sgMail.setApiKey(SENDGRID_API_KEY!);

  // Send in batches of 1000 (SendGrid limit)
  const batchSize = 1000;
  for (let i = 0; i < params.to.length; i += batchSize) {
    const batch = params.to.slice(i, i + batchSize);
    
    try {
      const batchMsg: any = {
        to: batch,
        from: params.from,
        subject: params.subject,
      };
      
      if (params.html) {
        batchMsg.html = params.html;
      }
      if (params.text) {
        batchMsg.text = params.text;
      }
      
      await sgMail.send(batchMsg);
      
      results.sent += batch.length;
    } catch (error: any) {
      results.failed += batch.length;
      results.errors.push(error.message || "Unknown error");
    }
  }

  return {
    success: results.failed === 0,
    sent: results.sent,
    failed: results.failed,
    errors: results.errors.length > 0 ? results.errors : undefined,
  };
}

export function isDemoMode(): boolean {
  return !process.env.SENDGRID_API_KEY;
}
