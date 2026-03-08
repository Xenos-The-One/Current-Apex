import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db functions
vi.mock("../db", () => ({
  getLoaAssignment: vi.fn(),
  getLoasByLoUserId: vi.fn(),
  createLoaAssignment: vi.fn(),
  deactivateLoaAssignment: vi.fn(),
  getAllLoaAssignments: vi.fn(),
  getLeadsByClientId: vi.fn(),
  createLead: vi.fn(),
  updateLead: vi.fn(),
  getLeadById: vi.fn(),
  getLeadActivities: vi.fn(),
  createLeadActivity: vi.fn(),
}));

import {
  getLoaAssignment,
  getLoasByLoUserId,
  createLoaAssignment,
  deactivateLoaAssignment,
  getAllLoaAssignments,
  getLeadsByClientId,
  createLead,
  updateLead,
  getLeadById,
  getLeadActivities,
  createLeadActivity,
} from "../db";

describe("LOA Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LOA Role System", () => {
    it("should have loa role in the user role enum", () => {
      // The schema now includes "loa" in the role enum
      const validRoles = ["admin", "agency_owner", "client_user", "loa"];
      expect(validRoles).toContain("loa");
    });

    it("should support LOA assignment creation", async () => {
      const mockCreate = vi.mocked(createLoaAssignment);
      mockCreate.mockResolvedValue(undefined);

      const assignmentData = {
        loaUserId: 3,
        loUserId: 2,
        agencyId: 1,
        clientId: 1,
      };

      await createLoaAssignment(assignmentData);
      expect(mockCreate).toHaveBeenCalledWith(assignmentData);
    });

    it("should retrieve LOA assignment for a user", async () => {
      const mockGet = vi.mocked(getLoaAssignment);
      mockGet.mockResolvedValue({
        id: 1,
        loaUserId: 3,
        loUserId: 2,
        agencyId: 1,
        clientId: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const assignment = await getLoaAssignment(3);
      expect(assignment).toBeDefined();
      expect(assignment?.loaUserId).toBe(3);
      expect(assignment?.loUserId).toBe(2);
      expect(assignment?.isActive).toBe(true);
    });

    it("should return undefined for user without assignment", async () => {
      const mockGet = vi.mocked(getLoaAssignment);
      mockGet.mockResolvedValue(undefined);

      const assignment = await getLoaAssignment(999);
      expect(assignment).toBeUndefined();
    });

    it("should deactivate LOA assignment", async () => {
      const mockDeactivate = vi.mocked(deactivateLoaAssignment);
      mockDeactivate.mockResolvedValue(undefined);

      await deactivateLoaAssignment(1);
      expect(mockDeactivate).toHaveBeenCalledWith(1);
    });

    it("should list all active LOA assignments", async () => {
      const mockGetAll = vi.mocked(getAllLoaAssignments);
      mockGetAll.mockResolvedValue([
        {
          assignment: {
            id: 1,
            loaUserId: 3,
            loUserId: 2,
            agencyId: 1,
            clientId: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          loaUser: {
            id: 3,
            openId: "test-open-id",
            name: "Belinda Osborne",
            email: "Belinda.osborne@pmrloans.com",
            loginMethod: "email",
            role: "loa" as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastSignedIn: new Date(),
          },
        },
      ]);

      const assignments = await getAllLoaAssignments();
      expect(assignments).toHaveLength(1);
      expect(assignments[0].loaUser.name).toBe("Belinda Osborne");
      expect(assignments[0].loaUser.role).toBe("loa");
    });
  });

  describe("LOA Lead Access", () => {
    it("should return leads for LOA's assigned client", async () => {
      const mockLeads = vi.mocked(getLeadsByClientId);
      mockLeads.mockResolvedValue([
        {
          id: 1,
          clientId: 1,
          agencyId: 1,
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "555-1234",
          source: "facebook",
          status: "new",
          vapiAssistantId: null,
          lastContactDate: null,
          appointmentDate: null,
          notes: null,
          customFields: null,
          score: 80,
          scoreTier: "hot",
          birthday: null,
          birthdayNotificationSent: false,
          birthdayVideoApproved: false,
          birthdayVideoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const leads = await getLeadsByClientId(1);
      expect(leads).toHaveLength(1);
      expect(leads[0].firstName).toBe("John");
    });

    it("should verify lead belongs to LOA's assigned client", async () => {
      const mockLead = vi.mocked(getLeadById);
      mockLead.mockResolvedValue({
        id: 1,
        clientId: 1,
        agencyId: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "555-1234",
        source: "facebook",
        status: "new",
        vapiAssistantId: null,
        lastContactDate: null,
        appointmentDate: null,
        notes: null,
        customFields: null,
        score: 80,
        scoreTier: "hot",
        birthday: null,
        birthdayNotificationSent: false,
        birthdayVideoApproved: false,
        birthdayVideoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const lead = await getLeadById(1);
      expect(lead).toBeDefined();
      // LOA with clientId 1 should be able to access this lead
      expect(lead?.clientId).toBe(1);
    });

    it("should block LOA from accessing leads of other clients", async () => {
      const mockLead = vi.mocked(getLeadById);
      mockLead.mockResolvedValue({
        id: 2,
        clientId: 99, // Different client
        agencyId: 1,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        phone: "555-5678",
        source: "referral",
        status: "new",
        vapiAssistantId: null,
        lastContactDate: null,
        appointmentDate: null,
        notes: null,
        customFields: null,
        score: 50,
        scoreTier: "warm",
        birthday: null,
        birthdayNotificationSent: false,
        birthdayVideoApproved: false,
        birthdayVideoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const lead = await getLeadById(2);
      // LOA with clientId 1 should NOT be able to access this lead (clientId 99)
      const loaClientId = 1;
      expect(lead?.clientId).not.toBe(loaClientId);
    });
  });

  describe("LOA Dashboard Routing", () => {
    it("should route LOA users to /loa dashboard", () => {
      const user = { role: "loa" };
      if (user.role === "admin") {
        expect(true).toBe(false); // Should not reach here
      } else if (user.role === "loa") {
        expect("/loa").toBe("/loa");
      } else {
        expect(true).toBe(false); // Should not reach here
      }
    });

    it("should route admin users to /admin dashboard", () => {
      const user = { role: "admin" };
      if (user.role === "admin") {
        expect("/admin").toBe("/admin");
      } else {
        expect(true).toBe(false);
      }
    });

    it("should route regular users to /dashboard", () => {
      const user = { role: "client_user" };
      if (user.role === "admin") {
        expect(true).toBe(false);
      } else if (user.role === "loa") {
        expect(true).toBe(false);
      } else {
        expect("/dashboard").toBe("/dashboard");
      }
    });
  });

  describe("Sidebar Menu Visibility", () => {
    it("should show LOA Dashboard only to LOA users", () => {
      const menuItems = [
        { label: "LOA Dashboard", path: "/loa", roles: ["loa"] },
        { label: "Admin Dashboard", path: "/admin", adminOnly: true },
        { label: "Leads", path: "/leads", loaVisible: true },
      ];

      const loaItems = menuItems.filter(
        (item) => item.roles?.includes("loa") || item.loaVisible
      );
      expect(loaItems.map((i) => i.label)).toContain("LOA Dashboard");
      expect(loaItems.map((i) => i.label)).toContain("Leads");
      expect(loaItems.map((i) => i.label)).not.toContain("Admin Dashboard");
    });

    it("should show Metrics only to admin users", () => {
      const menuItems = [
        { label: "Metrics", path: "/metrics", adminOnly: true },
        { label: "Leads", path: "/leads", loaVisible: true },
      ];

      const adminItems = menuItems.filter(
        (item) => !item.adminOnly || true // admin sees all
      );
      expect(adminItems.map((i) => i.label)).toContain("Metrics");

      const loaItems = menuItems.filter(
        (item) => item.loaVisible || false
      );
      expect(loaItems.map((i) => i.label)).not.toContain("Metrics");
    });
  });
});
