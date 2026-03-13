/**
 * Calendar Appointment Reminders
 * Sends 24h and 1h SMS/email reminders for calendar-based appointments.
 * Uses per-calendar reminder settings (reminder_24h_enabled, reminder_1h_enabled).
 */
import { getDb } from "../db";
import { appointments } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { sendSMS } from "../twilio";
import { sendEmail } from "../email-service";
import { isTestLead } from "../test-lead-utils";

function formatDateTime(date: Date) {
  const dateStr = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { dateStr, timeStr };
}

async function sendReminder(
  appt: any,
  calName: string,
  calSlug: string | null,
  template: string | null,
  reminderType: "24h" | "1h"
) {
  const apptDate = new Date(appt.appointmentDate ?? appt.appointment_date);
  const { dateStr, timeStr } = formatDateTime(apptDate);
  const bookingLink = calSlug
    ? `\n\nNeed to reschedule? ${process.env.VITE_OAUTH_PORTAL_URL ?? ""}/book/${calSlug}`
    : "";

  const firstName = appt.firstName ?? appt.first_name ?? "there";
  const defaultMsg = template
    ? template
        .replace("{firstName}", firstName)
        .replace("{calendarName}", calName)
        .replace("{date}", dateStr)
        .replace("{time}", timeStr)
        .replace("{bookingLink}", bookingLink)
    : `Hi ${firstName}, this is a reminder about your ${calName} appointment on ${dateStr} at ${timeStr}.${bookingLink}`;

  const smsBody = defaultMsg;
  const emailSubject = reminderType === "24h"
    ? `Reminder: Your appointment tomorrow at ${timeStr}`
    : `Your appointment is in 1 hour — ${timeStr} today`;
  const emailHtml = `<p>Hi ${firstName},</p><p>${smsBody.replace(/\n/g, "<br>")}</p>`;

  const phone = appt.phone;
  const email = appt.email;
  if (phone) {
    await sendSMS({ to: phone, body: smsBody }).catch(e =>
      console.error(`[CalReminder] SMS failed for appt ${appt.id}:`, e.message)
    );
  }
  if (email) {
    await sendEmail({ to: email, subject: emailSubject, html: emailHtml }).catch(e =>
      console.error(`[CalReminder] Email failed for appt ${appt.id}:`, e.message)
    );
  }
  console.log(`[CalReminder] ${reminderType} reminder sent to ${firstName} for appt ${appt.id}`);
}

export async function sendCalendar24hReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  const target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowStart = new Date(target.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(target.getTime() + 30 * 60 * 1000);

  const rows = await db.execute(sql`
    SELECT a.id, a.first_name, a.last_name, a.email, a.phone,
           a.appointment_date, a.status,
           cr.name AS cal_name, cr.slug AS cal_slug,
           cr.reminder_24h_enabled, cr.reminder_message_template
    FROM appointments a
    LEFT JOIN calendar_resources cr ON cr.id = a.calendar_id
    WHERE a.appointment_date BETWEEN ${windowStart} AND ${windowEnd}
      AND a.status IN ('scheduled', 'confirmed', 'unconfirmed')
      AND (a.reminder_sent_24h IS NULL OR a.reminder_sent_24h = FALSE)
      AND (cr.reminder_24h_enabled IS NULL OR cr.reminder_24h_enabled = TRUE)
    LIMIT 50
  `) as any[];

  console.log(`[CalReminder] 24h window: ${rows.length} appointments to remind`);
  for (const row of rows) {
    if (isTestLead({ email: row.email ?? "", phone: row.phone ?? "" })) {
      await db.update(appointments).set({ reminderSent24h: true } as any).where(eq(appointments.id, row.id));
      continue;
    }
    await sendReminder(row, row.cal_name ?? "Calendar", row.cal_slug ?? null, row.reminder_message_template ?? null, "24h");
    await db.update(appointments).set({ reminderSent24h: true } as any).where(eq(appointments.id, row.id));
  }
}

export async function sendCalendar1hReminders(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  const target = new Date(now.getTime() + 60 * 60 * 1000);
  const windowStart = new Date(target.getTime() - 10 * 60 * 1000);
  const windowEnd = new Date(target.getTime() + 10 * 60 * 1000);

  const rows = await db.execute(sql`
    SELECT a.id, a.first_name, a.last_name, a.email, a.phone,
           a.appointment_date, a.status,
           cr.name AS cal_name, cr.slug AS cal_slug,
           cr.reminder_1h_enabled, cr.reminder_message_template
    FROM appointments a
    LEFT JOIN calendar_resources cr ON cr.id = a.calendar_id
    WHERE a.appointment_date BETWEEN ${windowStart} AND ${windowEnd}
      AND a.status IN ('scheduled', 'confirmed', 'unconfirmed')
      AND (a.reminder_sent_1h IS NULL OR a.reminder_sent_1h = FALSE)
      AND (cr.reminder_1h_enabled IS NULL OR cr.reminder_1h_enabled = TRUE)
    LIMIT 50
  `) as any[];

  console.log(`[CalReminder] 1h window: ${rows.length} appointments to remind`);
  for (const row of rows) {
    if (isTestLead({ email: row.email ?? "", phone: row.phone ?? "" })) {
      await db.update(appointments).set({ reminderSent1h: true } as any).where(eq(appointments.id, row.id));
      continue;
    }
    await sendReminder(row, row.cal_name ?? "Calendar", row.cal_slug ?? null, row.reminder_message_template ?? null, "1h");
    await db.update(appointments).set({ reminderSent1h: true } as any).where(eq(appointments.id, row.id));
  }
}
