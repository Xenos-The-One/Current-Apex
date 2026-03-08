import { Request, Response } from "express";
import { getDb } from "../db";
import { appointments, leads, leadActivities } from "../../drizzle/schema";
import { sendEmail } from "../sendgrid";
import { getAppointmentConfirmationEmail } from "../email-templates-appointments";
import { eq } from "drizzle-orm";
import { getRecipients } from "../notification-routing";
import { pushVapiAppointmentBooked, pushVapiCallCompleted } from "../push-triggers";

/**
 * Vapi Webhook Handler
 * 
 * Handles webhook events from Vapi for call completions and appointment bookings.
 * Uses Vapi's structured data extraction to reliably detect appointments
 * instead of keyword matching on transcripts.
 */
export async function handleVapiWebhook(req: Request, res: Response) {
  console.log('[Vapi Webhook] Received event type:', req.body?.message?.type || req.body?.type || 'unknown');

  try {
    const event = req.body;

    // Vapi sends events wrapped in a message object for server URL webhooks
    const eventType = event.message?.type || event.type;
    const callData = event.message?.call || event.call || {};
    const analysis = event.message?.analysis || event.analysis || {};
    const transcript = event.message?.transcript || event.transcript || '';
    const messages = event.message?.messages || event.messages || [];
    const structuredData = analysis.structuredData || {};

    // Respond immediately to status-update and other non-terminal events
    if (eventType === 'status-update' || eventType === 'speech-update' || eventType === 'transcript') {
      return res.status(200).json({ received: true });
    }

    // Handle end-of-call-report event (when call completes)
    if (eventType === 'end-of-call-report') {
      console.log('[Vapi Webhook] Call completed:', callData.id);
      console.log('[Vapi Webhook] Analysis:', JSON.stringify(analysis, null, 2));
      console.log('[Vapi Webhook] Structured Data:', JSON.stringify(structuredData, null, 2));

      // Extract customer info
      const customerNumber = callData.customer?.number || '';
      const customerName = callData.customer?.name || '';
      const callDuration = callData.duration || 0;
      const recordingUrl = callData.recordingUrl || callData.artifact?.recordingUrl || '';
      const callStatus = callData.status || 'unknown';
      const callSummary = analysis.summary || '';
      const successEval = analysis.successEvaluation || '';

      // Determine if appointment was booked using structured data (primary) or fallback methods
      let appointmentBooked = false;
      let appointmentDateStr = '';
      let appointmentTimeStr = '';
      let loanType = '';
      let propertyLocation = '';
      let timeline = '';
      let customerSentiment = '';

      // Primary: Use Vapi structured data extraction
      if (structuredData.appointmentBooked === true || structuredData.appointmentBooked === 'true') {
        appointmentBooked = true;
        appointmentDateStr = structuredData.appointmentDate || '';
        appointmentTimeStr = structuredData.appointmentTime || '';
        loanType = structuredData.loanType || '';
        propertyLocation = structuredData.propertyLocation || '';
        timeline = structuredData.timeline || '';
        customerSentiment = structuredData.customerSentiment || '';
        console.log('[Vapi Webhook] Appointment detected via structured data');
      }
      // Fallback: Check success evaluation + transcript keywords
      else if (successEval === 'true' || successEval === true) {
        const transcriptLower = (transcript || '').toLowerCase();
        if (transcriptLower.includes('appointment') || transcriptLower.includes('book') || transcriptLower.includes('schedule') || transcriptLower.includes('2:30') || transcriptLower.includes('2 30')) {
          appointmentBooked = true;
          console.log('[Vapi Webhook] Appointment detected via success evaluation + transcript');
        }
      }
      // Last resort: keyword matching on messages
      if (!appointmentBooked) {
        for (const msg of messages) {
          if (msg.role === 'bot' || msg.role === 'assistant') {
            const text = (msg.message || msg.content || '').toLowerCase();
            if ((text.includes('book') || text.includes('schedule') || text.includes('confirm')) && 
                (text.includes('appointment') || text.includes('consultation'))) {
              appointmentBooked = true;
              console.log('[Vapi Webhook] Appointment detected via keyword fallback');
              break;
            }
          }
        }
      }

      const db = await getDb();
      if (!db) {
        console.error('[Vapi Webhook] Database not available');
        return res.status(500).json({ error: 'Database not available' });
      }

      // Find the lead by phone number
      let leadEmail = '';
      let leadId: number | null = null;
      let leadFirstName = '';
      let leadLastName = '';

      try {
        // Try exact match first, then try with/without +1 prefix
        const phoneVariants = [customerNumber];
        if (customerNumber.startsWith('+1')) {
          phoneVariants.push(customerNumber.slice(2));
        } else if (customerNumber.startsWith('1') && customerNumber.length === 11) {
          phoneVariants.push('+' + customerNumber);
          phoneVariants.push(customerNumber.slice(1));
        } else if (customerNumber.length === 10) {
          phoneVariants.push('+1' + customerNumber);
          phoneVariants.push('1' + customerNumber);
        }

        for (const phone of phoneVariants) {
          const [lead] = await db.select().from(leads).where(eq(leads.phone, phone)).limit(1);
          if (lead) {
            leadEmail = lead.email || '';
            leadId = lead.id;
            leadFirstName = lead.firstName || '';
            leadLastName = lead.lastName || '';
            break;
          }
        }
      } catch (err) {
        console.error('[Vapi Webhook] Error finding lead:', err);
      }

      // Parse name from lead data or call data
      const nameParts = customerName.split(' ');
      const firstName = leadFirstName || nameParts[0] || 'Unknown';
      const lastName = leadLastName || nameParts.slice(1).join(' ') || '';

      // Update lead activity with call outcome
      if (leadId) {
        try {
          await db.update(leadActivities)
            .set({
              callDuration,
              callRecordingUrl: recordingUrl,
              description: `Vapi call completed - ${appointmentBooked ? 'Appointment booked' : 'No appointment'} (${callStatus}, ${callDuration}s)${callSummary ? '\nSummary: ' + callSummary : ''}`
            })
            .where(eq(leadActivities.vapiCallId, callData.id));
        } catch (err) {
          console.error('[Vapi Webhook] Error updating lead activity:', err);
        }
      }

      if (appointmentBooked) {
        // Parse appointment date/time from structured data
        let appointmentDate: Date;
        
        if (appointmentDateStr && appointmentTimeStr) {
          // Use structured data date/time
          appointmentDate = new Date(`${appointmentDateStr}T${appointmentTimeStr}:00`);
          // If the date is invalid, fall back
          if (isNaN(appointmentDate.getTime())) {
            appointmentDate = getDefaultAppointmentDate();
          }
        } else if (appointmentDateStr) {
          appointmentDate = new Date(appointmentDateStr + 'T10:00:00');
          if (isNaN(appointmentDate.getTime())) {
            appointmentDate = getDefaultAppointmentDate();
          }
        } else {
          // Try to extract from transcript
          appointmentDate = extractDateFromTranscript(transcript || messages.map((m: any) => m.message || '').join(' '));
        }

        console.log('[Vapi Webhook] Appointment date:', appointmentDate.toISOString());

        const [result] = await db.insert(appointments).values({
          agencyId: 1,
          leadId: leadId || undefined,
          firstName,
          lastName,
          phone: customerNumber,
          email: leadEmail,
          appointmentDate,
          duration: 30,
          appointmentType: 'consultation',
          loanType: loanType || undefined,
          propertyAddress: propertyLocation || undefined,
          assignedTo: 'loan_officer',
          status: 'scheduled',
          source: 'Vapi Auto-Call',
          notes: `Call summary: ${callSummary}\nSentiment: ${customerSentiment || 'N/A'}\nTimeline: ${timeline || 'N/A'}\nRecording: ${recordingUrl}`,
          reminderSent: false,
          confirmationSent: false,
          reminderSent24h: false,
          reminderSent2h: false,
        });

        const appointmentId = result.insertId;
        console.log('[Vapi Webhook] Appointment created:', appointmentId);

        // Update lead status to 'appointment_set'
        if (leadId) {
          try {
            await db.update(leads)
              .set({ status: 'appointment_set' as any })
              .where(eq(leads.id, leadId));
          } catch (err) {
            console.error('[Vapi Webhook] Error updating lead status:', err);
          }
        }

        // Send push notification for Vapi appointment
        try {
          await pushVapiAppointmentBooked({
            firstName,
            lastName,
            phone: customerNumber,
            appointmentDate,
            callDuration,
            loanType: loanType || undefined,
          });
          console.log('[Vapi Webhook] Push notification sent for appointment');
        } catch (pushErr) {
          console.error('[Vapi Webhook] Push notification failed:', pushErr);
        }

        // Send notification email to team (appointments go to team email)
        const teamRecipients = getRecipients('appointment_new');
        try {
          await sendEmail({
            to: teamRecipients,
            from: process.env.FROM_EMAIL || 'noreply@lockinloans.com',
            subject: `New Appointment Booked - ${firstName} ${lastName} - ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">New Appointment Booked via AI Call!</h2>
                <p>Sarah (Vapi AI) just booked a consultation:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Name:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${firstName} ${lastName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Phone:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${customerNumber}</td>
                  </tr>
                  ${leadEmail ? `<tr style="background: #f3f4f6;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${leadEmail}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Date/Time:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                  ${loanType ? `<tr style="background: #f3f4f6;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Loan Type:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${loanType}</td>
                  </tr>` : ''}
                  ${propertyLocation ? `<tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Location:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${propertyLocation}</td>
                  </tr>` : ''}
                  ${timeline ? `<tr style="background: #f3f4f6;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Timeline:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${timeline}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Call Summary:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">${callSummary}</td>
                  </tr>
                  ${recordingUrl ? `<tr style="background: #f3f4f6;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Recording:</strong></td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;"><a href="${recordingUrl}">Listen to call</a></td>
                  </tr>` : ''}
                </table>

                <p style="color: #6b7280; font-size: 14px;">
                  Log in to the CRM to view full details and manage this appointment.
                </p>
              </div>
            `,
          });
          console.log('[Vapi Webhook] Appointment notification sent to team');
        } catch (emailError) {
          console.error('[Vapi Webhook] Failed to send notification email:', emailError);
        }

        // Send confirmation email to lead
        if (leadEmail) {
          try {
            const confirmationHtml = getAppointmentConfirmationEmail({
              firstName,
              lastName,
              appointmentDate,
              duration: 30,
              appointmentType: 'consultation',
            });

            await sendEmail({
              to: [leadEmail],
              from: process.env.FROM_EMAIL || 'noreply@lockinloans.com',
              subject: `Appointment Confirmed - ${appointmentDate.toLocaleDateString()}`,
              html: confirmationHtml,
            });

            await db.update(appointments)
              .set({ confirmationSent: true })
              .where(eq(appointments.id, appointmentId));

            console.log('[Vapi Webhook] Confirmation email sent to lead:', leadEmail);
          } catch (emailError) {
            console.error('[Vapi Webhook] Failed to send confirmation email to lead:', emailError);
          }
        }
      } else {
        // No appointment booked — update lead status based on call outcome
        if (leadId) {
          try {
            await db.update(leads)
              .set({ status: 'contacted' as any })
              .where(eq(leads.id, leadId));
          } catch (err) {
            console.error('[Vapi Webhook] Error updating lead status:', err);
          }
        }
        // Send push notification for call completed without appointment
        try {
          await pushVapiCallCompleted({
            firstName,
            lastName,
            phone: customerNumber,
            callDuration,
            callSummary,
            outcome: 'No appointment booked - follow up needed',
          });
        } catch (pushErr) {
          console.error('[Vapi Webhook] Push notification failed:', pushErr);
        }
        console.log(`[Vapi Webhook] Call completed without appointment booking for ${customerNumber}`);
      }

      return res.status(200).json({ received: true });
    }

    // Handle function-call event (Vapi tool calls)
    if (eventType === 'function-call') {
      const functionCall = event.message?.functionCall || event.functionCall || {};
      console.log('[Vapi Webhook] Function call:', functionCall.name, functionCall.parameters);
      
      // Handle get_available_slots function
      if (functionCall.name === 'get_available_slots') {
        // Return available appointment slots based on Tim's schedule
        // TODO: integrate with dynamic weekly schedule
        const slots = getDefaultAvailableSlots();
        return res.status(200).json({ result: JSON.stringify(slots) });
      }

      return res.status(200).json({ result: 'ok' });
    }

    // Handle all other event types
    console.log('[Vapi Webhook] Event type:', eventType);
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('[Vapi Webhook] Error processing webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Extract appointment date from transcript text when structured data is unavailable
 */
function extractDateFromTranscript(text: string): Date {
  const lower = text.toLowerCase();
  const now = new Date();
  
  // Check for "tomorrow"
  if (lower.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Try to extract time
    const timeMatch = lower.match(/(\d{1,2})\s*(?::?\s*(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2] || '0');
      const ampm = timeMatch[3];
      
      if (ampm && (ampm.includes('p') || ampm.includes('P')) && hour < 12) hour += 12;
      if (ampm && (ampm.includes('a') || ampm.includes('A')) && hour === 12) hour = 0;
      
      // If no am/pm specified and hour <= 7, assume PM (business hours)
      if (!ampm && hour <= 7) hour += 12;
      
      tomorrow.setHours(hour, minute, 0, 0);
    } else {
      tomorrow.setHours(10, 0, 0, 0); // Default 10 AM
    }
    
    return tomorrow;
  }
  
  // Default: next business day at 10 AM
  return getDefaultAppointmentDate();
}

/**
 * Get default appointment date (next business day at 10 AM PST)
 */
function getDefaultAppointmentDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  
  // Skip weekends
  const day = date.getDay();
  if (day === 0) date.setDate(date.getDate() + 1); // Sunday → Monday
  if (day === 6) date.setDate(date.getDate() + 2); // Saturday → Monday
  
  date.setHours(10, 0, 0, 0);
  return date;
}

/**
 * Get default available appointment slots for the next 5 business days
 */
function getDefaultAvailableSlots(): { date: string; times: string[] }[] {
  const slots: { date: string; times: string[] }[] = [];
  const now = new Date();
  let daysAdded = 0;
  let currentDate = new Date(now);
  
  while (daysAdded < 5) {
    currentDate.setDate(currentDate.getDate() + 1);
    const day = currentDate.getDay();
    if (day === 0 || day === 6) continue; // Skip weekends
    
    slots.push({
      date: currentDate.toISOString().split('T')[0],
      times: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
    });
    daysAdded++;
  }
  
  return slots;
}
