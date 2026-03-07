import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { appointments } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const appointmentsRouter = router({
  list: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      userId: z.number().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      status: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(appointments.agencyId, input.agencyId)];
      if (input.userId) conditions.push(eq(appointments.userId, input.userId));
      if (input.status) conditions.push(eq(appointments.status, input.status as any));
      if (input.startDate) conditions.push(gte(appointments.startAt, input.startDate));
      if (input.endDate) conditions.push(lte(appointments.startAt, input.endDate));
      return db.select().from(appointments).where(and(...conditions)).orderBy(appointments.startAt).limit(input.limit);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [appt] = await db.select().from(appointments)
        .where(and(eq(appointments.id, input.id), eq(appointments.agencyId, input.agencyId))).limit(1);
      if (!appt) throw new TRPCError({ code: "NOT_FOUND" });
      return appt;
    }),

  create: protectedProcedure
    .input(z.object({
      agencyId: z.number(),
      leadId: z.number().optional(),
      borrowerId: z.number().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      type: z.enum(["consultation", "follow_up", "closing", "review", "call", "meeting", "other"]).default("consultation"),
      startAt: z.date(),
      endAt: z.date(),
      timezone: z.string().default("America/New_York"),
      location: z.string().optional(),
      meetingUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(appointments).values({ ...input, userId: ctx.user.id, status: "scheduled" });
      return { id: (result as any).insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      agencyId: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show", "rescheduled"]).optional(),
      startAt: z.date().optional(),
      endAt: z.date().optional(),
      location: z.string().optional(),
      meetingUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, agencyId, ...rest } = input;
      await db.update(appointments).set(rest).where(and(eq(appointments.id, id), eq(appointments.agencyId, agencyId)));
      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(appointments).set({ status: "cancelled" }).where(and(eq(appointments.id, input.id), eq(appointments.agencyId, input.agencyId)));
      return { success: true };
    }),

  upcoming: protectedProcedure
    .input(z.object({ agencyId: z.number(), userId: z.number().optional(), limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(appointments.agencyId, input.agencyId), gte(appointments.startAt, new Date())];
      if (input.userId) conditions.push(eq(appointments.userId, input.userId));
      return db.select().from(appointments).where(and(...conditions)).orderBy(appointments.startAt).limit(input.limit);
    }),
});
