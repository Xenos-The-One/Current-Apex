/**
 * Tests for the pipelines router
 * Covers: listPipelines, createPipeline, createOpportunity, moveStage,
 *         updateOpportunity, deleteOpportunity, addNote, bulkAction
 */
import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// ─── Proxy-based chainable DB mock ────────────────────────────────────────────
const { makeChainableDb, mockGetDb } = vi.hoisted(() => {
  function makeChainableDb(resolveWith: unknown[] = []) {
    const handler: ProxyHandler<object> = {
      get(_target, prop: string) {
        if (prop === "then") return undefined;
        if (["limit", "orderBy", "execute"].includes(prop)) {
          return vi.fn().mockResolvedValue(resolveWith);
        }
        if (prop === "values") {
          return vi.fn().mockResolvedValue([{ insertId: 99 }]);
        }
        return vi.fn().mockReturnValue(new Proxy({}, handler));
      },
    };
    return new Proxy({}, handler);
  }

  const mockGetDb = vi.fn().mockImplementation(() => Promise.resolve(makeChainableDb()));
  return { makeChainableDb, mockGetDb };
});

vi.mock("./db", () => ({ getDb: mockGetDb }));

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

// DB that returns an agency row on limit calls
function makeDbWithAgency() {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return undefined;
      if (prop === "limit") return vi.fn().mockResolvedValue([{ id: 1, name: "Optimal Lending", userId: 1 }]);
      if (prop === "values") return vi.fn().mockResolvedValue([{ insertId: 42 }]);
      if (["orderBy", "execute"].includes(prop)) return vi.fn().mockResolvedValue([]);
      return vi.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

// DB that returns an agency + a sample opportunity on limit calls
function makeDbWithOpp() {
  let callCount = 0;
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return undefined;
      if (prop === "limit") {
        return vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // First limit call → agency lookup
            return Promise.resolve([{ id: 1, name: "Optimal Lending", userId: 1 }]);
          }
          if (callCount === 2) {
            // Second limit call → client lookup (null = agency owner)
            return Promise.resolve([]);
          }
          // Subsequent calls → opportunity
          return Promise.resolve([{
            id: 10, agencyId: 1, clientId: null, pipelineId: 5, stageId: 20,
            name: "Test Opp", contactName: "John", value: "350000",
            status: "open", priority: "medium", tags: [],
            stageEnteredAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
          }]);
        });
      }
      if (prop === "values") return vi.fn().mockResolvedValue([{ insertId: 42 }]);
      if (["orderBy", "execute"].includes(prop)) return vi.fn().mockResolvedValue([]);
      return vi.fn().mockReturnValue(new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("pipelines.listPipelines", () => {
  it("returns an array for authenticated user", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.listPipelines();
    expect(Array.isArray(result)).toBe(true);
  });

  it("requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.pipelines.listPipelines()).rejects.toThrow();
  });
});

describe("pipelines.createPipeline", () => {
  it("creates a pipeline with a name", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.createPipeline({ name: "DSCR Pipeline" });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("rejects empty name", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.pipelines.createPipeline({ name: "" })).rejects.toThrow();
  });

  it("requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.pipelines.createPipeline({ name: "Test" })).rejects.toThrow();
  });
});

describe("pipelines.createOpportunity", () => {
  it("creates an opportunity with required fields", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.createOpportunity({
      pipelineId: 1,
      stageId: 1,
      name: "James Martinez - DSCR Loan",
      contactName: "James Martinez",
      value: 450000,
      source: "Facebook Ad",
    });
    expect(result).toHaveProperty("id");
  });

  it("rejects empty name", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.pipelines.createOpportunity({
      pipelineId: 1, stageId: 1, name: "",
    })).rejects.toThrow();
  });

  it("requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.pipelines.createOpportunity({
      pipelineId: 1, stageId: 1, name: "Test",
    })).rejects.toThrow();
  });
});

describe("pipelines.updateOpportunity", () => {
  it("updates opportunity fields", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.updateOpportunity({
      id: 10,
      name: "Updated Name",
      status: "won",
      priority: "high",
    });
    expect(result).toHaveProperty("success", true);
  });

  it("rejects invalid status", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.pipelines.updateOpportunity({
      id: 10, status: "invalid" as any,
    })).rejects.toThrow();
  });
});

describe("pipelines.moveStage", () => {
  it("moves opportunity to a new stage", async () => {
    // Build a DB that returns agency on first limit, then opp on subsequent limits
    const handler: ProxyHandler<object> = {
      get(_target, prop: string) {
        if (prop === "then") return undefined;
        if (prop === "limit") {
          return vi.fn().mockResolvedValue([{
            id: 10, stageId: 20, name: "Test Opp",
            agencyId: 1, userId: 1,
          }]);
        }
        if (prop === "values") return vi.fn().mockResolvedValue([{ insertId: 42 }]);
        if (["orderBy", "execute"].includes(prop)) return vi.fn().mockResolvedValue([]);
        return vi.fn().mockReturnValue(new Proxy({}, handler));
      },
    };
    mockGetDb.mockReturnValue(new Proxy({}, handler));
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.moveStage({
      opportunityId: 10,
      newStageId: 25,
    });
    expect(result).toHaveProperty("success", true);
  });

  it("requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.pipelines.moveStage({
      opportunityId: 10, newStageId: 25,
    })).rejects.toThrow();
  });
});

describe("pipelines.addNote", () => {
  it("adds a note to an opportunity", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.addNote({
      opportunityId: 10,
      content: "Called lead, left voicemail",
    });
    expect(result).toHaveProperty("success", true);
  });

  it("rejects empty note content", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.pipelines.addNote({
      opportunityId: 10, content: "",
    })).rejects.toThrow();
  });
});

describe("pipelines.bulkAction", () => {
  it("bulk marks opportunities as won", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.bulkAction({
      ids: [1, 2, 3],
      action: "mark_won",
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("affected", 3);
  });

  it("bulk marks opportunities as lost", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.bulkAction({
      ids: [4, 5],
      action: "mark_lost",
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("affected", 2);
  });

  it("rejects empty ids array", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.pipelines.bulkAction({
      ids: [], action: "mark_won",
    })).rejects.toThrow();
  });

  it("requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.pipelines.bulkAction({
      ids: [1], action: "mark_won",
    })).rejects.toThrow();
  });
});

describe("pipelines.deleteOpportunity", () => {
  it("deletes an opportunity", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.deleteOpportunity({ id: 10 });
    expect(result).toHaveProperty("success", true);
  });

  it("requires authentication", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.pipelines.deleteOpportunity({ id: 10 })).rejects.toThrow();
  });
});

describe("pipelines.addStage", () => {
  it("adds a stage to a pipeline", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    const result = await caller.pipelines.addStage({
      pipelineId: 1,
      name: "New Stage",
      color: "#6366f1",
      probability: 50,
    });
    expect(result).toHaveProperty("id");
  });

  it("rejects empty stage name", async () => {
    mockGetDb.mockReturnValue(makeDbWithAgency());
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(makeUserCtx());
    await expect(caller.pipelines.addStage({
      pipelineId: 1, name: "",
    })).rejects.toThrow();
  });
});
