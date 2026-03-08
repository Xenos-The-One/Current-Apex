/**
 * Lead Automation Service
 * Handles automated follow-up for leads based on business hours and appointment booking status
 */

import { getDb } from "./db";
import { leads, clients } from "../drizzle/schema";
import { eq, and, isNull, lt, inArray } from "drizzle-orm";
import { makeVapiCall } from "./vapi";
import { sendSMS } from "./twilio";
import { sendEmail } from "./sendgrid";
import { pushVapiCallInitiated } from "./push-triggers";

const BUSINESS_HOURS_START = 9; // 9 AM PST
const BUSINESS_HOURS_END = 22; // 10 PM PST
const VAPI_CALL_DELAY_MINUTES = 5;

/**
 * Check if current time is within business hours (9 AM - 10 PM PST, 7 days/week)
 */
export function isWithinBusinessHours(): boolean {
  const now = new Date();
  // Convert to PST (UTC-8)
  const pstOffset = -8 * 60; // PST is UTC-8
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const pstTime = new Date(utcTime + (pstOffset * 60000));
  
  const hour = pstTime.getHours();
  return hour >= BUSINESS_HOURS_START && hour < BUSINESS_HOURS_END;
}

/**
 * Get next business hours start time (next 9 AM PST)
 */
export function getNextBusinessHoursStart(): Date {
  const now = new Date();
  const pstOffset = -8 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const pstTime = new Date(utcTime + (pstOffset * 60000));
  
  // If before 9 AM today, return 9 AM today
  if (pstTime.getHours() < BUSINESS_HOURS_START) {
    pstTime.setHours(BUSINESS_HOURS_START, 0, 0, 0);
  } else {
    // Otherwise, return 9 AM tomorrow
    pstTime.setDate(pstTime.getDate() + 1);
    pstTime.setHours(BUSINESS_HOURS_START, 0, 0, 0);
  }
  
  // Convert back to UTC
  return new Date(pstTime.getTime() - (pstOffset * 60000) + (now.getTimezoneOffset() * 60000));
}

/**
 * Schedule Vapi call for a lead
 * - If within business hours: schedule call in 5 minutes
 * - If outside business hours: schedule call for next 9 AM + send SMS
 */
export async function scheduleLeadFollowUp(leadId: number, phone: string, firstName: string, source: string, clientId?: number) {
  const db = await getDb();
  if (!db) {
    console.error("[Lead Automation] Database unavailable");
    return;
  }

  // Check if this client has Vapi calls enabled
  if (clientId) {
    const [client] = await db.select({ vapiCallsEnabled: clients.vapiCallsEnabled })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    if (client && !client.vapiCallsEnabled) {
      console.log(`[Lead Automation] ⛔ Vapi calls disabled for client ${clientId} — skipping automated call for ${firstName}`);
      return;
    }
  }

  const withinHours = isWithinBusinessHours();
  
  if (withinHours) {
    // Within business hours: schedule Vapi call in 5 minutes
    const callTime = new Date(Date.now() + VAPI_CALL_DELAY_MINUTES * 60 * 1000);
    
    await db.update(leads)
      .set({ vapiCallScheduledAt: callTime })
      .where(eq(leads.id, leadId));
    
    console.log(`[Lead Automation] Vapi call scheduled for ${firstName} in ${VAPI_CALL_DELAY_MINUTES} minutes (${callTime.toISOString()})`);
    
    // Set timeout to make the call
    setTimeout(async () => {
      await processScheduledCall(leadId);
    }, VAPI_CALL_DELAY_MINUTES * 60 * 1000);
    
  } else {
    // Outside business hours: send SMS + schedule call for next 9 AM
    const nextCallTime = getNextBusinessHoursStart();
    
    await db.update(leads)
      .set({ 
        vapiCallScheduledAt: nextCallTime,
        afterHoursSmsSent: true 
      })
      .where(eq(leads.id, leadId));
    
    // Send after-hours SMS
    try {
      const bookingUrl = `${process.env.VITE_APP_URL || 'https://agency-crm.manus.space'}/book`;
      await sendSMS({
        to: phone,
        body: `Hi ${firstName}! Thanks for your interest in Premier Mortgage Resources. Book your consultation with Tim here: ${bookingUrl} or we'll call you tomorrow morning at 9 AM PST. - Tim Haskins, NMLS #1116876`
      });
      console.log(`[Lead Automation] After-hours SMS sent to ${firstName}`);
    } catch (error) {
      console.error("[Lead Automation] Failed to send after-hours SMS:", error);
    }
    
    console.log(`[Lead Automation] Vapi call scheduled for ${firstName} at next business hours: ${nextCallTime.toISOString()}`);
  }
}

/**
 * Process a scheduled Vapi call
 * Only makes the call if appointment hasn't been booked yet
 */
export async function processScheduledCall(leadId: number) {
  const db = await getDb();
  if (!db) {
    console.error("[Lead Automation] Database unavailable");
    return;
  }

  // Check if lead has booked appointment
  const [lead] = await db.select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  
  if (!lead) {
    console.error(`[Lead Automation] Lead ${leadId} not found`);
    return;
  }
  
  if (lead.appointmentBookedAt) {
    console.log(`[Lead Automation] Skipping call for ${lead.firstName} - appointment already booked at ${lead.appointmentBookedAt}`);
    return;
  }
  
  // Get assistant ID based on source
  const source = lead.source?.toLowerCase() || '';
  const assistantId = source.includes('facebook') || source.includes('fb')
    ? process.env.VAPI_FACEBOOK_LEAD_ASSISTANT_ID 
    : source.includes('instagram') || source.includes('ig')
    ? process.env.VAPI_IG_LEAD_ASSISTANT_ID
    : process.env.VAPI_REFERRAL_LEAD_ASSISTANT_ID;
  
  if (!assistantId) {
    console.error(`[Lead Automation] No assistant ID configured for source: ${lead.source}`);
    return;
  }
  
  if (!lead.phone) {
    console.error(`[Lead Automation] No phone number for lead ${leadId}`);
    return;
  }
  
  // Make Vapi call
  try {
    const callResponse = await makeVapiCall({
      assistantId,
      phoneNumber: lead.phone,
      customerName: `${lead.firstName} ${lead.lastName}`,
    });
    
    const callId = callResponse.id || callResponse.callId;
    
    // Update lead
    await db.update(leads)
      .set({ 
        vapiCallInitiated: new Date(),
        status: "contacted"
      })
      .where(eq(leads.id, leadId));
    
    // Create lead activity to track the call
    const { createLeadActivity } = await import("./db");
    await createLeadActivity({
      leadId,
      activityType: "call",
      description: `Vapi auto-call initiated (${lead.source})`,
      vapiCallId: callId,
      performedBy: lead.agencyId, // System-initiated
    });
    
    console.log(`[Lead Automation] Vapi call initiated for ${lead.firstName} ${lead.lastName} - Call ID: ${callId}`);
    
    // Send push notification that call was initiated
    try {
      await pushVapiCallInitiated({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        phone: lead.phone || '',
        source: lead.source || 'Unknown',
      });
    } catch (pushErr) {
      console.error(`[Lead Automation] Push notification failed:`, pushErr);
    }
  } catch (error: any) {
    // Log the full Vapi error response for debugging
    if (error?.response?.data) {
      console.error(`[Lead Automation] Vapi API error for lead ${leadId}:`, JSON.stringify(error.response.data));
    }
    console.error(`[Lead Automation] Failed to initiate Vapi call for lead ${leadId}:`, error?.message || error);
    
    // Log failed call attempt
    try {
      const { createLeadActivity } = await import("./db");
      await createLeadActivity({
        leadId,
        activityType: "note",
        description: `Vapi auto-call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        performedBy: lead.agencyId,
      });
    } catch (logError) {
      console.error(`[Lead Automation] Failed to log call failure:`, logError);
    }
  }
}

/**
 * Process all scheduled calls that are due
 * Should be called by cron job every minute
 */
export async function processScheduledCalls() {
  const db = await getDb();
  if (!db) {
    console.error("[Lead Automation] Database unavailable");
    return;
  }

  const now = new Date();
  
  // Get clients with Vapi calls enabled
  const vapiEnabledClients = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.vapiCallsEnabled, true));
  const enabledClientIds = vapiEnabledClients.map(c => c.id);

  if (enabledClientIds.length === 0) {
    console.log("[Lead Automation] No clients have Vapi calls enabled");
    return;
  }

  // Find leads with scheduled calls that are due and haven't booked appointments
  const dueLeads = await db.select()
    .from(leads)
    .where(
      and(
        isNull(leads.appointmentBookedAt),
        isNull(leads.vapiCallInitiated),
        lt(leads.vapiCallScheduledAt, now),
        inArray(leads.clientId, enabledClientIds)
      )
    )
    .limit(50);
  
  console.log(`[Lead Automation] Processing ${dueLeads.length} scheduled calls`);
  
  for (const lead of dueLeads) {
    await processScheduledCall(lead.id);
    // Add small delay between calls to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
