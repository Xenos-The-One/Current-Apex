/**
 * Appointment Coordination Agent
 * 
 * Manages the entire appointment lifecycle:
 * - Reminders (24hr, 1hr before)
 * - Rescheduling
 * - No-show follow-up
 * - Post-appointment follow-up
 */

import { getDb } from '../db';
import { appointments, leads } from '../../drizzle/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { smsCommandSystem } from './sms-command-system';
import { sendSMS } from '../twilio';
import { sendEmail } from '../email-service';
import { isTestLead, logTestLeadSuppression } from '../test-lead-utils';

export class AppointmentCoordinationAgent {
  /**
   * Send 24-hour reminder
   */
  async send24HourReminders(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get appointments 24 hours from now (+/- 30 minutes)
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(twentyFourHoursFromNow.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(twentyFourHoursFromNow.getTime() + 30 * 60 * 1000);
    
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, windowStart),
          lte(appointments.appointmentDate, windowEnd),
          sql`${appointments.status} IN ('scheduled', 'confirmed', 'unconfirmed')`,
          eq(appointments.reminderSent24h, false)
        )
      );
    
    console.log(`[Appointment Coordination] Sending 24-hour reminders for ${upcomingAppointments.length} appointments`);
    
    for (const appt of upcomingAppointments) {
      // Skip test leads
      if (isTestLead({ email: appt.email, phone: appt.phone })) {
        logTestLeadSuppression("all", { email: appt.email, phone: appt.phone, firstName: appt.firstName, lastName: appt.lastName }, "24h-coord-reminder");
        await db.update(appointments).set({ reminderSent24h: true }).where(eq(appointments.id, appt.id));
        continue;
      }
      try {
        const apptDate = new Date(appt.appointmentDate);
        const dateStr = apptDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        const timeStr = apptDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        // Send SMS
        if (appt.phone) {
          const smsMessage = `Hi ${appt.firstName}, this is a reminder about your consultation with Tim tomorrow (${dateStr}) at ${timeStr}. Need to reschedule? Reply to this message or call ${process.env.TIMISHA_PHONE_NUMBER}.`;
          await sendSMS({ to: appt.phone, body: smsMessage });
        }
        
        // Send email
        if (appt.email) {
          await sendEmail({
            to: appt.email,
            subject: `Reminder: Your consultation tomorrow at ${timeStr}`,
            html: `Hi ${appt.firstName},<br><br>This is a friendly reminder about your mortgage consultation with Tim Haskins tomorrow:<br><br>📅 ${dateStr}<br>🕐 ${timeStr}<br>📍 Virtual (Zoom link will be sent 1 hour before)<br><br>If you need to reschedule, please reply to this email or call ${process.env.TIMISHA_PHONE_NUMBER}.<br><br>Looking forward to speaking with you!<br><br>Best,<br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
          });
        }
        
        // Mark as reminded
        await db
          .update(appointments)
          .set({ reminderSent24h: true })
          .where(eq(appointments.id, appt.id));
        
      } catch (error) {
        console.error(`[Appointment Coordination] Error sending 24-hour reminder for appointment ${appt.id}:`, error);
      }
    }
  }
  
  /**
   * Send 1-hour reminder
   */
  async send1HourReminders(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get appointments 1 hour from now (+/- 5 minutes)
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const windowStart = new Date(oneHourFromNow.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(oneHourFromNow.getTime() + 5 * 60 * 1000);
    
    const upcomingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, windowStart),
          lte(appointments.appointmentDate, windowEnd),
          sql`${appointments.status} IN ('scheduled', 'confirmed', 'unconfirmed')`,
          eq(appointments.reminderSent2h, false)
        )
      );
    
    console.log(`[Appointment Coordination] Sending 1-hour reminders for ${upcomingAppointments.length} appointments`);
    
    for (const appt of upcomingAppointments) {
      // Skip test leads
      if (isTestLead({ email: appt.email, phone: appt.phone })) {
        logTestLeadSuppression("all", { email: appt.email, phone: appt.phone, firstName: appt.firstName, lastName: appt.lastName }, "1h-coord-reminder");
        await db.update(appointments).set({ reminderSent2h: true }).where(eq(appointments.id, appt.id));
        continue;
      }
      try {
        const apptDate = new Date(appt.appointmentDate);
        const timeStr = apptDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        // Send SMS with meeting link
        if (appt.phone) {
          const smsMessage = `Hi ${appt.firstName}, your consultation with Tim starts in 1 hour (${timeStr}). See you soon!`;
          await sendSMS({ to: appt.phone, body: smsMessage });
        }
        
        // Mark as reminded
        await db
          .update(appointments)
          .set({ reminderSent2h: true })
          .where(eq(appointments.id, appt.id));
        
      } catch (error) {
        console.error(`[Appointment Coordination] Error sending 1-hour reminder for appointment ${appt.id}:`, error);
      }
    }
  }
  
  /**
   * Check for no-shows and follow up
   */
  async handleNoShows(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get appointments that were scheduled but didn't show (15 minutes past appointment time)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const noShows = await db
      .select()
      .from(appointments)
      .where(
        and(
          lte(appointments.appointmentDate, fifteenMinutesAgo),
          sql`${appointments.status} IN ('scheduled', 'confirmed', 'unconfirmed')` // Still open, not shown
        )
      );
    
    console.log(`[Appointment Coordination] Processing ${noShows.length} no-shows`);
    
    for (const appt of noShows) {
      // Skip test leads (still mark as no-show in DB but don't send comms)
      if (isTestLead({ email: appt.email, phone: appt.phone })) {
        logTestLeadSuppression("all", { email: appt.email, phone: appt.phone, firstName: appt.firstName, lastName: appt.lastName }, "no-show-coord");
        await db.update(appointments).set({ status: 'no_show' }).where(eq(appointments.id, appt.id));
        continue;
      }
      try {
        // Mark as no-show
        await db
          .update(appointments)
          .set({ status: 'no_show' })
          .where(eq(appointments.id, appt.id));
        
        const bookingUrl = `${process.env.VITE_APP_URL || ''}/book/tim`;
        
        // Send follow-up SMS
        if (appt.phone) {
          const smsMessage = `Hi ${appt.firstName}, I noticed we missed our appointment today. No worries! Life happens. Want to reschedule? Book here: ${bookingUrl}`;
          await sendSMS({ to: appt.phone, body: smsMessage });
        }
        
        // Send follow-up email
        if (appt.email) {
          await sendEmail({
            to: appt.email,
            subject: `Let's reschedule your consultation`,
            html: `Hi ${appt.firstName},<br><br>I noticed we missed our scheduled consultation today. No problem at all - I know things come up!<br><br>If you're still interested in exploring your mortgage options, I'd love to help. You can book a new time here:<br><br>${bookingUrl}<br><br>Or just reply to this email and let me know what works for you.<br><br>Best,<br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
          });
        }
        
        // Alert Operations Agent
        await smsCommandSystem.agentToOperations({
          fromAgent: 'Appointment Coordination Agent',
          priority: 'medium',
          message: `⏰ No-show: ${appt.firstName} (Appointment #${appt.id}). Follow-up sent.`,
          requiresResponse: false
        });
        
      } catch (error) {
        console.error(`[Appointment Coordination] Error handling no-show for appointment ${appt.id}:`, error);
      }
    }
  }
  
  /**
   * Send post-appointment follow-up
   */
  async sendPostAppointmentFollowUp(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get appointments that were completed 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    
    const completedAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, threeHoursAgo),
          lte(appointments.appointmentDate, twoHoursAgo),
          eq(appointments.status, 'completed')
        )
      );
    
    console.log(`[Appointment Coordination] Sending post-appointment follow-ups for ${completedAppointments.length} appointments`);
    
    for (const appt of completedAppointments) {
      // Skip test leads
      if (isTestLead({ email: appt.email, phone: appt.phone })) {
        logTestLeadSuppression("email", { email: appt.email, phone: appt.phone, firstName: appt.firstName, lastName: appt.lastName }, "post-appt-coord");
        continue;
      }
      try {
        if (!appt.email) continue;
        
        // Send thank you email with next steps
        await sendEmail({
          to: appt.email,
          subject: `Great speaking with you today!`,
          html: `Hi ${appt.firstName},<br><br>Thank you for taking the time to speak with me today about your mortgage needs. I really enjoyed our conversation!<br><br>Here's what happens next:<br><br>1. I'll prepare your pre-approval letter (if applicable)<br>2. I'll send you a detailed breakdown of your loan options<br>3. I'll follow up in 2-3 days to answer any questions<br><br>In the meantime, if you think of anything, don't hesitate to reach out:<br>📧 Reply to this email<br>📞 Call/text: ${process.env.TIMISHA_PHONE_NUMBER}<br><br>Looking forward to helping you achieve your homeownership goals!<br><br>Best,<br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
        });
        
      } catch (error) {
        console.error(`[Appointment Coordination] Error sending post-appointment follow-up for appointment ${appt.id}:`, error);
      }
    }
  }
  
  /**
   * Get appointment stats for reporting
   */
  async getStats(startDate: Date, endDate: Date): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        ROUND(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as show_rate
      FROM appointments
      WHERE appointment_date BETWEEN ${startDate} AND ${endDate}
    `);
    
    return stats[0];
  }
}

// Singleton instance
export const appointmentCoordinationAgent = new AppointmentCoordinationAgent();
