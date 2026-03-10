import { Request, Response } from "express";
import mysql from "mysql2/promise";

/**
 * Facebook Lead Ads Webhook
 * GET  /api/webhooks/facebook  — Meta verification challenge
 * POST /api/webhooks/facebook  — incoming leadgen event
 *
 * Routing logic:
 *   1. Extract page_id from the webhook payload (entry[].id)
 *   2. Look up seo_clients.facebookPageId → seo_clients.crm_client_id
 *   3. Insert lead into `leads` table assigned to that client
 *
 * Required secrets (Settings → Secrets):
 *   FACEBOOK_VERIFY_TOKEN       — must match what you enter in Meta App Dashboard → Webhooks
 *   FACEBOOK_PAGE_ACCESS_TOKEN  — Page Access Token with leads_retrieval permission
 */

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN ?? "manus_crm_verify";

// ─── GET: Webhook Verification ───────────────────────────────────────────────
export async function facebookWebhookVerify(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Facebook] ✅ Webhook verified");
    return res.status(200).send(challenge);
  }
  console.warn("[Facebook] ❌ Webhook verification failed — token mismatch");
  return res.sendStatus(403);
}

// ─── POST: Lead Event Handler ─────────────────────────────────────────────────
export async function facebookWebhookHandler(req: Request, res: Response) {
  const body = req.body;

  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  if (body.object !== "page") return;

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(process.env.DATABASE_URL!);

    for (const entry of body.entry ?? []) {
      const pageId: string = entry.id?.toString() ?? "";

      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;

        const leadgenId: string = change.value?.leadgen_id?.toString() ?? "";
        const formId: string = change.value?.form_id?.toString() ?? "";
        const adId: string = change.value?.ad_id?.toString() ?? "";
        const adsetId: string = change.value?.adset_id?.toString() ?? "";
        const campaignId: string = change.value?.campaign_id?.toString() ?? "";

        if (!leadgenId) continue;

        console.log(`[Facebook] Incoming lead — page=${pageId} leadgen=${leadgenId} form=${formId}`);

        // ── 1. Route to correct client by page ID ─────────────────────────
        let clientId: number | null = null;
        const agencyId = 1;

        if (pageId) {
          const [rows] = await conn.query<mysql.RowDataPacket[]>(
            "SELECT crm_client_id FROM seo_clients WHERE facebookPageId = ? LIMIT 1",
            [pageId]
          );
          if (rows[0]?.crm_client_id) {
            clientId = rows[0].crm_client_id as number;
            console.log(`[Facebook] Routed to clientId=${clientId} (pageId=${pageId})`);
          } else {
            console.warn(`[Facebook] No client found for pageId=${pageId}`);
          }
        }

        // ── 2. Fetch full lead data from Graph API ────────────────────────
        let firstName = "Facebook";
        let lastName = `Lead ${leadgenId.slice(-6)}`;
        let email: string | null = null;
        let phone: string | null = null;
        let adName: string | null = null;
        let adsetName: string | null = null;
        let campaignName: string | null = null;
        let formName: string | null = null;

        const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
        if (accessToken) {
          try {
            const resp = await fetch(
              `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id&access_token=${accessToken}`
            );
            if (resp.ok) {
              const data = await resp.json() as any;
              for (const field of data.field_data ?? []) {
                const key = (field.name as string).toLowerCase();
                const val: string = field.values?.[0] ?? "";
                if (key === "first_name") firstName = val;
                else if (key === "last_name") lastName = val;
                else if (key === "full_name") {
                  const parts = val.trim().split(/\s+/);
                  firstName = parts[0];
                  lastName = parts.slice(1).join(" ") || parts[0];
                } else if (key === "email") email = val;
                else if (key.includes("phone")) phone = val;
              }
              adName = data.ad_name ?? null;
              adsetName = data.adset_name ?? null;
              campaignName = data.campaign_name ?? null;
              formName = data.form_id ?? null;
              console.log(`[Facebook] Fetched: ${firstName} ${lastName} <${email ?? "no email"}>`);
            } else {
              console.warn(`[Facebook] Graph API ${resp.status} for leadgen=${leadgenId}`);
            }
          } catch (err) {
            console.error("[Facebook] Graph API fetch error:", err);
          }
        } else {
          console.warn("[Facebook] FACEBOOK_PAGE_ACCESS_TOKEN not set — saving lead without contact details");
        }

        // ── 3. Insert lead into CRM ───────────────────────────────────────
        const [result] = await conn.query<mysql.ResultSetHeader>(
          `INSERT INTO leads (
            client_id, agency_id,
            first_name, last_name, email, phone,
            source, status, pipeline_type,
            facebook_lead_id, form_id, ad_id, adset_id, campaign_id,
            ad_name, campaign_name, form_name,
            utm_source, utm_medium,
            notes, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, 'facebook_ads', 'new', 'loan', ?, ?, ?, ?, ?, ?, ?, ?, 'facebook', 'paid_social', ?, NOW(), NOW())`,
          [
            clientId, agencyId,
            firstName, lastName, email, phone,
            leadgenId, formId || null, adId || null, adsetId || null, campaignId || null,
            adName, campaignName, formName,
            `Facebook Lead Ad\nPage: ${pageId}\nForm: ${formId}\nLead ID: ${leadgenId}`,
          ]
        );

        const newLeadId = result.insertId;
        console.log(`[Facebook] ✅ Lead #${newLeadId} created — ${firstName} ${lastName} → client ${clientId ?? "unassigned"}`);

        // ── 4. Also log to facebook_lead_ads table ────────────────────────
        try {
          await conn.query(
            `INSERT INTO facebook_lead_ads (agencyId, facebookLeadId, formId, pageId, adId, firstName, lastName, email, phone, processedLeadId, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE processedLeadId = VALUES(processedLeadId)`,
            [agencyId, leadgenId, formId || null, pageId || null, adId || null, firstName, lastName, email, phone, newLeadId]
          );
        } catch (logErr) {
          // Non-fatal — lead already created
          console.warn("[Facebook] Could not log to facebook_lead_ads:", (logErr as Error).message);
        }
      }
    }
  } catch (err) {
    console.error("[Facebook] Webhook processing error:", err);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
