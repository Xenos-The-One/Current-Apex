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
- [ ] SendGrid email integration (requires SENDGRID_API_KEY)
- [ ] Twilio SMS integration (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
- [ ] Vapi AI calling integration (requires VAPI_API_KEY)
- [ ] Stripe webhook handler (requires STRIPE_WEBHOOK_SECRET)

## Phase 8: Polish & Delivery
- [x] Vitest unit tests for all routers (19 tests passing)
- [x] Loading states, empty states, error boundaries
- [x] Toast notifications throughout
- [x] Final UI polish and consistency pass
- [x] Checkpoint and delivery
