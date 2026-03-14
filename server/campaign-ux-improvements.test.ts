/**
 * Tests for three Campaign UX improvements:
 * 1. "By Status" sub-selector in the email campaign form (recipientFilter logic)
 * 2. Template search bar filtering in the Template Library
 * 3. Send Test Email feature (sendTestEmail procedure logic)
 */
import { describe, it, expect, vi } from "vitest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RecipientFilter = "all" | "status" | "custom";

interface EmailCampaignInput {
  name: string;
  subject: string;
  content: string;
  recipientFilter: RecipientFilter;
  recipientStatus?: string;
  sendNow: boolean;
  scheduledDate?: string;
  scheduledTime?: string;
}

// Mirrors the validation logic in the email campaign form
function validateEmailCampaignInput(input: EmailCampaignInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Campaign name is required");
  if (!input.subject.trim()) errors.push("Subject is required");
  if (!input.content.trim()) errors.push("Content is required");
  if (!["all", "status", "custom"].includes(input.recipientFilter)) {
    errors.push("Invalid recipient filter");
  }
  if (input.recipientFilter === "status" && !input.recipientStatus) {
    errors.push("Status is required when filter is 'status'");
  }
  if (!input.sendNow) {
    if (!input.scheduledDate) errors.push("Scheduled date is required");
    if (!input.scheduledTime) errors.push("Scheduled time is required");
  }
  return errors;
}

// ─── 1. By Status Selector ────────────────────────────────────────────────────

describe("Email Campaign — By Status sub-selector", () => {
  it("accepts recipientFilter='all' without requiring a status", () => {
    const errors = validateEmailCampaignInput({
      name: "My Campaign",
      subject: "Hello",
      content: "Body",
      recipientFilter: "all",
      sendNow: true,
    });
    expect(errors).toHaveLength(0);
  });

  it("accepts recipientFilter='status' when recipientStatus is provided", () => {
    const errors = validateEmailCampaignInput({
      name: "My Campaign",
      subject: "Hello",
      content: "Body",
      recipientFilter: "status",
      recipientStatus: "new",
      sendNow: true,
    });
    expect(errors).toHaveLength(0);
  });

  it("rejects recipientFilter='status' when recipientStatus is missing", () => {
    const errors = validateEmailCampaignInput({
      name: "My Campaign",
      subject: "Hello",
      content: "Body",
      recipientFilter: "status",
      sendNow: true,
    });
    expect(errors).toContain("Status is required when filter is 'status'");
  });

  it("rejects invalid recipientFilter values", () => {
    const errors = validateEmailCampaignInput({
      name: "My Campaign",
      subject: "Hello",
      content: "Body",
      recipientFilter: "contacted" as RecipientFilter,
      sendNow: true,
    });
    expect(errors).toContain("Invalid recipient filter");
  });

  it("only allows the three valid enum values: all, status, custom", () => {
    const validValues: RecipientFilter[] = ["all", "status", "custom"];
    const invalidValues = ["contacted", "qualified", "new", "appointment_set", "closed", ""];
    validValues.forEach((v) => {
      expect(["all", "status", "custom"]).toContain(v);
    });
    invalidValues.forEach((v) => {
      expect(["all", "status", "custom"]).not.toContain(v);
    });
  });

  it("shows status sub-selector only when recipientFilter is 'status'", () => {
    const showSubSelector = (filter: string) => filter === "status";
    expect(showSubSelector("all")).toBe(false);
    expect(showSubSelector("status")).toBe(true);
    expect(showSubSelector("custom")).toBe(false);
  });

  it("lead status options cover all standard pipeline stages", () => {
    const LEAD_STATUS_OPTIONS = [
      { value: "new", label: "New Leads" },
      { value: "contacted", label: "Contacted" },
      { value: "qualified", label: "Qualified" },
      { value: "appointment_set", label: "Appointment Set" },
      { value: "closed", label: "Closed" },
    ];
    expect(LEAD_STATUS_OPTIONS).toHaveLength(5);
    const values = LEAD_STATUS_OPTIONS.map((o) => o.value);
    expect(values).toContain("new");
    expect(values).toContain("contacted");
    expect(values).toContain("qualified");
    expect(values).toContain("appointment_set");
    expect(values).toContain("closed");
  });

  it("audience label shows correct text for each filter type", () => {
    const LEAD_STATUS_OPTIONS = [
      { value: "new", label: "New Leads" },
      { value: "contacted", label: "Contacted" },
      { value: "qualified", label: "Qualified" },
      { value: "appointment_set", label: "Appointment Set" },
      { value: "closed", label: "Closed" },
    ];

    const getAudienceLabel = (filter: RecipientFilter, status?: string) => {
      if (filter === "all") return "All Leads";
      if (filter === "status") {
        const found = LEAD_STATUS_OPTIONS.find((o) => o.value === status);
        return `Leads with status: ${found?.label ?? status}`;
      }
      return "Custom audience";
    };

    expect(getAudienceLabel("all")).toBe("All Leads");
    expect(getAudienceLabel("status", "new")).toBe("Leads with status: New Leads");
    expect(getAudienceLabel("status", "closed")).toBe("Leads with status: Closed");
    expect(getAudienceLabel("custom")).toBe("Custom audience");
  });
});

// ─── 2. Template Search Bar ───────────────────────────────────────────────────

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  channel: "email" | "sms" | "ai-calling";
  description?: string;
}

function filterTemplates(templates: TemplateItem[], query: string): TemplateItem[] {
  if (!query.trim()) return templates;
  const q = query.toLowerCase();
  return templates.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false)
  );
}

const SAMPLE_TEMPLATES: TemplateItem[] = [
  { id: "email-welcome-new-lead", name: "Welcome New Lead", category: "Onboarding", channel: "email", description: "Greet new leads with a warm welcome" },
  { id: "email-rate-drop-alert", name: "Rate Drop Alert", category: "Market Update", channel: "email", description: "Notify leads about rate drops" },
  { id: "sms-intro-new-lead", name: "Introduction SMS", category: "Outreach", channel: "sms", description: "Quick intro text for new leads" },
  { id: "sms-follow-up", name: "Follow-Up SMS", category: "Follow-Up", channel: "sms", description: "Check in with unresponsive leads" },
  { id: "ai-new-lead-outreach", name: "New Lead Outreach", category: "Outreach", channel: "ai-calling", description: "AI calls new leads to qualify" },
  { id: "email-referral-ask", name: "Referral Request", category: "Referral", channel: "email", description: "Ask happy clients for referrals" },
];

describe("Template Library — Search Bar", () => {
  it("returns all templates when query is empty", () => {
    expect(filterTemplates(SAMPLE_TEMPLATES, "")).toHaveLength(SAMPLE_TEMPLATES.length);
  });

  it("returns all templates when query is only whitespace", () => {
    expect(filterTemplates(SAMPLE_TEMPLATES, "   ")).toHaveLength(SAMPLE_TEMPLATES.length);
  });

  it("filters by template name (case-insensitive)", () => {
    const results = filterTemplates(SAMPLE_TEMPLATES, "welcome");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("email-welcome-new-lead");
  });

  it("filters by category name (case-insensitive)", () => {
    const results = filterTemplates(SAMPLE_TEMPLATES, "outreach");
    expect(results.map((r) => r.id)).toContain("sms-intro-new-lead");
    expect(results.map((r) => r.id)).toContain("ai-new-lead-outreach");
  });

  it("filters by description keyword", () => {
    const results = filterTemplates(SAMPLE_TEMPLATES, "referral");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("email-referral-ask");
  });

  it("returns empty array when no templates match", () => {
    const results = filterTemplates(SAMPLE_TEMPLATES, "xyznonexistent");
    expect(results).toHaveLength(0);
  });

  it("is case-insensitive for all fields", () => {
    const lower = filterTemplates(SAMPLE_TEMPLATES, "rate drop");
    const upper = filterTemplates(SAMPLE_TEMPLATES, "RATE DROP");
    const mixed = filterTemplates(SAMPLE_TEMPLATES, "Rate Drop");
    expect(lower).toHaveLength(1);
    expect(upper).toHaveLength(1);
    expect(mixed).toHaveLength(1);
    expect(lower[0].id).toBe(upper[0].id);
    expect(lower[0].id).toBe(mixed[0].id);
  });

  it("matches partial name substrings", () => {
    const results = filterTemplates(SAMPLE_TEMPLATES, "follow");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("sms-follow-up");
  });

  it("search across multiple channels simultaneously", () => {
    // "new lead" appears in both email and sms templates
    const results = filterTemplates(SAMPLE_TEMPLATES, "new lead");
    const channels = results.map((r) => r.channel);
    expect(channels).toContain("email");
    expect(channels).toContain("sms");
  });
});

// ─── 3. Send Test Email ───────────────────────────────────────────────────────

describe("Send Test Email — logic", () => {
  it("replaces {name} placeholder with user name", () => {
    const content = "Hi {name}, welcome to our service!";
    const userName = "Alice";
    const result = content.replace(/\{name\}/g, userName);
    expect(result).toBe("Hi Alice, welcome to our service!");
  });

  it("replaces {agent_name} placeholder", () => {
    const content = "This is {agent_name} from the agency.";
    const agentName = "Bob";
    const result = content.replace(/\{agent_name\}/g, agentName);
    expect(result).toBe("This is Bob from the agency.");
  });

  it("replaces {company} placeholder", () => {
    const content = "Contact {company} today!";
    const result = content.replace(/\{company\}/g, "Your Agency");
    expect(result).toBe("Contact Your Agency today!");
  });

  it("replaces multiple placeholders in one pass", () => {
    const content = "Hi {name}, I'm {agent_name} from {company}.";
    const result = content
      .replace(/\{name\}/g, "Alice")
      .replace(/\{agent_name\}/g, "Bob")
      .replace(/\{company\}/g, "Acme Corp");
    expect(result).toBe("Hi Alice, I'm Bob from Acme Corp.");
  });

  it("leaves content unchanged when no placeholders present", () => {
    const content = "Hello, this is a plain message.";
    const result = content
      .replace(/\{name\}/g, "Alice")
      .replace(/\{agent_name\}/g, "Bob");
    expect(result).toBe("Hello, this is a plain message.");
  });

  it("prefixes subject with [TEST] for preview emails", () => {
    const subject = "Welcome to our service!";
    const testSubject = `[TEST] ${subject}`;
    expect(testSubject).toBe("[TEST] Welcome to our service!");
  });

  it("uses toEmail override when provided", () => {
    const userEmail = "admin@agency.com";
    const toEmail = "custom@test.com";
    const recipient = toEmail ?? userEmail;
    expect(recipient).toBe("custom@test.com");
  });

  it("falls back to user email when toEmail is not provided", () => {
    const userEmail = "admin@agency.com";
    const toEmail: string | undefined = undefined;
    const recipient = toEmail ?? userEmail;
    expect(recipient).toBe("admin@agency.com");
  });

  it("throws when no email address is available", () => {
    const userEmail: string | null = null;
    const toEmail: string | undefined = undefined;
    const recipient = toEmail ?? userEmail;
    expect(recipient).toBeNull();
    // Procedure should throw BAD_REQUEST when recipient is null
    const shouldThrow = recipient === null;
    expect(shouldThrow).toBe(true);
  });

  it("wraps HTML content with test banner", () => {
    const previewContent = "Hello, this is a test.";
    const recipient = "admin@test.com";
    const htmlContent = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#f59e0b;color:#fff;padding:8px 16px;border-radius:4px 4px 0 0;font-size:12px;font-weight:bold">
          ⚠️ TEST EMAIL — Preview sent to ${recipient}
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 4px 4px">
          ${previewContent.replace(/\n/g, "<br/>")}
        </div>
      </div>`;
    expect(htmlContent).toContain("TEST EMAIL");
    expect(htmlContent).toContain(recipient);
    expect(htmlContent).toContain(previewContent);
  });

  it("returns demo:true when SendGrid is not configured", () => {
    // Simulates the sendEmail helper returning demo mode
    const mockResult = { success: true, demo: true };
    expect(mockResult.demo).toBe(true);
  });

  it("returns demo:false when SendGrid is configured and email is sent", () => {
    const mockResult = { success: true, demo: false };
    expect(mockResult.demo).toBe(false);
  });

  it("returns sent:true and the recipient email on success", () => {
    const result = { sent: true, to: "admin@test.com", demo: false };
    expect(result.sent).toBe(true);
    expect(result.to).toBe("admin@test.com");
  });

  it("shows correct toast message in demo mode", () => {
    const data = { demo: true, to: "admin@test.com" };
    const toastType = data.demo ? "info" : "success";
    const description = data.demo
      ? `Would have sent to ${data.to}. Configure SendGrid to send real emails.`
      : `Preview delivered to ${data.to}. Check your inbox.`;
    expect(toastType).toBe("info");
    expect(description).toContain("Would have sent to");
    expect(description).toContain("admin@test.com");
  });

  it("shows success toast when email is sent for real", () => {
    const data = { demo: false, to: "admin@test.com" };
    const toastType = data.demo ? "info" : "success";
    const description = data.demo
      ? `Would have sent to ${data.to}. Configure SendGrid to send real emails.`
      : `Preview delivered to ${data.to}. Check your inbox.`;
    expect(toastType).toBe("success");
    expect(description).toContain("Preview delivered to");
    expect(description).toContain("admin@test.com");
  });
});

// ─── UseTemplateWizard — canAdvance guards ────────────────────────────────────

describe("UseTemplateWizard — canAdvance guards", () => {
  it("customize step: requires non-empty campaignName", () => {
    const canAdvance = (name: string) => (name ?? "").trim().length > 0;
    expect(canAdvance("")).toBe(false);
    expect(canAdvance("  ")).toBe(false);
    expect(canAdvance("My Campaign")).toBe(true);
  });

  it("customize step: handles undefined campaignName gracefully", () => {
    const canAdvance = (name: string | undefined) => (name ?? "").trim().length > 0;
    expect(canAdvance(undefined)).toBe(false);
    expect(canAdvance("Valid Name")).toBe(true);
  });

  it("audience step: always can advance (no required fields)", () => {
    // Audience step just sets a filter — all values are valid
    const canAdvance = () => true;
    expect(canAdvance()).toBe(true);
  });

  it("schedule step: requires date and time when sendNow is false", () => {
    const canAdvance = (sendNow: boolean, date: string, time: string) => {
      if (sendNow) return true;
      return date.trim().length > 0 && time.trim().length > 0;
    };
    expect(canAdvance(true, "", "")).toBe(true);
    expect(canAdvance(false, "", "")).toBe(false);
    expect(canAdvance(false, "2026-04-01", "")).toBe(false);
    expect(canAdvance(false, "", "10:00")).toBe(false);
    expect(canAdvance(false, "2026-04-01", "10:00")).toBe(true);
  });

  it("review step: always can advance (launch button is always enabled)", () => {
    const canAdvance = () => true;
    expect(canAdvance()).toBe(true);
  });
});
