import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  return {
    user,
    req: {
      headers: { origin: "http://localhost:3000" },
      cookies: {},
    } as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
  };
}

describe("notifications.getPrefs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns default prefs when user has no notifPrefs set", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ notifPrefs: null }]),
    };
    (getDb as any).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.getPrefs();

    expect(result).toMatchObject({
      newLead: true,
      appointment: true,
      statusChange: true,
      assignment: true,
      marketing: false,
      quietHoursEnabled: false,
      quietStart: "22:00",
      quietEnd: "08:00",
    });
  });

  it("returns stored prefs when user has notifPrefs set", async () => {
    const storedPrefs = {
      newLead: false,
      appointment: true,
      statusChange: false,
      assignment: true,
      marketing: true,
      quietHoursEnabled: true,
      quietStart: "21:00",
      quietEnd: "07:00",
    };
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ notifPrefs: JSON.stringify(storedPrefs) }]),
    };
    (getDb as any).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.getPrefs();

    expect(result).toMatchObject(storedPrefs);
  });

  it("returns null when db is unavailable", async () => {
    (getDb as any).mockResolvedValue(null);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.getPrefs();

    expect(result).toBeNull();
  });
});

describe("notifications.updatePrefs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("merges new prefs with existing prefs and saves", async () => {
    const existingPrefs = { newLead: true, appointment: true, marketing: false };
    const mockUpdate = vi.fn().mockReturnThis();
    const mockSet = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn()
        .mockReturnValueOnce({
          limit: vi.fn().mockResolvedValue([{ notifPrefs: JSON.stringify(existingPrefs) }]),
        })
        .mockReturnValueOnce(mockWhere),
      update: vi.fn().mockReturnThis(),
      set: mockSet,
      limit: vi.fn().mockResolvedValue([{ notifPrefs: JSON.stringify(existingPrefs) }]),
    };
    mockDb.update.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });

    (getDb as any).mockResolvedValue(mockDb);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.notifications.updatePrefs({ marketing: true, quietHoursEnabled: true });

    expect(result).toMatchObject({ success: true });
    expect(result.prefs).toMatchObject({
      newLead: true,
      appointment: true,
      marketing: true,
      quietHoursEnabled: true,
    });
  });

  it("throws when db is unavailable", async () => {
    (getDb as any).mockResolvedValue(null);

    const caller = appRouter.createCaller(createAuthContext());
    await expect(caller.notifications.updatePrefs({ newLead: false })).rejects.toThrow(
      "Database not available"
    );
  });
});
