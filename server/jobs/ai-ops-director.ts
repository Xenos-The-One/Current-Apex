import cron from "node-cron";
import { sendDailyStandups, sendWeeklyStrategy, sendWeeklyReport } from "../ai-operations-director";

/**
 * AI Operations Director - Scheduled SMS Jobs
 * 
 * Daily Standups: 8:00 AM PST (Monday-Friday)
 * Weekly Strategy: Sunday 6:00 PM PST
 * Weekly Report: Friday 5:00 PM PST
 */

export function startAIOpsCron() {
  console.log("[AI Ops Director] Starting scheduled SMS jobs...");

  // Daily Standups - 8:00 AM PST (Monday-Friday)
  // PST is UTC-8, so 8 AM PST = 16:00 UTC (4 PM UTC)
  // Cron format: seconds minutes hours day-of-month month day-of-week
  cron.schedule("0 0 8 * * 1-5", async () => {
    console.log("[AI Ops Director] Sending daily standups...");
    try {
      await sendDailyStandups();
      console.log("[AI Ops Director] Daily standups sent successfully");
    } catch (error) {
      console.error("[AI Ops Director] Error sending daily standups:", error);
    }
  }, {
    timezone: "America/Los_Angeles" // PST/PDT timezone
  });

  // Weekly Strategy - Sunday 6:00 PM PST
  cron.schedule("0 0 18 * * 0", async () => {
    console.log("[AI Ops Director] Sending weekly strategy...");
    try {
      await sendWeeklyStrategy();
      console.log("[AI Ops Director] Weekly strategy sent successfully");
    } catch (error) {
      console.error("[AI Ops Director] Error sending weekly strategy:", error);
    }
  }, {
    timezone: "America/Los_Angeles"
  });

  // Weekly Report - Friday 5:00 PM PST
  cron.schedule("0 0 17 * * 5", async () => {
    console.log("[AI Ops Director] Sending weekly report...");
    try {
      await sendWeeklyReport();
      console.log("[AI Ops Director] Weekly report sent successfully");
    } catch (error) {
      console.error("[AI Ops Director] Error sending weekly report:", error);
    }
  }, {
    timezone: "America/Los_Angeles"
  });

  console.log("[AI Ops Director] ✅ Scheduled SMS jobs active:");
  console.log("  • Daily Standups: 8:00 AM PST (Mon-Fri)");
  console.log("  • Weekly Strategy: Sunday 6:00 PM PST");
  console.log("  • Weekly Report: Friday 5:00 PM PST");
}
