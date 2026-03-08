import { getDb } from "./seo-db";
import { content } from "../drizzle/seo-schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { MODEL_COSTS } from "./budgetTracking";

export interface ModelPerformanceMetrics {
  model: string;
  modelName: string;
  totalContent: number;
  approvedContent: number;
  approvalRate: number;
  avgWordCount: number;
  avgGenerationTime: number;
  totalCost: number;
  avgCostPerContent: number;
  costPerApproval: number;
}

/**
 * Calculate word count from content text
 */
export function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Get performance metrics for all models
 */
export async function getModelPerformanceMetrics(): Promise<ModelPerformanceMetrics[]> {
  const db = await getDb();
  if (!db) return [];

  const allContent = await db.select().from(content);

  // Group by model
  const modelGroups = new Map<string, typeof allContent>();
  for (const item of allContent) {
    const model = item.aiModel;
    if (!modelGroups.has(model)) {
      modelGroups.set(model, []);
    }
    modelGroups.get(model)!.push(item);
  }

  const metrics: ModelPerformanceMetrics[] = [];

  for (const [model, items] of Array.from(modelGroups.entries())) {
    const totalContent = items.length;
    const approvedContent = items.filter((item: any) => item.wasApproved === 1).length;
    const approvalRate = totalContent > 0 ? (approvedContent / totalContent) * 100 : 0;

    const avgWordCount = items.reduce((sum: number, item: any) => sum + item.wordCount, 0) / totalContent || 0;
    const avgGenerationTime = items.reduce((sum: number, item: any) => sum + item.generationTimeMs, 0) / totalContent || 0;

    let totalCost = 0;
    for (const item of items) {
      const costs = MODEL_COSTS[item.aiModel as keyof typeof MODEL_COSTS] || { input: 0, output: 0 };
      totalCost += (item.inputTokens / 1000000) * costs.input + (item.outputTokens / 1000000) * costs.output;
    }

    const avgCostPerContent = totalContent > 0 ? totalCost / totalContent : 0;
    const costPerApproval = approvedContent > 0 ? totalCost / approvedContent : 0;

    const modelInfo = MODEL_COSTS[model as keyof typeof MODEL_COSTS];
    const modelName = modelInfo?.name || model;

    metrics.push({
      model,
      modelName,
      totalContent,
      approvedContent,
      approvalRate,
      avgWordCount,
      avgGenerationTime,
      totalCost,
      avgCostPerContent,
      costPerApproval,
    });
  }

  // Sort by total content descending
  return metrics.sort((a, b) => b.totalContent - a.totalContent);
}

/**
 * Get performance comparison between two models
 */
export async function compareModels(model1: string, model2: string) {
  const allMetrics = await getModelPerformanceMetrics();
  const metrics1 = allMetrics.find(m => m.model === model1);
  const metrics2 = allMetrics.find(m => m.model === model2);

  if (!metrics1 || !metrics2) {
    return null;
  }

  return {
    model1: metrics1,
    model2: metrics2,
    comparison: {
      approvalRateDiff: metrics1.approvalRate - metrics2.approvalRate,
      wordCountDiff: metrics1.avgWordCount - metrics2.avgWordCount,
      costDiff: metrics1.avgCostPerContent - metrics2.avgCostPerContent,
      speedDiff: metrics1.avgGenerationTime - metrics2.avgGenerationTime,
    },
  };
}
