import { getDb } from "./db";
import { appointments } from "../drizzle/schema";
import { and, gte, lte, eq } from "drizzle-orm";

export interface TimeSlot {
  time: Date;
  available: boolean;
}

/**
 * Get available time slots for a specific date
 * Business hours: 9 AM - 5 PM, 30-minute intervals
 */
export async function getAvailableSlots(agencyId: number, date: Date): Promise<TimeSlot[]> {
  console.log(`[BookingService] Getting available slots for agency ${agencyId} on ${date.toDateString()}`);
  
  const db = await getDb();
  if (!db) {
    console.error("[BookingService] Database unavailable");
    return [];
  }

  // Get start and end of day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Fetch all booked appointments for this date
  const bookedAppointments = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.agencyId, agencyId),
        gte(appointments.appointmentDate, startOfDay),
        lte(appointments.appointmentDate, endOfDay)
      )
    );

  console.log(`[BookingService] Found ${bookedAppointments.length} booked appointments for this date`);

  // Generate all possible slots (9 AM - 5 PM, 30-min intervals)
  const slots: TimeSlot[] = [];
  const now = new Date();

  for (let hour = 9; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, minute, 0, 0);

      // Skip past time slots
      if (slotTime <= now) {
        continue;
      }

      // Check if this slot is booked
      const isBooked = bookedAppointments.some((apt) => {
        const aptTime = new Date(apt.appointmentDate);
        return aptTime.getTime() === slotTime.getTime();
      });

      slots.push({
        time: slotTime,
        available: !isBooked,
      });
    }
  }

  console.log(`[BookingService] Generated ${slots.length} total slots, ${slots.filter(s => s.available).length} available`);
  return slots;
}

/**
 * Book an appointment slot
 */
export async function bookAppointmentSlot(data: {
  agencyId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  appointmentDate: Date;
  loanType?: string;
  propertyAddress?: string;
  notes?: string;
  source?: string;
}): Promise<{
  success: boolean;
  appointmentId?: number;
  error?: string;
}> {
  console.log(`[BookingService] Booking appointment for ${data.firstName} ${data.lastName} on ${data.appointmentDate}`);

  const db = await getDb();
  if (!db) {
    console.error("[BookingService] Database unavailable");
    return {
      success: false,
      error: "Database unavailable",
    };
  }

  try {
    // Check if slot is still available
    const slots = await getAvailableSlots(data.agencyId, data.appointmentDate);
    const requestedSlot = slots.find(
      (slot) => slot.time.getTime() === data.appointmentDate.getTime()
    );

    if (!requestedSlot || !requestedSlot.available) {
      console.error("[BookingService] Slot no longer available");
      return {
        success: false,
        error: "This time slot is no longer available",
      };
    }

    // Create appointment
    const result = await db.insert(appointments).values({
      agencyId: data.agencyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      appointmentDate: data.appointmentDate,
      loanType: data.loanType,
      propertyAddress: data.propertyAddress,
      notes: data.notes,
      source: data.source,
      assignedTo: "loan_officer",
      status: "scheduled",
    });

    const appointmentId = Number((result as any).insertId);
    console.log(`[BookingService] ✅ Appointment created with ID: ${appointmentId}`);

    return {
      success: true,
      appointmentId,
    };
  } catch (error: any) {
    console.error("[BookingService] ❌ Failed to book appointment:", error.message);
    return {
      success: false,
      error: error.message || "Failed to book appointment",
    };
  }
}
