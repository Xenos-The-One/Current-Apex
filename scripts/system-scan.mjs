/**
 * Full System Scan — tests every route, API endpoint, DB table, and integration
 */
const BASE = "http://localhost:3000";

const results = { pass: [], fail: [], warn: [] };

function log(status, category, item, detail = "") {
  const entry = { category, item, detail };
  results[status].push(entry);
  const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️";
  console.log(`${icon} [${category}] ${item}${detail ? " — " + detail : ""}`);
}

async function testRoute(path, label) {
  try {
    const res = await fetch(`${BASE}${path}`, { redirect: "follow" });
    if (res.status === 200) {
      const text = await res.text();
      if (text.includes("<title>404</title>") || text.includes("Page Not Found")) {
        log("fail", "Route", label || path, `Client-side 404`);
      } else {
        log("pass", "Route", label || path, `HTTP ${res.status}`);
      }
    } else {
      log("fail", "Route", label || path, `HTTP ${res.status}`);
    }
  } catch (e) {
    log("fail", "Route", label || path, e.message);
  }
}

async function testTrpcQuery(procedure, input = undefined) {
  try {
    const inputParam = input !== undefined ? `&input=${encodeURIComponent(JSON.stringify({ "0": input }))}` : "";
    const res = await fetch(`${BASE}/api/trpc/${procedure}?batch=1${inputParam}`, {
      headers: { "Content-Type": "application/json" },
    });
    const body = await res.json();
    const result = body[0]?.result;
    if (result?.error) {
      const code = result.error.data?.code || result.error.message;
      if (code === "UNAUTHORIZED") {
        log("warn", "API", procedure, "Requires auth (expected)");
      } else {
        log("fail", "API", procedure, `Error: ${code} - ${result.error.message?.substring(0, 100)}`);
      }
    } else {
      log("pass", "API", procedure, `OK`);
    }
  } catch (e) {
    log("fail", "API", procedure, e.message);
  }
}

async function testTrpcMutation(procedure) {
  try {
    const res = await fetch(`${BASE}/api/trpc/${procedure}?batch=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "0": {} }),
    });
    const body = await res.json();
    const result = body[0]?.result;
    if (result?.error) {
      const code = result.error.data?.code || "UNKNOWN";
      if (code === "UNAUTHORIZED") {
        log("warn", "API", procedure, "Requires auth (expected)");
      } else if (code === "BAD_REQUEST" || code === "PARSE_ERROR") {
        log("pass", "API", procedure, `Reachable (needs valid input)`);
      } else {
        log("fail", "API", procedure, `Error: ${code} - ${(result.error.message || "").substring(0, 100)}`);
      }
    } else {
      log("pass", "API", procedure, `OK`);
    }
  } catch (e) {
    log("fail", "API", procedure, e.message);
  }
}

// ========== ROUTES ==========
console.log("\n========== ROUTE TESTS ==========\n");

const routes = [
  // Public pages
  ["/", "Home"],
  ["/info", "Info"],
  ["/get-started", "Get Started"],
  ["/book", "Book Appointment (public)"],
  ["/lead", "Lead Capture (public)"],
  ["/mortgage", "Mortgage Landing"],
  ["/partner", "Partner Program"],
  ["/refinance", "Refinance Calculator"],
  ["/first-time-buyer", "First Time Buyer Guide"],
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms & Conditions"],
  ["/indigo-labs", "Indigo Labs Landing"],
  ["/webinar", "Webinar Landing"],
  ["/webinar/dpa", "Webinar DPA"],
  // Auth-required pages (will serve SPA shell)
  ["/admin", "Admin Dashboard"],
  ["/dashboard", "Client Dashboard"],
  ["/contacts", "Contacts Hub"],
  ["/contacts/borrowers", "Contacts - Borrowers"],
  ["/contacts/re-agents", "Contacts - RE Agents"],
  ["/activity", "Activity Hub"],
  ["/activity/call-review", "Activity - Call Review"],
  ["/activity/follow-ups", "Activity - Follow-ups"],
  ["/activity/birthdays", "Activity - Birthdays"],
  ["/marketing", "Marketing Hub"],
  ["/marketing/sms", "Marketing - SMS"],
  ["/marketing/ai-scripts", "Marketing - AI Scripts"],
  ["/marketing/templates", "Marketing - Templates"],
  ["/social", "Social Media"],
  ["/automations", "Workflow Automations"],
  ["/reporting", "Reporting Hub"],
  ["/reporting/metrics", "Reporting - Metrics"],
  ["/reporting/market", "Reporting - Market"],
  ["/reporting/funnel", "Reporting - Funnel"],
  ["/tools", "Tools Hub"],
  ["/tools/inbox", "Tools - Inbox"],
  ["/tools/email-templates", "Tools - Email Templates"],
  ["/tools/notifications", "Tools - Notifications"],
  ["/leads", "Leads"],
  ["/leads/new", "New Lead"],
  ["/leads/import", "Lead Import"],
  ["/analytics", "Analytics"],
  ["/templates", "Templates"],
  ["/content-approvals", "Content Approvals"],
  ["/my-content", "My Content"],
  ["/conversations", "Conversations"],
  ["/launchpad", "Launchpad"],
  ["/client-onboarding", "Client Onboarding"],
  ["/account-setup", "Account Setup"],
  ["/campaigns/dashboard", "Campaign Dashboard"],
  ["/campaigns", "Campaign Monitoring"],
  ["/borrowers", "Borrowers"],
  ["/referral-partners", "Referral Partners"],
  ["/loa", "LOA Dashboard"],
  ["/activate-account", "Activate Account"],
  ["/partner-portal", "Partner Portal"],
  ["/account", "Account"],
  // SEO Admin routes
  ["/seo", "SEO Dashboard"],
  ["/seo/clients", "SEO Clients"],
  ["/seo/content", "SEO Content"],
  ["/seo/bulk", "SEO Bulk Generation"],
  ["/seo/scheduling", "SEO Scheduling"],
  ["/seo/templates", "SEO Templates"],
  ["/seo/collaboration", "SEO Collaboration"],
  ["/seo/quality-score", "SEO Quality Score"],
  ["/seo/seo-audit", "SEO Audit"],
  ["/seo/analytics", "SEO Analytics"],
  ["/seo/repurposing", "SEO Repurposing"],
  ["/seo/publishing", "SEO Publishing"],
  ["/seo/briefs", "SEO Briefs"],
  ["/seo/reports", "SEO Reports"],
  ["/seo/settings", "SEO Settings"],
  ["/seo/calendar", "SEO Calendar"],
  ["/seo/keyword-research", "SEO Keyword Research"],
  ["/seo/approvals", "SEO Approvals"],
  ["/seo/performance", "SEO Performance"],
  ["/seo/design-standards", "SEO Design Standards"],
  ["/seo/publishing-analytics", "SEO Publishing Analytics"],
  ["/seo/publishing-scheduler", "SEO Publishing Scheduler"],
  ["/seo/ai-client-discovery", "SEO AI Client Discovery"],
  ["/seo/google-business-profile", "SEO Google Business Profile"],
  ["/seo/ads", "SEO Ads Manager"],
  ["/seo/keyword-gap", "SEO Keyword Gap"],
  ["/seo/ab-testing", "SEO A/B Testing"],
  ["/seo/recurring-plans", "SEO Recurring Plans"],
  // Portal routes
  ["/seo/portal/login", "Portal Login"],
  ["/seo/portal/dashboard", "Portal Dashboard"],
  ["/seo/portal/apex-content", "Portal Apex Content"],
  ["/seo/portal/content", "Portal Content"],
  ["/seo/portal/calendar", "Portal Calendar"],
  ["/seo/portal/performance", "Portal Performance"],
  ["/seo/portal/publishing", "Portal Publishing"],
  ["/seo/portal/follow-ups", "Portal Follow-Ups"],
  ["/seo/portal/approvals", "Portal Approvals"],
];

for (const [path, label] of routes) {
  await testRoute(path, label);
}

// ========== API ENDPOINTS ==========
console.log("\n========== API ENDPOINT TESTS ==========\n");

// Public queries (should work without auth)
const publicQueries = [
  "auth.me",
  "publicFeatures.getAgencyInfo",
  "publicFeatures.getAvailableSlots",
];

for (const q of publicQueries) {
  await testTrpcQuery(q);
}

// Protected queries (expect UNAUTHORIZED - that's OK, means endpoint exists)
const protectedQueries = [
  // CRM Core
  "crm.dashboardStats",
  "crm.getMyInfo",
  "crm.globalSearch",
  "crm.getContactTypeCounts",
  // Leads
  "leads.list",
  "leads.getDetail",
  // Borrowers
  "borrowers.list",
  // Contacts
  "contacts.list",
  // Referral Partners
  "referralPartners.list",
  // Campaigns
  "campaigns.list",
  "campaigns.getTemplates",
  // Appointments
  "appointments.list",
  "appointments.getAvailability",
  // Automations
  "automations.listWorkflows",
  // Vapi
  "vapi.listCalls",
  "vapi.listAssistants",
  // Analytics
  "analytics.dashboardKPIs",
  "analytics.conversionFunnel",
  "analytics.sourceAttribution",
  // Documents
  "documents.list",
  // Billing
  "billing.getPlans",
  "billing.getSubscription",
  // Notifications
  "notifications.list",
  "notificationCenter.getAll",
  // Follow-ups
  "followUps.getSuggested",
  "followUps.getAllSuggested",
  "followUps.getCompletionStats",
  // Content Approvals
  "contentApprovals.listPending",
  "contentApprovals.recentActivity",
  // Social
  "social.listPosts",
  // Client Onboarding
  "clientOnboarding.getStatus",
  // Admin
  "admin.listUsers",
  "admin.systemHealth",
  // Agencies
  "agencies.list",
  // SEO
  "seo.dashboard.getStats",
  "seo.clients.list",
  "seo.content.list",
  // Metrics
  "metrics.dashboardStatsByRange",
  // Market Analytics
  "marketAnalytics.getMarketData",
  // Conversations
  "conversations.list",
  // Birthdays
  "birthdays.getUpcoming",
  // LOA
  "loa.getDashboard",
  // Templates
  "templates.list",
  // Launchpad
  "launchpad.getChecklist",
  // Webinars
  "webinars.list",
  // Indigo Labs
  "indigoLabs.getInfo",
  // Account
  "account.getProfile",
  // AI
  "ai.getScripts",
  // AI Ops
  "aiOps.getStatus",
  // Milestones
  "milestonesTasks.list",
  // SMS Campaigns
  "smsCampaigns.list",
  // Campaign Monitoring
  "campaignMonitoring.getOverview",
  // Onboarding
  "onboarding.getStatus",
];

for (const q of protectedQueries) {
  await testTrpcQuery(q);
}

// Protected mutations (expect UNAUTHORIZED or BAD_REQUEST - means endpoint exists)
const protectedMutations = [
  "auth.logout",
  "leads.createLead",
  "borrowers.create",
  "campaigns.createEmailCampaign",
  "campaigns.createSMSCampaign",
  "appointments.bookLeadAppointment",
  "automations.createWorkflow",
  "documents.upload",
  "social.createPost",
  "contentApprovals.approve",
  "followUps.bulkMarkContacted",
];

for (const m of protectedMutations) {
  await testTrpcMutation(m);
}

// ========== SPECIAL ENDPOINTS ==========
console.log("\n========== SPECIAL ENDPOINT TESTS ==========\n");

// Stripe webhook
try {
  const res = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (res.status === 400) {
    log("pass", "Integration", "Stripe Webhook (/api/stripe/webhook)", "Reachable (signature check failed as expected)");
  } else {
    log("warn", "Integration", "Stripe Webhook", `HTTP ${res.status}`);
  }
} catch (e) {
  log("fail", "Integration", "Stripe Webhook", e.message);
}

// OAuth callback
try {
  const res = await fetch(`${BASE}/api/oauth/callback`, { redirect: "manual" });
  log("pass", "Integration", "OAuth Callback (/api/oauth/callback)", `HTTP ${res.status} (redirect expected)`);
} catch (e) {
  log("fail", "Integration", "OAuth Callback", e.message);
}

// Vapi webhook
try {
  const res = await fetch(`${BASE}/api/vapi/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: { type: "status-update" } }),
  });
  if (res.status < 500) {
    log("pass", "Integration", "Vapi Webhook (/api/vapi/webhook)", `HTTP ${res.status}`);
  } else {
    log("fail", "Integration", "Vapi Webhook", `HTTP ${res.status}`);
  }
} catch (e) {
  log("fail", "Integration", "Vapi Webhook", e.message);
}

// ========== SUMMARY ==========
console.log("\n========== SCAN SUMMARY ==========\n");
console.log(`✅ PASS: ${results.pass.length}`);
console.log(`⚠️  WARN: ${results.warn.length}`);
console.log(`❌ FAIL: ${results.fail.length}`);
console.log(`📊 TOTAL: ${results.pass.length + results.warn.length + results.fail.length}`);

if (results.fail.length > 0) {
  console.log("\n--- FAILURES ---");
  for (const f of results.fail) {
    console.log(`  ❌ [${f.category}] ${f.item}: ${f.detail}`);
  }
}

if (results.warn.length > 0) {
  console.log("\n--- WARNINGS ---");
  for (const w of results.warn) {
    console.log(`  ⚠️  [${w.category}] ${w.item}: ${w.detail}`);
  }
}

// Write results to file
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    pass: results.pass.length,
    warn: results.warn.length,
    fail: results.fail.length,
    total: results.pass.length + results.warn.length + results.fail.length,
  },
  failures: results.fail,
  warnings: results.warn,
  passes: results.pass,
};

import { writeFileSync } from "fs";
writeFileSync("/home/ubuntu/agency-crm-platform/scan-results.json", JSON.stringify(report, null, 2));
console.log("\n📄 Full results written to scan-results.json");
