/**
 * Tests for admin password reset, force-change-password, and login history features.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockDbInsert = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockDbUpdate = vi.hoisted(() => vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }));
const mockDbSelect = vi.hoisted(() => vi.fn());

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mockDbSelect,
    insert: vi.fn().mockReturnValue({ values: mockDbInsert }),
    update: mockDbUpdate,
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(role: "admin" | "user" | "client_user" = "admin", userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `open-id-${userId}`,
    email: `user${userId}@example.com`,
    name: "Test User",
    loginMethod: "email_password",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {}, socket: {} } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── adminResetPassword ──────────────────────────────────────────────────────

describe("onboarding.adminResetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(createCtx("client_user", 5));
    await expect(
      caller.onboarding.adminResetPassword({ userId: 10, tempPassword: "TempPass123!" })
    ).rejects.toThrow(TRPCError);
  });

  it("throws NOT_FOUND when target user does not exist", async () => {
    // select returns empty array (user not found)
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const caller = appRouter.createCaller(createCtx("admin"));
    await expect(
      caller.onboarding.adminResetPassword({ userId: 999, tempPassword: "TempPass123!" })
    ).rejects.toThrow(TRPCError);
  });

  it("succeeds when target user exists and credentials are updated", async () => {
    const targetUser = { id: 10, email: "kyle@example.com", name: "Kyle" };

    let callCount = 0;
    mockDbSelect.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++;
            // First call: find target user; second call: check existing credentials
            if (callCount === 1) return Promise.resolve([targetUser]);
            return Promise.resolve([{ id: 1 }]); // existing cred
          }),
        }),
      }),
    }));

    const caller = appRouter.createCaller(createCtx("admin"));
    const result = await caller.onboarding.adminResetPassword({ userId: 10, tempPassword: "TempPass123!" });

    expect(result.success).toBe(true);
    expect(result.email).toBe("kyle@example.com");
  });
});

// ─── clearMustChangePassword ─────────────────────────────────────────────────

describe("onboarding.clearMustChangePassword", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears the mustChangePassword flag for the current user", async () => {
    const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    mockDbUpdate.mockReturnValue({ set: setMock });

    const caller = appRouter.createCaller(createCtx("client_user", 7));
    const result = await caller.onboarding.clearMustChangePassword();

    expect(result.success).toBe(true);
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({ mustChangePassword: false })
    );
  });
});

// ─── getLoginHistory ─────────────────────────────────────────────────────────

describe("onboarding.getLoginHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns login history for the current user", async () => {
    const fakeEntries = [
      { id: 1, userId: 3, email: "user3@example.com", method: "email_password", success: true, failureReason: null, ipAddress: "127.0.0.1", userAgent: "Chrome", createdAt: new Date() },
      { id: 2, userId: 3, email: "user3@example.com", method: "email_password", success: false, failureReason: "Wrong password", ipAddress: "127.0.0.1", userAgent: "Chrome", createdAt: new Date() },
    ];

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(fakeEntries),
          }),
        }),
      }),
    });

    const caller = appRouter.createCaller(createCtx("client_user", 3));
    const result = await caller.onboarding.getLoginHistory();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]?.success).toBe(true);
    expect(result[1]?.failureReason).toBe("Wrong password");
  });

  it("returns empty array when no history exists", async () => {
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    });

    const caller = appRouter.createCaller(createCtx("client_user", 4));
    const result = await caller.onboarding.getLoginHistory();

    expect(result).toEqual([]);
  });

  it("allows admin to query another user's history", async () => {
    const fakeEntries = [
      { id: 5, userId: 10, email: "kyle@example.com", method: "email_password", success: true, failureReason: null, ipAddress: null, userAgent: null, createdAt: new Date() },
    ];

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(fakeEntries),
          }),
        }),
      }),
    });

    const caller = appRouter.createCaller(createCtx("admin", 1));
    const result = await caller.onboarding.getLoginHistory({ userId: 10 });

    expect(result).toHaveLength(1);
    expect(result[0]?.userId).toBe(10);
  });
});
