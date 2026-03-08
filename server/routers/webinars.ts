import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";
import { sendSmartAlert } from "../ai-operations-director";
import { pushWebinarRegistration } from "../push-triggers";

export const webinarsRouter = router({
  /**
   * Register for a webinar
   */
  register: publicProcedure
    .input(
      z.object({
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().min(1),
        webinarDate: z.string(), // YYYY-MM-DD format
        webinarTime: z.string(), // HH:MM:SS format
        webinarType: z.string(), // first_time_homebuyer, agent, etc.
        source: z.string(), // landing_page, facebook, etc.
        origin: z.string(), // window.location.origin for email links
      })
    )
    .mutation(async ({ input }) => {
      const conn = await mysql.createConnection(ENV.databaseUrl);

      try {
        const webinarDateTime = `${input.webinarDate} ${input.webinarTime}`;
        const webinarTitle = input.webinarType === 'first_time_homebuyer' 
          ? 'First-Time Homebuyer Down Payment Assistance'
          : input.webinarType === 'agent'
          ? 'Agent Webinar - Get More Deals'
          : 'Webinar';

        // Insert webinar registration
        const [result] = await conn.query<any>(
          `INSERT INTO webinar_registrations 
          (webinar_id, webinar_title, webinar_date, first_name, last_name, email, phone, status, source, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'registered', ?, NOW())`,
          [
            `${input.webinarType}-${input.webinarDate}`,
            webinarTitle,
            webinarDateTime,
            input.firstName,
            input.lastName,
            input.email,
            input.phone,
            input.source,
          ]
        );

        const registrationId = result.insertId;

        // CRITICAL FIX: Also create a lead so they enter the automated follow-up system
        await conn.query(
          `INSERT INTO leads 
          (client_id, agency_id, first_name, last_name, email, phone, source, status, notes, createdAt, updatedAt)
          VALUES (1, 1, ?, ?, ?, ?, ?, 'new', ?, NOW(), NOW())`,
          [
            input.firstName,
            input.lastName,
            input.email,
            input.phone,
            `Webinar Registration - ${webinarTitle}`,
            `Registered for webinar on ${input.webinarDate} at ${input.webinarTime}`,
          ]
        );

        // Send confirmation email immediately
        const { sendEmail } = await import("../sendgrid");
        await sendEmail({
          to: [input.email],
          from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
          subject: `You're Registered! ${webinarTitle}`,
          text: `Hi ${input.firstName},\n\nYou're registered for ${webinarTitle} on ${input.webinarDate} at ${input.webinarTime} PST.\n\nWe'll send you the webinar link 1 hour before it starts.\n\nSee you there!\n\nTim Haskins\nNMLS #1116876`,
          html: `<p>Hi ${input.firstName},</p><p>You're registered for <strong>${webinarTitle}</strong> on ${input.webinarDate} at ${input.webinarTime} PST.</p><p>We'll send you the webinar link 1 hour before it starts.</p><p>See you there!</p><p>Tim Haskins<br>NMLS #1116876</p>`,
        });

        // Send push notification for webinar registration
        try {
          await pushWebinarRegistration({
            lastName: input.lastName,
            email: input.email,
            webinarTitle,
          });
        } catch (pushErr) {
          console.error('[Webinar] Push notification failed:', pushErr);
        }

        // Send smart alert for webinar milestone (every 10 registrations)
        const [countResult] = await conn.query<any>(
          "SELECT COUNT(*) as count FROM webinar_registrations WHERE webinar_id = ?",
          [`${input.webinarType}-${input.webinarDate}`]
        );
        const totalRegs = countResult[0].count;
        
        if (totalRegs % 10 === 0) {
          await sendSmartAlert("webinar_milestone", {
            count: totalRegs,
            webinarTitle,
            webinarDate: input.webinarDate,
          });
        }

        return {
          success: true,
          registrationId,
        };
      } finally {
        await conn.end();
      }
    }),
});
