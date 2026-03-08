import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { documents } from "../../drizzle/schema";
import { getDb } from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

export const documentsRouter = router({
  list: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      borrowerId: z.number().optional(),
      leadId: z.number().optional(),
      type: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(documents.agencyId, input.agencyId)];
      if (input.borrowerId) conditions.push(eq(documents.borrowerId, input.borrowerId));
      if (input.leadId) conditions.push(eq(documents.leadId, input.leadId));
      if (input.type) conditions.push(eq(documents.type, input.type as any));
      return db.select().from(documents).where(and(...conditions)).orderBy(desc(documents.createdAt));
    }),

  upload: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      borrowerId: z.number().optional(),
      leadId: z.number().optional(),
      name: z.string().min(1),
      type: z.enum(["application", "pay_stub", "tax_return", "bank_statement", "id_document", "insurance", "appraisal", "title", "other"]).default("other"),
      mimeType: z.string().optional(),
      fileSize: z.number().optional(),
      base64Data: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const suffix = nanoid(8);
      const ext = input.name.split(".").pop() || "bin";
      const fileKey = `agency-${input.agencyId}/docs/${suffix}.${ext}`;
      const buffer = Buffer.from(input.base64Data, "base64");
      const { url } = await storagePut(fileKey, buffer, input.mimeType || "application/octet-stream");
      const [result] = await db.insert(documents).values({
        agencyId: input.agencyId,
        borrowerId: input.borrowerId,
        leadId: input.leadId,
        uploadedByUserId: ctx.user.id,
        name: input.name,
        type: input.type,
        fileKey,
        fileUrl: url,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        notes: input.notes,
      });
      return { id: (result as any).insertId, url };
    }),

  generateShareLink: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const token = nanoid(32);
      await db.update(documents).set({
        .where(and(eq(documents.id, input.id), eq(documents.agencyId, input.agencyId)));
      return { shareToken: token };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(documents).where(and(eq(documents.id, input.id), eq(documents.agencyId, input.agencyId)));
      return { success: true };
    }),
});
