import type { Request, Response } from 'express';
import { getDb } from '../db';
import { leads, clients } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { pushFacebookLead } from '../push-triggers';
// import { scheduleLeadFollowUp } from '../lead-automation'; // Disabled - Tim handles calls manually

/**
 * Facebook Lead Ads Webhook Handler
 * 
 * Handles webhook verification (GET) and lead form submissions (POST)
 * from Facebook Lead Ads.
 */

export async function handleFacebookLeadsWebhook(req: Request, res: Response) {
  // GET request - Webhook verification
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    console.log('[Facebook Webhook] Verification request received', {
      mode,
      tokenMatch: token === process.env.FACEBOOK_VERIFY_TOKEN,
    });

    if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
      console.log('[Facebook Webhook] Verification successful');
      return res.status(200).send(challenge);
    } else {
      console.error('[Facebook Webhook] Verification failed - token mismatch');
      return res.status(403).send('Forbidden');
    }
  }

  // POST request - Lead form submission
  if (req.method === 'POST') {
    const body = req.body;

    console.log('[Facebook Webhook] Lead submission received', {
      object: body.object,
      entryCount: body.entry?.length,
    });

    // Verify this is a page subscription
    if (body.object !== 'page') {
      console.error('[Facebook Webhook] Invalid object type:', body.object);
      return res.status(400).send('Invalid object type');
    }

    try {
      // Process each entry in the webhook payload
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            const pageId = change.value.page_id;
            const formId = change.value.form_id;
            const createdTime = change.value.created_time;

            console.log('[Facebook Webhook] Processing leadgen', {
              leadgenId,
              pageId,
              formId,
              createdTime,
            });

            // Fetch lead data from Facebook Graph API
            const leadData = await fetchLeadData(leadgenId);

            if (leadData) {
              // Create lead in CRM
              await createLeadFromFacebook(leadData, pageId, formId);
            }
          }
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      console.error('[Facebook Webhook] Error processing webhook:', error);
      return res.status(500).send('Internal Server Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
}

/**
 * Fetch lead data from Facebook Graph API
 */
async function fetchLeadData(leadgenId: string) {
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('[Facebook Webhook] FACEBOOK_PAGE_ACCESS_TOKEN not configured');
    return null;
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[Facebook Webhook] Failed to fetch lead data:', response.statusText);
      return null;
    }

    const data = await response.json();
    console.log('[Facebook Webhook] Lead data fetched successfully', {
      id: data.id,
      fieldCount: data.field_data?.length,
    });

    return data;
  } catch (error) {
    console.error('[Facebook Webhook] Error fetching lead data:', error);
    return null;
  }
}

/**
 * Create lead in CRM from Facebook lead data
 */
async function createLeadFromFacebook(
  leadData: any,
  pageId: string,
  formId: string
) {
  try {
    // Parse field data from Facebook
    const fieldData: Record<string, string> = {};
    for (const field of leadData.field_data || []) {
      fieldData[field.name] = field.values?.[0] || '';
    }

    // Extract common fields
    const firstName = fieldData.first_name || fieldData.full_name?.split(' ')[0] || '';
    const lastName = fieldData.last_name || fieldData.full_name?.split(' ').slice(1).join(' ') || '';
    const email = fieldData.email || '';
    const phone = fieldData.phone_number || fieldData.phone || '';

    // Determine lead source based on form/page
    const source = 'Facebook Ad'; // Could be refined based on formId or pageId

    console.log('[Facebook Webhook] Creating lead in CRM', {
      firstName,
      lastName,
      email,
      phone,
      source,
    });

    // Get the first client (agency) to assign the lead to
    // In a multi-tenant system, you'd determine this based on pageId or formId
    const db = await getDb();
    if (!db) {
      console.error('[Facebook Webhook] Database not available');
      return;
    }

    const [client] = await db.select().from(clients).limit(1);

    if (!client) {
      console.error('[Facebook Webhook] No client found to assign lead to');
      return;
    }

    // Create lead in database
    const result = await db!.insert(leads).values({
      agencyId: client.agencyId,
      clientId: client.id,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      source,
      status: 'new',
      score: 0,
      notes: `Lead from Facebook Form ID: ${formId}\nPage ID: ${pageId}\nLead ID: ${leadData.id}`,
      createdAt: new Date(leadData.created_time || Date.now()),
    });

    // Get the insertId from the result
    const insertId = Number((result as any)[0]?.insertId || (result as any).insertId);
    const newLead = { id: insertId, clientId: client.id, agencyId: client.agencyId };

    console.log('[Facebook Webhook] Lead created successfully', {
      leadId: insertId,
      clientId: client.id,
      agencyId: client.agencyId,
    });

    // Send push notification for Facebook lead
    try {
      await pushFacebookLead({
        firstName,
        lastName,
        phone: phone || undefined,
        email: email || undefined,
        formId,
      });
    } catch (pushErr) {
      console.error('[Facebook Webhook] Push notification failed:', pushErr);
    }

    // Auto Vapi calls disabled - Tim handles calls manually now
    // Push notification above alerts Tim to call the lead himself
    console.log(`[Facebook Webhook] ✅ Lead #${insertId} created for ${firstName} - Tim will call manually`);

    return newLead;
  } catch (error) {
    console.error('[Facebook Webhook] Error creating lead:', error);
    throw error;
  }
}
