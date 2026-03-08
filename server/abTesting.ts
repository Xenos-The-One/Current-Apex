import { getDb } from "./seo-db";
import { abTests, seoClients as clients } from "../drizzle/seo-schema";
import { eq, desc } from "drizzle-orm";

export async function createABTest(data: {
  clientId: number;
  topic: string;
  customPrompt?: string;
  enableWebResearch: boolean;
  shouldGenerateImage: boolean;
  modelA: string;
  modelB: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(abTests).values({
    clientId: data.clientId,
    topic: data.topic,
    customPrompt: data.customPrompt || null,
    enableWebResearch: data.enableWebResearch ? 1 : 0,
    shouldGenerateImage: data.shouldGenerateImage ? 1 : 0,
    modelA: data.modelA,
    modelB: data.modelB,
    createdBy: data.createdBy,
  });

  return result.insertId;
}

export async function updateABTestResults(
  id: number,
  versionData: {
    version: "A" | "B";
    content: string;
    title: string;
    imageUrl?: string;
    wordCount: number;
    generationTimeMs: number;
    inputTokens: number;
    outputTokens: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = {};
  
  if (versionData.version === "A") {
    updates.contentA = versionData.content;
    updates.titleA = versionData.title;
    updates.imageUrlA = versionData.imageUrl || null;
    updates.wordCountA = versionData.wordCount;
    updates.generationTimeMsA = versionData.generationTimeMs;
    updates.inputTokensA = versionData.inputTokens;
    updates.outputTokensA = versionData.outputTokens;
  } else {
    updates.contentB = versionData.content;
    updates.titleB = versionData.title;
    updates.imageUrlB = versionData.imageUrl || null;
    updates.wordCountB = versionData.wordCount;
    updates.generationTimeMsB = versionData.generationTimeMs;
    updates.inputTokensB = versionData.inputTokens;
    updates.outputTokensB = versionData.outputTokens;
  }

  await db.update(abTests).set(updates).where(eq(abTests.id, id));
}

export async function setABTestWinner(id: number, winner: "A" | "B", notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(abTests).set({
    winner,
    notes: notes || null,
  }).where(eq(abTests.id, id));
}

export async function getABTestById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [test] = await db.select().from(abTests).where(eq(abTests.id, id));
  return test || null;
}

export async function listABTests() {
  const db = await getDb();
  if (!db) return [];

  const tests = await db
    .select({
      test: abTests,
      client: clients,
    })
    .from(abTests)
    .leftJoin(clients, eq(abTests.clientId, clients.id))
    .orderBy(desc(abTests.createdAt));

  return tests;
}

export async function deleteABTest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(abTests).where(eq(abTests.id, id));
}
