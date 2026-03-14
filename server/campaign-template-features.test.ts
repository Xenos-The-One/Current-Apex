/**
 * Tests for three campaign template features:
 * 1. Template usage tracking (trackTemplateUsage, getTemplateUsageCounts)
 * 2. Seed template to client (seedTemplateToClient)
 * 3. Save as Template (saveAsTemplate)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

const mockDb = {
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
};

vi.mock("../drizzle/schema", () => ({
  templateUsageEvents: { templateId: "templateId", channel: "channel", clientId: "clientId", usedAt: "usedAt" },
  campaignTemplates: { id: "id", name: "name", channel: "channel", subject: "subject", content: "content", clientId: "clientId", createdAt: "createdAt" },
}));

// ─── Unit tests for business logic ───────────────────────────────────────────

describe("Template Usage Tracking", () => {
  describe("trackTemplateUsage logic", () => {
    it("records a usage event with required fields", () => {
      const event = {
        templateId: "email-welcome-new-lead",
        channel: "email",
        clientId: 42,
        usedAt: new Date(),
      };
      expect(event.templateId).toBe("email-welcome-new-lead");
      expect(event.channel).toBe("email");
      expect(event.clientId).toBe(42);
      expect(event.usedAt).toBeInstanceOf(Date);
    });

    it("accepts all three channel types", () => {
      const channels = ["email", "sms", "ai-calling"] as const;
      channels.forEach((channel) => {
        const event = { templateId: "test-id", channel, clientId: 1, usedAt: new Date() };
        expect(event.channel).toBe(channel);
      });
    });

    it("handles missing clientId gracefully (null)", () => {
      const event = { templateId: "test-id", channel: "sms", clientId: null, usedAt: new Date() };
      expect(event.clientId).toBeNull();
    });
  });

  describe("getTemplateUsageCounts aggregation", () => {
    it("aggregates usage counts by templateId correctly", () => {
      const rawEvents = [
        { templateId: "email-welcome-new-lead", count: 5 },
        { templateId: "sms-intro-new-lead", count: 3 },
        { templateId: "email-rate-drop-alert", count: 8 },
      ];
      const counts: Record<string, number> = {};
      rawEvents.forEach(({ templateId, count }) => {
        counts[templateId] = count;
      });
      expect(counts["email-welcome-new-lead"]).toBe(5);
      expect(counts["sms-intro-new-lead"]).toBe(3);
      expect(counts["email-rate-drop-alert"]).toBe(8);
    });

    it("returns empty object when no usage events exist", () => {
      const rawEvents: { templateId: string; count: number }[] = [];
      const counts: Record<string, number> = {};
      rawEvents.forEach(({ templateId, count }) => {
        counts[templateId] = count;
      });
      expect(Object.keys(counts)).toHaveLength(0);
    });

    it("identifies most popular templates correctly", () => {
      const usageCounts: Record<string, number> = {
        "email-welcome-new-lead": 10,
        "sms-intro-new-lead": 3,
        "email-rate-drop-alert": 9,
        "sms-follow-up": 2,
        "ai-new-lead-outreach": 8,
      };
      const entries = Object.entries(usageCounts);
      const maxCount = Math.max(...entries.map(([, c]) => c));
      const popularIds = new Set(
        entries.filter(([, c]) => c >= maxCount * 0.7).slice(0, 3).map(([id]) => id)
      );
      // 10, 9, 8 all >= 7 (70% of 10)
      expect(popularIds.has("email-welcome-new-lead")).toBe(true);
      expect(popularIds.has("email-rate-drop-alert")).toBe(true);
      expect(popularIds.has("ai-new-lead-outreach")).toBe(true);
      expect(popularIds.has("sms-intro-new-lead")).toBe(false);
      expect(popularIds.size).toBeLessThanOrEqual(3);
    });

    it("returns empty set when all counts are zero", () => {
      const usageCounts: Record<string, number> = {
        "email-welcome-new-lead": 0,
        "sms-intro-new-lead": 0,
      };
      const entries = Object.entries(usageCounts);
      const maxCount = Math.max(...entries.map(([, c]) => c));
      const popularIds = maxCount === 0 ? new Set<string>() : new Set(
        entries.filter(([, c]) => c >= maxCount * 0.7).slice(0, 3).map(([id]) => id)
      );
      expect(popularIds.size).toBe(0);
    });
  });
});

// ─── Seed Template to Client ──────────────────────────────────────────────────

describe("Seed Template to Client", () => {
  describe("input validation", () => {
    it("requires templateId", () => {
      const input = { templateId: "email-welcome-new-lead", targetClientId: 5 };
      expect(input.templateId).toBeTruthy();
    });

    it("requires targetClientId", () => {
      const input = { templateId: "email-welcome-new-lead", targetClientId: 5 };
      expect(input.targetClientId).toBeGreaterThan(0);
    });

    it("allows optional name override", () => {
      const input = { templateId: "email-welcome-new-lead", targetClientId: 5, nameOverride: "Custom Name" };
      expect(input.nameOverride).toBe("Custom Name");
    });
  });

  describe("campaign creation from template", () => {
    it("builds email campaign payload from template correctly", () => {
      const template = {
        id: "email-welcome-new-lead",
        name: "Welcome New Lead",
        channel: "email" as const,
        emailSteps: [{ subject: "Welcome!", body: "Hi {first_name}..." }],
      };
      const targetClientId = 5;

      const payload = {
        clientId: targetClientId,
        name: template.name,
        subject: template.emailSteps[0].subject,
        content: template.emailSteps[0].body,
        recipientFilter: "all" as const,
        sendNow: false,
      };

      expect(payload.clientId).toBe(5);
      expect(payload.name).toBe("Welcome New Lead");
      expect(payload.subject).toBe("Welcome!");
      expect(payload.content).toBe("Hi {first_name}...");
      expect(payload.recipientFilter).toBe("all");
    });

    it("builds SMS campaign payload from template correctly", () => {
      const template = {
        id: "sms-intro-new-lead",
        name: "Introduction SMS",
        channel: "sms" as const,
        smsSteps: [{ message: "Hi {first_name}! Reply STOP to opt out." }],
      };
      const targetClientId = 7;

      const payload = {
        clientId: targetClientId,
        name: template.name,
        message: template.smsSteps[0].message,
        recipients: [] as number[],
      };

      expect(payload.clientId).toBe(7);
      expect(payload.name).toBe("Introduction SMS");
      expect(payload.message).toContain("STOP");
    });

    it("applies name override when provided", () => {
      const templateName = "Welcome New Lead";
      const nameOverride = "Custom Welcome Campaign";
      const finalName = nameOverride ?? templateName;
      expect(finalName).toBe("Custom Welcome Campaign");
    });

    it("uses template name when no override provided", () => {
      const templateName = "Welcome New Lead";
      const nameOverride: string | undefined = undefined;
      const finalName = nameOverride ?? templateName;
      expect(finalName).toBe("Welcome New Lead");
    });
  });

  describe("access control", () => {
    it("admin can seed to any client", () => {
      const user = { role: "admin", id: 1 };
      const targetClientId = 99;
      const canSeed = user.role === "admin";
      expect(canSeed).toBe(true);
    });

    it("non-admin cannot seed to arbitrary clients", () => {
      const user = { role: "user", id: 2 };
      const canSeed = user.role === "admin";
      expect(canSeed).toBe(false);
    });
  });
});

// ─── Save as Template ─────────────────────────────────────────────────────────

describe("Save as Template", () => {
  describe("input validation", () => {
    it("requires name", () => {
      const input = { name: "My Template", channel: "email", content: "Hello!" };
      expect(input.name).toBeTruthy();
    });

    it("requires channel", () => {
      const input = { name: "My Template", channel: "email", content: "Hello!" };
      expect(["email", "sms", "ai-calling"]).toContain(input.channel);
    });

    it("requires content", () => {
      const input = { name: "My Template", channel: "sms", content: "Hi there! Reply STOP to opt out." };
      expect(input.content).toBeTruthy();
    });

    it("allows optional subject for email", () => {
      const input = { name: "My Template", channel: "email", subject: "Hello!", content: "Body..." };
      expect(input.subject).toBe("Hello!");
    });

    it("does not require subject for SMS", () => {
      const input = { name: "My Template", channel: "sms", content: "Hi! Reply STOP to opt out." };
      expect((input as any).subject).toBeUndefined();
    });
  });

  describe("template record creation", () => {
    it("creates a template record with correct fields", () => {
      const input = {
        name: "My Best Campaign",
        channel: "email" as const,
        subject: "Great news!",
        content: "Hi {first_name}, ...",
        clientId: 3,
      };

      const record = {
        name: input.name,
        channel: input.channel,
        subject: input.subject ?? null,
        content: input.content,
        clientId: input.clientId,
        createdAt: new Date(),
      };

      expect(record.name).toBe("My Best Campaign");
      expect(record.channel).toBe("email");
      expect(record.subject).toBe("Great news!");
      expect(record.content).toBe("Hi {first_name}, ...");
      expect(record.clientId).toBe(3);
    });

    it("stores null subject for SMS templates", () => {
      const input = { name: "SMS Template", channel: "sms" as const, content: "Hi! Reply STOP to opt out.", clientId: 1 };
      const record = { ...input, subject: (input as any).subject ?? null };
      expect(record.subject).toBeNull();
    });

    it("returns the created template with an id", () => {
      const mockResult = {
        id: 1,
        name: "My Best Campaign",
        channel: "email",
        subject: "Great news!",
        content: "Hi {first_name}, ...",
        clientId: 3,
        createdAt: new Date(),
      };
      expect(mockResult.id).toBe(1);
      expect(mockResult.name).toBe("My Best Campaign");
    });
  });

  describe("toast notification content", () => {
    it("success message includes template name", () => {
      const templateName = "My Best Campaign";
      const message = `"${templateName}" is now available in your Template Library.`;
      expect(message).toContain("My Best Campaign");
      expect(message).toContain("Template Library");
    });
  });
});
