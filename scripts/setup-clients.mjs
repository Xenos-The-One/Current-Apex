/**
 * Setup script: Create Kyle Dombecki and Tim Haskins sub-accounts
 * with pre-activated credentials so they can log in immediately.
 * Run: node scripts/setup-clients.mjs
 */
import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const conn = await createConnection(DATABASE_URL);
  console.log('✅ Connected to database');

  // ─── Get agency ID ───────────────────────────────────────────────
  const [agencies] = await conn.query('SELECT id, name FROM agencies LIMIT 1');
  const agencyId = agencies[0]?.id ?? 1;
  console.log(`📋 Using agency: ${agencies[0]?.name} (id=${agencyId})`);

  // ─── Get admin user ID (Tariq or first admin) ────────────────────
  const [admins] = await conn.query(
    "SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1"
  );
  const adminUserId = admins[0]?.id ?? 1;
  console.log(`👤 Admin user id: ${adminUserId}`);

  // ─── Helper: create user + client + credentials ──────────────────
  async function createClientAccount({
    firstName, lastName, email, phone, company, password, vapiEnabled = true
  }) {
    console.log(`\n🔧 Setting up ${firstName} ${lastName} (${company})...`);

    // Check if user already exists
    const [existing] = await conn.query(
      'SELECT id, name FROM users WHERE email = ?', [email]
    );
    let userId;

    if (existing.length > 0) {
      userId = existing[0].id;
      console.log(`  ℹ️  User already exists (id=${userId}), updating...`);
      await conn.query(
        "UPDATE users SET name=?, phone=?, loginMethod='email_password', role='user' WHERE id=?",
        [`${firstName} ${lastName}`, phone || null, userId]
      );
    } else {
      const openId = `sub_${crypto.randomBytes(16).toString('hex')}`;
      const [insertResult] = await conn.query(
        `INSERT INTO users (openId, name, email, phone, loginMethod, role)
         VALUES (?, ?, ?, ?, 'email_password', 'user')`,
        [openId, `${firstName} ${lastName}`, email, phone || null]
      );
      userId = insertResult.insertId;
      console.log(`  ✅ User created (id=${userId})`);
    }

    // Check if client record already exists for this user
    const [existingClient] = await conn.query(
      'SELECT id FROM clients WHERE user_id = ?', [userId]
    );
    let clientId;

    if (existingClient.length > 0) {
      clientId = existingClient[0].id;
      console.log(`  ℹ️  Client record already exists (id=${clientId}), updating...`);
      await conn.query(
        `UPDATE clients SET name=?, email=?, phone=?, vapi_calls_enabled=?,
         subscription_tier='done_for_you', subscription_status='active', access_mode='full'
         WHERE id=?`,
        [company, email, phone || null, vapiEnabled ? 1 : 0, clientId]
      );
    } else {
      const trialEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const [clientInsert] = await conn.query(
        `INSERT INTO clients (agency_id, user_id, name, email, phone, subscription_tier,
         subscription_status, trial_end_date, access_mode, vapi_calls_enabled, onboarding_completed)
         VALUES (?, ?, ?, ?, ?, 'done_for_you', 'active', ?, 'full', ?, 0)`,
        [agencyId, userId, company, email, phone || null, trialEnd, vapiEnabled ? 1 : 0]
      );
      clientId = clientInsert.insertId;
      console.log(`  ✅ Client record created (id=${clientId})`);
    }

    // Hash password and upsert credentials
    const passwordHash = await bcrypt.hash(password, 12);
    const [existingCred] = await conn.query(
      'SELECT id FROM sub_account_credentials WHERE user_id = ?', [userId]
    );

    if (existingCred.length > 0) {
      await conn.query(
        `UPDATE sub_account_credentials SET password_hash=?, is_active=1, activated_at=NOW()
         WHERE user_id=?`,
        [passwordHash, userId]
      );
      console.log(`  ✅ Credentials updated`);
    } else {
      await conn.query(
        `INSERT INTO sub_account_credentials (user_id, password_hash, is_active, activated_at)
         VALUES (?, ?, 1, NOW())`,
        [userId, passwordHash]
      );
      console.log(`  ✅ Credentials created`);
    }

    // Create an accepted invitation record so the system knows account is active
    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await conn.query(
      `INSERT INTO account_invitations
       (token, email, first_name, last_name, company, role, agency_id, client_id,
        status, invited_by_user_id, expires_at, accepted_at)
       VALUES (?, ?, ?, ?, ?, 'client_user', ?, ?, 'accepted', ?, ?, NOW())`,
      [token, email, firstName, lastName, company, agencyId, clientId, adminUserId, expiresAt]
    );
    console.log(`  ✅ Invitation record created (accepted)`);

    return { userId, clientId };
  }

  // ─── Create Kyle Dombecki ─────────────────────────────────────────
  const kyle = await createClientAccount({
    firstName: 'Kyle',
    lastName: 'Dombecki',
    email: 'info@optimallendingsolutions.com',
    phone: null,
    company: 'Optimal Lending Solutions',
    password: 'OptimalLending2025!',
    vapiEnabled: true,
  });

  // ─── Create Tim Haskins ───────────────────────────────────────────
  const tim = await createClientAccount({
    firstName: 'Tim',
    lastName: 'Haskins',
    email: 'haskinstim57@gmail.com',
    phone: null,
    company: 'Premier Mortgage Resources',
    password: 'Terrence01@',
    vapiEnabled: false, // Tim handles calls manually per schema comment
  });

  // ─── Create campaign templates for Kyle (DSCR/Fix&Flip/Construction) ─
  console.log('\n📧 Creating campaign templates for Optimal Lending Solutions...');

  // Check if admin user exists in users table for created_by FK
  const [adminCheck] = await conn.query('SELECT id FROM users WHERE id = ?', [adminUserId]);
  const createdBy = adminCheck.length > 0 ? adminUserId : 1;

  const templates = [
    // SMS Templates
    {
      name: 'New DSCR Lead - Instant Follow-Up SMS',
      type: 'sms',
      content: `Hi {{first_name}}! This is {{agent_name}} with Optimal Lending Solutions. I saw you were looking into DSCR financing for an investment property. I'd love to learn more about your deal — do you have 5 minutes to chat? Reply STOP to opt out.`,
    },
    {
      name: 'Fix & Flip Lead - Fast Follow-Up SMS',
      type: 'sms',
      content: `Hey {{first_name}}, this is {{agent_name}} from Optimal Lending Solutions. I saw you're interested in fix & flip financing. We fund deals fast — sometimes in as little as 7-10 days. Want to talk through your project? Reply STOP to opt out.`,
    },
    {
      name: 'Construction Loan Lead - Follow-Up SMS',
      type: 'sms',
      content: `Hi {{first_name}}, {{agent_name}} here with Optimal Lending Solutions. I noticed you're looking for ground-up construction financing. We specialize in exactly that. Can I grab 5 minutes to discuss your project? Reply STOP to opt out.`,
    },
    {
      name: 'No Answer - Follow-Up SMS (Day 1)',
      type: 'sms',
      content: `Hi {{first_name}}, I tried reaching you earlier about your investment property financing inquiry. I'm {{agent_name}} with Optimal Lending Solutions — we specialize in DSCR, fix & flip, and construction loans. When's a good time to connect? Reply STOP to opt out.`,
    },
    {
      name: 'Nurture SMS - Week 2 Check-In',
      type: 'sms',
      content: `Hey {{first_name}}, checking in from Optimal Lending Solutions. Still looking for financing on your investment property? We have flexible programs that qualify based on the property's cash flow — not your personal income. Worth a quick call? Reply STOP to opt out.`,
    },
    {
      name: 'Re-Engagement SMS - Cold Lead',
      type: 'sms',
      content: `Hi {{first_name}}, it's been a while since we connected at Optimal Lending Solutions. Are you still working on any real estate investment deals? We'd love to help you close your next one. Reply STOP to opt out.`,
    },
    // Email Templates
    {
      name: 'New Lead Welcome Email - DSCR',
      type: 'email',
      subject: 'Your DSCR Loan Inquiry — Optimal Lending Solutions',
      content: `Hi {{first_name}},

Thank you for reaching out to Optimal Lending Solutions! I'm {{agent_name}}, and I specialize in helping real estate investors secure financing quickly and efficiently.

I saw you're interested in DSCR (Debt Service Coverage Ratio) financing. Here's what makes us different:

✅ We qualify based on the property's rental income — not your personal income
✅ Fast closings — we move quickly so you don't miss deals
✅ Flexible underwriting for investors with complex income situations
✅ All loans structured through an LLC or business entity

To get started, I'd love to learn more about your deal. Can we schedule a quick 15-minute call?

👉 Book a call: {{booking_link}}

Or simply reply to this email with:
- Property address or location
- Type of property (single-family, duplex, commercial, etc.)
- Purchase price or current value
- Estimated rental income

I look forward to helping you close this deal!

Best,
{{agent_name}}
Optimal Lending Solutions`,
    },
    {
      name: 'New Lead Welcome Email - Fix & Flip',
      type: 'email',
      subject: 'Fix & Flip Financing — Let\'s Talk About Your Project',
      content: `Hi {{first_name}},

Thanks for your interest in fix & flip financing through Optimal Lending Solutions!

We specialize in funding fix & flip projects for real estate investors who need speed, flexibility, and a lender who understands the business.

Here's what we offer for fix & flip deals:
✅ Fast approvals and quick closings
✅ Financing based on the After Repair Value (ARV)
✅ Funding for both acquisition and rehab costs
✅ No personal income verification required

To evaluate your deal, I'll need:
- Property address
- Purchase price
- Estimated rehab budget
- Your estimated ARV (After Repair Value)
- Your experience level with flips

Ready to move forward? Book a quick call: {{booking_link}}

Looking forward to funding your next flip!

Best,
{{agent_name}}
Optimal Lending Solutions`,
    },
    {
      name: 'New Lead Welcome Email - Construction',
      type: 'email',
      subject: 'Ground-Up Construction Financing — Optimal Lending Solutions',
      content: `Hi {{first_name}},

Thank you for reaching out about ground-up construction financing!

At Optimal Lending Solutions, we fund new construction projects for developers and experienced real estate investors. We understand that construction deals require a lender who moves fast and understands the complexity of the build process.

Our construction loan program includes:
✅ Funding for land acquisition + construction costs
✅ Draw schedules aligned with your build phases
✅ Flexible underwriting based on project viability
✅ All loans structured through an LLC or business entity

To discuss your project, I'll need:
- Property/land address
- Scope of the project (number of units, square footage)
- Total project budget
- Your timeline for completion
- Your experience with construction projects

Let's schedule a call to go over the details: {{booking_link}}

Best,
{{agent_name}}
Optimal Lending Solutions`,
    },
    {
      name: 'Follow-Up Email - No Response (Day 3)',
      type: 'email',
      subject: 'Still interested in investment property financing?',
      content: `Hi {{first_name}},

I wanted to follow up on your recent inquiry about investment property financing with Optimal Lending Solutions.

I know things get busy — so I'll keep this short. If you're still looking for financing for your investment property, I'd love to help. We specialize in:

🏠 DSCR Loans — qualify on rental income, not personal income
🔨 Fix & Flip — fast funding for your rehab projects
🏗️ Ground-Up Construction — from land to finished product

If now isn't the right time, no worries at all. Just reply and let me know, and I'll check back when the timing works better.

Ready to talk? Book a time here: {{booking_link}}

Best,
{{agent_name}}
Optimal Lending Solutions`,
    },
    {
      name: 'Nurture Email - Investor Education',
      type: 'email',
      subject: 'How DSCR Loans Can Help You Scale Your Portfolio',
      content: `Hi {{first_name}},

One of the biggest challenges real estate investors face is qualifying for financing as their portfolio grows. Traditional lenders look at your personal income — but what happens when you have multiple properties and your debt-to-income ratio gets too high?

That's where DSCR loans come in.

**What is a DSCR Loan?**
DSCR stands for Debt Service Coverage Ratio. Instead of qualifying based on your personal income, we qualify the loan based on the property's ability to generate rental income.

Formula: Monthly Rental Income ÷ Monthly Mortgage Payment = DSCR

If your DSCR is 1.0 or above, the property covers its own payment. Above 1.25 is considered strong.

**Why This Matters for Investors:**
✅ Scale your portfolio without income limitations
✅ No W-2 or tax return requirements
✅ Close in an LLC to protect your assets
✅ Move quickly on deals without waiting for income verification

Ready to discuss how this could work for your next deal?

Book a call: {{booking_link}}

Best,
{{agent_name}}
Optimal Lending Solutions`,
    },
  ];

  for (const template of templates) {
    // Check if template already exists
    const [existing] = await conn.query(
      'SELECT id FROM campaign_templates WHERE name = ? AND agencyId = ?',
      [template.name, agencyId]
    );
    if (existing.length > 0) {
      console.log(`  ⏭️  Template already exists: ${template.name}`);
      continue;
    }
    await conn.query(
      `INSERT INTO campaign_templates (agencyId, name, type, subject, content, isGlobal, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [agencyId, template.name, template.type, template.subject ?? null, template.content]
    );
    console.log(`  ✅ Created template: ${template.name}`);
  }

  // ─── Update agency name ────────────────────────────────────────────
  await conn.query(
    "UPDATE agencies SET name = 'Raindrop Marketing', email = 'tariqhaskins@indigolabsai.com' WHERE id = ?",
    [agencyId]
  );
  console.log('\n✅ Agency name updated to "Raindrop Marketing"');

  // ─── Summary ──────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('🎉 SETUP COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n📋 CLIENT ACCOUNTS CREATED:');
  console.log(`\n1. Kyle Dombecki — Optimal Lending Solutions`);
  console.log(`   Email:    info@optimallendingsolutions.com`);
  console.log(`   Password: OptimalLending2025!`);
  console.log(`   User ID:  ${kyle.userId}`);
  console.log(`   Client ID: ${kyle.clientId}`);
  console.log(`\n2. Tim Haskins — Premier Mortgage Resources`);
  console.log(`   Email:    haskinstim57@gmail.com`);
  console.log(`   Password: Terrence01@`);
  console.log(`   User ID:  ${tim.userId}`);
  console.log(`   Client ID: ${tim.clientId}`);
  console.log(`\n📧 ${templates.length} campaign templates created for Optimal Lending Solutions`);
  console.log('\n' + '='.repeat(60));

  await conn.end();
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
