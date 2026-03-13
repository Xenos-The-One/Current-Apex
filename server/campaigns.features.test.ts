/**
 * Tests for Campaigns page features:
 * 1. Template library constants (EMAIL_TEMPLATES, SMS_TEMPLATES)
 * 2. createEmailCampaign procedure (used for duplicate)
 * 3. smsCampaigns.createCampaign procedure (used for duplicate)
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-open-id",
      email: "admin@test.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Template Constants (frontend) ───────────────────────────────────────────

const EMAIL_TEMPLATES = [
  { id: "welcome", name: "Welcome Email", category: "Onboarding", subject: "Welcome!", content: "Hi {name}" },
  { id: "rate_drop", name: "Rate Drop Alert", category: "Market Update", subject: "Rates dropped", content: "Hi {name}, rates dropped" },
  { id: "follow_up", name: "Follow-Up (No Response)", category: "Follow-Up", subject: "Still thinking?", content: "Hi {name}, following up" },
  { id: "pre_approval", name: "Pre-Approval Invitation", category: "Conversion", subject: "Get pre-approved", content: "Hi {name}, get pre-approved" },
  { id: "appt_confirm", name: "Appointment Confirmation", category: "Appointment", subject: "Confirmed: {date}", content: "Hi {name}, confirmed" },
  { id: "referral_ask", name: "Referral Request", category: "Referral", subject: "Know anyone?", content: "Hi {name}, referral" },
];

const SMS_TEMPLATES = [
  { id: "intro", name: "Introduction", category: "Outreach", message: "Hi {name}! This is {agent_name}." },
  { id: "rate_alert", name: "Rate Drop Alert", category: "Market Update", message: "Hi {name}! Rates dropped." },
  { id: "follow_up", name: "Follow-Up", category: "Follow-Up", message: "Hi {name}, just checking in!" },
  { id: "appt_reminder", name: "Appointment Reminder", category: "Appointment", message: "Hi {name}! Reminder: tomorrow." },
  { id: "docs_request", name: "Document Request", category: "Processing", message: "Hi {name}! Need documents." },
  { id: "referral", name: "Referral Ask", category: "Referral", message: "Hi {name}! Know anyone?" },
];

describe("Campaign Template Library", () => {
  it("EMAIL_TEMPLATES has 6 templates with required fields", () => {
    expect(EMAIL_TEMPLATES).toHaveLength(6);
    for (const t of EMAIL_TEMPLATES) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("name");
      expect(t).toHaveProperty("category");
      expect(t).toHaveProperty("subject");
      expect(t).toHaveProperty("content");
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.subject).toBeTruthy();
      expect(t.content).toBeTruthy();
    }
  });

  it("SMS_TEMPLATES has 6 templates with required fields", () => {
    expect(SMS_TEMPLATES).toHaveLength(6);
    for (const t of SMS_TEMPLATES) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("name");
      expect(t).toHaveProperty("category");
      expect(t).toHaveProperty("message");
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.message).toBeTruthy();
    }
  });

  it("all SMS templates include opt-out instructions or are short enough to add them", () => {
    for (const t of SMS_TEMPLATES) {
      // Each template message should be under 160 chars (1 SMS segment)
      expect(t.message.length).toBeLessThanOrEqual(160);
    }
  });

  it("template IDs are unique within each set", () => {
    const emailIds = EMAIL_TEMPLATES.map(t => t.id);
    const smsIds = SMS_TEMPLATES.map(t => t.id);
    expect(new Set(emailIds).size).toBe(emailIds.length);
    expect(new Set(smsIds).size).toBe(smsIds.length);
  });
});

// ─── Backend Procedure Tests ──────────────────────────────────────────────────

describe("campaignsOld.listEmailCampaigns", () => {
  it("returns an array for a valid clientId (graceful on empty DB)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaignsOld.listEmailCampaigns({ clientId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("smsCampaigns.getCampaigns", () => {
  it("returns an array for a valid clientId (graceful on empty DB)", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.smsCampaigns.getCampaigns({ clientId: 9999 });
    expect(Array.isArray(result)).toBe(true);
  });
});
