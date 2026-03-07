CREATE TABLE `agencies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`logoUrl` text,
	`website` text,
	`phone` varchar(32),
	`email` varchar(320),
	`address` text,
	`status` enum('active','suspended','trial','cancelled') NOT NULL DEFAULT 'trial',
	`subscriptionPlanId` int,
	`stripeCustomerId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`maxUsers` int DEFAULT 5,
	`maxLeads` int DEFAULT 500,
	`settings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agencies_id` PRIMARY KEY(`id`),
	CONSTRAINT `agencies_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `ai_scripts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`purpose` enum('cold_call','follow_up','appointment_booking','re_engagement','referral_request','other') NOT NULL,
	`script` text NOT NULL,
	`variables` json,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_scripts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`userId` int NOT NULL,
	`leadId` int,
	`borrowerId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`type` enum('consultation','follow_up','closing','review','call','meeting','other') DEFAULT 'consultation',
	`status` enum('scheduled','confirmed','completed','cancelled','no_show','rescheduled') DEFAULT 'scheduled',
	`startAt` timestamp NOT NULL,
	`endAt` timestamp NOT NULL,
	`timezone` varchar(64) DEFAULT 'America/New_York',
	`location` text,
	`meetingUrl` text,
	`reminderSent` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_executions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowId` int NOT NULL,
	`agencyId` int NOT NULL,
	`leadId` int,
	`status` enum('running','completed','failed','paused') DEFAULT 'running',
	`currentStep` int DEFAULT 0,
	`logs` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`errorMessage` text,
	CONSTRAINT `automation_executions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_workflow_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workflowId` int NOT NULL,
	`stepOrder` int NOT NULL,
	`type` enum('send_email','send_sms','create_task','update_lead_status','add_tag','remove_tag','wait_delay','condition','place_call','create_appointment','notify_user','webhook') NOT NULL,
	`config` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automation_workflow_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automation_workflows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`createdByUserId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`trigger` enum('new_lead','lead_status_change','email_opened','email_clicked','sms_replied','appointment_booked','appointment_cancelled','form_submitted','tag_added','score_threshold','manual') NOT NULL,
	`triggerConfig` json,
	`isActive` boolean NOT NULL DEFAULT false,
	`totalExecutions` int DEFAULT 0,
	`lastExecutedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automation_workflows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `borrowers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int,
	`agencyId` int NOT NULL,
	`assignedUserId` int,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100),
	`email` varchar(320),
	`phone` varchar(32),
	`ssn` varchar(20),
	`dateOfBirth` timestamp,
	`address` text,
	`loanType` enum('conventional','fha','va','usda','jumbo','heloc','refinance','other'),
	`loanAmount` decimal(12,2),
	`propertyAddress` text,
	`propertyType` enum('single_family','condo','townhouse','multi_family','commercial','land','other'),
	`purchasePrice` decimal(12,2),
	`downPayment` decimal(12,2),
	`creditScore` int,
	`annualIncome` decimal(12,2),
	`currentMilestone` enum('inquiry','pre_approval','application','processing','underwriting','conditional_approval','clear_to_close','closing','funded','denied') DEFAULT 'inquiry',
	`notes` text,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `borrowers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `call_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`leadId` int,
	`borrowerId` int,
	`userId` int,
	`vapiCallId` varchar(128),
	`direction` enum('inbound','outbound') DEFAULT 'outbound',
	`status` enum('initiated','ringing','in_progress','completed','failed','no_answer','busy','cancelled') DEFAULT 'initiated',
	`fromNumber` varchar(32),
	`toNumber` varchar(32),
	`duration` int DEFAULT 0,
	`recordingUrl` text,
	`transcript` text,
	`summary` text,
	`sentiment` enum('positive','neutral','negative'),
	`appointmentBooked` boolean DEFAULT false,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `call_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaign_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('email','sms') NOT NULL,
	`subject` varchar(500),
	`content` text NOT NULL,
	`variables` json,
	`isGlobal` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaign_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`contentType` enum('social_post','email_campaign','sms_campaign','blog_post') NOT NULL,
	`contentId` int NOT NULL,
	`requestedByUserId` int,
	`reviewedByUserId` int,
	`status` enum('pending','approved','rejected','revision_requested') DEFAULT 'pending',
	`comments` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversion_funnel` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`stage` varchar(100) NOT NULL,
	`count` int DEFAULT 0,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversion_funnel_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`borrowerId` int,
	`leadId` int,
	`uploadedByUserId` int,
	`name` varchar(255) NOT NULL,
	`type` enum('application','pay_stub','tax_return','bank_statement','id_document','insurance','appraisal','title','other') DEFAULT 'other',
	`fileKey` varchar(500) NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(100),
	`fileSize` int,
	`version` int DEFAULT 1,
	`isShared` boolean DEFAULT false,
	`shareToken` varchar(128),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`createdByUserId` int,
	`name` varchar(255) NOT NULL,
	`subject` varchar(500) NOT NULL,
	`fromName` varchar(255),
	`fromEmail` varchar(320),
	`content` text NOT NULL,
	`templateId` int,
	`status` enum('draft','scheduled','sending','sent','paused','cancelled') DEFAULT 'draft',
	`audienceFilter` json,
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`totalRecipients` int DEFAULT 0,
	`totalSent` int DEFAULT 0,
	`totalOpened` int DEFAULT 0,
	`totalClicked` int DEFAULT 0,
	`totalBounced` int DEFAULT 0,
	`totalUnsubscribed` int DEFAULT 0,
	`sendgridCampaignId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`stripeInvoiceId` varchar(128),
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(10) DEFAULT 'usd',
	`status` enum('draft','open','paid','uncollectible','void') NOT NULL DEFAULT 'open',
	`description` text,
	`paidAt` timestamp,
	`dueDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`agencyId` int NOT NULL,
	`userId` int,
	`type` enum('call','email','sms','note','task','appointment','status_change','score_change','import','ai_call') NOT NULL,
	`subject` varchar(255),
	`content` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`agencyId` int NOT NULL,
	`assignedUserId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
	`dueAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`assignedUserId` int,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100),
	`email` varchar(320),
	`phone` varchar(32),
	`company` varchar(255),
	`contactType` enum('borrower','re_agent','attorney','insurance','title_co','builder','lender','other') NOT NULL DEFAULT 'borrower',
	`status` enum('new','contacted','qualified','appointment_set','converted','lost','nurturing') NOT NULL DEFAULT 'new',
	`pipelineStage` enum('new','contacted','qualified','proposal','negotiation','closed_won','closed_lost') NOT NULL DEFAULT 'new',
	`source` enum('social_media','referral','webinar','import','manual','facebook_ads','website','cold_call','other') NOT NULL DEFAULT 'manual',
	`score` int DEFAULT 0,
	`loanAmount` decimal(12,2),
	`propertyAddress` text,
	`notes` text,
	`tags` json,
	`lastContactedAt` timestamp,
	`nextFollowUpAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loan_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`borrowerId` int NOT NULL,
	`agencyId` int NOT NULL,
	`milestone` varchar(100) NOT NULL,
	`status` enum('pending','in_progress','completed','failed') DEFAULT 'pending',
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loan_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`userId` int,
	`metricDate` timestamp NOT NULL,
	`totalLeads` int DEFAULT 0,
	`newLeads` int DEFAULT 0,
	`convertedLeads` int DEFAULT 0,
	`totalCalls` int DEFAULT 0,
	`totalAppointments` int DEFAULT 0,
	`totalEmailsSent` int DEFAULT 0,
	`totalSmsSent` int DEFAULT 0,
	`totalRevenue` decimal(12,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`assignedUserId` int,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100),
	`email` varchar(320),
	`phone` varchar(32),
	`company` varchar(255),
	`partnerType` enum('attorney','title_co','builder','re_agent','insurance','lender','accountant','financial_advisor','other') NOT NULL,
	`status` enum('active','inactive','prospect') DEFAULT 'prospect',
	`referralCount` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sms_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`createdByUserId` int,
	`name` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`fromNumber` varchar(32),
	`status` enum('draft','scheduled','sending','sent','paused','cancelled') DEFAULT 'draft',
	`audienceFilter` json,
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`totalRecipients` int DEFAULT 0,
	`totalSent` int DEFAULT 0,
	`totalDelivered` int DEFAULT 0,
	`totalFailed` int DEFAULT 0,
	`twilioMessageServiceSid` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sms_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_media_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`createdByUserId` int,
	`platform` enum('facebook','instagram','linkedin','twitter','youtube','tiktok') NOT NULL,
	`content` text NOT NULL,
	`mediaUrls` json,
	`status` enum('draft','pending_approval','approved','scheduled','published','rejected') DEFAULT 'draft',
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`engagementData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_media_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`monthlyPrice` decimal(10,2) NOT NULL,
	`annualPrice` decimal(10,2),
	`stripePriceIdMonthly` varchar(128),
	`stripePriceIdAnnual` varchar(128),
	`maxUsers` int DEFAULT 5,
	`maxLeads` int DEFAULT 500,
	`maxCampaigns` int DEFAULT 10,
	`features` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `team_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`userId` int NOT NULL,
	`type` enum('new_lead','appointment_reminder','campaign_sent','call_completed','task_due','workflow_triggered','document_uploaded','system') NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`isRead` boolean DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vapi_assistants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`vapiAssistantId` varchar(128),
	`leadSource` varchar(100),
	`systemPrompt` text,
	`firstMessage` text,
	`voice` varchar(100) DEFAULT 'jennifer',
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vapi_assistants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webinar_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`leadId` int,
	`webinarTitle` varchar(255) NOT NULL,
	`webinarDate` timestamp,
	`firstName` varchar(100),
	`lastName` varchar(100),
	`email` varchar(320),
	`phone` varchar(32),
	`attended` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webinar_registrations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','admin','user','loa') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `agencyId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;