/**
 * SEO Portal Email Module
 * Stub that wraps the CRM's existing SendGrid email service
 */

export interface SendClientReportParams {
  toEmail: string;
  toName: string;
  clientName: string;
  reportHtml: string;
  agencyName?: string;
  reportDate?: string;
}

/**
 * Send a branded SEO report email to a client.
 * Uses the CRM's SendGrid integration.
 */
export interface SendPortalInvitationParams {
  toEmail: string;
  toName: string;
  clientName: string;
  inviteUrl: string;
  agencyName?: string;
}

export async function sendPortalInvitationEmail(
  params: SendPortalInvitationParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const sgMail = await import("@sendgrid/mail");
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return { success: false, error: "SENDGRID_API_KEY not configured" };
    }
    sgMail.default.setApiKey(apiKey);

    const agencyName = params.agencyName || "Sterling Marketing";
    const msg = {
      to: params.toEmail,
      from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
      subject: `${agencyName} - Client Portal Invitation for ${params.clientName}`,
      html: `<h2>Welcome to ${agencyName} Client Portal</h2><p>Hi ${params.toName},</p><p>You've been invited to access the client portal for ${params.clientName}.</p><p><a href="${params.inviteUrl}" style="background:#0070f3;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Accept Invitation</a></p><p>This link will expire in 7 days.</p>`,
    };

    const [response] = await sgMail.default.send(msg);
    return {
      success: true,
      messageId: response?.headers?.["x-message-id"] as string | undefined,
    };
  } catch (error: any) {
    console.error("[SEO Email] Failed to send invitation:", error?.message);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}

export async function sendClientReportEmail(
  params: SendClientReportParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const sgMail = await import("@sendgrid/mail");
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return { success: false, error: "SENDGRID_API_KEY not configured" };
    }
    sgMail.default.setApiKey(apiKey);

    const agencyName = params.agencyName || "Sterling Marketing";
    const reportDate = params.reportDate || new Date().toLocaleDateString();

    const msg = {
      to: params.toEmail,
      from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
      subject: `${agencyName} - SEO Report for ${params.clientName} (${reportDate})`,
      html: params.reportHtml,
    };

    const [response] = await sgMail.default.send(msg);
    return {
      success: true,
      messageId: response?.headers?.["x-message-id"] as string | undefined,
    };
  } catch (error: any) {
    console.error("[SEO Email] Failed to send report:", error?.message);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}
