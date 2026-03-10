/**
 * Backfill script: Fetch real lead data from Facebook API for existing placeholder leads
 * Also saves Tim's and Kyle's page configs to the database
 */
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const TIM_TOKEN = 'EAAvwgCNktpQBQ8YOxv04oLy1rEmv4P3jylmQyEt0JlqI3zDr8Ya1w1tzU4afFNdqWE287tsV0C8ZBW4YWheWzlTbOMVCoeXwxOl2qBZBqDfBpB7LmxW5ZCYsLCzAqHZCs6QVpaJFWzgtvEuXX2h2foPvHp3hLdSWdfj7iURFU3VKSJDH27ZChqeDi7ZB2hpwybFRDjqWzFnE2gsSXRT0hlG0PXx8bMIQc4614EbcgfSex9Jng4uZACepUDkhBQZD';
const KYLE_TOKEN = 'EAALkIuCb5CMBQxKpVHcXJAUcdlC0N03nGxOve2ZBv1AzC1y00la5SxJyu12VOrhcbfHrFezZB2KX4e7WZBLoNfELfMoQmYM90INszHiiWLWblbOQZAOOC4QENIHikcZBFe2ZAr4yocoRagnkS1syJw3Dpbnn4v2Yo1qMuW5xZA2gR62tNrliqcT6eanR0c4sCZCbXjx33UxfdloZCXXJDmR3CZAlaaMprji7fhYMCf52xrhFI3WQFv73CtvPE3ee78h4ZAyXXpcxMzN8rlLZC5ZAk0l6gyNL3';

const TIM_PAGE_ID = '500444413143324';
const KYLE_PAGE_ID = '61586221872067';
const TIM_CLIENT_ID = 60002;
const KYLE_CLIENT_ID = 60001;
const AGENCY_ID = 1;

async function fetchLeadFromFacebook(leadgenId, accessToken) {
  const url = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    const errText = await response.text();
    console.error(`Facebook API error for ${leadgenId}: ${response.status} ${errText}`);
    return null;
  }
  
  const data = await response.json();
  console.log(`Raw Facebook data for ${leadgenId}:`, JSON.stringify(data, null, 2));
  
  const result = { leadgenId, createdTime: data.created_time };
  
  for (const field of data.field_data || []) {
    const name = field.name.toLowerCase();
    const value = field.values?.[0];
    
    if (name.includes('first') && name.includes('name')) result.firstName = value;
    else if (name.includes('last') && name.includes('name')) result.lastName = value;
    else if (name.includes('full') && name.includes('name')) {
      const parts = (value || '').split(' ');
      result.firstName = parts[0];
      result.lastName = parts.slice(1).join(' ') || parts[0];
    } else if (name.includes('email')) result.email = value;
    else if (name.includes('phone')) result.phone = value;
  }
  
  return result;
}

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  
  // 1. Save Tim's page config
  console.log('\n=== Saving Tim page config ===');
  await conn.execute(
    `INSERT INTO facebook_page_configs (agency_id, client_id, page_id, page_name, page_access_token, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE page_access_token = VALUES(page_access_token), client_id = VALUES(client_id), page_name = VALUES(page_name)`,
    [AGENCY_ID, TIM_CLIENT_ID, TIM_PAGE_ID, 'Tim Haskins - Premier Mortgage', TIM_TOKEN]
  );
  console.log('✓ Tim page config saved (page', TIM_PAGE_ID, '→ client', TIM_CLIENT_ID, ')');
  
  // 2. Save Kyle's page config
  console.log('\n=== Saving Kyle page config ===');
  await conn.execute(
    `INSERT INTO facebook_page_configs (agency_id, client_id, page_id, page_name, page_access_token, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE page_access_token = VALUES(page_access_token), client_id = VALUES(client_id), page_name = VALUES(page_name)`,
    [AGENCY_ID, KYLE_CLIENT_ID, KYLE_PAGE_ID, 'Kyle Dombecki - Optimal Lending', KYLE_TOKEN]
  );
  console.log('✓ Kyle page config saved (page', KYLE_PAGE_ID, '→ client', KYLE_CLIENT_ID, ')');
  
  // 3. Backfill existing Facebook leads with real data
  console.log('\n=== Backfilling existing Facebook leads ===');
  const realLeads = [
    { id: 4, leadgenId: '814217975044402', processedLeadId: 60012, token: TIM_TOKEN, clientId: TIM_CLIENT_ID },
    { id: 5, leadgenId: '2743159119372982', processedLeadId: 60013, token: TIM_TOKEN, clientId: TIM_CLIENT_ID },
  ];
  
  for (const lead of realLeads) {
    console.log(`\nFetching lead ${lead.leadgenId}...`);
    const data = await fetchLeadFromFacebook(lead.leadgenId, lead.token);
    
    if (!data) {
      console.log(`⚠️  Could not fetch lead ${lead.leadgenId} — skipping`);
      continue;
    }
    
    // Update facebook_lead_ads record
    await conn.execute(
      `UPDATE facebook_lead_ads SET first_name = ?, last_name = ?, email = ?, phone = ? WHERE id = ?`,
      [data.firstName || 'Unknown', data.lastName || 'Lead', data.email || null, data.phone || null, lead.id]
    );
    
    // Update the processed lead in the leads table
    if (lead.processedLeadId) {
      await conn.execute(
        `UPDATE leads SET first_name = ?, last_name = ?, email = ?, phone = ?, client_id = ?, agency_id = ? WHERE id = ?`,
        [data.firstName || 'Unknown', data.lastName || 'Lead', data.email || null, data.phone || null, lead.clientId, AGENCY_ID, lead.processedLeadId]
      );
      console.log(`✓ Updated lead ${lead.processedLeadId}: ${data.firstName} ${data.lastName} | ${data.email} | ${data.phone}`);
    }
  }
  
  // 4. Verify final state
  console.log('\n=== Final state ===');
  const [configs] = await conn.query('SELECT page_id, page_name, client_id FROM facebook_page_configs');
  console.log('Page configs:', JSON.stringify(configs, null, 2));
  
  const [leads] = await conn.query('SELECT id, first_name, last_name, email, phone, client_id FROM leads WHERE id IN (60012, 60013)');
  console.log('Updated leads:', JSON.stringify(leads, null, 2));
  
  await conn.end();
  console.log('\n✅ Backfill complete!');
}

main().catch(e => { console.error('Error:', e); process.exit(1); });
