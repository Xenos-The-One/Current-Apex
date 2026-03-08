/**
 * Appointment Reminder Cron Job
 * 
 * Runs every hour to check for upcoming appointments and send SMS reminders:
 * - 24 hours before appointment
 * - 2 hours before appointment
 */

import { getDb } from "../db";
import { appointments } from "../../drizzle/schema";
import { sendAppointmentReminder } from "../sms";
import { sendEmail } from "../sendgrid";
import { getAppointmentReminderEmail } from "../email-templates-appointments";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { isTestLead, logTestLeadSuppression } from "../test-lead-utils";

export async function sendAppointmentReminders() {
  console.log("[Reminders] Checking for upcoming appointments...");

  const now = new Date();
  
  // Check for appointments 24 hours from now (±30 min window)
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twentyFourHourWindow = {
    start: new Date(twentyFourHoursFromNow.getTime() - 30 * 60 * 1000),
    end: new Date(twentyFourHoursFromNow.getTime() + 30 * 60 * 1000),
  };

  // Check for appointments 2 hours from now (±15 min window)
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twoHourWindow = {
    start: new Date(twoHoursFromNow.getTime() - 15 * 60 * 1000),
    end: new Date(twoHoursFromNow.getTime() + 15 * 60 * 1000),
  };

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Reminders] Database not available");
      return;
    }

    // Find appointments needing 24-hour reminders
    const appointmentsFor24h = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, twentyFourHourWindow.start),
          lte(appointments.appointmentDate, twentyFourHourWindow.end),
          eq(appointments.status, "scheduled" as any),
          sql`${appointments.reminderSent24h} = false`
        )
      );

    // Find appointments needing 2-hour reminders
    const appointmentsFor2h = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, twoHourWindow.start),
          lte(appointments.appointmentDate, twoHourWindow.end),
          eq(appointments.status, "scheduled" as any),
          sql`${appointments.reminderSent2h} = false`
        )
      );

    console.log(`[Reminders] Found ${appointmentsFor24h.length} appointments for 24h reminders`);
    console.log(`[Reminders] Found ${appointmentsFor2h.length} appointments for 2h reminders`);

    // Send 24-hour reminders
    for (const appointment of appointmentsFor24h) {
      // Skip all comms for test leads
      if (isTestLead({ email: appointment.email, phone: appointment.phone })) {
        logTestLeadSuppression("all", { email: appointment.email, phone: appointment.phone, firstName: appointment.firstName, lastName: appointment.lastName }, "24h-reminder");
        await db.update(appointments).set({ reminderSent24h: true }).where(eq(appointments.id, appointment.id));
        continue;
      }
      // Try SMS first (will fail if Twilio not verified)
      const smsResult = await sendAppointmentReminder({
        to: appointment.phone,
        customerName: appointment.firstName,
        appointmentDate: new Date(appointment.appointmentDate),
        hoursUntil: 24,
      });

      // Always send email reminder
      if (appointment.email) {
        try {
          const reminderHtml = getAppointmentReminderEmail({
            firstName: appointment.firstName,
            lastName: appointment.lastName,
            appointmentDate: new Date(appointment.appointmentDate),
            duration: appointment.duration || 30,
            hoursUntil: 24,
          });

          await sendEmail({
            to: [appointment.email],
            from: process.env.FROM_EMAIL || 'noreply@lockinloans.com',
            subject: `Reminder: Appointment Tomorrow`,
            html: reminderHtml,
          });

          console.log(`[Reminders] Sent 24h email reminder to ${appointment.email}`);
        } catch (emailError) {
          console.error(`[Reminders] Failed to send 24h email reminder:`, emailError);
        }
      }

      // Mark reminder as sent if either SMS or email succeeded
      if (smsResult.success || appointment.email) {
        await db
          .update(appointments)
          .set({ reminderSent24h: true })
          .where(eq(appointments.id, appointment.id));
        
        console.log(`[Reminders] Sent 24h reminder to ${appointment.firstName} ${appointment.lastName}`);
      } else {
        console.error(`[Reminders] Failed to send 24h reminder to ${appointment.phone}:`, smsResult.error);
      }
    }

    // Send 2-hour reminders
    for (const appointment of appointmentsFor2h) {
      // Skip all comms for test leads
      if (isTestLead({ email: appointment.email, phone: appointment.phone })) {
        logTestLeadSuppression("all", { email: appointment.email, phone: appointment.phone, firstName: appointment.firstName, lastName: appointment.lastName }, "2h-reminder");
        await db.update(appointments).set({ reminderSent2h: true }).where(eq(appointments.id, appointment.id));
        continue;
      }
      // Try SMS first (will fail if Twilio not verified)
      const smsResult = await sendAppointmentReminder({
        to: appointment.phone,
        customerName: appointment.firstName,
        appointmentDate: new Date(appointment.appointmentDate),
        hoursUntil: 2,
      });

      // Always send email reminder
      if (appointment.email) {
        try {
          const reminderHtml = getAppointmentReminderEmail({
            firstName: appointment.firstName,
            lastName: appointment.lastName,
            appointmentDate: new Date(appointment.appointmentDate),
            duration: appointment.duration || 30,
            hoursUntil: 2,
          });

          await sendEmail({
            to: [appointment.email],
            from: process.env.FROM_EMAIL || 'noreply@lockinloans.com',
            subject: `Reminder: Appointment in 2 Hours`,
            html: reminderHtml,
          });

          console.log(`[Reminders] Sent 2h email reminder to ${appointment.email}`);
        } catch (emailError) {
          console.error(`[Reminders] Failed to send 2h email reminder:`, emailError);
        }
      }

      // Mark reminder as sent if either SMS or email succeeded
      if (smsResult.success || appointment.email) {
        await db
          .update(appointments)
          .set({ reminderSent2h: true })
          .where(eq(appointments.id, appointment.id));
        
        console.log(`[Reminders] Sent 2h reminder to ${appointment.firstName} ${appointment.lastName}`);
      } else {
        console.error(`[Reminders] Failed to send 2h reminder to ${appointment.phone}:`, smsResult.error);
      }
    }

    console.log("[Reminders] Reminder job completed successfully");
  } catch (error) {
    console.error("[Reminders] Error in reminder job:", error);
  }
}

// Run the job every hour
setInterval(sendAppointmentReminders, 60 * 60 * 1000);

// Run immediately on startup
sendAppointmentReminders();
