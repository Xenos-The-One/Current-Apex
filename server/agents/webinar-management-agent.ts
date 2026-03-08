/**
 * Webinar Management Agent
 * 
 * Manages the entire webinar lifecycle:
 * - Registration confirmation
 * - Reminder sequences (24hr, 1hr, last chance)
 * - Attendance tracking
 * - Post-webinar follow-up
 * - Re-engagement for no-shows
 */

import { getDb } from '../db';
import { webinarRegistrations, leads } from '../../drizzle/schema';
import { eq, and, gte, lte, sql, or, isNull, ne } from 'drizzle-orm';
import { smsCommandSystem } from './sms-command-system';
import { sendSMS } from '../twilio';
import { sendEmail } from '../email-service';
import { isTestLead, logTestLeadSuppression } from '../test-lead-utils';

export class WebinarManagementAgent {
  /**
   * Send 24-hour reminders
   */
  async send24HourReminders(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get webinars 24 hours from now (+/- 30 minutes)
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart = new Date(twentyFourHoursFromNow.getTime() - 30 * 60 * 1000);
    const windowEnd = new Date(twentyFourHoursFromNow.getTime() + 30 * 60 * 1000);
    
    const upcomingWebinars = await db
      .select()
      .from(webinarRegistrations)
      .where(
        and(
          gte(webinarRegistrations.webinarDate, windowStart),
          lte(webinarRegistrations.webinarDate, windowEnd),
          or(isNull(webinarRegistrations.reminderSent24h), eq(webinarRegistrations.reminderSent24h, false))
        )
      );
    
    console.log(`[Webinar Management] Sending 24-hour reminders for ${upcomingWebinars.length} registrations`);
    
    for (const reg of upcomingWebinars) {
      // Skip test leads
      if (isTestLead({ email: reg.email, phone: reg.phone })) {
        logTestLeadSuppression("all", { email: reg.email, phone: reg.phone, firstName: reg.firstName, lastName: reg.lastName }, "webinar-24h-reminder");
        await db.update(webinarRegistrations).set({ reminderSent24h: true }).where(eq(webinarRegistrations.id, reg.id));
        continue;
      }
      try {
        const webinarDate = new Date(reg.webinarDate);
        const dateStr = webinarDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        });
        const timeStr = webinarDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        const regName = `${reg.firstName} ${reg.lastName}`.trim();
        
        // Send SMS
        if (reg.phone) {
          const smsMessage = `Hi ${regName}, reminder: Our DPA webinar is tomorrow (${dateStr}) at ${timeStr}. You'll learn how to get $15K for down payment. Join here: ${reg.webinarLink || 'Link coming soon'}`;
          await sendSMS({ to: reg.phone, body: smsMessage });
        }
        
        // Send email
        if (reg.email) {
          await sendEmail({
            to: reg.email,
            subject: `Tomorrow: Free DPA Webinar at ${timeStr}`,
            html: `Hi ${regName},<br><br>Just a quick reminder about tomorrow's webinar:<br><br>📅 ${dateStr}<br>🕐 ${timeStr}<br>💰 Topic: How to Get $15,000 for Down Payment<br><br>What you'll learn:<br>• How Down Payment Assistance (DPA) works<br>• Who qualifies (you might be surprised!)<br>• How to apply and get approved<br>• Real examples of clients who used DPA<br><br>Join here: ${reg.webinarLink || 'Link will be sent 1 hour before'}<br><br>See you tomorrow!<br><br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
          });
        }
        
        // Mark as reminded
        await db
          .update(webinarRegistrations)
          .set({ reminderSent24h: true })
          .where(eq(webinarRegistrations.id, reg.id));
        
      } catch (error) {
        console.error(`[Webinar Management] Error sending 24-hour reminder for registration ${reg.id}:`, error);
      }
    }
  }
  
  /**
   * Send 1-hour reminders
   */
  async send1HourReminders(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get webinars 1 hour from now (+/- 5 minutes)
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const windowStart = new Date(oneHourFromNow.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(oneHourFromNow.getTime() + 5 * 60 * 1000);
    
    const upcomingWebinars = await db
      .select()
      .from(webinarRegistrations)
      .where(
        and(
          gte(webinarRegistrations.webinarDate, windowStart),
          lte(webinarRegistrations.webinarDate, windowEnd),
          or(isNull(webinarRegistrations.reminderSent1h), eq(webinarRegistrations.reminderSent1h, false))
        )
      );
    
    console.log(`[Webinar Management] Sending 1-hour reminders for ${upcomingWebinars.length} registrations`);
    
    for (const reg of upcomingWebinars) {
      // Skip test leads
      if (isTestLead({ email: reg.email, phone: reg.phone })) {
        logTestLeadSuppression("all", { email: reg.email, phone: reg.phone, firstName: reg.firstName, lastName: reg.lastName }, "webinar-1h-reminder");
        await db.update(webinarRegistrations).set({ reminderSent1h: true }).where(eq(webinarRegistrations.id, reg.id));
        continue;
      }
      try {
        const webinarDate = new Date(reg.webinarDate);
        const timeStr = webinarDate.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        const webinarLink = reg.webinarLink || 'https://zoom.us/j/placeholder';
        const regName = `${reg.firstName} ${reg.lastName}`.trim();
        
        // Send SMS
        if (reg.phone) {
          const smsMessage = `Hi ${regName}, the DPA webinar starts in 1 hour (${timeStr})! Join here: ${webinarLink}`;
          await sendSMS({ to: reg.phone, body: smsMessage });
        }
        
        // Send email
        if (reg.email) {
          await sendEmail({
            to: reg.email,
            subject: `Starting in 1 hour: DPA Webinar`,
            html: `Hi ${regName},<br><br>The webinar starts in 1 hour (${timeStr})!<br><br>💰 Topic: How to Get $15,000 for Down Payment<br><br>Join here: ${webinarLink}<br><br>See you soon!<br><br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
          });
        }
        
        // Mark as reminded
        await db
          .update(webinarRegistrations)
          .set({ reminderSent1h: true })
          .where(eq(webinarRegistrations.id, reg.id));
        
      } catch (error) {
        console.error(`[Webinar Management] Error sending 1-hour reminder for registration ${reg.id}:`, error);
      }
    }
  }
  
  /**
   * Send last chance reminders (15 minutes after start for latecomers)
   */
  async sendLastChanceReminders(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get webinars that started 15 minutes ago (+/- 2 minutes)
    const now = new Date();
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const windowStart = new Date(fifteenMinutesAgo.getTime() - 2 * 60 * 1000);
    const windowEnd = new Date(fifteenMinutesAgo.getTime() + 2 * 60 * 1000);
    
    const recentWebinars = await db
      .select()
      .from(webinarRegistrations)
      .where(
        and(
          gte(webinarRegistrations.webinarDate, windowStart),
          lte(webinarRegistrations.webinarDate, windowEnd),
          or(isNull(webinarRegistrations.lastChanceSent), eq(webinarRegistrations.lastChanceSent, false)),
          ne(webinarRegistrations.status, 'attended')
        )
      );
    
    console.log(`[Webinar Management] Sending last chance reminders for ${recentWebinars.length} registrations`);
    
    for (const reg of recentWebinars) {
      // Skip test leads
      if (isTestLead({ email: reg.email, phone: reg.phone })) {
        logTestLeadSuppression("sms", { email: reg.email, phone: reg.phone, firstName: reg.firstName, lastName: reg.lastName }, "webinar-last-chance");
        await db.update(webinarRegistrations).set({ lastChanceSent: true }).where(eq(webinarRegistrations.id, reg.id));
        continue;
      }
      try {
        const webinarLink = reg.webinarLink || 'https://zoom.us/j/placeholder';
        const regName = `${reg.firstName} ${reg.lastName}`.trim();
        
        // Send SMS only (urgent)
        if (reg.phone) {
          const smsMessage = `${regName}, the DPA webinar just started! You can still join: ${webinarLink}`;
          await sendSMS({ to: reg.phone, body: smsMessage });
        }
        
        // Mark as sent
        await db
          .update(webinarRegistrations)
          .set({ lastChanceSent: true })
          .where(eq(webinarRegistrations.id, reg.id));
        
      } catch (error) {
        console.error(`[Webinar Management] Error sending last chance reminder for registration ${reg.id}:`, error);
      }
    }
  }
  
  /**
   * Send post-webinar follow-up
   */
  async sendPostWebinarFollowUp(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Get webinars that ended 2 hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    
    const completedWebinars = await db
      .select()
      .from(webinarRegistrations)
      .where(
        and(
          gte(webinarRegistrations.webinarDate, threeHoursAgo),
          lte(webinarRegistrations.webinarDate, twoHoursAgo)
        )
      );
    
    console.log(`[Webinar Management] Sending post-webinar follow-ups for ${completedWebinars.length} registrations`);
    
    for (const reg of completedWebinars) {
      // Skip test leads
      if (isTestLead({ email: reg.email, phone: reg.phone })) {
        logTestLeadSuppression("email", { email: reg.email, phone: reg.phone, firstName: reg.firstName, lastName: reg.lastName }, "webinar-post-followup");
        continue;
      }
      try {
        if (!reg.email) continue;
        
        const regName = `${reg.firstName} ${reg.lastName}`.trim();
        const bookingUrl = `${process.env.VITE_APP_URL || ''}/book/tim`;
        
        // Different follow-up based on attendance
        if (reg.status === 'attended') {
          // Attended - thank you + next steps
          await sendEmail({
            to: reg.email,
            subject: `Thanks for attending! Next steps...`,
            html: `Hi ${regName},<br><br>Thank you for attending today's DPA webinar! I hope you found it valuable.<br><br>Here's what happens next:<br><br>1. Review the webinar recording (link below)<br>2. Schedule a 1-on-1 consultation to discuss YOUR situation<br>3. Get pre-approved and start your home search!<br><br>📹 Webinar recording: [Link]<br>📅 Book your consultation: ${bookingUrl}<br><br>I'm here to help you get that $15,000 down payment assistance!<br><br>Best,<br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
          });
        } else {
          // No-show - send recording + reschedule
          await sendEmail({
            to: reg.email,
            subject: `We missed you! Here's the webinar recording`,
            html: `Hi ${regName},<br><br>I noticed you couldn't make it to today's DPA webinar. No worries - life happens!<br><br>Good news: I recorded the entire session for you.<br><br>📹 Watch the recording: [Link]<br><br>After you watch it, let's schedule a quick call to discuss how DPA can work for YOUR situation:<br><br>📅 Book a consultation: ${bookingUrl}<br><br>Or just reply to this email with any questions!<br><br>Best,<br>Tim Haskins<br>Home Loan Coach<br>NMLS #1116876`
          });
        }
        
      } catch (error) {
        console.error(`[Webinar Management] Error sending post-webinar follow-up for registration ${reg.id}:`, error);
      }
    }
  }
  
  /**
   * Get webinar stats for reporting
   */
  async getStats(startDate: Date, endDate: Date): Promise<any> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_registrations,
        SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attendees,
        ROUND(SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as attendance_rate,
        SUM(CASE WHEN reminder_sent_24h = TRUE THEN 1 ELSE 0 END) as reminders_24h_sent,
        SUM(CASE WHEN reminder_sent_1h = TRUE THEN 1 ELSE 0 END) as reminders_1h_sent,
        SUM(CASE WHEN last_chance_sent = TRUE THEN 1 ELSE 0 END) as last_chance_sent
      FROM webinar_registrations
      WHERE webinar_date BETWEEN ${startDate} AND ${endDate}
    `);
    
    return stats[0];
  }
}

// Singleton instance
export const webinarManagementAgent = new WebinarManagementAgent();
