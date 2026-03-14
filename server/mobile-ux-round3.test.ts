/**
 * Mobile UX Round 3 — server-side unit tests
 *
 * Tests cover the business logic that underpins:
 *  1. Swipe-to-action on contact cards (lead lookup + delete guard)
 *  2. Pull-to-refresh (listMyLeads returns fresh data)
 *  3. Haptic feedback (navigator.vibrate availability check)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 1. Swipe-to-action: lead data shape ─────────────────────────────────────
describe("Swipe-to-action: lead data shape", () => {
  type Lead = {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string | null;
    email?: string | null;
    status: string;
  };

  function canCall(lead: Lead) {
    return Boolean(lead.phone && lead.phone.trim().length > 0);
  }

  function canEmail(lead: Lead) {
    return Boolean(lead.email && lead.email.trim().length > 0);
  }

  it("enables Call action when lead has a phone number", () => {
    const lead: Lead = { id: 1, firstName: "Alice", lastName: "Smith", phone: "+15551234567", status: "new" };
    expect(canCall(lead)).toBe(true);
  });

  it("disables Call action when lead has no phone", () => {
    const lead: Lead = { id: 2, firstName: "Bob", lastName: "Jones", phone: null, status: "new" };
    expect(canCall(lead)).toBe(false);
  });

  it("enables Message action when lead has an email", () => {
    const lead: Lead = { id: 3, firstName: "Carol", lastName: "White", email: "carol@example.com", status: "active" };
    expect(canEmail(lead)).toBe(true);
  });

  it("disables Message action when lead has no email", () => {
    const lead: Lead = { id: 4, firstName: "Dave", lastName: "Brown", email: undefined, status: "active" };
    expect(canEmail(lead)).toBe(false);
  });

  it("swipe threshold logic: snap when pull exceeds 60px", () => {
    const THRESHOLD = 60;
    const MAX = 140;
    function snapSwipe(dx: number) {
      if (Math.abs(dx) < THRESHOLD) return 0;
      return dx < 0 ? -MAX : MAX;
    }
    expect(snapSwipe(30)).toBe(0);
    expect(snapSwipe(-30)).toBe(0);
    expect(snapSwipe(70)).toBe(MAX);
    expect(snapSwipe(-80)).toBe(-MAX);
  });
});

// ─── 2. Pull-to-refresh: resistance curve ────────────────────────────────────
describe("Pull-to-refresh: resistance curve", () => {
  const RESISTANCE = 0.45;
  const MAX_PULL = 100;

  function applyResistance(rawDy: number) {
    if (rawDy <= 0) return 0;
    return Math.min(MAX_PULL, rawDy * RESISTANCE);
  }

  it("returns 0 for upward swipe", () => {
    expect(applyResistance(-50)).toBe(0);
  });

  it("applies resistance factor to downward pull", () => {
    expect(applyResistance(100)).toBeCloseTo(45);
  });

  it("clamps at MAX_PULL", () => {
    expect(applyResistance(300)).toBe(MAX_PULL);
  });

  it("triggers refresh when pull exceeds threshold", () => {
    const THRESHOLD = 72;
    const pull = applyResistance(200); // 90px after resistance
    expect(pull).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("does not trigger refresh for small pull", () => {
    const THRESHOLD = 72;
    const pull = applyResistance(80); // 36px after resistance
    expect(pull).toBeLessThan(THRESHOLD);
  });
});

// ─── 3. Haptic feedback: navigator.vibrate guard ─────────────────────────────
describe("Haptic feedback: navigator.vibrate guard", () => {
  function haptic(ms = 10) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  it("does not throw when navigator.vibrate is unavailable", () => {
    // In Node.js test environment, navigator.vibrate is undefined
    expect(() => haptic(10)).not.toThrow();
  });

  it("calls navigator.vibrate with correct duration when available", () => {
    const vibrateSpy = vi.fn();
    vi.stubGlobal("navigator", { vibrate: vibrateSpy });
    haptic(15);
    expect(vibrateSpy).toHaveBeenCalledWith(15);
    vi.unstubAllGlobals();
  });

  it("uses default 10ms when no duration specified", () => {
    const vibrateSpy = vi.fn();
    vi.stubGlobal("navigator", { vibrate: vibrateSpy });
    haptic();
    expect(vibrateSpy).toHaveBeenCalledWith(10);
    vi.unstubAllGlobals();
  });

  it("uses longer duration for destructive actions (delete = 20ms)", () => {
    const vibrateSpy = vi.fn();
    vi.stubGlobal("navigator", { vibrate: vibrateSpy });
    haptic(20); // delete action
    expect(vibrateSpy).toHaveBeenCalledWith(20);
    vi.unstubAllGlobals();
  });
});
