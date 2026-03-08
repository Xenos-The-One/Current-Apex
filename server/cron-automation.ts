/**
 * Cron job to process pending automation steps
 * Run this every 5 minutes to send scheduled emails/SMS
 */

import { processPendingAutomations } from "./automation";

async function runAutomationCron() {
  console.log("[Cron] Starting automation processor...");
  
  try {
    const processed = await processPendingAutomations();
    console.log(`[Cron] Processed ${processed} automation steps`);
  } catch (error) {
    console.error("[Cron] Error processing automations:", error);
  }
}

// Run immediately
runAutomationCron()
  .then(() => {
    console.log("[Cron] Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[Cron] Failed:", error);
    process.exit(1);
  });
