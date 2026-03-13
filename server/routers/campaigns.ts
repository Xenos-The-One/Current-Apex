import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { emailCampaigns, smsCampaigns, leads, clients, webinarRegistrations } from "../../drizzle/schema";
import { sendEmail } from "../sendgrid";
import { eq, and, inArray } from "drizzle-orm";
import { sendBulkEmail, isDemoMode as isEmailDemoMode } from "../sendgrid";
import { sendBulkSMS, isDemoMode as isSMSDemoMode } from "../twilio";

export const campaignsRouter = router({
  // Webinar registration
  registerWebinar: protectedProcedure
    .input(z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string(),
      state: z.string(),
      brokerage: z.string().optional(),
      webinarId: z.string(),
      webinarTitle: z.string(),
      webinarDate: z.date(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Store registration in database
      const result = await db.insert(webinarRegistrations).values({
        webinarId: input.webinarId,
        webinarTitle: input.webinarTitle,
        webinarDate: input.webinarDate,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        state: input.state,
        brokerage: input.brokerage,
        status: "registered",
      });
      
      const registrationId = Number((result as any).insertId);

      // Send confirmation email
      const webinarDateFormatted = input.webinarDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const webinarTimeFormatted = input.webinarDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      const confirmationEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webinar Registration Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">You're Registered!</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi ${input.firstName},</p>
    
    <p style="font-size: 16px;">Thank you for registering for our webinar! We're excited to have you join us.</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #667eea;">${input.webinarTitle}</h2>
      <p style="margin: 10px 0;"><strong>📅 Date:</strong> ${webinarDateFormatted}</p>
      <p style="margin: 10px 0;"><strong>🕐 Time:</strong> ${webinarTimeFormatted}</p>
      <p style="margin: 10px 0;"><strong>📍 Location:</strong> Online (Zoom link will be sent 24 hours before)</p>
    </div>
    
    <h3 style="color: #667eea;">What's Next?</h3>
    <ol style="padding-left: 20px;">
      <li style="margin: 10px 0;">Add this event to your calendar (see attachment)</li>
      <li style="margin: 10px 0;">We'll send you the Zoom link 24 hours before the webinar</li>
      <li style="margin: 10px 0;">You'll receive a reminder 2 hours before we start</li>
    </ol>
    
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Can't attend live?</strong> No worries! All registrants will receive a recording within 24 hours after the webinar.</p>
    </div>
    
    <p style="font-size: 16px;">If you have any questions before the webinar, feel free to reply to this email.</p>
    
    <p style="font-size: 16px;">See you soon!</p>
    
    <p style="font-size: 16px;">
      <strong>Tim Haskins</strong><br>
      Premier Mortgage Resources<br>
      Licensed in 49 States
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>© 2026 Indigo Labs. All rights reserved.</p>
  </div>
</body>
</html>
      `;

      // NOTE: Webinar confirmation email is sent by webinars.ts router — not here.
      // campaigns.ts handles the DB insert only to avoid duplicate emails.
      
      return {
        success: true,
        registrationId: registrationId.toString(),
      };
    }),

  // Get demo mode status
  getDemoStatus: protectedProcedure.query(async () => {
    return {
      emailDemoMode: isEmailDemoMode(),
      smsDemoMode: isSMSDemoMode(),
    };
  }),

  // Email campaigns
  createEmailCampaign: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        name: z.string(),
        subject: z.string(),
        htmlContent: z.string().optional(),
        textContent: z.string().optional(),
        recipientFilter: z.enum(["all", "status", "custom"]),
        recipientStatus: z.string().optional(),
        recipientIds: z.array(z.number()).optional(),
        scheduledDate: z.date().optional(),
        sendNow: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify client access
      const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Create campaign
      const [campaign] = await db.insert(emailCampaigns).values({
        agencyId: client.agencyId,
        clientId: input.clientId,
        name: input.name,
        subject: input.subject,
        htmlContent: input.htmlContent || null,
        textContent: input.textContent || null,
        recipientFilter: input.recipientFilter,
        recipientStatus: input.recipientStatus || null,
        scheduledDate: input.scheduledDate || null,
        status: input.sendNow ? "sending" : (input.scheduledDate ? "scheduled" : "draft"),
        createdBy: ctx.user.id,
      });

      // If sending now, process immediately
      if (input.sendNow) {
        // Get recipients
        let recipientLeads: typeof leads.$inferSelect[] = [];
        if (input.recipientFilter === "all") {
          recipientLeads = await db.select().from(leads).where(eq(leads.clientId, input.clientId));
        } else if (input.recipientFilter === "status" && input.recipientStatus) {
          recipientLeads = await db
            .select()
            .from(leads)
            .where(and(eq(leads.clientId, input.clientId), eq(leads.status, input.recipientStatus as any)));
        } else if (input.recipientFilter === "custom" && input.recipientIds) {
          recipientLeads = await db
            .select()
            .from(leads)
            .where(and(eq(leads.clientId, input.clientId), inArray(leads.id, input.recipientIds)));
        }

        const recipients = recipientLeads.filter(l => l.email).map(l => l.email!);

        if (recipients.length > 0) {
          // Send email
          const result = await sendBulkEmail({
            to: recipients,
            from: client.email || "noreply@example.com", // Use client email or default
            subject: input.subject,
            html: input.htmlContent,
            text: input.textContent,
          });

          // Update campaign with results
          await db
            .update(emailCampaigns)
            .set({
              status: "sent",
              sentCount: result.sent,
              failedCount: result.failed,
              sentDate: new Date(),
            })
            .where(eq(emailCampaigns.id, campaign.insertId));
        } else {
          await db
            .update(emailCampaigns)
            .set({ status: "failed" })
            .where(eq(emailCampaigns.id, campaign.insertId));
        }
      }

      return { id: campaign.insertId, status: input.sendNow ? "sent" : "draft" };
    }),

  listEmailCampaigns: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(emailCampaigns).where(eq(emailCampaigns.clientId, input.clientId));
      } catch (err) {
        console.warn("[listEmailCampaigns] DB error (returning empty):", (err as Error).message);
        return [];
      }
    }),


  // SMS campaigns
  createSMSCampaign: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        name: z.string(),
        message: z.string().max(1600), // SMS limit
        recipientFilter: z.enum(["all", "status", "custom"]),
        recipientStatus: z.string().optional(),
        recipientIds: z.array(z.number()).optional(),
        scheduledDate: z.date().optional(),
        sendNow: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify client access
      const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Create campaign
      const [campaign] = await db.insert(smsCampaigns).values({
        agencyId: client.agencyId,
        clientId: input.clientId,
        name: input.name,
        message: input.message,
        recipientFilter: input.recipientFilter,
        recipientStatus: input.recipientStatus || null,
        scheduledDate: input.scheduledDate || null,
        status: input.sendNow ? "sending" : (input.scheduledDate ? "scheduled" : "draft"),
        createdBy: ctx.user.id,
      });

      // If sending now, process immediately
      if (input.sendNow) {
        // Get recipients
        let recipientLeads: typeof leads.$inferSelect[] = [];
        if (input.recipientFilter === "all") {
          recipientLeads = await db.select().from(leads).where(eq(leads.clientId, input.clientId));
        } else if (input.recipientFilter === "status" && input.recipientStatus) {
          recipientLeads = await db
            .select()
            .from(leads)
            .where(and(eq(leads.clientId, input.clientId), eq(leads.status, input.recipientStatus as any)));
        } else if (input.recipientFilter === "custom" && input.recipientIds) {
          recipientLeads = await db
            .select()
            .from(leads)
            .where(and(eq(leads.clientId, input.clientId), inArray(leads.id, input.recipientIds)));
        }

        const recipients = recipientLeads.filter(l => l.phone).map(l => l.phone!);

        if (recipients.length > 0) {
          // Send SMS
          const result = await sendBulkSMS(recipients, input.message);

          // Update campaign with results
          await db
            .update(smsCampaigns)
            .set({
              status: "sent",
              sentCount: result.sent,
              failedCount: result.failed,
              sentDate: new Date(),
            })
            .where(eq(smsCampaigns.id, campaign.insertId));
        } else {
          await db
            .update(smsCampaigns)
            .set({ status: "failed" })
            .where(eq(smsCampaigns.id, campaign.insertId));
        }
      }

      return { id: campaign.insertId, status: input.sendNow ? "sent" : "draft" };
    }),

  listSMSCampaigns: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      try {
        return await db.select().from(smsCampaigns).where(eq(smsCampaigns.clientId, input.clientId));
      } catch (err) {
        console.warn("[listSMSCampaigns] DB error (returning empty):", (err as Error).message);
        return [];
      }
    }),
});
