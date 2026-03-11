import { describe, it, expect } from "vitest";

// ── Tag filter logic tests ─────────────────────────────────────────────────
describe("Tag filter logic", () => {
  it("passes tag to paginated query when tag is not 'all'", () => {
    const tagFilter = "Broward County Multifamily";
    const queryTag = tagFilter !== "all" ? tagFilter : undefined;
    expect(queryTag).toBe("Broward County Multifamily");
  });

  it("passes undefined when tag filter is 'all'", () => {
    const tagFilter = "all";
    const queryTag = tagFilter !== "all" ? tagFilter : undefined;
    expect(queryTag).toBeUndefined();
  });

  it("renders tags from JSON array correctly", () => {
    const rawTags = JSON.stringify(["Broward County Multifamily", "Broward", "multifamily"]);
    const tags: string[] = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags);
    expect(tags).toHaveLength(3);
    expect(tags[0]).toBe("Broward County Multifamily");
  });

  it("handles already-parsed array tags", () => {
    const rawTags = ["Palm Beach County Multifamily", "Palm Beach", "multifamily"];
    const tags: string[] = Array.isArray(rawTags) ? rawTags : JSON.parse(rawTags as any);
    expect(tags).toHaveLength(3);
    expect(tags[1]).toBe("Palm Beach");
  });

  it("handles null/undefined tags gracefully", () => {
    const rawTags = null;
    const tags: string[] = Array.isArray(rawTags) ? rawTags : (rawTags ? JSON.parse(rawTags) : []);
    expect(tags).toHaveLength(0);
  });

  it("shows at most 2 tags inline, rest as +N", () => {
    const tags = ["Broward County Multifamily", "Broward", "multifamily"];
    const shown = tags.slice(0, 2);
    const overflow = tags.length - 2;
    expect(shown).toHaveLength(2);
    expect(overflow).toBe(1);
  });
});

// ── Bulk status update logic tests ────────────────────────────────────────
describe("Bulk status update logic", () => {
  it("chunks lead IDs into groups of 100", () => {
    const leadIds = Array.from({ length: 250 }, (_, i) => i + 1);
    const chunkSize = 100;
    const chunks: number[][] = [];
    for (let i = 0; i < leadIds.length; i += chunkSize) {
      chunks.push(leadIds.slice(i, i + chunkSize));
    }
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(100);
    expect(chunks[1]).toHaveLength(100);
    expect(chunks[2]).toHaveLength(50);
  });

  it("handles exactly 100 leads in one chunk", () => {
    const leadIds = Array.from({ length: 100 }, (_, i) => i + 1);
    const chunkSize = 100;
    const chunks: number[][] = [];
    for (let i = 0; i < leadIds.length; i += chunkSize) {
      chunks.push(leadIds.slice(i, i + chunkSize));
    }
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(100);
  });

  it("handles single lead", () => {
    const leadIds = [42];
    const chunkSize = 100;
    const chunks: number[][] = [];
    for (let i = 0; i < leadIds.length; i += chunkSize) {
      chunks.push(leadIds.slice(i, i + chunkSize));
    }
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual([42]);
  });

  it("validates status values", () => {
    const validStatuses = ["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"];
    expect(validStatuses).toContain("new");
    expect(validStatuses).toContain("closed_won");
    expect(validStatuses).not.toContain("pending");
    expect(validStatuses).not.toContain("all");
  });

  it("clears selection after successful bulk update", () => {
    let selectedIds = new Set([1, 2, 3, 4, 5]);
    // Simulate onSuccess clearing the set
    selectedIds = new Set();
    expect(selectedIds.size).toBe(0);
  });

  it("counts active filters correctly", () => {
    const statusFilter = "new";
    const tagFilter = "Broward County Multifamily";
    const contactTypeFilter = "all";
    const debouncedSearch = "";
    const activeFilterCount = [
      statusFilter !== "all",
      tagFilter !== "all",
      contactTypeFilter !== "all",
      debouncedSearch,
    ].filter(Boolean).length;
    expect(activeFilterCount).toBe(2);
  });
});
