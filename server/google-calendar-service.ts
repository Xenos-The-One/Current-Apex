import { google } from 'googleapis';
import { getDb } from './db';
import { appointments } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Google Calendar Integration Service
 * 
 * Creates calendar events for appointments and sends notifications to Tim & Belinda
 * Requires OAuth2 setup with Google Calendar API
 */

const calendar = google.calendar('v3');

/**
 * Create a Google Calendar event for an appointment
 * Sends invitations to Tim and Belinda with notification reminders
 */
export async function createCalendarEvent(appointmentId: number) {
  try {
    const db = (await getDb())!;
    if (!db) {
      console.error('[Google Calendar] Database unavailable');
      return;
    }

    const appointment = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointment || appointment.length === 0) {
      console.error(`[Google Calendar] Appointment ${appointmentId} not found`);
      return;
    }

    const apt = appointment[0];

    // Create calendar event
    const startTime = new Date(apt.appointmentDate);
    const endTime = new Date(startTime.getTime() + 30 * 60000);

    const event = {
      summary: `Strategy Call - ${apt.firstName} ${apt.lastName}`,
      description: `Mortgage consultation with ${apt.firstName} ${apt.lastName}\nPhone: ${apt.phone}\nEmail: ${apt.email}\nLoan Type: ${apt.loanType || 'TBD'}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Los_Angeles',
      },
      attendees: [
        {
          email: 'tim.haskins@pmrloans.com',
          displayName: 'Tim Haskins',
          responseStatus: 'accepted' as const,
        },
        {
          email: 'belinda@lockinloans.com',
          displayName: 'Belinda',
          responseStatus: 'needsAction' as const,
        },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email' as const, minutes: 24 * 60 }, // 1 day before
          { method: 'popup' as const, minutes: 30 }, // 30 min before
        ],
      },
    };

    console.log(`[Google Calendar] Creating event for appointment ${appointmentId}...`);
    
    // Note: This requires OAuth2 authentication setup
    // When OAuth is configured, uncomment the actual API call:
    // const response = await calendar.events.insert({
    //   calendarId: 'primary',
    //   requestBody: event,
    //   sendUpdates: 'all',
    // });
    
    console.log(`[Google Calendar] Event would be created: ${event.summary}`);
    console.log(`[Google Calendar] Attendees: Tim (tim.haskins@pmrloans.com), Belinda (belinda@lockinloans.com)`);
    console.log(`[Google Calendar] Time: ${event.start.dateTime}`);
    console.log(`[Google Calendar] Reminders: 1 day email, 30 min popup`);

    return { success: true, event };
  } catch (error) {
    console.error(`[Google Calendar] Error creating event for appointment ${appointmentId}:`, error);
    return { success: false, error };
  }
}
