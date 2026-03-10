import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { leads, facebookPageConfigs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { scheduleLeadFollowUp } from "../lead-automation";

/**
 * Facebook Lead Ads Webhook Router
 * Handles incoming leads from Facebook instant forms
 * Tokens are stored per-page in the facebook_page_configs table
 */

export const facebookLeadsRouter = router({
  /**
   * Webhook verification endpoint (required by Facebook)
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
   * Receive webhook from Facebook — looks up token and client by page ID
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
        return { success: true, message: "Not a page event" };
      }

      for (const entry of input.entry) {
        for (const change of entry.changes) {
          if (change.field !== "leadgen") continue;

          const leadgenId = change.value.leadgen_id;
          const pageId = change.value.page_id ?? entry.id;

          console.log(`[Facebook Webhook] Processing lead: ${leadgenId} from page: ${pageId}`);

          try {
            // Look up the page config (token + client) from DB
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const configs = await db
              .select()
              .from(facebookPageConfigs)
              .where(eq(facebookPageConfigs.pageId, pageId))
              .limit(1);

            const config = configs[0];
            if (!config) {
              console.warn(`[Facebook Webhook] No config found for page ${pageId} — using fallback`);
            }

            const accessToken = config?.pageAccessToken ?? process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
            const clientId = config?.clientId ?? null;
            const agencyId = config?.agencyId ?? 1;

            if (!accessToken) {
              console.error(`[Facebook Webhook] No access token for page ${pageId}`);
              continue;
            }

            // Fetch real lead data from Facebook Graph API
            const leadData = await fetchLeadFromFacebook(leadgenId, accessToken);

            // Create lead in CRM with correct client assignment
            await createLeadFromFacebook(leadData, agencyId, clientId);

            console.log(`[Facebook Webhook] Lead ${leadgenId} processed for client ${clientId}`);
          } catch (error) {
            console.error(`[Facebook Webhook] Error processing lead ${leadgenId}:`, error);
          }
        }
      }

      return { success: true, message: "Webhook processed" };
    }),

  /**
   * List all Facebook page configs (admin only)
   */
  listPageConfigs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const configs = await db.select().from(facebookPageConfigs).orderBy(facebookPageConfigs.createdAt);
    // Mask the token for display
    return configs.map(c => ({
      ...c,
      pageAccessToken: c.pageAccessToken ? "••••••" + c.pageAccessToken.slice(-6) : "",
    }));
  }),

  /**
   * Save or update a Facebook page config
   */
  savePageConfig: protectedProcedure
    .input(
      z.object({
        pageId: z.string().min(1),
        pageName: z.string().optional(),
        pageAccessToken: z.string().min(10),
        clientId: z.number().optional(),
        agencyId: z.number().default(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if config already exists for this page
      const existing = await db
        .select()
        .from(facebookPageConfigs)
        .where(eq(facebookPageConfigs.pageId, input.pageId))
        .limit(1);

      if (existing[0]) {
        // Update existing
        await db
          .update(facebookPageConfigs)
          .set({
            pageName: input.pageName,
            pageAccessToken: input.pageAccessToken,
            clientId: input.clientId ?? null,
            agencyId: input.agencyId,
            isActive: true,
          })
          .where(eq(facebookPageConfigs.pageId, input.pageId));
      } else {
        // Insert new
        await db.insert(facebookPageConfigs).values({
          pageId: input.pageId,
          pageName: input.pageName,
          pageAccessToken: input.pageAccessToken,
          clientId: input.clientId ?? null,
          agencyId: input.agencyId,
          isActive: true,
        });
      }

      return { success: true };
    }),

  /**
   * Delete a Facebook page config
   */
  deletePageConfig: protectedProcedure
    .input(z.object({ pageId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(facebookPageConfigs).where(eq(facebookPageConfigs.pageId, input.pageId));
      return { success: true };
    }),

  /**
   * Manual test endpoint to simulate Facebook lead
   */
  testWebhook: protectedProcedure
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string(),
        source: z.string().optional(),
        clientId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const clientId = input.clientId ?? 60002; // Default to Tim
      const agencyId = 1;

      const [lead] = await db.insert(leads).values({
        clientId,
        agencyId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        source: input.source || "facebook_test",
        status: "new",
        pipelineStage: "new",
        contactType: "borrower",
      });

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
 * Fetch lead data from Facebook Graph API using the page access token
 */
async function fetchLeadFromFacebook(leadgenId: string, accessToken: string) {
  const url = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Facebook API error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  const leadData: Record<string, string | undefined> & { leadgenId: string; createdTime?: string } = {
    leadgenId,
    createdTime: data.created_time,
  };

  for (const field of data.field_data || []) {
    const name = (field.name as string).toLowerCase();
    const value = field.values?.[0] as string | undefined;

    if (name.includes("first") && name.includes("name")) {
      leadData.firstName = value;
    } else if (name.includes("last") && name.includes("name")) {
      leadData.lastName = value;
    } else if (name.includes("full") && name.includes("name")) {
      const parts = (value ?? "").split(" ");
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
 * Create lead in CRM from Facebook data with correct client assignment
 */
async function createLeadFromFacebook(
  leadData: Record<string, string | undefined> & { leadgenId: string },
  agencyId: number,
  clientId: number | null
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [lead] = await db.insert(leads).values({
    clientId: clientId ?? undefined,
    agencyId,
    firstName: leadData.firstName || "Unknown",
    lastName: leadData.lastName || "Lead",
    email: leadData.email,
    phone: leadData.phone,
    source: "facebook_lead_ads",
    status: "new",
    pipelineStage: "new",
    contactType: "borrower",
    customFields: JSON.stringify({
      facebookLeadgenId: leadData.leadgenId,
      facebookCreatedTime: leadData.createdTime,
    }),
  });

  console.log(`[Facebook Webhook] Created lead ID: ${lead.insertId} for client ${clientId}`);

  if (leadData.phone) {
    await scheduleLeadFollowUp(
      lead.insertId,
      leadData.phone,
      leadData.firstName || "Unknown",
      "facebook_lead_ads",
      clientId ?? 0
    );
  }

  return lead.insertId;
}
