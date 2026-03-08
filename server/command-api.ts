import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

const router = Router();

/**
 * Command API - REST endpoints for Manus Personal Agent (Telegram)
 * 
 * All endpoints are under /api/command/*
 * Authentication: Bearer token via COMMAND_API_KEY env var
 * 
 * This gives Tariq full CRM control from his phone via Telegram.
 */

// ─── Auth Middleware ─────────────────────────────────────────────
function authenticate(req: Request, res: Response, next: Function) {
  const apiKey = process.env.COMMAND_API_KEY;
  if (!apiKey) {
    console.error("[Command API] COMMAND_API_KEY not configured");
    return res.status(500).json({ error: "Command API not configured. Set COMMAND_API_KEY in secrets." });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header. Use: Bearer <COMMAND_API_KEY>" });
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== apiKey) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
}

router.use(authenticate);

// Helper to safely extract rows from db.execute result
function rows(result: any): any[] {
  if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
    return result[0];
  }
  if (Array.isArray(result)) return result;
  return [];
}

// ─── HEALTH CHECK ────────────────────────────────────────────────
router.get("/health", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ status: "degraded", message: "Database unavailable" });
    
    await db.execute(sql.raw("SELECT 1"));
    
    return res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: "All systems operational"
    });
  } catch (error: any) {
    return res.json({ status: "error", message: error.message });
  }
});

// ─── DASHBOARD / DAILY SUMMARY ──────────────────────────────────
router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const totalLeads = rows(await db.execute(sql.raw("SELECT COUNT(*) as count FROM leads")));
    const todayLeads = rows(await db.execute(sql.raw(`SELECT COUNT(*) as count FROM leads WHERE DATE(createdAt) = '${todayStr}'`)));
    const hotLeads = rows(await db.execute(sql.raw("SELECT COUNT(*) as count FROM leads WHERE status = 'hot'")));
    const todayAppointments = rows(await db.execute(sql.raw(`SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = '${todayStr}'`)));
    const upcomingAppointments = rows(await db.execute(sql.raw(`SELECT COUNT(*) as count FROM appointments WHERE appointment_date >= NOW() AND status = 'scheduled'`)));
    const totalWebinarRegs = rows(await db.execute(sql.raw("SELECT COUNT(*) as count FROM webinar_registrations")));
    const callsToday = rows(await db.execute(sql.raw(`SELECT COUNT(*) as count FROM vapi_call_logs WHERE DATE(created_at) = '${todayStr}'`)));

    return res.json({
      summary: "Daily CRM Dashboard",
      date: todayStr,
      metrics: {
        leads: {
          total: totalLeads[0]?.count || 0,
          today: todayLeads[0]?.count || 0,
          hot: hotLeads[0]?.count || 0,
        },
        appointments: {
          today: todayAppointments[0]?.count || 0,
          upcoming: upcomingAppointments[0]?.count || 0,
        },
        webinars: {
          totalRegistrations: totalWebinarRegs[0]?.count || 0,
        },
        calls: {
          today: callsToday[0]?.count || 0,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── LEADS ──────────────────────────────────────────────────────
router.get("/leads", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { status, source, search, limit = "20", offset = "0" } = req.query;

    let query = `SELECT id, first_name, last_name, email, phone, source, status, score, score_tier, notes, vapi_call_scheduled_at, vapi_call_initiated, after_hours_sms_sent, appointment_booked_at, createdAt, updatedAt FROM leads`;
    const conditions: string[] = [];
    const paramValues: any[] = [];

    if (status) {
      conditions.push(`status = ?`);
      paramValues.push(status);
    }
    if (source) {
      conditions.push(`source = ?`);
      paramValues.push(source);
    }
    if (search) {
      conditions.push(`(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)`);
      const searchTerm = `%${search}%`;
      paramValues.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    paramValues.push(parseInt(limit as string), parseInt(offset as string));

    // Replace ? placeholders with values
    let idx = 0;
    const finalQuery = query.replace(/\?/g, () => {
      const val = paramValues[idx++];
      return typeof val === "string" ? `'${val.replace(/'/g, "''")}'` : String(val);
    });

    const leads = rows(await db.execute(sql.raw(finalQuery)));
    return res.json({ leads, count: leads.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/leads/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const leadRows = rows(await db.execute(sql.raw(`SELECT * FROM leads WHERE id = ${parseInt(req.params.id)}`)));
    const leadData = leadRows[0];
    if (!leadData) return res.status(404).json({ error: "Lead not found" });

    const activities = rows(await db.execute(sql.raw(`SELECT * FROM lead_activities WHERE lead_id = ${parseInt(req.params.id)} ORDER BY created_at DESC LIMIT 20`)));

    return res.json({ lead: leadData, activities });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/leads/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { status, notes, leadScore } = req.body;
    const updates: string[] = [];

    if (status) updates.push(`status = '${status}'`);
    if (notes) updates.push(`notes = '${notes.replace(/'/g, "''")}'`);
    if (leadScore !== undefined) updates.push(`score = ${parseInt(leadScore)}`);
    updates.push(`updatedAt = NOW()`);

    await db.execute(sql.raw(`UPDATE leads SET ${updates.join(", ")} WHERE id = ${parseInt(req.params.id)}`));

    return res.json({ success: true, message: `Lead ${req.params.id} updated` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── APPOINTMENTS ───────────────────────────────────────────────
router.get("/appointments", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { date, status, upcoming } = req.query;
    let query = `SELECT * FROM appointments`;
    const conditions: string[] = [];

    if (date) {
      conditions.push(`DATE(appointment_date) = '${date}'`);
    }
    if (status) {
      conditions.push(`status = '${status}'`);
    }
    if (upcoming === "true") {
      conditions.push(`appointment_date >= NOW()`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += ` ORDER BY appointment_date ASC LIMIT 50`;

    const appointments = rows(await db.execute(sql.raw(query)));
    return res.json({ appointments, count: appointments.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.patch("/appointments/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { status, notes } = req.body;
    const updates: string[] = [];

    if (status) updates.push(`status = '${status}'`);
    if (notes) updates.push(`notes = '${notes.replace(/'/g, "''")}'`);
    updates.push(`updated_at = NOW()`);

    await db.execute(sql.raw(`UPDATE appointments SET ${updates.join(", ")} WHERE id = ${parseInt(req.params.id)}`));

    return res.json({ success: true, message: `Appointment ${req.params.id} updated to ${status || "updated"}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── WEBINAR REGISTRATIONS ──────────────────────────────────────
router.get("/webinars", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const registrations = rows(await db.execute(sql.raw(
      `SELECT * FROM webinar_registrations ORDER BY created_at DESC LIMIT 100`
    )));

    const stats = rows(await db.execute(sql.raw(
      `SELECT webinar_id, webinar_title, COUNT(*) as registrations, 
       SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended
       FROM webinar_registrations GROUP BY webinar_id, webinar_title`
    )));

    return res.json({ registrations, stats });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── CALLS / VAPI ───────────────────────────────────────────────
router.get("/calls", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { date, limit = "20" } = req.query;
    let query = `SELECT * FROM vapi_call_logs`;

    if (date) {
      query += ` WHERE DATE(created_at) = '${date}'`;
    }
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit as string)}`;

    const calls = rows(await db.execute(sql.raw(query)));
    return res.json({ calls, count: calls.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── METRICS & ANALYTICS ────────────────────────────────────────
router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { period = "7" } = req.query;
    const daysAgo = parseInt(period as string);

    const leadsByStatus = rows(await db.execute(sql.raw(
      `SELECT status, COUNT(*) as count FROM leads GROUP BY status`
    )));

    const leadsBySource = rows(await db.execute(sql.raw(
      `SELECT source, COUNT(*) as count FROM leads GROUP BY source ORDER BY count DESC`
    )));

    const dailyLeads = rows(await db.execute(sql.raw(
      `SELECT DATE(createdAt) as date, COUNT(*) as count FROM leads 
       WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ${daysAgo} DAY) 
       GROUP BY DATE(createdAt) ORDER BY date`
    )));

    const appointmentStats = rows(await db.execute(sql.raw(
      `SELECT status, COUNT(*) as count FROM appointments 
       WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL ${daysAgo} DAY) 
       GROUP BY status`
    )));

    const conversionFunnel = rows(await db.execute(sql.raw(
      `SELECT 
        (SELECT COUNT(*) FROM leads WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ${daysAgo} DAY)) as total_leads,
        (SELECT COUNT(*) FROM leads WHERE status IN ('contacted', 'qualified', 'hot', 'appointment_set', 'closed') AND createdAt >= DATE_SUB(NOW(), INTERVAL ${daysAgo} DAY)) as contacted,
        (SELECT COUNT(*) FROM appointments WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${daysAgo} DAY)) as appointments_booked,
        (SELECT COUNT(*) FROM appointments WHERE status = 'completed' AND appointment_date >= DATE_SUB(NOW(), INTERVAL ${daysAgo} DAY)) as appointments_completed`
    )));

    return res.json({
      period: `Last ${daysAgo} days`,
      leadsByStatus,
      leadsBySource,
      dailyLeads,
      appointmentStats,
      conversionFunnel: conversionFunnel[0],
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── CAMPAIGNS ──────────────────────────────────────────────────
router.get("/campaigns", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const emailCampaigns = rows(await db.execute(sql.raw(
      `SELECT * FROM email_campaigns ORDER BY created_at DESC LIMIT 20`
    )));

    const smsCampaigns = rows(await db.execute(sql.raw(
      `SELECT * FROM sms_campaigns ORDER BY created_at DESC LIMIT 20`
    )));

    return res.json({ emailCampaigns, smsCampaigns });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── TEAM MEMBERS ───────────────────────────────────────────────
router.get("/team", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const team = rows(await db.execute(sql.raw("SELECT * FROM team_members")));
    return res.json({ team });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── AI AGENTS ──────────────────────────────────────────────────
router.post("/agents/run", async (req: Request, res: Response) => {
  try {
    const { agent, params } = req.body;
    
    const agentMap: Record<string, () => Promise<any>> = {
      "operations": async () => {
        const { operationsAgent } = await import("./agents/operations-agent");
        const health = await operationsAgent.monitorSystems();
        const standup = await operationsAgent.generateDailyStandUp();
        return { health, standup };
      },
      "analytics": async () => {
        const { analyticsAgent } = await import("./agents/analytics-agent");
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const kpis = await analyticsAgent.getKPIs(weekAgo, now);
        return { kpis };
      },
      "lead-qualification": async () => {
        const { leadQualificationAgent } = await import("./agents/lead-qualification-agent");
        return leadQualificationAgent.processNewLeads();
      },
      "sales-followup": async () => {
        const { salesFollowUpAgent } = await import("./agents/sales-followup-agent");
        return salesFollowUpAgent.processFollowUps();
      },
      "appointment-coordination": async () => {
        const { appointmentCoordinationAgent } = await import("./agents/appointment-coordination-agent");
        await appointmentCoordinationAgent.send24HourReminders();
        await appointmentCoordinationAgent.send1HourReminders();
        return { message: "Appointment reminders processed" };
      },
      "client-nurture": async () => {
        const { clientNurtureAgent } = await import("./agents/client-nurture-agent");
        return clientNurtureAgent.processNurtureCampaigns();
      },
      "webinar-management": async () => {
        const { webinarManagementAgent } = await import("./agents/webinar-management-agent");
        await webinarManagementAgent.send24HourReminders();
        return { message: "Webinar reminders processed" };
      },
      "content-creation": async () => {
        const { contentCreationAgent } = await import("./agents/content-creation-agent");
        return contentCreationAgent.generateContent({
          type: params?.contentType || "social",
          topic: params?.topic || "mortgage tips",
          targetAudience: params?.targetAudience || "first-time homebuyers",
        });
      },
      "lead-generation": async () => {
        const { leadGenerationAgent } = await import("./agents/lead-generation-agent");
        return leadGenerationAgent.monitorAndOptimizeCampaigns();
      },
      "relationship-management": async () => {
        const { relationshipManagementAgent } = await import("./agents/relationship-management-agent");
        await relationshipManagementAgent.analyzeSentiment();
        return { message: "Sentiment analysis completed" };
      },
    };

    if (!agent || !agentMap[agent]) {
      return res.json({
        error: "Invalid agent",
        availableAgents: Object.keys(agentMap),
        usage: "POST /api/command/agents/run { agent: 'operations' }",
      });
    }

    console.log(`[Command API] Running agent: ${agent}`);
    const result = await agentMap[agent]();
    return res.json({ success: true, agent, result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/agents/status", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const recentMessages = rows(await db.execute(sql.raw(
      `SELECT agent_name, COUNT(*) as messages, MAX(created_at) as last_active 
       FROM agent_messages 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) 
       GROUP BY agent_name 
       ORDER BY last_active DESC`
    )));

    return res.json({
      agents: [
        "operations", "analytics", "lead-qualification", "sales-followup",
        "appointment-coordination", "client-nurture", "webinar-management",
        "content-creation", "lead-generation", "relationship-management"
      ],
      recentActivity: recentMessages,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── SEND EMAIL ─────────────────────────────────────────────────
router.post("/send-email", async (req: Request, res: Response) => {
  try {
    const { to, subject, html, text } = req.body;
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: "Missing required fields: to, subject, html or text" });
    }

    const { sendEmail } = await import("./sendgrid");
    const result = await sendEmail({
      to: Array.isArray(to) ? to : [to],
      from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
      subject,
      html: html || `<p>${text}</p>`,
      text,
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── SEND SMS ───────────────────────────────────────────────────
router.post("/send-sms", async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "Missing required fields: to, message" });
    }

    const { sendSMS } = await import("./twilio");
    const result = await sendSMS({ to, body: message });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── BORROWER DATABASE ──────────────────────────────────────────
router.get("/borrowers", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { search, limit = "20" } = req.query;
    let query = `SELECT * FROM borrowers`;

    if (search) {
      query += ` WHERE first_name LIKE '%${search}%' OR last_name LIKE '%${search}%' OR email LIKE '%${search}%'`;
    }
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit as string)}`;

    const borrowers = rows(await db.execute(sql.raw(query)));
    return res.json({ borrowers, count: borrowers.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── REFERRAL PARTNERS ──────────────────────────────────────────
router.get("/referral-partners", async (_req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const partners = rows(await db.execute(sql.raw(
      `SELECT * FROM referral_partners ORDER BY created_at DESC`
    )));
    return res.json({ partners });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── NOTIFICATIONS / INBOX ──────────────────────────────────────
router.get("/notifications", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { unread, limit = "30" } = req.query;
    let query = `SELECT * FROM notification_inbox`;

    if (unread === "true") {
      query += ` WHERE is_read = FALSE`;
    }
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit as string)}`;

    const notifications = rows(await db.execute(sql.raw(query)));
    return res.json({ notifications, count: notifications.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── NATURAL LANGUAGE COMMAND ───────────────────────────────────
router.post("/ask", async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Missing 'question' field" });
    }

    const { invokeLLM } = await import("./_core/llm");
    
    const db = await getDb();
    let context = "";
    if (db) {
      try {
        const leadCount = rows(await db.execute(sql.raw("SELECT COUNT(*) as count FROM leads")));
        const hotLeads = rows(await db.execute(sql.raw("SELECT COUNT(*) as count FROM leads WHERE status = 'hot'")));
        const todayAppts = rows(await db.execute(sql.raw("SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = CURDATE()")));
        const upcomingAppts = rows(await db.execute(sql.raw("SELECT COUNT(*) as count FROM appointments WHERE appointment_date >= NOW() AND status = 'scheduled'")));
        const webinarRegs = rows(await db.execute(sql.raw("SELECT COUNT(*) as count FROM webinar_registrations")));
        const recentLeads = rows(await db.execute(sql.raw("SELECT first_name, last_name, status, source, createdAt FROM leads ORDER BY createdAt DESC LIMIT 5")));
        
        context = `
CURRENT CRM DATA:
- Total leads: ${leadCount[0]?.count || 0}
- Hot leads: ${hotLeads[0]?.count || 0}
- Today's appointments: ${todayAppts[0]?.count || 0}
- Upcoming appointments: ${upcomingAppts[0]?.count || 0}
- Webinar registrations: ${webinarRegs[0]?.count || 0}
- Recent leads: ${JSON.stringify(recentLeads)}

AVAILABLE AGENTS: operations, analytics, lead-qualification, sales-followup, appointment-coordination, client-nurture, webinar-management, content-creation, lead-generation, relationship-management

TEAM: Tariq (Head of Marketing/Founder), Tim Haskins (Loan Officer), Timisha (Admin), Belinda (Admin)
COMPANY: Sterling Marketing / Premier Mortgage Resources
`;
      } catch (e) {
        context = "Database metrics unavailable.";
      }
    }

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are the AI Operations Director for Sterling Marketing / Premier Mortgage Resources CRM. 
You help Tariq manage his mortgage lead generation and real estate agency business.
Answer questions about the business, provide insights, and suggest actions.
Be direct, concise, and actionable. Tariq is reading this on his phone via Telegram.
Keep responses under 500 words unless asked for detail.

${context}`
        },
        { role: "user", content: question }
      ],
    });

    const answer = typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : JSON.stringify(response.choices[0].message.content);

    return res.json({ answer });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── RUN CRON JOBS MANUALLY ─────────────────────────────────────
router.post("/cron/run", async (req: Request, res: Response) => {
  try {
    const { job } = req.body;
    
    const jobMap: Record<string, () => Promise<any>> = {
      "daily-standups": async () => {
        const { sendDailyStandups } = await import("./ai-operations-director");
        return sendDailyStandups();
      },
      "webinar-reminders": async () => {
        const { sendWebinarReminders } = await import("./jobs/webinar-reminders");
        return sendWebinarReminders();
      },
      "appointment-reminders": async () => {
        const { sendAppointmentReminders } = await import("./jobs/appointment-reminders");
        return sendAppointmentReminders();
      },
      "lead-automation": async () => {
        const { initializeCronJobs } = await import("./cron-jobs");
        // Can't re-run initializeCronJobs (it schedules crons), so run lead qualification instead
        const { leadQualificationAgent } = await import("./agents/lead-qualification-agent");
        return leadQualificationAgent.processNewLeads();
      },
    };

    if (!job || !jobMap[job]) {
      return res.json({
        error: "Invalid job",
        availableJobs: Object.keys(jobMap),
        usage: "POST /api/command/cron/run { job: 'daily-standups' }",
      });
    }

    console.log(`[Command API] Running cron job: ${job}`);
    const result = await jobMap[job]();
    return res.json({ success: true, job, result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── CONTENT GENERATION ─────────────────────────────────────────
router.post("/content/generate", async (req: Request, res: Response) => {
  try {
    const { type = "social_post", topic = "mortgage tips", platform = "facebook" } = req.body;

    const { contentCreationAgent } = await import("./agents/content-creation-agent");
    const result = await contentCreationAgent.generateContent({
      type: type as any,
      topic,
      targetAudience: "first-time homebuyers",
    });

    return res.json({ success: true, content: result });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── TRIGGER VAPI CALL FOR A LEAD ──────────────────────────────
router.post("/trigger-call/:leadId", async (req: Request, res: Response) => {
  try {
    const leadId = parseInt(req.params.leadId);
    const { processScheduledCall } = await import("./lead-automation");
    
    console.log(`[Command API] Manually triggering Vapi call for lead ${leadId}`);
    
    // Reset the vapi_call_initiated so it can be called again
    const db = await getDb();
    if (db) {
      await db.execute(sql.raw(`UPDATE leads SET vapi_call_initiated = NULL, vapi_call_scheduled_at = NOW() WHERE id = ${leadId}`));
    }
    
    await processScheduledCall(leadId);
    return res.json({ success: true, message: `Vapi call triggered for lead ${leadId}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── PROCESS ALL QUEUED CALLS NOW ──────────────────────────────
router.post("/process-calls", async (_req: Request, res: Response) => {
  try {
    const { processScheduledCalls } = await import("./lead-automation");
    console.log(`[Command API] Processing all queued Vapi calls`);
    await processScheduledCalls();
    return res.json({ success: true, message: "Queued calls processed" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── FACEBOOK LEADS ─────────────────────────────────────────────
router.get("/facebook-leads", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    if (!db) return res.status(500).json({ error: "Database unavailable" });

    const { limit = "20" } = req.query;
    const leads = rows(await db.execute(sql.raw(
      `SELECT * FROM leads WHERE source LIKE '%facebook%' OR source LIKE '%Facebook%' ORDER BY createdAt DESC LIMIT ${parseInt(limit as string)}`
    )));

    return res.json({ leads, count: leads.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
