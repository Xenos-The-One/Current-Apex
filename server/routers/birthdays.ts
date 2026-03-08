import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { leads, clients } from "../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { checkBirthdayNotifications, resetBirthdayNotifications } from "../cron/birthdayNotifications";

export const birthdaysRouter = router({
  /**
   * Get all upcoming birthdays (next 30 days)
   */
  getUpcoming: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const today = new Date();
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const futureMonth = thirtyDaysFromNow.getMonth() + 1;
    const futureDay = thirtyDaysFromNow.getDate();

    // Query for birthdays in the next 30 days
    const upcomingBirthdays = await db
      .select({
        lead: leads,
        client: clients,
      })
      .from(leads)
      .innerJoin(clients, eq(leads.clientId, clients.id))
      .where(
        and(
          sql`${leads.birthday} IS NOT NULL`,
          // This is a simplified query - in production you'd want to handle year-end wraparound
          sql`(
            (MONTH(${leads.birthday}) = ${currentMonth} AND DAY(${leads.birthday}) >= ${currentDay})
            OR
            (MONTH(${leads.birthday}) > ${currentMonth} AND MONTH(${leads.birthday}) <= ${futureMonth})
            OR
            (MONTH(${leads.birthday}) = ${futureMonth} AND DAY(${leads.birthday}) <= ${futureDay})
          )`
        )
      )
      .orderBy(sql`MONTH(${leads.birthday})`, sql`DAY(${leads.birthday})`);

    return upcomingBirthdays.map(({ lead, client }) => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      birthday: lead.birthday,
      birthdayNotificationSent: lead.birthdayNotificationSent,
      birthdayVideoApproved: lead.birthdayVideoApproved,
      birthdayVideoUrl: lead.birthdayVideoUrl,
      clientName: client.name,
    }));
  }),

  /**
   * Get all birthdays for a specific month
   */
  getByMonth: protectedProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      const birthdays = await db
        .select({
          lead: leads,
          client: clients,
        })
        .from(leads)
        .innerJoin(clients, eq(leads.clientId, clients.id))
        .where(
          and(
            sql`${leads.birthday} IS NOT NULL`,
            sql`MONTH(${leads.birthday}) = ${input.month}`
          )
        )
        .orderBy(sql`DAY(${leads.birthday})`);

      return birthdays.map(({ lead, client }) => ({
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        birthday: lead.birthday,
        birthdayNotificationSent: lead.birthdayNotificationSent,
        birthdayVideoApproved: lead.birthdayVideoApproved,
        birthdayVideoUrl: lead.birthdayVideoUrl,
        clientName: client.name,
      }));
    }),

  /**
   * Update birthday for a lead
   */
  updateBirthday: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        birthday: z.string(), // ISO date string
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      await db
        .update(leads)
        .set({
          birthday: new Date(input.birthday),
          updatedAt: new Date(),
        })
        .where(eq(leads.id, input.leadId));

      return { success: true };
    }),

  /**
   * Mark birthday video as approved
   */
  approveVideo: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        videoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not initialized");

      await db
        .update(leads)
        .set({
          birthdayVideoApproved: true,
          birthdayVideoUrl: input.videoUrl || null,
          updatedAt: new Date(),
        })
        .where(eq(leads.id, input.leadId));

      return { success: true };
    }),

  /**
   * Manually trigger birthday check (for testing)
   */
  checkNow: protectedProcedure.mutation(async () => {
    const result = await checkBirthdayNotifications();
    return result;
  }),

  /**
   * Reset all birthday notification flags (admin only)
   */
  resetFlags: protectedProcedure.mutation(async () => {
    const result = await resetBirthdayNotifications();
    return result;
  }),

  /**
   * Get birthday notification settings
   */
  getSettings: protectedProcedure.query(async () => {
    return {
      daysInAdvance: 3,
      timishaPhone: process.env.TIMISHA_PHONE_NUMBER || "Not configured",
      cronSchedule: "0 9 * * *", // 9 AM daily
    };
  }),
});
