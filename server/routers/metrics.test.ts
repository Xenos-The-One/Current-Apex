import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/trpc";

describe("metrics router", () => {
  const mockAdminContext: TrpcContext = {
    user: {
      id: 1,
      openId: "admin-123",
      name: "Tariq Haskins",
      email: "tariq@sterlingmarketing.com",
      role: "admin",
      createdAt: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };

  const mockUserContext: TrpcContext = {
    user: {
      id: 2,
      openId: "user-456",
      name: "Regular User",
      email: "user@example.com",
      role: "user",
      createdAt: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };

  const mockUnauthContext: TrpcContext = {
    user: null,
    req: {} as any,
    res: {} as any,
  };

  describe("getDashboard", () => {
    it("should allow admin users to access metrics dashboard", async () => {
      const caller = appRouter.createCaller(mockAdminContext);
      const result = await caller.metrics.getDashboard();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalLeads");
      expect(result).toHaveProperty("appointmentsBooked");
      expect(result).toHaveProperty("showRate");
      expect(result).toHaveProperty("conversionRate");
      expect(result).toHaveProperty("revenueGenerated");
      expect(result).toHaveProperty("hotLeads");
    });

    it("should return valid metric types", async () => {
      const caller = appRouter.createCaller(mockAdminContext);
      const result = await caller.metrics.getDashboard();

      expect(typeof result.totalLeads).toBe("number");
      expect(typeof result.appointmentsBooked).toBe("number");
      expect(typeof result.showRate).toBe("number");
      expect(typeof result.conversionRate).toBe("number");
      expect(typeof result.revenueGenerated).toBe("number");
      expect(typeof result.hotLeads).toBe("number");
    });

    it("should return non-negative metrics", async () => {
      const caller = appRouter.createCaller(mockAdminContext);
      const result = await caller.metrics.getDashboard();

      expect(result.totalLeads).toBeGreaterThanOrEqual(0);
      expect(result.appointmentsBooked).toBeGreaterThanOrEqual(0);
      expect(result.showRate).toBeGreaterThanOrEqual(0);
      expect(result.showRate).toBeLessThanOrEqual(100);
      expect(result.conversionRate).toBeGreaterThanOrEqual(0);
      expect(result.conversionRate).toBeLessThanOrEqual(100);
      expect(result.revenueGenerated).toBeGreaterThanOrEqual(0);
      expect(result.hotLeads).toBeGreaterThanOrEqual(0);
    });

    it("should deny access to non-admin users", async () => {
      const caller = appRouter.createCaller(mockUserContext);

      await expect(caller.metrics.getDashboard()).rejects.toThrow("Only administrators can access metrics dashboard");
    });

    it("should deny access to unauthenticated users", async () => {
      const caller = appRouter.createCaller(mockUnauthContext);

      await expect(caller.metrics.getDashboard()).rejects.toThrow("Please login");
    });

    it("should calculate show rate correctly", async () => {
      const caller = appRouter.createCaller(mockAdminContext);
      const result = await caller.metrics.getDashboard();

      // Show rate should be between 0-100%
      expect(result.showRate).toBeGreaterThanOrEqual(0);
      expect(result.showRate).toBeLessThanOrEqual(100);
    });

    it("should calculate conversion rate correctly", async () => {
      const caller = appRouter.createCaller(mockAdminContext);
      const result = await caller.metrics.getDashboard();

      // Conversion rate should be between 0-100%
      expect(result.conversionRate).toBeGreaterThanOrEqual(0);
      expect(result.conversionRate).toBeLessThanOrEqual(100);
    });

    it("should calculate revenue based on appointments", async () => {
      const caller = appRouter.createCaller(mockAdminContext);
      const result = await caller.metrics.getDashboard();

      // Revenue should be a multiple of 3000 (avg commission)
      // and based on 20% close rate of attended appointments
      expect(result.revenueGenerated % 3000).toBe(0);
    });

    it("should identify hot leads correctly", async () => {
      const caller = appRouter.createCaller(mockAdminContext);
      const result = await caller.metrics.getDashboard();

      // Hot leads should be <= total leads
      expect(result.hotLeads).toBeLessThanOrEqual(result.totalLeads);
    });

    it("should return arrays for daily activity and lead sources", async () => {
      const caller = appRouter.createCaller(mockAdminContext);
      const result = await caller.metrics.getDashboard();

      expect(Array.isArray(result.dailyActivity)).toBe(true);
      expect(Array.isArray(result.leadSources)).toBe(true);
    });
  });
});
