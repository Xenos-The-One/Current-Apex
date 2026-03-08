import mysql from "mysql2/promise";
import { ENV } from "../_core/env";
import { sendEmail } from "../sendgrid";
import cron from "node-cron";

/**
 * Automated webinar reminder system
 * Runs every hour to check for upcoming webinars and send reminders
 */
export async function sendWebinarReminders() {
  const conn = await mysql.createConnection(ENV.databaseUrl);

  try {
    console.log("[Webinar Reminders] Checking for upcoming webinars...");

    // Get all webinar registrations that need reminders
    const now = new Date();
    
    // 1 week before reminder
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneWeekWindow = new Date(oneWeekFromNow.getTime() + 60 * 60 * 1000); // 1 hour window

    // 3 days before reminder
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysWindow = new Date(threeDaysFromNow.getTime() + 60 * 60 * 1000);

    // 1 day before reminder
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneDayWindow = new Date(oneDayFromNow.getTime() + 60 * 60 * 1000);

    // 1 hour before reminder
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourWindow = new Date(oneHourFromNow.getTime() + 15 * 60 * 1000); // 15 min window

    // Get registrations needing 1-week reminder
    const [oneWeekRegs] = await conn.query<any>(
      `SELECT * FROM webinar_registrations 
       WHERE webinar_date BETWEEN ? AND ?
       AND reminder_1_week_sent = 0
       AND status = 'registered'`,
      [oneWeekFromNow, oneWeekWindow]
    );

    // Get registrations needing 3-day reminder
    const [threeDayRegs] = await conn.query<any>(
      `SELECT * FROM webinar_registrations 
       WHERE webinar_date BETWEEN ? AND ?
       AND reminder_3_days_sent = 0
       AND status = 'registered'`,
      [threeDaysFromNow, threeDaysWindow]
    );

    // Get registrations needing 1-day reminder
    const [oneDayRegs] = await conn.query<any>(
      `SELECT * FROM webinar_registrations 
       WHERE webinar_date BETWEEN ? AND ?
       AND reminder_1_day_sent = 0
       AND status = 'registered'`,
      [oneDayFromNow, oneDayWindow]
    );

    // Get registrations needing 1-hour reminder
    const [oneHourRegs] = await conn.query<any>(
      `SELECT * FROM webinar_registrations 
       WHERE webinar_date BETWEEN ? AND ?
       AND reminder_1_hour_sent = 0
       AND status = 'registered'`,
      [oneHourFromNow, oneHourWindow]
    );

    // Send 1-week reminders
    for (const reg of oneWeekRegs) {
      try {
        await sendEmail({
          to: [reg.email],
          from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
          subject: `Reminder: ${reg.webinar_title} - 1 Week Away!`,
          text: `Hi ${reg.first_name},\n\nJust a reminder that you're registered for ${reg.webinar_title} on ${new Date(reg.webinar_date).toLocaleDateString()} at ${new Date(reg.webinar_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PST.\n\nWe'll send you the webinar link 1 hour before it starts.\n\nLooking forward to seeing you there!\n\nTim Haskins\nNMLS #1116876`,
          html: `<p>Hi ${reg.first_name},</p><p>Just a reminder that you're registered for <strong>${reg.webinar_title}</strong> on ${new Date(reg.webinar_date).toLocaleDateString()} at ${new Date(reg.webinar_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PST.</p><p>We'll send you the webinar link 1 hour before it starts.</p><p>Looking forward to seeing you there!</p><p>Tim Haskins<br>NMLS #1116876</p>`,
        });

        await conn.query(
          "UPDATE webinar_registrations SET reminder_1_week_sent = 1 WHERE id = ?",
          [reg.id]
        );

        console.log(`[Webinar Reminders] Sent 1-week reminder to ${reg.email}`);
      } catch (error) {
        console.error(`[Webinar Reminders] Failed to send 1-week reminder to ${reg.email}:`, error);
      }
    }

    // Send 3-day reminders
    for (const reg of threeDayRegs) {
      try {
        await sendEmail({
          to: [reg.email],
          from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
          subject: `Reminder: ${reg.webinar_title} - 3 Days Away!`,
          text: `Hi ${reg.first_name},\n\nJust 3 days until ${reg.webinar_title}!\n\nDate: ${new Date(reg.webinar_date).toLocaleDateString()}\nTime: ${new Date(reg.webinar_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PST\n\nWe'll send you the webinar link 1 hour before it starts.\n\nSee you soon!\n\nTim Haskins\nNMLS #1116876`,
          html: `<p>Hi ${reg.first_name},</p><p>Just 3 days until <strong>${reg.webinar_title}</strong>!</p><p><strong>Date:</strong> ${new Date(reg.webinar_date).toLocaleDateString()}<br><strong>Time:</strong> ${new Date(reg.webinar_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PST</p><p>We'll send you the webinar link 1 hour before it starts.</p><p>See you soon!</p><p>Tim Haskins<br>NMLS #1116876</p>`,
        });

        await conn.query(
          "UPDATE webinar_registrations SET reminder_3_days_sent = 1 WHERE id = ?",
          [reg.id]
        );

        console.log(`[Webinar Reminders] Sent 3-day reminder to ${reg.email}`);
      } catch (error) {
        console.error(`[Webinar Reminders] Failed to send 3-day reminder to ${reg.email}:`, error);
      }
    }

    // Send 1-day reminders
    for (const reg of oneDayRegs) {
      try {
        await sendEmail({
          to: [reg.email],
          from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
          subject: `Tomorrow: ${reg.webinar_title}`,
          text: `Hi ${reg.first_name},\n\nYour webinar is TOMORROW!\n\n${reg.webinar_title}\n${new Date(reg.webinar_date).toLocaleDateString()} at ${new Date(reg.webinar_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PST\n\nWe'll send you the webinar link 1 hour before it starts.\n\nGet ready!\n\nTim Haskins\nNMLS #1116876`,
          html: `<p>Hi ${reg.first_name},</p><p>Your webinar is <strong>TOMORROW</strong>!</p><h3>${reg.webinar_title}</h3><p>${new Date(reg.webinar_date).toLocaleDateString()} at ${new Date(reg.webinar_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PST</p><p>We'll send you the webinar link 1 hour before it starts.</p><p>Get ready!</p><p>Tim Haskins<br>NMLS #1116876</p>`,
        });

        await conn.query(
          "UPDATE webinar_registrations SET reminder_1_day_sent = 1 WHERE id = ?",
          [reg.id]
        );

        console.log(`[Webinar Reminders] Sent 1-day reminder to ${reg.email}`);
      } catch (error) {
        console.error(`[Webinar Reminders] Failed to send 1-day reminder to ${reg.email}:`, error);
      }
    }

    // Send 1-hour reminders (with webinar link)
    for (const reg of oneHourRegs) {
      try {
        // TODO: Get actual webinar link from database or config
        const webinarLink = "https://meet.google.com/tpo-iwug-udv"; // Placeholder

        await sendEmail({
          to: [reg.email],
          from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
          subject: `Starting in 1 Hour: ${reg.webinar_title}`,
          text: `Hi ${reg.first_name},\n\nYour webinar starts in 1 HOUR!\n\n${reg.webinar_title}\n${new Date(reg.webinar_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PST\n\nJoin here: ${webinarLink}\n\nSee you soon!\n\nTim Haskins\nNMLS #1116876`,
          html: `<p>Hi ${reg.first_name},</p><p>Your webinar starts in <strong>1 HOUR</strong>!</p><h3>${reg.webinar_title}</h3><p>${new Date(reg.webinar_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} PST</p><p><a href="${webinarLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Join Webinar Now</a></p><p>See you soon!</p><p>Tim Haskins<br>NMLS #1116876</p>`,
        });

        await conn.query(
          "UPDATE webinar_registrations SET reminder_1_hour_sent = 1 WHERE id = ?",
          [reg.id]
        );

        console.log(`[Webinar Reminders] Sent 1-hour reminder to ${reg.email}`);
      } catch (error) {
        console.error(`[Webinar Reminders] Failed to send 1-hour reminder to ${reg.email}:`, error);
      }
    }

    console.log(`[Webinar Reminders] Sent ${oneWeekRegs.length} 1-week, ${threeDayRegs.length} 3-day, ${oneDayRegs.length} 1-day, ${oneHourRegs.length} 1-hour reminders`);
  } catch (error) {
    console.error("[Webinar Reminders] Error:", error);
  } finally {
    await conn.end();
  }
}


// Start webinar reminders cron job (runs every hour)
cron.schedule("0 * * * *", sendWebinarReminders);
console.log("[Webinar Reminders] Cron job started - runs every hour");
