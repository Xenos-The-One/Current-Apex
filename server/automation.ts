import mysql from "mysql2/promise";
import { sendEmail } from "./sendgrid";
import { sendSMS } from "./twilio";
import { ENV } from "./_core/env";

/**
 * Automation Engine
 * Handles automated email/SMS sequences triggered by events
 */

let dbConnection: mysql.Connection | null = null;

async function getConnection(): Promise<mysql.Connection> {
  if (dbConnection) {
    // Test if connection is still alive
    try {
      await dbConnection.ping();
      return dbConnection;
    } catch {
      // Connection is dead, recreate it
      try { await dbConnection.end(); } catch { /* ignore */ }
      dbConnection = null;
    }
  }
  dbConnection = await mysql.createConnection(ENV.databaseUrl);
  return dbConnection;
}

export interface TriggerAutomationParams {
  trigger: "webinar_registration" | "appointment_booking" | "lead_created" | "lead_status_change" | "datacrawl_import" | "manual";
  agencyId: number;
  contactEmail: string;
  contactPhone?: string;
  contactName?: string;
  leadId?: number;
  webinarRegistrationId?: number;
  appointmentId?: number;
  triggerData?: Record<string, any>; // Additional data for personalization
}

/**
 * Trigger an automation workflow
 * Finds matching workflows and starts execution
 */
export async function triggerAutomation(params: TriggerAutomationParams): Promise<{
  success: boolean;
  executionIds: number[];
  message: string;
}> {
  try {
    const conn = await getConnection();

    // Find active workflows matching this trigger
    const [workflows] = await conn.query<any[]>(
      `SELECT w.*, 
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', s.id,
            'stepOrder', s.step_order,
            'stepType', s.step_type,
            'delayMinutes', s.delay_minutes,
            'subject', s.subject,
            'content', s.content,
            'templateId', s.template_id
          )
        )
        FROM automation_workflow_steps s
        WHERE s.workflow_id = w.id
        ORDER BY s.step_order ASC
        ) as steps
      FROM automation_workflows w
      WHERE w.agency_id = ? AND w.\`trigger\` = ? AND w.is_active = TRUE`,
      [params.agencyId, params.trigger]
    );

    if (workflows.length === 0) {
      return {
        success: true,
        executionIds: [],
        message: `No active workflows found for trigger: ${params.trigger}`
      };
    }

    const executionIds: number[] = [];

    // Start execution for each matching workflow
    for (const workflow of workflows) {
      const steps = workflow.steps ? JSON.parse(workflow.steps) : [];
      
      if (steps.length === 0) continue;

      // Check trigger conditions if specified
      if (workflow.trigger_conditions) {
        const conditions = JSON.parse(workflow.trigger_conditions);
        const conditionsMet = checkTriggerConditions(conditions, params.triggerData || {});
        if (!conditionsMet) continue;
      }

      // Create execution record
      const [result] = await conn.query<any>(
        `INSERT INTO automation_executions 
        (workflow_id, lead_id, webinar_registration_id, appointment_id, contact_email, contact_phone, contact_name, status, current_step_id, next_execution_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW())`,
        [
          workflow.id,
          params.leadId || null,
          params.webinarRegistrationId || null,
          params.appointmentId || null,
          params.contactEmail,
          params.contactPhone || null,
          params.contactName || null,
          steps[0].id
        ]
      );

      const executionId = result.insertId;
      executionIds.push(executionId);

      // Execute first step if delay is 0
      if (steps[0].delayMinutes === 0) {
        await executeWorkflowStep({
          executionId,
          stepId: steps[0].id,
          contactEmail: params.contactEmail,
          contactPhone: params.contactPhone,
          contactName: params.contactName,
          triggerData: params.triggerData
        });
      }
    }

    return {
      success: true,
      executionIds,
      message: `Started ${executionIds.length} automation workflow(s)`
    };
  } catch (error) {
    console.error("[Automation] Error triggering automation:", error);
    return {
      success: false,
      executionIds: [],
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Execute a single workflow step
 */
async function executeWorkflowStep(params: {
  executionId: number;
  stepId: number;
  contactEmail: string;
  contactPhone?: string;
  contactName?: string;
  triggerData?: Record<string, any>;
}): Promise<void> {
  try {
    const conn = await getConnection();

    // Get step details
    const [steps] = await conn.query<any[]>(
      `SELECT * FROM automation_workflow_steps WHERE id = ?`,
      [params.stepId]
    );

    if (steps.length === 0) {
      throw new Error(`Step ${params.stepId} not found`);
    }

    const step = steps[0];

    // Create log entry
    const [logResult] = await conn.query<any>(
      `INSERT INTO automation_step_logs (execution_id, step_id, status) VALUES (?, ?, 'pending')`,
      [params.executionId, params.stepId]
    );

    const logId = logResult.insertId;

    let status: "sent" | "delivered" | "failed" | "skipped" = "sent";
    let emailMessageId: string | undefined;
    let smsMessageSid: string | undefined;
    let errorMessage: string | undefined;

    // Execute based on step type
    if (step.step_type === "email") {
      // Send email
      const subject = personalizeContent(step.subject || "", params.contactName, params.triggerData);
      const content = personalizeContent(step.content || "", params.contactName, params.triggerData);

      const result = await sendEmail({
        to: [params.contactEmail],
        from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
        subject,
        html: content,
        text: content.replace(/<[^>]*>/g, "") // Strip HTML for text version
      });

      if (result.success) {
        status = "sent";
        emailMessageId = result.messageId;
      } else {
        status = "failed";
        errorMessage = result.error;
      }
    } else if (step.step_type === "sms") {
      // Send SMS
      if (!params.contactPhone) {
        status = "skipped";
        errorMessage = "No phone number provided";
      } else {
        const message = personalizeContent(step.content || "", params.contactName, params.triggerData);

        const result = await sendSMS({
          to: params.contactPhone,
          body: message
        });

        if (result.success) {
          status = "sent";
          smsMessageSid = result.messageId;
        } else {
          status = "failed";
          errorMessage = result.error;
        }
      }
    } else if (step.step_type === "wait") {
      // Wait step - just mark as sent and schedule next step
      status = "sent";
    }

    // Update log with result
    await conn.query(
      `UPDATE automation_step_logs SET status = ?, email_message_id = ?, sms_message_sid = ?, error_message = ? WHERE id = ?`,
      [status, emailMessageId || null, smsMessageSid || null, errorMessage || null, logId]
    );

    // Schedule next step
    await scheduleNextStep(params.executionId, step);

  } catch (error) {
    console.error("[Automation] Error executing step:", error);
    
    const conn = await getConnection();
    
    // Log the error
    await conn.query(
      `UPDATE automation_step_logs SET status = 'failed', error_message = ? WHERE execution_id = ? AND step_id = ?`,
      [error instanceof Error ? error.message : "Unknown error", params.executionId, params.stepId]
    );

    // Mark execution as failed
    await conn.query(
      `UPDATE automation_executions SET status = 'failed', failed_at = NOW(), error_message = ? WHERE id = ?`,
      [error instanceof Error ? error.message : "Unknown error", params.executionId]
    );
  }
}

/**
 * Schedule the next step in the workflow
 */
async function scheduleNextStep(executionId: number, currentStep: any): Promise<void> {
  try {
    const conn = await getConnection();

    // Get workflow and find next step
    const [steps] = await conn.query<any[]>(
      `SELECT * FROM automation_workflow_steps WHERE workflow_id = ? AND step_order = ? LIMIT 1`,
      [currentStep.workflow_id, currentStep.step_order + 1]
    );

    if (steps.length === 0) {
      // No more steps - mark execution as completed
      await conn.query(
        `UPDATE automation_executions SET status = 'completed', completed_at = NOW() WHERE id = ?`,
        [executionId]
      );
      return;
    }

    const nextStep = steps[0];

    // Calculate next execution time
    const nextExecutionAt = new Date();
    nextExecutionAt.setMinutes(nextExecutionAt.getMinutes() + nextStep.delay_minutes);

    // Update execution with next step
    await conn.query(
      `UPDATE automation_executions SET current_step_id = ?, next_execution_at = ? WHERE id = ?`,
      [nextStep.id, nextExecutionAt, executionId]
    );
  } catch (error) {
    console.error("[Automation] Error scheduling next step:", error);
  }
}

/**
 * Process pending automation executions
 * This should be called by a cron job every minute
 */
export async function processPendingAutomations(): Promise<{
  processed: number;
  failed: number;
}> {
  let processed = 0;
  let failed = 0;

  try {
    const conn = await getConnection();

    // Find executions that are due
    const [dueExecutions] = await conn.query<any[]>(
      `SELECT * FROM automation_executions 
       WHERE status = 'active' AND next_execution_at <= NOW() 
       LIMIT 100`,
      []
    );

    for (const execution of dueExecutions) {
      try {
        if (!execution.current_step_id) continue;

        await executeWorkflowStep({
          executionId: execution.id,
          stepId: execution.current_step_id,
          contactEmail: execution.contact_email,
          contactPhone: execution.contact_phone || undefined,
          contactName: execution.contact_name || undefined
        });

        processed++;
      } catch (error) {
        console.error(`[Automation] Error processing execution ${execution.id}:`, error);
        failed++;
      }
    }

    if (processed > 0 || failed > 0) {
      console.log(`[Automation] Processed ${processed} automations, ${failed} failed`);
    }
  } catch (error) {
    console.error("[Automation] Error in processPendingAutomations:", error);
  }

  return { processed, failed };
}

/**
 * Check if trigger conditions are met
 */
function checkTriggerConditions(conditions: Record<string, any>, data: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (data[key] !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Personalize content with contact name and trigger data
 */
function personalizeContent(content: string, contactName?: string, triggerData?: Record<string, any>): string {
  let personalized = content;

  // Replace {{firstName}}
  if (contactName) {
    const firstName = contactName.split(" ")[0];
    personalized = personalized.replace(/\{\{firstName\}\}/g, firstName);
    personalized = personalized.replace(/\{\{name\}\}/g, contactName);
  }

  // Replace other variables from triggerData
  if (triggerData) {
    for (const [key, value] of Object.entries(triggerData)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
      personalized = personalized.replace(regex, String(value));
    }
  }

  return personalized;
}
