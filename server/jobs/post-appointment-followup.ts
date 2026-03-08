/**
 * Post-Appointment Follow-up Cron Job
 * 
 * Runs every hour to:
 * 1. Send thank-you emails after completed appointments
 * 2. Detect no-shows and trigger re-engagement
 * 3. Update lead status based on appointment outcome
 */

import { getDb } from "../db";
import { appointments, leads } from "../../drizzle/schema";
import { sendEmail } from "../sendgrid";
import { getPostAppointmentFollowUpEmail } from "../email-templates-appointments";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { getRecipients } from "../notification-routing";
import { isTestLead, logTestLeadSuppression } from "../test-lead-utils";

export async function processPostAppointmentFollowup() {
  console.log("[Post-Appointment] Checking for completed appointments...");

  const now = new Date();
  
  // Check for appointments that ended in the last 2 hours
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Post-Appointment] Database not available");
      return;
    }

    // Find appointments that should have completed
    const completedAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          lte(appointments.appointmentDate, now),
          gte(appointments.appointmentDate, twoHoursAgo),
          eq(appointments.status, "scheduled" as any)
        )
      );

    console.log(`[Post-Appointment] Found ${completedAppointments.length} appointments to process`);

    for (const appointment of completedAppointments) {
      const appointmentTime = new Date(appointment.appointmentDate);
      const appointmentEndTime = new Date(appointmentTime.getTime() + (appointment.duration || 30) * 60 * 1000);

      // If appointment should have ended by now
      if (now >= appointmentEndTime) {
        console.log(`[Post-Appointment] Processing appointment ${appointment.id} for ${appointment.firstName} ${appointment.lastName}`);

        // Update appointment status to completed
        await db
          .update(appointments)
          .set({ status: "completed" as any })
          .where(eq(appointments.id, appointment.id));

        // Update lead status to qualified (assuming appointment went well)
        if (appointment.leadId) {
          await db
            .update(leads)
            .set({ 
              status: "qualified" as any,
              lastContactDate: now,
            })
            .where(eq(leads.id, appointment.leadId));

          console.log(`[Post-Appointment] Updated lead ${appointment.leadId} status to qualified`);
        }

        // Skip all outbound comms for test leads
        const leadIsTest = isTestLead({ email: appointment.email, phone: appointment.phone });
        if (leadIsTest) {
          logTestLeadSuppression("all", { email: appointment.email, phone: appointment.phone, firstName: appointment.firstName, lastName: appointment.lastName }, "post-appointment-followup");
        }

        // Send thank-you follow-up email to lead (skip if test)
        if (appointment.email && !leadIsTest) {
          try {
            const followUpHtml = getPostAppointmentFollowUpEmail({
              firstName: appointment.firstName,
              lastName: appointment.lastName,
              appointmentDate: appointmentTime,
            });

            await sendEmail({
              to: [appointment.email],
              from: process.env.FROM_EMAIL || 'noreply@lockinloans.com',
              subject: `Thank You for Meeting With Us!`,
              html: followUpHtml,
            });

            console.log(`[Post-Appointment] Sent follow-up email to ${appointment.email}`);
          } catch (emailError) {
            console.error(`[Post-Appointment] Failed to send follow-up email:`, emailError);
          }
        }

        // Send notification to team (always send, even for test leads — so team knows about test activity)
        try {
          const teamRecipients = getRecipients('appointment_completed');
          await sendEmail({
            to: teamRecipients,
            from: process.env.FROM_EMAIL || 'noreply@lockinloans.com',
            subject: `Follow-up Required: ${appointment.firstName} ${appointment.lastName}${leadIsTest ? ' [TEST LEAD]' : ''}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Appointment Completed</h2>
                <p>The following appointment has been completed and follow-up email sent:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Name:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${appointment.firstName} ${appointment.lastName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Phone:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${appointment.phone}</td>
                  </tr>
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${appointment.email || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Date:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${appointmentTime.toLocaleString()}</td>
                  </tr>
                </table>

                <p style="color: #6b7280; font-size: 14px;">
                  <strong>Next Steps:</strong><br>
                  1. Log appointment notes in CRM<br>
                  2. Send pre-approval application if discussed<br>
                  3. Schedule follow-up if needed<br>
                  4. Update lead status based on outcome
                </p>
              </div>
            `,
          });

          console.log(`[Post-Appointment] Sent notification to Tim`);
        } catch (emailError) {
          console.error(`[Post-Appointment] Failed to send notification to Tim:`, emailError);
        }
      }
    }

    console.log("[Post-Appointment] Follow-up job completed successfully");
  } catch (error) {
    console.error("[Post-Appointment] Error in follow-up job:", error);
  }
}

// Run the job every hour
setInterval(processPostAppointmentFollowup, 60 * 60 * 1000);

// Run immediately on startup
processPostAppointmentFollowup();
