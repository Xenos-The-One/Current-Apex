import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { appointments, agencies, leads } from "../../drizzle/schema";
import { sendEmail as sendEmailService } from "../email-service";
import { sendSMS } from "../twilio";
import { getAvailableSlots as getAvailableSlotsService } from "../booking-service";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { pushAppointmentBooked } from "../push-triggers";
import { isTestLead } from "../test-lead-utils";
import { z } from "zod";

export const appointmentsRouter = router({
  // Public procedure to book an appointment (strategy call)
  bookAppointment: publicProcedure
    .input(z.object({
      agencyId: z.number(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      phone: z.string(),
      appointmentDate: z.date(),
      loanType: z.string().optional(),
      propertyAddress: z.string().optional(),
      notes: z.string().optional(),
      source: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log(`[Appointment] 📥 bookAppointment called for ${input.firstName} ${input.lastName}`);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      console.log(`[Appointment] Creating appointment in database...`);
      // Create appointment
      const result = await db.insert(appointments).values({
        agencyId: input.agencyId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        appointmentDate: input.appointmentDate,
        loanType: input.loanType,
        propertyAddress: input.propertyAddress,
        notes: input.notes,
        source: input.source,
        assignedTo: "loan_officer",
        status: "scheduled",
      });

      const appointmentId = Number((result as any).insertId);

      // Mark lead as having booked appointment (prevents Vapi call)
      if (input.phone) {
        await db.update(leads)
          .set({ 
            appointmentBookedAt: new Date(),
            status: "appointment_set"
          })
          .where(eq(leads.phone, input.phone));
      }

      const appointmentDateFormatted = input.appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const appointmentTimeFormatted = input.appointmentDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      // Generate ICS calendar file
      const icsContent = generateICS({
        summary: `Mortgage Consultation with Tim Haskins`,
        description: `Mortgage consultation call with Tim Haskins (NMLS #1116876).\\nNotes: ${input.notes || 'None'}`,
        start: input.appointmentDate,
        duration: 30,
        location: 'Phone/Video Call',
        attendeeEmail: input.email,
        attendeeName: `${input.firstName} ${input.lastName}`,
      });

      const confirmationEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Appointment Confirmed!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Premier Mortgage Resources</p>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi ${input.firstName},</p>
    
    <p style="font-size: 16px;">Your mortgage consultation with Tim Haskins has been confirmed!</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #1e40af; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #1e40af;">Appointment Details</h2>
      <p style="margin: 10px 0;"><strong>Date:</strong> ${appointmentDateFormatted}</p>
      <p style="margin: 10px 0;"><strong>Time:</strong> ${appointmentTimeFormatted}</p>
      <p style="margin: 10px 0;"><strong>Duration:</strong> 30 minutes</p>
      <p style="margin: 10px 0;"><strong>Type:</strong> Phone/Video Call</p>
      <p style="margin: 10px 0;"><strong>Loan Officer:</strong> Tim Haskins (NMLS #1116876)</p>
    </div>
    
    <h3 style="color: #1e40af;">What to Prepare</h3>
    <ul style="padding-left: 20px;">
      <li style="margin: 10px 0;">Your current income and employment information</li>
      <li style="margin: 10px 0;">Credit score (approximate is fine)</li>
      <li style="margin: 10px 0;">Down payment amount you have available</li>
      <li style="margin: 10px 0;">Any questions about mortgage programs</li>
    </ul>
    
    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px;"><strong>Calendar Invite:</strong> A calendar invite is attached to this email. Click to add it to your calendar!</p>
    </div>
    
    <p style="font-size: 16px;">Tim will call you at <strong>${input.phone}</strong> at the scheduled time.</p>
    
    <p style="font-size: 16px;">If you need to reschedule, please reply to this email or call Tim directly.</p>
    
    <p style="font-size: 16px;">
      Looking forward to helping you achieve homeownership!<br>
      <strong>Tim Haskins</strong><br>
      NMLS #1116876<br>
      Premier Mortgage Resources
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>&copy; 2026 Premier Mortgage Resources. All rights reserved.</p>
  </div>
</body>
</html>
      `;

      // Send confirmation email to borrower
      try {
        const emailResult = await sendEmailService({
          to: input.email,
          from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
          subject: `Your Appointment Confirmed - ${appointmentDateFormatted} at ${appointmentTimeFormatted}`,
          html: confirmationEmail,
          attachments: [{
            content: Buffer.from(icsContent).toString('base64'),
            filename: 'appointment.ics',
            type: 'text/calendar',
            disposition: 'attachment',
          }],
        });
        
        if (emailResult.success) {
          console.log(`[Appointment] ✅ Confirmation email sent to ${input.email}`);
        } else {
          console.error(`[Appointment] ❌ Email failed: ${emailResult.error}`);
        }
      } catch (error) {
        console.error("[Appointment] ❌ Exception sending email:", error);
      }
      
      // Send SMS confirmation to lead (real leads only)
      if (input.phone) {
        const isTestForSms = isTestLead({ email: input.email, phone: input.phone });
        if (!isTestForSms) {
          try {
            const smsBody = `Hi ${input.firstName}! Your mortgage consultation with Tim Haskins (NMLS #1116876) is confirmed for ${appointmentDateFormatted} at ${appointmentTimeFormatted}. He will call you at this number. Questions? Reply to this message. Premier Mortgage Resources.`;
            const smsResult = await sendSMS({
              to: input.phone,
              body: smsBody,
            });
            if (smsResult.success) {
              console.log(`[Appointment] ✅ SMS confirmation sent to ${input.phone}`);
            } else {
              console.error(`[Appointment] ❌ SMS failed: ${smsResult.error}`);
            }
          } catch (smsError) {
            console.error("[Appointment] ❌ Exception sending SMS:", smsError);
          }
        } else {
          console.log(`[Appointment] ⚠️ Test lead — skipping SMS for ${input.phone}`);
        }
      }

      // Skip Tim notifications for test leads (e.g. test@example.com, 555-1234)
      const isTest = isTestLead({ email: input.email, phone: input.phone });
      if (isTest) {
        console.log(`[Appointment] ⚠️ Test lead detected — skipping Tim notifications for ${input.firstName} ${input.lastName}`);
      }

      // Send in-app notification to Tim (real leads only)
      if (!isTest) {
        try {
          await notifyOwner({
            title: "New Appointment Booked",
            content: `${input.firstName} ${input.lastName} booked an appointment for ${appointmentDateFormatted} at ${appointmentTimeFormatted}. Phone: ${input.phone}`
          });
          console.log(`[Appointment] ✅ In-app notification sent to Tim`);
        } catch (notifyError) {
          console.error("[Appointment] ❌ In-app notification failed:", notifyError);
        }
      }

      // Send push notification to all devices (real leads only)
      if (!isTest) {
        try {
          await pushAppointmentBooked({
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            appointmentDate: input.appointmentDate,
            source: input.source,
          });
          console.log(`[Appointment] ✅ Push notification sent`);
        } catch (pushError) {
          console.error("[Appointment] ❌ Push notification failed:", pushError);
        }
      } // end !isTest

      return {
        success: true,
        appointmentId: appointmentId.toString(),
      };
    }),

  // Get available time slots for booking
  getAvailableSlots: publicProcedure
    .input(z.object({
      agencyId: z.number(),
      date: z.date(),
    }))
    .query(async ({ input }) => {
      const slots = await getAvailableSlotsService(input.agencyId, input.date);
      
      // Return only available slots in the format expected by frontend
      return slots
        .filter(slot => slot.available)
        .map(slot => ({
          time: slot.time.toISOString(),
          display: slot.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        }));
    }),

  // Get appointments for a date range
  getAppointments: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const appointments_data = await db.select()
        .from(appointments)
        .where(
          and(
            gte(appointments.appointmentDate, input.startDate),
            lte(appointments.appointmentDate, input.endDate)
          )
        )
        .orderBy(desc(appointments.appointmentDate));

      return appointments_data;
    }),

  sendLastMinuteOutreach: protectedProcedure
    .input(z.object({
      appointmentId: z.number(),
      channel: z.enum(["sms", "email", "both"]),
      message: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [apt] = await db.select()
        .from(appointments)
        .where(eq(appointments.id, input.appointmentId))
        .limit(1);

      if (!apt) throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" });

      const results: { sms?: string; email?: string } = {};

      // Send SMS
      if (input.channel === "sms" || input.channel === "both") {
        if (apt.phone) {
          const smsResult = await sendSMS({
            to: apt.phone,
            body: input.message,
            leadContext: { email: apt.email, firstName: apt.firstName, lastName: apt.lastName },
          });
          results.sms = smsResult.success ? "sent" : `failed: ${smsResult.error}`;
        } else {
          results.sms = "skipped: no phone number";
        }
      }

      // Send Email
      if (input.channel === "email" || input.channel === "both") {
        if (apt.email) {
          const emailResult = await sendEmailService({
            to: apt.email,
            from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
            subject: `Important Update About Your Appointment — ${new Date(apt.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a2e;">Hi ${apt.firstName || 'there'},</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #333;">${input.message}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="font-size: 14px; color: #666;">Your appointment is scheduled for <strong>${new Date(apt.appointmentDate).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</strong>.</p>
                <p style="font-size: 12px; color: #999; margin-top: 24px;">Tim Haskins | NMLS# 2611119 | Premier Mortgage Resources</p>
              </div>
            `,
          });
          results.email = emailResult.success ? "sent" : `failed: ${emailResult.error}`;
        } else {
          results.email = "skipped: no email address";
        }
      }

      await notifyOwner({
        title: "Last-Minute Outreach Sent",
        content: `Outreach sent to ${apt.firstName} ${apt.lastName} (${apt.phone || apt.email}) via ${input.channel}. Message: "${input.message.substring(0, 100)}${input.message.length > 100 ? '...' : ''}"`,
      });

      return { success: true, results };
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      appointmentId: z.number(),
      status: z.enum(["scheduled", "confirmed", "completed", "cancelled", "no_show", "no_answer", "busy"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(appointments)
        .set({ status: input.status })
        .where(eq(appointments.id, input.appointmentId));

      return { success: true };
    }),
});

/**
 * Generate ICS calendar file content
 */
function generateICS(options: {
  summary: string;
  description: string;
  start: Date;
  duration: number; // in minutes
  location: string;
  attendeeEmail: string;
  attendeeName: string;
}): string {
  const start = options.start;
  const end = new Date(start.getTime() + options.duration * 60000);

  const formatDate = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Premier Mortgage Resources//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${Date.now()}@pmrloans.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${options.summary}
DESCRIPTION:${options.description}
LOCATION:${options.location}
ATTENDEE;CN=${options.attendeeName}:mailto:${options.attendeeEmail}
END:VEVENT
END:VCALENDAR`;
}
