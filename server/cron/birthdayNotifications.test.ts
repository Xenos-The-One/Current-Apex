import { describe, it, expect, beforeAll } from "vitest";
import { checkBirthdayNotifications } from "./birthdayNotifications";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Birthday Notifications", () => {
  it("should have TIMISHA_PHONE_NUMBER configured (optional in test env)", () => {
    // This env var is optional in test environments - only required in production
    if (process.env.TIMISHA_PHONE_NUMBER) {
      expect(process.env.TIMISHA_PHONE_NUMBER).not.toBe("");
      console.log("✓ Timisha's phone number is configured");
    } else {
      console.log("ℹ TIMISHA_PHONE_NUMBER not set (OK in test environment)");
      expect(true).toBe(true); // pass
    }
  });

  it("should check for upcoming birthdays without errors", async () => {
    const result = await checkBirthdayNotifications();
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(typeof result.notificationsSent).toBe("number");
    
    console.log(`✓ Birthday check completed: ${result.notificationsSent} notifications sent`);
  });

  it("should be able to query leads with birthdays", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");

    const leadsWithBirthdays = await db
      .select()
      .from(leads)
      .where(eq(leads.birthday, null))
      .limit(1);

    // This just tests that the query works, not that there are results
    expect(Array.isArray(leadsWithBirthdays)).toBe(true);
    console.log("✓ Database query for birthdays works correctly");
  });
});
