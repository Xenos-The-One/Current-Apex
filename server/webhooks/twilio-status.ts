/**
 * Twilio SMS Status Callback Webhook
 *
 * Twilio POSTs delivery status updates here for every outbound SMS that was
 * sent with a `statusCallback` URL.  We update the `status` column on the
 * matching `conversation_messages` row so the UI can show:
 *   sent → queued → delivered → read (if supported by carrier)
 *   sent → failed / undelivered  (on error)
 *
 * Twilio status values we care about:
 *   queued, sending, sent, delivered, undelivered, failed, read
 *
 * POST /api/twilio/status-callback
 */
import { Request, Response } from "express";
import mysql2 from "mysql2/promise";

async function getConn() {
  return mysql2.createConnection(process.env.DATABASE_URL!);
}

/** Map Twilio MessageStatus → our DB enum */
function mapStatus(twilioStatus: string): "sent" | "delivered" | "read" | "failed" {
  switch (twilioStatus) {
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "failed":
    case "undelivered":
      return "failed";
    default:
      // queued / sending / sent → keep as "sent"
      return "sent";
  }
}

export async function handleTwilioStatusCallback(req: Request, res: Response) {
  // Always respond 204 immediately so Twilio doesn't retry
  res.status(204).end();

  try {
    const { MessageSid, MessageStatus, SmsStatus } = req.body as {
      MessageSid?: string;
      MessageStatus?: string;
      SmsStatus?: string;      // older Twilio field, same values
    };

    const rawStatus = MessageStatus || SmsStatus;
    if (!MessageSid || !rawStatus) {
      console.warn("[TwilioStatus] Missing MessageSid or status — ignoring");
      return;
    }

    const dbStatus = mapStatus(rawStatus);

    // Only update when the status is meaningful (skip "queued"/"sending"/"sent" → "sent" no-op)
    const conn = await getConn();
    try {
      const [result] = await conn.execute(
        `UPDATE conversation_messages
         SET status = ?
         WHERE externalMessageId = ?
           AND type IN ('sms_out')
           AND (
             ? = 'failed'
             OR (? = 'delivered' AND status = 'sent')
             OR (? = 'read'      AND status IN ('sent','delivered'))
           )`,
        [dbStatus, MessageSid, dbStatus, dbStatus, dbStatus]
      ) as [any, any];

      if ((result as any).affectedRows > 0) {
        console.log(`[TwilioStatus] ${MessageSid} → ${rawStatus} (db: ${dbStatus})`);
      }
    } finally {
      await conn.end();
    }
  } catch (err) {
    console.error("[TwilioStatus] Error processing callback:", err);
  }
}
