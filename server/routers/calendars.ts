import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { calendarResources, appointments, agencies } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, asc, like, or, isNull, sql } from "drizzle-orm";
import { z } from "zod";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAgencyId(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const rows = await db.select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.ownerId, userId))
    .limit(1);
  if (rows.length > 0) return rows[0].id;
  // Fallback: use first agency for admin/platform users
  const all = await db.select({ id: agencies.id }).from(agencies).limit(1);
  if (all.length > 0) return all[0].id;
  throw new TRPCError({ code: "NOT_FOUND", message: "No agency found" });
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const appointmentInput = z.object({
  title: z.string().min(1, "Title is required"),
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().default(""),
  contactName: z.string().optional(),
  calendarId: z.number().optional(),
  calendarName: z.string().optional(),
  appointmentDate: z.date(),
  endTime: z.date().optional(),
  duration: z.number().default(30),
  meetingType: z.enum(["in_person", "phone", "video"]).default("phone"),
  location: z.string().optional(),
  timezone: z.string().default("America/New_York"),
  status: z.enum(["scheduled", "confirmed", "unconfirmed", "completed", "cancelled", "no_show", "no_answer", "busy"]).default("unconfirmed"),
  notes: z.string().optional(),
  assignedUserId: z.number().optional(),
  assignedUserName: z.string().optional(),
  source: z.string().optional(),
  appointmentType: z.enum(["consultation", "application", "closing", "follow_up"]).default("consultation"),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const calendarsRouter = router({

  // ── Calendar CRUD ──────────────────────────────────────────────────────────

  listCalendars: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const agencyId = await getAgencyId(ctx.user.id);
    const cals = await db.select()
      .from(calendarResources)
      .where(and(eq(calendarResources.agencyId, agencyId), eq(calendarResources.isActive, true)))
      .orderBy(asc(calendarResources.name));
    return cals;
  }),

  createCalendar: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      color: z.string().default("#3B82F6"),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);
      const result = await db.insert(calendarResources).values({
        agencyId,
        name: input.name,
        color: input.color,
        description: input.description,
        isActive: true,
      });
      return { id: Number((result as any).insertId), ...input };
    }),

  updateCalendar: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      color: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);
      await db.update(calendarResources)
        .set({ name: input.name, color: input.color, description: input.description })
        .where(and(eq(calendarResources.id, input.id), eq(calendarResources.agencyId, agencyId)));
      return { success: true };
    }),

  deleteCalendar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);
      await db.update(calendarResources)
        .set({ isActive: false })
        .where(and(eq(calendarResources.id, input.id), eq(calendarResources.agencyId, agencyId)));
      return { success: true };
    }),

  // ── Appointments CRUD ──────────────────────────────────────────────────────

  listAppointments: protectedProcedure
    .input(z.object({
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      status: z.string().optional(),
      calendarId: z.number().optional(),
      assignedUserId: z.number().optional(),
      meetingType: z.string().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(100),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);

      const conditions = [eq(appointments.agencyId, agencyId)];

      if (input.startDate) conditions.push(gte(appointments.appointmentDate, input.startDate));
      if (input.endDate) conditions.push(lte(appointments.appointmentDate, input.endDate));
      if (input.status && input.status !== "all") {
        conditions.push(eq(appointments.status, input.status as any));
      }
      if (input.calendarId) {
        conditions.push(eq(appointments.calendarId as any, input.calendarId));
      }
      if (input.assignedUserId) {
        conditions.push(eq(appointments.assignedUserId as any, input.assignedUserId));
      }
      if (input.meetingType) {
        conditions.push(eq(appointments.meetingType as any, input.meetingType as any));
      }

      const offset = (input.page - 1) * input.pageSize;
      const rows = await db.select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(asc(appointments.appointmentDate))
        .limit(input.pageSize)
        .offset(offset);

      return rows;
    }),

  getAppointment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);
      const rows = await db.select()
        .from(appointments)
        .where(and(eq(appointments.id, input.id), eq(appointments.agencyId, agencyId)))
        .limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });
      return rows[0];
    }),

  createAppointment: protectedProcedure
    .input(appointmentInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);

      // Calculate endTime if not provided
      const startTime = input.appointmentDate;
      const endTime = input.endTime || new Date(startTime.getTime() + input.duration * 60 * 1000);

      const result = await db.insert(appointments).values({
        agencyId,
        title: input.title,
        firstName: input.firstName || (input.contactName?.split(" ")[0] ?? ""),
        lastName: input.lastName || (input.contactName?.split(" ").slice(1).join(" ") ?? ""),
        email: input.email || "",
        phone: input.phone || "",
        calendarId: input.calendarId,
        calendarName: input.calendarName,
        appointmentDate: startTime,
        endTime,
        duration: input.duration,
        appointmentType: input.appointmentType,
        meetingType: input.meetingType,
        location: input.location,
        timezone: input.timezone,
        status: input.status,
        notes: input.notes,
        assignedUserId: input.assignedUserId,
        assignedUserName: input.assignedUserName,
        source: input.source,
        assignedTo: "loan_officer",
      } as any);

      const id = Number((result as any).insertId);
      return { id, success: true };
    }),

  updateAppointment: protectedProcedure
    .input(appointmentInput.extend({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);

      const endTime = input.endTime || new Date(input.appointmentDate.getTime() + input.duration * 60 * 1000);

      await db.update(appointments).set({
        title: input.title,
        firstName: input.firstName || (input.contactName?.split(" ")[0] ?? ""),
        lastName: input.lastName || (input.contactName?.split(" ").slice(1).join(" ") ?? ""),
        email: input.email || "",
        phone: input.phone || "",
        calendarId: input.calendarId,
        calendarName: input.calendarName,
        appointmentDate: input.appointmentDate,
        endTime,
        duration: input.duration,
        appointmentType: input.appointmentType,
        meetingType: input.meetingType,
        location: input.location,
        timezone: input.timezone,
        status: input.status,
        notes: input.notes,
        assignedUserId: input.assignedUserId,
        assignedUserName: input.assignedUserName,
        source: input.source,
      } as any).where(and(eq(appointments.id, input.id), eq(appointments.agencyId, agencyId)));

      return { success: true };
    }),

  deleteAppointment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);
      await db.delete(appointments)
        .where(and(eq(appointments.id, input.id), eq(appointments.agencyId, agencyId)));
      return { success: true };
    }),

  // ── Status Actions ─────────────────────────────────────────────────────────

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["scheduled", "confirmed", "unconfirmed", "completed", "cancelled", "no_show", "no_answer", "busy"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);
      await db.update(appointments)
        .set({ status: input.status as any })
        .where(and(eq(appointments.id, input.id), eq(appointments.agencyId, agencyId)));
      return { success: true };
    }),

  reschedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      newDate: z.date(),
      newEndTime: z.date().optional(),
      duration: z.number().optional(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);

      const endTime = input.newEndTime || new Date(input.newDate.getTime() + (input.duration ?? 30) * 60 * 1000);

      await db.update(appointments).set({
        appointmentDate: input.newDate,
        endTime,
        duration: input.duration,
        status: "confirmed" as any,
      } as any).where(and(eq(appointments.id, input.id), eq(appointments.agencyId, agencyId)));

      return { success: true };
    }),

  updateNotes: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const agencyId = await getAgencyId(ctx.user.id);
      await db.update(appointments)
        .set({ notes: input.notes })
        .where(and(eq(appointments.id, input.id), eq(appointments.agencyId, agencyId)));
      return { success: true };
    }),

  // ── Seed Data ──────────────────────────────────────────────────────────────

  seedCalendarData: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const agencyId = await getAgencyId(ctx.user.id);

    // Check if already seeded
    const existing = await db.select({ id: calendarResources.id })
      .from(calendarResources)
      .where(eq(calendarResources.agencyId, agencyId))
      .limit(1);
    if (existing.length > 0) {
      return { message: "Calendar data already seeded", skipped: true };
    }

    // Create 5 calendars
    const calendarData = [
      { name: "Main Calendar", color: "#3B82F6", description: "Primary agency calendar" },
      { name: "Sales Calendar", color: "#10B981", description: "Sales team appointments" },
      { name: "Loan Officer Calendar", color: "#8B5CF6", description: "Loan officer consultations" },
      { name: "Booking Calendar", color: "#F59E0B", description: "Client bookings" },
      { name: "Admin Calendar", color: "#EF4444", description: "Admin and internal meetings" },
    ];

    const calIds: number[] = [];
    for (const cal of calendarData) {
      const r = await db.insert(calendarResources).values({ agencyId, ...cal, isActive: true });
      calIds.push(Number((r as any).insertId));
    }

    // Team members for assignment
    const teamMembers = [
      { id: 1, name: "John Moreno" },
      { id: 2, name: "Sarah Chen" },
      { id: 3, name: "Marcus Williams" },
      { id: 4, name: "Priya Patel" },
      { id: 5, name: "Derek Thompson" },
    ];

    const contacts = [
      { first: "Robert", last: "Johnson", email: "rjohnson@email.com", phone: "555-0101" },
      { first: "Maria", last: "Garcia", email: "mgarcia@email.com", phone: "555-0102" },
      { first: "James", last: "Wilson", email: "jwilson@email.com", phone: "555-0103" },
      { first: "Linda", last: "Martinez", email: "lmartinez@email.com", phone: "555-0104" },
      { first: "David", last: "Anderson", email: "danderson@email.com", phone: "555-0105" },
      { first: "Patricia", last: "Taylor", email: "ptaylor@email.com", phone: "555-0106" },
      { first: "Michael", last: "Thomas", email: "mthomas@email.com", phone: "555-0107" },
      { first: "Barbara", last: "Jackson", email: "bjackson@email.com", phone: "555-0108" },
      { first: "Christopher", last: "White", email: "cwhite@email.com", phone: "555-0109" },
      { first: "Susan", last: "Harris", email: "sharris@email.com", phone: "555-0110" },
      { first: "Kevin", last: "Brown", email: "kbrown@email.com", phone: "555-0111" },
      { first: "Nancy", last: "Davis", email: "ndavis@email.com", phone: "555-0112" },
    ];

    const statuses: Array<"confirmed" | "unconfirmed" | "completed" | "cancelled" | "no_show"> = [
      "confirmed", "confirmed", "confirmed", "unconfirmed", "unconfirmed",
      "completed", "completed", "cancelled", "no_show", "confirmed",
    ];

    const meetingTypes: Array<"in_person" | "phone" | "video"> = ["phone", "video", "in_person"];
    const appointmentTypes: Array<"consultation" | "application" | "closing" | "follow_up"> = [
      "consultation", "application", "closing", "follow_up"
    ];
    const titles = [
      "Initial Consultation", "Loan Application Review", "Pre-Approval Discussion",
      "Rate Lock Consultation", "Closing Preparation", "Follow-Up Call",
      "Document Review", "Strategy Session", "Refinance Consultation", "Purchase Consultation",
    ];
    const locations = [
      "123 Main St, Suite 100", "Video Call - Zoom", "Phone Call",
      "456 Oak Ave, Office 2B", "Client's Home", "Coffee Shop - 789 Elm St",
    ];

    const now = new Date();
    const appointmentsToInsert = [];

    // Create 50 appointments spread across past 30 days and future 30 days
    for (let i = 0; i < 50; i++) {
      const daysOffset = Math.floor(Math.random() * 60) - 30; // -30 to +30 days
      const hour = 8 + Math.floor(Math.random() * 10); // 8am to 6pm
      const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];

      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() + daysOffset);
      startDate.setHours(hour, minute, 0, 0);

      const duration = [30, 45, 60, 90][Math.floor(Math.random() * 4)];
      const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

      const contact = contacts[i % contacts.length];
      const team = teamMembers[i % teamMembers.length];
      const calId = calIds[i % calIds.length];
      const calName = calendarData[i % calendarData.length].name;
      const status = statuses[i % statuses.length];
      const meetingType = meetingTypes[i % meetingTypes.length];
      const apptType = appointmentTypes[i % appointmentTypes.length];
      const title = titles[i % titles.length];
      const location = locations[i % locations.length];

      // Past appointments should be completed or no_show, not unconfirmed
      const finalStatus = daysOffset < -1
        ? (["completed", "completed", "no_show", "cancelled"][i % 4] as any)
        : status;

      appointmentsToInsert.push({
        agencyId,
        title,
        firstName: contact.first,
        lastName: contact.last,
        email: contact.email,
        phone: contact.phone,
        calendarId: calId,
        calendarName: calName,
        appointmentDate: startDate,
        endTime: endDate,
        duration,
        appointmentType: apptType,
        meetingType,
        location,
        timezone: "America/New_York",
        status: finalStatus,
        notes: i % 3 === 0 ? `Client is interested in ${apptType.replace("_", " ")}. Referred by ${contacts[(i + 1) % contacts.length].first} ${contacts[(i + 1) % contacts.length].last}.` : null,
        assignedUserId: team.id,
        assignedUserName: team.name,
        source: ["Facebook Ad", "Instagram", "Referral", "Website", "Cold Call"][i % 5],
        assignedTo: "loan_officer" as any,
      });
    }

    // Insert in batches of 10
    for (let i = 0; i < appointmentsToInsert.length; i += 10) {
      await db.insert(appointments).values(appointmentsToInsert.slice(i, i + 10) as any);
    }

    return {
      message: "Calendar data seeded successfully",
      calendars: calIds.length,
      appointments: appointmentsToInsert.length,
    };
  }),
});
