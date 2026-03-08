import type { Request, Response } from "express";
import { getDb } from "../seo-db";
import { inboundEmails } from "../../drizzle/seo-schema";
import { sendEmail } from "../email-service";
import { TEAM_EMAIL, FROM_EMAIL } from "../notification-routing";

/**
 * SendGrid Inbound Parse webhook handler.
 * 
 * Setup: In SendGrid dashboard → Settings → Inbound Parse, add:
 *   - Hostname: reply.lockinloans.com (or your reply domain)
 *   - URL: https://your-app-domain.com/api/webhooks/inbound-email
 *   - Check "POST the raw, full MIME message"
 * 
 * Then add a DNS MX record for reply.lockinloans.com pointing to mx.sendgrid.net
 * 
 * When a client replies to any campaign email, SendGrid will POST the parsed
 * email fields here and we store them in the inbound_emails table.
 */
export async function handleInboundEmail(req: Request, res: Response) {
  try {
    const body = req.body;

    // SendGrid Inbound Parse sends multipart/form-data
    const fromHeader = body.from || "";
    const toHeader = body.to || "";
    const subject = body.subject || "(no subject)";
    const text = body.text || "";
    const html = body.html || null;

    // Parse "Name <email>" format
    const fromEmailMatch = fromHeader.match(/<([^>]+)>/) || fromHeader.match(/([^\s]+@[^\s]+)/);
    const fromEmail = fromEmailMatch ? fromEmailMatch[1] : fromHeader;
    const fromNameMatch = fromHeader.match(/^([^<]+)</);
    const fromName = fromNameMatch ? fromNameMatch[1].trim() : null;

    // Parse to email
    const toEmailMatch = toHeader.match(/<([^>]+)>/) || toHeader.match(/([^\s]+@[^\s]+)/);
    const toEmail = toEmailMatch ? toEmailMatch[1] : toHeader;

    // Skip if it looks like a bounce or auto-reply
    if (
      subject.toLowerCase().startsWith("auto:") ||
      subject.toLowerCase().includes("out of office") ||
      subject.toLowerCase().includes("delivery status notification") ||
      fromEmail.toLowerCase().includes("mailer-daemon") ||
      fromEmail.toLowerCase().includes("postmaster")
    ) {
      console.log("[InboundEmail] Skipping auto-reply/bounce from:", fromEmail);
      return res.json({ ok: true, skipped: true });
    }

    const db = (await getDb())!;
    const [inserted] = await db.insert(inboundEmails).values({
      fromEmail,
      fromName,
      toEmail,
      subject,
      body: text,
      htmlBody: html,
      isRead: false,
      isReplied: false,
    });

    console.log(`[InboundEmail] Stored reply from ${fromEmail}: "${subject}"`);

    // Notify the loan officer via push/email that a client replied
    try {
      await sendEmail({
        to: TEAM_EMAIL,
        from: FROM_EMAIL,
        subject: `📬 Client Reply: ${subject}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#2563eb">New Client Reply</h2>
            <p><strong>From:</strong> ${fromName ? `${fromName} &lt;${fromEmail}&gt;` : fromEmail}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr style="margin:15px 0"/>
            <div style="background:#f9fafb;padding:15px;border-radius:8px">
              ${html || `<pre style="white-space:pre-wrap;font-family:Arial">${text}</pre>`}
            </div>
            <hr style="margin:15px 0"/>
            <p style="color:#6b7280;font-size:12px">
              Log in to your <a href="https://your-app-domain.com/client-inbox">Client Inbox</a> to reply directly.
            </p>
          </div>
        `,
      });
    } catch (notifyErr) {
      // Don't fail the webhook if notification fails
      console.error("[InboundEmail] Failed to notify loan officer:", notifyErr);
    }

    res.json({ ok: true, id: (inserted as any)?.insertId });
  } catch (err: any) {
    console.error("[InboundEmail] Webhook error:", err);
    res.status(500).json({ error: err.message });
  }
}
