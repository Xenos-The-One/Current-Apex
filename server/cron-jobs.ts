/**
 * Centralized cron job management
 * All scheduled tasks run from this file
 */

import cron from 'node-cron';
// import { processScheduledCalls } from './lead-automation'; // Disabled - Tim handles calls manually
import { processWebinarReminders } from './cron-webinar-reminders';
import { checkAnniversaries } from './anniversary-automation';
import { checkBirthdayNotifications } from './cron/birthdayNotifications';
import { operationsAgent } from './agents/operations-agent';
import { analyticsAgent } from './agents/analytics-agent';
import { leadQualificationAgent } from './agents/lead-qualification-agent';
import { salesFollowUpAgent } from './agents/sales-followup-agent';
import { appointmentCoordinationAgent } from './agents/appointment-coordination-agent';
import { clientNurtureAgent } from './agents/client-nurture-agent';
import { webinarManagementAgent } from './agents/webinar-management-agent';
import { contentCreationAgent } from './agents/content-creation-agent';
import { leadGenerationAgent } from './agents/lead-generation-agent';
import { relationshipManagementAgent } from './agents/relationship-management-agent';
import { sendWeeklyScheduleRequest, sendMorningStats, sendEveningRecap } from './team-schedule-system';
import { pollHeyGenVideos } from './jobs/heygen-video-poller';
import { processRefiDrip } from './refi-drip';
import { buildWeeklyContentCalendar } from './agents/viral-topic-agent';
import { processApprovedPackages, fireScheduledPosts } from './agents/social-posting-agent';
import { sendDailyContentDigest } from './jobs/daily-content-digest';
import { processScheduledCampaigns } from './jobs/campaign-scheduler';
import { processSequenceQueue } from './routers/drip-sequences';
import { processPipelineCloseDateReminders } from './cron/pipelineCloseDateReminders';

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  console.log('[Cron] Initializing cron jobs...');

  // === AI AGENTS ===
  
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
  
  // Lead Qualification Agent: Process new leads every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await leadQualificationAgent.processNewLeads();
    } catch (error) {
      console.error('[Lead Qualification Agent] Processing failed:', error);
    }
  });
  
  // Sales Follow-Up Agent: Process follow-ups every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await salesFollowUpAgent.processFollowUps();
    } catch (error) {
      console.error('[Sales Follow-Up Agent] Processing failed:', error);
    }
  });
  
  // Appointment Coordination Agent: 24-hour reminders (check every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      await appointmentCoordinationAgent.send24HourReminders();
    } catch (error) {
      console.error('[Appointment Coordination] 24-hour reminders failed:', error);
    }
  });
  
  // Appointment Coordination Agent: 1-hour reminders (check every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    try {
      await appointmentCoordinationAgent.send1HourReminders();
    } catch (error) {
      console.error('[Appointment Coordination] 1-hour reminders failed:', error);
    }
  });
  
  // Appointment Coordination Agent: No-show handling (check every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    try {
      await appointmentCoordinationAgent.handleNoShows();
    } catch (error) {
      console.error('[Appointment Coordination] No-show handling failed:', error);
    }
  });
  
  // Appointment Coordination Agent: Post-appointment follow-up (check every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      await appointmentCoordinationAgent.sendPostAppointmentFollowUp();
    } catch (error) {
      console.error('[Appointment Coordination] Post-appointment follow-up failed:', error);
    }
  });
  
  // Client Nurture Agent: Process nurture campaigns daily at 10 AM PST
  cron.schedule('0 10 * * *', async () => {
    try {
      await clientNurtureAgent.processNurtureCampaigns();
    } catch (error) {
      console.error('[Client Nurture] Campaign processing failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Client Nurture Agent: Re-engage cold leads weekly on Wednesdays at 10 AM PST
  cron.schedule('0 10 * * 3', async () => {
    try {
      await clientNurtureAgent.reEngageColdLeads();
    } catch (error) {
      console.error('[Client Nurture] Cold lead re-engagement failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Webinar Management Agent: 24-hour reminders (check every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      await webinarManagementAgent.send24HourReminders();
    } catch (error) {
      console.error('[Webinar Management] 24-hour reminders failed:', error);
    }
  });
  
  // Webinar Management Agent: 1-hour reminders (check every 5 minutes)
  cron.schedule('*/5 * * * *', async () => {
    try {
      await webinarManagementAgent.send1HourReminders();
    } catch (error) {
      console.error('[Webinar Management] 1-hour reminders failed:', error);
    }
  });
  
  // Webinar Management Agent: Last chance reminders (check every 2 minutes)
  cron.schedule('*/2 * * * *', async () => {
    try {
      await webinarManagementAgent.sendLastChanceReminders();
    } catch (error) {
      console.error('[Webinar Management] Last chance reminders failed:', error);
    }
  });
  
  // Webinar Management Agent: Post-webinar follow-up (check every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      await webinarManagementAgent.sendPostWebinarFollowUp();
    } catch (error) {
      console.error('[Webinar Management] Post-webinar follow-up failed:', error);
    }
  });
  
  // Content Creation Agent: Weekly content batch on Mondays at 8 AM PST
  cron.schedule('0 8 * * 1', async () => {
    try {
      await contentCreationAgent.generateWeeklyContentBatch();
    } catch (error) {
      console.error('[Content Creation] Weekly content batch failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Lead Generation Agent: Monitor campaigns every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await leadGenerationAgent.monitorAndOptimizeCampaigns();
    } catch (error) {
      console.error('[Lead Generation] Campaign monitoring failed:', error);
    }
  });
  
  // Lead Generation Agent: Optimize budgets daily at 10 AM PST
  cron.schedule('0 10 * * *', async () => {
    try {
      await leadGenerationAgent.optimizeBudgets();
    } catch (error) {
      console.error('[Lead Generation] Budget optimization failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Lead Generation Agent: Weekly report every Monday at 9 AM PST
  cron.schedule('0 9 * * 1', async () => {
    try {
      await leadGenerationAgent.generateWeeklyReport();
    } catch (error) {
      console.error('[Lead Generation] Weekly report failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Relationship Management Agent: Sentiment analysis every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await relationshipManagementAgent.analyzeSentiment();
    } catch (error) {
      console.error('[Relationship Management] Sentiment analysis failed:', error);
    }
  });
  
  // Relationship Management Agent: Upsell detection daily at 11 AM PST
  cron.schedule('0 11 * * *', async () => {
    try {
      await relationshipManagementAgent.detectUpsellOpportunities();
    } catch (error) {
      console.error('[Relationship Management] Upsell detection failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Relationship Management Agent: VIP monitoring daily at 9:30 AM PST
  cron.schedule('30 9 * * *', async () => {
    try {
      await relationshipManagementAgent.monitorVIPClients();
    } catch (error) {
      console.error('[Relationship Management] VIP monitoring failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Relationship Management Agent: Churn prediction daily at 10:30 AM PST
  cron.schedule('30 10 * * *', async () => {
    try {
      await relationshipManagementAgent.predictChurnRisk();
    } catch (error) {
      console.error('[Relationship Management] Churn prediction failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Relationship Management Agent: Referral opportunities weekly on Fridays at 2 PM PST
  cron.schedule('0 14 * * 5', async () => {
    try {
      await relationshipManagementAgent.identifyReferralOpportunities();
    } catch (error) {
      console.error('[Relationship Management] Referral identification failed:', error);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });
  
  // Refi Drip Automation: Process 14-day email sequences every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await processRefiDrip();
    } catch (error) {
      console.error('[RefiDrip] Error processing refi drip sequences:', error);
    }
  });

  // HeyGen Video Poller: Check rendering status every 60 seconds
  cron.schedule('* * * * *', async () => {
    try {
      await pollHeyGenVideos();
    } catch (error) {
      console.error('[HeyGen Poller] Video polling failed:', error);
    }
  });

  // === EXISTING CRON JOBS ===

  // Auto Vapi calls disabled - Tim handles calls manually now
  // cron.schedule('* * * * *', async () => {
  //   try {
  //     await processScheduledCalls();
  //   } catch (error) {
  //     console.error('[Cron] Error processing scheduled calls:', error);
  //   }
  // });

  // Process webinar reminders every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await processWebinarReminders();
    } catch (error) {
      console.error('[Cron] Error processing webinar reminders:', error);
    }
  });

  // Check for closing anniversaries (6 month & 1 year) every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await checkAnniversaries();
    } catch (error) {
      console.error('[Cron] Error checking anniversaries:', error);
    }
  });

  // Check for upcoming birthdays daily at 9 AM PST (5 PM UTC)
  cron.schedule('0 17 * * *', async () => {
    try {
      console.log('[Cron] Running birthday notification check...');
      await checkBirthdayNotifications();
    } catch (error) {
      console.error('[Cron] Error checking birthdays:', error);
    }
  });

  // === TEAM SCHEDULE SYSTEM ===

  // Sunday schedule request to Tim at 2 PM PST (10 PM UTC)
  cron.schedule('0 22 * * 0', async () => {
    try {
      console.log('[Cron] Sending weekly schedule request to Tim...');
      await sendWeeklyScheduleRequest();
    } catch (error) {
      console.error('[Cron] Error sending schedule request:', error);
    }
  });

  // Morning stats Mon-Fri at 8 AM PST (4 PM UTC)
  cron.schedule('0 16 * * 1-5', async () => {
    try {
      console.log('[Cron] Sending morning stats...');
      await sendMorningStats();
    } catch (error) {
      console.error('[Cron] Error sending morning stats:', error);
    }
  });

  // Evening recap Mon-Fri at 6 PM PST (2 AM UTC next day)
  cron.schedule('0 2 * * 2-6', async () => {
    try {
      console.log('[Cron] Sending evening recap...');
      await sendEveningRecap();
    } catch (error) {
      console.error('[Cron] Error sending evening recap:', error);
    }
  });

  // === CONTENT STUDIO AGENTS ===

  // Viral Topic Research: Every Monday at 6 AM PST (2 PM UTC)
  cron.schedule('0 14 * * 1', async () => {
    try {
      console.log('[Cron] Running weekly viral topic research...');
      await buildWeeklyContentCalendar();
    } catch (error) {
      console.error('[Cron] Viral topic research failed:', error);
    }
  }, { timezone: 'America/Los_Angeles' });

  // Social Posting Agent: Every 30 minutes — posts approved packages
  cron.schedule('*/30 * * * *', async () => {
    try {
      await processApprovedPackages();
    } catch (error) {
      console.error('[Cron] Social posting agent failed:', error);
    }
  });

  // Scheduled Posts Executor: Every 5 minutes — fires posts whose scheduled_at time has arrived
  cron.schedule('*/5 * * * *', async () => {
    try {
      await fireScheduledPosts();
    } catch (error) {
      console.error('[Cron] Scheduled posts executor failed:', error);
    }
  });

  // Daily Content Digest: Every day at 8 AM EST — sends pending approvals + unread comments summary to admin
  cron.schedule('0 8 * * *', async () => {
    try {
      await sendDailyContentDigest();
    } catch (error) {
      console.error('[Cron] Daily content digest failed:', error);
    }
  }, { timezone: 'America/New_York' });

  // Campaign Scheduler: Every minute — fires scheduled email/SMS campaigns whose time has arrived
  cron.schedule('* * * * *', async () => {
    try {
      await processScheduledCampaigns();
    } catch (error) {
      console.error('[Cron] Campaign scheduler failed:', error);
    }
  });

  // Drip Sequence Queue: Every 5 minutes — sends due email/SMS steps in follow-up sequences
  cron.schedule('*/5 * * * *', async () => {
    try {
      await processSequenceQueue();
    } catch (error) {
      console.error('[Cron] Drip sequence queue failed:', error);
    }
  });

  // Pipeline Close Date Reminders: Daily at 8 AM ET
  cron.schedule('0 8 * * *', async () => {
    try {
      await processPipelineCloseDateReminders();
    } catch (error) {
      console.error('[Cron] Pipeline close date reminders failed:', error);
    }
  }, { timezone: 'America/New_York' });

  console.log('[Cron] All cron jobs initialized successfully');
  console.log('[Cron] - Scheduled Vapi calls: DISABLED (Tim handles manually)');
  console.log('[Cron] - Webinar reminders: Every 5 minutes');
  console.log('[Cron] - Anniversary checks: Every hour');
  console.log('[Cron] - Birthday checks: Daily at 9 AM PST');
  console.log('[Cron] - Sunday schedule request: 2 PM PST');
  console.log('[Cron] - Morning stats: Mon-Fri 8 AM PST');
  console.log('[Cron] - Evening recap: Mon-Fri 6 PM PST');
  console.log('[Cron] - HeyGen video poller: Every 60 seconds');
  console.log('[Cron] - Refi drip automation: Every hour');
  console.log('[Cron] - Viral topic research: Every Monday 6 AM PST');
  console.log('[Cron] - Social posting agent: Every 30 minutes');
  console.log('[Cron] - Scheduled posts executor: Every 5 minutes');
  console.log('[Cron] - Campaign scheduler: Every minute (email + SMS)');
  console.log('[Cron] - Drip sequence queue: Every 5 minutes');
  console.log('[Cron] - Pipeline close date reminders: Daily at 8 AM ET');
}
