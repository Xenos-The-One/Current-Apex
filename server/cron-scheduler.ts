/**
 * Node-cron scheduler for automation processing
 * This runs inside the Express server - no external cron needed!
 */

import cron from "node-cron";
import { processPendingAutomations } from "./automation";

export function startAutomationScheduler() {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    console.log("[Cron] Running automation processor...");
    
    try {
      const processed = await processPendingAutomations();
      console.log(`[Cron] Processed ${processed} automation steps`);
    } catch (error) {
      console.error("[Cron] Error processing automations:", error);
    }
  });

  console.log("[Cron] Automation scheduler started (runs every 5 minutes)");
}
