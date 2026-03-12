/**
 * Campaign Verification & Monitoring System Schema
 * 
 * Tracks all marketing campaigns across email, SMS, Vapi, webinars, and social media
 * Provides real-time delivery tracking, audit logs, and automated alerts
 */

import { mysqlTable, varchar, text, int, timestamp, boolean, json } from 'drizzle-orm/mysql-core';

/**
 * Campaigns Table
 * Stores all marketing campaigns across all channels
 */
export const campaigns = mysqlTable('campaigns', {
  id: int('id').primaryKey().autoincrement(),
  agencyId: int('agency_id').notNull(),
  
  // Campaign Info
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'email', 'sms', 'vapi', 'webinar', 'social', 'automation'
  status: varchar('status', { length: 50 }).notNull().default('draft'), // 'draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'
  
  // Scheduling
  scheduledAt: timestamp('scheduled_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Content
  subject: varchar('subject', { length: 500 }),
  content: text('content'),
  templateId: int('template_id'),
  
  // Targeting
  targetAudience: json('target_audience').$type<{
    leadIds?: number[];
    filters?: {
      status?: string[];
      source?: string[];
      dateRange?: { start: string; end: string };
    };
    excludeIds?: number[];
  }>(),
  
  // Delivery Stats
  totalRecipients: int('total_recipients').default(0),
  sentCount: int('sent_count').default(0),
  deliveredCount: int('delivered_count').default(0),
  failedCount: int('failed_count').default(0),
  openedCount: int('opened_count').default(0),
  clickedCount: int('clicked_count').default(0),
  
  // Settings
  sendFromEmail: varchar('send_from_email', { length: 255 }),
  sendFromPhone: varchar('send_from_phone', { length: 50 }),
  vapiAssistantId: varchar('vapi_assistant_id', { length: 255 }),
  
  // Verification
  testSent: boolean('test_sent').default(false),
  testSentAt: timestamp('test_sent_at'),
  approvedBy: int('approved_by'),
  approvedAt: timestamp('approved_at'),
  
  // Metadata
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Campaign Messages Table
 * Tracks every individual message sent in a campaign
 */
export const campaignMessages = mysqlTable('campaign_messages', {
  id: int('id').primaryKey().autoincrement(),
  campaignId: int('campaign_id').notNull(),
  
  // Recipient
  leadId: int('lead_id'),
  recipientEmail: varchar('recipient_email', { length: 255 }),
  recipientPhone: varchar('recipient_phone', { length: 50 }),
  recipientName: varchar('recipient_name', { length: 255 }),
  
  // Delivery Status
  status: varchar('status', { length: 50 }).notNull().default('queued'), // 'queued', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'
  
  // External IDs
  externalId: varchar('external_id', { length: 255 }), // SendGrid message ID, Twilio SID, Vapi call ID
  
  // Timestamps
  queuedAt: timestamp('queued_at').notNull().defaultNow(),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  failedAt: timestamp('failed_at'),
  
  // Error Handling
  errorMessage: text('error_message'),
  retryCount: int('retry_count').default(0),
  lastRetryAt: timestamp('last_retry_at'),
  
  // Content (for audit)
  subject: varchar('subject', { length: 500 }),
  content: text('content'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Campaign Alerts Table
 * Automated alerts for campaign monitoring
 */
export const campaignAlerts = mysqlTable('campaign_alerts', {
  id: int('id').primaryKey().autoincrement(),
  campaignId: int('campaign_id'),
  
  // Alert Info
  type: varchar('type', { length: 50 }).notNull(), // 'pre_launch', 'zero_recipients', 'high_failure_rate', 'delivery_complete', 'test_required'
  severity: varchar('severity', { length: 20 }).notNull(), // 'info', 'warning', 'error', 'critical'
  message: text('message').notNull(),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'sent', 'dismissed'
  sentAt: timestamp('sent_at'),
  dismissedAt: timestamp('dismissed_at'),
  dismissedBy: int('dismissed_by'),
  
  // Recipients
  notifyUserIds: json('notify_user_ids').$type<number[]>(),
  notifyEmails: json('notify_emails').$type<string[]>(),
  notifyPhones: json('notify_phones').$type<string[]>(),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Campaign Audit Log Table
 * Complete history of all campaign actions
 */
export const campaignAuditLog = mysqlTable('campaign_audit_log', {
  id: int('id').primaryKey().autoincrement(),
  campaignId: int('campaign_id'),
  
  // Action Info
  action: varchar('action', { length: 100 }).notNull(), // 'created', 'updated', 'scheduled', 'test_sent', 'approved', 'started', 'paused', 'resumed', 'completed', 'cancelled'
  description: text('description'),
  
  // Actor
  userId: int('user_id'),
  userEmail: varchar('user_email', { length: 255 }),
  
  // Changes
  changesBefore: json('changes_before'),
  changesAfter: json('changes_after'),
  
  // Metadata
  ipAddress: varchar('ip_address', { length: 50 }),
  userAgent: varchar('user_agent', { length: 500 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Funnel Steps Table
 * Define marketing funnel steps for tracking
 */
export const funnelSteps = mysqlTable('funnel_steps', {
  id: int('id').primaryKey().autoincrement(),
  agencyId: int('agency_id').notNull(),
  
  // Step Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  stepOrder: int('step_order').notNull(),
  
  // Trigger
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // 'lead_created', 'status_change', 'time_delay', 'manual', 'campaign_completed'
  triggerConfig: json('trigger_config'),
  
  // Action
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'send_email', 'send_sms', 'vapi_call', 'update_status', 'assign_to', 'wait'
  actionConfig: json('action_config'),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

/**
 * Funnel Progress Table
 * Track contacts through funnel steps
 */
export const funnelProgress = mysqlTable('funnel_progress', {
  id: int('id').primaryKey().autoincrement(),
  leadId: int('lead_id').notNull(),
  funnelStepId: int('funnel_step_id').notNull(),
  
  // Progress
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'in_progress', 'completed', 'failed', 'skipped'
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Results
  campaignId: int('campaign_id'),
  messageId: int('message_id'),
  result: json('result'),
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ==========================================
// Drip Campaign Sequences
// Automated multi-step email/SMS follow-up sequences
// ==========================================

/**
 * Campaign Sequences — named drip sequences (e.g. "DSCR New Lead Follow-Up")
 */
export const campaignSequences = mysqlTable('campaign_sequences', {
  id: int('id').primaryKey().autoincrement(),
  agencyId: int('agency_id').notNull(),
  clientId: int('client_id'),            // null = agency-wide; set = client-specific
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  leadType: varchar('lead_type', { length: 100 }), // 'dscr', 'fix_flip', 'old_lead', 'all'
  triggerEvent: varchar('trigger_event', { length: 100 }).notNull().default('lead_created'),
  // 'lead_created' | 'no_appointment_24h' | 'manual' | 'status_change'
  isActive: boolean('is_active').default(true).notNull(),
  stopOnAppointment: boolean('stop_on_appointment').default(true).notNull(),
  stopOnReply: boolean('stop_on_reply').default(true).notNull(),
  createdBy: int('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});
export type CampaignSequence = typeof campaignSequences.$inferSelect;
export type InsertCampaignSequence = typeof campaignSequences.$inferInsert;

/**
 * Campaign Sequence Steps — individual email or SMS steps in a sequence
 */
export const campaignSequenceSteps = mysqlTable('campaign_sequence_steps', {
  id: int('id').primaryKey().autoincrement(),
  sequenceId: int('sequence_id').notNull(),
  stepOrder: int('step_order').notNull(),
  channel: varchar('channel', { length: 10 }).notNull(), // 'email' | 'sms'
  delayHours: int('delay_hours').notNull().default(0),   // hours after previous step (or enrollment)
  subject: varchar('subject', { length: 500 }),          // email only
  body: text('body').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});
export type CampaignSequenceStep = typeof campaignSequenceSteps.$inferSelect;
export type InsertCampaignSequenceStep = typeof campaignSequenceSteps.$inferInsert;

/**
 * Campaign Enrollments — tracks which leads are enrolled in which sequences
 */
export const campaignEnrollments = mysqlTable('campaign_enrollments', {
  id: int('id').primaryKey().autoincrement(),
  sequenceId: int('sequence_id').notNull(),
  leadId: int('lead_id').notNull(),
  agencyId: int('agency_id').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('active'),
  // 'active' | 'paused' | 'completed' | 'stopped' | 'unsubscribed'
  currentStep: int('current_step').default(0).notNull(),
  nextStepAt: timestamp('next_step_at'),
  enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  stoppedReason: varchar('stopped_reason', { length: 100 }),
  // 'appointment_booked' | 'replied' | 'manual' | 'unsubscribed'
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});
export type CampaignEnrollment = typeof campaignEnrollments.$inferSelect;
export type InsertCampaignEnrollment = typeof campaignEnrollments.$inferInsert;

/**
 * Campaign Step Logs — records each message sent per enrollment
 */
export const campaignStepLogs = mysqlTable('campaign_step_logs', {
  id: int('id').primaryKey().autoincrement(),
  enrollmentId: int('enrollment_id').notNull(),
  stepId: int('step_id').notNull(),
  leadId: int('lead_id').notNull(),
  channel: varchar('channel', { length: 10 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('sent'),
  // 'sent' | 'failed' | 'skipped'
  externalId: varchar('external_id', { length: 255 }), // SendGrid/Twilio ID
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
});
export type CampaignStepLog = typeof campaignStepLogs.$inferSelect;
export type InsertCampaignStepLog = typeof campaignStepLogs.$inferInsert;
