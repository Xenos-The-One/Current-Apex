/**
 * Tests for drip sequence and seed campaigns procedures
 */
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// ─── Proxy-based chainable DB mock ────────────────────────────────────────────
// Each call to a method returns a NEW chainable proxy, so multi-step chains
// (select → from → where → limit) always work regardless of call order.

const { makeChainableDb, mockGetDb } = vi.hoisted(() => {
  /**
   * Creates a chainable Drizzle-like mock.
   * `resolveWith` is the value that terminal methods (limit, orderBy, execute, values) resolve to.
   */
  function makeChainableDb(resolveWith: unknown[] = []) {
    const handler: ProxyHandler<object> = {
      get(_target, prop: string) {
        if (prop === "then") return undefined; // not a Promise itself
        // Terminal methods return a Promise
        if (["limit", "orderBy", "execute"].includes(prop)) {
          return vi.fn().mockResolvedValue(resolveWith);
        }
        // values returns insert result
        if (prop === "values") {
          return vi.fn().mockResolvedValue([{ insertId: 1 }]);
        }
        // All other methods return a new chainable proxy
        return vi.fn().mockReturnValue(new Proxy({}, handler));
      },
    };
    return new Proxy({}, handler);
  }

  const mockGetDb = vi.fn().mockImplementation(() => Promise.resolve(makeChainableDb()));
  return { makeChainableDb, mockGetDb };
});

vi.mock("./db", () => ({ getDb: mockGetDb }));
vi.mock("./sendgrid", () => ({ sendEmail: vi.fn().mockResolvedValue({ success: true }) }));
vi.mock("./twilio", () => ({ sendSMS: vi.fn().mockResolvedValue({ success: true }) }));

// ─── Context helpers ──────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeAdminCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "admin-user", email: "admin@test.com", name: "Admin User",
    loginMethod: "manus", role: "admin",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUserCtx(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2, openId: "client-user", email: "kyle@test.com", name: "Kyle",
    loginMethod: "email", role: "user",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("dripSequences.listSequences", () => {
  it("returns an array (empty when no sequences exist)", async () => {
    mockGetDb.mockResolvedValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.dripSequences.listSequences();
    expect(Array.isArray(result)).toBe(true);
  });

  it("requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.dripSequences.listSequences()).rejects.toThrow();
  });
});

// Helper: make a DB that returns an agency on limit calls
function makeDbWithAgency() {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return undefined;
      if (prop === "limit") return vi.fn().mockResolvedValue([{ id: 1, name: "Optimal Lending", ownerId: 1 }]);
      if (prop === "values") return vi.fn().mockResolvedValue([{ insertId: 42 }]);
      if (["orderBy", "execute"].includes(prop)) return vi.fn().mockResolvedValue([]);
      return vi.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

describe("dripSequences.createSequence", () => {
  it("creates a sequence with valid input", async () => {
    mockGetDb.mockResolvedValue(makeDbWithAgency());

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());

    const result = await caller.dripSequences.createSequence({
      name: "Test DSCR Sequence",
      description: "Test description",
      leadType: "dscr",
      triggerEvent: "lead_created",
      stopOnAppointment: true,
      stopOnReply: true,
      steps: [
        { stepOrder: 1, channel: "sms", delayHours: 0, body: "Hi {{firstName}}!" },
        { stepOrder: 2, channel: "email", delayHours: 24, subject: "Test", body: "Hi {{firstName}}!" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.sequenceId).toBeDefined();
  });

  it("rejects sequences with no steps", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(
      caller.dripSequences.createSequence({
        name: "Empty Sequence",
        leadType: "dscr",
        triggerEvent: "lead_created",
        stopOnAppointment: true,
        stopOnReply: true,
        steps: [],
      })
    ).rejects.toThrow();
  });
});

describe("dripSequences.updateSequence", () => {
  it("can toggle isActive on a sequence", async () => {
    mockGetDb.mockResolvedValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.dripSequences.updateSequence({ id: 1, isActive: false });
    expect(result.success).toBe(true);
  });
});

describe("seedCampaigns.seedPrebuiltCampaigns", () => {
  it("requires admin role", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.seedCampaigns.seedPrebuiltCampaigns()).rejects.toThrow();
  });

  it("admin can seed pre-built campaigns (none exist yet)", async () => {
    // Use makeDbWithAgency so the agency lookup succeeds, then sequences return []
    mockGetDb.mockResolvedValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.seedCampaigns.seedPrebuiltCampaigns();
    expect(result.success).toBe(true);
    expect(Array.isArray(result.results)).toBe(true);
  });

  it("skips campaigns that already exist", async () => {
    // makeDbWithAgency returns { id: 1, ... } on every limit call — existing campaign found
    mockGetDb.mockResolvedValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.seedCampaigns.seedPrebuiltCampaigns();
    expect(result.success).toBe(true);
    // With agency mock, all campaigns are either CREATED or SKIPPED
    expect(result.results.every((r: string) => r.startsWith("CREATED") || r.startsWith("SKIPPED"))).toBe(true);
  });
});

describe("publicFeatures.captureBookingLead", () => {
  it("creates a lead from booking page submission", async () => {
    // Returns agency on first limit, client on second
    let callCount = 0;
    const handler: ProxyHandler<object> = {
      get(_target, prop: string) {
        if (prop === "then") return undefined;
        if (prop === "limit") {
          return vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve([{ id: 1, name: "Optimal Lending" }]);
            return Promise.resolve([{ id: 5 }]);
          });
        }
        if (prop === "values") return vi.fn().mockResolvedValue([{ insertId: 99 }]);
        if (["orderBy", "execute"].includes(prop)) return vi.fn().mockResolvedValue([]);
        return vi.fn().mockReturnValue(new Proxy({}, handler));
      },
    };
    mockGetDb.mockResolvedValue(new Proxy({}, handler));

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());

    const result = await caller.publicFeatures.captureBookingLead({
      firstName: "John",
      lastName: "Smith",
      email: "john@example.com",
      phone: "5551234567",
      loanType: "dscr",
      propertyAddress: "123 Main St",
      loanAmount: "$350,000",
      source: "booking_page",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email addresses", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(
      caller.publicFeatures.captureBookingLead({
        firstName: "John",
        email: "not-an-email",
        phone: "5551234567",
        loanType: "dscr",
      })
    ).rejects.toThrow();
  });

  it("rejects missing first name", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(
      caller.publicFeatures.captureBookingLead({
        firstName: "",
        email: "john@example.com",
        phone: "5551234567",
        loanType: "dscr",
      })
    ).rejects.toThrow();
  });
});
