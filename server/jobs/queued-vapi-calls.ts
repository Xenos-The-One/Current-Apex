/**
 * Queued Vapi Calls Cron Job
 * 
 * Processes leads that came in outside business hours.
 * Runs every 15 minutes to check if business hours have started.
 * 
 * Per-client control: Only calls leads whose client has `vapi_calls_enabled = true`.
 * Tim Haskins (client_id=1) has vapi_calls_enabled=false — he handles all calls manually.
 * New clients default to vapi_calls_enabled=true.
 */

import { getDb } from "../db";
import { leads, clients } from "../../drizzle/schema";
import { isWithinBusinessHours, getNextBusinessHoursStart } from "../business-hours";
import { getAssistantIdForLeadSource, getAssistantNameForSource } from "../vapi-assistant-mapper";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { isTestLead, logTestLeadSuppression } from "../test-lead-utils";

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || 'c9eaefc4-9227-439d-bb16-a79c2797ab58';

async function triggerVapiCall(lead: any): Promise<boolean> {
  const assistantId = getAssistantIdForLeadSource(lead.source);
  const assistantName = getAssistantNameForSource(lead.source);

  if (!assistantId) {
    console.error(`[Queued Calls] ❌ No assistant configured for source: ${lead.source}`);
    return false;
  }

  console.log(`[Queued Calls] Using ${assistantName} assistant for lead from source: ${lead.source}`);

  try {
    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: assistantId,
        phoneNumberId: PHONE_NUMBER_ID,
        customer: {
          number: lead.phone,
          name: `${lead.firstName} ${lead.lastName}`,
        },
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`[Queued Calls] ✅ Call initiated for ${lead.firstName} ${lead.lastName}: ${data.id}`);
      return true;
    } else {
      console.error(`[Queued Calls] ❌ Failed to call ${lead.firstName} ${lead.lastName}:`, data.message);
      return false;
    }
  } catch (error: any) {
    console.error(`[Queued Calls] ❌ Error calling ${lead.firstName} ${lead.lastName}:`, error.message);
    return false;
  }
}

export async function processQueuedVapiCalls() {
  console.log("[Queued Calls] Checking for queued leads...");

  // Only process if we're within business hours
  if (!isWithinBusinessHours()) {
    const nextStart = getNextBusinessHoursStart();
    console.log(`[Queued Calls] Outside business hours. Next check at ${nextStart.toLocaleString()}`);
    return;
  }

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Queued Calls] Database not available");
      return;
    }

    // Get all clients that have Vapi calls enabled
    const vapiEnabledClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.vapiCallsEnabled, true));

    if (vapiEnabledClients.length === 0) {
      console.log("[Queued Calls] No clients have Vapi calls enabled — nothing to process");
      return;
    }

    const enabledClientIds = vapiEnabledClients.map(c => c.id);
    console.log(`[Queued Calls] Vapi-enabled clients: ${enabledClientIds.join(', ')}`);

    // Find leads that haven't been called yet, only for Vapi-enabled clients
    const queuedLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.status, "new" as any),
          isNull(leads.vapiCallInitiated),
          inArray(leads.clientId, enabledClientIds)
        )
      )
      .limit(10); // Process max 10 at a time

    if (queuedLeads.length === 0) {
      console.log("[Queued Calls] No queued leads to process");
      return;
    }

    console.log(`[Queued Calls] Found ${queuedLeads.length} queued leads to call`);

    for (const lead of queuedLeads) {
      // Skip test leads — mark as initiated so they don't loop, but don't actually call
      if (isTestLead(lead)) {
        logTestLeadSuppression("vapi", lead, "queued-vapi-calls");
        await db.update(leads).set({ vapiCallInitiated: new Date() }).where(eq(leads.id, lead.id));
        continue;
      }

      // Mark as call initiated (even if it fails, we don't want to retry immediately)
      await db
        .update(leads)
        .set({ vapiCallInitiated: new Date() })
        .where(eq(leads.id, lead.id));

      // Trigger the call
      const success = await triggerVapiCall(lead);

      if (success) {
        await db
          .update(leads)
          .set({ 
            status: "contacted" as any,
            lastContactDate: new Date(),
          })
          .where(eq(leads.id, lead.id));
      }

      // Wait 2 seconds between calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log("[Queued Calls] Queued calls processing completed");
  } catch (error) {
    console.error("[Queued Calls] Error processing queued calls:", error);
  }
}

// Run every 15 minutes
setInterval(processQueuedVapiCalls, 15 * 60 * 1000);

// Run immediately on startup
processQueuedVapiCalls();
