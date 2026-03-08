import { getDb } from "./seo-db";
import { content, seoClients as clients } from "../drizzle/seo-schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

// Model costs per 1M tokens (in USD)
export const MODEL_COSTS = {
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0, name: "Claude 3.5 Sonnet" },
  "claude-3-5-haiku-20241022": { input: 0.8, output: 4.0, name: "Claude 3.5 Haiku" },
  "gpt-4o": { input: 2.5, output: 10.0, name: "GPT-4o" },
  "gpt-4o-mini": { input: 0.15, output: 0.6, name: "GPT-4o Mini" },
  "gemini-2.5-flash": { input: 0.075, output: 0.3, name: "Gemini 2.5 Flash" },
  "gemini-2.5-pro": { input: 1.25, output: 5.0, name: "Gemini 2.5 Pro" },
} as const;

/**
 * Calculate cost for a single content item
 */
export function calculateContentCost(
  aiModel: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[aiModel as keyof typeof MODEL_COSTS] || { input: 0, output: 0 };
  return (inputTokens / 1000000) * costs.input + (outputTokens / 1000000) * costs.output;
}

/**
 * Get monthly cost for a specific client
 */
export async function getClientMonthlyCost(clientId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Get first day of current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const contentItems = await db
    .select()
    .from(content)
    .where(
      and(
        eq(content.clientId, clientId),
        gte(content.createdAt, firstDayOfMonth)
      )
    );

  let totalCost = 0;
  for (const item of contentItems) {
    totalCost += calculateContentCost(
      item.aiModel,
      item.inputTokens,
      item.outputTokens
    );
  }

  return totalCost;
}

/**
 * Get global monthly cost across all clients
 */
export async function getGlobalMonthlyCost(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const contentItems = await db
    .select()
    .from(content)
    .where(gte(content.createdAt, firstDayOfMonth));

  let totalCost = 0;
  for (const item of contentItems) {
    totalCost += calculateContentCost(
      item.aiModel,
      item.inputTokens,
      item.outputTokens
    );
  }

  return totalCost;
}

/**
 * Check if client budget alert should be triggered
 */
export async function checkClientBudgetAlert(clientId: number): Promise<{
  shouldAlert: boolean;
  currentCost: number;
  budget: number;
  percentage: number;
  threshold: number;
}> {
  const db = await getDb();
  if (!db) {
    return { shouldAlert: false, currentCost: 0, budget: 0, percentage: 0, threshold: 80 };
  }

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client || !client.monthlyBudget) {
    return { shouldAlert: false, currentCost: 0, budget: 0, percentage: 0, threshold: 80 };
  }

  const budget = parseFloat(client.monthlyBudget);
  const threshold = client.budgetAlertThreshold || 80;
  const currentCost = await getClientMonthlyCost(clientId);
  const percentage = (currentCost / budget) * 100;

  return {
    shouldAlert: percentage >= threshold,
    currentCost,
    budget,
    percentage,
    threshold,
  };
}

/**
 * Send budget alert notification to owner
 */
export async function sendBudgetAlert(
  clientName: string,
  currentCost: number,
  budget: number,
  percentage: number
): Promise<boolean> {
  const title = `Budget Alert: ${clientName}`;
  const content = `Client "${clientName}" has reached ${percentage.toFixed(1)}% of their monthly budget.\n\nCurrent spend: $${currentCost.toFixed(2)}\nMonthly budget: $${budget.toFixed(2)}\n\nConsider reviewing their content generation settings or adjusting their budget.`;

  return await notifyOwner({ title, content });
}

/**
 * Check and send alert if needed after content generation
 */
export async function checkAndAlertAfterGeneration(clientId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) return;

  const alertStatus = await checkClientBudgetAlert(clientId);
  
  if (alertStatus.shouldAlert) {
    await sendBudgetAlert(
      client.name,
      alertStatus.currentCost,
      alertStatus.budget,
      alertStatus.percentage
    );
  }
}
