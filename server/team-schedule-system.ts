import { getDb } from "./db";
import { weeklySchedules, leads, appointments, leadActivities } from "../drizzle/schema";
import { sendEmail } from "./sendgrid";
import { invokeLLM } from "./_core/llm";
import { eq, gte, lte, and, sql, count } from "drizzle-orm";
import { TARIQ_EMAIL, TEAM_EMAIL, FROM_EMAIL } from "./notification-routing";

/**
 * Team Schedule System
 * 
 * - Sunday afternoon: Email Tim asking for his weekly availability
 * - Mon-Fri morning (8 AM PST): Daily stats + schedule to team
 * - Mon-Fri evening (6 PM PST): End-of-day recap to team
 * - When Tim replies with schedule: parse and store in DB, update Vapi knowledge
 */

// Tim's email and phone
const TIM_EMAIL = TEAM_EMAIL; // haskinstim57@gmail.com
const TIM_NAME = "Tim Haskins";

/**
 * Send Sunday schedule request to Tim
 * Runs every Sunday at 2 PM PST
 */
export async function sendWeeklyScheduleRequest() {
  console.log('[Schedule] Sending weekly schedule request to Tim...');
  
  const db = await getDb();
  if (!db) {
    console.error('[Schedule] Database not available');
    return;
  }

  // Calculate next Monday
  const now = new Date();
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const weekOfDate = nextMonday.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const fridayDate = new Date(nextMonday);
  fridayDate.setDate(fridayDate.getDate() + 4);
  const fridayStr = fridayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  // Create a pending schedule record
  await db.insert(weeklySchedules).values({
    weekStartDate: nextMonday,
    status: 'pending',
  });

  // Get last week's stats for context
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  const [leadCount] = await db.select({ count: count() }).from(leads)
    .where(gte(leads.createdAt, lastWeekStart));
  
  const [apptCount] = await db.select({ count: count() }).from(appointments)
    .where(gte(appointments.createdAt, lastWeekStart));

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Weekly Schedule Request</h2>
      <p>Hey ${TIM_NAME},</p>
      
      <p>Hope you had a great weekend! I need your availability for the upcoming week (<strong>${weekOfDate} - ${fridayStr}</strong>) so Sarah (our AI assistant) can book consultations at the right times.</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Last Week's Quick Stats:</h3>
        <ul style="color: #4b5563;">
          <li><strong>${leadCount?.count || 0}</strong> new leads came in</li>
          <li><strong>${apptCount?.count || 0}</strong> appointments were booked</li>
        </ul>
      </div>

      <p><strong>Please reply with your availability for each day this week.</strong></p>
      <p>Example format:</p>
      <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #1e40af;">
          Monday: 9am - 5pm<br>
          Tuesday: 10am - 3pm<br>
          Wednesday: Off<br>
          Thursday: 9am - 12pm, 2pm - 5pm<br>
          Friday: 9am - 4pm
        </p>
      </div>

      <p style="margin-top: 20px;">If you don't reply by Monday morning, Sarah will use your default schedule (Mon-Fri, 9 AM - 5 PM).</p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        — Sterling Marketing AI Operations<br>
        <em>This is an automated message from your CRM system.</em>
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: [TIM_EMAIL],
      from: FROM_EMAIL,
      subject: `📅 Schedule Request: Week of ${weekOfDate}`,
      html,
    });
    console.log('[Schedule] Weekly schedule request sent to Tim');
    
    // Also notify Tariq
    await sendEmail({
      to: [TARIQ_EMAIL],
      from: FROM_EMAIL,
      subject: `[System] Schedule request sent to Tim for week of ${weekOfDate}`,
      html: `<p>FYI: Weekly schedule request has been sent to Tim. If he doesn't reply by Monday morning, default hours (Mon-Fri 9-5) will be used.</p>`,
    });
  } catch (error) {
    console.error('[Schedule] Failed to send schedule request:', error);
  }
}

/**
 * Morning Stats Email
 * Runs Mon-Fri at 8 AM PST
 */
export async function sendMorningStats() {
  console.log('[Schedule] Sending morning stats...');
  
  const db = await getDb();
  if (!db) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Get yesterday's stats
  const [yesterdayLeads] = await db.select({ count: count() }).from(leads)
    .where(and(gte(leads.createdAt, yesterday), lte(leads.createdAt, today)));

  const [yesterdayAppts] = await db.select({ count: count() }).from(appointments)
    .where(and(gte(appointments.createdAt, yesterday), lte(appointments.createdAt, today)));

  const [todayAppts] = await db.select({ count: count() }).from(appointments)
    .where(and(
      gte(appointments.appointmentDate, today),
      lte(appointments.appointmentDate, new Date(today.getTime() + 24 * 60 * 60 * 1000))
    ));

  // Get today's scheduled appointments with details
  const todayAppointments = await db.select().from(appointments)
    .where(and(
      gte(appointments.appointmentDate, today),
      lte(appointments.appointmentDate, new Date(today.getTime() + 24 * 60 * 60 * 1000)),
      eq(appointments.status, 'scheduled')
    ));

  // Get hot leads
  const hotLeads = await db.select().from(leads)
    .where(eq(leads.scoreTier, 'hot'));

  const dayName = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  let appointmentList = '';
  if (todayAppointments.length > 0) {
    appointmentList = todayAppointments.map(a => 
      `<tr>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.firstName} ${a.lastName}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.appointmentDate ? new Date(a.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.phone || 'N/A'}</td>
        <td style="padding: 8px; border: 1px solid #e5e7eb;">${a.appointmentType || 'Consultation'}</td>
      </tr>`
    ).join('');
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">☀️ Good Morning Team — ${dayName}</h2>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Yesterday's Numbers:</h3>
        <table style="width: 100%;">
          <tr>
            <td><strong>New Leads:</strong></td>
            <td style="text-align: right; font-size: 24px; color: #2563eb;">${yesterdayLeads?.count || 0}</td>
          </tr>
          <tr>
            <td><strong>Appointments Booked:</strong></td>
            <td style="text-align: right; font-size: 24px; color: #16a34a;">${yesterdayAppts?.count || 0}</td>
          </tr>
          <tr>
            <td><strong>Hot Leads in Pipeline:</strong></td>
            <td style="text-align: right; font-size: 24px; color: #dc2626;">${hotLeads?.length || 0}</td>
          </tr>
        </table>
      </div>

      <h3>📅 Today's Appointments (${todayAppts?.count || 0}):</h3>
      ${todayAppointments.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 8px; text-align: left;">Name</th>
              <th style="padding: 8px; text-align: left;">Time</th>
              <th style="padding: 8px; text-align: left;">Phone</th>
              <th style="padding: 8px; text-align: left;">Type</th>
            </tr>
          </thead>
          <tbody>${appointmentList}</tbody>
        </table>
      ` : '<p style="color: #6b7280;">No appointments scheduled for today.</p>'}

      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        — Sterling Marketing AI Operations
      </p>
    </div>
  `;

  try {
    // Send to team email (leads/appointments)
    await sendEmail({
      to: [TIM_EMAIL],
      from: FROM_EMAIL,
      subject: `☀️ Morning Briefing — ${dayName} | ${todayAppts?.count || 0} Appointments Today`,
      html,
    });

    // Also send to Tariq
    await sendEmail({
      to: [TARIQ_EMAIL],
      from: FROM_EMAIL,
      subject: `☀️ Morning Briefing — ${dayName} | ${todayAppts?.count || 0} Appointments Today`,
      html,
    });

    console.log('[Schedule] Morning stats sent');
  } catch (error) {
    console.error('[Schedule] Failed to send morning stats:', error);
  }
}

/**
 * Evening Recap Email
 * Runs Mon-Fri at 6 PM PST
 */
export async function sendEveningRecap() {
  console.log('[Schedule] Sending evening recap...');
  
  const db = await getDb();
  if (!db) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's stats
  const [todayLeads] = await db.select({ count: count() }).from(leads)
    .where(and(gte(leads.createdAt, today), lte(leads.createdAt, tomorrow)));

  const [todayAppts] = await db.select({ count: count() }).from(appointments)
    .where(and(gte(appointments.createdAt, today), lte(appointments.createdAt, tomorrow)));

  const [completedAppts] = await db.select({ count: count() }).from(appointments)
    .where(and(
      gte(appointments.appointmentDate, today),
      lte(appointments.appointmentDate, tomorrow),
      eq(appointments.status, 'completed')
    ));

  const [noShowAppts] = await db.select({ count: count() }).from(appointments)
    .where(and(
      gte(appointments.appointmentDate, today),
      lte(appointments.appointmentDate, tomorrow),
      eq(appointments.status, 'no_show')
    ));

  // Tomorrow's appointments
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  
  const [tomorrowApptCount] = await db.select({ count: count() }).from(appointments)
    .where(and(
      gte(appointments.appointmentDate, tomorrow),
      lte(appointments.appointmentDate, tomorrowEnd),
      eq(appointments.status, 'scheduled')
    ));

  // Today's calls
  const [callCount] = await db.select({ count: count() }).from(leadActivities)
    .where(and(
      gte(leadActivities.createdAt, today),
      eq(leadActivities.activityType, 'call')
    ));

  const dayName = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">🌙 End of Day Recap — ${dayName}</h2>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Today's Results:</h3>
        <table style="width: 100%;">
          <tr>
            <td><strong>New Leads:</strong></td>
            <td style="text-align: right; font-size: 20px; color: #2563eb;">${todayLeads?.count || 0}</td>
          </tr>
          <tr>
            <td><strong>Appointments Booked:</strong></td>
            <td style="text-align: right; font-size: 20px; color: #16a34a;">${todayAppts?.count || 0}</td>
          </tr>
          <tr>
            <td><strong>Appointments Completed:</strong></td>
            <td style="text-align: right; font-size: 20px; color: #16a34a;">${completedAppts?.count || 0}</td>
          </tr>
          <tr>
            <td><strong>No-Shows:</strong></td>
            <td style="text-align: right; font-size: 20px; color: #dc2626;">${noShowAppts?.count || 0}</td>
          </tr>
          <tr>
            <td><strong>AI Calls Made:</strong></td>
            <td style="text-align: right; font-size: 20px; color: #7c3aed;">${callCount?.count || 0}</td>
          </tr>
        </table>
      </div>

      <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; margin: 15px 0;">
        <h3 style="margin: 0 0 10px 0;">📅 Tomorrow's Preview:</h3>
        <p style="margin: 0;"><strong>${tomorrowApptCount?.count || 0}</strong> appointments scheduled for tomorrow.</p>
      </div>

      <p style="color: #6b7280;">Great work today, team! Get some rest and we'll hit it again tomorrow.</p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        — Sterling Marketing AI Operations
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: [TIM_EMAIL],
      from: FROM_EMAIL,
      subject: `🌙 EOD Recap — ${dayName} | ${todayLeads?.count || 0} Leads, ${todayAppts?.count || 0} Appointments`,
      html,
    });

    await sendEmail({
      to: [TARIQ_EMAIL],
      from: FROM_EMAIL,
      subject: `🌙 EOD Recap — ${dayName} | ${todayLeads?.count || 0} Leads, ${todayAppts?.count || 0} Appointments`,
      html,
    });

    console.log('[Schedule] Evening recap sent');
  } catch (error) {
    console.error('[Schedule] Failed to send evening recap:', error);
  }
}

/**
 * Parse Tim's schedule reply and store in DB
 * Called when Tim replies to the schedule request email
 */
export async function parseAndStoreSchedule(rawResponse: string): Promise<boolean> {
  console.log('[Schedule] Parsing Tim\'s schedule response...');
  
  const db = await getDb();
  if (!db) return false;

  try {
    // Use LLM to parse the natural language schedule
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You parse schedule availability text into structured JSON. Extract the availability for each day of the week. Return JSON only, no explanation.

Format:
{
  "monday": {"start": "09:00", "end": "17:00"} or null if off,
  "tuesday": {"start": "10:00", "end": "15:00"} or null,
  "wednesday": null,
  "thursday": [{"start": "09:00", "end": "12:00"}, {"start": "14:00", "end": "17:00"}],
  "friday": {"start": "09:00", "end": "16:00"},
  "saturday": null,
  "sunday": null
}

For split schedules (e.g., "9am-12pm, 2pm-5pm"), use an array of objects.
Use 24-hour format for times.
If a day is not mentioned, assume null (off).`
        },
        { role: "user", content: rawResponse }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "weekly_schedule",
          strict: true,
          schema: {
            type: "object",
            properties: {
              monday: { type: ["object", "null"] },
              tuesday: { type: ["object", "null"] },
              wednesday: { type: ["object", "null"] },
              thursday: { type: ["object", "null"] },
              friday: { type: ["object", "null"] },
              saturday: { type: ["object", "null"] },
              sunday: { type: ["object", "null"] },
            },
            required: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[Schedule] LLM returned empty response');
      return false;
    }

    const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

    // Find the most recent pending schedule
    const [pendingSchedule] = await db.select().from(weeklySchedules)
      .where(eq(weeklySchedules.status, 'pending'))
      .orderBy(sql`created_at DESC`)
      .limit(1);

    if (pendingSchedule) {
      await db.update(weeklySchedules)
        .set({
          mondaySlots: parsed.monday ? JSON.stringify(parsed.monday) : null,
          tuesdaySlots: parsed.tuesday ? JSON.stringify(parsed.tuesday) : null,
          wednesdaySlots: parsed.wednesday ? JSON.stringify(parsed.wednesday) : null,
          thursdaySlots: parsed.thursday ? JSON.stringify(parsed.thursday) : null,
          fridaySlots: parsed.friday ? JSON.stringify(parsed.friday) : null,
          saturdaySlots: parsed.saturday ? JSON.stringify(parsed.saturday) : null,
          sundaySlots: parsed.sunday ? JSON.stringify(parsed.sunday) : null,
          rawResponse,
          status: 'confirmed',
        })
        .where(eq(weeklySchedules.id, pendingSchedule.id));
    }

    // Notify Tariq that schedule was received
    await sendEmail({
      to: [TARIQ_EMAIL],
      from: FROM_EMAIL,
      subject: `✅ Tim's schedule received and updated`,
      html: `<p>Tim replied with his schedule. Sarah (Vapi) will now book appointments within these hours:</p><pre>${JSON.stringify(parsed, null, 2)}</pre>`,
    });

    console.log('[Schedule] Schedule parsed and stored successfully');
    return true;
  } catch (error) {
    console.error('[Schedule] Failed to parse schedule:', error);
    return false;
  }
}

/**
 * Get current week's schedule for Vapi
 * Returns available slots based on Tim's confirmed schedule
 */
export async function getCurrentWeekSchedule(): Promise<any> {
  const db = await getDb();
  if (!db) return getDefaultSchedule();

  try {
    const [schedule] = await db.select().from(weeklySchedules)
      .where(eq(weeklySchedules.status, 'confirmed'))
      .orderBy(sql`week_start_date DESC`)
      .limit(1);

    if (!schedule) return getDefaultSchedule();

    return {
      monday: schedule.mondaySlots ? JSON.parse(schedule.mondaySlots) : null,
      tuesday: schedule.tuesdaySlots ? JSON.parse(schedule.tuesdaySlots) : null,
      wednesday: schedule.wednesdaySlots ? JSON.parse(schedule.wednesdaySlots) : null,
      thursday: schedule.thursdaySlots ? JSON.parse(schedule.thursdaySlots) : null,
      friday: schedule.fridaySlots ? JSON.parse(schedule.fridaySlots) : null,
      saturday: schedule.saturdaySlots ? JSON.parse(schedule.saturdaySlots) : null,
      sunday: schedule.sundaySlots ? JSON.parse(schedule.sundaySlots) : null,
    };
  } catch (error) {
    console.error('[Schedule] Error getting current schedule:', error);
    return getDefaultSchedule();
  }
}

function getDefaultSchedule() {
  return {
    monday: { start: "09:00", end: "17:00" },
    tuesday: { start: "09:00", end: "17:00" },
    wednesday: { start: "09:00", end: "17:00" },
    thursday: { start: "09:00", end: "17:00" },
    friday: { start: "09:00", end: "17:00" },
    saturday: null,
    sunday: null,
  };
}
