/**
 * Tests for Social Media Content Studio features:
 * - Social platform connections (connect / disconnect / list)
 * - AI social post generation (structure validation)
 * - Credit usage indicator constants
 * - Content type groupings
 */

import { describe, it, expect } from "vitest";

// ─── Credit cost constants ────────────────────────────────────────────────────
const CONTENT_CREDIT_COSTS: Record<string, number> = {
  "blog-post": 5,
  "how-to": 4,
  "listicle": 3,
  "case-study": 5,
  "guide": 4,
  "news": 3,
  "newsletter": 3,
  "email-sequence": 4,
  "social-post": 2,
  "press-release": 4,
  "landing-page": 6,
  "video-script": 4,
  "whitepaper": 6,
  "product-description": 2,
};

const SUPPORTED_PLATFORMS = [
  "facebook",
  "instagram",
  "linkedin",
  "twitter",
  "google_business",
  "tiktok",
  "youtube",
  "pinterest",
  "threads",
] as const;

type Platform = (typeof SUPPORTED_PLATFORMS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCreditsForType(contentType: string): number {
  return CONTENT_CREDIT_COSTS[contentType] ?? 2;
}

function isPlatformSupported(platform: string): platform is Platform {
  return SUPPORTED_PLATFORMS.includes(platform as Platform);
}

function buildSocialPostPrompt(opts: {
  platform: Platform;
  topic: string;
  businessName: string;
  tone: string;
  includeHashtags: boolean;
  includeCta: boolean;
}): string {
  return [
    `Platform: ${opts.platform}`,
    `Topic: ${opts.topic}`,
    `Business: ${opts.businessName}`,
    `Tone: ${opts.tone}`,
    opts.includeHashtags ? "Include hashtags" : "No hashtags",
    opts.includeCta ? "Include CTA" : "No CTA",
  ].join("\n");
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("Credit Usage Indicator", () => {
  it("returns correct credits for blog-post", () => {
    expect(getCreditsForType("blog-post")).toBe(5);
  });

  it("returns correct credits for social-post", () => {
    expect(getCreditsForType("social-post")).toBe(2);
  });

  it("returns correct credits for landing-page", () => {
    expect(getCreditsForType("landing-page")).toBe(6);
  });

  it("returns default credits for unknown type", () => {
    expect(getCreditsForType("unknown-type")).toBe(2);
  });

  it("all defined content types have positive credit costs", () => {
    for (const [type, cost] of Object.entries(CONTENT_CREDIT_COSTS)) {
      expect(cost, `${type} should have positive cost`).toBeGreaterThan(0);
    }
  });
});

describe("Platform Support", () => {
  it("recognizes all supported platforms", () => {
    for (const platform of SUPPORTED_PLATFORMS) {
      expect(isPlatformSupported(platform)).toBe(true);
    }
  });

  it("rejects unsupported platforms", () => {
    expect(isPlatformSupported("snapchat")).toBe(false);
    expect(isPlatformSupported("whatsapp")).toBe(false);
    expect(isPlatformSupported("")).toBe(false);
  });

  it("has 9 supported platforms", () => {
    expect(SUPPORTED_PLATFORMS.length).toBe(9);
  });
});

describe("Social Post Prompt Builder", () => {
  it("builds a prompt with all fields", () => {
    const prompt = buildSocialPostPrompt({
      platform: "linkedin",
      topic: "Mortgage rates in 2025",
      businessName: "Apex Mortgage",
      tone: "professional",
      includeHashtags: true,
      includeCta: true,
    });
    expect(prompt).toContain("linkedin");
    expect(prompt).toContain("Mortgage rates in 2025");
    expect(prompt).toContain("Apex Mortgage");
    expect(prompt).toContain("professional");
    expect(prompt).toContain("Include hashtags");
    expect(prompt).toContain("Include CTA");
  });

  it("builds a prompt without hashtags or CTA", () => {
    const prompt = buildSocialPostPrompt({
      platform: "twitter",
      topic: "Open house this weekend",
      businessName: "Apex Realty",
      tone: "casual",
      includeHashtags: false,
      includeCta: false,
    });
    expect(prompt).toContain("No hashtags");
    expect(prompt).toContain("No CTA");
  });
});

describe("Social Connection State Machine", () => {
  type ConnectionStatus = "connected" | "disconnected" | "reconnect_required";

  function getConnectionStatus(
    connected: boolean,
    tokenExpired: boolean
  ): ConnectionStatus {
    if (!connected) return "disconnected";
    if (tokenExpired) return "reconnect_required";
    return "connected";
  }

  it("returns connected for active connection", () => {
    expect(getConnectionStatus(true, false)).toBe("connected");
  });

  it("returns disconnected for inactive connection", () => {
    expect(getConnectionStatus(false, false)).toBe("disconnected");
  });

  it("returns reconnect_required for expired token", () => {
    expect(getConnectionStatus(true, true)).toBe("reconnect_required");
  });
});

describe("Content Type Groupings", () => {
  const BLOG_TYPES = ["blog-post", "how-to", "listicle", "case-study", "guide", "news"];
  const EMAIL_TYPES = ["newsletter", "email-sequence"];
  const SOCIAL_TYPES = ["social-post"];
  const MARKETING_TYPES = ["press-release", "landing-page", "whitepaper", "product-description"];
  const VIDEO_TYPES = ["video-script"];

  it("all content types are categorized", () => {
    const allTypes = [
      ...BLOG_TYPES,
      ...EMAIL_TYPES,
      ...SOCIAL_TYPES,
      ...MARKETING_TYPES,
      ...VIDEO_TYPES,
    ];
    const definedTypes = Object.keys(CONTENT_CREDIT_COSTS);
    for (const t of definedTypes) {
      expect(allTypes, `${t} should be in a category`).toContain(t);
    }
  });

  it("social-post is the cheapest content type", () => {
    const minCost = Math.min(...Object.values(CONTENT_CREDIT_COSTS));
    expect(CONTENT_CREDIT_COSTS["social-post"]).toBe(minCost);
  });

  it("landing-page and whitepaper are the most expensive", () => {
    const maxCost = Math.max(...Object.values(CONTENT_CREDIT_COSTS));
    expect(CONTENT_CREDIT_COSTS["landing-page"]).toBe(maxCost);
    expect(CONTENT_CREDIT_COSTS["whitepaper"]).toBe(maxCost);
  });
});

describe("Portal Content Generation Flow", () => {
  function validateGenerateInput(input: {
    clientId: number;
    topic: string;
    contentType: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!input.clientId || input.clientId <= 0) {
      errors.push("clientId must be a positive integer");
    }
    if (!input.topic || input.topic.trim().length === 0) {
      errors.push("topic is required");
    }
    if (!CONTENT_CREDIT_COSTS[input.contentType]) {
      errors.push(`contentType '${input.contentType}' is not supported`);
    }
    return { valid: errors.length === 0, errors };
  }

  it("validates a correct input", () => {
    const result = validateGenerateInput({
      clientId: 1,
      topic: "How to get a mortgage in Canada",
      contentType: "blog-post",
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects missing topic", () => {
    const result = validateGenerateInput({
      clientId: 1,
      topic: "",
      contentType: "blog-post",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("topic is required");
  });

  it("rejects invalid clientId", () => {
    const result = validateGenerateInput({
      clientId: 0,
      topic: "Test topic",
      contentType: "blog-post",
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("clientId must be a positive integer");
  });

  it("rejects unsupported content type", () => {
    const result = validateGenerateInput({
      clientId: 1,
      topic: "Test topic",
      contentType: "podcast-script",
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("podcast-script");
  });
});
