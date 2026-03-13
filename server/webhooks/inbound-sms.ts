/**
 * Twilio Inbound SMS Webhook
 *
 * Receives incoming SMS replies from leads and:
 * 1. Matches the sender's phone number to a lead in the DB
 * 2. Finds or creates a conversation record for that lead
 * 3. Appends the inbound message to conversation_messages
 * 4. Marks the conversation as unread (for agent attention)
 *
 * Twilio must be configured to POST to: /api/twilio/inbound-sms
 */

import { Request, Response } from "express";
import mysql2 from "mysql2/promise";

async function getConn() {
  return mysql2.createConnection(process.env.DATABASE_URL!);
}

/** Normalize phone to digits-only E.164 style for matching */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export async function handleInboundSms(req: Request, res: Response) {
  // Always respond with empty TwiML immediately so Twilio doesn't retry
  const twimlOk = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

  try {
    const { From, Body, MessageSid } = req.body as {
      From?: string;
      Body?: string;
      MessageSid?: string;
    };

    if (!From || !Body) {
      console.warn("[InboundSMS] Missing From or Body — ignoring");
      return res.status(200).send(twimlOk);
    }

    const fromNorm = normalizePhone(From);
    console.log(`[InboundSMS] ${From} → "${Body.slice(0, 80)}"`);

    const conn = await getConn();
    try {
      // ── 1. Match sender phone to a lead ──────────────────────────────────
      const [leadRows] = await conn.execute(
        `SELECT l.id AS leadId, l.firstName, l.lastName, l.agencyId, l.clientId
         FROM leads l
         WHERE REGEXP_REPLACE(l.phone, '[^0-9]', '') = ?
         LIMIT 1`,
        [fromNorm]
      ) as [any[], any];

      if (!leadRows.length) {
        console.warn(`[InboundSMS] No lead found for phone ${From}`);
        return res.status(200).send(twimlOk);
      }

      const lead = leadRows[0];
      const contactName = `${lead.firstName} ${lead.lastName}`.trim();
      const agencyId = lead.agencyId || 1;

      // ── 2. Find or create conversation ───────────────────────────────────
      const [convRows] = await conn.execute(
        `SELECT id FROM conversations
         WHERE leadId = ? AND channel = 'sms' AND isArchived = 0
         LIMIT 1`,
        [lead.leadId]
      ) as [any[], any];

      let conversationId: number;

      if (convRows.length) {
        conversationId = convRows[0].id;
        // Mark as unread and bump updatedAt
        await conn.execute(
          `UPDATE conversations
           SET isRead = 0,
               unreadCount = unreadCount + 1,
               lastMessage = ?,
               lastMessageAt = NOW(),
               updatedAt = NOW()
           WHERE id = ?`,
          [Body.slice(0, 255), conversationId]
        );
      } else {
        // Create new conversation
        const [result] = await conn.execute(
          `INSERT INTO conversations
             (agencyId, leadId, contactName, channel, isRead, isStarred, isArchived,
              unreadCount, lastMessage, lastMessageAt, assignedTo, tags, createdAt, updatedAt)
           VALUES (?, ?, ?, 'sms', 0, 0, 0, 1, ?, NOW(), NULL, '[]', NOW(), NOW())`,
          [agencyId, lead.leadId, contactName, Body.slice(0, 255)]
        ) as [any, any];
        conversationId = (result as any).insertId;
      }

      // ── 3. Insert inbound message ─────────────────────────────────────────
      await conn.execute(
        `INSERT INTO conversation_messages
           (conversationId, direction, channel, body, status, twilioSid, sentAt, createdAt)
         VALUES (?, 'inbound', 'sms', ?, 'delivered', ?, NOW(), NOW())`,
        [conversationId, Body, MessageSid || null]
      );

      console.log(`[InboundSMS] Saved to conversation ${conversationId} for lead ${lead.leadId}`);
    } finally {
      await conn.end();
    }

    return res.status(200).send(twimlOk);
  } catch (err) {
    console.error("[InboundSMS] Error:", err);
    // Still return 200 so Twilio doesn't retry
    return res.status(200).send(twimlOk);
  }
}
