CREATE TABLE `conversation_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`agencyId` int NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`content` text NOT NULL,
	`mediaUrls` json,
	`status` enum('sent','delivered','read','failed') DEFAULT 'sent',
	`sentByUserId` int,
	`externalMessageId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conversation_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`leadId` int,
	`borrowerId` int,
	`assignedUserId` int,
	`channel` enum('sms','email','facebook','instagram','whatsapp') NOT NULL,
	`contactName` varchar(255),
	`contactPhone` varchar(32),
	`contactEmail` varchar(320),
	`lastMessageAt` timestamp,
	`lastMessagePreview` text,
	`isRead` boolean DEFAULT false,
	`isArchived` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `facebook_lead_ads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`facebookLeadId` varchar(128) NOT NULL,
	`formId` varchar(128),
	`pageId` varchar(128),
	`adId` varchar(128),
	`firstName` varchar(100),
	`lastName` varchar(100),
	`email` varchar(320),
	`phone` varchar(32),
	`rawData` json,
	`processedLeadId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `facebook_lead_ads_id` PRIMARY KEY(`id`),
	CONSTRAINT `facebook_lead_ads_facebookLeadId_unique` UNIQUE(`facebookLeadId`)
);
--> statement-breakpoint
CREATE TABLE `lead_source_assistant_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`leadSource` varchar(100) NOT NULL,
	`vapiAssistantId` int NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lead_source_assistant_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `market_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agencyId` int NOT NULL,
	`reportDate` timestamp NOT NULL,
	`marketArea` varchar(255),
	`avgLoanAmount` decimal(12,2),
	`avgInterestRate` decimal(5,3),
	`totalLoansInMarket` int,
	`marketSharePct` decimal(5,2),
	`competitorData` json,
	`trendData` json,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `market_analytics_id` PRIMARY KEY(`id`)
);
