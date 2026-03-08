/**
 * Webinar Reminder Automation
 * 
 * Sends automated reminders to webinar registrants:
 * - 24 hours before: Reminder email
 * - 1 hour before: Webinar link email
 * - 5 minutes after start: "Last chance to join" email
 */

import mysql from "mysql2/promise";
import { ENV } from "./_core/env";
import { sendEmail } from "./sendgrid";

export async function processWebinarReminders() {
  const conn = await mysql.createConnection(ENV.databaseUrl);

  try {
    const now = new Date();
    
    // 24-hour reminders
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const [reminders24h] = await conn.query<any>(
      `SELECT * FROM webinar_registrations 
       WHERE status = 'registered' 
       AND reminder_sent_24h = false
       AND webinar_date BETWEEN ? AND ?`,
      [in24Hours.toISOString().slice(0, 19).replace('T', ' '), 
       new Date(in24Hours.getTime() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')]
    );

    for (const reg of reminders24h) {
      await sendEmail({
        to: [reg.email],
        from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
        subject: `Reminder: ${reg.webinar_title} Tomorrow!`,
        text: `Hi ${reg.first_name},\n\nJust a reminder that you're registered for ${reg.webinar_title} tomorrow!\n\nWe'll send you the webinar link 1 hour before it starts.\n\nSee you there!\n\nTim Haskins\nNMLS #1116876`,
        html: `<p>Hi ${reg.first_name},</p><p>Just a reminder that you're registered for <strong>${reg.webinar_title}</strong> tomorrow!</p><p>We'll send you the webinar link 1 hour before it starts.</p><p>See you there!</p><p>Tim Haskins<br>NMLS #1116876</p>`,
      });

      await conn.query(
        "UPDATE webinar_registrations SET reminder_sent_24h = true WHERE id = ?",
        [reg.id]
      );
      console.log(`[Webinar] Sent 24h reminder to ${reg.email}`);
    }

    // 1-hour reminders with webinar link
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const [reminders1h] = await conn.query<any>(
      `SELECT * FROM webinar_registrations 
       WHERE status = 'registered' 
       AND reminder_sent_1h = false
       AND webinar_date BETWEEN ? AND ?`,
      [in1Hour.toISOString().slice(0, 19).replace('T', ' '), 
       new Date(in1Hour.getTime() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ')]
    );

    for (const reg of reminders1h) {
      const webinarLink = "https://premiermortgageresources.com/webinar/join"; // TODO: Replace with actual webinar platform link
      
      await sendEmail({
        to: [reg.email],
        from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
        subject: `Starting in 1 Hour: ${reg.webinar_title}`,
        text: `Hi ${reg.first_name},\n\n${reg.webinar_title} starts in 1 hour!\n\nJoin here: ${webinarLink}\n\nSee you soon!\n\nTim Haskins\nNMLS #1116876`,
        html: `<p>Hi ${reg.first_name},</p><p><strong>${reg.webinar_title}</strong> starts in 1 hour!</p><p><a href="${webinarLink}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Join Webinar Now</a></p><p>See you soon!</p><p>Tim Haskins<br>NMLS #1116876</p>`,
      });

      await conn.query(
        "UPDATE webinar_registrations SET reminder_sent_1h = true, webinar_link = ? WHERE id = ?",
        [webinarLink, reg.id]
      );
      console.log(`[Webinar] Sent 1h reminder with link to ${reg.email}`);
    }

    // Last chance emails (5 minutes after start)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const [lastChance] = await conn.query<any>(
      `SELECT * FROM webinar_registrations 
       WHERE status = 'registered' 
       AND last_chance_sent = false
       AND webinar_date BETWEEN ? AND ?`,
      [fiveMinutesAgo.toISOString().slice(0, 19).replace('T', ' '), 
       now.toISOString().slice(0, 19).replace('T', ' ')]
    );

    for (const reg of lastChance) {
      const webinarLink = reg.webinar_link || "https://premiermortgageresources.com/webinar/join";
      
      await sendEmail({
        to: [reg.email],
        from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
        subject: `Last Chance: ${reg.webinar_title} Started!`,
        text: `Hi ${reg.first_name},\n\n${reg.webinar_title} just started! You can still join:\n\n${webinarLink}\n\nDon't miss out on learning how to get up to $20,000 in down payment assistance!\n\nTim Haskins\nNMLS #1116876`,
        html: `<p>Hi ${reg.first_name},</p><p><strong>${reg.webinar_title}</strong> just started! You can still join:</p><p><a href="${webinarLink}" style="display:inline-block;background:#dc2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">Join Now - Don't Miss Out!</a></p><p>Don't miss out on learning how to get up to $20,000 in down payment assistance!</p><p>Tim Haskins<br>NMLS #1116876</p>`,
      });

      await conn.query(
        "UPDATE webinar_registrations SET last_chance_sent = true WHERE id = ?",
        [reg.id]
      );
      console.log(`[Webinar] Sent last chance email to ${reg.email}`);
    }

    console.log(`[Webinar Reminders] Processed: ${reminders24h.length} 24h, ${reminders1h.length} 1h, ${lastChance.length} last chance`);
  } catch (error) {
    console.error("[Webinar Reminders] Error:", error);
  } finally {
    await conn.end();
  }
}
