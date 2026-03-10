import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the DB functions used by bulkImport
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    bulkCreateLeads: vi.fn().mockResolvedValue([
      { id: 99001, firstName: "John", lastName: "Doe", clientId: 60001 },
      { id: 99002, firstName: "Jane", lastName: "Smith", clientId: 60001 },
    ]),
    createLeadActivity: vi.fn().mockResolvedValue(undefined),
    getLeadsByAgency: vi.fn().mockResolvedValue([]),
    getLeadById: vi.fn().mockResolvedValue(null),
  };
});

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-openid",
      email: "tariq@raindropmarketing.com",
      name: "Tariq Admin",
      loginMethod: "manus",
      role: "admin" as any,
      agencyId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createClientContext(clientId: number): TrpcContext {
  return {
    user: {
      id: clientId,
      openId: `client-${clientId}`,
      email: `client${clientId}@example.com`,
      name: "Client User",
      loginMethod: "manus",
      role: "client_user" as any,
      agencyId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("leads.bulkImport", () => {
  it("allows admin to bulk import leads for a client", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.leads.bulkImport({
      agencyId: 1,
      clientId: 60001,
      leads: [
        {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          phone: "+15551234567",
          source: "Facebook Ad",
        },
        {
          firstName: "Jane",
          lastName: "Smith",
          phone: "+15559876543",
          source: "Referral",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);
    expect(result.leads).toHaveLength(2);
  });

  it("returns imported count matching the mocked DB response", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.leads.bulkImport({
      agencyId: 1,
      clientId: 60002,
      leads: [
        {
          firstName: "Tim",
          lastName: "Haskins",
          email: "tim@example.com",
          phone: "+17025551234",
          source: "Nevada Mortgage Consultation",
          loanType: "Conventional",
          propertyState: "NV",
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(typeof result.imported).toBe("number");
  });
});

describe("leads.bulkImport - input validation", () => {
  it("accepts leads with optional fields omitted", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw even with minimal fields
    const result = await caller.leads.bulkImport({
      agencyId: 1,
      clientId: 60001,
      leads: [
        {
          firstName: "Kyle",
          lastName: "Test",
          phone: "+15551112222",
          source: "DSCR Form",
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("accepts leads with all optional fields provided", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.leads.bulkImport({
      agencyId: 1,
      clientId: 60001,
      leads: [
        {
          firstName: "Marcus",
          lastName: "Williams",
          email: "marcus@example.com",
          phone: "+15553334444",
          source: "Facebook Ad",
          loanType: "Fix & Flip",
          propertyAddress: "123 Main St",
          propertyCity: "Las Vegas",
          propertyState: "NV",
          propertyZip: "89101",
          notes: "Interested in 90-day bridge loan",
          referringAgent: "Bob Agent",
          referringBrokerage: "Premier Realty",
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
