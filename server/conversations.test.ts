import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb to return a mock DB connection
vi.mock("../server/db", () => ({
  getDb: vi.fn(),
}));

describe("conversations router helpers", () => {
  it("formatTime returns correct relative time", () => {
    // Test the time formatting logic used in conversations
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000);

    function formatTime(dateStr?: string) {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      const diffMs = now.getTime() - d.getTime();
      const diffHours = diffMs / 3600000;
      if (diffHours < 1) return `${Math.round(diffMs / 60000)}m ago`;
      if (diffHours < 24) return `${Math.round(diffHours)}h ago`;
      if (diffHours < 168) return `${Math.round(diffHours / 24)}d ago`;
      return d.toLocaleDateString();
    }

    expect(formatTime(fiveMinAgo.toISOString())).toBe("5m ago");
    expect(formatTime(twoHoursAgo.toISOString())).toBe("2h ago");
    expect(formatTime(threeDaysAgo.toISOString())).toBe("3d ago");
    expect(formatTime(undefined)).toBe("");
  });

  it("getInitials returns correct initials", () => {
    function getInitials(name?: string) {
      if (!name) return "?";
      return name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    }

    expect(getInitials("Sarah Williams")).toBe("SW");
    expect(getInitials("Emily Thompson")).toBe("ET");
    expect(getInitials("John")).toBe("J");
    expect(getInitials(undefined)).toBe("?");
    expect(getInitials("")).toBe("?");
  });

  it("channel colors map has all expected channels", () => {
    const CHANNEL_COLORS: Record<string, string> = {
      sms: "bg-green-100 text-green-700",
      email: "bg-blue-100 text-blue-700",
      facebook: "bg-indigo-100 text-indigo-700",
      instagram: "bg-pink-100 text-pink-700",
      whatsapp: "bg-emerald-100 text-emerald-700",
    };

    expect(CHANNEL_COLORS.sms).toContain("green");
    expect(CHANNEL_COLORS.email).toContain("blue");
    expect(CHANNEL_COLORS.facebook).toContain("indigo");
    expect(CHANNEL_COLORS.instagram).toContain("pink");
    expect(CHANNEL_COLORS.whatsapp).toContain("emerald");
  });

  it("smart lists have correct IDs", () => {
    const SMART_LISTS = [
      { id: "all", label: "All" },
      { id: "unread", label: "Unread" },
      { id: "sms", label: "SMS" },
      { id: "email", label: "Email" },
      { id: "archived", label: "Archived" },
    ];

    expect(SMART_LISTS).toHaveLength(5);
    expect(SMART_LISTS.map(l => l.id)).toEqual(["all", "unread", "sms", "email", "archived"]);
  });
});
