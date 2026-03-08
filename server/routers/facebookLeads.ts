import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { scheduleLeadFollowUp } from "../lead-automation";

/**
 * Facebook Lead Ads Webhook Router
 * Handles incoming leads from Facebook instant forms
 */

export const facebookLeadsRouter = router({
  /**
   * Webhook verification endpoint (required by Facebook)
   * Facebook will call this with hub.mode=subscribe and hub.verify_token
   */
  verifyWebhook: publicProcedure
    .input(
      z.object({
        mode: z.string(),
        token: z.string(),
        challenge: z.string(),
      })
    )
    .query(({ input }) => {
      const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || "sterling_marketing_webhook_2024";
      
      if (input.mode === "subscribe" && input.token === VERIFY_TOKEN) {
        console.log("[Facebook Webhook] Verification successful");
        return { challenge: input.challenge };
      } else {
        console.error("[Facebook Webhook] Verification failed");
        throw new Error("Verification failed");
      }
    }),

  /**
   * Webhook endpoint to receive lead data from Facebook
   * Facebook sends POST requests when new leads are captured
   */
  receiveWebhook: publicProcedure
    .input(
      z.object({
        object: z.string(),
        entry: z.array(
          z.object({
            id: z.string(),
            time: z.number(),
            changes: z.array(
              z.object({
                value: z.object({
                  ad_id: z.string().optional(),
                  form_id: z.string().optional(),
                  leadgen_id: z.string(),
                  created_time: z.number(),
                  page_id: z.string().optional(),
                  adgroup_id: z.string().optional(),
                }),
                field: z.string(),
              })
            ),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      console.log("[Facebook Webhook] Received webhook:", JSON.stringify(input, null, 2));

      if (input.object !== "page") {
        console.log("[Facebook Webhook] Not a page event, ignoring");
        return { success: true, message: "Not a page event" };
      }

      // Process each entry
      for (const entry of input.entry) {
        for (const change of entry.changes) {
          if (change.field === "leadgen") {
            const leadgenId = change.value.leadgen_id;
            console.log(`[Facebook Webhook] Processing lead: ${leadgenId}`);

            try {
              // Fetch lead data from Facebook Graph API
              const leadData = await fetchLeadFromFacebook(leadgenId);
              
              // Create lead in CRM
              await createLeadFromFacebook(leadData);
              
              console.log(`[Facebook Webhook] Lead ${leadgenId} processed successfully`);
            } catch (error) {
              console.error(`[Facebook Webhook] Error processing lead ${leadgenId}:`, error);
            }
          }
        }
      }

      return { success: true, message: "Webhook processed" };
    }),

  /**
   * Manual test endpoint to simulate Facebook lead
   */
  testWebhook: publicProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // For Tim's account (hardcoded for now)
      const clientId = 1; // Tim's client ID
      const agencyId = 1; // Premier Mortgage Resources

      const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [lead] = await db.insert(leads).values({
        clientId,
        agencyId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        source: input.source || "facebook_test",
        status: "new",
      });

      // Schedule Vapi follow-up call (respects per-client vapi_calls_enabled flag)
      await scheduleLeadFollowUp(
        lead.insertId,
        input.phone,
        input.firstName,
        input.source || "facebook_test",
        clientId
      );

      return {
        success: true,
        leadId: lead.insertId,
        message: "Test lead created and automation triggered",
      };
    }),
});

/**
 * Fetch lead data from Facebook Graph API
 */
async function fetchLeadFromFacebook(leadgenId: string) {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN not configured");
  }

  const url = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Facebook API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Parse field data into structured format
  const leadData: any = {
    leadgenId,
    createdTime: data.created_time,
  };

  for (const field of data.field_data || []) {
    const name = field.name.toLowerCase();
    const value = field.values[0];

    if (name.includes("first") && name.includes("name")) {
      leadData.firstName = value;
    } else if (name.includes("last") && name.includes("name")) {
      leadData.lastName = value;
    } else if (name.includes("full") && name.includes("name")) {
      // Split full name
      const parts = value.split(" ");
      leadData.firstName = parts[0];
      leadData.lastName = parts.slice(1).join(" ") || parts[0];
    } else if (name.includes("email")) {
      leadData.email = value;
    } else if (name.includes("phone")) {
      leadData.phone = value;
    }
  }

  return leadData;
}

/**
 * Create lead in CRM from Facebook data
 */
async function createLeadFromFacebook(leadData: any) {
  // For Tim's account (hardcoded for now - can be made dynamic later)
  const clientId = 1; // Tim's client ID
  const agencyId = 1; // Premier Mortgage Resources

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [lead] = await db.insert(leads).values({
    clientId,
    agencyId,
    firstName: leadData.firstName || "Unknown",
    lastName: leadData.lastName || "Lead",
    email: leadData.email,
    phone: leadData.phone,
    source: "facebook_lead_ads",
    status: "new",
    customFields: JSON.stringify({
      facebookLeadgenId: leadData.leadgenId,
      facebookCreatedTime: leadData.createdTime,
    }),
  });

  console.log(`[Facebook Webhook] Created lead ID: ${lead.insertId}`);

  // Schedule Vapi follow-up call (respects per-client vapi_calls_enabled flag)
  await scheduleLeadFollowUp(
    lead.insertId,
    leadData.phone || "",
    leadData.firstName || "Unknown",
    "facebook_lead_ads",
    clientId
  );

  return lead.insertId;
}
