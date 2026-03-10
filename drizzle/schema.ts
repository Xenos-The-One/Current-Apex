import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

// Export campaign tracking tables
export * from "./schema-campaigns";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "admin", "agency_owner", "client_user", "loa"]).default("client_user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  avatarUrl: text("avatar_url"),
  phone: varchar("phone", { length: 20 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Agencies - Top level tenant
 * Each agency pays the $7,500 setup fee and manages multiple clients
 */
export const agencies = mysqlTable("agencies", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  businessType: mysqlEnum("business_type", ["loan_officer", "real_estate"]).notNull(),
  targetMarkets: text("target_markets"), // JSON array of target markets
  teamSize: int("team_size"),
  webinarWillingness: boolean("webinar_willingness").default(false),
  avatarRecording: mysqlEnum("avatar_recording", ["self", "studio"]),
  avatarStatus: mysqlEnum("avatar_status", ["pending", "recording_scheduled", "in_progress", "completed"]).default("pending"),
  // Third-party account management
  elevenLabsEmail: varchar("eleven_labs_email", { length: 320 }),
  elevenLabsStatus: mysqlEnum("eleven_labs_status", ["not_created", "pending", "active", "credentials_shared"]).default("not_created"),
  heygenEmail: varchar("heygen_email", { length: 320 }),
  heygenStatus: mysqlEnum("heygen_status", ["not_created", "pending", "active", "credentials_shared"]).default("not_created"),
  setupFeePaid: boolean("setup_fee_paid").default(false),
  setupFeePaymentIntentId: varchar("setup_fee_payment_intent_id", { length: 255 }),
  strategyCallBooked: boolean("strategy_call_booked").default(false),
  strategyCallDate: timestamp("strategy_call_date"),
  googleCalendarEventId: varchar("google_calendar_event_id", { length: 255 }),
  status: mysqlEnum("status", ["pending_payment", "pending_call", "active", "suspended"]).default("pending_payment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Clients - Individual loan officers or real estate agents within an agency
 * Each client has a subscription tier
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  userId: int("user_id").references(() => users.id), // Optional - client may not have user account yet
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  subscriptionTier: mysqlEnum("subscription_tier", ["starter", "pro", "enterprise", "done_for_you"]).notNull(),
  subscriptionStatus: mysqlEnum("subscription_status", ["trial", "active", "past_due", "canceled", "paused"]).default("trial").notNull(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  trialStartDate: timestamp("trial_start_date").defaultNow().notNull(),
  trialEndDate: timestamp("trial_end_date"), // 90 days from trial start
  billingStartDate: timestamp("billing_start_date"),
  accessMode: mysqlEnum("access_mode", ["limited", "full", "read_only"]).default("limited").notNull(),
  leadCount: int("lead_count").default(0).notNull(),
  // Booking page
  bookingSlug: varchar("booking_slug", { length: 100 }),
  bookingTitle: varchar("booking_title", { length: 255 }),
  bookingDescription: text("booking_description"),
  bookingActive: boolean("booking_active").default(true),
  // Vapi call settings — set to false for clients who handle calls manually (e.g. Tim Haskins)
  vapiCallsEnabled: boolean("vapi_calls_enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Subscription pricing tiers
 */
export const subscriptionTiers = mysqlTable("subscription_tiers", {
  id: int("id").autoincrement().primaryKey(),
  tier: mysqlEnum("tier", ["starter", "pro", "enterprise", "done_for_you"]).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  features: text("features"), // JSON array of features
  leadLimit: int("lead_limit"), // null = unlimited
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Leads - Individual prospects for clients
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id").notNull().references(() => clients.id),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  source: varchar("source", { length: 255 }), // e.g., "facebook", "google_ads", "referral"
  status: mysqlEnum("status", ["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"]).default("new").notNull(),
  vapiAssistantId: varchar("vapi_assistant_id", { length: 255 }), // Different assistant per lead source
  vapiCallInitiated: timestamp("vapi_call_initiated"), // Track when Vapi call was initiated
  lastContactDate: timestamp("last_contact_date"),
  appointmentDate: timestamp("appointment_date"),
  notes: text("notes"),
  customFields: text("custom_fields"), // JSON for flexible data
  score: int("score").default(0), // Lead score (0-140)
  scoreTier: mysqlEnum("score_tier", ["hot", "warm", "cold"]).default("cold"), // Lead tier based on score
  birthday: timestamp("birthday"), // Client's birthday for automated birthday notifications
  birthdayNotificationSent: boolean("birthday_notification_sent").default(false), // Track if we notified Timisha
  birthdayVideoApproved: boolean("birthday_video_approved").default(false), // Track if Timisha approved the video
  birthdayVideoUrl: text("birthday_video_url"), // URL to approved HeyGen video
  appointmentBookedAt: timestamp("appointment_booked_at"), // When user booked appointment themselves
  vapiCallScheduledAt: timestamp("vapi_call_scheduled_at"), // When Vapi call is scheduled (5 min after lead creation)
  afterHoursSmsSent: boolean("after_hours_sms_sent").default(false), // Whether after-hours SMS was sent
  // Closing anniversaries for refinance follow-up
  closingDate: timestamp("closing_date"), // When the loan closed
  sixMonthAnniversaryNotificationSent: boolean("six_month_anniversary_notification_sent").default(false),
  oneYearAnniversaryNotificationSent: boolean("one_year_anniversary_notification_sent").default(false),
  anniversaryVideoUrl: text("anniversary_video_url"), // URL to HeyGen anniversary video
  // Test lead flag — suppresses all outbound comms (email, SMS, Vapi, push)
  isTest: boolean("is_test").default(false),
  // === TIER 1 COMPETITOR PARITY FIELDS ===
  // Loan details
  loanAmount: decimal("loan_amount", { precision: 12, scale: 2 }), // Loan amount in dollars
  loanType: mysqlEnum("loan_type", ["purchase", "refinance", "heloc", "reverse_mortgage", "construction", "other"]),
  probability: int("probability").default(0), // Conversion probability 0-100%
  // Contact classification
  contactType: mysqlEnum("contact_type", [
    "borrower", "real_estate_agent", "attorney", "insurance_agent",
    "title_company", "builder_developer", "lender", "other"
  ]).default("borrower"),
  // Partner pipeline stage (for non-borrower contacts)
  partnerStage: mysqlEnum("partner_stage", [
    "prospect", "contacted", "meeting_scheduled", "active_partner", "top_partner"
  ]),
  // Tier classification
  partnerTier: mysqlEnum("partner_tier", ["bronze", "silver", "gold", "platinum"]),
  // Team assignment
  assignedToUserId: int("assigned_to_user_id").references(() => users.id), // Which team member owns this lead
  // Pipeline type - separates sales (partner/referral) from loan (borrower) pipeline
  pipelineType: mysqlEnum("pipeline_type", ["loan", "sales"]).default("loan"),
  // Refi Campaign fields
  refiProspect: boolean("refi_prospect").default(false), // Tagged as refi prospect
  refiDripStartedAt: timestamp("refi_drip_started_at"), // When the 14-day drip was triggered
  refiDripStep: int("refi_drip_step").default(0), // 0=not started, 1=day0 sent, 2=day3 sent, 3=day7 sent, 4=day14 sent
  refiDripCompletedAt: timestamp("refi_drip_completed_at"), // When drip finished
  // Follow-up snooze — hide this lead from suggestions until the given date
  snoozedUntil: timestamp("snoozed_until"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Lead activities - Track all interactions with leads
 */
export const leadActivities = mysqlTable("lead_activities", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("lead_id").notNull().references(() => leads.id),
  activityType: mysqlEnum("activity_type", ["call", "email", "sms", "note", "status_change", "appointment"]).notNull(),
  description: text("description"),
  vapiCallId: varchar("vapi_call_id", { length: 255 }), // For AI voice calls
  callDuration: int("call_duration"), // seconds
  callRecordingUrl: text("call_recording_url"),
  performedBy: int("performed_by").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Vapi Assistants - AI voice assistants per client/lead source
 */
export const vapiAssistants = mysqlTable("vapi_assistants", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("client_id").notNull().references(() => clients.id),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  name: varchar("name", { length: 255 }).notNull(),
  vapiAssistantId: varchar("vapi_assistant_id", { length: 255 }).notNull(),
  leadSource: varchar("lead_source", { length: 255 }), // null = default assistant
  script: text("script"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Email campaigns
 */
export const emailCampaigns = mysqlTable("email_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  clientId: int("client_id").references(() => clients.id), // null = agency-wide
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlContent: text("html_content"),
  textContent: text("text_content"),
  recipientFilter: mysqlEnum("recipient_filter", ["all", "status", "custom"]).default("all").notNull(),
  recipientStatus: varchar("recipient_status", { length: 100 }),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "paused", "failed"]).default("draft").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  sentDate: timestamp("sent_date"),
  sentCount: int("sent_count").default(0),
  failedCount: int("failed_count").default(0),
  openCount: int("open_count").default(0),
  clickCount: int("click_count").default(0),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * SMS campaigns
 */
export const smsCampaigns = mysqlTable("sms_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  clientId: int("client_id").references(() => clients.id),
  name: varchar("name", { length: 255 }).notNull(),
  message: text("message").notNull(),
  recipientFilter: mysqlEnum("recipient_filter", ["all", "status", "custom"]).default("all").notNull(),
  recipientStatus: varchar("recipient_status", { length: 100 }),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "paused", "failed"]).default("draft").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  sentDate: timestamp("sent_date"),
  sentCount: int("sent_count").default(0).notNull(),
  failedCount: int("failed_count").default(0).notNull(),
  deliveredCount: int("delivered_count").default(0).notNull(),
  totalRecipients: int("total_recipients").default(0).notNull(),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * SMS campaign recipients
 * Tracks individual recipients for each SMS campaign
 */
export const smsCampaignRecipients = mysqlTable("sms_campaign_recipients", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaign_id").notNull().references(() => smsCampaigns.id),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "delivered", "failed"]).default("pending").notNull(),
  messageSid: varchar("message_sid", { length: 255 }),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Social media posts
 */
export const socialMediaPosts = mysqlTable("social_media_posts", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  clientId: int("client_id").references(() => clients.id),
  platform: mysqlEnum("platform", ["facebook", "instagram", "twitter", "linkedin"]).notNull(),
  content: text("content").notNull(),
  mediaUrls: text("media_urls"), // JSON array of image/video URLs
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed"]).default("draft").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  publishedDate: timestamp("published_date"),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * AI generated scripts for campaigns
 */
export const aiScripts = mysqlTable("ai_scripts", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  clientId: int("client_id").references(() => clients.id),
  scriptType: mysqlEnum("script_type", ["email", "sms", "social", "voice", "youtube"]).notNull(),
  prompt: text("prompt").notNull(),
  generatedContent: text("generated_content").notNull(),
  isUsed: boolean("is_used").default(false),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Lead source to Vapi assistant mapping
 * Configure which assistant calls leads from specific sources
 */
export const leadSourceAssistantMappings = mysqlTable("lead_source_assistant_mappings", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  leadSource: varchar("lead_source", { length: 255 }).notNull(), // e.g., "facebook", "instagram", "linkedin"
  vapiAssistantId: varchar("vapi_assistant_id", { length: 255 }).notNull(),
  autoCallEnabled: boolean("auto_call_enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadSourceAssistantMapping = typeof leadSourceAssistantMappings.$inferSelect;
export type InsertLeadSourceAssistantMapping = typeof leadSourceAssistantMappings.$inferInsert;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type InsertLeadActivity = typeof leadActivities.$inferInsert;
export type VapiAssistant = typeof vapiAssistants.$inferSelect;
export type InsertVapiAssistant = typeof vapiAssistants.$inferInsert;

/**
 * Campaign Templates - Pre-written email and SMS templates
 */
export const campaignTemplates = mysqlTable("campaign_templates", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").references(() => agencies.id), // null = system template
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["email", "sms"]).notNull(),
  category: varchar("category", { length: 100 }), // e.g., "follow_up", "appointment_reminder", "nurture"
  subject: varchar("subject", { length: 500 }), // for email only
  content: text("content").notNull(),
  variables: text("variables"), // JSON array of available variables
  isSystem: boolean("is_system").default(false), // system templates can't be deleted
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignTemplate = typeof campaignTemplates.$inferSelect;
export type InsertCampaignTemplate = typeof campaignTemplates.$inferInsert;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;
export type SmsCampaign = typeof smsCampaigns.$inferSelect;
export type InsertSmsCampaign = typeof smsCampaigns.$inferInsert;
export type SmsCampaignRecipient = typeof smsCampaignRecipients.$inferSelect;
export type InsertSmsCampaignRecipient = typeof smsCampaignRecipients.$inferInsert;
export type SocialMediaPost = typeof socialMediaPosts.$inferSelect;
export type InsertSocialMediaPost = typeof socialMediaPosts.$inferInsert;
export type AiScript = typeof aiScripts.$inferSelect;
export type InsertAiScript = typeof aiScripts.$inferInsert;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertSubscriptionTier = typeof subscriptionTiers.$inferInsert;

/**
 * Webinar Registrations
 * Tracks registrations for marketing webinars
 */
export const webinarRegistrations = mysqlTable("webinar_registrations", {
  id: int("id").autoincrement().primaryKey(),
  webinarId: varchar("webinar_id", { length: 255 }).notNull(), // e.g., "dpa-feb-19-2026"
  webinarTitle: varchar("webinar_title", { length: 500 }).notNull(),
  webinarDate: timestamp("webinar_date").notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  brokerage: varchar("brokerage", { length: 255 }),
  status: mysqlEnum("status", ["registered", "confirmed", "attended", "no_show", "cancelled"]).default("registered").notNull(),
  reminderSent24h: boolean("reminder_sent_24h").default(false),
  reminderSent2h: boolean("reminder_sent_2h").default(false),
  reminderSent1h: boolean("reminder_sent_1h").default(false),
  lastChanceSent: boolean("last_chance_sent").default(false),
  webinarLink: varchar("webinar_link", { length: 500 }),
  recordingSent: boolean("recording_sent").default(false),
  reminder1WeekSent: boolean("reminder_1_week_sent").default(false),
  reminder3DaysSent: boolean("reminder_3_days_sent").default(false),
  reminder1DaySent: boolean("reminder_1_day_sent").default(false),
  reminder1HourSent: boolean("reminder_1_hour_sent").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WebinarRegistration = typeof webinarRegistrations.$inferSelect;
export type InsertWebinarRegistration = typeof webinarRegistrations.$inferInsert;


/**
 * Appointments
 * Tracks booked appointments for loan officers and their LOAs
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  leadId: int("lead_id").references(() => leads.id), // Optional - can book without being in leads table
  // Contact information (required even if no leadId)
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  // Appointment details
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: int("duration").default(30).notNull(), // minutes
  appointmentType: mysqlEnum("appointment_type", ["consultation", "application", "closing", "follow_up"]).default("consultation").notNull(),
  loanType: varchar("loan_type", { length: 100 }), // e.g., "Purchase", "Refinance", "HELOC"
  propertyAddress: text("property_address"),
  notes: text("notes"),
  // Assignment
  assignedTo: mysqlEnum("assigned_to", ["loan_officer", "loa"]).default("loan_officer").notNull(),
  // Status tracking
  status: mysqlEnum("status", ["scheduled", "confirmed", "completed", "cancelled", "no_show", "no_answer", "busy"]).default("scheduled").notNull(),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSent24h: boolean("reminder_sent_24h").default(false),
  reminderSent2h: boolean("reminder_sent_2h").default(false),
  confirmationSent: boolean("confirmation_sent").default(false),
  // Source tracking
  source: varchar("source", { length: 100 }), // e.g., "Facebook Ad", "Instagram", "Referral"
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

/**
 * Content Approvals
 * Tracks content (video scripts, social posts) awaiting approval from Tim/Timisha
 */
export const contentApprovals = mysqlTable("content_approvals", {
  id: int("id").autoincrement().primaryKey(),
  // NOTE: Old columns use camelCase DB names (created by original migration before schema standardization)
  agencyId: int("agencyId").notNull().references(() => agencies.id),
  clientId: int("client_id").references(() => clients.id),
  contentType: mysqlEnum("contentType", ["video_script", "social_post", "email", "sms", "ad_copy"]).notNull(),
  platform: varchar("platform", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content").notNull(),
  reasoning: text("reasoning"),
  stats: text("stats"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "revised"]).default("pending").notNull(),
  approverName: varchar("approver_name", { length: 255 }),
  approverPhone: varchar("approver_phone", { length: 20 }),
  feedback: text("feedback"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  smsApprovalSent: boolean("sms_approval_sent").default(false),
  smsApprovalSentAt: timestamp("sms_approval_sent_at"),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentApproval = typeof contentApprovals.$inferSelect;
export type InsertContentApproval = typeof contentApprovals.$inferInsert;

/**
 * Automation Workflows
 * Defines automated email/SMS sequences triggered by events
 */
export const automationWorkflows = mysqlTable("automation_workflows", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  trigger: mysqlEnum("trigger", [
    "webinar_registration",
    "appointment_booking",
    "lead_created",
    "lead_status_change",
    "lead_tag_added",
    "lead_score_changed",
    "appointment_missed",
    "datacrawl_import",
    "manual",
    "time_based",
    "form_submitted",
    "sms_reply_received",
    "email_opened",
    "email_clicked"
  ]).notNull(),
  triggerConditions: text("trigger_conditions"), // JSON with conditions
  isActive: boolean("is_active").default(true).notNull(),
  // Visual workflow builder state
  canvasNodes: text("canvas_nodes"), // JSON array of React Flow nodes with positions
  canvasEdges: text("canvas_edges"), // JSON array of React Flow edges
  canvasViewport: text("canvas_viewport"), // JSON {x, y, zoom}
  // Template & categorization
  category: varchar("category", { length: 100 }),
  isTemplate: boolean("is_template").default(false).notNull(),
  enrolledCount: int("enrolled_count").default(0).notNull(),
  completedCount: int("completed_count").default(0).notNull(),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AutomationWorkflow = typeof automationWorkflows.$inferSelect;
export type InsertAutomationWorkflow = typeof automationWorkflows.$inferInsert;

/**
 * Automation Workflow Steps
 * Individual steps in an automation sequence
 */
export const automationWorkflowSteps = mysqlTable("automation_workflow_steps", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflow_id").notNull().references(() => automationWorkflows.id),
  nodeId: varchar("node_id", { length: 100 }), // React Flow node ID
  stepOrder: int("step_order").notNull(),
  stepType: mysqlEnum("step_type", [
    "email", "sms", "wait", "condition",
    "vapi_call", "tag_lead", "update_status", "assign_user",
    "webhook", "internal_note", "split_test"
  ]).notNull(),
  label: varchar("label", { length: 255 }),
  delayMinutes: int("delay_minutes").default(0).notNull(),
  delayUnit: mysqlEnum("delay_unit", ["minutes", "hours", "days"]).default("minutes"),
  // Email/SMS content
  subject: varchar("subject", { length: 500 }),
  content: text("content"),
  templateId: int("template_id").references(() => campaignTemplates.id),
  // Action config (JSON for flexible step types)
  actionConfig: text("action_config"),
  // Condition logic
  conditionField: varchar("condition_field", { length: 100 }),
  conditionOperator: varchar("condition_operator", { length: 20 }),
  conditionValue: varchar("condition_value", { length: 255 }),
  // Next step routing
  nextStepIfTrue: int("next_step_if_true"),
  nextStepIfFalse: int("next_step_if_false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AutomationWorkflowStep = typeof automationWorkflowSteps.$inferSelect;
export type InsertAutomationWorkflowStep = typeof automationWorkflowSteps.$inferInsert;

/**
 * Automation Executions
 * Tracks individual automation runs for each lead/contact
 */
export const automationExecutions = mysqlTable("automation_executions", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflow_id").notNull().references(() => automationWorkflows.id),
  leadId: int("lead_id").references(() => leads.id), // Optional: may be webinar registration or appointment
  webinarRegistrationId: int("webinar_registration_id").references(() => webinarRegistrations.id),
  appointmentId: int("appointment_id").references(() => appointments.id),
  contactEmail: varchar("contact_email", { length: 320 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 20 }),
  contactName: varchar("contact_name", { length: 255 }),
  status: mysqlEnum("status", ["active", "completed", "paused", "failed"]).default("active").notNull(),
  currentStepId: int("current_step_id").references(() => automationWorkflowSteps.id),
  nextExecutionAt: timestamp("next_execution_at"), // When to run next step
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type InsertAutomationExecution = typeof automationExecutions.$inferInsert;

/**
 * Automation Step Logs
 * Logs each step execution for debugging and analytics
 */
export const automationStepLogs = mysqlTable("automation_step_logs", {
  id: int("id").autoincrement().primaryKey(),
  executionId: int("execution_id").notNull().references(() => automationExecutions.id),
  stepId: int("step_id").notNull().references(() => automationWorkflowSteps.id),
  status: mysqlEnum("status", ["pending", "sent", "delivered", "failed", "skipped"]).default("pending").notNull(),
  emailMessageId: varchar("email_message_id", { length: 255 }), // SendGrid message ID
  smsMessageSid: varchar("sms_message_sid", { length: 255 }), // Twilio message SID
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export type AutomationStepLog = typeof automationStepLogs.$inferSelect;
export type InsertAutomationStepLog = typeof automationStepLogs.$inferInsert;


/**
 * Push Subscriptions - Web Push API subscription data for PWA notifications
 * Each device/browser gets its own subscription
 */
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id), // null = team member without user account
  teamMemberId: int("team_member_id"), // References team_members table
  endpoint: text("endpoint").notNull(), // Push service endpoint URL
  p256dh: text("p256dh").notNull(), // Client public key
  auth: text("auth").notNull(), // Auth secret
  deviceName: varchar("device_name", { length: 255 }), // e.g., "Tariq's Android", "Tim's iPhone"
  isActive: boolean("is_active").default(true).notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

/**
 * Team Notifications - In-app notification inbox for team members
 * Stores all AI Ops Director messages for viewing in the app
 */
export const teamNotifications = mysqlTable("team_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id), // null = broadcast to all
  teamMemberId: int("team_member_id"), // References team_members table
  teamMemberName: varchar("team_member_name", { length: 255 }), // Denormalized for quick display
  type: mysqlEnum("type", [
    "daily_standup",
    "weekly_strategy",
    "weekly_report",
    "hot_lead",
    "birthday_alert",
    "no_show_alert",
    "webinar_milestone",
    "ad_spend_alert",
    "system",
    "custom",
    "new_lead",
    "appointment_booked",
    "vapi_call",
    "lead_status_change",
    "facebook_lead",
    "content_comment"
  ]).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body").notNull(),
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  pushSent: boolean("push_sent").default(false).notNull(), // Whether push notification was sent
  pushSentAt: timestamp("push_sent_at"),
  actionUrl: varchar("action_url", { length: 500 }), // Deep link to relevant page
  metadata: text("metadata"), // JSON with extra data (lead info, stats, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TeamNotification = typeof teamNotifications.$inferSelect;
export type InsertTeamNotification = typeof teamNotifications.$inferInsert;


/**
 * LOA Assignments - Links Loan Officer Assistants to their Loan Officers
 * LOAs get full access to their LO's data (leads, appointments, campaigns, analytics)
 * but cannot access billing or admin functions
 */
export const loaAssignments = mysqlTable("loa_assignments", {
  id: int("id").autoincrement().primaryKey(),
  loaUserId: int("loa_user_id").notNull().references(() => users.id),
  loUserId: int("lo_user_id").notNull().references(() => users.id), // The Loan Officer they assist
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  clientId: int("client_id").references(() => clients.id), // The client record for the LO
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LoaAssignment = typeof loaAssignments.$inferSelect;
export type InsertLoaAssignment = typeof loaAssignments.$inferInsert;


/**
 * Borrowers - Comprehensive database of all potential and active borrowers
 * This is the core data asset for market analysis and loan pipeline management
 * Multi-tenant: each LO sees only their borrowers, admin sees all
 */
export const borrowers = mysqlTable("borrowers", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  clientId: int("client_id").references(() => clients.id), // Which LO owns this borrower
  assignedUserId: int("assigned_user_id").references(() => users.id), // Direct user assignment

  // === PERSONAL INFORMATION ===
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  secondaryPhone: varchar("secondary_phone", { length: 20 }),
  dateOfBirth: timestamp("date_of_birth"),
  ssn4: varchar("ssn_last_4", { length: 4 }), // Last 4 of SSN only (security)
  maritalStatus: mysqlEnum("marital_status", ["single", "married", "divorced", "widowed", "separated"]),
  dependents: int("dependents").default(0),
  preferredContactMethod: mysqlEnum("preferred_contact_method", ["phone", "email", "text", "mail"]).default("phone"),
  preferredLanguage: varchar("preferred_language", { length: 50 }).default("English"),

  // === ADDRESS ===
  currentAddress: text("current_address"),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zip_code", { length: 10 }),
  county: varchar("county", { length: 255 }),
  housingStatus: mysqlEnum("housing_status", ["renting", "own_with_mortgage", "own_free_clear", "living_with_family", "other"]),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }),
  yearsAtAddress: int("years_at_address"),

  // === EMPLOYMENT & INCOME ===
  employmentStatus: mysqlEnum("employment_status", ["employed", "self_employed", "retired", "unemployed", "military", "student"]),
  employer: varchar("employer", { length: 255 }),
  jobTitle: varchar("job_title", { length: 255 }),
  yearsEmployed: int("years_employed"),
  monthlyIncome: decimal("monthly_income", { precision: 12, scale: 2 }),
  additionalIncome: decimal("additional_income", { precision: 12, scale: 2 }),
  additionalIncomeSource: varchar("additional_income_source", { length: 255 }),
  annualIncome: decimal("annual_income", { precision: 12, scale: 2 }),

  // === FINANCIAL PROFILE ===
  creditScoreRange: mysqlEnum("credit_score_range", [
    "below_580", "580_619", "620_659", "660_699", "700_739", "740_779", "780_plus", "unknown"
  ]).default("unknown"),
  creditScoreExact: int("credit_score_exact"), // If they provide exact score
  totalDebt: decimal("total_debt", { precision: 12, scale: 2 }),
  monthlyDebtPayments: decimal("monthly_debt_payments", { precision: 10, scale: 2 }),
  bankruptcyHistory: boolean("bankruptcy_history").default(false),
  bankruptcyDischargeDate: timestamp("bankruptcy_discharge_date"),
  foreclosureHistory: boolean("foreclosure_history").default(false),
  foreclosureDate: timestamp("foreclosure_date"),
  savingsAmount: decimal("savings_amount", { precision: 12, scale: 2 }),
  downPaymentAmount: decimal("down_payment_amount", { precision: 12, scale: 2 }),
  downPaymentSource: mysqlEnum("down_payment_source", [
    "savings", "gift", "grant", "401k", "sale_of_property", "dpa_program", "other"
  ]),
  dtiRatio: decimal("dti_ratio", { precision: 5, scale: 2 }), // Debt-to-income ratio

  // === LOAN DETAILS ===
  loanPurpose: mysqlEnum("loan_purpose", [
    "purchase", "refinance_rate_term", "refinance_cash_out", "heloc", "reverse_mortgage", "construction", "renovation", "other"
  ]),
  loanType: mysqlEnum("loan_type", [
    "conventional", "fha", "va", "usda", "jumbo", "non_qm", "bridge", "hard_money", "other"
  ]),
  desiredLoanAmount: decimal("desired_loan_amount", { precision: 12, scale: 2 }),
  estimatedPropertyValue: decimal("estimated_property_value", { precision: 12, scale: 2 }),
  estimatedLtv: decimal("estimated_ltv", { precision: 5, scale: 2 }), // Loan-to-value
  interestRateQuoted: decimal("interest_rate_quoted", { precision: 5, scale: 3 }),
  loanTerm: mysqlEnum("loan_term", ["15_year", "20_year", "25_year", "30_year", "arm_5_1", "arm_7_1", "arm_10_1", "other"]),

  // === PROPERTY DETAILS (for purchase or current property for refi) ===
  propertyType: mysqlEnum("property_type", [
    "single_family", "condo", "townhouse", "multi_unit_2_4", "multi_unit_5_plus", "manufactured", "land", "commercial", "other"
  ]),
  propertyUse: mysqlEnum("property_use", ["primary_residence", "second_home", "investment"]),
  targetPropertyAddress: text("target_property_address"),
  targetCity: varchar("target_city", { length: 255 }),
  targetState: varchar("target_state", { length: 100 }),
  targetZipCode: varchar("target_zip_code", { length: 10 }),
  targetCounty: varchar("target_county", { length: 255 }),

  // === CURRENT MORTGAGE (for refinance) ===
  currentLender: varchar("current_lender", { length: 255 }),
  currentLoanBalance: decimal("current_loan_balance", { precision: 12, scale: 2 }),
  currentInterestRate: decimal("current_interest_rate", { precision: 5, scale: 3 }),
  currentMonthlyPayment: decimal("current_monthly_payment", { precision: 10, scale: 2 }),
  currentLoanType: varchar("current_loan_type", { length: 100 }),
  mortgageStartDate: timestamp("mortgage_start_date"),

  // === ELIGIBILITY FLAGS ===
  isFirstTimeBuyer: boolean("is_first_time_buyer").default(false),
  isVaEligible: boolean("is_va_eligible").default(false),
  vaServiceBranch: varchar("va_service_branch", { length: 100 }),
  vaServiceYears: int("va_service_years"),
  isDpaEligible: boolean("is_dpa_eligible").default(false),
  dpaProgram: varchar("dpa_program", { length: 255 }),
  isPreApproved: boolean("is_pre_approved").default(false),
  preApprovalDate: timestamp("pre_approval_date"),
  preApprovalAmount: decimal("pre_approval_amount", { precision: 12, scale: 2 }),
  preApprovalExpiry: timestamp("pre_approval_expiry"),

  // === PIPELINE & STATUS ===
  pipelineStatus: mysqlEnum("pipeline_status", [
    "new",
    "contacted",
    "pre_qualified",
    "pre_approved",
    "house_hunting",
    "under_contract",
    "processing",
    "underwriting",
    "conditional_approval",
    "clear_to_close",
    "closed_funded",
    "closed_lost",
    "on_hold",
    "nurture"
  ]).default("new").notNull(),
  pipelineStatusChangedAt: timestamp("pipeline_status_changed_at"),
  lostReason: mysqlEnum("lost_reason", [
    "went_with_competitor", "not_qualified", "no_response", "changed_mind",
    "price_too_high", "credit_issues", "income_issues", "property_issues", "other"
  ]),
  lostReasonNotes: text("lost_reason_notes"),

  // === TIMELINE & READINESS ===
  purchaseTimeline: mysqlEnum("purchase_timeline", [
    "ready_now", "1_3_months", "3_6_months", "6_12_months", "12_plus_months", "just_exploring"
  ]),
  urgencyLevel: mysqlEnum("urgency_level", ["low", "medium", "high", "critical"]).default("medium"),

  // === SOURCE & REFERRAL TRACKING ===
  leadSource: mysqlEnum("lead_source", [
    "facebook_ad", "instagram_ad", "google_ad", "website", "referral_agent",
    "referral_past_client", "datacrawl", "webinar", "cold_call", "walk_in",
    "zillow", "realtor_com", "loan_depot", "other"
  ]),
  leadSourceDetail: varchar("lead_source_detail", { length: 255 }), // e.g., specific ad name, campaign
  referralPartnerId: int("referral_partner_id"), // References referral_partners table
  referredByBorrowerId: int("referred_by_borrower_id"), // Past client referral
  originalLeadId: int("original_lead_id").references(() => leads.id), // Link back to leads table if graduated

  // === SCORING ===
  borrowerScore: int("borrower_score").default(0), // 0-100 readiness/quality score
  scoreTier: mysqlEnum("score_tier", ["hot", "warm", "cold", "dead"]).default("cold"),

  // === COMMUNICATION PREFERENCES ===
  optInEmail: boolean("opt_in_email").default(true),
  optInSms: boolean("opt_in_sms").default(true),
  optInPhone: boolean("opt_in_phone").default(true),
  doNotContact: boolean("do_not_contact").default(false),
  doNotContactReason: text("do_not_contact_reason"),

  // === NOTES & METADATA ===
  internalNotes: text("internal_notes"),
  tags: text("tags"), // JSON array of tags for filtering
  customFields: text("custom_fields"), // JSON for flexible additional data

  // === TIMESTAMPS ===
  lastContactedAt: timestamp("last_contacted_at"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  closedDate: timestamp("closed_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Borrower = typeof borrowers.$inferSelect;
export type InsertBorrower = typeof borrowers.$inferInsert;

/**
 * Referral Partners - Real estate agents and other professionals who refer borrowers
 * Tracks relationship quality, referral volume, and conversion rates
 */
export const referralPartners = mysqlTable("referral_partners", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  clientId: int("client_id").references(() => clients.id), // Which LO this partner is linked to

  // === PERSONAL INFO ===
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  secondaryPhone: varchar("secondary_phone", { length: 20 }),
  avatarUrl: text("avatar_url"),

  // === PROFESSIONAL INFO ===
  company: varchar("company", { length: 255 }),
  brokerage: varchar("brokerage", { length: 255 }),
  title: varchar("title", { length: 255 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  licenseState: varchar("license_state", { length: 100 }),
  nmls: varchar("nmls", { length: 50 }), // NMLS number if applicable
  yearsInBusiness: int("years_in_business"),
  partnerType: mysqlEnum("partner_type", [
    "real_estate_agent", "real_estate_broker", "financial_advisor",
    "insurance_agent", "attorney", "cpa", "builder", "past_client", "other"
  ]).notNull(),

  // === SPECIALTIES ===
  specialties: text("specialties"), // JSON array: ["first_time_buyers", "luxury", "investment", "commercial"]
  serviceAreas: text("service_areas"), // JSON array of zip codes or cities
  priceRangeMin: decimal("price_range_min", { precision: 12, scale: 2 }),
  priceRangeMax: decimal("price_range_max", { precision: 12, scale: 2 }),

  // === RELATIONSHIP ===
  relationshipStatus: mysqlEnum("relationship_status", [
    "new", "active", "vip", "inactive", "lost"
  ]).default("new").notNull(),
  relationshipStartDate: timestamp("relationship_start_date"),
  lastContactDate: timestamp("last_contact_date"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  preferredContactMethod: mysqlEnum("preferred_contact_method", ["phone", "email", "text"]).default("email"),

  // === REFERRAL AGREEMENT ===
  hasReferralAgreement: boolean("has_referral_agreement").default(false),
  referralAgreementUrl: text("referral_agreement_url"), // S3 URL to signed agreement
  commissionSplit: decimal("commission_split", { precision: 5, scale: 2 }), // Percentage
  referralFeeType: mysqlEnum("referral_fee_type", ["percentage", "flat_fee", "none"]).default("none"),
  referralFeeAmount: decimal("referral_fee_amount", { precision: 10, scale: 2 }),

  // === METRICS (denormalized for performance) ===
  totalReferrals: int("total_referrals").default(0),
  closedReferrals: int("closed_referrals").default(0),
  conversionRate: decimal("conversion_rate", { precision: 5, scale: 2 }).default("0"), // Percentage
  totalReferralVolume: decimal("total_referral_volume", { precision: 14, scale: 2 }).default("0"), // Total $ of closed loans
  averageLoanSize: decimal("average_loan_size", { precision: 12, scale: 2 }),
  lastReferralDate: timestamp("last_referral_date"),

  // === PARTNER PORTAL ===
  portalToken: varchar("portal_token", { length: 64 }),
  portalLastAccessed: timestamp("portal_last_accessed"),

  // === NOTES & METADATA ===
  internalNotes: text("internal_notes"),
  tags: text("tags"), // JSON array of tags
  customFields: text("custom_fields"), // JSON for flexible data

  // === TIMESTAMPS ===
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ReferralPartner = typeof referralPartners.$inferSelect;
export type InsertReferralPartner = typeof referralPartners.$inferInsert;

/**
 * Borrower Activities - Complete activity timeline for each borrower
 * Every interaction, status change, note, and communication is logged here
 */
export const borrowerActivities = mysqlTable("borrower_activities", {
  id: int("id").autoincrement().primaryKey(),
  borrowerId: int("borrower_id").notNull(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  performedByUserId: int("performed_by_user_id").references(() => users.id),

  activityType: mysqlEnum("activity_type", [
    "note", "phone_call", "email_sent", "email_received", "sms_sent", "sms_received",
    "status_change", "document_uploaded", "document_requested",
    "pre_approval_issued", "pre_approval_expired",
    "appointment_scheduled", "appointment_completed", "appointment_no_show",
    "application_submitted", "application_updated",
    "credit_pulled", "income_verified", "appraisal_ordered", "appraisal_received",
    "underwriting_submitted", "conditional_approval", "clear_to_close",
    "closing_scheduled", "closed_funded",
    "referral_received", "referral_sent",
    "follow_up_scheduled", "follow_up_completed",
    "score_changed", "tag_added", "tag_removed",
    "system_auto"
  ]).notNull(),

  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  metadata: text("metadata"), // JSON with extra context (old status, new status, score change, etc.)

  // === COMMUNICATION DETAILS ===
  callDuration: int("call_duration"), // seconds
  callRecordingUrl: text("call_recording_url"),
  emailSubject: varchar("email_subject", { length: 500 }),

  // === TIMESTAMPS ===
  activityDate: timestamp("activity_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BorrowerActivity = typeof borrowerActivities.$inferSelect;
export type InsertBorrowerActivity = typeof borrowerActivities.$inferInsert;

/**
 * Borrower Documents - Metadata for documents uploaded to S3
 * Actual files stored in S3, this table tracks metadata and access control
 */
export const borrowerDocuments = mysqlTable("borrower_documents", {
  id: int("id").autoincrement().primaryKey(),
  borrowerId: int("borrower_id").notNull(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  uploadedByUserId: int("uploaded_by_user_id").references(() => users.id),

  documentType: mysqlEnum("document_type", [
    "pay_stub", "w2", "tax_return", "bank_statement", "id_drivers_license",
    "id_passport", "pre_approval_letter", "purchase_agreement",
    "appraisal", "title_report", "insurance", "hoa_docs",
    "gift_letter", "divorce_decree", "bankruptcy_discharge",
    "va_certificate", "dd214", "other"
  ]).notNull(),

  fileName: varchar("file_name", { length: 500 }).notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(), // S3 key
  fileUrl: text("file_url").notNull(), // S3 URL
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: int("file_size"), // bytes
  description: text("description"),

  status: mysqlEnum("status", ["pending_review", "approved", "rejected", "expired"]).default("pending_review").notNull(),
  reviewedByUserId: int("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  expiresAt: timestamp("expires_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type BorrowerDocument = typeof borrowerDocuments.$inferSelect;
export type InsertBorrowerDocument = typeof borrowerDocuments.$inferInsert;

// ==========================================
// Weekly Schedule (Tim's Availability)
// ==========================================
export const weeklySchedules = mysqlTable("weekly_schedules", {
  id: int("id").autoincrement().primaryKey(),
  weekStartDate: timestamp("week_start_date").notNull(), // Monday of the week
  mondaySlots: text("monday_slots"), // JSON: {"start": "09:00", "end": "17:00"} or null
  tuesdaySlots: text("tuesday_slots"),
  wednesdaySlots: text("wednesday_slots"),
  thursdaySlots: text("thursday_slots"),
  fridaySlots: text("friday_slots"),
  saturdaySlots: text("saturday_slots"),
  sundaySlots: text("sunday_slots"),
  rawResponse: text("raw_response"),
  status: mysqlEnum("status", ["pending", "confirmed", "expired"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type WeeklySchedule = typeof weeklySchedules.$inferSelect;
export type InsertWeeklySchedule = typeof weeklySchedules.$inferInsert;

// ==========================================
// Loan Milestone Tracker
// ==========================================
export const loanMilestones = mysqlTable("loan_milestones", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("lead_id").notNull().references(() => leads.id),
  clientId: int("client_id").notNull().references(() => clients.id),
  milestoneKey: varchar("milestone_key", { length: 100 }).notNull(),
  milestoneLabel: varchar("milestone_label", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "blocked"]).default("pending").notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  notifyBorrower: boolean("notify_borrower").default(false),
  notifyAgent: boolean("notify_agent").default(false),
  sortOrder: int("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type LoanMilestone = typeof loanMilestones.$inferSelect;
export type InsertLoanMilestone = typeof loanMilestones.$inferInsert;

// ==========================================
// Lead Tasks
// ==========================================
export const leadTasks = mysqlTable("lead_tasks", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("lead_id").notNull().references(() => leads.id),
  clientId: int("client_id").notNull().references(() => clients.id),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  assignedToUserId: int("assigned_to_user_id").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdByUserId: int("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type LeadTask = typeof leadTasks.$inferSelect;
export type InsertLeadTask = typeof leadTasks.$inferInsert;

// ==========================================
// Account Invitations (Sub-Account Onboarding)
// ==========================================
export const accountInvitations = mysqlTable("account_invitations", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  company: varchar("company", { length: 255 }),
  role: mysqlEnum("role", ["super_admin", "admin", "agency_owner", "client_user", "loa"]).default("client_user").notNull(),
  agencyId: int("agency_id"),
  clientId: int("client_id"),
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending").notNull(),
  invitedByUserId: int("invited_by_user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type AccountInvitation = typeof accountInvitations.$inferSelect;
export type InsertAccountInvitation = typeof accountInvitations.$inferInsert;

// ==========================================
// Sub-Account Credentials (for password-based login)
// ==========================================
export const subAccountCredentials = mysqlTable("sub_account_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SubAccountCredential = typeof subAccountCredentials.$inferSelect;
export type InsertSubAccountCredential = typeof subAccountCredentials.$inferInsert;

// ==========================================
// Onboarding Progress - Launchpad step tracking per user
// ==========================================
export const onboardingProgress = mysqlTable("onboarding_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  stepKey: varchar("step_key", { length: 100 }).notNull(),
  completedAt: timestamp("completed_at"),
  completedBy: int("completed_by"), // admin who marked it complete on behalf of user
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = typeof onboardingProgress.$inferInsert;

// ==========================================
// Conversations - Unified inbox (SMS, email, Facebook)
// ==========================================
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  leadId: int("lead_id").references(() => leads.id),
  channel: mysqlEnum("channel", ["sms", "email", "facebook"]).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  lastMessageAt: timestamp("last_message_at"),
  lastMessagePreview: text("last_message_preview"),
  unreadCount: int("unread_count").default(0).notNull(),
  status: mysqlEnum("status", ["open", "closed", "archived"]).default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

export const conversationMessages = mysqlTable("conversation_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id").notNull().references(() => conversations.id),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  status: mysqlEnum("status", ["sent", "delivered", "failed", "read"]).default("sent").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = typeof conversationMessages.$inferInsert;

// ==========================================
// Documents - Borrower document storage
// ==========================================
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  borrowerId: int("borrower_id").references(() => borrowers.id),
  leadId: int("lead_id").references(() => leads.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["application", "pay_stub", "tax_return", "bank_statement", "id", "other"]).default("other").notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(),
  fileUrl: varchar("file_url", { length: 1000 }).notNull(),
  fileSize: int("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  version: int("version").default(1).notNull(),
  uploadedBy: int("uploaded_by").references(() => users.id),
  notes: text("notes"),
  sharedWithBorrower: boolean("shared_with_borrower").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ==========================================
// Subscription Plans & Invoices - Billing
// ==========================================
export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  tier: mysqlEnum("tier", ["starter", "pro", "enterprise", "done_for_you"]).notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }),
  stripePriceIdMonthly: varchar("stripe_price_id_monthly", { length: 100 }),
  stripePriceIdAnnual: varchar("stripe_price_id_annual", { length: 100 }),
  features: text("features"), // JSON array of feature strings
  maxLeads: int("max_leads"),
  maxUsers: int("max_users"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 100 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  status: mysqlEnum("status", ["draft", "open", "paid", "void", "uncollectible"]).default("open").notNull(),
  description: text("description"),
  paidAt: timestamp("paid_at"),
  dueDate: timestamp("due_date"),
  invoiceUrl: varchar("invoice_url", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ==========================================
// Market Analytics - Market trends and notes
// ==========================================
export const marketAnalytics = mysqlTable("market_analytics", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  category: varchar("category", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  notes: text("notes"),
  dataJson: text("data_json"), // JSON for chart data
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type MarketAnalytic = typeof marketAnalytics.$inferSelect;
export type InsertMarketAnalytic = typeof marketAnalytics.$inferInsert;

// ==========================================
// Content Comments - Threaded feedback on content approvals
// ==========================================
export const contentComments = mysqlTable("content_comments", {
  id: int("id").autoincrement().primaryKey(),
  contentApprovalId: int("content_approval_id").notNull().references(() => contentApprovals.id),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  authorId: int("author_id").notNull().references(() => users.id),
  authorRole: mysqlEnum("author_role", ["admin", "client"]).notNull(),
  message: text("message").notNull(),
  // Track read status per role so each party knows when the other has replied
  isReadByAdmin: boolean("is_read_by_admin").default(false).notNull(),
  isReadByClient: boolean("is_read_by_client").default(false).notNull(),
  // @mention support — notify a specific role
  mentionedRole: mysqlEnum("mentioned_role", ["admin", "client"]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type ContentComment = typeof contentComments.$inferSelect;
export type InsertContentComment = typeof contentComments.$inferInsert;

// ==========================================
// Generated Websites - AI-generated loan officer websites
// ==========================================
export const generatedWebsites = mysqlTable("generated_websites", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull().references(() => agencies.id),
  clientId: int("client_id").references(() => clients.id),
  seoClientId: int("seo_client_id"),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  ownerName: varchar("owner_name", { length: 255 }),
  tagline: varchar("tagline", { length: 500 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  licenseNumber: varchar("license_number", { length: 100 }),
  specialties: text("specialties"),
  yearsExperience: int("years_experience"),
  colorScheme: varchar("color_scheme", { length: 50 }).default("navy"),
  heroSection: text("hero_section"),
  servicesSection: text("services_section"),
  testimonialsSection: text("testimonials_section"),
  aboutSection: text("about_section"),
  faqSection: text("faq_section"),
  ctaSection: text("cta_section"),
  status: mysqlEnum("status", ["draft", "generating", "ready", "published", "archived"]).default("draft").notNull(),
  publishedUrl: varchar("published_url", { length: 500 }),
  customDomain: varchar("custom_domain", { length: 255 }),
  generatedHtml: text("generated_html"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type GeneratedWebsite = typeof generatedWebsites.$inferSelect;
export type InsertGeneratedWebsite = typeof generatedWebsites.$inferInsert;

/**
 * Facebook Page Configurations
 * Stores per-client Facebook Page Access Tokens and page IDs
 * so the webhook can route leads to the correct client and fetch real lead data
 */
export const facebookPageConfigs = mysqlTable("facebook_page_configs", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull(),
  clientId: int("client_id").references(() => clients.id),
  pageId: varchar("page_id", { length: 64 }).notNull().unique(),
  pageName: varchar("page_name", { length: 255 }),
  pageAccessToken: text("page_access_token").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type FacebookPageConfig = typeof facebookPageConfigs.$inferSelect;
export type InsertFacebookPageConfig = typeof facebookPageConfigs.$inferInsert;
