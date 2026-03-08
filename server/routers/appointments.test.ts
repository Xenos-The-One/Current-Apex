import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import type { Request, Response } from "express";

describe("Appointments Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const mockReq = {
      headers: {},
      cookies: {},
    } as Request;

    const mockRes = {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as Response;

    const ctx = await createContext({ req: mockReq, res: mockRes });
    caller = appRouter.createCaller(ctx);
  });

  it("should get available time slots for a date", async () => {
    const today = new Date();
    const result = await caller.appointments.getAvailableSlots({
      agencyId: 1,
      date: today,
    });

    expect(Array.isArray(result)).toBe(true);
    // Should have slots between 9 AM and 5 PM
    if (result.length > 0) {
      // Slots are { time: ISO string, display: formatted string }
      const firstSlot = result[0];
      expect(firstSlot).toHaveProperty('time');
      expect(firstSlot).toHaveProperty('display');
      const slotTime = new Date(firstSlot.time);
      // Verify it's a valid date
      expect(slotTime.getTime()).not.toBeNaN();
    }
  });

  it("should book an appointment", async () => {
    const appointmentDate = new Date();
    appointmentDate.setHours(10, 0, 0, 0); // 10 AM today

    const result = await caller.appointments.bookAppointment({
      agencyId: 1,
      firstName: "Test",
      lastName: "User",
      email: "test@example.com",
      phone: "555-1234",
      appointmentDate,
      loanType: "Purchase",
      source: "Test",
    });

    expect(result.success).toBe(true);
    expect(result.appointmentId).toBeDefined();
  }, 15000);
});
