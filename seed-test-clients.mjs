import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const AGENCY_ID = 1;

const testClients = [
  {
    name: "Marcus Johnson",
    email: "marcus.johnson@premierloans.com",
    phone: "+1 (702) 555-0142",
    subscriptionTier: "pro",
    subscriptionStatus: "active",
    bookingSlug: "marcus-johnson",
    bookingTitle: "Book a Mortgage Consultation",
    leads: [
      { firstName: "David", lastName: "Chen", email: "david.chen@email.com", phone: "+1 (702) 555-0201", source: "facebook", status: "new", loanType: "purchase" },
      { firstName: "Sarah", lastName: "Williams", email: "sarah.w@gmail.com", phone: "+1 (702) 555-0202", source: "referral", status: "contacted", loanType: "refinance" },
      { firstName: "James", lastName: "Rodriguez", email: "jrod@email.com", phone: "+1 (702) 555-0203", source: "instagram", status: "qualified", loanType: "purchase" },
      { firstName: "Emily", lastName: "Thompson", email: "emily.t@email.com", phone: "+1 (702) 555-0204", source: "website", status: "appointment_set", loanType: "purchase" },
    ],
  },
  {
    name: "Jennifer Patel",
    email: "jennifer@patelrealty.com",
    phone: "+1 (480) 555-0188",
    subscriptionTier: "done_for_you",
    subscriptionStatus: "active",
    bookingSlug: "jennifer-patel",
    bookingTitle: "Schedule a Home Buying Consultation",
    leads: [
      { firstName: "Michael", lastName: "Brown", email: "mbrown@email.com", phone: "+1 (480) 555-0301", source: "facebook", status: "new", loanType: "purchase" },
      { firstName: "Lisa", lastName: "Garcia", email: "lisa.garcia@email.com", phone: "+1 (480) 555-0302", source: "referral", status: "contacted", loanType: "purchase" },
      { firstName: "Robert", lastName: "Martinez", email: "rmartinez@email.com", phone: "+1 (480) 555-0303", source: "instagram", status: "qualified", loanType: "investment" },
    ],
  },
  {
    name: "Derek Washington",
    email: "derek@washingtonmortgage.com",
    phone: "+1 (404) 555-0267",
    subscriptionTier: "pro",
    subscriptionStatus: "trial",
    bookingSlug: "derek-washington",
    bookingTitle: "Free Mortgage Review",
    leads: [
      { firstName: "Angela", lastName: "Davis", email: "angela.d@email.com", phone: "+1 (404) 555-0401", source: "facebook", status: "new", loanType: "purchase" },
      { firstName: "Kevin", lastName: "Wilson", email: "kwilson@email.com", phone: "+1 (404) 555-0402", source: "website", status: "new", loanType: "refinance" },
      { firstName: "Tanya", lastName: "Johnson", email: "tanya.j@email.com", phone: "+1 (404) 555-0403", source: "referral", status: "contacted", loanType: "purchase" },
      { firstName: "Marcus", lastName: "Lee", email: "mlee@email.com", phone: "+1 (404) 555-0404", source: "instagram", status: "appointment_set", loanType: "purchase" },
      { firstName: "Priya", lastName: "Sharma", email: "priya.s@email.com", phone: "+1 (404) 555-0405", source: "facebook", status: "qualified", loanType: "refinance" },
    ],
  },
  {
    name: "Carlos Rivera",
    email: "carlos@riverahomes.com",
    phone: "+1 (305) 555-0334",
    subscriptionTier: "starter",
    subscriptionStatus: "active",
    bookingSlug: "carlos-rivera",
    bookingTitle: "Habla con Carlos - Consulta Gratis",
    leads: [
      { firstName: "Maria", lastName: "Gonzalez", email: "maria.g@email.com", phone: "+1 (305) 555-0501", source: "facebook", status: "new", loanType: "purchase" },
      { firstName: "Jose", lastName: "Hernandez", email: "jose.h@email.com", phone: "+1 (305) 555-0502", source: "referral", status: "qualified", loanType: "purchase" },
    ],
  },
  {
    name: "Amanda Foster",
    email: "amanda@fosterlending.com",
    phone: "+1 (214) 555-0419",
    subscriptionTier: "enterprise",
    subscriptionStatus: "active",
    bookingSlug: "amanda-foster",
    bookingTitle: "Schedule Your Lending Consultation",
    leads: [
      { firstName: "Tyler", lastName: "Scott", email: "tyler.s@email.com", phone: "+1 (214) 555-0601", source: "website", status: "new", loanType: "purchase" },
      { firstName: "Rachel", lastName: "Adams", email: "rachel.a@email.com", phone: "+1 (214) 555-0602", source: "referral", status: "contacted", loanType: "refinance" },
      { firstName: "Nathan", lastName: "Clark", email: "nathan.c@email.com", phone: "+1 (214) 555-0603", source: "facebook", status: "appointment_set", loanType: "purchase" },
      { firstName: "Stephanie", lastName: "Baker", email: "stephanie.b@email.com", phone: "+1 (214) 555-0604", source: "instagram", status: "qualified", loanType: "investment" },
    ],
  },
];

async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to database");

  for (const client of testClients) {
    const [existing] = await conn.execute('SELECT id FROM clients WHERE email = ?', [client.email]);
    
    let clientId;
    if (existing.length > 0) {
      clientId = existing[0].id;
      console.log("-> Client already exists: " + client.name + " (ID: " + clientId + ")");
    } else {
      const [clientResult] = await conn.execute(
        "INSERT INTO clients (agency_id, name, email, phone, subscription_tier, subscription_status, booking_slug, booking_title, access_mode, lead_count, vapi_calls_enabled, trial_start_date, trial_end_date, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'full', 0, 1, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), NOW(), NOW())",
        [AGENCY_ID, client.name, client.email, client.phone, client.subscriptionTier, client.subscriptionStatus, client.bookingSlug, client.bookingTitle]
      );
      clientId = clientResult.insertId;
      console.log("+ Created client: " + client.name + " (ID: " + clientId + ")");
    }

    let leadsInserted = 0;
    for (const lead of client.leads) {
      try {
        const [existingLead] = await conn.execute('SELECT id FROM leads WHERE email = ? AND client_id = ?', [lead.email, clientId]);
        if (existingLead.length > 0) continue;
        await conn.execute(
          "INSERT INTO leads (client_id, agency_id, first_name, last_name, email, phone, source, status, loan_type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
          [clientId, AGENCY_ID, lead.firstName, lead.lastName, lead.email, lead.phone, lead.source, lead.status, lead.loanType || null]
        );
        leadsInserted++;
      } catch (e) {
        console.log("  -> Lead " + lead.firstName + " " + lead.lastName + ": " + e.message);
      }
    }
    console.log("  + " + leadsInserted + " leads inserted for " + client.name);

    await conn.execute('UPDATE clients SET lead_count = (SELECT COUNT(*) FROM leads WHERE client_id = ?) WHERE id = ?', [clientId, clientId]);

    const tomorrow = new Date(Date.now() + 86400000);
    const nextWeek = new Date(Date.now() + 7 * 86400000);
    
    try {
      const [existingAppt] = await conn.execute('SELECT id FROM appointments WHERE client_id = ? LIMIT 1', [clientId]);
      if (existingAppt.length === 0) {
        const lead1 = client.leads[0];
        await conn.execute(
          "INSERT INTO appointments (client_id, agency_id, first_name, last_name, email, phone, appointment_date, duration, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 30, 'confirmed', 'Initial consultation - mortgage pre-approval discussion', NOW(), NOW())",
          [clientId, AGENCY_ID, lead1.firstName, lead1.lastName, lead1.email, lead1.phone, tomorrow]
        );
        if (client.leads.length > 1) {
          const lead2 = client.leads[1];
          await conn.execute(
            "INSERT INTO appointments (client_id, agency_id, first_name, last_name, email, phone, appointment_date, duration, status, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 45, 'confirmed', 'Follow-up consultation - loan options review', NOW(), NOW())",
            [clientId, AGENCY_ID, lead2.firstName, lead2.lastName, lead2.email, lead2.phone, nextWeek]
          );
        }
        console.log("  + Appointments created for " + client.name);
      } else {
        console.log("  -> Appointments already exist for " + client.name);
      }
    } catch (e) {
      console.log("  -> Appointments error: " + e.message);
    }
  }

  await conn.end();
  console.log("\nSeeding complete!");
}

seed().catch(console.error);
