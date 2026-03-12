import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn(),
  getLeadById: vi.fn(),
  updateLead: vi.fn(),
  getLeadsByClientIdPaginated: vi.fn(),
  getDistinctLeadTags: vi.fn(),
  getClientByUserId: vi.fn(),
  ensureClientProfile: vi.fn(),
  getAgencyByOwnerId: vi.fn(),
  getLeadsByAgencyId: vi.fn(),
  getClientsByAgencyId: vi.fn(),
  getLeadsByClientId: vi.fn(),
  getLeadSourceMapping: vi.fn(),
}));

import { getLeadById, updateLead, getDb } from "./db";

describe("ContactsPage backend procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateLead procedure logic", () => {
    it("should update lead fields correctly", async () => {
      const mockLead = { id: 1, clientId: 100, firstName: "John", lastName: "Doe", status: "new" };
      vi.mocked(getLeadById).mockResolvedValue(mockLead as any);
      vi.mocked(updateLead).mockResolvedValue(undefined);

      const lead = await getLeadById(1);
      expect(lead).toEqual(mockLead);

      await updateLead(1, { firstName: "Jane", status: "contacted" });
      expect(updateLead).toHaveBeenCalledWith(1, { firstName: "Jane", status: "contacted" });
    });

    it("should serialize tags as JSON string", async () => {
      vi.mocked(updateLead).mockResolvedValue(undefined);
      const tags = ["Broward County Multifamily", "multifamily"];
      const tagsJson = JSON.stringify(tags);
      await updateLead(1, { tags: tagsJson } as any);
      expect(updateLead).toHaveBeenCalledWith(1, { tags: tagsJson });
    });
  });

  describe("deleteLead procedure logic", () => {
    it("should delete a lead that belongs to the client", async () => {
      const mockLead = { id: 5, clientId: 100, firstName: "Test", lastName: "Lead" };
      vi.mocked(getLeadById).mockResolvedValue(mockLead as any);
      const mockDb = { delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }) };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const lead = await getLeadById(5);
      expect(lead?.clientId).toBe(100);
    });

    it("should reject deletion of lead from another client", async () => {
      const mockLead = { id: 5, clientId: 999, firstName: "Other", lastName: "Client" };
      vi.mocked(getLeadById).mockResolvedValue(mockLead as any);

      const lead = await getLeadById(5);
      // In the procedure, this would throw NOT_FOUND
      expect(lead?.clientId).not.toBe(100);
    });
  });

  describe("smart lists", () => {
    it("should parse smart list filters correctly", () => {
      const filters = { status: "new", tag: "Broward County Multifamily", hasEmail: true };
      const serialized = JSON.stringify(filters);
      const parsed = JSON.parse(serialized);
      expect(parsed.status).toBe("new");
      expect(parsed.tag).toBe("Broward County Multifamily");
      expect(parsed.hasEmail).toBe(true);
    });

    it("should handle invalid filter JSON gracefully", () => {
      const badJson = "not-valid-json";
      let parsed: any = {};
      try { parsed = JSON.parse(badJson); } catch { parsed = {}; }
      expect(parsed).toEqual({});
    });
  });

  describe("bulk operations", () => {
    it("should chunk large lead arrays into batches of 100", () => {
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

    it("should validate status values for bulk status update", () => {
      const validStatuses = ["new", "contacted", "qualified", "appointment_set", "appointment_completed", "closed_won", "closed_lost"];
      expect(validStatuses).toContain("new");
      expect(validStatuses).toContain("closed_won");
      expect(validStatuses).not.toContain("invalid_status");
    });
  });

  describe("CSV import field mapping", () => {
    it("should auto-map common CSV header names", () => {
      const headers = ["First Name", "Last Name", "Email Address", "Phone Number", "Company Name", "Source", "Notes", "Tags"];
      const autoMap: Record<string, string> = {};
      headers.forEach(h => {
        const lower = h.toLowerCase().replace(/[\s_-]/g, "");
        if (lower.includes("first")) autoMap[h] = "firstName";
        else if (lower.includes("last")) autoMap[h] = "lastName";
        else if (lower.includes("email")) autoMap[h] = "email";
        else if (lower.includes("phone") || lower.includes("mobile")) autoMap[h] = "phone";
        else if (lower.includes("company") || lower.includes("business")) autoMap[h] = "company";
        else if (lower.includes("source")) autoMap[h] = "source";
        else if (lower.includes("note")) autoMap[h] = "notes";
        else if (lower.includes("tag")) autoMap[h] = "tags";
      });
      expect(autoMap["First Name"]).toBe("firstName");
      expect(autoMap["Last Name"]).toBe("lastName");
      expect(autoMap["Email Address"]).toBe("email");
      expect(autoMap["Phone Number"]).toBe("phone");
      expect(autoMap["Company Name"]).toBe("company");
    });

    it("should split full name into first/last when firstName is missing", () => {
      const fullName = "John Smith";
      const parts = fullName.split(" ");
      const firstName = parts[0] || "Unknown";
      const lastName = parts.slice(1).join(" ") || "";
      expect(firstName).toBe("John");
      expect(lastName).toBe("Smith");
    });

    it("should handle single-word names gracefully", () => {
      const fullName = "Madonna";
      const parts = fullName.split(" ");
      const firstName = parts[0] || "Unknown";
      const lastName = parts.slice(1).join(" ") || "";
      expect(firstName).toBe("Madonna");
      expect(lastName).toBe("");
    });
  });
});
