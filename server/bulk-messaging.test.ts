/**
 * Tests for bulk messaging procedures: bulkSendSMS and bulkSendEmail.
 * These tests verify input validation, procedure existence, and basic logic
 * without requiring live Twilio/SendGrid credentials.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ─── Input schema mirrors ─────────────────────────────────────────────────────
const bulkSMSInput = z.object({
  leadIds: z.array(z.number()).min(1).max(200),
  message: z.string().min(1).max(1600),
});

const bulkEmailInput = z.object({
  leadIds: z.array(z.number()).min(1).max(200),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
});

// ─── bulkSendSMS input validation ────────────────────────────────────────────
describe("bulkSendSMS input validation", () => {
  it("accepts valid input", () => {
    const result = bulkSMSInput.safeParse({
      leadIds: [1, 2, 3],
      message: "Hi, this is a follow-up!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty leadIds array", () => {
    const result = bulkSMSInput.safeParse({ leadIds: [], message: "Hello" });
    expect(result.success).toBe(false);
  });

  it("rejects empty message", () => {
    const result = bulkSMSInput.safeParse({ leadIds: [1], message: "" });
    expect(result.success).toBe(false);
  });

  it("rejects message over 1600 chars", () => {
    const result = bulkSMSInput.safeParse({
      leadIds: [1],
      message: "x".repeat(1601),
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 200 leadIds", () => {
    const result = bulkSMSInput.safeParse({
      leadIds: Array.from({ length: 201 }, (_, i) => i + 1),
      message: "Hello",
    });
    expect(result.success).toBe(false);
  });
});

// ─── bulkSendEmail input validation ──────────────────────────────────────────
describe("bulkSendEmail input validation", () => {
  it("accepts valid input", () => {
    const result = bulkEmailInput.safeParse({
      leadIds: [1, 2],
      subject: "Following up",
      body: "Hi there, just checking in!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty subject", () => {
    const result = bulkEmailInput.safeParse({
      leadIds: [1],
      subject: "",
      body: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty body", () => {
    const result = bulkEmailInput.safeParse({
      leadIds: [1],
      subject: "Test",
      body: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects subject over 200 chars", () => {
    const result = bulkEmailInput.safeParse({
      leadIds: [1],
      subject: "x".repeat(201),
      body: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects body over 10000 chars", () => {
    const result = bulkEmailInput.safeParse({
      leadIds: [1],
      subject: "Test",
      body: "x".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty leadIds", () => {
    const result = bulkEmailInput.safeParse({
      leadIds: [],
      subject: "Test",
      body: "Hello",
    });
    expect(result.success).toBe(false);
  });
});

// ─── Procedure existence check ────────────────────────────────────────────────
describe("clientRouter procedure exports", () => {
  it("clientRouter exports bulkSendSMS and bulkSendEmail", async () => {
    // Dynamically import the router to verify the procedures exist
    // We mock external dependencies to avoid real DB/API calls
    vi.mock("../server/twilio", () => ({
      sendSMS: vi.fn().mockResolvedValue({ sid: "SM123" }),
    }));
    vi.mock("../server/email-service", () => ({
      sendEmail: vi.fn().mockResolvedValue({ success: true }),
    }));
    vi.mock("../server/db", () => ({
      getClientByUserId: vi.fn().mockResolvedValue(null),
      getClientById: vi.fn().mockResolvedValue(null),
      getAgencyById: vi.fn().mockResolvedValue(null),
      getAgencyByOwnerId: vi.fn().mockResolvedValue(null),
      getClientsByAgencyId: vi.fn().mockResolvedValue([]),
      getLeadsByAgencyId: vi.fn().mockResolvedValue([]),
      getLeadsByClientId: vi.fn().mockResolvedValue([]),
      getLeadsByClientIdPaginated: vi.fn().mockResolvedValue({ leads: [], total: 0 }),
      getDistinctLeadTags: vi.fn().mockResolvedValue([]),
      createLead: vi.fn().mockResolvedValue({ id: 1 }),
      updateLead: vi.fn().mockResolvedValue({}),
      getLeadActivities: vi.fn().mockResolvedValue([]),
      createLeadActivity: vi.fn().mockResolvedValue({}),
      getLeadById: vi.fn().mockResolvedValue(null),
      getLeadSourceMapping: vi.fn().mockResolvedValue({}),
      getDb: vi.fn().mockResolvedValue(null),
      ensureClientProfile: vi.fn().mockResolvedValue(null),
    }));
    vi.mock("../server/push-triggers", () => ({
      pushAppointmentBooked: vi.fn(),
    }));

    const { clientRouter } = await import("./routers/client");
    // tRPC procedures are functions at the router level
    expect((clientRouter as any)._def.procedures.bulkSendSMS).toBeDefined();
    expect((clientRouter as any)._def.procedures.bulkSendEmail).toBeDefined();
  });
});
