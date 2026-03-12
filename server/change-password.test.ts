import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import type { TrpcContext } from "./_core/context";

// ─── Hoist mock variables so vi.mock factory can reference them ───────────────
const { mockSelect, mockUpdate } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockUpdate = vi.fn();
  return { mockSelect, mockUpdate };
});

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: mockSelect,
    update: mockUpdate,
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 42,
    openId: "test-open-id",
    email: "kyle@example.com",
    name: "Kyle Test",
    loginMethod: "email_password",
    role: "client_user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Import router after mocks are set up ────────────────────────────────────
import { appRouter } from "./routers";

// ─── Tests ───────────────────────────────────────────────────────────────────
describe("onboarding.hasPasswordCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns hasPassword: true when active credentials exist", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1 }]),
        }),
      }),
    });

    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.onboarding.hasPasswordCredentials();
    expect(result).toEqual({ hasPassword: true });
  });

  it("returns hasPassword: false when no credentials exist", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.onboarding.hasPasswordCredentials();
    expect(result).toEqual({ hasPassword: false });
  });

  it("throws UNAUTHORIZED when called without a session", async () => {
    const ctx = makeCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.onboarding.hasPasswordCredentials()).rejects.toThrow(TRPCError);
  });
});

describe("onboarding.changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function makeHash(password: string) {
    return bcrypt.hash(password, 12);
  }

  it("successfully changes password when current password is correct", async () => {
    const currentHash = await makeHash("OldPass123!");

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 1, passwordHash: currentHash, isActive: true },
          ]),
        }),
      }),
    });

    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    mockUpdate.mockReturnValue({ set: mockSet });

    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    const result = await caller.onboarding.changePassword({
      currentPassword: "OldPass123!",
      newPassword: "NewPass456@",
    });

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("throws UNAUTHORIZED when current password is wrong", async () => {
    const currentHash = await makeHash("OldPass123!");

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 1, passwordHash: currentHash, isActive: true },
          ]),
        }),
      }),
    });

    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.onboarding.changePassword({
        currentPassword: "WrongPassword!",
        newPassword: "NewPass456@",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws BAD_REQUEST when new password is the same as current", async () => {
    const currentHash = await makeHash("SamePass123!");

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 1, passwordHash: currentHash, isActive: true },
          ]),
        }),
      }),
    });

    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.onboarding.changePassword({
        currentPassword: "SamePass123!",
        newPassword: "SamePass123!",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws BAD_REQUEST when no credentials exist", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const ctx = makeCtx(makeUser());
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.onboarding.changePassword({
        currentPassword: "AnyPass123!",
        newPassword: "NewPass456@",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("throws UNAUTHORIZED when called without a session", async () => {
    const ctx = makeCtx(null);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.onboarding.changePassword({
        currentPassword: "AnyPass123!",
        newPassword: "NewPass456@",
      })
    ).rejects.toThrow(TRPCError);
  });
});
