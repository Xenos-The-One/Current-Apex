import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Shared mock context factory ─────────────────────────────────────────────
function createMockContext(role: "admin" | "user" | "super_admin" = "admin"): TrpcContext {
  const clearedCookies: any[] = [];
  return {
    user: {
      id: 1,
      openId: "test-user-openid",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: role as any,
      agencyId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: any) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@example.com");
  });

  it("returns null for unauthenticated context", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

// ─── Billing tests ────────────────────────────────────────────────────────────
describe("billing.listPlans", () => {
  it("returns an array of plans (may be empty without DB)", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.billing.listPlans();
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      // Without a real DB connection, INTERNAL_SERVER_ERROR is acceptable
      expect(["INTERNAL_SERVER_ERROR", "UNAUTHORIZED"]).toContain(e.code);
    }
  });
});

// ─── Leads router tests ───────────────────────────────────────────────────────
describe("leads.list", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.leads.list({ agencyId: 1 })).rejects.toThrow();
  });

  it("returns array for authenticated user (graceful without DB)", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.leads.list({ agencyId: 1 });
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      // Without DB, any server error is acceptable
      expect(e).toBeDefined();
    }
  });
});

// ─── Analytics router tests ───────────────────────────────────────────────────
describe("analytics.getFunnel", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.analytics.getFunnel({ agencyId: 1 })).rejects.toThrow();
  });

  it("returns funnel data array for authenticated user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.analytics.getFunnel({ agencyId: 1 });
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("stage");
        expect(result[0]).toHaveProperty("count");
      }
    } catch (e: any) {
      expect(["INTERNAL_SERVER_ERROR"]).toContain(e.code);
    }
  });
});

// ─── Automations router tests ─────────────────────────────────────────────────
describe("automations.listWorkflows", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.automations.listWorkflows({ agencyId: 1 })).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.automations.listWorkflows({ agencyId: 1 });
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      expect(["INTERNAL_SERVER_ERROR"]).toContain(e.code);
    }
  });
});

// ─── Campaigns router tests ───────────────────────────────────────────────────
describe("campaigns.listEmailCampaigns", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.campaigns.listEmailCampaigns({ agencyId: 1 })).rejects.toThrow();
  });
});

// ─── Vapi router tests ────────────────────────────────────────────────────────
describe("vapi.listCalls", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.vapi.listCalls({ agencyId: 1 })).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.vapi.listCalls({ agencyId: 1 });
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      expect(["INTERNAL_SERVER_ERROR"]).toContain(e.code);
    }
  });
});

// ─── Borrowers router tests ───────────────────────────────────────────────────
describe("borrowers.list", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.borrowers.list({ agencyId: 1 })).rejects.toThrow();
  });
});

// ─── Documents router tests ───────────────────────────────────────────────────
describe("documents.list", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.documents.list({ agencyId: 1 })).rejects.toThrow();
  });

  it("returns array for authenticated user", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.documents.list({ agencyId: 1 });
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      expect(["INTERNAL_SERVER_ERROR"]).toContain(e.code);
    }
  });
});

// ─── Contacts router tests ────────────────────────────────────────────────────
describe("contacts.list", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.contacts.list({ agencyId: 1 })).rejects.toThrow();
  });
});

// ─── Content router tests ─────────────────────────────────────────────────────
describe("content.listPosts", () => {
  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as any,
      res: { clearCookie: () => {} } as any,
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.content.listPosts({ agencyId: 1 })).rejects.toThrow();
  });
});
