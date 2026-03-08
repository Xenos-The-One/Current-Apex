import { getDb } from "../db";
import { leads, clients } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendSMS } from "../twilio";
import { sendSmartAlert } from "../ai-operations-director";

/**
 * Birthday Notification Cron Job
 * 
 * Runs daily at 9 AM to check for upcoming birthdays
 * Sends SMS to Timisha 3 days before client birthdays
 * Includes client name, birthday, phone, and email
 */

export async function checkBirthdayNotifications() {
  console.log("[Birthday Cron] Starting birthday check...");

  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }
    
    // Get today's date and 3 days from now
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Format dates for comparison (MM-DD only, ignore year)
    const targetMonth = threeDaysFromNow.getMonth() + 1; // 1-12
    const targetDay = threeDaysFromNow.getDate(); // 1-31

    console.log(`[Birthday Cron] Looking for birthdays on ${targetMonth}/${targetDay}`);

    // Find all leads with birthdays in 3 days that haven't been notified yet
    const upcomingBirthdays = await db
      .select({
        lead: leads,
        client: clients,
      })
      .from(leads)
      .innerJoin(clients, eq(leads.clientId, clients.id))
      .where(
        and(
          // Birthday is not null
          sql`${leads.birthday} IS NOT NULL`,
          // Birthday month and day match
          sql`MONTH(${leads.birthday}) = ${targetMonth}`,
          sql`DAY(${leads.birthday}) = ${targetDay}`,
          // Haven't sent notification yet this year
          eq(leads.birthdayNotificationSent, false)
        )
      );

    console.log(`[Birthday Cron] Found ${upcomingBirthdays.length} upcoming birthdays`);

    // Timisha's phone number (hardcoded for now - can be moved to env or client settings)
    const timishaPhone = process.env.TIMISHA_PHONE_NUMBER || "+1234567890"; // TODO: Update with real number

    for (const { lead, client } of upcomingBirthdays) {
      try {
        // Format birthday date
        const birthdayDate = new Date(lead.birthday!);
        const formattedBirthday = birthdayDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        // Format the SMS message
        const message = `🎂 Client Birthday Alert

Name: ${lead.firstName} ${lead.lastName}
Birthday: ${formattedBirthday} (in 3 days)
Phone: ${lead.phone || "Not provided"}
Email: ${lead.email || "Not provided"}

Reply "APPROVE" when you're ready to send the birthday video.`;

        // Send smart alert for birthday today
        await sendSmartAlert("birthday_today", {
          leadName: `${lead.firstName} ${lead.lastName}`,
          leadPhone: lead.phone || "Not provided",
          leadEmail: lead.email || "Not provided",
          birthdayDate: formattedBirthday,
        });
        
        // Send SMS to Timisha
        await sendSMS({
          to: timishaPhone,
          body: message,
        });

        // Mark notification as sent
        await db
          .update(leads)
          .set({
            birthdayNotificationSent: true,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, lead.id));

        console.log(`[Birthday Cron] Sent notification for ${lead.firstName} ${lead.lastName}`);
      } catch (error) {
        console.error(`[Birthday Cron] Error sending notification for lead ${lead.id}:`, error);
        // Continue with other leads even if one fails
      }
    }

    console.log("[Birthday Cron] Birthday check completed");
    return {
      success: true,
      notificationsSent: upcomingBirthdays.length,
    };
  } catch (error) {
    console.error("[Birthday Cron] Error in birthday check:", error);
    throw error;
  }
}

/**
 * Reset birthday notification flags on January 1st
 * This allows notifications to be sent again next year
 */
export async function resetBirthdayNotifications() {
  console.log("[Birthday Cron] Resetting birthday notification flags for new year...");

  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }
    await db
      .update(leads)
      .set({
        birthdayNotificationSent: false,
        birthdayVideoApproved: false,
        updatedAt: new Date(),
      })
      .where(sql`${leads.birthday} IS NOT NULL`);

    console.log("[Birthday Cron] Reset completed");
    return { success: true };
  } catch (error) {
    console.error("[Birthday Cron] Error resetting flags:", error);
    throw error;
  }
}
