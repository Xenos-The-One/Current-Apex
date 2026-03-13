import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

/** Resolve the effective agencyId — falls back to client's agency when frontend passes 0 */
async function resolveAgencyId(ctx: any, inputAgencyId: number): Promise<number> {
  if (inputAgencyId > 0) return inputAgencyId;
  const db = await getDb();
  if (!db) return 1;
  const [rows] = await (db as any).execute(
    "SELECT agency_id FROM clients WHERE user_id = ? LIMIT 1",
    [ctx.user.id]
  );
  const agencyId = (rows as any[])[0]?.agency_id;
  return agencyId && agencyId > 0 ? agencyId : 1;
}

export const conversationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        agencyId: z.number(),
        channel: z.string().optional(),
        isRead: z.boolean().optional(),
        isArchived: z.boolean().optional(),
        search: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);

      let query = `
        SELECT c.*, 
          l.first_name, l.last_name, l.status as lead_status, l.loan_type,
          (SELECT COUNT(*) FROM conversation_messages cm WHERE cm.conversationId = c.id) as message_count
        FROM conversations c
        LEFT JOIN leads l ON c.leadId = l.id
        WHERE c.agencyId = ?
      `;
      const params: any[] = [agencyId];

      if (input.channel) {
        query += " AND c.channel = ?";
        params.push(input.channel);
      }
      if (input.isRead !== undefined) {
        query += " AND c.isRead = ?";
        params.push(input.isRead ? 1 : 0);
      }
      if (input.isArchived !== undefined) {
        query += " AND c.isArchived = ?";
        params.push(input.isArchived ? 1 : 0);
      } else {
        query += " AND c.isArchived = 0";
      }
      if (input.search) {
        query += " AND (c.contactName LIKE ? OR c.contactEmail LIKE ? OR c.contactPhone LIKE ? OR c.lastMessagePreview LIKE ?)";
        const s = `%${input.search}%`;
        params.push(s, s, s, s);
      }

      query += " ORDER BY c.lastMessageAt DESC LIMIT ? OFFSET ?";
      params.push(input.limit, input.offset);

      const [rows] = await (db as any).execute(query, params);
      return rows as any[];
    }),

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        agencyId: z.number(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);

      const [rows] = await (db as any).execute(
        `SELECT * FROM conversation_messages WHERE conversationId = ? AND agencyId = ? ORDER BY createdAt ASC LIMIT ?`,
        [input.conversationId, agencyId, input.limit]
      );
      return rows as any[];
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        agencyId: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);

      const [result] = await (db as any).execute(
        `INSERT INTO conversation_messages (conversationId, agencyId, direction, content, status, sentByUserId, createdAt) VALUES (?, ?, 'outbound', ?, 'sent', ?, NOW())`,
        [input.conversationId, agencyId, input.content, ctx.user.id]
      );

      await (db as any).execute(
        `UPDATE conversations SET lastMessageAt = NOW(), lastMessagePreview = ?, updatedAt = NOW() WHERE id = ? AND agencyId = ?`,
        [input.content.slice(0, 200), input.conversationId, agencyId]
      );

      return { id: (result as any).insertId };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      await (db as any).execute(
        `UPDATE conversations SET isRead = 1, updatedAt = NOW() WHERE id = ? AND agencyId = ?`,
        [input.id, agencyId]
      );
      return { success: true };
    }),

  markUnread: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      await (db as any).execute(
        `UPDATE conversations SET isRead = 0, updatedAt = NOW() WHERE id = ? AND agencyId = ?`,
        [input.id, agencyId]
      );
      return { success: true };
    }),

  archive: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      await (db as any).execute(
        `UPDATE conversations SET isArchived = 1, updatedAt = NOW() WHERE id = ? AND agencyId = ?`,
        [input.id, agencyId]
      );
      return { success: true };
    }),

  create: protectedProcedure
    .input(
      z.object({
        agencyId: z.number(),
        leadId: z.number().optional(),
        channel: z.enum(["sms", "email", "facebook", "instagram", "whatsapp"]),
        contactName: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);

      const [result] = await (db as any).execute(
        `INSERT INTO conversations (agencyId, leadId, channel, contactName, contactPhone, contactEmail, lastMessageAt, isRead, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), 0, 0, NOW(), NOW())`,
        [
          agencyId,
          input.leadId || null,
          input.channel,
          input.contactName || null,
          input.contactPhone || null,
          input.contactEmail || null,
        ]
      );
      return { id: (result as any).insertId };
    }),

  getStats: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);

      const [rows] = await (db as any).execute(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN isRead = 0 AND isArchived = 0 THEN 1 ELSE 0 END) as unread,
          SUM(CASE WHEN channel = 'sms' AND isArchived = 0 THEN 1 ELSE 0 END) as sms,
          SUM(CASE WHEN channel = 'email' AND isArchived = 0 THEN 1 ELSE 0 END) as email,
          SUM(CASE WHEN isArchived = 1 THEN 1 ELSE 0 END) as archived
        FROM conversations WHERE agencyId = ?`,
        [agencyId]
      );
      return (rows as any[])[0];
    }),

  markAllRead: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      await (db as any).execute(
        `UPDATE conversations SET isRead = 1, updatedAt = NOW() WHERE agencyId = ? AND isRead = 0 AND isArchived = 0`,
        [agencyId]
      );
      return { success: true };
    }),

  assignConversation: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      assignedToUserId: z.number().nullable(),
      assignedToName: z.string().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      await (db as any).execute(
        `UPDATE conversations SET assignedToUserId = ?, assignedToName = ?, updatedAt = NOW() WHERE id = ? AND agencyId = ?`,
        [input.assignedToUserId, input.assignedToName, input.id, agencyId]
      );
      return { success: true };
    }),

  getTeamMembers: protectedProcedure
    .input(z.object({ agencyId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const [rows] = await (db as any).execute(
        `SELECT id, user_id, name, email, role FROM team_members WHERE agency_id = ? AND is_active = 1 ORDER BY name ASC LIMIT 50`,
        [agencyId]
      );
      return rows as { id: number; user_id: number | null; name: string; email: string; role: string }[];
    }),

  updateTags: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      tags: z.array(z.string()).max(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      await (db as any).execute(
        `UPDATE conversations SET tags = ?, updatedAt = NOW() WHERE id = ? AND agencyId = ?`,
        [JSON.stringify(input.tags), input.id, agencyId]
      );
      return { success: true };
    }),

  bulkAction: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1).max(200),
      agencyId: z.number(),
      action: z.enum(["markRead", "markUnread", "archive"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await resolveAgencyId(ctx, input.agencyId);
      const placeholders = input.ids.map(() => "?").join(",");
      if (input.action === "markRead") {
        await (db as any).execute(
          `UPDATE conversations SET isRead = 1, updatedAt = NOW() WHERE id IN (${placeholders}) AND agencyId = ?`,
          [...input.ids, agencyId]
        );
      } else if (input.action === "markUnread") {
        await (db as any).execute(
          `UPDATE conversations SET isRead = 0, updatedAt = NOW() WHERE id IN (${placeholders}) AND agencyId = ?`,
          [...input.ids, agencyId]
        );
      } else if (input.action === "archive") {
        await (db as any).execute(
          `UPDATE conversations SET isArchived = 1, updatedAt = NOW() WHERE id IN (${placeholders}) AND agencyId = ?`,
          [...input.ids, agencyId]
        );
      }
      return { success: true, count: input.ids.length };
    }),
});
