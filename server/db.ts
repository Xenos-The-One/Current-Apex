import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  agencies, 
  clients, 
  leads, 
  subscriptionTiers,
  leadActivities,
  vapiAssistants,
  emailCampaigns,
  smsCampaigns,
  socialMediaPosts,
  aiScripts,
  leadSourceAssistantMappings,
  automationWorkflows,
  automationWorkflowSteps,
  automationExecutions,
  automationStepLogs,
  loaAssignments,
  InsertAgency,
  InsertClient,
  InsertLead,
  InsertSubscriptionTier
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Reset the DB singleton so the next call to getDb() creates a fresh connection.
// Call this whenever a query fails with ECONNRESET or similar network errors.
export function resetDbConnection() {
  console.log("[Database] Resetting connection due to network error — will reconnect on next query");
  _db = null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error: any) {
    console.error("[Database] Failed to upsert user:", error);
    // Reset stale connection on network errors so next request reconnects
    const code = error?.cause?.code || error?.code;
    if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
      resetDbConnection();
    }
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= AGENCY FUNCTIONS =============

export async function createAgency(agency: InsertAgency) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(agencies).values(agency);
  return result;
}

export async function getAgencyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(agencies).where(eq(agencies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAgencyByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(agencies).where(eq(agencies.ownerId, ownerId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllAgencies() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(agencies).orderBy(desc(agencies.createdAt));
}

export async function updateAgency(id: number, data: Partial<InsertAgency>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(agencies).set(data).where(eq(agencies.id, id));
}

export async function updateAgencySetupFee(id: number, paymentIntentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(agencies).set({
    setupFeePaid: true,
    setupFeePaymentIntentId: paymentIntentId,
    status: "pending_call",
  }).where(eq(agencies.id, id));
}

// ============= CLIENT FUNCTIONS =============

export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(clients).values(client);
  return result;
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getClientsByAgencyId(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(clients).where(eq(clients.agencyId, agencyId)).orderBy(desc(clients.createdAt));
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(clients).set(data).where(eq(clients.id, id));
}

export async function getClientByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(clients).where(eq(clients.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Ensure a client profile exists for a user. If the user has role client_user
 * but no client record, auto-provision one under the default agency (id=1)
 * with a trial subscription so they can access the dashboard.
 */
export async function ensureClientProfile(user: { id: number; name?: string | null; email?: string | null; role: string }) {
  const existing = await getClientByUserId(user.id);
  if (existing) return existing;

  // Only auto-provision for client_user role
  if (user.role !== "client_user") return undefined;

  const db = await getDb();
  if (!db) return undefined;

  // Find the first agency to assign to (default agency)
  const agencyRows = await db.select().from(agencies).limit(1);
  if (agencyRows.length === 0) {
    console.warn("[ensureClientProfile] No agency found to assign client to");
    return undefined;
  }
  const agencyId = agencyRows[0].id;

  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 90);

  const clientData: InsertClient = {
    agencyId,
    userId: user.id,
    name: user.name || "New Client",
    email: user.email || "",
    subscriptionTier: "starter",
    subscriptionStatus: "trial",
    trialEndDate,
    accessMode: "limited",
  };

  try {
    const result = await db.insert(clients).values(clientData);
    const newId = result[0].insertId;
    console.log(`[ensureClientProfile] Auto-created client profile (id=${newId}) for user ${user.id}`);
    return await getClientById(newId);
  } catch (error) {
    console.error("[ensureClientProfile] Failed to auto-create client profile:", error);
    return undefined;
  }
}

// ============= LEAD FUNCTIONS =============

export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(leads).values(lead);
  
  // Get the insertId from the result
  let insertId: number;
  if (typeof result === 'object' && result !== null) {
    // Handle different MySQL driver response formats
    insertId = Number((result as any)[0]?.insertId || (result as any).insertId);
  } else {
    throw new Error("Unexpected insert result format");
  }
  
  if (isNaN(insertId) || insertId === 0) {
    // Fallback: query for the most recent lead
    const recentLeads = await db.select().from(leads)
      .where(eq(leads.clientId, lead.clientId))
      .orderBy(desc(leads.id))
      .limit(1);
    if (recentLeads.length === 0) throw new Error("Failed to create lead");
    insertId = recentLeads[0].id;
  }
  
  // Increment client lead count
  if (lead.clientId) {
    const client = await getClientById(lead.clientId);
    if (client) {
      await updateClient(lead.clientId, { leadCount: (client.leadCount || 0) + 1 });
    }
  }
  
  // Fetch and return the created lead
  const createdLead = await getLeadById(insertId);
  if (!createdLead) throw new Error("Failed to create lead");
  
  // Calculate initial lead score
  await updateLeadScore(insertId);
  
  return createdLead;
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLeadsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(leads).where(eq(leads.clientId, clientId)).orderBy(desc(leads.createdAt));
}

export async function getLeadsByAgencyId(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(leads).where(eq(leads.agencyId, agencyId)).orderBy(desc(leads.createdAt));
}

export async function updateLead(id: number, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(leads).set(data).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(leads).where(eq(leads.id, id));
}

export async function getLeadsByAgency(
  agencyId: number,
  status?: string,
  source?: string,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(leads.agencyId, agencyId)];
  
  if (status) {
    conditions.push(eq(leads.status, status as any));
  }
  
  if (source) {
    conditions.push(eq(leads.source, source));
  }
  
  return await db.select().from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function bulkCreateLeads(
  agencyId: number,
  clientId: number,
  leadsData: Array<Omit<InsertLead, 'agencyId' | 'clientId'>>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const leadsToInsert = leadsData.map(lead => ({
    ...lead,
    agencyId,
    clientId,
  }));
  
  await db.insert(leads).values(leadsToInsert);
  
  // Increment client lead count
  const client = await getClientById(clientId);
  if (client) {
    await updateClient(clientId, { leadCount: (client.leadCount || 0) + leadsToInsert.length });
  }
  
  // Return the created leads (fetch them back)
  const createdLeads = await db.select().from(leads)
    .where(eq(leads.agencyId, agencyId))
    .orderBy(desc(leads.createdAt))
    .limit(leadsToInsert.length);
  
  return createdLeads;
}

// ============= SUBSCRIPTION TIER FUNCTIONS =============

export async function seedSubscriptionTiers(tiers: InsertSubscriptionTier[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const tier of tiers) {
    await db.insert(subscriptionTiers).values(tier).onDuplicateKeyUpdate({
      set: {
        name: tier.name,
        price: tier.price,
        stripePriceId: tier.stripePriceId,
        features: tier.features,
        description: tier.description,
      }
    });
  }
}

export async function getAllSubscriptionTiers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(subscriptionTiers);
}

export async function getSubscriptionTierByName(tier: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(subscriptionTiers).where(eq(subscriptionTiers.tier, tier as any)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= LEAD SCORING FUNCTIONS =============

import { getLeadScoreFromRecord } from './lead-scoring';

export async function updateLeadScore(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the lead with all its data
  const lead = await getLeadById(leadId);
  if (!lead) throw new Error("Lead not found");
  
  // Calculate the score
  const scoreData = getLeadScoreFromRecord(lead);
  
  // Update the lead with new score
  await db.update(leads)
    .set({ 
      score: scoreData.total,
      scoreTier: scoreData.tier 
    })
    .where(eq(leads.id, leadId));
  
  return scoreData;
}

export async function recalculateAllLeadScores(agencyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get all leads for this agency
  const agencyLeads = await db.select().from(leads).where(eq(leads.agencyId, agencyId));
  
  // Update each lead's score
  for (const lead of agencyLeads) {
    await updateLeadScore(lead.id);
  }
  
  return agencyLeads.length;
}

// ============= LEAD ACTIVITY FUNCTIONS =============

export async function createLeadActivity(activity: {
  leadId: number;
  activityType: "call" | "email" | "sms" | "note" | "status_change" | "appointment";
  description?: string;
  vapiCallId?: string;
  callDuration?: number;
  callRecordingUrl?: string;
  performedBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(leadActivities).values(activity);
  
  // Recalculate lead score after new activity
  await updateLeadScore(activity.leadId);
}

export async function getLeadActivities(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(leadActivities).where(eq(leadActivities.leadId, leadId)).orderBy(desc(leadActivities.createdAt));
}

// ============= SOCIAL MEDIA POST FUNCTIONS =============

export async function createSocialMediaPost(post: {
  clientId: number;
  agencyId: number;
  platform: "facebook" | "instagram" | "linkedin";
  content: string;
  mediaUrls?: string;
  scheduledDate: Date;
  status?: "draft" | "scheduled" | "published" | "failed";
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(socialMediaPosts).values(post);
}

export async function getSocialMediaPostsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(socialMediaPosts)
    .where(eq(socialMediaPosts.clientId, clientId))
    .orderBy(desc(socialMediaPosts.scheduledDate));
}

export async function getSocialMediaPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(socialMediaPosts).where(eq(socialMediaPosts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateSocialMediaPost(id: number, data: {
  content?: string;
  mediaUrls?: string;
  scheduledDate?: Date;
  status?: "draft" | "scheduled" | "published" | "failed";
  publishedDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(socialMediaPosts).set(data).where(eq(socialMediaPosts.id, id));
}

export async function deleteSocialMediaPost(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(socialMediaPosts).where(eq(socialMediaPosts.id, id));
}

// ============= AI SCRIPT FUNCTIONS =============

export async function createAiScript(script: {
  clientId: number;
  agencyId: number;
  scriptType: "email" | "sms" | "social" | "voice" | "youtube";
  prompt: string;
  generatedContent: string;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(aiScripts).values(script);
}

export async function getAiScriptsByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(aiScripts)
    .where(eq(aiScripts.clientId, clientId))
    .orderBy(desc(aiScripts.createdAt));
}

export async function getAiScriptById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(aiScripts).where(eq(aiScripts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAiScript(id: number, data: {
  isUsed?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(aiScripts).set(data).where(eq(aiScripts.id, id));
}

// ============= LEAD SOURCE ASSISTANT MAPPING FUNCTIONS =============

export async function createLeadSourceMapping(mapping: {
  agencyId: number;
  leadSource: string;
  vapiAssistantId: string;
  autoCallEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(leadSourceAssistantMappings).values(mapping);
  return result;
}

export async function getLeadSourceMappingsByAgency(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(leadSourceAssistantMappings).where(eq(leadSourceAssistantMappings.agencyId, agencyId));
}

export async function getLeadSourceMapping(agencyId: number, leadSource: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(leadSourceAssistantMappings)
    .where(and(
      eq(leadSourceAssistantMappings.agencyId, agencyId),
      eq(leadSourceAssistantMappings.leadSource, leadSource)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function updateLeadSourceMapping(id: number, data: {
  vapiAssistantId?: string;
  autoCallEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(leadSourceAssistantMappings).set(data).where(eq(leadSourceAssistantMappings.id, id));
}

export async function deleteLeadSourceMapping(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(leadSourceAssistantMappings).where(eq(leadSourceAssistantMappings.id, id));
}


// ============= LOA ASSIGNMENT FUNCTIONS =============

export async function getLoaAssignment(loaUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(loaAssignments)
    .where(and(eq(loaAssignments.loaUserId, loaUserId), eq(loaAssignments.isActive, true)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getLoasByLoUserId(loUserId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    assignment: loaAssignments,
    user: users,
  }).from(loaAssignments)
    .innerJoin(users, eq(users.id, loaAssignments.loaUserId))
    .where(and(eq(loaAssignments.loUserId, loUserId), eq(loaAssignments.isActive, true)));
  return result;
}

export async function createLoaAssignment(data: {
  loaUserId: number;
  loUserId: number;
  agencyId: number;
  clientId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(loaAssignments).values(data);
}

export async function deactivateLoaAssignment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(loaAssignments).set({ isActive: false }).where(eq(loaAssignments.id, id));
}

export async function getAllLoaAssignments() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.select({
    assignment: loaAssignments,
    loaUser: users,
  }).from(loaAssignments)
    .innerJoin(users, eq(users.id, loaAssignments.loaUserId))
    .where(eq(loaAssignments.isActive, true));
  return result;
}
