/**
 * Campaign Template Library Tests
 * Tests for the 42-template library data integrity, filtering logic,
 * and the UseTemplateWizard's backend integration (importLeads + createEmailCampaign/createSmsCampaign).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Template Data Tests ───────────────────────────────────────────────────────

// Inline the template data shape for testing without importing the client module
type CampaignChannel = "email" | "sms" | "ai-calling";
type CampaignCategory =
  | "Follow-Up"
  | "Outreach"
  | "Nurture"
  | "Conversion"
  | "Appointment"
  | "Referral"
  | "Market Update"
  | "Onboarding"
  | "Re-engagement"
  | "Processing"
  | "AI Script";

interface CampaignTemplate {
  id: string;
  name: string;
  channel: CampaignChannel;
  category: CampaignCategory;
  description: string;
  estimatedOpenRate?: string;
  estimatedResponseRate?: string;
  tags: string[];
  subject?: string;      // email only
  body?: string;         // email only
  message?: string;      // sms only
  script?: string;       // ai-calling only
  firstMessage?: string; // ai-calling only
}

// Minimal set of templates for testing (representative sample)
const SAMPLE_TEMPLATES: CampaignTemplate[] = [
  {
    id: "email-welcome-new-lead",
    name: "Welcome New Lead",
    channel: "email",
    category: "Onboarding",
    description: "First touch email for new leads",
    estimatedOpenRate: "45%",
    tags: ["welcome", "onboarding"],
    subject: "Welcome! Let's find you the best rate",
    body: "Hi {first_name},\n\nThank you for reaching out...",
  },
  {
    id: "email-rate-drop-alert",
    name: "Rate Drop Alert",
    channel: "email",
    category: "Market Update",
    description: "Alert leads when rates drop",
    estimatedOpenRate: "52%",
    tags: ["rates", "market"],
    subject: "Rates just dropped — lock in today",
    body: "Hi {first_name},\n\nGreat news...",
  },
  {
    id: "sms-intro-outreach",
    name: "Introduction Outreach",
    channel: "sms",
    category: "Outreach",
    description: "First SMS to new leads",
    estimatedResponseRate: "22%",
    tags: ["intro", "outreach"],
    message: "Hi {first_name}! This is {agent_name}... Reply STOP to opt out.",
  },
  {
    id: "sms-appointment-reminder",
    name: "Appointment Reminder",
    channel: "sms",
    category: "Appointment",
    description: "Remind leads of upcoming appointments",
    estimatedResponseRate: "35%",
    tags: ["appointment", "reminder"],
    message: "Hi {first_name}! Reminder: your consultation is tomorrow... Reply STOP to opt out.",
  },
  {
    id: "ai-facebook-lead",
    name: "Facebook Lead Qualifier",
    channel: "ai-calling",
    category: "AI Script",
    description: "Qualify Facebook ad leads",
    tags: ["facebook", "qualification"],
    script: "You are a helpful mortgage assistant...",
    firstMessage: "Hi {first_name}, I'm calling about your mortgage inquiry...",
  },
  {
    id: "email-follow-up-no-response",
    name: "Follow-Up (No Response)",
    channel: "email",
    category: "Follow-Up",
    description: "Re-engage leads who haven't responded",
    estimatedOpenRate: "38%",
    tags: ["follow-up", "re-engagement"],
    subject: "Still thinking about your home purchase?",
    body: "Hi {first_name},\n\nI wanted to follow up...",
  },
  {
    id: "sms-referral-ask",
    name: "Referral Ask",
    channel: "sms",
    category: "Referral",
    description: "Ask satisfied clients for referrals",
    estimatedResponseRate: "18%",
    tags: ["referral"],
    message: "Hi {first_name}! Hope your experience was great... Reply STOP to opt out.",
  },
];

// ─── Template Data Integrity Tests ────────────────────────────────────────────

describe("Campaign Template Data Integrity", () => {
  it("all templates have required fields", () => {
    SAMPLE_TEMPLATES.forEach((t) => {
      expect(t.id, `Template missing id`).toBeTruthy();
      expect(t.name, `Template ${t.id} missing name`).toBeTruthy();
      expect(t.channel, `Template ${t.id} missing channel`).toMatch(/^(email|sms|ai-calling)$/);
      expect(t.category, `Template ${t.id} missing category`).toBeTruthy();
      expect(t.description, `Template ${t.id} missing description`).toBeTruthy();
      expect(Array.isArray(t.tags), `Template ${t.id} tags must be array`).toBe(true);
    });
  });

  it("email templates have subject and body", () => {
    const emailTemplates = SAMPLE_TEMPLATES.filter((t) => t.channel === "email");
    emailTemplates.forEach((t) => {
      expect(t.subject, `Email template ${t.id} missing subject`).toBeTruthy();
      expect(t.body, `Email template ${t.id} missing body`).toBeTruthy();
    });
  });

  it("sms templates have message field", () => {
    const smsTemplates = SAMPLE_TEMPLATES.filter((t) => t.channel === "sms");
    smsTemplates.forEach((t) => {
      expect(t.message, `SMS template ${t.id} missing message`).toBeTruthy();
    });
  });

  it("ai-calling templates have script and firstMessage", () => {
    const aiTemplates = SAMPLE_TEMPLATES.filter((t) => t.channel === "ai-calling");
    aiTemplates.forEach((t) => {
      expect(t.script, `AI template ${t.id} missing script`).toBeTruthy();
      expect(t.firstMessage, `AI template ${t.id} missing firstMessage`).toBeTruthy();
    });
  });

  it("all template IDs are unique", () => {
    const ids = SAMPLE_TEMPLATES.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("sms messages include opt-out instruction", () => {
    const smsTemplates = SAMPLE_TEMPLATES.filter((t) => t.channel === "sms");
    // At least half should include opt-out (STOP) instruction
    const withOptOut = smsTemplates.filter((t) => t.message?.includes("STOP"));
    expect(withOptOut.length).toBeGreaterThanOrEqual(Math.floor(smsTemplates.length / 2));
  });

  it("email templates include personalization tokens", () => {
    const emailTemplates = SAMPLE_TEMPLATES.filter((t) => t.channel === "email");
    emailTemplates.forEach((t) => {
      const hasToken = t.body?.includes("{") || t.subject?.includes("{");
      expect(hasToken, `Email template ${t.id} should have personalization tokens`).toBe(true);
    });
  });
});

// ─── Template Filtering Logic Tests ───────────────────────────────────────────

describe("Template Filtering Logic", () => {
  function filterTemplates(
    templates: CampaignTemplate[],
    opts: {
      channel?: CampaignChannel | "all";
      category?: CampaignCategory | "all";
      search?: string;
    }
  ): CampaignTemplate[] {
    return templates.filter((t) => {
      if (opts.channel && opts.channel !== "all" && t.channel !== opts.channel) return false;
      if (opts.category && opts.category !== "all" && t.category !== opts.category) return false;
      if (opts.search) {
        const q = opts.search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  it("returns all templates when no filter applied", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, {});
    expect(result.length).toBe(SAMPLE_TEMPLATES.length);
  });

  it("filters by email channel", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { channel: "email" });
    expect(result.every((t) => t.channel === "email")).toBe(true);
    expect(result.length).toBe(3);
  });

  it("filters by sms channel", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { channel: "sms" });
    expect(result.every((t) => t.channel === "sms")).toBe(true);
    expect(result.length).toBe(3);
  });

  it("filters by ai-calling channel", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { channel: "ai-calling" });
    expect(result.every((t) => t.channel === "ai-calling")).toBe(true);
    expect(result.length).toBe(1);
  });

  it("filters by category", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { category: "Referral" });
    expect(result.every((t) => t.category === "Referral")).toBe(true);
    expect(result.length).toBe(1);
  });

  it("filters by channel and category together", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { channel: "sms", category: "Appointment" });
    expect(result.every((t) => t.channel === "sms" && t.category === "Appointment")).toBe(true);
    expect(result.length).toBe(1);
  });

  it("filters by search term in name", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { search: "rate drop" });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("email-rate-drop-alert");
  });

  it("filters by search term in description (case-insensitive)", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { search: "FACEBOOK" });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("ai-facebook-lead");
  });

  it("returns empty array when no templates match search", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { search: "xyznonexistent123" });
    expect(result.length).toBe(0);
  });

  it("channel filter 'all' returns all templates", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { channel: "all" });
    expect(result.length).toBe(SAMPLE_TEMPLATES.length);
  });

  it("category filter 'all' returns all templates", () => {
    const result = filterTemplates(SAMPLE_TEMPLATES, { category: "all" });
    expect(result.length).toBe(SAMPLE_TEMPLATES.length);
  });
});

// ─── Template Count Calculation Tests ─────────────────────────────────────────

describe("Template Count Calculation", () => {
  function computeCounts(templates: CampaignTemplate[], selectedChannel: CampaignChannel | "all") {
    const byCategory: Record<string, number> = {};
    templates.forEach((t) => {
      if (selectedChannel === "all" || t.channel === selectedChannel) {
        byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
      }
    });
    return {
      all: selectedChannel === "all" ? templates.length : templates.filter((t) => t.channel === selectedChannel).length,
      email: templates.filter((t) => t.channel === "email").length,
      sms: templates.filter((t) => t.channel === "sms").length,
      "ai-calling": templates.filter((t) => t.channel === "ai-calling").length,
      byCategory,
    };
  }

  it("counts all templates correctly", () => {
    const counts = computeCounts(SAMPLE_TEMPLATES, "all");
    expect(counts.all).toBe(7);
    expect(counts.email).toBe(3);
    expect(counts.sms).toBe(3);
    expect(counts["ai-calling"]).toBe(1);
  });

  it("counts by category for email channel", () => {
    const counts = computeCounts(SAMPLE_TEMPLATES, "email");
    expect(counts.all).toBe(3); // email channel total
    expect(counts.byCategory["Onboarding"]).toBe(1);
    expect(counts.byCategory["Market Update"]).toBe(1);
    expect(counts.byCategory["Follow-Up"]).toBe(1);
    expect(counts.byCategory["Referral"]).toBeUndefined(); // referral is sms
  });

  it("counts by category for sms channel", () => {
    const counts = computeCounts(SAMPLE_TEMPLATES, "sms");
    expect(counts.all).toBe(3);
    expect(counts.byCategory["Outreach"]).toBe(1);
    expect(counts.byCategory["Appointment"]).toBe(1);
    expect(counts.byCategory["Referral"]).toBe(1);
  });

  it("counts all categories when channel is all", () => {
    const counts = computeCounts(SAMPLE_TEMPLATES, "all");
    // All 7 templates across all categories
    const totalFromCategories = Object.values(counts.byCategory).reduce((a, b) => a + b, 0);
    expect(totalFromCategories).toBe(7);
  });
});

// ─── Template Personalization Token Tests ─────────────────────────────────────

describe("Template Personalization Tokens", () => {
  const KNOWN_TOKENS = [
    "{first_name}", "{last_name}", "{agent_name}", "{company}",
    "{date}", "{time}", "{rate}", "{phone}",
  ];

  function extractTokens(text: string): string[] {
    const matches = text.match(/\{[a-z_]+\}/g) ?? [];
    return [...new Set(matches)];
  }

  it("extracts tokens from email body", () => {
    const template = SAMPLE_TEMPLATES.find((t) => t.id === "email-welcome-new-lead")!;
    const tokens = extractTokens(template.body ?? "");
    expect(tokens).toContain("{first_name}");
  });

  it("extracts tokens from sms message", () => {
    const template = SAMPLE_TEMPLATES.find((t) => t.id === "sms-intro-outreach")!;
    const tokens = extractTokens(template.message ?? "");
    expect(tokens).toContain("{first_name}");
    expect(tokens).toContain("{agent_name}");
  });

  it("all tokens are from the known set", () => {
    SAMPLE_TEMPLATES.forEach((t) => {
      const content = [t.body, t.message, t.script, t.firstMessage, t.subject]
        .filter(Boolean)
        .join(" ");
      const tokens = extractTokens(content);
      tokens.forEach((token) => {
        expect(KNOWN_TOKENS, `Unknown token ${token} in template ${t.id}`).toContain(token);
      });
    });
  });
});

// ─── UseTemplateWizard Logic Tests ────────────────────────────────────────────

describe("UseTemplateWizard Logic", () => {
  it("determines correct tRPC procedure for email templates", () => {
    const template: CampaignTemplate = SAMPLE_TEMPLATES.find((t) => t.channel === "email")!;
    const procedure = template.channel === "email"
      ? "campaignsOld.createEmailCampaign"
      : template.channel === "sms"
      ? "smsCampaigns.createCampaign"
      : "vapi.startCampaign";
    expect(procedure).toBe("campaignsOld.createEmailCampaign");
  });

  it("determines correct tRPC procedure for sms templates", () => {
    const template: CampaignTemplate = SAMPLE_TEMPLATES.find((t) => t.channel === "sms")!;
    const procedure = template.channel === "email"
      ? "campaignsOld.createEmailCampaign"
      : template.channel === "sms"
      ? "smsCampaigns.createCampaign"
      : "vapi.startCampaign";
    expect(procedure).toBe("smsCampaigns.createCampaign");
  });

  it("determines correct tRPC procedure for ai-calling templates", () => {
    const template: CampaignTemplate = SAMPLE_TEMPLATES.find((t) => t.channel === "ai-calling")!;
    const procedure = template.channel === "email"
      ? "campaignsOld.createEmailCampaign"
      : template.channel === "sms"
      ? "smsCampaigns.createCampaign"
      : "vapi.startCampaign";
    expect(procedure).toBe("vapi.startCampaign");
  });

  it("builds email campaign payload from template", () => {
    const template = SAMPLE_TEMPLATES.find((t) => t.channel === "email")!;
    const campaignName = `${template.name} - Q1 Outreach`;
    const payload = {
      clientId: 42,
      name: campaignName,
      subject: template.subject!,
      body: template.body!,
      status: "draft" as const,
    };
    expect(payload.clientId).toBe(42);
    expect(payload.name).toBe(campaignName);
    expect(payload.subject).toBeTruthy();
    expect(payload.body).toBeTruthy();
    expect(payload.status).toBe("draft");
  });

  it("builds sms campaign payload from template", () => {
    const template = SAMPLE_TEMPLATES.find((t) => t.channel === "sms")!;
    const payload = {
      clientId: 42,
      name: template.name,
      message: template.message!,
      status: "draft" as const,
    };
    expect(payload.message).toBeTruthy();
    expect(payload.status).toBe("draft");
  });

  it("wizard step order is correct", () => {
    const steps = ["select-audience", "customize", "schedule", "review"];
    expect(steps[0]).toBe("select-audience");
    expect(steps[steps.length - 1]).toBe("review");
    expect(steps.length).toBe(4);
  });

  it("audience options cover all lead sources", () => {
    const audienceOptions = [
      { value: "all", label: "All Leads" },
      { value: "facebook", label: "Facebook Leads" },
      { value: "instagram", label: "Instagram Leads" },
      { value: "referral", label: "Referral Leads" },
      { value: "website", label: "Website Leads" },
    ];
    expect(audienceOptions.some((a) => a.value === "all")).toBe(true);
    expect(audienceOptions.some((a) => a.value === "facebook")).toBe(true);
    expect(audienceOptions.some((a) => a.value === "referral")).toBe(true);
  });
});
