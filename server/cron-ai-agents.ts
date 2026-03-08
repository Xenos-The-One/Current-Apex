/**
 * AI Agents Cron Jobs
 * 
 * Schedules for autonomous AI agents:
 * - Operations Agent: System monitoring every 5 minutes, daily stand-up at 9 AM
 * - Analytics Agent: Anomaly detection every hour, weekly report on Mondays at 9 AM
 */

import cron from 'node-cron';
import { operationsAgent } from './agents/operations-agent';
import { analyticsAgent } from './agents/analytics-agent';

export function initializeAIAgentCrons() {
  console.log('[AI Agents] Initializing cron jobs...');
  
  // Operations Agent: System monitoring every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await operationsAgent.monitorSystems();
      await operationsAgent.checkAgentHealth();
    } catch (error) {
      console.error('[Operations Agent] System monitoring failed:', error);
    }
  });
  
  // Operations Agent: Daily stand-up at 9 AM PST
  cron.schedule('0 9 * * *', async () => {
    try {
      await operationsAgent.sendDailyStandUp();
    } catch (error) {
      console.error('[Operations Agent] Daily stand-up failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Analytics Agent: Anomaly detection every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await analyticsAgent.detectAnomalies();
    } catch (error) {
      console.error('[Analytics Agent] Anomaly detection failed:', error);
    }
  });
  
  // Analytics Agent: Weekly report on Mondays at 9 AM PST
  cron.schedule('0 9 * * 1', async () => {
    try {
      await analyticsAgent.sendWeeklyReport();
    } catch (error) {
      console.error('[Analytics Agent] Weekly report failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  console.log('[AI Agents] Cron jobs initialized:');
  console.log('  - Operations: System monitoring every 5 min, daily stand-up at 9 AM');
  console.log('  - Analytics: Anomaly detection every hour, weekly report Mon 9 AM');
}
