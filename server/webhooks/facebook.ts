import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { facebookLeadAds, leads, leadSourceAssistantMappings } from "../../drizzle/schema";
import { getDb } from "../db";

/**
 * Facebook Lead Ads Webhook
 * GET  /api/webhooks/facebook  — verification challenge
 * POST /api/webhooks/facebook  — incoming lead event
 *
 * Set FACEBOOK_VERIFY_TOKEN in secrets to match the token you configure
 * in the Facebook App dashboard under Webhooks.
 */

const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN ?? "manus_crm_verify";

export async function facebookWebhookVerify(req: Request, res: Response) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Facebook] Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.warn("[Facebook] Webhook verification failed");
    res.sendStatus(403);
  }
}

export async function facebookWebhookHandler(req: Request, res: Response) {
  const body = req.body;

  if (body.object !== "page") {
    return res.sendStatus(404);
  }

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Facebook] Database not available");
      return res.sendStatus(500);
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue;

        const facebookLeadId: string = change.value?.leadgen_id;
        const pageId: string | undefined = change.value?.page_id?.toString();
        const formId: string | undefined = change.value?.form_id?.toString();
        const adId: string | undefined = change.value?.ad_id?.toString();

        if (!facebookLeadId) continue;

        // Find which agency owns this page/form mapping
        const mappings = await db.select()
          .from(leadSourceAssistantMappings)
          .where(eq(leadSourceAssistantMappings.leadSource, "facebook"))
          .limit(1);

        const agencyId = mappings[0]?.agencyId ?? 1; // fallback to agency 1

        // Store raw Facebook lead ad entry
        await db.insert(facebookLeadAds).values({
          agencyId,
          facebookLeadId,
          pageId,
          formId,
          adId,
          firstName: "Facebook",
          lastName: `Lead ${facebookLeadId.slice(-6)}`,
          rawData: change.value,
        }).onDuplicateKeyUpdate({ set: { rawData: change.value } });

        // Create a CRM lead from this Facebook lead
        const [leadResult] = await db.insert(leads).values({
          agencyId,
          source: "facebook_ads",
          pipelineStage: "new",
          status: "new",
          contactType: "borrower",
          firstName: "Facebook",
          lastName: `Lead ${facebookLeadId.slice(-6)}`,
          notes: `Facebook Lead Ads lead. Leadgen ID: ${facebookLeadId}. Form: ${formId ?? "unknown"}`,
        });

        // Update the facebookLeadAds record with the new CRM lead ID
        const newLeadId = (leadResult as any).insertId;
        if (newLeadId) {
          await db.update(facebookLeadAds)
            .set({ processedLeadId: newLeadId })
            .where(eq(facebookLeadAds.facebookLeadId, facebookLeadId));
        }

        console.log(`[Facebook] Processed lead ${facebookLeadId} for agency ${agencyId}`);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("[Facebook] Webhook processing error:", err);
    res.sendStatus(500);
  }
}
