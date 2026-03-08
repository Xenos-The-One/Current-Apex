/**
 * Cron job to process scheduled Vapi calls
 * Run this every minute: * * * * * cd /home/ubuntu/agency-crm && npx tsx server/cron-lead-automation.ts
 */

import { processScheduledCalls } from "./lead-automation";

async function main() {
  console.log(`[${new Date().toISOString()}] Running lead automation cron job...`);
  
  try {
    await processScheduledCalls();
    console.log(`[${new Date().toISOString()}] Lead automation cron job completed successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Lead automation cron job failed:`, error);
    process.exit(1);
  }
}

main();
