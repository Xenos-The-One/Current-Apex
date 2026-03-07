import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── USERS & AGENCIES ──────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["super_admin", "admin", "user", "loa"]).default("user").notNull(),
  agencyId: int("agencyId"),
  phone: varchar("phone", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const agencies = mysqlTable("agencies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logoUrl"),
  website: text("website"),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  status: mysqlEnum("status", ["active", "suspended", "trial", "cancelled"]).default("trial").notNull(),
  subscriptionPlanId: int("subscriptionPlanId"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  maxUsers: int("maxUsers").default(5),
  maxLeads: int("maxLeads").default(500),
  settings: json("settings"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── SUBSCRIPTION PLANS & BILLING ──────────────────────────────────────────

export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  monthlyPrice: decimal("monthlyPrice", { precision: 10, scale: 2 }).notNull(),
  annualPrice: decimal("annualPrice", { precision: 10, scale: 2 }),
  stripePriceIdMonthly: varchar("stripePriceIdMonthly", { length: 128 }),
  stripePriceIdAnnual: varchar("stripePriceIdAnnual", { length: 128 }),
  maxUsers: int("maxUsers").default(5),
  maxLeads: int("maxLeads").default(500),
  maxCampaigns: int("maxCampaigns").default(10),
  features: json("features"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 128 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("usd"),
  status: mysqlEnum("status", ["draft", "open", "paid", "uncollectible", "void"]).default("open").notNull(),
  description: text("description"),
  paidAt: timestamp("paidAt"),
  dueDate: timestamp("dueDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── LEADS ─────────────────────────────────────────────────────────────────

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  assignedUserId: int("assignedUserId"),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  company: varchar("company", { length: 255 }),
  contactType: mysqlEnum("contactType", ["borrower", "re_agent", "attorney", "insurance", "title_co", "builder", "lender", "other"]).default("borrower").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "appointment_set", "converted", "lost", "nurturing"]).default("new").notNull(),
  pipelineStage: mysqlEnum("pipelineStage", ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]).default("new").notNull(),
  source: mysqlEnum("source", ["social_media", "referral", "webinar", "import", "manual", "facebook_ads", "website", "cold_call", "other"]).default("manual").notNull(),
  score: int("score").default(0),
  loanAmount: decimal("loanAmount", { precision: 12, scale: 2 }),
  propertyAddress: text("propertyAddress"),
  notes: text("notes"),
  tags: json("tags"),
  lastContactedAt: timestamp("lastContactedAt"),
  nextFollowUpAt: timestamp("nextFollowUpAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const leadActivities = mysqlTable("lead_activities", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  agencyId: int("agencyId").notNull(),
  userId: int("userId"),
  type: mysqlEnum("type", ["call", "email", "sms", "note", "task", "appointment", "status_change", "score_change", "import", "ai_call"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const leadTasks = mysqlTable("lead_tasks", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  agencyId: int("agencyId").notNull(),
  assignedUserId: int("assignedUserId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  dueAt: timestamp("dueAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── BORROWERS ─────────────────────────────────────────────────────────────

export const borrowers = mysqlTable("borrowers", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId"),
  agencyId: int("agencyId").notNull(),
  assignedUserId: int("assignedUserId"),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  ssn: varchar("ssn", { length: 20 }),
  dateOfBirth: timestamp("dateOfBirth"),
  address: text("address"),
  loanType: mysqlEnum("loanType", ["conventional", "fha", "va", "usda", "jumbo", "heloc", "refinance", "other"]),
  loanAmount: decimal("loanAmount", { precision: 12, scale: 2 }),
  propertyAddress: text("propertyAddress"),
  propertyType: mysqlEnum("propertyType", ["single_family", "condo", "townhouse", "multi_family", "commercial", "land", "other"]),
  purchasePrice: decimal("purchasePrice", { precision: 12, scale: 2 }),
  downPayment: decimal("downPayment", { precision: 12, scale: 2 }),
  creditScore: int("creditScore"),
  annualIncome: decimal("annualIncome", { precision: 12, scale: 2 }),
  currentMilestone: mysqlEnum("currentMilestone", ["inquiry", "pre_approval", "application", "processing", "underwriting", "conditional_approval", "clear_to_close", "closing", "funded", "denied"]).default("inquiry"),
  notes: text("notes"),
  tags: json("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const loanMilestones = mysqlTable("loan_milestones", {
  id: int("id").autoincrement().primaryKey(),
  borrowerId: int("borrowerId").notNull(),
  agencyId: int("agencyId").notNull(),
  milestone: varchar("milestone", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).default("pending"),
  completedAt: timestamp("completedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── REFERRAL PARTNERS ─────────────────────────────────────────────────────

export const referralPartners = mysqlTable("referral_partners", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  assignedUserId: int("assignedUserId"),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  company: varchar("company", { length: 255 }),
  partnerType: mysqlEnum("partnerType", ["attorney", "title_co", "builder", "re_agent", "insurance", "lender", "accountant", "financial_advisor", "other"]).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "prospect"]).default("prospect"),
  referralCount: int("referralCount").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── APPOINTMENTS ──────────────────────────────────────────────────────────

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  userId: int("userId").notNull(),
  leadId: int("leadId"),
  borrowerId: int("borrowerId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["consultation", "follow_up", "closing", "review", "call", "meeting", "other"]).default("consultation"),
  status: mysqlEnum("status", ["scheduled", "confirmed", "completed", "cancelled", "no_show", "rescheduled"]).default("scheduled"),
  startAt: timestamp("startAt").notNull(),
  endAt: timestamp("endAt").notNull(),
  timezone: varchar("timezone", { length: 64 }).default("America/New_York"),
  location: text("location"),
  meetingUrl: text("meetingUrl"),
  reminderSent: boolean("reminderSent").default(false),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── CAMPAIGNS ─────────────────────────────────────────────────────────────

export const campaignTemplates = mysqlTable("campaign_templates", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["email", "sms"]).notNull(),
  subject: varchar("subject", { length: 500 }),
  content: text("content").notNull(),
  variables: json("variables"),
  isGlobal: boolean("isGlobal").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const emailCampaigns = mysqlTable("email_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  createdByUserId: int("createdByUserId"),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  fromEmail: varchar("fromEmail", { length: 320 }),
  content: text("content").notNull(),
  templateId: int("templateId"),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "paused", "cancelled"]).default("draft"),
  audienceFilter: json("audienceFilter"),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  totalRecipients: int("totalRecipients").default(0),
  totalSent: int("totalSent").default(0),
  totalOpened: int("totalOpened").default(0),
  totalClicked: int("totalClicked").default(0),
  totalBounced: int("totalBounced").default(0),
  totalUnsubscribed: int("totalUnsubscribed").default(0),
  sendgridCampaignId: varchar("sendgridCampaignId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const smsCampaigns = mysqlTable("sms_campaigns", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  createdByUserId: int("createdByUserId"),
  name: varchar("name", { length: 255 }).notNull(),
  message: text("message").notNull(),
  fromNumber: varchar("fromNumber", { length: 32 }),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "paused", "cancelled"]).default("draft"),
  audienceFilter: json("audienceFilter"),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  totalRecipients: int("totalRecipients").default(0),
  totalSent: int("totalSent").default(0),
  totalDelivered: int("totalDelivered").default(0),
  totalFailed: int("totalFailed").default(0),
  twilioMessageServiceSid: varchar("twilioMessageServiceSid", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── AUTOMATIONS ───────────────────────────────────────────────────────────

export const automationWorkflows = mysqlTable("automation_workflows", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  createdByUserId: int("createdByUserId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  trigger: mysqlEnum("trigger", ["new_lead", "lead_status_change", "email_opened", "email_clicked", "sms_replied", "appointment_booked", "appointment_cancelled", "form_submitted", "tag_added", "score_threshold", "manual"]).notNull(),
  triggerConfig: json("triggerConfig"),
  isActive: boolean("isActive").default(false).notNull(),
  totalExecutions: int("totalExecutions").default(0),
  lastExecutedAt: timestamp("lastExecutedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const automationWorkflowSteps = mysqlTable("automation_workflow_steps", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflowId").notNull(),
  stepOrder: int("stepOrder").notNull(),
  type: mysqlEnum("type", ["send_email", "send_sms", "create_task", "update_lead_status", "add_tag", "remove_tag", "wait_delay", "condition", "place_call", "create_appointment", "notify_user", "webhook"]).notNull(),
  config: json("config").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const automationExecutions = mysqlTable("automation_executions", {
  id: int("id").autoincrement().primaryKey(),
  workflowId: int("workflowId").notNull(),
  agencyId: int("agencyId").notNull(),
  leadId: int("leadId"),
  status: mysqlEnum("status", ["running", "completed", "failed", "paused"]).default("running"),
  currentStep: int("currentStep").default(0),
  logs: json("logs"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  errorMessage: text("errorMessage"),
});

// ─── VAPI / AI CALLING ─────────────────────────────────────────────────────

export const vapiAssistants = mysqlTable("vapi_assistants", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  vapiAssistantId: varchar("vapiAssistantId", { length: 128 }),
  leadSource: varchar("leadSource", { length: 100 }),
  systemPrompt: text("systemPrompt"),
  firstMessage: text("firstMessage"),
  voice: varchar("voice", { length: 100 }).default("jennifer"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const callLogs = mysqlTable("call_logs", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  leadId: int("leadId"),
  borrowerId: int("borrowerId"),
  userId: int("userId"),
  vapiCallId: varchar("vapiCallId", { length: 128 }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).default("outbound"),
  status: mysqlEnum("status", ["initiated", "ringing", "in_progress", "completed", "failed", "no_answer", "busy", "cancelled"]).default("initiated"),
  fromNumber: varchar("fromNumber", { length: 32 }),
  toNumber: varchar("toNumber", { length: 32 }),
  duration: int("duration").default(0),
  recordingUrl: text("recordingUrl"),
  transcript: text("transcript"),
  summary: text("summary"),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]),
  appointmentBooked: boolean("appointmentBooked").default(false),
  startedAt: timestamp("startedAt"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const aiScripts = mysqlTable("ai_scripts", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  purpose: mysqlEnum("purpose", ["cold_call", "follow_up", "appointment_booking", "re_engagement", "referral_request", "other"]).notNull(),
  script: text("script").notNull(),
  variables: json("variables"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── ANALYTICS ─────────────────────────────────────────────────────────────

export const metrics = mysqlTable("metrics", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  userId: int("userId"),
  metricDate: timestamp("metricDate").notNull(),
  totalLeads: int("totalLeads").default(0),
  newLeads: int("newLeads").default(0),
  convertedLeads: int("convertedLeads").default(0),
  totalCalls: int("totalCalls").default(0),
  totalAppointments: int("totalAppointments").default(0),
  totalEmailsSent: int("totalEmailsSent").default(0),
  totalSmsSent: int("totalSmsSent").default(0),
  totalRevenue: decimal("totalRevenue", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversionFunnel = mysqlTable("conversion_funnel", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  stage: varchar("stage", { length: 100 }).notNull(),
  count: int("count").default(0),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── DOCUMENTS ─────────────────────────────────────────────────────────────

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  borrowerId: int("borrowerId"),
  leadId: int("leadId"),
  uploadedByUserId: int("uploadedByUserId"),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["application", "pay_stub", "tax_return", "bank_statement", "id_document", "insurance", "appraisal", "title", "other"]).default("other"),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  version: int("version").default(1),
  isShared: boolean("isShared").default(false),
  shareToken: varchar("shareToken", { length: 128 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── CONTENT & SOCIAL ──────────────────────────────────────────────────────

export const socialMediaPosts = mysqlTable("social_media_posts", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  createdByUserId: int("createdByUserId"),
  platform: mysqlEnum("platform", ["facebook", "instagram", "linkedin", "twitter", "youtube", "tiktok"]).notNull(),
  content: text("content").notNull(),
  mediaUrls: json("mediaUrls"),
  status: mysqlEnum("status", ["draft", "pending_approval", "approved", "scheduled", "published", "rejected"]).default("draft"),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  engagementData: json("engagementData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const contentApprovals = mysqlTable("content_approvals", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  contentType: mysqlEnum("contentType", ["social_post", "email_campaign", "sms_campaign", "blog_post"]).notNull(),
  contentId: int("contentId").notNull(),
  requestedByUserId: int("requestedByUserId"),
  reviewedByUserId: int("reviewedByUserId"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "revision_requested"]).default("pending"),
  comments: text("comments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────

export const teamNotifications = mysqlTable("team_notifications", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["new_lead", "appointment_reminder", "campaign_sent", "call_completed", "task_due", "workflow_triggered", "document_uploaded", "system"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const webinarRegistrations = mysqlTable("webinar_registrations", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  leadId: int("leadId"),
  webinarTitle: varchar("webinarTitle", { length: 255 }).notNull(),
  webinarDate: timestamp("webinarDate"),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  attended: boolean("attended").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── CONVERSATIONS (Unified Inbox) ────────────────────────────────────────

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  leadId: int("leadId"),
  borrowerId: int("borrowerId"),
  assignedUserId: int("assignedUserId"),
  channel: mysqlEnum("channel", ["sms", "email", "facebook", "instagram", "whatsapp"]).notNull(),
  contactName: varchar("contactName", { length: 255 }),
  contactPhone: varchar("contactPhone", { length: 32 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  lastMessageAt: timestamp("lastMessageAt"),
  lastMessagePreview: text("lastMessagePreview"),
  isRead: boolean("isRead").default(false),
  isArchived: boolean("isArchived").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const conversationMessages = mysqlTable("conversation_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  agencyId: int("agencyId").notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  content: text("content").notNull(),
  mediaUrls: json("mediaUrls"),
  status: mysqlEnum("status", ["sent", "delivered", "read", "failed"]).default("sent"),
  sentByUserId: int("sentByUserId"),
  externalMessageId: varchar("externalMessageId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── MARKET ANALYTICS ──────────────────────────────────────────────────────

export const marketAnalytics = mysqlTable("market_analytics", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  reportDate: timestamp("reportDate").notNull(),
  marketArea: varchar("marketArea", { length: 255 }),
  avgLoanAmount: decimal("avgLoanAmount", { precision: 12, scale: 2 }),
  avgInterestRate: decimal("avgInterestRate", { precision: 5, scale: 3 }),
  totalLoansInMarket: int("totalLoansInMarket"),
  marketSharePct: decimal("marketSharePct", { precision: 5, scale: 2 }),
  competitorData: json("competitorData"),
  trendData: json("trendData"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── LEAD SOURCE ASSISTANT MAPPINGS ────────────────────────────────────────

export const leadSourceAssistantMappings = mysqlTable("lead_source_assistant_mappings", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  leadSource: varchar("leadSource", { length: 100 }).notNull(),
  vapiAssistantId: int("vapiAssistantId").notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── FACEBOOK LEAD ADS ─────────────────────────────────────────────────────

export const facebookLeadAds = mysqlTable("facebook_lead_ads", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agencyId").notNull(),
  facebookLeadId: varchar("facebookLeadId", { length: 128 }).notNull().unique(),
  formId: varchar("formId", { length: 128 }),
  pageId: varchar("pageId", { length: 128 }),
  adId: varchar("adId", { length: 128 }),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  rawData: json("rawData"),
  processedLeadId: int("processedLeadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── TYPES ─────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Agency = typeof agencies.$inferSelect;
export type InsertAgency = typeof agencies.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Borrower = typeof borrowers.$inferSelect;
export type InsertBorrower = typeof borrowers.$inferInsert;
export type ReferralPartner = typeof referralPartners.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type SmsCampaign = typeof smsCampaigns.$inferSelect;
export type AutomationWorkflow = typeof automationWorkflows.$inferSelect;
export type CallLog = typeof callLogs.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type SocialMediaPost = typeof socialMediaPosts.$inferSelect;
export type TeamNotification = typeof teamNotifications.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
