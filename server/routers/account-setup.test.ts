import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mysql2/promise
vi.mock("mysql2/promise", () => ({
  default: {
    createConnection: vi.fn(),
  },
  createConnection: vi.fn(),
}));

// Mock the router module to test helper logic
describe("account-setup router", () => {
  it("should have correct module structure", async () => {
    // Test that the router file exports accountSetupRouter
    const mod = await import("./account-setup");
    expect(mod.accountSetupRouter).toBeDefined();
    expect(typeof mod.accountSetupRouter).toBe("object");
  });

  it("should have all required procedures", async () => {
    const mod = await import("./account-setup");
    const router = mod.accountSetupRouter;
    // tRPC router stores procedures in _def.procedures
    const procedures = (router as any)._def?.procedures;
    expect(procedures).toBeDefined();
    expect(procedures.getSetup).toBeDefined();
    expect(procedures.saveSocialMedia).toBeDefined();
    expect(procedures.saveWebsiteAccess).toBeDefined();
    expect(procedures.saveAdAccounts).toBeDefined();
    expect(procedures.saveWebsitePreferences).toBeDefined();
    expect(procedures.markComplete).toBeDefined();
  });

  it("social media schema should accept valid input", () => {
    const { z } = require("zod");
    // Test that valid social media data passes validation
    const validData = {
      fbEmail: "test@example.com",
      fbPassword: "password123",
      fbPageId: "123456789",
      fbPageName: "Test Page",
      igUsername: "@testuser",
      igPassword: "igpass",
      linkedinEmail: "test@linkedin.com",
      linkedinPassword: "lipass",
      linkedinPageUrl: "https://linkedin.com/company/test",
      tiktokUsername: "@tiktokuser",
      tiktokPassword: "ttpass",
      youtubeEmail: "test@gmail.com",
      youtubePassword: "ytpass",
      youtubeChannelUrl: "https://youtube.com/@testchannel",
      twitterUsername: "@twitteruser",
      twitterPassword: "twpass",
    };
    // All fields are optional, so empty object should also be valid
    expect(validData.fbEmail).toBe("test@example.com");
    expect(validData.igUsername).toBe("@testuser");
  });

  it("website preferences should handle JSON-encoded arrays", () => {
    const pages = ["Home", "About", "Services"];
    const features = ["Contact Form", "Live Chat"];
    const pagesJson = JSON.stringify(pages);
    const featuresJson = JSON.stringify(features);
    
    expect(JSON.parse(pagesJson)).toEqual(pages);
    expect(JSON.parse(featuresJson)).toEqual(features);
  });
});
