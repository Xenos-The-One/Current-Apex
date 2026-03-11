/**
 * Facebook Lead Ads Webhook
 * GET  /api/webhooks/facebook  — verification challenge
 * POST /api/webhooks/facebook  — incoming lead event
 *
 * Lead routing:
 *   1. Look up the page_id in facebook_page_configs to find which client owns this page.
 *   2. Fetch real lead data from the Facebook Graph API using the page-specific access token.
 *   3. Create the lead in the CRM assigned to the correct client.
 *   4. Apply the page's leadTag automatically.
 *   5. Trigger the automation sequence:
 *      a. If within business hours → schedule VAPI call in 5 min (if autoVapiCall = true)
 *      b. If outside business hours → send after-hours SMS (if autoSms = true) + schedule call for 9 AM
 *
 * Both Kyle Dombecki (Optimal Lending, page 61586221872067) and
 * Tim Haskins (Premier Mortgage, page 500444413143324) are already configured
 * in facebook_page_configs with client_id mappings.
 */
import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { leads, clients, facebookPageConfigs } from "../../drizzle/schema";
import { getDb } from "../db";
import { pushFacebookLead } from "../push-triggers";
import { scheduleLeadFollowUp } from "../lead-automation";
import { createLeadActivity } from "../db";

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN ?? "manus_crm_verify";

// ─── Webhook verification (GET) ───────────────────────────────────────────────
export async function facebookWebhookVerify(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Facebook] Webhook verified ✓");
    res.status(200).send(challenge);
  } else {
    console.warn("[Facebook] Webhook verification failed — token mismatch");
    res.sendStatus(403);
  }
}

// ─── Webhook event handler (POST) ─────────────────────────────────────────────
export async function facebookWebhookHandler(req: Request, res: Response) {
  const body = req.body;

  if (body.object !== "page") {
    return res.sendStatus(404);
  }

  // Always respond 200 immediately so Facebook doesn't retry
  res.sendStatus(200);

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Facebook] Database not available");
      return;
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;

        const leadgenId: string = change.value?.leadgen_id;
        const pageId: string = change.value?.page_id ?? entry.id;
        const formId: string | undefined = change.value?.form_id?.toString();
        const adId: string | undefined = change.value?.ad_id?.toString();

        if (!leadgenId) continue;

        console.log(`[Facebook] Processing lead ${leadgenId} from page ${pageId} form ${formId ?? "unknown"}`);

        try {
          // ── 1. Look up page config ──────────────────────────────────────
          const configs = await db
            .select()
            .from(facebookPageConfigs)
            .where(eq(facebookPageConfigs.pageId, pageId))
            .limit(1);

          const config = configs[0];

          if (!config) {
            console.warn(`[Facebook] No config for page ${pageId} — lead will be created under agency 1 with no client assignment`);
          }

          const accessToken = config?.pageAccessToken ?? process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
          const clientId = config?.clientId ?? null;
          const agencyId = config?.agencyId ?? 1;

          if (!accessToken) {
            console.error(`[Facebook] No access token for page ${pageId} — cannot fetch lead data`);
            continue;
          }

          // ── 2. Fetch real lead data from Facebook Graph API ─────────────
          const leadData = await fetchLeadFromFacebook(leadgenId, accessToken);
          if (!leadData) {
            console.error(`[Facebook] Failed to fetch lead data for ${leadgenId}`);
            continue;
          }

          // ── 3. Resolve client info for SMS template ─────────────────────
          let clientName = "Your Loan Officer";
          let bookingSlug = "";
          if (clientId) {
            const clientRows = await db.select({
              name: clients.name,
              bookingSlug: clients.bookingSlug,
            }).from(clients).where(eq(clients.id, clientId)).limit(1);
            if (clientRows[0]) {
              clientName = clientRows[0].name;
              bookingSlug = clientRows[0].bookingSlug ?? "";
            }
          }

          const bookingUrl = bookingSlug
            ? `${process.env.VITE_APP_URL || "https://crmplatform-rus3etbp.manus.space"}/book/${bookingSlug}`
            : `${process.env.VITE_APP_URL || "https://crmplatform-rus3etbp.manus.space"}/book`;

          // ── 4. Build tags array ─────────────────────────────────────────
          const tags: string[] = ["Facebook Ad Lead"];
          if (config?.leadTag && config.leadTag !== "Facebook Ad Lead") {
            tags.push(config.leadTag);
          }
          if (formId) tags.push(`Form:${formId}`);

          // ── 5. Create lead in CRM ───────────────────────────────────────
          const insertResult = await db.insert(leads).values({
            clientId: clientId ?? undefined,
            agencyId,
            firstName: leadData.firstName || "Unknown",
            lastName: leadData.lastName || "Lead",
            email: leadData.email ?? null,
            phone: leadData.phone ?? null,
            source: "facebook_lead_ads",
            status: "new",
            pipelineStage: "new",
            contactType: "borrower",
            tags: JSON.stringify(tags),
            customFields: JSON.stringify({
              facebookLeadgenId: leadgenId,
              facebookPageId: pageId,
              facebookFormId: formId,
              facebookAdId: adId,
              facebookCreatedTime: leadData.createdTime,
            }),
          } as any);

          const leadId = (insertResult as any)[0]?.insertId;

          console.log(`[Facebook] ✅ Lead #${leadId} created — ${leadData.firstName} ${leadData.lastName} → client ${clientId} (${clientName})`);

          // ── 6. Log activity ─────────────────────────────────────────────
          if (leadId) {
            await createLeadActivity({
              leadId,
              activityType: "note",
              description: `Lead received from Facebook Lead Ads. Page: ${config?.pageName ?? pageId}. Form ID: ${formId ?? "unknown"}`,
              performedBy: agencyId,
            });
          }

          // ── 7. Push notification ────────────────────────────────────────
          try {
            await pushFacebookLead({
              firstName: leadData.firstName || "Unknown",
              lastName: leadData.lastName || "Lead",
              phone: leadData.phone,
              email: leadData.email,
              formId,
            });
          } catch (pushErr) {
            console.error("[Facebook] Push notification failed:", pushErr);
          }

          // ── 8. Trigger automation sequence ──────────────────────────────
          if (leadId && leadData.phone) {
            const shouldVapi = config?.autoVapiCall !== false;
            const shouldSms = config?.autoSms !== false;
            const customSmsTemplate = config?.smsTemplate;
            const vapiAssistantOverride = config?.vapiAssistantId;

            // Build custom SMS if template is provided
            if (shouldSms && customSmsTemplate) {
              const smsBody = customSmsTemplate
                .replace(/\{\{firstName\}\}/g, leadData.firstName || "there")
                .replace(/\{\{clientName\}\}/g, clientName)
                .replace(/\{\{bookingUrl\}\}/g, bookingUrl);

              // Store the custom SMS template on the lead for the automation to use
              await db.update(leads)
                .set({ notes: `[Custom SMS Template]\n${smsBody}` } as any)
                .where(eq(leads.id, leadId));
            }

            // Store VAPI assistant override on lead if configured
            if (vapiAssistantOverride) {
              await db.update(leads)
                .set({ vapiAssistantId: vapiAssistantOverride } as any)
                .where(eq(leads.id, leadId));
            }

            if (shouldVapi || shouldSms) {
              await scheduleLeadFollowUp(
                leadId,
                leadData.phone,
                leadData.firstName || "Unknown",
                "facebook_lead_ads",
                clientId ?? undefined
              );
              console.log(`[Facebook] Automation triggered for lead #${leadId} (VAPI: ${shouldVapi}, SMS: ${shouldSms})`);
            }
          } else if (leadId && !leadData.phone) {
            console.warn(`[Facebook] Lead #${leadId} has no phone — skipping VAPI/SMS automation`);
          }

        } catch (leadErr) {
          console.error(`[Facebook] Error processing lead ${leadgenId}:`, leadErr);
        }
      }
    }
  } catch (err) {
    console.error("[Facebook] Webhook processing error:", err);
  }
}

// ─── Fetch lead data from Facebook Graph API ──────────────────────────────────
async function fetchLeadFromFacebook(leadgenId: string, accessToken: string): Promise<{
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  createdTime?: string;
} | null> {
  try {
    const url = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Facebook] Graph API error ${response.status}: ${errText}`);
      return null;
    }

    const data = await response.json();
    const fields: Record<string, string> = {};

    for (const field of data.field_data ?? []) {
      const name = (field.name as string).toLowerCase();
      const value = (field.values?.[0] as string) ?? "";
      fields[name] = value;
    }

    // Parse name — handle full_name, first_name/last_name combinations
    let firstName = fields["first_name"] ?? "";
    let lastName = fields["last_name"] ?? "";

    if (!firstName && fields["full_name"]) {
      const parts = fields["full_name"].trim().split(/\s+/);
      firstName = parts[0] ?? "";
      lastName = (parts.slice(1).join(" ") || parts[0]) ?? "";
    }

    const email = fields["email"] || fields["email_address"] || undefined;
    const phone = fields["phone_number"] || fields["phone"] || fields["mobile_number"] || undefined;

    return {
      firstName: firstName || "Unknown",
      lastName: lastName || "Lead",
      email: email || undefined,
      phone: phone || undefined,
      createdTime: data.created_time,
    };
  } catch (err) {
    console.error(`[Facebook] Error fetching lead ${leadgenId}:`, err);
    return null;
  }
}
