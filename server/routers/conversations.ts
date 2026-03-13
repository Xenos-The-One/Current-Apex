import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import mysql2 from "mysql2/promise";
import { invokeLLM } from "../_core/llm";
import { sendSMS } from "../twilio";
import twilio from "twilio";

async function getConn() {
  return mysql2.createConnection(process.env.DATABASE_URL!);
}

/** Resolve effective agencyId — falls back to client's agency when frontend passes 0 */
async function resolveAgencyId(ctx: any, inputAgencyId: number): Promise<number> {
  if (inputAgencyId > 0) return inputAgencyId;
  const conn = await getConn();
  try {
    const [rows] = await conn.execute(
      "SELECT agency_id FROM clients WHERE user_id = ? LIMIT 1",
      [ctx.user.id]
    );
    const agencyId = (rows as any[])[0]?.agency_id;
    return agencyId && agencyId > 0 ? agencyId : 1;
  } finally {
    await conn.end();
  }
}

export const conversationsRouter = router({
  /** List conversations with filters */
  list: protectedProcedure
    .input(z.object({
      agencyId: z.number().default(0),
      tab: z.enum(["all", "unread", "recents", "starred", "mine", "unassigned", "archived"]).default("all"),
      channel: z.enum(["all", "sms", "email", "call"]).default("all"),
      tag: z.string().optional(),
      search: z.string().optional(),
      assignedUserId: z.number().optional(),
      workflowStatus: z.enum(["active", "paused", "completed", "none", "all"]).default("all"),
      page: z.number().default(1),
      pageSize: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const conn = await getConn();
      try {
        const offset = (input.page - 1) * input.pageSize;
        const conditions: string[] = ["c.agencyId = ?"];
        const params: any[] = [agencyId];

        // Tab filters
        if (input.tab === "unread") {
          conditions.push("(c.isRead = 0 OR c.unreadCount > 0)");
          conditions.push("c.isArchived = 0");
        } else if (input.tab === "starred") {
          conditions.push("c.isStarred = 1");
          conditions.push("c.isArchived = 0");
        } else if (input.tab === "recents") {
          conditions.push("c.isArchived = 0");
          conditions.push("c.lastMessageAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        } else if (input.tab === "mine") {
          conditions.push("c.assignedToUserId = ?");
          params.push(ctx.user.id);
          conditions.push("c.isArchived = 0");
        } else if (input.tab === "unassigned") {
          conditions.push("c.assignedToUserId IS NULL");
          conditions.push("c.isArchived = 0");
        } else if (input.tab === "archived") {
          conditions.push("c.isArchived = 1");
        } else {
          conditions.push("c.isArchived = 0");
        }

        // Channel filter
        if (input.channel !== "all") {
          conditions.push("c.channel = ?");
          params.push(input.channel);
        }

        // Tag filter
        if (input.tag) {
          conditions.push("JSON_CONTAINS(c.tags, ?)");
          params.push(JSON.stringify(input.tag));
        }

        // Workflow status filter
        if (input.workflowStatus !== "all") {
          conditions.push("c.workflowStatus = ?");
          params.push(input.workflowStatus);
        }

        // Search
        if (input.search) {
          const s = `%${input.search}%`;
          conditions.push("(c.contactName LIKE ? OR c.contactPhone LIKE ? OR c.contactEmail LIKE ? OR c.lastMessagePreview LIKE ?)");
          params.push(s, s, s, s);
        }

        const where = conditions.join(" AND ");
        const [rows] = await conn.execute(
          `SELECT c.*,
            (SELECT COUNT(*) FROM conversation_messages cm WHERE cm.conversationId = c.id) as messageCount
           FROM conversations c
           WHERE ${where}
           ORDER BY c.lastMessageAt DESC
           LIMIT ${parseInt(String(input.pageSize))} OFFSET ${parseInt(String(offset))}`,
          params
        );
        const [countRows] = await conn.execute(
          `SELECT COUNT(*) as total FROM conversations c WHERE ${where}`,
          params
        );
        return {
          conversations: (rows as any[]).map(r => ({
            ...r,
            tags: (() => { try { return JSON.parse(r.tags || "[]"); } catch { return []; } })(),
          })),
          total: (countRows as any[])[0]?.total || 0,
          page: input.page,
          pageSize: input.pageSize,
        };
      } finally {
        await conn.end();
      }
    }),

  /** Get stats for tab badges */
  getStats: protectedProcedure
    .input(z.object({ agencyId: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const conn = await getConn();
      try {
        const [rows] = await conn.execute(
          `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN (isRead = 0 OR unreadCount > 0) AND isArchived = 0 THEN 1 ELSE 0 END) as unread,
            SUM(CASE WHEN isStarred = 1 AND isArchived = 0 THEN 1 ELSE 0 END) as starred,
            SUM(CASE WHEN channel = 'sms' AND isArchived = 0 THEN 1 ELSE 0 END) as sms,
            SUM(CASE WHEN channel = 'email' AND isArchived = 0 THEN 1 ELSE 0 END) as email,
            SUM(CASE WHEN isArchived = 1 THEN 1 ELSE 0 END) as archived,
            SUM(CASE WHEN assignedToUserId IS NULL AND isArchived = 0 THEN 1 ELSE 0 END) as unassigned,
            SUM(CASE WHEN lastMessageAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND isArchived = 0 THEN 1 ELSE 0 END) as recents
           FROM conversations WHERE agencyId = ?`,
          [agencyId]
        );
        return (rows as any[])[0] || {};
      } finally {
        await conn.end();
      }
    }),

  /** Get full conversation details */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const [rows] = await conn.execute(
          `SELECT c.*, l.first_name, l.last_name, l.status as lead_status, l.loan_type, l.source
           FROM conversations c
           LEFT JOIN leads l ON c.leadId = l.id
           WHERE c.id = ?`,
          [input.id]
        );
        const conv = (rows as any[])[0];
        if (!conv) return null;
        conv.tags = (() => { try { return JSON.parse(conv.tags || "[]"); } catch { return []; } })();
        return conv;
      } finally {
        await conn.end();
      }
    }),

  /** Get messages for a conversation */
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const offset = (input.page - 1) * input.pageSize;
        const [rows] = await conn.execute(
          `SELECT * FROM conversation_messages
           WHERE conversationId = ?
           ORDER BY createdAt ASC
           LIMIT ${parseInt(String(input.pageSize))} OFFSET ${parseInt(String(offset))}`,
          [input.conversationId]
        );
        return (rows as any[]).map(r => ({
          ...r,
          metadata: (() => { try { return r.metadata ? JSON.parse(r.metadata) : null; } catch { return null; } })(),
        }));
      } finally {
        await conn.end();
      }
    }),

  /** Send a message (SMS or email) */
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      agencyId: z.number().default(0),
      type: z.enum(["sms_out", "email_out", "note"]),
      content: z.string().min(1),
      subject: z.string().optional(),
      origin: z.string().optional(), // frontend passes window.location.origin for statusCallback
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const conn = await getConn();
      try {
        const actor = ctx.user.name || ctx.user.email || "Agent";
        // Insert the message first so we have an ID to correlate with Twilio
        const [insertResult] = await conn.execute(
          `INSERT INTO conversation_messages (conversationId, agencyId, type, subject, content, actor, direction, status, sentByUserId, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, 'outbound', 'sent', ?, NOW())`,
          [input.conversationId, agencyId, input.type, input.subject || null, input.content, actor, ctx.user.id]
        ) as [any, any];
        const messageRowId = (insertResult as any).insertId;

        // For outbound SMS, actually send via Twilio and store the MessageSid
        if (input.type === "sms_out") {
          try {
            // Fetch the contact's phone number from the conversation
            const [convRows] = await conn.execute(
              `SELECT c.contactPhone, l.phone as leadPhone
               FROM conversations c
               LEFT JOIN leads l ON c.leadId = l.id
               WHERE c.id = ? LIMIT 1`,
              [input.conversationId]
            ) as [any[], any];
            const toPhone = convRows[0]?.contactPhone || convRows[0]?.leadPhone;
            if (toPhone) {
              // Build the statusCallback URL using the origin the frontend passed,
              // falling back to the request origin header
              const origin = input.origin ||
                (ctx.req as any)?.headers?.origin ||
                process.env.VITE_FRONTEND_FORGE_API_URL?.replace('/api', '') ||
                "";
              const statusCallbackUrl = origin
                ? `${origin}/api/twilio/status-callback`
                : undefined;

              // Use Twilio client directly so we can pass statusCallback
              const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
              const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
              const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
              const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

              if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
                const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
                const msgParams: any = {
                  to: toPhone.startsWith("+") ? toPhone : `+1${toPhone.replace(/\D/g, "")}`,
                  body: input.content,
                };
                if (TWILIO_MESSAGING_SERVICE_SID) {
                  msgParams.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
                } else {
                  msgParams.from = TWILIO_PHONE_NUMBER;
                }
                if (statusCallbackUrl) {
                  msgParams.statusCallback = statusCallbackUrl;
                }
                const message = await twilioClient.messages.create(msgParams);
                // Store the Twilio MessageSid so the status callback can find this row
                await conn.execute(
                  `UPDATE conversation_messages SET externalMessageId = ? WHERE id = ?`,
                  [message.sid, messageRowId]
                );
                console.log(`[Conversations] SMS sent via Twilio: ${message.sid} (statusCallback: ${statusCallbackUrl || 'none'})`);
              } else {
                // Demo mode — use the shared sendSMS helper (fallback)
                const result = await sendSMS({ to: toPhone, body: input.content });
                if (result.messageId) {
                  await conn.execute(
                    `UPDATE conversation_messages SET externalMessageId = ? WHERE id = ?`,
                    [result.messageId, messageRowId]
                  );
                }
              }
            }
          } catch (smsErr: any) {
            // SMS send failure is non-fatal — the message is already saved locally
            console.error(`[Conversations] SMS send error for conv ${input.conversationId}:`, smsErr?.message);
          }
        }

        await conn.execute(
          `UPDATE conversations SET lastMessageAt = NOW(), lastMessagePreview = ?, isRead = 1, updatedAt = NOW() WHERE id = ?`,
          [input.content.substring(0, 120), input.conversationId]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  /** Mark conversation as read/unread */
  markRead: protectedProcedure
    .input(z.object({ id: z.number(), isRead: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        await conn.execute(
          `UPDATE conversations SET isRead = ?, unreadCount = CASE WHEN ? = 1 THEN 0 ELSE unreadCount END, updatedAt = NOW() WHERE id = ?`,
          [input.isRead ? 1 : 0, input.isRead ? 1 : 0, input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  /** Star/unstar conversation */
  toggleStar: protectedProcedure
    .input(z.object({ id: z.number(), isStarred: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        await conn.execute(
          `UPDATE conversations SET isStarred = ?, updatedAt = NOW() WHERE id = ?`,
          [input.isStarred ? 1 : 0, input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  /** Archive/unarchive conversation */
  archive: protectedProcedure
    .input(z.object({ id: z.number(), isArchived: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        await conn.execute(
          `UPDATE conversations SET isArchived = ?, updatedAt = NOW() WHERE id = ?`,
          [input.isArchived ? 1 : 0, input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  /** Update tags */
  updateTags: protectedProcedure
    .input(z.object({ id: z.number(), tags: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        await conn.execute(
          `UPDATE conversations SET tags = ?, updatedAt = NOW() WHERE id = ?`,
          [JSON.stringify(input.tags), input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  /** Assign conversation to user */
  assign: protectedProcedure
    .input(z.object({ id: z.number(), userId: z.number().nullable(), userName: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        await conn.execute(
          `UPDATE conversations SET assignedToUserId = ?, assignedToName = ?, updatedAt = NOW() WHERE id = ?`,
          [input.userId, input.userName, input.id]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  /** Bulk actions */
  bulkAction: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      action: z.enum(["markRead", "markUnread", "archive", "unarchive", "delete"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!input.ids.length) return { success: true };
      const conn = await getConn();
      try {
        const placeholders = input.ids.map(() => "?").join(",");
        if (input.action === "markRead") {
          await conn.execute(`UPDATE conversations SET isRead = 1, unreadCount = 0, updatedAt = NOW() WHERE id IN (${placeholders})`, input.ids);
        } else if (input.action === "markUnread") {
          await conn.execute(`UPDATE conversations SET isRead = 0, updatedAt = NOW() WHERE id IN (${placeholders})`, input.ids);
        } else if (input.action === "archive") {
          await conn.execute(`UPDATE conversations SET isArchived = 1, updatedAt = NOW() WHERE id IN (${placeholders})`, input.ids);
        } else if (input.action === "unarchive") {
          await conn.execute(`UPDATE conversations SET isArchived = 0, updatedAt = NOW() WHERE id IN (${placeholders})`, input.ids);
        } else if (input.action === "delete") {
          await conn.execute(`DELETE FROM conversation_messages WHERE conversationId IN (${placeholders})`, input.ids);
          await conn.execute(`DELETE FROM conversations WHERE id IN (${placeholders})`, input.ids);
        }
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  /** Create new conversation */
  create: protectedProcedure
    .input(z.object({
      agencyId: z.number().default(0),
      contactName: z.string(),
      contactPhone: z.string().optional(),
      contactEmail: z.string().optional(),
      leadId: z.number().optional(),
      channel: z.enum(["sms", "email"]),
      firstMessage: z.string(),
      subject: z.string().optional(),
      tags: z.array(z.string()).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const conn = await getConn();
      try {
        const actor = ctx.user.name || ctx.user.email || "Agent";
        const msgType = input.channel === "sms" ? "sms_out" : "email_out";
        const [result] = await conn.execute(
          `INSERT INTO conversations (agencyId, leadId, channel, contactName, contactPhone, contactEmail, lastMessageAt, lastMessagePreview, isRead, isStarred, isArchived, unreadCount, workflowStatus, assignedToUserId, assignedToName, tags, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 1, 0, 0, 0, 'none', ?, ?, ?, NOW(), NOW())`,
          [agencyId, input.leadId || null, input.channel, input.contactName, input.contactPhone || null, input.contactEmail || null,
           input.firstMessage.substring(0, 120), ctx.user.id, actor, JSON.stringify(input.tags)]
        );
        const convId = (result as any).insertId;
        await conn.execute(
          `INSERT INTO conversation_messages (conversationId, agencyId, type, subject, content, actor, direction, status, sentByUserId, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, 'outbound', 'sent', ?, NOW())`,
          [convId, agencyId, msgType, input.subject || null, input.firstMessage, actor, ctx.user.id]
        );
        return { success: true, conversationId: convId };
      } finally {
        await conn.end();
      }
    }),

  /** Get team members for assignment */
  getTeamMembers: protectedProcedure
    .input(z.object({ agencyId: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const conn = await getConn();
      try {
        const [rows] = await conn.execute(
          `SELECT id, user_id, name, email, role FROM team_members WHERE agency_id = ? AND is_active = 1 ORDER BY name ASC LIMIT 50`,
          [agencyId]
        );
        return rows as any[];
      } finally {
        await conn.end();
      }
    }),

  /** Get snippets/templates for composer */
  getSnippets: protectedProcedure
    .input(z.object({ agencyId: z.number().default(0), channel: z.enum(["sms", "email", "all"]).default("all") }))
    .query(async ({ ctx, input }) => {
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const conn = await getConn();
      try {
        const channelFilter = input.channel === "all" ? "" : "AND (type = ? OR type = 'both')";
        const params: any[] = [agencyId];
        if (input.channel !== "all") params.push(input.channel);
        const [rows] = await conn.execute(
          `SELECT id, name, subject, body, type FROM campaign_templates WHERE agency_id = ? ${channelFilter} ORDER BY name ASC LIMIT 30`,
          params
        );
        return rows as any[];
      } finally {
        await conn.end();
      }
    }),

  /** Add workflow event to conversation */
  addWorkflowEvent: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      agencyId: z.number().default(0),
      processName: z.string(),
      stepName: z.string().optional(),
      status: z.enum(["active", "paused", "completed", "failed"]),
      eventText: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const conn = await getConn();
      try {
        await conn.execute(
          `INSERT INTO conversation_messages (conversationId, agencyId, type, content, actor, direction, status, metadata, createdAt)
           VALUES (?, ?, 'workflow', ?, 'System', 'outbound', 'sent', ?, NOW())`,
          [input.conversationId, agencyId, input.eventText, JSON.stringify({ processName: input.processName, stepName: input.stepName, status: input.status })]
        );
        await conn.execute(
          `UPDATE conversations SET workflowStatus = ?, workflowName = ?, lastActivityAt = NOW(), updatedAt = NOW() WHERE id = ?`,
          [input.status, input.processName, input.conversationId]
        );
        return { success: true };
      } finally {
        await conn.end();
      }
    }),

  /** Get lead detail for the contact drawer */
  getLeadDetail: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const [rows] = await conn.execute(
          `SELECT l.id, l.firstName, l.lastName, l.email, l.phone, l.status, l.loanType, l.source,
                  l.loanAmount, l.creditScore, l.propertyType, l.city, l.state, l.notes,
                  l.createdAt, l.updatedAt,
                  (SELECT COUNT(*) FROM lead_activities la WHERE la.leadId = l.id) as activityCount,
                  (SELECT COUNT(*) FROM appointments a WHERE a.leadId = l.id) as appointmentCount
           FROM leads l WHERE l.id = ? LIMIT 1`,
          [input.leadId]
        );
        if (!(rows as any[]).length) return null;
        return (rows as any[])[0];
      } finally {
        await conn.end();
      }
    }),

  /** Search conversations — includes full-text message content search */
  search: protectedProcedure
    .input(z.object({
      agencyId: z.number().default(0),
      query: z.string().min(1),
    }))
    .query(async ({ ctx, input }) => {
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const conn = await getConn();
      try {
        const s = `%${input.query}%`;
        const [rows] = await conn.execute(
          `SELECT DISTINCT c.id, c.contactName, c.contactPhone, c.contactEmail, c.channel,
                  c.lastMessagePreview, c.lastMessageAt, c.isRead, c.isStarred, c.tags
           FROM conversations c
           LEFT JOIN conversation_messages m ON m.conversationId = c.id
           WHERE c.agencyId = ? AND c.isArchived = 0
           AND (
             c.contactName LIKE ? OR c.contactPhone LIKE ? OR c.contactEmail LIKE ?
             OR c.lastMessagePreview LIKE ? OR m.content LIKE ?
           )
           ORDER BY c.lastMessageAt DESC LIMIT 25`,
          [agencyId, s, s, s, s, s]
        );
        return (rows as any[]).map(r => ({
          ...r,
          tags: (() => { try { return JSON.parse(r.tags || "[]"); } catch { return []; } })(),
        }));
      } finally {
        await conn.end();
      }
    }),

  /** AI-suggested reply based on conversation history */
  suggestReply: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      channel: z.enum(["sms", "email"]).default("sms"),
      contactName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const conn = await getConn();
      try {
        const [msgs] = await conn.execute(
          `SELECT type, content, createdAt FROM conversation_messages
           WHERE conversationId = ? ORDER BY createdAt DESC LIMIT 10`,
          [input.conversationId]
        );
        const history = (msgs as any[]).reverse().map(m => {
          const role = m.type.endsWith("_out") || m.type === "note" ? "agent" : "contact";
          return `${role}: ${m.content}`;
        }).join("\n");

        const isEmail = input.channel === "email";
        const systemPrompt = isEmail
          ? `You are a professional mortgage loan officer assistant. Draft a concise, warm follow-up email reply (2-4 sentences) based on the conversation history. Address the contact by name if provided. Output only the body text — no subject line, no greeting header.`
          : `You are a professional mortgage loan officer assistant. Draft a concise, friendly SMS reply (1-2 sentences, under 160 characters) based on the conversation history. Be direct and action-oriented.`;

        const userPrompt = `Contact name: ${input.contactName || "the contact"}\n\nConversation history:\n${history || "(No messages yet — write a warm intro)"}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });
        const suggestion = (response as any)?.choices?.[0]?.message?.content?.trim() || "";
        return { suggestion };
      } finally {
        await conn.end();
      }
    }),
});
