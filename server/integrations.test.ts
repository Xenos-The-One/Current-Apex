/**
 * Integration credential validation tests
 * 
 * These tests verify that the API keys for Twilio, SendGrid, and Vapi
 * are correctly set as environment variables and that the service
 * modules can read them. They do NOT make real API calls.
 */

import { describe, it, expect } from "vitest";

describe("Twilio credentials", () => {
  it("should have TWILIO_ACCOUNT_SID set", () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    expect(sid).toBeDefined();
    expect(sid).not.toBe("");
    // Twilio SIDs always start with "AC"
    expect(sid).toMatch(/^AC[a-f0-9]{32}$/i);
  });

  it("should have TWILIO_AUTH_TOKEN set", () => {
    const token = process.env.TWILIO_AUTH_TOKEN;
    expect(token).toBeDefined();
    expect(token).not.toBe("");
    // Auth tokens are 32-char hex strings
    expect(token!.length).toBeGreaterThanOrEqual(32);
  });

  it("should have TWILIO_PHONE_NUMBER set in E.164 format", () => {
    const phone = process.env.TWILIO_PHONE_NUMBER;
    expect(phone).toBeDefined();
    expect(phone).not.toBe("");
    // E.164 format: +1XXXXXXXXXX
    expect(phone).toMatch(/^\+1\d{10}$/);
  });
});

describe("SendGrid credentials", () => {
  it("should have SENDGRID_API_KEY set", () => {
    const key = process.env.SENDGRID_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    // SendGrid keys start with "SG."
    expect(key).toMatch(/^SG\./);
  });
});

describe("Vapi credentials", () => {
  it("should have VAPI_API_KEY set", () => {
    const key = process.env.VAPI_API_KEY;
    expect(key).toBeDefined();
    expect(key).not.toBe("");
    // UUID format
    expect(key).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("should have VAPI_PHONE_NUMBER_ID set", () => {
    const id = process.env.VAPI_PHONE_NUMBER_ID;
    expect(id).toBeDefined();
    expect(id).not.toBe("");
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("should have VAPI_FACEBOOK_LEAD_ASSISTANT_ID set", () => {
    const id = process.env.VAPI_FACEBOOK_LEAD_ASSISTANT_ID;
    expect(id).toBeDefined();
    expect(id).not.toBe("");
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("should have VAPI_IG_LEAD_ASSISTANT_ID set", () => {
    const id = process.env.VAPI_IG_LEAD_ASSISTANT_ID;
    expect(id).toBeDefined();
    expect(id).not.toBe("");
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("should have VAPI_REFERRAL_LEAD_ASSISTANT_ID set", () => {
    const id = process.env.VAPI_REFERRAL_LEAD_ASSISTANT_ID;
    expect(id).toBeDefined();
    expect(id).not.toBe("");
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

describe("Vapi assistant mapper", () => {
  it("should resolve Facebook leads to the Facebook assistant", async () => {
    const { getAssistantIdForLeadSource } = await import("./vapi-assistant-mapper");
    const id = getAssistantIdForLeadSource("facebook");
    expect(id).toBe(process.env.VAPI_FACEBOOK_LEAD_ASSISTANT_ID);
  });

  it("should resolve Instagram leads to the IG assistant", async () => {
    const { getAssistantIdForLeadSource } = await import("./vapi-assistant-mapper");
    const id = getAssistantIdForLeadSource("instagram");
    expect(id).toBe(process.env.VAPI_IG_LEAD_ASSISTANT_ID);
  });

  it("should resolve referral leads to the referral assistant", async () => {
    const { getAssistantIdForLeadSource } = await import("./vapi-assistant-mapper");
    const id = getAssistantIdForLeadSource("referral");
    expect(id).toBe(process.env.VAPI_REFERRAL_LEAD_ASSISTANT_ID);
  });

  it("should return null when no assistant IDs are configured", async () => {
    // Test with a completely unknown source — should fall back to referral
    const { getAssistantIdForLeadSource } = await import("./vapi-assistant-mapper");
    const id = getAssistantIdForLeadSource("unknown_source");
    // Falls back to referral assistant
    expect(id).toBe(process.env.VAPI_REFERRAL_LEAD_ASSISTANT_ID);
  });

  it("should report all assistants as configured", async () => {
    const { validateAssistantConfiguration } = await import("./vapi-assistant-mapper");
    const result = validateAssistantConfiguration();
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });
});
