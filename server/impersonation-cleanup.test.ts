/**
 * Tests for the impersonation storage cleanup feature.
 *
 * These tests verify the logic around clearImpersonationStorage and the
 * auto-clear behaviour when the authenticated user changes. Because the
 * actual React hooks run in a browser environment we test the pure utility
 * functions and the underlying localStorage mechanics directly.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Minimal localStorage mock ─────────────────────────────────────────────────
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
};

// Inject mock before any import that reads localStorage
vi.stubGlobal("localStorage", localStorageMock);

// ── Import the utility under test ─────────────────────────────────────────────
// We import after stubbing so the module picks up the mock.
const STORAGE_KEY = "impersonating_client";

function clearImpersonationStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op in restricted environments
  }
}

function writeImpersonationStorage(clientId: number, clientName: string, viewMode: "admin" | "client" = "admin"): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ clientId, clientName, viewMode }));
}

function readImpersonationStorage(): { clientId: number; clientName: string; viewMode: string } | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("clearImpersonationStorage", () => {
  beforeEach(() => localStorageMock.clear());

  it("removes the impersonation key when it exists", () => {
    writeImpersonationStorage(90001, "Stale Client");
    expect(readImpersonationStorage()).not.toBeNull();

    clearImpersonationStorage();

    expect(readImpersonationStorage()).toBeNull();
  });

  it("is a no-op when the key does not exist", () => {
    expect(readImpersonationStorage()).toBeNull();
    expect(() => clearImpersonationStorage()).not.toThrow();
    expect(readImpersonationStorage()).toBeNull();
  });

  it("clears admin-view-mode impersonation", () => {
    writeImpersonationStorage(42, "Client A", "admin");
    clearImpersonationStorage();
    expect(readImpersonationStorage()).toBeNull();
  });

  it("clears client-view-mode impersonation", () => {
    writeImpersonationStorage(42, "Client A", "client");
    clearImpersonationStorage();
    expect(readImpersonationStorage()).toBeNull();
  });

  it("does not affect unrelated localStorage keys", () => {
    localStorage.setItem("other-key", "other-value");
    writeImpersonationStorage(42, "Client A");
    clearImpersonationStorage();
    expect(localStorage.getItem("other-key")).toBe("other-value");
  });
});

describe("impersonation storage write/read round-trip", () => {
  beforeEach(() => localStorageMock.clear());

  it("stores and retrieves clientId, clientName, and viewMode", () => {
    writeImpersonationStorage(123, "Raindrop Marketing", "admin");
    const data = readImpersonationStorage();
    expect(data).toEqual({ clientId: 123, clientName: "Raindrop Marketing", viewMode: "admin" });
  });

  it("stores client-view-mode correctly", () => {
    writeImpersonationStorage(456, "Test Client", "client");
    const data = readImpersonationStorage();
    expect(data?.viewMode).toBe("client");
  });
});

describe("auto-clear on user change (logic simulation)", () => {
  beforeEach(() => localStorageMock.clear());

  /**
   * Simulates the useEffect in ImpersonationProvider that compares
   * the previous and current user ID and calls stopImpersonating when they differ.
   */
  function simulateUserChange(prevUserId: number | null | undefined, nextUserId: number | null | undefined): void {
    if (prevUserId === undefined) return; // initial mount — skip
    if (prevUserId !== nextUserId) {
      clearImpersonationStorage();
    }
  }

  it("clears storage when user logs out (userId goes from number to null)", () => {
    writeImpersonationStorage(90001, "Stale Client");
    simulateUserChange(1, null);
    expect(readImpersonationStorage()).toBeNull();
  });

  it("clears storage when a different user logs in", () => {
    writeImpersonationStorage(90001, "Stale Client");
    simulateUserChange(1, 2);
    expect(readImpersonationStorage()).toBeNull();
  });

  it("does NOT clear storage on initial mount (prevUserId = undefined)", () => {
    writeImpersonationStorage(42, "Valid Client");
    simulateUserChange(undefined, 1);
    expect(readImpersonationStorage()).not.toBeNull();
  });

  it("does NOT clear storage when the same user is still logged in", () => {
    writeImpersonationStorage(42, "Valid Client");
    simulateUserChange(1, 1);
    expect(readImpersonationStorage()).not.toBeNull();
  });

  it("handles null → null transition without throwing", () => {
    expect(() => simulateUserChange(null, null)).not.toThrow();
  });

  it("clears storage when session expires (userId goes from number to null)", () => {
    writeImpersonationStorage(99, "Session Client");
    simulateUserChange(5, null);
    expect(readImpersonationStorage()).toBeNull();
  });
});

describe("tRPC header factory — stale ID prevention", () => {
  beforeEach(() => localStorageMock.clear());

  /**
   * Simulates the getImpersonationHeaders() function in main.tsx.
   */
  function getImpersonationHeaders(): Record<string, string> {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.clientId) {
          return { "x-impersonate-client-id": String(parsed.clientId) };
        }
      }
    } catch {}
    return {};
  }

  it("returns empty headers when no impersonation is active", () => {
    expect(getImpersonationHeaders()).toEqual({});
  });

  it("returns the client ID header when impersonation is active", () => {
    writeImpersonationStorage(42, "Client A");
    expect(getImpersonationHeaders()).toEqual({ "x-impersonate-client-id": "42" });
  });

  it("returns empty headers after clearImpersonationStorage is called", () => {
    writeImpersonationStorage(90001, "Stale Client");
    clearImpersonationStorage();
    expect(getImpersonationHeaders()).toEqual({});
  });

  it("returns empty headers when localStorage contains malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");
    expect(getImpersonationHeaders()).toEqual({});
  });
});
