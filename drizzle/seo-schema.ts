import { int, bigint, boolean, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, tinyint, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const seoUsers = mysqlTable("seo_users", {
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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type SeoUser = typeof seoUsers.$inferSelect;
export type InsertSeoUser = typeof seoUsers.$inferInsert;

/**
 * Clients table - stores information about agency clients
 */
export const seoClients = mysqlTable("seo_clients", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  company: varchar("company", { length: 255 }),
  notes: text("notes"),
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),

  // Budget tracking
  monthlyBudget: decimal("monthlyBudget", { precision: 10, scale: 2 }).default("0.00"),
  budgetAlertThreshold: int("budgetAlertThreshold").default(80), // Percentage (0-100)

  // Personal contact info
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  zipCode: varchar("zipCode", { length: 20 }),
  country: varchar("country", { length: 100 }),

  // Business information
  businessName: varchar("businessName", { length: 255 }),
  businessType: varchar("businessType", { length: 100 }),
  industry: varchar("industry", { length: 100 }),
  businessPhone: varchar("businessPhone", { length: 50 }),
  businessEmail: varchar("businessEmail", { length: 320 }),
  businessWebsite: varchar("businessWebsite", { length: 500 }),
  businessAddress: text("businessAddress"),

  // Website login credentials (for the client's website we manage)
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  websitePlatform: varchar("websitePlatform", { length: 100 }),
  websiteLoginUrl: varchar("websiteLoginUrl", { length: 500 }),
  websiteUsername: varchar("websiteUsername", { length: 255 }),
  websitePassword: text("websitePassword"),
  websiteNotes: text("websiteNotes"),

  // Social media
  socialFacebook: varchar("socialFacebook", { length: 500 }),
  socialInstagram: varchar("socialInstagram", { length: 500 }),
  socialLinkedin: varchar("socialLinkedin", { length: 500 }),
  socialTwitter: varchar("socialTwitter", { length: 500 }),
  // Status
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive

  // Extended onboarding fields
  gscPropertyUrl: varchar("gscPropertyUrl", { length: 500 }),          // Google Search Console property URL
  gscHasAccess: int("gscHasAccess").default(0),                        // 1 = client granted GSC access
  brandVoice: text("brandVoice"),                                       // Brand tone/voice guidelines
  targetAudience: text("targetAudience"),                               // Target audience personas
  competitorUrls: text("competitorUrls"),                               // Comma-separated competitor URLs
  preferredPublishDays: varchar("preferredPublishDays", { length: 100 }), // e.g. "Mon,Wed,Fri"
  preferredPublishTime: varchar("preferredPublishTime", { length: 10 }), // e.g. "09:00"
  primaryServices: text("primaryServices"),                             // Key products/services with descriptions
  uniqueSellingProp: text("uniqueSellingProp"),                         // USP
  serviceAreas: text("serviceAreas"),                                   // Local SEO service areas
  reportingKpis: varchar("reportingKpis", { length: 255 }),             // e.g. "traffic,rankings,leads"
  reportingFrequency: varchar("reportingFrequency", { length: 50 }),    // weekly/monthly

  // Ad account connections
  googleAdsCustomerId: varchar("googleAdsCustomerId", { length: 64 }),   // e.g. 123-456-7890
  facebookAdAccountId: varchar("facebookAdAccountId", { length: 64 }),  // e.g. act_123456789
  googleAdsCampaignId: varchar("googleAdsCampaignId", { length: 64 }),  // default campaign
  facebookPageId: varchar("facebookPageId", { length: 64 }),            // Facebook Page ID
  // Brand colours (comma-separated hex values, e.g. "#3b82f6,#1e40af,#ffffff")
  companyColors: text("companyColors"),
  // CRM integration link
  crmClientId: int("crm_client_id"),  // Links to CRM clients.id for cross-module integration
  // AI Content Hub — HeyGen video generation
  contentHubEnabled: int("contentHubEnabled").default(0),       // 1 = client has Content Hub upcharge
  heygenAvatarId: varchar("heygenAvatarId", { length: 255 }),   // HeyGen avatar_id for this client
  heygenVoiceId: varchar("heygenVoiceId", { length: 255 }),     // HeyGen or ElevenLabs voice_id
  heygenVideoFormat: mysqlEnum("heygenVideoFormat", ["portrait", "landscape", "square"]).default("portrait"), // portrait=1080x1920 (Shorts)
  heygenBrandSystemName: varchar("heygenBrandSystemName", { length: 255 }), // HeyGen Brand System name to activate in Video Agent prompt box
});
export type SeoClient = typeof seoClients.$inferSelect;
export type InsertSeoClient = typeof seoClients.$inferInsert;

/**
 * Client Portal Users table - separate authentication for client-facing portal
 */
export const clientPortalUsers = mysqlTable("clientPortalUsers", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["client_admin", "client_viewer"]).default("client_viewer").notNull(),
  isActive: int("isActive").default(1).notNull(), // 0 = inactive, 1 = active
  invitationToken: varchar("invitationToken", { length: 255 }),
  invitationExpiry: timestamp("invitationExpiry"),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientPortalUser = typeof clientPortalUsers.$inferSelect;
export type InsertClientPortalUser = typeof clientPortalUsers.$inferInsert;

/**
 * Portal Branding table - customization settings for client portal
 */
export const portalBranding = mysqlTable("portalBranding", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().unique().references(() => seoClients.id, { onDelete: "cascade" }),
  logoUrl: text("logoUrl"),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#3b82f6"), // Hex color
  secondaryColor: varchar("secondaryColor", { length: 7 }).default("#1e40af"),
  customDomain: varchar("customDomain", { length: 255 }),
  portalName: varchar("portalName", { length: 255 }),
  welcomeMessage: text("welcomeMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PortalBranding = typeof portalBranding.$inferSelect;
export type InsertPortalBranding = typeof portalBranding.$inferInsert;

/**
 * Content table - stores AI-generated blog posts and their metadata
 */
export const content = mysqlTable("content", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  
  // Content fields
  title: varchar("title", { length: 500 }).notNull(),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  imageUrl: text("imageUrl"),
  imagePrompt: text("imagePrompt"),
  
  // Status and workflow
  status: mysqlEnum("status", ["draft", "in_progress", "approved"]).default("draft").notNull(),
  progress: int("progress").default(0).notNull(), // 0-100
  
  // Content type
  contentType: mysqlEnum("contentType", [
    "blog-post", "how-to", "listicle", "case-study", "guide", "news",
    "newsletter", "email-sequence", "social-post", "press-release",
    "landing-page", "video-script", "whitepaper", "product-description"
  ]).default("blog-post").notNull(),
  contentSubtype: varchar("contentSubtype", { length: 64 }), // e.g. social platform: linkedin/twitter/instagram

  // AI model and customization
  aiModel: varchar("aiModel", { length: 100 }).default("gpt-4o").notNull(),
  customPrompt: text("customPrompt"),
  
  // Token usage tracking
  inputTokens: int("inputTokens").default(0).notNull(),
  outputTokens: int("outputTokens").default(0).notNull(),
  totalTokens: int("totalTokens").default(0).notNull(),
  
  // Research statistics
  urlsFetched: int("urlsFetched").default(0).notNull(),
  urlsFailed: int("urlsFailed").default(0).notNull(),
  webSearches: int("webSearches").default(0).notNull(),
  
  // Scheduling
  scheduledPublishDate: timestamp("scheduledPublishDate"),
  isScheduled: int("isScheduled").default(0).notNull(), // 0 = false, 1 = true
  
  // Performance tracking
  wordCount: int("wordCount").default(0).notNull(),
  wasApproved: int("wasApproved").default(0).notNull(), // 0 = not yet, 1 = yes
  approvedAt: timestamp("approvedAt"),
  generationTimeMs: int("generationTimeMs").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Content = typeof content.$inferSelect;
export type InsertContent = typeof content.$inferInsert;
/**
 * Content Templates table - stores reusable templates for different content types
 */
export const contentTemplates = mysqlTable("contentTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["product-review", "how-to", "listicle", "case-study", "comparison", "tutorial", "news", "opinion", "custom"]).notNull(),
  prompt: text("prompt").notNull(),
  structure: text("structure"),
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  isPublic: int("isPublic").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentTemplate = typeof contentTemplates.$inferSelect;
export type InsertContentTemplate = typeof contentTemplates.$inferInsert;


/**
 * Content Comments table - stores team feedback and comments on content
 */
export const contentComments = mysqlTable("contentComments", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => seoUsers.id),
  comment: text("comment").notNull(),
  parentCommentId: int("parentCommentId"), // null = top-level, set = reply
  mentions: text("mentions"), // JSON array of @mentioned usernames
  isResolved: int("isResolved").default(0).notNull(), // 0 = open, 1 = resolved
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentComment = typeof contentComments.$inferSelect;
export type InsertContentComment = typeof contentComments.$inferInsert;

/**
 * Content Revisions table - tracks revision requests and their status
 */
export const contentRevisions = mysqlTable("contentRevisions", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => seoUsers.id),
  title: varchar("title", { length: 500 }),
  content: text("content"),
  changeDescription: text("changeDescription"),
  revisionNumber: int("revisionNumber").notNull(),
  // Approval workflow fields
  requestedBy: int("requestedBy").references(() => seoUsers.id),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "rejected"]),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContentRevision = typeof contentRevisions.$inferSelect;
export type InsertContentRevision = typeof contentRevisions.$inferInsert;

/**
 * Content Analytics table - stores performance metrics for published content
 */
export const contentAnalytics = mysqlTable("contentAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  views: int("views").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  shares: int("shares").default(0).notNull(),
  engagementRate: int("engagementRate").default(0).notNull(),
  avgTimeOnPage: int("avgTimeOnPage").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type ContentAnalytic = typeof contentAnalytics.$inferSelect;
export type InsertContentAnalytic = typeof contentAnalytics.$inferInsert;

/**
 * Content Repurposed table - stores repurposed versions of content
 */
export const contentRepurposed = mysqlTable("contentRepurposed", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  format: mysqlEnum("format", ["social-snippet", "email-summary", "short-form", "infographic-script", "video-script"]).notNull(),
  content: text("content").notNull(),
  platform: varchar("platform", { length: 100 }),
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentRepurposed = typeof contentRepurposed.$inferSelect;
export type InsertContentRepurposed = typeof contentRepurposed.$inferInsert;


/**
 * Content Quality Scores table - stores automated quality analysis results
 */
export const contentQualityScores = mysqlTable("contentQualityScores", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  overallScore: int("overallScore").default(0).notNull(),
  readabilityScore: int("readabilityScore").default(0).notNull(),
  seoScore: int("seoScore").default(0).notNull(),
  toneScore: int("toneScore").default(0).notNull(),
  engagementScore: int("engagementScore").default(0).notNull(),
  readabilityDetails: text("readabilityDetails"),
  seoDetails: text("seoDetails"),
  toneDetails: text("toneDetails"),
  engagementDetails: text("engagementDetails"),
  suggestions: text("suggestions"),
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
});

export type ContentQualityScore = typeof contentQualityScores.$inferSelect;
export type InsertContentQualityScore = typeof contentQualityScores.$inferInsert;


/**
 * Webhook Configurations table - stores CMS publishing endpoints per client
 */
export const webhookConfigs = mysqlTable("webhookConfigs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["wordpress", "ghost", "webflow", "custom"]).notNull(),
  endpointUrl: text("endpointUrl").notNull(),
  apiKey: text("apiKey"),
  authHeader: text("authHeader"),
  isActive: int("isActive").default(1).notNull(),
  lastPublishedAt: timestamp("lastPublishedAt"),
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = typeof webhookConfigs.$inferInsert;

/**
 * Publish Logs table - tracks content publishing attempts
 */
export const publishLogs = mysqlTable("publishLogs", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  webhookId: int("webhookId").notNull().references(() => webhookConfigs.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["pending", "success", "failed"]).default("pending").notNull(),
  responseCode: int("responseCode"),
  responseBody: text("responseBody"),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
});

export type PublishLog = typeof publishLogs.$inferSelect;
export type InsertPublishLog = typeof publishLogs.$inferInsert;

/**
 * Content Briefs table - stores client-submitted content briefs
 */
export const contentBriefs = mysqlTable("contentBriefs", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  
  // Brief details
  title: varchar("title", { length: 500 }),
  targetKeywords: text("targetKeywords"),
  targetAudience: text("targetAudience"),
  tonePreference: mysqlEnum("tonePreference", ["professional", "casual", "technical", "friendly", "authoritative", "conversational"]).default("professional"),
  contentType: mysqlEnum("contentType", ["blog-post", "how-to", "listicle", "case-study", "guide", "news"]).default("blog-post"),
  additionalNotes: text("additionalNotes"),
  wordCountTarget: int("wordCountTarget").default(1500),
  
  // Status
  status: mysqlEnum("briefStatus", ["submitted", "in_review", "accepted", "rejected"]).default("submitted").notNull(),
  submittedBy: varchar("submittedBy", { length: 255 }),
  submittedEmail: varchar("submittedEmail", { length: 320 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentBrief = typeof contentBriefs.$inferSelect;
export type InsertContentBrief = typeof contentBriefs.$inferInsert;

/**
 * Agency settings table - stores branding and configuration
 */
export const agencySettings = mysqlTable("agency_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 128 }).notNull().unique(),
  settingValue: text("settingValue"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgencySetting = typeof agencySettings.$inferSelect;

/**
 * Recurring content plans - automate content generation on a schedule
 */
export const recurringPlans = mysqlTable("recurringPlans", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id),
  planName: varchar("planName", { length: 255 }).notNull(),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "biweekly", "monthly"]).notNull(),
  postsPerCycle: int("postsPerCycle").notNull().default(1),
  topicTemplate: text("topicTemplate"), // Template for generating topics
  customPrompt: text("customPrompt"),
  aiModel: varchar("aiModel", { length: 100 }).default("gemini-2.5-flash"),
  enableWebResearch: int("enableWebResearch").notNull().default(1),
  enableImageGeneration: int("enableImageGeneration").notNull().default(1),
  isActive: int("isActive").notNull().default(1),
  lastRunDate: timestamp("lastRunDate"),
  nextRunDate: timestamp("nextRunDate"),
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecurringPlan = typeof recurringPlans.$inferSelect;
export type InsertRecurringPlan = typeof recurringPlans.$inferInsert;

/**
 * A/B Testing table - stores A/B test experiments comparing different AI models
 */
export const abTests = mysqlTable("abTests", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  customPrompt: text("customPrompt"),
  enableWebResearch: int("enableWebResearch").notNull().default(0),
  shouldGenerateImage: int("shouldGenerateImage").notNull().default(0),
  
  // Version A
  modelA: varchar("modelA", { length: 100 }).notNull(),
  contentA: text("contentA"),
  titleA: text("titleA"),
  imageUrlA: text("imageUrlA"),
  wordCountA: int("wordCountA").default(0),
  generationTimeMsA: int("generationTimeMsA").default(0),
  inputTokensA: int("inputTokensA").default(0),
  outputTokensA: int("outputTokensA").default(0),
  
  // Version B
  modelB: varchar("modelB", { length: 100 }).notNull(),
  contentB: text("contentB"),
  titleB: text("titleB"),
  imageUrlB: text("imageUrlB"),
  wordCountB: int("wordCountB").default(0),
  generationTimeMsB: int("generationTimeMsB").default(0),
  inputTokensB: int("inputTokensB").default(0),
  outputTokensB: int("outputTokensB").default(0),
  
  // Results
  winner: mysqlEnum("winner", ["A", "B", "none"]).default("none"),
  notes: text("notes"),
  
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ABTest = typeof abTests.$inferSelect;
export type InsertABTest = typeof abTests.$inferInsert;

/**
 * Google Analytics Connections table - stores GA credentials per client
 */
export const googleAnalyticsConnections = mysqlTable("googleAnalyticsConnections", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  propertyId: varchar("propertyId", { length: 255 }).notNull(), // GA4 Property ID
  viewId: varchar("viewId", { length: 255 }), // Universal Analytics View ID (optional, for legacy)
  
  // OAuth credentials (encrypted in production)
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiry: timestamp("tokenExpiry"),
  
  // API Key alternative (for service account)
  serviceAccountEmail: varchar("serviceAccountEmail", { length: 320 }),
  serviceAccountKey: text("serviceAccountKey"), // JSON key file content (encrypted)
  
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  lastSyncedAt: timestamp("lastSyncedAt"),
  
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GoogleAnalyticsConnection = typeof googleAnalyticsConnections.$inferSelect;
export type InsertGoogleAnalyticsConnection = typeof googleAnalyticsConnections.$inferInsert;

/**
 * WordPress Connections table - stores WordPress site credentials per client
 */
export const wordpressConnections = mysqlTable("wordpressConnections", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  siteName: varchar("siteName", { length: 255 }).notNull(), // Friendly name for the site
  siteUrl: varchar("siteUrl", { length: 500 }).notNull(), // WordPress site URL
  
  // WordPress REST API credentials
  username: varchar("username", { length: 255 }).notNull(), // WordPress username
  applicationPassword: text("applicationPassword").notNull(), // WordPress application password
  
  // Publishing settings
  defaultStatus: mysqlEnum("defaultStatus", ["draft", "publish", "pending"]).default("draft").notNull(),
  defaultAuthorId: int("defaultAuthorId"), // WordPress author ID
  defaultCategoryId: int("defaultCategoryId"), // WordPress category ID
  
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = inactive
  lastPublishedAt: timestamp("lastPublishedAt"),
  
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WordPressConnection = typeof wordpressConnections.$inferSelect;
export type InsertWordPressConnection = typeof wordpressConnections.$inferInsert;

/**
 * WordPress Publish History table - tracks content published to WordPress
 */
export const wordpressPublishHistory = mysqlTable("wordpressPublishHistory", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  connectionId: int("connectionId").notNull().references(() => wordpressConnections.id, { onDelete: "cascade" }),
  
  wordpressPostId: int("wordpressPostId").notNull(), // WordPress post ID
  wordpressPostUrl: text("wordpressPostUrl"), // Full URL to the published post
  publishStatus: mysqlEnum("publishStatus", ["draft", "publish", "pending"]).notNull(),
  
  success: int("success").default(1).notNull(), // 1 = success, 0 = failed
  errorMessage: text("errorMessage"),
  
  publishedBy: int("publishedBy").notNull().references(() => seoUsers.id),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
});

export type WordPressPublishHistory = typeof wordpressPublishHistory.$inferSelect;
export type InsertWordPressPublishHistory = typeof wordpressPublishHistory.$inferInsert;

/**
 * Manus Websites table - stores Manus-created websites for clients
 */
export const manusWebsites = mysqlTable("manusWebsites", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  
  // Manus project information
  projectId: varchar("projectId", { length: 255 }).notNull().unique(), // Manus project ID
  versionId: varchar("versionId", { length: 255 }), // Latest version ID
  projectName: varchar("projectName", { length: 255 }).notNull(), // Internal project name
  projectTitle: varchar("projectTitle", { length: 255 }).notNull(), // Display title
  projectDescription: text("projectDescription"),
  
  // Website URLs
  previewUrl: text("previewUrl"), // Development preview URL
  publishedUrl: text("publishedUrl"), // Published/production URL
  customDomain: varchar("customDomain", { length: 255 }), // Custom domain if configured
  
  // Project configuration
  template: varchar("template", { length: 100 }).default("web-static"), // Template used
  features: text("features"), // JSON array of enabled features
  
  // Status
  status: mysqlEnum("status", ["creating", "active", "error", "archived"]).default("creating").notNull(),
  lastDeployedAt: timestamp("lastDeployedAt"),
  
  isActive: int("isActive").default(1).notNull(), // 1 = active, 0 = archived
  
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ManusWebsite = typeof manusWebsites.$inferSelect;
export type InsertManusWebsite = typeof manusWebsites.$inferInsert;

/**
 * Manus Publish History table - tracks content published to Manus websites
 */
export const manusPublishHistory = mysqlTable("manusPublishHistory", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  websiteId: int("websiteId").notNull().references(() => manusWebsites.id, { onDelete: "cascade" }),
  
  publishedUrl: text("publishedUrl"), // URL where content was published
  slug: varchar("slug", { length: 500 }), // Content slug/path
  
  success: int("success").default(1).notNull(), // 1 = success, 0 = failed
  errorMessage: text("errorMessage"),
  
  publishedBy: int("publishedBy").notNull().references(() => seoUsers.id),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
});

export type ManusPublishHistory = typeof manusPublishHistory.$inferSelect;
export type InsertManusPublishHistory = typeof manusPublishHistory.$inferInsert;

/**
 * Design Standards table - stores agency design guidelines for Manus website creation
 */
export const designStandards = mysqlTable("designStandards", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // e.g., "Takeoff Premium Design"
  description: text("description"),
  designPrompt: text("designPrompt").notNull(), // Full design prompt/guidelines
  
  // Design characteristics
  referenceUrl: text("referenceUrl"), // Reference website URL
  colorScheme: varchar("colorScheme", { length: 100 }), // e.g., "dark", "light", "gradient"
  designStyle: varchar("designStyle", { length: 100 }), // e.g., "motion-driven", "minimal", "luxury"
  
  isDefault: int("isDefault").default(0).notNull(), // 1 = default standard, 0 = optional
  isActive: int("isActive").default(1).notNull(),
  
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DesignStandard = typeof designStandards.$inferSelect;
export type InsertDesignStandard = typeof designStandards.$inferInsert;

/**
 * Publishing Schedules table - stores scheduled publishing tasks
 */
export const publishingSchedules = mysqlTable("publishingSchedules", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  
  // Publishing targets
  publishToWordPress: int("publishToWordPress").default(0).notNull(), // 1 = yes, 0 = no
  wordpressConnectionIds: text("wordpressConnectionIds"), // JSON array of connection IDs
  wordpressStatus: mysqlEnum("wordpressStatus", ["draft", "publish", "pending"]).default("draft"),
  
  publishToManus: int("publishToManus").default(0).notNull(), // 1 = yes, 0 = no
  manusWebsiteIds: text("manusWebsiteIds"), // JSON array of website IDs
  
  // Schedule details
  scheduledFor: timestamp("scheduledFor").notNull(), // When to publish
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  
  // Execution tracking
  executedAt: timestamp("executedAt"),
  errorMessage: text("errorMessage"),
  
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PublishingSchedule = typeof publishingSchedules.$inferSelect;
export type InsertPublishingSchedule = typeof publishingSchedules.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Publishing Analytics
// ─────────────────────────────────────────────────────────────────────────────

export const publishingAnalytics = mysqlTable("publishingAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull().references(() => content.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 100 }).notNull(), // "wordpress" | "manus" | etc.
  platformContentId: varchar("platformContentId", { length: 255 }), // ID on the target platform
  publishedUrl: text("publishedUrl"),
  views: int("views").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  shares: int("shares").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PublishingAnalytic = typeof publishingAnalytics.$inferSelect;
export type InsertPublishingAnalytic = typeof publishingAnalytics.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Client Publishing Permissions (Round 23)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Client Publishing Permissions table
 * Controls which publishing platforms a client portal user can trigger.
 */
export const clientPublishingPermissions = mysqlTable("clientPublishingPermissions", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  
  // Permissions flags
  canPublishToWordPress: int("canPublishToWordPress").default(0).notNull(), // 1 = allowed
  canPublishToManus: int("canPublishToManus").default(0).notNull(),
  canSchedulePublishing: int("canSchedulePublishing").default(0).notNull(),
  canApproveContent: int("canApproveContent").default(1).notNull(), // default: allowed
  canRequestRevisions: int("canRequestRevisions").default(1).notNull(),
  
  // Allowed WordPress connection IDs (JSON array, null = all)
  allowedWordPressIds: text("allowedWordPressIds"),
  // Allowed Manus website IDs (JSON array, null = all)
  allowedManusIds: text("allowedManusIds"),
  
  updatedBy: int("updatedBy").references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientPublishingPermission = typeof clientPublishingPermissions.$inferSelect;
export type InsertClientPublishingPermission = typeof clientPublishingPermissions.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// Google Search Console (Round 23)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search Console Credentials table - OAuth / service-account details per client
 */
export const searchConsoleCredentials = mysqlTable("searchConsoleCredentials", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  
  siteUrl: varchar("siteUrl", { length: 500 }).notNull(), // e.g. "https://example.com/"
  
  // OAuth tokens
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiry: timestamp("tokenExpiry"),
  
  // Service account alternative
  googleClientId: varchar("googleClientId", { length: 255 }),
  googleClientSecret: text("googleClientSecret"),
  serviceAccountEmail: varchar("serviceAccountEmail", { length: 320 }),
  serviceAccountKey: text("serviceAccountKey"),
  
  isActive: int("isActive").default(1).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  lastSyncStatus: varchar("lastSyncStatus", { length: 32 }),  // 'success' | 'error' | null
  lastSyncRowsSynced: int("lastSyncRowsSynced"),
  lastSyncError: text("lastSyncError"),
  
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SearchConsoleCredential = typeof searchConsoleCredentials.$inferSelect;
export type InsertSearchConsoleCredential = typeof searchConsoleCredentials.$inferInsert;

/**
 * Search Console Metrics table - cached SEO performance data
 */
export const searchConsoleMetrics = mysqlTable("searchConsoleMetrics", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  credentialId: int("credentialId").notNull().references(() => searchConsoleCredentials.id, { onDelete: "cascade" }),
  
  query: varchar("query", { length: 500 }),       // Search query keyword
  page: text("page"),                              // Landing page URL
  clicks: int("clicks").default(0).notNull(),
  impressions: int("impressions").default(0).notNull(),
  ctr: int("ctr").default(0).notNull(),            // Stored as basis points (5.23% → 523)
  position: int("position").default(0).notNull(),  // Stored as centesimal (3.45 → 345)
  
  recordedDate: timestamp("recordedDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SearchConsoleMetric = typeof searchConsoleMetrics.$inferSelect;
export type InsertSearchConsoleMetric = typeof searchConsoleMetrics.$inferInsert;

/**
 * App Notifications table - in-app notification inbox for the agency team
 */
export const appNotifications = mysqlTable("appNotifications", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 64 }).notNull().default("info"),
  // Types: info | success | warning | error | content_generated | content_approved | brief_submitted | content_published | plan_run
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: int("isRead").default(0).notNull(),
  // Optional references for deep-linking
  contentId: int("contentId").references(() => content.id, { onDelete: "set null" }),
  clientId: int("clientId").references(() => seoClients.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AppNotification = typeof appNotifications.$inferSelect;
export type InsertAppNotification = typeof appNotifications.$inferInsert;

/**
 * Pipeline Cards table - persists CRM prospect pipeline cards across sessions
 */
export const pipelineCards = mysqlTable("pipelineCards", {
  id: int("id").autoincrement().primaryKey(),
  businessName: varchar("businessName", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }),
  budgetRange: varchar("budgetRange", { length: 100 }),
  matchScore: int("matchScore").default(0),
  stage: mysqlEnum("stage", ["prospect", "contacted", "proposal", "onboarded"]).default("prospect").notNull(),
  notes: text("notes"),
  dueDate: bigint("dueDate", { mode: "number" }).default(0),
  snoozedUntil: bigint("snoozedUntil", { mode: "number" }).default(0), // UTC ms; 0 = not snoozed
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PipelineCard = typeof pipelineCards.$inferSelect;
export type InsertPipelineCard = typeof pipelineCards.$inferInsert;

/**
 * Google Business Profile Connections - stores OAuth tokens per client
 */
export const gbpConnections = mysqlTable("gbpConnections", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountId: varchar("accountId", { length: 255 }).notNull(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: bigint("tokenExpiresAt", { mode: "number" }).default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type GbpConnection = typeof gbpConnections.$inferSelect;
export type InsertGbpConnection = typeof gbpConnections.$inferInsert;

/**
 * Google Business Profile Locations - cached list of locations per connection
 */
export const gbpLocations = mysqlTable("gbpLocations", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull().references(() => gbpConnections.id, { onDelete: "cascade" }),
  locationId: varchar("locationId", { length: 255 }).notNull(),
  locationName: varchar("locationName", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 64 }),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GbpLocation = typeof gbpLocations.$inferSelect;
export type InsertGbpLocation = typeof gbpLocations.$inferInsert;

/**
 * Google Business Profile Posts - tracks posts created via the portal
 */
export const gbpPosts = mysqlTable("gbpPosts", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull().references(() => gbpConnections.id, { onDelete: "cascade" }),
  locationId: varchar("locationId", { length: 255 }).notNull(),
  locationName: varchar("locationName", { length: 255 }),
  postType: mysqlEnum("postType", ["STANDARD", "EVENT", "OFFER", "PRODUCT"]).default("STANDARD").notNull(),
  summary: text("summary").notNull(),
  callToActionType: varchar("callToActionType", { length: 64 }),
  callToActionUrl: varchar("callToActionUrl", { length: 512 }),
  eventTitle: varchar("eventTitle", { length: 255 }),
  eventStartDate: varchar("eventStartDate", { length: 32 }),
  eventEndDate: varchar("eventEndDate", { length: 32 }),
  imageUrl: varchar("imageUrl", { length: 512 }),
  status: mysqlEnum("status", ["draft", "published", "failed", "scheduled"]).default("draft").notNull(),
  scheduledFor: bigint("scheduledFor", { mode: "number" }).default(0),
  publishedAt: bigint("publishedAt", { mode: "number" }).default(0),
  gbpPostName: varchar("gbpPostName", { length: 512 }),
  errorMessage: text("errorMessage"),
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GbpPost = typeof gbpPosts.$inferSelect;
export type InsertGbpPost = typeof gbpPosts.$inferInsert;

/**
 * Brand Voice History - stores previous brand voice values for rollback
 */
export const brandVoiceHistory = mysqlTable("brandVoiceHistory", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  brandVoice: text("brandVoice").notNull(),
  source: mysqlEnum("source", ["manual", "ai_generated"]).default("manual").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BrandVoiceHistory = typeof brandVoiceHistory.$inferSelect;
export type InsertBrandVoiceHistory = typeof brandVoiceHistory.$inferInsert;

/**
 * Ads - stores Google Ads and Facebook Ads created via the portal
 */
export const ads = mysqlTable("ads", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  platform: mysqlEnum("platform", ["google", "facebook"]).notNull(),
  adType: mysqlEnum("adType", ["search", "display", "responsive_search", "image", "video", "carousel"]).default("search").notNull(),
  headline1: varchar("headline1", { length: 30 }),
  headline2: varchar("headline2", { length: 30 }),
  headline3: varchar("headline3", { length: 30 }),
  description1: varchar("description1", { length: 90 }),
  description2: varchar("description2", { length: 90 }),
  primaryText: text("primaryText"),        // Facebook primary text
  callToAction: varchar("callToAction", { length: 64 }),
  destinationUrl: varchar("destinationUrl", { length: 512 }),
  displayUrl: varchar("displayUrl", { length: 255 }),
  campaignName: varchar("campaignName", { length: 255 }),
  adSetName: varchar("adSetName", { length: 255 }),
  targetKeywords: text("targetKeywords"),  // Google: comma-separated keywords
  targetAudience: text("targetAudience"),  // Facebook: audience description
  budget: varchar("budget", { length: 32 }),
  status: mysqlEnum("adStatus", ["draft", "ready", "active", "paused", "completed"]).default("draft").notNull(),
  notes: text("notes"),

  // Performance metrics (manually entered or synced from platform)
  impressions: int("impressions").default(0).notNull(),
  clicks: int("clicks").default(0).notNull(),
  spend: varchar("spend", { length: 32 }).default("0").notNull(), // stored as string to support decimals
  conversions: int("conversions").default(0).notNull(),
  metricsUpdatedAt: timestamp("metricsUpdatedAt"),

  // A/B variant tracking
  parentAdId: int("parentAdId"),  // null = original, set = this is a variant of parentAdId
  variantLabel: varchar("variantLabel", { length: 32 }),  // e.g. "Variant A", "Variant B"

  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Ad = typeof ads.$inferSelect;
export type InsertAd = typeof ads.$inferInsert;

/**
 * Competitor Keyword Gap Analysis
 *
 * Stores scraped competitor keywords and gap analysis results per client.
 */
export const competitorKeywords = mysqlTable("competitorKeywords", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  competitorUrl: varchar("competitorUrl", { length: 512 }).notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  estimatedPosition: int("estimatedPosition"),   // Competitor's estimated SERP position (1-100)
  searchVolume: int("searchVolume"),             // Estimated monthly search volume
  difficulty: varchar("difficulty", { length: 16 }), // 'easy' | 'medium' | 'hard'
  opportunityScore: int("opportunityScore"),     // 0-100 composite score
  isGap: int("isGap").default(1).notNull(),      // 1 = client doesn't rank for this
  runId: int("runId"),                           // Links to gapAnalysisRuns.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CompetitorKeyword = typeof competitorKeywords.$inferSelect;
export type InsertCompetitorKeyword = typeof competitorKeywords.$inferInsert;

export const gapAnalysisRuns = mysqlTable("gapAnalysisRuns", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  competitorUrls: text("competitorUrls").notNull(),  // JSON array of URLs analysed
  totalGapKeywords: int("totalGapKeywords").default(0).notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(), // 'pending' | 'running' | 'complete' | 'error'
  errorMessage: text("errorMessage"),
  createdBy: int("createdBy").notNull().references(() => seoUsers.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});
export type GapAnalysisRun = typeof gapAnalysisRuns.$inferSelect;
export type InsertGapAnalysisRun = typeof gapAnalysisRuns.$inferInsert;

/**
 * Saved Keywords — keywords saved to a client's profile from keyword research results
 */
export const savedKeywords = mysqlTable("savedKeywords", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => seoClients.id, { onDelete: "cascade" }),
  crmClientId: int("crmClientId"),               // CRM agency ID for cross-reference
  keyword: varchar("keyword", { length: 255 }).notNull(),
  searchVolume: int("searchVolume"),             // Monthly search volume
  difficulty: int("difficulty"),                 // 0-100 difficulty score
  relevance: varchar("relevance", { length: 32 }), // 'high' | 'medium' | 'low'
  savedBy: int("savedBy").references(() => seoUsers.id),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SavedKeyword = typeof savedKeywords.$inferSelect;
export type InsertSavedKeyword = typeof savedKeywords.$inferInsert;

/**
 * SEO Audit History — stores audit results over time for trend tracking
 */
export const seoAuditHistory = mysqlTable("seoAuditHistory", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").references(() => seoClients.id, { onDelete: "cascade" }),
  crmClientId: int("crmClientId"),               // CRM agency ID for cross-reference
  websiteUrl: varchar("websiteUrl", { length: 500 }).notNull(),
  overallScore: int("overallScore"),
  seoScore: int("seoScore"),
  readabilityScore: int("readabilityScore"),
  technicalSeoScore: int("technicalSeoScore"),
  wordCount: int("wordCount"),
  imgWithoutAlt: int("imgWithoutAlt"),
  pageTitle: varchar("pageTitle", { length: 500 }),
  issuesJson: text("issuesJson"),                // JSON array of issues
  strengthsJson: text("strengthsJson"),          // JSON array of strengths
  improvementsJson: text("improvementsJson"),    // JSON array of improvements
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SeoAuditHistory = typeof seoAuditHistory.$inferSelect;
export type InsertSeoAuditHistory = typeof seoAuditHistory.$inferInsert;

/**
 * Keyword Rank Tracking — weekly position snapshots per saved keyword
 */
export const keywordRankings = mysqlTable("keywordRankings", {
  id: int("id").autoincrement().primaryKey(),
  savedKeywordId: int("savedKeywordId").notNull().references(() => savedKeywords.id, { onDelete: "cascade" }),
  crmClientId: int("crmClientId"),               // CRM agency ID for cross-reference
  keyword: varchar("keyword", { length: 255 }).notNull(),
  position: int("position"),                     // Rank position (1-100+, null = not ranking)
  url: varchar("url", { length: 500 }),          // URL ranking for this keyword
  searchEngine: varchar("searchEngine", { length: 32 }).default("google").notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});
export type KeywordRanking = typeof keywordRankings.$inferSelect;
export type InsertKeywordRanking = typeof keywordRankings.$inferInsert;

/**
 * Keyword Rank Alerts — per-keyword position drop alerts with push + email notification
 */
export const keywordRankAlerts = mysqlTable("keywordRankAlerts", {
  id: int("id").autoincrement().primaryKey(),
  savedKeywordId: int("savedKeywordId").notNull().references(() => savedKeywords.id, { onDelete: "cascade" }),
  crmClientId: int("crmClientId").notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  thresholdPosition: int("thresholdPosition").notNull(),   // Alert if rank drops BELOW this position (e.g. alert if pos > 10)
  alertEmail: varchar("alertEmail", { length: 255 }),      // Email to notify (defaults to owner email)
  isActive: tinyint("isActive").default(1).notNull(),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type KeywordRankAlert = typeof keywordRankAlerts.$inferSelect;
export type InsertKeywordRankAlert = typeof keywordRankAlerts.$inferInsert;

/**
 * Gap Keyword Content Briefs — AI-generated structured content briefs from competitor gap analysis
 */
export const gapKeywordBriefs = mysqlTable("gapKeywordBriefs", {
  id: int("id").autoincrement().primaryKey(),
  crmClientId: int("crmClientId").notNull(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  competitorDomain: varchar("competitorDomain", { length: 255 }),
  searchIntent: varchar("searchIntent", { length: 64 }),
  targetAudience: text("targetAudience"),
  recommendedTitle: text("recommendedTitle"),
  recommendedWordCount: int("recommendedWordCount"),
  headingsJson: text("headingsJson"),
  internalLinksJson: text("internalLinksJson"),
  writingBrief: text("writingBrief"),
  callToAction: text("callToAction"),
  seoTipsJson: text("seoTipsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GapKeywordBrief = typeof gapKeywordBriefs.$inferSelect;
export type InsertGapKeywordBrief = typeof gapKeywordBriefs.$inferInsert;

/**
 * Content Packages — AI Content Hub full packages (blog + video + social + email) per keyword
 * One package per saved keyword. One-at-a-time generation enforced at the application layer.
 */
export const contentPackages = mysqlTable("contentPackages", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull(),                          // seo_clients.id
  crmClientId: int("crmClientId").notNull(),                    // CRM agency ID
  savedKeywordId: int("savedKeywordId"),                        // savedKeywords.id (nullable for manual triggers)
  keyword: varchar("keyword", { length: 255 }).notNull(),       // The target keyword for this package

  // Overall package status
  status: mysqlEnum("status", [
    "generating",         // AI is generating content + HeyGen video submitted
    "pending_review",     // Video ready from HeyGen — awaiting Tariq's review in Content Studio
    "pending_approval",   // All content ready, awaiting your approval
    "approved",           // You approved — ready to publish
    "published",          // Published to WordPress + scheduled in CRM
    "failed",             // Generation or HeyGen rendering failed
    "rejected",           // You rejected — can regenerate
  ]).default("generating").notNull(),

  // Blog post (stored in content table, reference by ID)
  blogContentId: int("blogContentId"),                          // content.id for the blog post
  blogTitle: varchar("blogTitle", { length: 500 }),
  blogExcerpt: text("blogExcerpt"),                             // First 300 chars for preview

  // Video script + HeyGen
  videoScript: text("videoScript"),                             // The 60s script sent to HeyGen
  heygenVideoId: varchar("heygenVideoId", { length: 255 }),     // HeyGen video_id for polling
  heygenVideoStatus: mysqlEnum("heygenVideoStatus", [
    "not_started", "processing", "completed", "failed"
  ]).default("not_started").notNull(),
  heygenVideoUrl: text("heygenVideoUrl"),                       // Final MP4 download URL
  heygenThumbnailUrl: text("heygenThumbnailUrl"),               // Thumbnail for preview

  // Social captions (JSON array of {platform, caption})
  socialCaptionsJson: text("socialCaptionsJson"),               // [{platform:"facebook",caption:"..."}, ...]

  // Email newsletter
  emailSubject: varchar("emailSubject", { length: 255 }),
  emailBody: text("emailBody"),

  // Error tracking
  errorMessage: text("errorMessage"),

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  publishedAt: timestamp("publishedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ContentPackage = typeof contentPackages.$inferSelect;
export type InsertContentPackage = typeof contentPackages.$inferInsert;

// ─── Notification Logs ────────────────────────────────────────────────────────
export const notificationLogs = mysqlTable("notification_logs", {
  id: int("id").autoincrement().primaryKey(),
  type: varchar("type", { length: 100 }).notNull(),
  channel: mysqlEnum("channel", ["email", "sms", "push", "in_app"]).notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  status: mysqlEnum("status", ["sent", "failed", "suppressed"]).notNull().default("sent"),
  suppressed: boolean("suppressed").notNull().default(false),
  suppressionReason: varchar("suppression_reason", { length: 255 }),
  leadId: int("lead_id"),
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;

// ─── Email Templates ─────────────────────────────────────────────────────────
export const emailTemplates = mysqlTable("email_templates", {
  id: int("id").autoincrement().primaryKey(),
  campaignType: varchar("campaign_type", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  fromAddress: varchar("from_address", { length: 320 }).notNull().default("tim@lockinloans.com"),
  subject: varchar("subject", { length: 500 }).notNull(),
  html: text("html").notNull(),
  category: varchar("category", { length: 100 }).notNull().default("general"),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

// ─── Inbound Emails (Client Replies) ─────────────────────────────────────────
export const inboundEmails = mysqlTable("inbound_emails", {
  id: int("id").autoincrement().primaryKey(),
  fromEmail: varchar("from_email", { length: 320 }).notNull(),
  fromName: varchar("from_name", { length: 200 }),
  toEmail: varchar("to_email", { length: 320 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  htmlBody: text("html_body"),
  leadId: int("lead_id"),
  assignedTo: varchar("assigned_to", { length: 320 }),
  isRead: boolean("is_read").notNull().default(false),
  isReplied: boolean("is_replied").notNull().default(false),
  repliedAt: timestamp("replied_at"),
  replyBody: text("reply_body"),
  messageId: varchar("message_id", { length: 500 }),
  inReplyTo: varchar("in_reply_to", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type InboundEmail = typeof inboundEmails.$inferSelect;
export type InsertInboundEmail = typeof inboundEmails.$inferInsert;

// ─── Viral Topic Research ─────────────────────────────────────────────────────
// Stores AI-researched viral topics for each brand (short-form + long-form)
export const viralTopics = mysqlTable("viral_topics", {
  id: int("id").autoincrement().primaryKey(),
  seoClientId: int("seo_client_id").notNull(),           // seo_clients.id (the brand)
  topic: varchar("topic", { length: 500 }).notNull(),    // The topic/title idea
  contentType: mysqlEnum("content_type", [
    "youtube_longform",   // Coach Tim only — full YouTube video (5-20 min)
    "short_form",         // Reels/TikTok/Shorts (max 60s)
    "blog_post",          // Written SEO content
  ]).notNull().default("short_form"),
  platform: varchar("platform", { length: 100 }),        // "youtube", "instagram", "tiktok", "facebook"
  viralScore: int("viral_score"),                        // 0-100 estimated virality
  searchVolume: int("search_volume"),                    // Monthly search volume estimate
  difficulty: int("difficulty"),                         // 0-100 keyword difficulty
  hook: text("hook"),                                    // Suggested opening hook
  keyPoints: text("key_points"),                         // JSON array of key talking points
  competitorUrls: text("competitor_urls"),               // JSON array of competitor video URLs
  researchNotes: text("research_notes"),                 // AI analysis notes
  status: mysqlEnum("status", [
    "researched",    // Topic found and scored
    "scripted",      // Script written
    "in_production", // HeyGen video being generated
    "ready",         // Video ready, awaiting post
    "posted",        // Published to social
    "archived",      // Not using
  ]).notNull().default("researched"),
  weekOf: date("week_of"),                               // Which week this is scheduled for
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ViralTopic = typeof viralTopics.$inferSelect;
export type InsertViralTopic = typeof viralTopics.$inferInsert;

// ─── Social Media Posts ───────────────────────────────────────────────────────
// Tracks every social post — scheduled, posted, or failed
export const socialPosts = mysqlTable("social_posts", {
  id: int("id").autoincrement().primaryKey(),
  seoClientId: int("seo_client_id").notNull(),           // seo_clients.id (the brand)
  viralTopicId: int("viral_topic_id"),                   // viral_topics.id (optional link)
  contentPackageId: int("content_package_id"),           // contentPackages.id (optional link)
  platform: mysqlEnum("platform", [
    "facebook", "instagram", "tiktok", "youtube", "youtube_shorts"
  ]).notNull(),
  postType: mysqlEnum("post_type", [
    "video", "reel", "short", "image", "carousel", "text"
  ]).notNull().default("video"),
  caption: text("caption"),                              // The post caption/description
  hashtags: text("hashtags"),                            // Space-separated hashtags
  videoUrl: text("video_url"),                           // CDN URL of the video file
  thumbnailUrl: text("thumbnail_url"),                   // Thumbnail image URL
  scheduledAt: timestamp("scheduled_at"),                // When to post (null = post now)
  postedAt: timestamp("posted_at"),                      // When actually posted
  platformPostId: varchar("platform_post_id", { length: 255 }), // ID returned by platform API
  status: mysqlEnum("status", [
    "draft",      // Being written
    "ready",      // Caption + video ready, awaiting schedule
    "scheduled",  // Queued for posting
    "posted",     // Successfully posted
    "failed",     // Posting failed
  ]).notNull().default("draft"),
  errorMessage: text("error_message"),
  notes: text("notes"),                                  // Internal notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = typeof socialPosts.$inferInsert;

// ─── Content Calendar ─────────────────────────────────────────────────────────
// Monthly content calendar entries — one row per planned piece of content
export const contentCalendar = mysqlTable("content_calendar", {
  id: int("id").autoincrement().primaryKey(),
  seoClientId: int("seo_client_id").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  contentType: mysqlEnum("content_type", [
    "youtube_longform", "short_form", "blog_post", "email", "social_image"
  ]).notNull(),
  platforms: text("platforms"),                          // JSON array: ["facebook","instagram","tiktok"]
  scheduledDate: date("scheduled_date").notNull(),
  viralTopicId: int("viral_topic_id"),
  socialPostId: int("social_post_id"),
  contentPackageId: int("content_package_id"),
  status: mysqlEnum("status", [
    "planned", "in_production", "ready", "posted", "skipped"
  ]).notNull().default("planned"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type ContentCalendarEntry = typeof contentCalendar.$inferSelect;
export type InsertContentCalendarEntry = typeof contentCalendar.$inferInsert;


/**
 * HeyGen Sessions — stores auth cookies/tokens captured from manual login.
 * The browser agent uses these stored tokens to skip the login flow entirely,
 * bypassing Cloudflare Turnstile captcha.
 */
export const heygenSessions = mysqlTable("heygen_sessions", {
  id: int("id").autoincrement().primaryKey(),
  seoClientId: int("seo_client_id").notNull(),
  /** The HeyGen auth token (from cookie or localStorage) */
  token: text("token").notNull(),
  /** Full cookie JSON string for injecting into browser sessions */
  cookies: text("cookies"),
  /** Token type: 'cookie' or 'api_token' */
  tokenType: varchar("token_type", { length: 50 }).default("cookie").notNull(),
  /** When the token expires (if known) */
  expiresAt: timestamp("expires_at"),
  /** Whether this session is still valid */
  isActive: int("is_active").default(1).notNull(),
  /** Last time the token was successfully used */
  lastUsedAt: timestamp("last_used_at"),
  /** Who captured this token */
  capturedBy: int("captured_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type HeygenSession = typeof heygenSessions.$inferSelect;
export type InsertHeygenSession = typeof heygenSessions.$inferInsert;
