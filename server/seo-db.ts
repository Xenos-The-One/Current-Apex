import { eq, or, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertSeoUser, seoUsers, seoClients, InsertSeoClient, content, InsertContent, contentTemplates, InsertContentTemplate, contentComments, contentRevisions, contentAnalytics, contentRepurposed, contentQualityScores, webhookConfigs, publishLogs, contentBriefs } from "../drizzle/seo-schema";
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

export async function upsertUser(user: InsertSeoUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertSeoUser = {
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

    await db.insert(seoUsers).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(seoUsers).where(eq(seoUsers.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Client management queries
export async function createClient(client: InsertSeoClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(seoClients).values(client);
  return result[0].insertId;
}

export async function getClientsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // Return clients created by this user OR any client linked from the CRM (crm_client_id set)
  // This ensures CRM clients automatically appear in the AI SEO Portal
  return db.select().from(seoClients).where(
    or(
      eq(seoClients.createdBy, userId),
      isNotNull(seoClients.crmClientId)
    )
  );
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(seoClients).where(eq(seoClients.id, id)).limit(1);
  return result[0];
}

export async function updateClient(id: number, updates: Partial<InsertSeoClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(seoClients).set({ ...updates, updatedAt: new Date() }).where(eq(seoClients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(seoClients).where(eq(seoClients.id, id));
}

// Content management queries
export async function createContent(contentData: InsertContent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(content).values(contentData);
  return result[0].insertId;
}

export async function getContentByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(content).where(eq(content.createdBy, userId)).orderBy(content.createdAt);
}

export async function getContentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(content).where(eq(content.id, id)).limit(1);
  return result[0];
}

export async function updateContent(id: number, updates: Partial<InsertContent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(content).set({ ...updates, updatedAt: new Date() }).where(eq(content.id, id));
}

export async function deleteContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(content).where(eq(content.id, id));
}

export async function getContentByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(content).where(eq(content.clientId, clientId)).orderBy(content.createdAt);
}

export async function getContentWithClient(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      content: content,
      client: seoClients,
    })
    .from(content)
    .leftJoin(seoClients, eq(content.clientId, seoClients.id))
    .where(eq(content.createdBy, userId))
    .orderBy(content.createdAt);
}


// Template functions
export async function createTemplate(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentTemplates).values(data);
  return result[0];
}

export async function getTemplatesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contentTemplates)
    .where(eq(contentTemplates.createdBy, userId))
    .orderBy(contentTemplates.createdAt);
}

export async function getPublicTemplates() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contentTemplates)
    .where(eq(contentTemplates.isPublic, 1))
    .orderBy(contentTemplates.createdAt);
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(contentTemplates)
    .where(eq(contentTemplates.id, id))
    .limit(1);
  return result[0] || null;
}

export async function updateTemplate(id: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contentTemplates).set(updates).where(eq(contentTemplates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(contentTemplates).where(eq(contentTemplates.id, id));
}


// Collaboration functions
export async function addComment(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentComments).values(data);
  return result[0];
}

export async function getContentComments(contentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contentComments)
    .where(eq(contentComments.contentId, contentId))
    .orderBy(contentComments.createdAt);
}

export async function updateCommentStatus(id: number, isResolved: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contentComments).set({ isResolved }).where(eq(contentComments.id, id));
}

export async function createRevision(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentRevisions).values(data);
  return result[0];
}

export async function getContentRevisions(contentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contentRevisions)
    .where(eq(contentRevisions.contentId, contentId))
    .orderBy(contentRevisions.revisionNumber);
}

// Analytics functions
export async function recordAnalytics(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentAnalytics).values(data);
  return result[0];
}

export async function getContentAnalytics(contentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contentAnalytics)
    .where(eq(contentAnalytics.contentId, contentId))
    .orderBy(contentAnalytics.recordedAt);
}

export async function updateAnalytics(contentId: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contentAnalytics).set(updates).where(eq(contentAnalytics.contentId, contentId));
}

// Repurposing functions
export async function createRepurposedContent(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentRepurposed).values(data);
  return result[0];
}

export async function getRepurposedContent(contentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(contentRepurposed)
    .where(eq(contentRepurposed.contentId, contentId))
    .orderBy(contentRepurposed.createdAt);
}

export async function deleteRepurposedContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(contentRepurposed).where(eq(contentRepurposed.id, id));
}


// Quality Score functions
export async function saveQualityScore(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete existing score for this content first
  await db.delete(contentQualityScores).where(eq(contentQualityScores.contentId, data.contentId));
  const result = await db.insert(contentQualityScores).values(data);
  return result[0];
}

export async function getQualityScore(contentId: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(contentQualityScores)
    .where(eq(contentQualityScores.contentId, contentId))
    .limit(1);
  return results.length > 0 ? results[0] : null;
}


// Webhook Config functions
export async function createWebhookConfig(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(webhookConfigs).values(data);
  return result[0].insertId;
}

export async function getWebhooksByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhookConfigs).where(eq(webhookConfigs.clientId, clientId));
}

export async function getAllWebhooks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhookConfigs).where(eq(webhookConfigs.createdBy, userId));
}

export async function getWebhookById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(webhookConfigs).where(eq(webhookConfigs.id, id)).limit(1);
  return result[0] || null;
}

export async function updateWebhookConfig(id: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(webhookConfigs).set({ ...updates, updatedAt: new Date() }).where(eq(webhookConfigs.id, id));
}

export async function deleteWebhookConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(webhookConfigs).where(eq(webhookConfigs.id, id));
}

// Publish Log functions
export async function createPublishLog(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(publishLogs).values(data);
  return result[0].insertId;
}

export async function getPublishLogs(contentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(publishLogs).where(eq(publishLogs.contentId, contentId)).orderBy(publishLogs.publishedAt);
}

export async function updatePublishLog(id: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(publishLogs).set(updates).where(eq(publishLogs.id, id));
}

// Content Brief functions
export async function createContentBrief(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(contentBriefs).values(data);
  return result[0].insertId;
}

export async function getContentBriefs(clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (clientId) {
    return db.select().from(contentBriefs).where(eq(contentBriefs.clientId, clientId)).orderBy(contentBriefs.createdAt);
  }
  return db.select().from(contentBriefs).orderBy(contentBriefs.createdAt);
}

export async function getContentBriefByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contentBriefs).where(eq(contentBriefs.shareToken, token)).limit(1);
  return result[0] || null;
}

export async function getContentBriefById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(contentBriefs).where(eq(contentBriefs.id, id)).limit(1);
  return result[0] || null;
}

export async function updateContentBrief(id: number, updates: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contentBriefs).set({ ...updates, updatedAt: new Date() }).where(eq(contentBriefs.id, id));
}

export async function deleteContentBrief(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(contentBriefs).where(eq(contentBriefs.id, id));
}

// Portal Branding functions
export async function getPortalBranding(clientId: number) {
  const db = await getDb();
  if (!db) return null;
  const { portalBranding } = await import("../drizzle/schema");
  const result = await db.select().from(portalBranding).where(eq(portalBranding.clientId, clientId)).limit(1);
  return result[0] || null;
}

export async function upsertPortalBranding(data: {
  clientId: number;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  portalName?: string;
  welcomeMessage?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { portalBranding } = await import("../drizzle/schema");
  
  // Check if branding exists
  const existing = await getPortalBranding(data.clientId);
  
  if (existing) {
    // Update existing
    await db.update(portalBranding)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(portalBranding.clientId, data.clientId));
    return { ...existing, ...data };
  } else {
    // Insert new
    const result = await db.insert(portalBranding).values(data);
    return { id: result[0].insertId, ...data };
  }
}

// ── CRM Integration helpers ──────────────────────────────────────────────────

/**
 * Find a seo_client linked to a CRM client ID.
 */
export async function getSeoClientByCrmId(crmClientId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { seoClients } = await import("../drizzle/seo-schema");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select().from(seoClients).where(eq(seoClients.crmClientId, crmClientId)).limit(1);
  return rows[0];
}

/**
 * Ensure a seo_client exists for a CRM client. Creates one if missing.
 * Returns the seo_client id.
 */
export async function ensureLinkedSeoClient(opts: {
  crmClientId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  businessType?: string | null;
  seoUserId: number;
}): Promise<number> {
  const existing = await getSeoClientByCrmId(opts.crmClientId);
  if (existing) return existing.id;

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { seoClients } = await import("../drizzle/seo-schema");
  const [result] = await db.insert(seoClients).values({
    name: opts.name,
    businessName: opts.name, // Required NOT NULL field — use client name as business name
    email: opts.email ?? undefined,
    phone: opts.phone ?? undefined,
    businessType: opts.businessType ?? undefined,
    industry: opts.businessType === "loan_officer" ? "Mortgage / Lending" : opts.businessType === "real_estate" ? "Real Estate" : undefined,
    createdBy: opts.seoUserId,
    crmClientId: opts.crmClientId,
    isActive: 1,
  });
  return result.insertId;
}

/**
 * Get the first admin-role SEO user (used when creating SEO clients on behalf of the system).
 * Falls back to the owner openId from ENV if no admin user is found.
 */
export async function getFirstAdminSeoUser() {
  const db = await getDb();
  if (!db) return undefined;
  const { seoUsers } = await import("../drizzle/seo-schema");
  const { eq } = await import("drizzle-orm");
  // Try to get the owner SEO user first
  if (ENV.ownerOpenId) {
    const rows = await db.select().from(seoUsers).where(eq(seoUsers.openId, ENV.ownerOpenId)).limit(1);
    if (rows[0]) return rows[0];
  }
  // Fall back to any admin user
  const rows = await db.select().from(seoUsers).where(eq(seoUsers.role, "admin")).limit(1);
  return rows[0];
}
