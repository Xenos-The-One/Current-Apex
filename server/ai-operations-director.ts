import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { createAndPushNotification, sendPushBroadcast } from "./routers/notifications";
import { sendRoutedNotification, NotificationCategory } from "./notification-routing";

/**
 * AI Operations Director - Push Notification system to keep team aligned
 * 
 * TEAM MESSAGING: Uses FREE Web Push notifications (PWA)
 * CUSTOMER CAMPAIGNS: Still uses Twilio SMS + SendGrid Email (separate system)
 * 
 * Sends daily standups, smart alerts, and weekly strategy updates via push notifications
 */

interface TeamMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  email: string | null;
  user_id: number | null;
  daily_standup_enabled: boolean;
  smart_alerts_enabled: boolean;
  weekly_strategy_enabled: boolean;
  weekly_report_enabled: boolean;
}

/**
 * Get all team members from database
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql.raw("SELECT * FROM team_members WHERE daily_standup_enabled = TRUE OR smart_alerts_enabled = TRUE"));
  return result as any as TeamMember[];
}

/**
 * Send notification to a team member via push + in-app inbox
 */
async function notifyTeamMember(
  member: TeamMember,
  type: string,
  title: string,
  body: string,
  priority: string = "normal",
  actionUrl: string = "/notifications"
) {
  try {
    await createAndPushNotification({
      userId: member.user_id || undefined,
      teamMemberId: member.id,
      teamMemberName: member.name,
      type,
      title,
      body,
      priority,
      actionUrl,
    });
    console.log(`[AI Ops Director] Push notification sent to ${member.name}: ${type}`);
  } catch (error) {
    console.error(`[AI Ops Director] Failed to send push to ${member.name}:`, error);
  }
}

/**
 * Send daily standup push notifications to each team member (8 AM PST)
 * Personalized priorities based on role
 */
export async function sendDailyStandups() {
  const team = await getTeamMembers();
  
  const messages: Record<string, string> = {
    "Tariq": await generateTariqStandup(),
    "Timisha": await generateTimishaStandup(),
    "Belinda": await generateBelindaStandup(),
    "Tim Haskins": await generateTimStandup()
  };

  for (const member of team) {
    if (!member.daily_standup_enabled) continue;
    
    const message = messages[member.name] || `Good morning ${member.name}! Ready to crush today?`;
    
    await notifyTeamMember(
      member,
      "daily_standup",
      `AI Ops Director - Daily Standup`,
      message,
      "normal",
      "/notifications"
    );
  }
}

/**
 * Generate Tariq's daily priorities
 */
async function generateTariqStandup(): Promise<string> {
  const db = await getDb();
  if (!db) return "Good morning Tariq! Ready to crush today?";
  
  let hotLeads = 0;
  let webinarRegs = 0;
  
  try {
    const hotLeadsResult = await db.execute(sql.raw(
      "SELECT COUNT(*) as count FROM leads WHERE score_tier = 'hot' AND created_at >= CURDATE()"
    ));
    hotLeads = (hotLeadsResult[0] as any)?.count || 0;
    
    const webinarRegsResult = await db.execute(sql.raw(
      "SELECT COUNT(*) as count FROM webinar_registrations WHERE created_at >= CURDATE()"
    ));
    webinarRegs = (webinarRegsResult[0] as any)?.count || 0;
  } catch (e) {
    // Tables may not exist yet
  }

  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `TARIQ - ${date}

HOT LEADS: ${hotLeads} ready to convert
WEBINAR: ${webinarRegs} new registrations

TODAY'S PRIORITIES:
1. Call ${hotLeads} hot leads (URGENT - strike while hot!)
2. Post 2 videos: DPA + Refinance
3. Review FB ads (CTR/CPL)
4. Check datacrawl scores

GOAL: Book 2+ consultations today`;
}

/**
 * Generate Timisha's daily priorities
 */
async function generateTimishaStandup(): Promise<string> {
  const db = await getDb();
  if (!db) return "Good morning Timisha! Have a great day!";
  
  let birthdayCount = 0;
  
  try {
    const birthdaysResult = await db.execute(sql.raw(
      "SELECT COUNT(*) as count FROM leads WHERE birthday IS NOT NULL AND MONTH(birthday) = MONTH(CURDATE()) AND DAY(birthday) = DAY(CURDATE())"
    ));
    birthdayCount = (birthdaysResult[0] as any)?.count || 0;
  } catch (e) {
    // Table may not exist yet
  }

  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `TIMISHA - ${date}

BIRTHDAYS: ${birthdayCount} calls today

TODAY'S PRIORITIES:
1. ${birthdayCount} birthday calls (do before noon!)
2. Approve HeyGen videos
3. Send datacrawl follow-ups
4. Review engagement scores
5. Update CRM notes

TIP: Birthday calls = referrals!`;
}

/**
 * Generate Belinda's daily priorities
 */
async function generateBelindaStandup(): Promise<string> {
  const db = await getDb();
  if (!db) return "Good morning Belinda! Have a great day!";
  
  let todayAppts = 0;
  
  try {
    const apptResult = await db.execute(sql.raw(
      "SELECT COUNT(*) as count FROM appointments WHERE appointment_date >= CURDATE() AND appointment_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    ));
    todayAppts = (apptResult[0] as any)?.count || 0;
  } catch (e) {
    // Table may not exist yet
  }

  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `BELINDA - ${date}

APPOINTMENTS: ${todayAppts} scheduled for Tim

TODAY'S PRIORITIES:
1. Send appt reminders (24h + 1h)
2. Process new datacrawl leads
3. Update calendar with bookings
4. Reschedule no-shows

GOAL: Zero no-shows today!`;
}

/**
 * Generate Tim's daily priorities
 */
async function generateTimStandup(): Promise<string> {
  const db = await getDb();
  if (!db) return "Good morning Tim! Have a great day!";
  
  let apptCount = 0;
  let dpaLeads = 0;
  
  try {
    const apptResult = await db.execute(sql.raw(
      "SELECT COUNT(*) as count FROM appointments WHERE appointment_date >= CURDATE() AND appointment_date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)"
    ));
    apptCount = (apptResult[0] as any)?.count || 0;

    const dpaLeadsResult = await db.execute(sql.raw(
      "SELECT COUNT(*) as count FROM leads WHERE source LIKE '%dpa%' AND created_at >= CURDATE()"
    ));
    dpaLeads = (dpaLeadsResult[0] as any)?.count || 0;
  } catch (e) {
    // Tables may not exist yet
  }

  const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `TIM - ${date}

TODAY'S SCHEDULE: ${apptCount} consultations booked
NEW LEADS: ${dpaLeads} new DPA leads to review

PRIORITY: Prep for consultations - review lead notes before each call!`;
}

/**
 * Send smart alert push notification when specific triggers happen
 */
export async function sendSmartAlert(alertType: string, data: any) {
  const team = await getTeamMembers();
  
  const alertTypeMap: Record<string, string> = {
    "new_lead": "new_lead",
    "hot_lead": "hot_lead",
    "birthday_today": "birthday_alert",
    "appointment_no_show": "no_show_alert",
    "appointment_booked": "appointment_booked",
    "lead_status_change": "lead_status_change",
    "webinar_milestone": "webinar_milestone",
    "ad_spend_threshold": "ad_spend_alert",
  };

  const alerts: Record<string, { recipients: string[], title: string, message: string, priority: string, actionUrl: string }> = {
    "new_lead": {
      recipients: ["Tariq", "Tim Haskins"],
      title: "🆕 New Lead Captured!",
      message: `${data.leadName || data.name || 'Unknown'} from ${data.leadSource || data.source || 'Unknown'}\nPhone: ${data.leadPhone || data.phone || 'N/A'}\n\nAction: Follow up within 5 minutes!`,
      priority: "high",
      actionUrl: "/leads",
    },
    "appointment_booked": {
      recipients: ["Tariq", "Tim Haskins"],
      title: "📅 Appointment Booked!",
      message: `${data.name || 'Unknown'} booked for ${data.date || 'TBD'}\nPhone: ${data.phone || 'N/A'}`,
      priority: "high",
      actionUrl: "/appointments",
    },
    "lead_status_change": {
      recipients: ["Tariq", "Tim Haskins"],
      title: `Lead Status: ${data.newStatus || 'Updated'}`,
      message: `${data.name || 'Unknown'}: ${data.oldStatus || '?'} → ${data.newStatus || '?'}`,
      priority: "normal",
      actionUrl: "/leads",
    },
    "hot_lead": {
      recipients: ["Tariq", "Tim Haskins"],
      title: "HOT LEAD ALERT",
      message: `${data.name} (${data.phone})\nScore: ${data.score}/140\nSource: ${data.source}\n\nAction: Call within 5 minutes!`,
      priority: "urgent",
      actionUrl: "/leads",
    },
    "birthday_today": {
      recipients: ["Timisha"],
      title: "Birthday Today!",
      message: `${data.name}'s birthday is today!\n\nMake the call and wish them well!`,
      priority: "high",
      actionUrl: "/birthdays",
    },
    "appointment_no_show": {
      recipients: ["Tim Haskins", "Belinda"],
      title: "NO-SHOW ALERT",
      message: `${data.name} missed their ${data.time} appointment.\n\nAction: Send reschedule link immediately!`,
      priority: "urgent",
      actionUrl: "/appointments",
    },
    "webinar_milestone": {
      recipients: ["Tariq"],
      title: "Webinar Milestone!",
      message: `${data.count} registrations for Feb 19th webinar!\n\nKeep promoting - let's hit 100!`,
      priority: "normal",
      actionUrl: "/analytics",
    },
    "ad_spend_threshold": {
      recipients: ["Tariq"],
      title: "Ad Spend Alert",
      message: `Facebook ads: $${data.spend} spent today\nCPL: $${data.cpl}\n\nAction: Review performance and adjust if needed!`,
      priority: "high",
      actionUrl: "/analytics",
    }
  };

  const alert = alerts[alertType];
  if (!alert) {
    console.error(`[AI Ops Director] Unknown alert type: ${alertType}`);
    return;
  }

  for (const member of team) {
    if (!member.smart_alerts_enabled) continue;
    if (!alert.recipients.includes(member.name)) continue;
    
    await notifyTeamMember(
      member,
      alertTypeMap[alertType] || "custom",
      `AI Ops - ${alert.title}`,
      alert.message,
      alert.priority,
      alert.actionUrl
    );
  }

  // Also send routed email notification
  const emailCategoryMap: Record<string, NotificationCategory> = {
    "hot_lead": "lead_hot",
    "birthday_today": "agent_report",
    "appointment_no_show": "appointment_noshow",
    "webinar_milestone": "webinar_milestone",
    "ad_spend_threshold": "campaign_update",
  };
  const emailCategory = emailCategoryMap[alertType];
  if (emailCategory) {
    await sendRoutedNotification({
      category: emailCategory,
      subject: `[Sterling CRM] ${alert.title}`,
      html: `<div style="font-family: Arial, sans-serif;"><h2>${alert.title}</h2><p>${alert.message.replace(/\n/g, '<br>')}</p></div>`,
    }).catch(err => console.error(`[AI Ops Director] Email routing failed:`, err));
  }
}

/**
 * Send weekly strategy push notification (Sunday 6 PM PST)
 */
export async function sendWeeklyStrategy() {
  const team = await getTeamMembers();
  const strategy = await generateWeeklyStrategy();

  for (const member of team) {
    if (!member.weekly_strategy_enabled) continue;
    
    await notifyTeamMember(
      member,
      "weekly_strategy",
      "AI Ops Director - Weekly Strategy",
      strategy,
      "normal",
      "/notifications"
    );
  }
}

async function generateWeeklyStrategy(): Promise<string> {
  return `WEEK AHEAD GAME PLAN

THIS WEEK'S FOCUS:
1. DPA Webinar Prep (Feb 19th)
   - Promote on all channels
   - Goal: 100 agent registrations
   
2. Datacrawl Lead Nurturing
   - 50+ old leads in nurture sequence
   - Watch for hot leads to refer back

3. Facebook Ads Optimization
   - Monitor CPL (target: under $15)
   - Test new ad creative
   - Scale what's working

4. Content Creation
   - 5 social media posts
   - 2 HeyGen videos
   - 1 email blast

TEAM PRIORITIES:
Tariq: Lead follow-up + ad management
Timisha: Birthday calls + video approval
Belinda: Appointment scheduling + datacrawl
Tim: Consultations + webinar prep`;
}

/**
 * Send weekly performance report push notification (Friday 5 PM PST)
 */
export async function sendWeeklyReport() {
  const team = await getTeamMembers();
  const report = await generateWeeklyReport();

  for (const member of team) {
    if (!member.weekly_report_enabled) continue;
    
    await notifyTeamMember(
      member,
      "weekly_report",
      "AI Ops Director - Weekly Report",
      report,
      "normal",
      "/analytics"
    );
  }
}

async function generateWeeklyReport(): Promise<string> {
  const db = await getDb();
  if (!db) return "Great work this week team!";
  
  let leadsCount = 0;
  let apptCount = 0;
  
  try {
    const leadsResult = await db.execute(sql.raw(
      "SELECT COUNT(*) as count FROM leads WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
    ));
    leadsCount = (leadsResult[0] as any)?.count || 0;

    const apptResult = await db.execute(sql.raw(
      "SELECT COUNT(*) as count FROM appointments WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
    ));
    apptCount = (apptResult[0] as any)?.count || 0;
  } catch (e) {
    // Tables may not exist yet
  }

  return `WEEKLY PERFORMANCE REPORT

THIS WEEK'S WINS:
- ${leadsCount} new leads generated
- ${apptCount} appointments booked
- Automation system running
- 3 landing pages live

KEY METRICS:
- Lead conversion rate: Tracking
- Appointment show rate: Tracking
- Webinar registrations: Growing

NEXT WEEK FOCUS:
1. Scale Facebook ads
2. Follow up with hot leads
3. Optimize datacrawl referrals
4. Review campaign performance`;
}
