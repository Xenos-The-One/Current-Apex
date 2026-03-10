import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import mysql from "mysql2/promise";

/**
 * Agency Config Router
 * Reads/writes key-value pairs in the `agency_settings` table.
 * Used for storing integration credentials (e.g. Facebook Page Access Token)
 * directly from the CRM Settings UI without needing the Manus console.
 */

async function getConn() {
  return mysql.createConnection(process.env.DATABASE_URL!);
}

export const agencyConfigRouter = router({
  /**
   * Get a single setting value by key
   */
  get: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const conn = await getConn();
      try {
        const [rows] = await conn.query<mysql.RowDataPacket[]>(
          "SELECT settingValue FROM agency_settings WHERE settingKey = ? LIMIT 1",
          [input.key]
        );
        return { value: (rows[0]?.settingValue as string) ?? null };
      } finally {
        await conn.end().catch(() => {});
      }
    }),

  /**
   * Save (upsert) a setting value by key
   */
  set: adminProcedure
    .input(z.object({ key: z.string().min(1), value: z.string() }))
    .mutation(async ({ input }) => {
      const conn = await getConn();
      try {
        await conn.query(
          `INSERT INTO agency_settings (settingKey, settingValue, updatedAt)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE settingValue = VALUES(settingValue), updatedAt = NOW()`,
          [input.key, input.value]
        );
        return { success: true };
      } finally {
        await conn.end().catch(() => {});
      }
    }),
});
