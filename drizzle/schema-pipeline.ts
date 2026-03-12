import { mysqlTable, int, varchar, text, boolean, decimal, timestamp, json } from "drizzle-orm/mysql-core";

// ─── Pipelines ────────────────────────────────────────────────────────────────
export const pipelines = mysqlTable("pipelines", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull(),
  clientId: int("client_id"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: int("created_by").notNull(),
  monthlyGoal: decimal("monthly_goal", { precision: 12, scale: 2 }),
  roundRobinIndex: int("round_robin_index").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─── Pipeline Stages ──────────────────────────────────────────────────────────
export const pipelineStages = mysqlTable("pipeline_stages", {
  id: int("id").autoincrement().primaryKey(),
  pipelineId: int("pipeline_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 32 }).default("#6366f1"),
  stageOrder: int("stage_order").notNull().default(0),
  probability: int("probability").default(0), // 0-100
  defaultTask: text("default_task"),
  slaHours: int("sla_hours"), // expected follow-up SLA in hours
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─── Opportunities ────────────────────────────────────────────────────────────
export const opportunities = mysqlTable("opportunities", {
  id: int("id").autoincrement().primaryKey(),
  agencyId: int("agency_id").notNull(),
  clientId: int("client_id"),
  pipelineId: int("pipeline_id").notNull(),
  stageId: int("stage_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactId: int("contact_id"), // links to leads table
  contactName: varchar("contact_name", { length: 255 }),
  companyName: varchar("company_name", { length: 255 }),
  value: decimal("value", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 32 }).default("open"), // open | won | lost
  source: varchar("source", { length: 128 }),
  ownerId: int("owner_id"),
  ownerName: varchar("owner_name", { length: 255 }),
  tags: json("tags").$type<string[]>().default([]),
  expectedCloseDate: timestamp("expected_close_date"),
  notes: text("notes"),
  priority: varchar("priority", { length: 16 }).default("medium"), // low | medium | high
  customFields: json("custom_fields").$type<Record<string, string | number | boolean>>().default({}),
  stageEnteredAt: timestamp("stage_entered_at"),
  closedReason: varchar("closed_reason", { length: 255 }),
  closedReasonNotes: text("closed_reason_notes"),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─── Opportunity Activities ───────────────────────────────────────────────────
export const opportunityActivities = mysqlTable("opportunity_activities", {
  id: int("id").autoincrement().primaryKey(),
  opportunityId: int("opportunity_id").notNull(),
  type: varchar("type", { length: 64 }).notNull(), // note | stage_change | task | call | email | sms
  content: text("content").notNull(),
  fromStage: varchar("from_stage", { length: 255 }),
  toStage: varchar("to_stage", { length: 255 }),
  createdBy: int("created_by"),
  createdByName: varchar("created_by_name", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
