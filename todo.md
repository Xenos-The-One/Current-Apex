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
