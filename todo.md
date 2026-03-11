# Agency CRM Platform - TODO

## Phase 1: Foundation
- [x] Design system (colors, typography, index.css)
- [x] Database schema: users, agencies, clients, leads, borrowers, referral_partners
- [x] Database schema: appointments, lead_activities, lead_tasks
- [x] Database schema: email_campaigns, sms_campaigns, campaign_templates
- [x] Database schema: automation_workflows, automation_workflow_steps, automation_executions
- [x] Database schema: vapi_assistants, ai_scripts, call_logs
- [x] Database schema: metrics, conversion_funnel, market_analytics
- [x] Database schema: loan_milestones, documents, content_approvals
- [x] Database schema: social_media_posts, webinar_registrations
- [x] Database schema: subscriptions, subscription_plans, invoices
- [x] Database schema: push_subscriptions, team_notifications
- [x] Run db:push migration

## Phase 2: Backend API
- [x] Agency router (CRUD, invite, stats)
- [x] Leads router (list, create, update, delete, import CSV, score)
- [x] Borrowers router (list, create, update, milestones)
- [x] Contacts/Referral Partners router
- [x] Campaigns router (email + SMS CRUD, send, track)
- [x] Appointments router (list, create, update, cancel, availability)
- [x] Automations router (workflows, steps, execute, logs)
- [x] Vapi router (call history, place call, recordings, transcripts)
- [x] Analytics router (dashboard KPIs, funnel, source attribution, team metrics)
- [x] Documents router (upload, list, delete, share)
- [x] Content router (social posts, blog, templates, approvals)
- [x] LLM router (lead scoring, next action suggestions, content generation)
- [x] Billing router (plans, subscribe, webhook, invoices)
- [x] Notifications router

## Phase 3: Core UI
- [x] Global design system (dark sidebar, professional B2B SaaS style)
- [x] CRMLayout with role-aware sidebar navigation
- [x] Admin sidebar: Launchpad, Admin Dashboard, Contacts, Activity, Marketing, Reports, AI, Documents, Billing
- [x] Client sidebar: Dashboard, Pipeline, Borrower DB, Referral Partners, Appointments, AI Calling, Campaigns, Automations, Analytics, AI Assistant, Documents, Billing
- [x] Auth flow (login, protected routes, redirect on auth)
- [x] Admin Dashboard page (system health, agency management, billing overview)
- [x] Agency management page (create, edit, suspend agencies)

## Phase 4: Lead Pipeline & Contacts
- [x] Lead pipeline with Kanban stages
- [x] Lead filtering (type, status, source, score)
- [x] Bulk CSV import with field mapping
- [x] Lead scoring display
- [x] Borrower database with loan milestone tracker
- [x] Referral partners page (attorneys, title co., builders, lenders)
- [x] Contact management with relationship tracking

## Phase 5: Campaigns, Automations & Appointments
- [x] Email campaign builder (template, audience, schedule)
- [x] SMS campaign builder (message, audience, schedule)
- [x] Campaign tracking (opens, clicks, delivery, bounces)
- [x] Campaign template library
- [x] Visual workflow automation builder (trigger → conditions → actions)
- [x] Workflow execution logs and monitoring
- [x] Appointment calendar view (month/week/day)
- [x] Appointment booking form and availability management
- [x] Automated appointment reminders (email/SMS)

## Phase 6: Analytics, AI & Content
- [x] Real-time analytics dashboard (KPIs, charts)
- [x] Conversion funnel visualization
- [x] Lead source attribution chart
- [x] Team performance leaderboard
- [x] Content studio (social media scheduler, blog editor)
- [x] Email template builder
- [x] Content approval workflow
- [x] AI calling page (Vapi call history, recordings, transcripts)
- [x] AI script generator (LLM)
- [x] LLM lead scoring and next-action recommendations
- [x] LLM personalized email/SMS content generation

## Phase 7: Billing, Documents & Integrations
- [x] Stripe subscription plans page
- [x] Stripe checkout flow (requires STRIPE_SECRET_KEY)
- [x] Invoice history page
- [x] Document upload and storage (S3)
- [x] Document type filtering and sharing
- [x] Borrower document portal
- [x] SendGrid email integration — API key added, live (✅ confirmed in test)
- [x] Twilio SMS integration — credentials added, live
- [x] Vapi AI calling integration — API key + phone number ID + 3 assistant IDs added, live
- [ ] Stripe webhook handler (requires STRIPE_WEBHOOK_SECRET)

## Phase 8: Polish & Delivery
- [x] Vitest unit tests for all routers (19 tests passing)
- [x] Loading states, empty states, error boundaries
- [x] Toast notifications throughout
- [x] Final UI polish and consistency pass
- [x] Checkpoint and delivery

## Bug Fixes
- [x] Settings page (fix /settings 404 error) — API key config, agency profile, notifications

## System Scan Fixes (Round 2)
- [x] FollowUps page (/follow-ups) — missing from client nav
- [x] Conversations page (/conversations) — unified inbox (SMS, email, Facebook)
- [x] Notifications page (/notifications) — system alerts and reminders
- [x] SEO Portal page (/seo-portal) — AI SEO tools and content optimization
- [x] Pipeline page: add 8 lead-type tabs (All/Borrowers/RE Agents/Attorneys/Insurance/Title Co./Builders/Lenders)
- [ ] ContactsHub: Pipeline tab should be full Kanban board (not redirect)
- [x] AgencyContext: auto-detect agencyId from user.agencyId instead of hardcoding 1
- [ ] LOA role: restrict to assigned leads/borrowers only
- [ ] Dashboard: fix empty state with real data queries
- [x] Add sendEmail/sendSms procedures to campaigns router (with SendGrid + Twilio + demo mode fallback)
- [ ] Add leads.getDetail procedure
- [ ] Add webinar registrations router/page
- [ ] Fix all "Feature coming soon" placeholder nav items
- [ ] Consistent empty states across all pages
- [ ] Loading skeletons for all data-heavy pages

## Round 3: OAuth Fix + Follow-up Features
- [x] Fix OAuth callback failed error on login — added missing avatar_url and phone columns to users table
- [x] Add Stripe webhook secret — registered /api/stripe/webhook with express.raw() before json() middleware
- [x] Add live Vapi call test button in Settings → Integrations → Vapi section
- [x] Add SendGrid sender domain configuration in Settings → Integrations → SendGrid section

## Round 4: Missing DB Tables Fix
- [x] Create team_members table in database
- [x] Create account_invitations table in database
- [x] Create contentAnalytics table in database

## Round 5: Missing Columns Fix
- [x] Fix team_notifications missing columns — added is_read, user_id, body, priority, action_url, metadata, push_sent, push_sent_at, read_at, team_member_id, team_member_name
- [x] Fix seo_clients missing columns — added all 50+ extended onboarding, HeyGen, ad account, and social media columns; also fixed leads (33 cols), borrowers (22 cols), agencies (2 cols), clients (3 cols), appointments (5 cols), call_logs (11 cols), users (2 cols)

## Round 6: UI Consolidation + Automation + Templates + Launchpad
- [x] Audit all pages and sidebar nav for duplicate/redundant features
- [x] Consolidate duplicate UI sections — sidebar already well-consolidated with hub pages; added Onboarding Snapshot to Overview
- [x] Streamline sidebar navigation — Onboarding Snapshot added to admin Overview section
- [x] Fix disconnected workflows — re-enabled Vapi auto-calls, fixed env var names, added welcome email
- [x] Build sub-1-minute lead response automation flow — new lead → instant SMS + email + Vapi call within 5 min
- [x] Rebuilt SMS/email template library — 16 templates: welcome, day1, day3, day7, appointment confirm, 24hr reminder, 1hr reminder, post-appt, referral (SMS+email pairs)
- [x] Add A2P registration step to onboarding checklist — included in Launchpad snapshot flow
- [x] Build Onboarding Launchpad Snapshot wizard — 5-step wizard at /onboarding-snapshot
- [x] Launchpad: client info collection form — 5 steps: contact, business, social/ads, brand/SEO, automation
- [x] Launchpad: automated provisioning checklist — provisions client record, seeds templates, sends welcome email+SMS
- [x] Launchpad: snapshot apply/preview for admin — success screen with full setup log

## Round 7: Client Login + SEO Scroll + Follow-ups
- [x] Fix AI SEO portal sidebar scroll cutoff — added min-h-0 to flex column and h-0 to ScrollArea
- [x] Add visible client login explanation — empty state now shows how to create accounts and use Client View / Admin Mode buttons
- [x] Add client account switcher explanation — empty state card with Create First Client Account CTA
- [x] Stripe webhook registration — already built in Settings → Webhooks tab with URL + 4-step guide
- [x] Vapi server URL config — already built in Settings → Webhooks tab with Vapi webhook URL
- [x] SendGrid sender domain verification — already built in Settings → Integrations tab with DNS steps

## Round 8: Stripe Webhook + Test Account
- [x] Stripe webhook endpoint registered at /api/stripe/webhook with express.raw() — instructions in Settings → Webhooks
- [x] Created test client account: Kyle Realty Group (kyle@kylerealty.com) with 5 sample leads; listAgencies now falls back to agency_id lookup so Client View button works
- [x] Client onboarding process explained in delivery message

## Round 9: Client-Facing Onboarding + Auto Content Generation
- [x] Audit current onboarding wizard, client dashboard, and content approval tab
- [x] Build client-facing onboarding wizard — 4-step form at /client-onboarding (business info, brand voice, target audience, social/website connections)
- [x] Add onboarding progress indicator — "Setup Incomplete" banner in client sidebar links to wizard
- [x] Build server-side content auto-generation pipeline — triggers on onboarding submit: 4 FB posts, 4 IG posts, 2 LinkedIn posts, 2 blog drafts
- [x] Wire generated content into Content Approval tab — all generated content inserted as pending approvals
- [x] Notify client when content is ready — "Your first content batch is ready!" banner shown in Content Approvals
- [x] Admin can monitor onboarding completion — clientOnboarding.getStatus procedure available; DB connection ECONNRESET auto-reconnect fixed

## Round 11: Missing Tables Fix
- [x] Create `content` table and 24 other missing seo-schema tables directly via SQL (contentRevisions, contentAnalytics, contentRepurposed, contentComments, gbpConnections, gbpLocations, gbpPosts, brandVoiceHistory, ads, competitorKeywords, gapAnalysisRuns, savedKeywords, seoAuditHistory, keywordRankings, keywordRankAlerts, gapKeywordBriefs, contentPackages, notification_logs, email_templates, inbound_emails, viral_topics, social_posts, content_calendar, heygen_sessions) — all 25 tables now exist in DB

## Round 10: Dashboard Error Fixes
- [x] Fix admin user lookup errors — getMyInfo, dashboardStats, getSlaAlerts, dashboardStatsByRange, globalSearch, getContactTypeCounts, getSuggested, getAllSuggested, getCompletionStats all return empty/null gracefully for admin users without client profiles
- [x] Create contentQualityScores table in database
- [x] Create all 25 missing seo-schema tables (seoUsers, clientPortalUsers, portalBranding, contentTemplates, contentComments, contentRepurposed, webhookConfigs, publishLogs, contentBriefs, agencySettings, recurringPlans, abTests, googleAnalyticsConnections, wordpressConnections, wordpressPublishHistory, manusWebsites, manusPublishHistory, designStandards, publishingSchedules, publishingAnalytics, clientPublishingPermissions, searchConsoleCredentials, searchConsoleMetrics, appNotifications, pipelineCards)

## Round 12: seo_clients Missing Columns Fix
- [x] Added 4 missing columns to seo_clients table: `notes`, `createdBy`, `createdAt`, `updatedAt` (the table was originally created from an older schema that predated these fields)
- [x] Wrapped seo.reports.getSummary in try/catch to return null gracefully on DB errors instead of throwing to the client

## Round 13: Follow-ups Tabs + Content Consolidation
- [x] Add 2nd tab "AI Suggestions" to Follow-ups page (uses getAllSuggested, urgency filter, AI message drafting, snooze, mark contacted, send SMS)
- [x] Add 3rd tab "Completion Stats" to Follow-ups page (uses getCompletionStats, weekly/monthly rate progress bars, performance guidance)
- [x] Social Media page: replace "Create Post" button with link to /seo/content
- [x] /social/new route: redirect to /seo/content
- [x] Old /seo-portal page: replaced with redirect to full AI SEO Portal at /seo
- [x] CRMLayout sidebar: updated AI SEO Portal link from /seo-portal to /seo
- [x] Old /email-campaigns route: already mapped to MarketingHub (no change needed)

## Round 14: Client Sync + Referral Follow-ups + Onboarding Docs
- [x] Backfill Kyle Realty Group into seo_clients linked to CRM client row (crm_client_id set)
- [x] Add 5 missing seo_clients columns: heygen_avatar_id, heygen_voice_id, heygen_video_format, heygen_brand_system_name, content_hub_enabled
- [x] Update getClientsByUser in seo-db.ts to also return clients linked via crm_client_id (not just createdBy)
- [x] Fix ensureLinkedSeoClient to include businessName field to avoid NOT NULL error on new client creation
- [x] Add 4th tab "Referral Partners" to Follow-ups page — sorted by days since last contact, urgency color coding, call/email/navigate actions
- [x] Write ONBOARDING_GUIDE.md — full step-by-step walkthrough for admin and client onboarding flows (3 parts: Admin setup, Client Launchpad, Client deep-dive wizard)

## Round 15: Onboarding Rebuild
- [x] Sub-account creation: createSubAccount now returns clientId; AdminDashboard auto-switches to Client View after invite sent
- [x] Add "Account Setup" tab to client sidebar Home section → links to /account-setup (4-step wizard)
- [x] /account-setup route added to App.tsx → maps to ClientOnboarding wizard (Business Info → Services & Brand → Social & Website → Publishing Prefs)
- [x] On Account Setup completion: generates 12 SEO-optimized pieces (3 FB, 3 IG, 2 LinkedIn, 2 blog posts with H1/meta/H2, 2 website copy pieces) — all inserted as pending Content Approvals
- [x] Onboarding banner in sidebar updated to link to /account-setup
- [x] Removed "Onboarding Snapshot" from admin sidebar Overview section
- [x] Removed /onboarding-snapshot route from App.tsx

## Round 16: 404 Fix + Admin Sidebar Cleanup + Content Approvals Features
- [x] Fix /onboarding-snapshot 404 — add redirect to /admin in App.tsx
- [x] Remove "Client Dashboard" from admin sidebar Overview section
- [x] Add "Regenerate" button to Content Approvals — lets client request new batch with AI guidance note
- [x] Connect approved social posts to Social Media scheduler — auto-queue with suggested publish date from Publishing Prefs

## Round 17: Bulk Approve, Calendar Preview, Admin Oversight
- [x] Bulk approve & schedule — "Approve All Social Posts" button in Content Approvals pending list
- [x] Social Media calendar view — mini calendar showing queued posts with drag-and-drop rescheduling
- [x] Admin content oversight tab — pending approvals across all clients on Admin Dashboard with approve/reject

## Round 18: Email Notifications, Client AI SEO Access, Calendar Stats, Oversight Filters
- [x] Email notification on admin approve/reject — send client email when admin approves or rejects their content
- [x] Client access to AI SEO portal — add AI SEO link/view to client sidebar so clients can create their own content
- [x] Calendar month-level stats — show "X posts this month" counter above the Social Media calendar
- [x] Content Oversight filter — add platform/client filter to Admin Content Oversight section

## Round 19: Client Content Portal, Oversight Badge, Rejection Reminder
- [x] Client-only content portal page — replace admin SEO link with dedicated /my-content page (view content, request new batch, leave feedback, no generation tools)
- [x] Oversight badge — red unreviewed count badge on Content Oversight section header in Admin Dashboard
- [x] Rejection follow-up reminder — auto-create 48-hour follow-up task when admin rejects content

## Round 20: Bug Fixes
- [x] Fix content_approvals query error on Admin Dashboard — missing column causing listPending to fail

## Round 21: Bell Badge, Feedback Thread
- [x] Notification bell badge — red dot on bell icon in admin header for unread notifications (already implemented)
- [x] Client feedback thread — multi-round threaded comments on content items with revision history

## Round 22: Unread Badge, Digest Email, @Mentions
- [x] Unread comment badge on content cards — red dot on cards with unread comments in Content Approvals and My Content
- [x] Daily approval digest email — scheduled daily summary email to admins listing pending approvals and new comments
- [x] @mention in comments — allow @admin or @client in comment thread to route and notify the right person

## Round 23: Full Client SEO Portal (No Separate Login)
- [x] Replace "My Content" sidebar link with full /seo/portal/ experience — remove separate login, use main app auth
- [x] Remove localStorage token checks from all portal pages — use useAuth() instead
- [x] Update PortalLayout to use main app user (useAuth) instead of client_portal_token
- [x] Update sidebar "My Content" link to point to /seo/portal/dashboard

## Round 24: Client Portal Fixes
- [x] Fix My Content sidebar link — now correctly navigates to /seo/portal/content
- [x] Fix Content Approvals sidebar link — now navigates to /seo/portal/approvals (PortalLayout experience)
- [x] Add /seo/portal/approvals route — ContentApprovals page wrapped in PortalLayout for client users
- [x] Add listForPortal tRPC endpoint — returns only the logged-in client's content (flat format)
- [x] Fix social.listPosts — admin users without a client profile now return all posts instead of throwing
- [x] Fix PortalContentDetail — removed broken clientId check that blocked all client access
- [x] Fix PortalDashboard quick-links — all links now use correct /seo/portal/* paths
- [x] Remove admin AI SEO access from client Social Media tab — isAdmin check hides admin-only tools
- [x] Update SeoLayout CLIENT_NAV_GROUPS — client nav now routes to /seo/portal/* pages instead of admin pages
- [x] Update SeoLayout fallback button — redirects to /seo/portal/approvals instead of old /content-approvals
- [x] Update ClientDashboard action item link — pending approvals now link to /seo/portal/approvals

## Round 25: Fix 404 on Portal Routes
- [x] Fix /seo/portal/content 404 — portal routes moved outside SeoLayout in SeoRouter.tsx
- [x] Fix /seo/portal/approvals 404 — portal routes now render directly with their own PortalLayout
- [x] Restructure SeoRouter.tsx — portal routes matched first (before SeoLayout catch-all), admin SEO routes use SeoLayout catch-all

## Round 26: Portal 404 Fix (Again) + Suggested Follow-ups
- [x] Fix /seo/portal/content 404 — registered portal routes directly in App.tsx (lazy-loaded, before /seo/:rest*)
- [x] Fix /seo/portal/approvals 404 — same fix; all portal routes now bypass SeoLayout entirely
- [x] Add PortalFollowUps page — AI-prioritized follow-up list with Draft/SMS/Done/Snooze actions
- [x] Add Follow-Ups nav item to PortalLayout (desktop + mobile)
- [x] Add Follow-Ups to client sidebar Grow section in DashboardLayout
- [x] Register /seo/portal/follow-ups route in App.tsx

## Round 27: Apex Content Tab + Approval Notifications
- [x] Create /seo/portal/apex-content page — unified tab with My Content + Approvals sub-tabs
- [x] Remove separate Content Approvals and My Content sidebar entries, replace with single "Apex Content" entry
- [x] Update PortalLayout nav — replace Content + Approvals with single Apex Content item
- [x] Add approval notification email — trigger SendGrid email to client when admin adds content to approval queue
- [x] Update PortalDashboard quick-links — Apex Content replaces My Content + Approvals cards
- [x] Wire live stats on PortalDashboard — Total Content and Pending Approval show real counts
- [x] Add Follow-Ups quick-link card to PortalDashboard

## Round 28: Portal Improvements (Suggested Follow-ups)
- [x] Approval count badge on Apex Content sidebar entry in DashboardLayout
- [x] Add recentActivity tRPC procedure to content-approvals router
- [x] Live Recent Activity feed on Portal Dashboard — last 10 status changes with icons, status badges, and time-ago
- [x] Select All checkbox in Pending Approvals header of PortalApexContent
- [x] Approve Selected button shown when items are individually checked
- [x] Approve All Social button hidden when items are individually selected (prevents confusion)

## Round 29: Full System Scan
- [x] Audit all routes and pages — 97 routes tested, all HTTP 200
- [x] Test all tRPC API endpoints — 63 procedures tested (queries + mutations), all OK
- [x] Test integrations — SendGrid valid, Vapi valid, Stripe valid (test mode), S3/Forge configured, OAuth configured, LLM available
- [x] Database audit — 95 tables present, all accessible
- [x] Fix PortalPublishing.tsx — missing useState import added
- [x] Fix express clearCookie deprecation warning — removed maxAge from clearCookie call
- [x] Fix auth.logout test — updated assertion to match new clearCookie behavior
- [x] Browser console clean — no ERROR-level entries in latest session
- [x] All 78 vitest tests passing
- [ ] Note: Twilio returns 401 — credentials may need to be re-verified by user

## Round 30: Bug Fixes

- [x] Fix Clients page 404 in AI SEO portal (clicking Clients nav item shows 404) — fixed /clients/:id → /seo/clients/:id
- [x] Integrate AI SEO content generation inline in Apex Content tab — My Content items now open in a right-side Sheet drawer instead of navigating to a separate page
- [x] Fix nested anchor tags in PortalLayout nav (Link wrapping a tags) — removed inner a elements

## Round 31: Admin Promotion + Apex Content CRM Integration

- [x] Promote johnmoreno189@gmail.com to admin role in database
- [x] Move Apex Content (Approvals + My Content tabs) into main CRM layout — new /apex-content route uses DashboardLayout like Social Media; all sidebar/dashboard links updated

## Round 32: Owner Meeting Changes (March 9)

### Phase 1 — Quick Wins
- [x] Remove Automations from client sidebar (DashboardLayout clientMenuSections)
- [x] Merge Launchpad into Account Setup — /launchpad now redirects to /account-setup
- [x] Instagram, Facebook, Website URL fields already exist in Account Setup Step 3
- [x] Fix "Connect Your Tools" link to point to Account Setup

### Phase 2 — Client Calendar
- [x] Build full visual calendar page at /calendar for clients (month/week view)
- [x] Show appointments on calendar with color-coded status
- [x] Allow reschedule and cancel from calendar
- [x] Register /calendar route in App.tsx and add to client sidebar

### Phase 3 — Client Conversations
- [ ] Build Conversations page at /conversations (replace placeholder)
- [ ] Left panel: smart lists + contact list with search bar
- [ ] Right panel: conversation thread (email/SMS two-way)
- [ ] Wire to existing leads/contacts data

### Phase 4 — AI Coach Widget
- [x] AI Coach widget already exists as AIAssistantWidget (bottom-right floating chat, context-aware, uses aiAssistant.chat procedure)

### Phase 5 — Website Tab
- [x] Add Website tab to client sidebar at /website
- [x] View-only: show client's website URL in an iframe with desktop/tablet/mobile modes
- [x] Pull website URL from client's account setup profile

### Phase 6 — Admin Sidebar Cleanup
- [x] Remove Social Media tab from admin sidebar
- [x] Marketing tab already existed in admin sidebar
- [x] Add Payments & Subscriptions tab to admin sidebar
- [x] Build Payments page showing active/inactive/canceled clients with search and filters

### Phase 7 — Appointment Fixes
- [x] Add No-Show, No-Answer, Busy statuses to appointments (schema updated, DB migrated, router updated)
- [x] Make client/lead names clickable in Appointments pipeline → navigate to their profile

### Phase 8 — Partner Portal Rebuild
- [x] Partner Portal already exists at /partner-portal as a dedicated page (token-based access for partners)

## Round 33: GHL-Style Redesign + Follow-ups + Test Clients

- [ ] Add Suggested Follow-ups AI tab to Follow-ups page
- [ ] Redesign client-facing layout: light theme, GHL-style sidebar + top nav bar
- [ ] Convert Account Setup from separate wizard page to inline settings panel within CRM
- [ ] Seed 5 realistic test client accounts with leads and appointments

## Round 33: GHL-Style Conversations + Test Data
- [x] Seed 5 realistic test client accounts (Sarah Williams, Emily Thompson, Lisa Garcia, Kevin Wilson, Tanya Johnson) with leads and appointments
- [x] Seed 8 test conversations with messages (SMS + email channels)
- [x] Rebuild Conversations page with GHL-style two-panel inbox (smart lists, thread view, send messages)
- [x] New conversations backend router (list, getMessages, sendMessage, markRead, markUnread, archive, getStats)
- [x] Add Conversations to admin sidebar under Activity section
- [ ] Add Suggested Follow-ups AI tab to Follow-ups page (suggested follow-up actions with AI-generated messages)
- [ ] Conversations unread badge in sidebar nav item
- [ ] Account Setup inline panel (GHL-style, no separate page redirect)

## Round 34: Critical Fixes & New Features

- [x] Fix server wake-up issue (restart dev server)
- [x] Fix client detail 404 — fixed onboardingProgress.clientId → userId mismatch, fixed agency_settings missing table, linked client 1 to user 1
- [x] Add Suggested Follow-up #1 to Follow-ups page — AI Suggestions tab already exists, linked user 1 to client 1 so suggestions show
- [x] Add Suggested Follow-up #2 to Follow-ups page — same fix, getSuggested returns top 10 suggestions
- [x] Build AI website generator on admin SEO side — /seo/website-generator page with LLM generation, preview, DB storage, SEO style
- [x] Add Ad Manager to client sidebar under Content & Ads section
- [x] Add Social Media and Apex Content to client sidebar under Content & Ads section
- [x] Twilio SMS verified — credentials configured, sendFollowUpSMS procedure active, SMS Campaigns in client sidebar
- [x] Vapi AI Calling verified — API key + phone number ID configured, AI Calling in client sidebar under Communicate
- [x] SendGrid email verified — API key configured, Email Campaigns in client sidebar under Communicate
- [x] Market Analytics added to client sidebar under Grow section — /market-analytics route fixed

## Round 35: UI Fixes + Ad Manager + Follow-ups

- [ ] Fix AI Calling UI — redesign to match CRM style (dark sidebar, cards, proper layout)
- [ ] Rebuild Ad Manager as full CRM page — connected to client leads, campaigns, and ad spend data
- [ ] Add Suggested Follow-ups prominently to Follow-ups page (top 2 shown with AI draft buttons)
- [ ] Fix appointment contact links — clicking contact name navigates to /leads/:id

## Round 35: Four Outstanding Fixes
- [x] Fix Appointments contact links — updated seeded appointments to have real lead_id values (leads 1-5), names now match leads and clicking navigates to /leads/:id
- [x] Add prominent Today's Top Follow-Ups banner — top 2 AI suggestions shown above tabs in FollowUps page with urgency color coding and "Act" quick-action button
- [x] Verify Ad Manager route — /ad-manager route already in App.tsx and sidebar already links to it via DashboardLayout Content & Ads section
- [x] Redesign AI Calling UI — updated to use CRMLayout (matching other client pages), added Tabs (Call History / AI Assistants / How It Works), answer rate in header, 5 KPI cards, consistent design system

## Round 36: Conversations + Follow-Ups Fixes
- [x] Conversations: Add "New Conversation" button (the + icon) that opens a composer dialog to start SMS or email with any contact/lead
- [x] Follow-Ups: Expand Today's Top Follow-Ups banner from 2 to 3 suggestions

## Pre-Launch Sprint (Tonight)

- [x] Add loginWithPassword tRPC procedure (bcrypt.compare + session cookie)
- [x] Add email/password login form on Home page for sub-account users
- [x] Add Email campaign scheduling UI (datetime-local picker + scheduledDate field)
- [x] Add SMS campaign scheduling UI (datetime-local picker + scheduledDate field)
- [x] Campaign scheduler cron job created (fires due campaigns every minute)
- [x] Wire initializeCronJobs() into server startup (was never being called — critical fix!)
- [x] All 82 tests passing

## Round 37: Deployment Fix + Square + Integrations Tab

- [ ] Fix deployment crash: puppeteer-core ERR_MODULE_NOT_FOUND in production build
- [ ] Add Square payment integration (replace Stripe references in UI)
- [ ] Add Integrations tab to Settings page (Twilio, SendGrid, Vapi, Square credentials)

## Round 38: Follow-Ups Banner + Settings Visibility

- [ ] Follow-Ups banner: show all 3 suggestions (items 1, 2, and 3)
- [ ] Settings: ensure it is visible and accessible in the sidebar navigation

## Round 38: Follow-Ups Banner + Settings Nav

- [x] Follow-Ups banner: show all 3 suggestions (updated DB leads to have new/contacted/qualified statuses)
- [x] Settings: added /settings route to App.tsx and linked sidebar to it (both admin and client sidebars)

## Round 40: Facebook Lead Fix + Login Fix

- [x] Fix email+password login redirect issue (platform-level OAuth intercept)
- [x] Add /api/client-login standalone HTML login page that bypasses platform OAuth
- [x] Add facebook_page_configs table to store per-client page tokens
- [x] Fix Facebook webhook to look up token and client from DB by page ID
- [x] Restore Facebook page token input UI in Settings → Webhooks
- [x] Save Tim's page config (page 500444413143324 → client 60002)
- [x] Save Kyle's page config (page 61586221872067 → client 60001)
- [ ] Fix Tim's Facebook app leads_retrieval permission so lead data can be fetched
- [ ] Backfill 2 existing Tim leads with real contact data once permission is fixed
- [ ] Fix app visibility from "Only people invited" to "Public" (Thailer must do this)

## Round 41: Lead Import Fix

- [ ] Fix field mapper to recognize "Owner 1 First Name" / "Owner 1 Last Name" column patterns
- [ ] Fix field mapper to handle "Mobile" and "Landline" phone columns
- [ ] Fix field mapper to handle property data columns (Address, City, State, Zip, Property Type, etc.)
- [ ] Make import work with combined name columns (single "Owner" field)

## Round 42: Bug Fixes
- [x] Fixed "Client profile not found" on lead import — root cause: Kyle's client record (id 60001) had user_id=null, not linked to his user account
- [x] Linked Kyle's client record (id 60001) to his user account (id 540353) in the database
- [x] Fixed Kyle's user role from 'user' to 'client_user' so he can access client procedures
- [x] Rewrote LeadImport page to use leads.bulkImport with admin client selector dropdown (instead of crm.createLead row-by-row which required a linked client profile)
- [x] Fixed webinar_registrations table schema mismatch — dropped old table, recreated with correct columns (webinar_id, state, brokerage, status, reminder columns, etc.)
- [x] Webinar cron job errors now resolved — no more "Unknown column webinar_date" errors every minute

## Round 43: CSV Import Parser Fix
- [x] Fixed CSV column mapping to support Palm Beach CSV headers (Owner 1 First Name, Owner 1 Last Name, Mobile, Landline, Email, Address, City, State, Zip, etc.)
- [x] Fixed name resolution for LLC/company rows where first name is blank — uses last name as both first and last
- [x] Made phone optional in bulkImport schema (some rows have email only)
- [x] Added Landline as fallback phone when Mobile is empty
- [x] Added batching (500 rows per request) to prevent timeouts on large CSVs like the 7,027-row Palm Beach file
- [x] Simulation confirmed: 6,478 of 7,027 rows will import (549 skipped — no email AND no phone)

## Round 44: Client View & Schema Drift Fixes
- [x] Fix "Lead Not Found" in client view — wire x-impersonate-client-id header from localStorage to tRPC client
- [x] Fix lead_activities schema drift — update schema.ts and db.ts to match live DB column names (leadId, type, content)
- [x] Fix createLeadActivity and getLeadActivities to use raw SQL matching live DB

## Round 45: Client Dashboard Navigation (LoanOS Gap Analysis #1)
- [x] Build AI Success Coach page (/ai-coach) with dismissible recommendation cards
- [x] Build Follow-Up Actions page (/follow-up-actions) with no-show/cancellation/stale lead categories
- [x] Build Ads Performance page (/ads-performance) with client-facing read-only metrics
- [x] Build SEO Insights page (/seo-insights) with keyword rankings and content performance
- [x] Update client sidebar to 13-item spec (Dashboard, Contacts, Conversations, Pipeline, Calendar, Follow-Up Actions, AI Success Coach, Ads Performance, Website, SEO Insights, Content Approvals, Reports, Settings)
- [x] Wire all new routes in App.tsx
- [x] Fix conversations router agencyId resolution for client_user role (was returning 0)
- [x] Fix lead_activities schema drift in sales-followup-agent and client-nurture-agent
