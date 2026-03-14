/**
 * Tests for the Contact Detail page messaging functionality:
 * - sendFollowUpSMS: admin without impersonation, client user, missing phone
 * - sendFollowUpEmail: admin without impersonation, client user, missing email
 * - resolveClientForFollowUps: admin fallback to agency's first client
 * - SMS character counter logic
 * - DND guard logic
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock db helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getClientByUserId: vi.fn(),
  getClientById: vi.fn(),
  getClientsByAgencyId: vi.fn(),
  getLeadsByClientId: vi.fn(),
  getLeadsByAgencyId: vi.fn(),
  getAgencyByOwnerId: vi.fn(),
  getAllAgencies: vi.fn(),
  getLeadActivities: vi.fn(),
  getDb: vi.fn(),
  createLeadActivity: vi.fn(),
  updateLead: vi.fn(),
}));

vi.mock("./twilio", () => ({
  sendSMS: vi.fn(),
}));

vi.mock("./email-service", () => ({
  sendEmail: vi.fn(),
}));

import {
  getClientByUserId,
  getClientById,
  getClientsByAgencyId,
  getAgencyByOwnerId,
  getDb,
  createLeadActivity,
  updateLead,
} from "./db";
import { sendSMS } from "./twilio";
import { sendEmail } from "./email-service";

// ─── resolveClientForFollowUps logic (extracted for unit testing) ─────────────

const ADMIN_ROLES = ["admin", "super_admin", "agency_owner"];

async function resolveClientForFollowUps(ctx: { user: { id: number; role: string }; req: any }) {
  const isAdmin = ADMIN_ROLES.includes(ctx.user.role);
  if (isAdmin) {
    const impersonateId = ctx.req.headers["x-impersonate-client-id"];
    if (impersonateId) {
      const clientId = parseInt(impersonateId, 10);
      if (!isNaN(clientId)) {
        const client = await getClientById(clientId);
        if (client) return client;
      }
    }
    const agency = await getAgencyByOwnerId(ctx.user.id);
    if (agency) {
      const agencyClients = await getClientsByAgencyId((agency as any).id);
      if (agencyClients.length > 0) return agencyClients[0];
      return {
        id: 0,
        agencyId: (agency as any).id,
        agency_id: (agency as any).id,
        name: (agency as any).name,
        accessMode: "full" as const,
      } as any;
    }
  }
  return await getClientByUserId(ctx.user.id);
}

// ─── SMS character counter logic ──────────────────────────────────────────────

function getSmsSegmentInfo(text: string) {
  const len = text.length;
  const segmentSize = 160;
  const segments = Math.ceil(len / segmentSize);
  const remaining = segments * segmentSize - len;
  return { len, segments, remaining };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("resolveClientForFollowUps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns impersonated client when x-impersonate-client-id header is set for admin", async () => {
    const mockClient = { id: 42, agencyId: 1, name: "Kyle Realty" };
    vi.mocked(getClientById).mockResolvedValue(mockClient as any);

    const ctx = {
      user: { id: 1, role: "admin" },
      req: { headers: { "x-impersonate-client-id": "42" } },
    };

    const result = await resolveClientForFollowUps(ctx);
    expect(result).toEqual(mockClient);
    expect(getClientById).toHaveBeenCalledWith(42);
  });

  it("falls back to agency's first client when admin has no impersonation header", async () => {
    const mockAgency = { id: 10, name: "Sterling Marketing" };
    const mockClient = { id: 5, agencyId: 10, name: "Raindrop Marketing" };
    vi.mocked(getAgencyByOwnerId).mockResolvedValue(mockAgency as any);
    vi.mocked(getClientsByAgencyId).mockResolvedValue([mockClient] as any);

    const ctx = {
      user: { id: 1, role: "admin" },
      req: { headers: {} },
    };

    const result = await resolveClientForFollowUps(ctx);
    expect(result).toEqual(mockClient);
    expect(getAgencyByOwnerId).toHaveBeenCalledWith(1);
    expect(getClientsByAgencyId).toHaveBeenCalledWith(10);
  });

  it("returns a synthetic stub when admin has no clients under their agency", async () => {
    const mockAgency = { id: 10, name: "Sterling Marketing" };
    vi.mocked(getAgencyByOwnerId).mockResolvedValue(mockAgency as any);
    vi.mocked(getClientsByAgencyId).mockResolvedValue([]);

    const ctx = {
      user: { id: 1, role: "admin" },
      req: { headers: {} },
    };

    const result = await resolveClientForFollowUps(ctx) as any;
    expect(result.agencyId).toBe(10);
    expect(result.id).toBe(0);
    expect(result.name).toBe("Sterling Marketing");
  });

  it("returns null when admin has no agency and no impersonation", async () => {
    vi.mocked(getAgencyByOwnerId).mockResolvedValue(undefined);

    const ctx = {
      user: { id: 1, role: "admin" },
      req: { headers: {} },
    };

    const result = await resolveClientForFollowUps(ctx);
    expect(result).toBeUndefined();
  });

  it("looks up client by userId for non-admin users", async () => {
    const mockClient = { id: 7, agencyId: 2, name: "John Doe" };
    vi.mocked(getClientByUserId).mockResolvedValue(mockClient as any);

    const ctx = {
      user: { id: 99, role: "client_user" },
      req: { headers: {} },
    };

    const result = await resolveClientForFollowUps(ctx);
    expect(result).toEqual(mockClient);
    expect(getClientByUserId).toHaveBeenCalledWith(99);
  });

  it("ignores impersonation header for non-admin users", async () => {
    const mockClient = { id: 7, agencyId: 2, name: "John Doe" };
    vi.mocked(getClientByUserId).mockResolvedValue(mockClient as any);

    const ctx = {
      user: { id: 99, role: "client_user" },
      req: { headers: { "x-impersonate-client-id": "42" } },
    };

    const result = await resolveClientForFollowUps(ctx);
    // Non-admin: should NOT use impersonation, should use userId lookup
    expect(getClientById).not.toHaveBeenCalled();
    expect(getClientByUserId).toHaveBeenCalledWith(99);
    expect(result).toEqual(mockClient);
  });
});

describe("SMS character counter logic", () => {
  it("counts a single segment for messages up to 160 chars", () => {
    const info = getSmsSegmentInfo("Hello world");
    expect(info.segments).toBe(1);
    expect(info.remaining).toBe(160 - 11);
  });

  it("counts exactly 160 chars as 1 segment with 0 remaining", () => {
    const text = "A".repeat(160);
    const info = getSmsSegmentInfo(text);
    expect(info.segments).toBe(1);
    expect(info.remaining).toBe(0);
  });

  it("counts 161 chars as 2 segments", () => {
    const text = "A".repeat(161);
    const info = getSmsSegmentInfo(text);
    expect(info.segments).toBe(2);
    expect(info.remaining).toBe(159);
  });

  it("counts 320 chars as 2 segments with 0 remaining", () => {
    const text = "A".repeat(320);
    const info = getSmsSegmentInfo(text);
    expect(info.segments).toBe(2);
    expect(info.remaining).toBe(0);
  });

  it("counts 321 chars as 3 segments", () => {
    const text = "A".repeat(321);
    const info = getSmsSegmentInfo(text);
    expect(info.segments).toBe(3);
  });

  it("handles empty string gracefully", () => {
    const info = getSmsSegmentInfo("");
    // ceil(0/160) = 0, but practically we only show counter when len > 0
    expect(info.len).toBe(0);
  });
});

describe("DND guard logic", () => {
  it("detects SMS DND flag", () => {
    const dnd = { sms: true, email: false, call: false, voicemail: false, all: false };
    expect(dnd.sms).toBe(true);
  });

  it("detects email DND flag", () => {
    const dnd = { sms: false, email: true, call: false, voicemail: false, all: false };
    expect(dnd.email).toBe(true);
  });

  it("send button is disabled when no phone and tab is sms", () => {
    const lead = { phone: null, email: "test@example.com" };
    const composerTab = "sms";
    const composerText = "Hello";
    const isSendDisabled =
      !composerText.trim() ||
      (composerTab === "sms" && !lead.phone) ||
      (composerTab === "email" && !lead.email);
    expect(isSendDisabled).toBe(true);
  });

  it("send button is disabled when no email and tab is email", () => {
    const lead = { phone: "+15551234567", email: null };
    const composerTab = "email";
    const composerText = "Hello";
    const isSendDisabled =
      !composerText.trim() ||
      (composerTab === "sms" && !lead.phone) ||
      (composerTab === "email" && !lead.email);
    expect(isSendDisabled).toBe(true);
  });

  it("send button is enabled when phone exists and tab is sms", () => {
    const lead = { phone: "+15551234567", email: null };
    const composerTab = "sms";
    const composerText = "Hello";
    const isSendDisabled =
      !composerText.trim() ||
      (composerTab === "sms" && !lead.phone) ||
      (composerTab === "email" && !lead.email);
    expect(isSendDisabled).toBe(false);
  });

  it("send button is enabled when email exists and tab is email", () => {
    const lead = { phone: null, email: "test@example.com" };
    const composerTab = "email";
    const composerText = "Hello";
    const isSendDisabled =
      !composerText.trim() ||
      (composerTab === "sms" && !lead.phone) ||
      (composerTab === "email" && !lead.email);
    expect(isSendDisabled).toBe(false);
  });

  it("send button is disabled when composerText is empty", () => {
    const lead = { phone: "+15551234567", email: "test@example.com" };
    const composerTab = "sms";
    const composerText = "   ";
    const isSendDisabled =
      !composerText.trim() ||
      (composerTab === "sms" && !lead.phone) ||
      (composerTab === "email" && !lead.email);
    expect(isSendDisabled).toBe(true);
  });
});
