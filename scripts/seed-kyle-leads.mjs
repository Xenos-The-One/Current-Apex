/**
 * Seed sample leads for Kyle Dombecki (Optimal Lending Solutions)
 * to demonstrate the CRM pipeline with realistic DSCR/Fix&Flip/Construction leads.
 * Run: node scripts/seed-kyle-leads.mjs
 */
import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';

config();

const KYLE_CLIENT_ID = 60001;
const AGENCY_ID = 1;

const sampleLeads = [
  // DSCR Leads (from Facebook Ads)
  {
    first_name: 'Marcus', last_name: 'Williams', email: 'marcus.w@email.com', phone: '(702) 555-0142',
    status: 'new', source: 'facebook_ads', loan_type: 'purchase',
    property_type: 'Single-Family Rental', credit_score: 720,
    property_state: 'TX', property_city: 'Dallas',
    notes: 'Interested in DSCR loan for rental property. Has 3 existing rentals. Looking to add 4th.',
    campaign_name: 'DSCR Investor - Texas', utm_source: 'facebook', utm_medium: 'paid_social',
    pipeline_type: 'loan',
  },
  {
    first_name: 'Jennifer', last_name: 'Patel', email: 'jpatel@gmail.com', phone: '(480) 555-0188',
    status: 'contacted', source: 'facebook_ads', loan_type: 'purchase',
    property_type: 'Multi-Family', credit_score: 740,
    property_state: 'AZ', property_city: 'Phoenix',
    notes: 'Looking for DSCR on a duplex. Self-employed, traditional lenders declined. Strong rental income.',
    campaign_name: 'DSCR Investor - Arizona', utm_source: 'facebook', utm_medium: 'paid_social',
    pipeline_type: 'loan',
  },
  {
    first_name: 'Derek', last_name: 'Washington', email: 'derek.w@realestate.com', phone: '(404) 555-0267',
    status: 'qualified', source: 'facebook_ads', loan_type: 'purchase',
    property_type: 'Single-Family Rental', credit_score: 700,
    property_state: 'GA', property_city: 'Atlanta',
    notes: 'DSCR 1.3x on target property. Wants to close in 30 days. Has LLC ready.',
    campaign_name: 'DSCR Investor - Georgia', utm_source: 'instagram', utm_medium: 'paid_social',
    pipeline_type: 'loan',
  },
  {
    first_name: 'Carlos', last_name: 'Rivera', email: 'carlos.r@invest.com', phone: '(305) 555-0334',
    status: 'appointment_set', source: 'facebook_ads', loan_type: 'purchase',
    property_type: 'Single-Family Rental', credit_score: 730,
    property_state: 'FL', property_city: 'Miami',
    notes: 'Portfolio investor. Wants to refinance existing rental + purchase new one. Call scheduled for tomorrow.',
    campaign_name: 'DSCR Investor - Florida', utm_source: 'facebook', utm_medium: 'paid_social',
    pipeline_type: 'loan',
  },
  // Fix & Flip Leads
  {
    first_name: 'Amanda', last_name: 'Foster', email: 'amanda.f@flipper.com', phone: '(214) 555-0419',
    status: 'qualified', source: 'facebook_ads', loan_type: 'purchase',
    property_type: 'Fix & Flip', credit_score: 690,
    property_state: 'TX', property_city: 'Houston',
    notes: 'Experienced flipper, 12 flips completed. Needs $280K for acquisition + $95K rehab. ARV $520K.',
    campaign_name: 'Fix & Flip - Texas', utm_source: 'facebook', utm_medium: 'paid_social',
    pipeline_type: 'loan',
  },
  {
    first_name: 'Robert', last_name: 'Chen', email: 'rchen@gmail.com', phone: '(626) 555-0521',
    status: 'new', source: 'facebook_ads', loan_type: 'purchase',
    property_type: 'Fix & Flip', credit_score: 715,
    property_state: 'CA', property_city: 'Los Angeles',
    notes: 'First fix & flip. Has contractor lined up. Purchase $350K, rehab $120K, ARV $650K.',
    campaign_name: 'Fix & Flip - California', utm_source: 'instagram', utm_medium: 'paid_social',
    pipeline_type: 'loan',
  },
  // Construction Leads
  {
    first_name: 'Sarah', last_name: 'Mitchell', email: 'smitchell@developer.com', phone: '(512) 555-0632',
    status: 'contacted', source: 'facebook_ads', loan_type: 'construction',
    property_type: 'Ground-Up Construction', credit_score: 760,
    property_state: 'TX', property_city: 'Austin',
    notes: 'Building 4-unit townhome development. Land already owned. Total project budget $1.2M. Experienced developer.',
    campaign_name: 'Construction - Texas', utm_source: 'facebook', utm_medium: 'paid_social',
    pipeline_type: 'loan',
  },
  // Nurturing leads
  {
    first_name: 'Michael', last_name: 'Thompson', email: 'mthompson@email.com', phone: '(615) 555-0745',
    status: 'nurturing', source: 'facebook_ads', loan_type: 'purchase',
    property_type: 'Single-Family Rental', credit_score: 680,
    property_state: 'TN', property_city: 'Nashville',
    notes: 'Interested in DSCR but credit score needs work. Following up in 60 days.',
    campaign_name: 'DSCR Investor - Tennessee', utm_source: 'facebook', utm_medium: 'paid_social',
    pipeline_type: 'loan',
  },
];

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  console.log('✅ Connected to database');

  // Check if leads already exist for Kyle
  const [existing] = await conn.query(
    'SELECT COUNT(*) as count FROM leads WHERE client_id = ?', [KYLE_CLIENT_ID]
  );
  if (existing[0].count > 0) {
    console.log(`ℹ️  Kyle already has ${existing[0].count} leads. Skipping seed.`);
    await conn.end();
    return;
  }

  console.log(`\n🌱 Seeding ${sampleLeads.length} sample leads for Kyle Dombecki...`);

  for (const lead of sampleLeads) {
    await conn.query(
      `INSERT INTO leads (
        client_id, agency_id, first_name, last_name, email, phone,
        status, source, loan_type, property_type, credit_score,
        property_state, property_city, notes, campaign_name,
        utm_source, utm_medium, pipeline_type, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        KYLE_CLIENT_ID, AGENCY_ID,
        lead.first_name, lead.last_name, lead.email, lead.phone,
        lead.status, lead.source, lead.loan_type || null, lead.property_type || null,
        lead.credit_score || null, lead.property_state || null, lead.property_city || null,
        lead.notes || null, lead.campaign_name || null,
        lead.utm_source || null, lead.utm_medium || null, lead.pipeline_type || 'loan',
      ]
    );
    console.log(`  ✅ Created lead: ${lead.first_name} ${lead.last_name} (${lead.status})`);
  }

  // Update lead count on client record
  await conn.query(
    'UPDATE clients SET lead_count = ? WHERE id = ?',
    [sampleLeads.length, KYLE_CLIENT_ID]
  );

  console.log(`\n✅ Seeded ${sampleLeads.length} leads for Kyle Dombecki`);
  console.log('   Pipeline breakdown:');
  console.log('   - 4 DSCR leads (new, contacted, qualified, appointment_set)');
  console.log('   - 2 Fix & Flip leads');
  console.log('   - 1 Construction lead');
  console.log('   - 1 Nurturing lead');

  await conn.end();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
