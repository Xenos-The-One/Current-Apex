import { getDb } from "./db";
import { leads } from "../drizzle/schema";
import { and, eq, lte, isNotNull, isNull } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

/**
 * Anniversary Automation System
 * 
 * Checks for closing anniversaries (6 months & 1 year) and notifies Tim/Timisha
 * to send personalized HeyGen videos for refinance opportunities.
 * 
 * Runs every hour via cron job in server/_core/index.ts
 */

export async function checkAnniversaries() {
  console.log("[Anniversary Check] Starting anniversary check...");
  
  const now = new Date();
  const db = await getDb();
  
  if (!db) {
    console.error("[Anniversary Check] Database not available");
    return;
  }
  
  try {
    // Check for 6-month anniversaries
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    
    const sixMonthEnd = new Date(sixMonthsAgo);
    sixMonthEnd.setHours(23, 59, 59, 999);
    
    const sixMonthLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          isNotNull(leads.closingDate),
          lte(leads.closingDate, sixMonthEnd),
          eq(leads.sixMonthAnniversaryNotificationSent, false)
        )
      );
    
    console.log(`[Anniversary Check] Found ${sixMonthLeads.length} leads with 6-month anniversaries`);
    
    for (const lead of sixMonthLeads) {
      // Notify Tim/Timisha about 6-month anniversary
      await notifyOwner({
        title: `🎉 6-Month Closing Anniversary - ${lead.firstName} ${lead.lastName}`,
        content: `${lead.firstName} ${lead.lastName} closed their loan 6 months ago! Time to reach out about refinance opportunities.\n\nPhone: ${lead.phone}\nEmail: ${lead.email}\n\nCreate a personalized HeyGen video to congratulate them and ask if they'd like to explore refinancing options.`
      });
      
      // Mark notification as sent
      await db
        .update(leads)
        .set({ sixMonthAnniversaryNotificationSent: true })
        .where(eq(leads.id, lead.id));
      
      console.log(`[Anniversary Check] Sent 6-month anniversary notification for lead ${lead.id}`);
    }
    
    // Check for 1-year anniversaries
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);
    
    const oneYearEnd = new Date(oneYearAgo);
    oneYearEnd.setHours(23, 59, 59, 999);
    
    const oneYearLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          isNotNull(leads.closingDate),
          lte(leads.closingDate, oneYearEnd),
          eq(leads.oneYearAnniversaryNotificationSent, false)
        )
      );
    
    console.log(`[Anniversary Check] Found ${oneYearLeads.length} leads with 1-year anniversaries`);
    
    for (const lead of oneYearLeads) {
      // Notify Tim/Timisha about 1-year anniversary
      await notifyOwner({
        title: `🎊 1-Year Closing Anniversary - ${lead.firstName} ${lead.lastName}`,
        content: `${lead.firstName} ${lead.lastName} closed their loan 1 year ago! Perfect time to reach out about refinance opportunities.\n\nPhone: ${lead.phone}\nEmail: ${lead.email}\n\nCreate a personalized HeyGen video to congratulate them on their 1-year anniversary and discuss refinancing options.`
      });
      
      // Mark notification as sent
      await db
        .update(leads)
        .set({ oneYearAnniversaryNotificationSent: true })
        .where(eq(leads.id, lead.id));
      
      console.log(`[Anniversary Check] Sent 1-year anniversary notification for lead ${lead.id}`);
    }
    
    console.log("[Anniversary Check] Anniversary check complete");
  } catch (error) {
    console.error("[Anniversary Check] Error:", error);
  }
}
