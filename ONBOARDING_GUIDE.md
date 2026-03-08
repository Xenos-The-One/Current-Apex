# Agency CRM Platform — Onboarding Guide

This guide covers two distinct onboarding flows: the **Admin Onboarding** (you, Thailer, setting up a new client) and the **Client Onboarding** (the client completing their own setup after you've added them).

---

## Part 1: Admin — Adding a New Client

### Step 1: Create the Client in the CRM

1. Log in as **Thailer** (admin).
2. Navigate to **Admin Dashboard** (`/admin`).
3. Click **"+ Add Client"** in the top-right of the Contacts section.
4. Fill in the client's name, email, company, phone, and monthly budget.
5. Click **Save**.

> **What happens automatically:** The system creates a CRM `clients` row AND a linked `seo_clients` row. The client now appears in both the CRM and the AI SEO Portal client list.

---

### Step 2: Run the Onboarding Snapshot (Admin Side)

The Onboarding Snapshot is a 5-step wizard you fill out on behalf of the client to pre-configure their entire account.

Navigate to **Admin Dashboard → "Snapshot" button** next to the client, or go to `/onboarding-snapshot`.

| Step | Name | What You Fill In |
|---|---|---|
| 1 | **Client Info** | First/last name, email, phone |
| 2 | **Business Info** | Company name, industry, business type, website URL |
| 3 | **Social & Ads** | Facebook page ID, Instagram handle, Google Ads customer ID, Facebook Ad Account ID |
| 4 | **Brand & SEO** | Brand voice (e.g., "professional, friendly"), target audience, primary services, unique selling proposition, competitor URLs |
| 5 | **Automation** | Vapi AI calling enabled/disabled, SMS follow-up enabled, email follow-up enabled |

Click **"Apply Snapshot"** on Step 5. This:
- Creates the client's CRM profile with all business details
- Creates the SEO client profile linked to the CRM client
- Pre-configures automation settings
- Triggers the first batch of AI content generation (12 pieces)

---

### Step 3: Review AI-Generated Content

1. Go to **Content Approvals** (`/content-approvals`).
2. Select the client from the dropdown.
3. Review the 12 AI-generated content pieces (blog posts, social posts, video scripts).
4. Click **Approve** on pieces that look good, or **Request Changes** on ones that need revision.
5. Approved content is automatically queued in the Social Media Scheduler.

---

### Step 4: Send the Client Their Login

1. Go to **Admin Dashboard** → click the client row.
2. Click **"Send Invite"** to email the client their login link.
3. The client receives an email with a magic link to create their account.
4. When they log in for the first time, they are automatically redirected to the **Client Launchpad** (`/launchpad`).

---

## Part 2: Client — Self-Service Onboarding

When a client logs in for the first time, they land on the **Launchpad** — a 13-step checklist organized into 4 phases.

### Phase 1: Get Set Up (Steps 1–3)

| Step | Title | What the Client Does |
|---|---|---|
| 1 | **Account Created** | Auto-completed on first login ✅ |
| 2 | **Complete Your Profile** | Fills in their profile: name, phone, avatar, notification preferences at `/account` |
| 3 | **Set Up Your Booking Page** | Configures their public booking link so leads can schedule consultations at `/account` |

---

### Phase 2: Connect Your Tools (Steps 4–7)

| Step | Title | What the Client Does |
|---|---|---|
| 4 | **Connect Facebook Ads** | Links their Facebook account so leads from ads flow into the CRM at `/account` |
| 5 | **Connect Your Calendar** | Syncs Google Calendar so appointments appear automatically at `/account` |
| 6 | **Enable Push Notifications** | Turns on browser/phone notifications for new leads at `/notifications` |
| 7 | **Review Your AI Content Plan** | Reviews and approves the first batch of AI-generated SEO content at `/content-approvals` |

---

### Phase 3: Launch Your Campaign (Steps 8–10)

| Step | Title | What the Client Does |
|---|---|---|
| 8 | **Receive Your First Lead** | Auto-completed when the first lead enters the CRM ✅ |
| 9 | **Book Your First Appointment** | Auto-completed when the first appointment is booked ✅ |
| 10 | **Review Your AI Call Script** | Reviews the AI voice script that calls leads within minutes of form submission at `/ai-scripts` |

---

### Phase 4: Go Live (Steps 11–13)

| Step | Title | What the Client Does |
|---|---|---|
| 11 | **Complete Your Strategy Call** | Books a 1-on-1 call with Raindrop Marketing team at `/appointments` |
| 12 | **Launch Your First Campaign** | Creates their first email or SMS campaign at `/campaigns` |
| 13 | **System Fully Live 🎉** | All steps complete — AI is running 24/7 |

---

## Part 3: Client — Detailed Business Onboarding (Optional Deep-Dive)

If the client wants to fill in their own detailed business information (instead of relying on the admin snapshot), they can go to `/client-onboarding` — a separate 4-step wizard.

| Step | Name | What the Client Fills In |
|---|---|---|
| 1 | **Business Info** | Business name, type, industry, phone, email, website, address |
| 2 | **Services & Brand** | Primary services, unique selling proposition, brand voice, target audience, competitor URLs |
| 3 | **Social & Website** | Facebook, Instagram, LinkedIn, Twitter URLs; website platform (WordPress, Squarespace, etc.); website login credentials for publishing |
| 4 | **Publishing Preferences** | Preferred publish days (e.g., Mon/Wed/Fri), preferred publish time, reporting KPIs, reporting frequency |

After completing Step 4, the system auto-generates 12 content pieces tailored to the client's brand voice and services.

---

## Summary: Who Does What

| Action | Done By | Where |
|---|---|---|
| Create client in CRM | **Admin (Thailer)** | `/admin` → "+ Add Client" |
| Fill Onboarding Snapshot | **Admin (Thailer)** | `/onboarding-snapshot` |
| Review & approve AI content | **Admin (Thailer)** | `/content-approvals` |
| Send client login invite | **Admin (Thailer)** | `/admin` → Client row → "Send Invite" |
| Complete Launchpad checklist | **Client** | `/launchpad` (auto-redirected on first login) |
| Fill detailed business info | **Client (optional)** | `/client-onboarding` |
| Review AI call script | **Client** | `/ai-scripts` |
| Connect Facebook / Calendar | **Client** | `/account` |
| Launch first campaign | **Client** | `/campaigns` |

---

## Key Integrations That Activate During Onboarding

| Integration | Trigger | What It Does |
|---|---|---|
| **Vapi AI Calling** | First lead received | Calls the lead within 2–5 minutes using the AI script |
| **SMS Follow-Up** | Lead not answered after 1st call | Sends automated SMS follow-up |
| **AI Content Generation** | Snapshot applied | Generates 12 content pieces (blog, social, video scripts) |
| **Social Media Scheduler** | Content approved | Queues approved posts for publishing on configured schedule |
| **SEO Portal Sync** | Client created in CRM | Auto-creates SEO client profile linked to CRM client |
| **Google Search Console** | GSC property URL entered | Tracks keyword rankings and site performance |
