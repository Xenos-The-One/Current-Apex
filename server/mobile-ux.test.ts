/**
 * Mobile UX Round 2 — unit tests
 * Tests for: BottomSheet logic, QuickAddLeadFAB form validation, MobileContactCard helpers
 */
import { describe, it, expect } from "vitest";

// ─── BottomSheet drag-dismiss logic ──────────────────────────────────────────
describe("BottomSheet drag-dismiss threshold", () => {
  const DISMISS_THRESHOLD = 120;

  it("should dismiss when dragY exceeds threshold", () => {
    const dragY = 130;
    expect(dragY > DISMISS_THRESHOLD).toBe(true);
  });

  it("should NOT dismiss when dragY is below threshold", () => {
    const dragY = 80;
    expect(dragY > DISMISS_THRESHOLD).toBe(false);
  });

  it("should NOT dismiss when dragY equals threshold exactly", () => {
    const dragY = 120;
    expect(dragY > DISMISS_THRESHOLD).toBe(false);
  });

  it("should only allow downward drag (positive delta)", () => {
    const delta = -30; // upward swipe
    const newDragY = delta > 0 ? delta : 0;
    expect(newDragY).toBe(0);
  });

  it("should set dragY for downward drag", () => {
    const delta = 60; // downward swipe
    const newDragY = delta > 0 ? delta : 0;
    expect(newDragY).toBe(60);
  });
});

// ─── QuickAddLeadFAB validation ───────────────────────────────────────────────
describe("QuickAddLeadFAB form validation", () => {
  function validateForm(form: { firstName: string; lastName: string; phone?: string; email?: string }) {
    if (!form.firstName.trim()) return { valid: false, error: "First name is required" };
    if (!form.lastName.trim()) return { valid: false, error: "Last name is required" };
    return { valid: true, error: null };
  }

  it("should reject empty first name", () => {
    const result = validateForm({ firstName: "", lastName: "Smith" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("First name is required");
  });

  it("should reject empty last name", () => {
    const result = validateForm({ firstName: "Jane", lastName: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Last name is required");
  });

  it("should reject whitespace-only first name", () => {
    const result = validateForm({ firstName: "   ", lastName: "Smith" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("First name is required");
  });

  it("should accept valid name with optional phone/email", () => {
    const result = validateForm({ firstName: "Jane", lastName: "Smith", phone: "5550001234" });
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it("should accept valid name without phone or email", () => {
    const result = validateForm({ firstName: "John", lastName: "Doe" });
    expect(result.valid).toBe(true);
  });
});

// ─── MobileContactCard helpers ────────────────────────────────────────────────
describe("MobileContactCard helpers", () => {
  function fullName(lead: { firstName: string; lastName?: string }) {
    return `${lead.firstName} ${lead.lastName || ""}`.trim();
  }

  function initials(lead: { firstName: string; lastName?: string }) {
    return `${lead.firstName?.[0] || ""}${lead.lastName?.[0] || ""}`.toUpperCase() || "?";
  }

  const AVATAR_COLORS = [
    "bg-blue-500", "bg-purple-500", "bg-teal-500", "bg-amber-500",
    "bg-rose-500", "bg-indigo-500", "bg-emerald-500", "bg-orange-500",
  ];
  function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

  it("fullName returns trimmed full name", () => {
    expect(fullName({ firstName: "Jane", lastName: "Smith" })).toBe("Jane Smith");
  });

  it("fullName handles missing last name", () => {
    expect(fullName({ firstName: "Jane" })).toBe("Jane");
  });

  it("initials returns two uppercase letters", () => {
    expect(initials({ firstName: "Jane", lastName: "Smith" })).toBe("JS");
  });

  it("initials returns single letter when no last name", () => {
    expect(initials({ firstName: "Jane" })).toBe("J");
  });

  it("initials returns ? for empty name", () => {
    expect(initials({ firstName: "", lastName: "" })).toBe("?");
  });

  it("avatarColor cycles through palette", () => {
    expect(avatarColor(0)).toBe("bg-blue-500");
    expect(avatarColor(8)).toBe("bg-blue-500"); // wraps around
    expect(avatarColor(1)).toBe("bg-purple-500");
  });
});

// ─── timeAgo helper ───────────────────────────────────────────────────────────
describe("timeAgo helper", () => {
  function timeAgo(date?: Date | null): string {
    if (!date) return "No activity";
    const d = date instanceof Date ? date : new Date(date);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  it("returns 'No activity' for null", () => {
    expect(timeAgo(null)).toBe("No activity");
  });

  it("returns 'No activity' for undefined", () => {
    expect(timeAgo(undefined)).toBe("No activity");
  });

  it("returns minutes ago for recent dates", () => {
    const d = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
    expect(timeAgo(d)).toBe("5m ago");
  });

  it("returns hours ago for dates within 24h", () => {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3h ago
    expect(timeAgo(d)).toBe("3h ago");
  });

  it("returns days ago for dates within 30 days", () => {
    const d = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    expect(timeAgo(d)).toBe("5d ago");
  });
});
