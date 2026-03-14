import { eq, and, desc, sql, count } from "drizzle-orm";
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

/**
 * Update a user's openId — used when a Google OAuth login comes in for an
 * existing email/password account. Replaces the placeholder openId with the
 * real Google identity so future logins work seamlessly.
 */
export async function updateUserOpenId(userId: number, newOpenId: string, loginMethod: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ openId: newOpenId, loginMethod }).where(eq(users.id, userId));
  console.log(`[Database] Updated openId for user ${userId} to ${newOpenId} (loginMethod: ${loginMethod})`);
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

export async function getClientByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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

export async function getLeadsByClientIdPaginated(
  clientId: number,
  limit: number = 100,
  offset: number = 0,
  status?: string,
  search?: string,
  tag?: string
) {
  const db = await getDb();
  if (!db) return { leads: [], total: 0 };

  const conditions: any[] = [eq(leads.clientId, clientId)];
  if (status) conditions.push(eq(leads.status, status as any));
  if (search) {
    const q = `%${search}%`;
    conditions.push(
      sql`(${leads.firstName} LIKE ${q} OR ${leads.lastName} LIKE ${q} OR ${leads.email} LIKE ${q} OR ${leads.phone} LIKE ${q})`
    );
  }
  if (tag) {
    // JSON_SEARCH returns non-null if the tag value exists anywhere in the JSON array
    conditions.push(sql`JSON_SEARCH(${leads.tags}, 'one', ${tag}) IS NOT NULL`);
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(leads).where(where),
  ]);

  return { leads: rows, total: countRows[0]?.total ?? 0 };
}

export async function getDistinctLeadTags(clientId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    // Expand JSON array up to index 9 and collect distinct non-null values
    const [rows] = await (db as any).$client.query(
      `SELECT DISTINCT JSON_UNQUOTE(JSON_EXTRACT(tags, CONCAT('$[', n.n, ']'))) AS tag
       FROM leads
       JOIN (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
             UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) n
       WHERE client_id = ? AND JSON_EXTRACT(tags, CONCAT('$[', n.n, ']')) IS NOT NULL
       ORDER BY tag`,
      [clientId]
    );
    return (rows as any[]).map((r: any) => r.tag).filter(Boolean);
  } catch {
    return [];
  }
}

export async function getLeadsByAgencyId(agencyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(leads).where(eq(leads.agencyId, agencyId)).orderBy(desc(leads.createdAt));
}

export async function getLeadsByAgencyIdPaginated(
  agencyId: number,
  limit: number = 100,
  offset: number = 0,
  status?: string,
  search?: string,
  tag?: string
) {
  const db = await getDb();
  if (!db) return { leads: [], total: 0 };

  const conditions: any[] = [eq(leads.agencyId, agencyId)];
  if (status) conditions.push(eq(leads.status, status as any));
  if (search) {
    const q = `%${search}%`;
    conditions.push(
      sql`(${leads.firstName} LIKE ${q} OR ${leads.lastName} LIKE ${q} OR ${leads.email} LIKE ${q} OR ${leads.phone} LIKE ${q})`
    );
  }
  if (tag) {
    conditions.push(sql`JSON_SEARCH(${leads.tags}, 'one', ${tag}) IS NOT NULL`);
  }

  const where = and(...conditions);

  const [rows, countRows] = await Promise.all([
    db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(leads).where(where),
  ]);

  return { leads: rows, total: countRows[0]?.total ?? 0 };
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

  if (leadsData.length === 0) return [];

  // Use raw SQL to avoid Drizzle inserting columns that don't exist in the live DB
  // (schema drift: live DB has extra columns added outside of migrations)
  const mysql2 = await import('mysql2/promise');
  const conn = await mysql2.createConnection(process.env.DATABASE_URL!);

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Build parameterised multi-row INSERT for only the columns we have
  const rows: unknown[][] = leadsData.map(lead => [
    clientId,
    agencyId,
    lead.firstName,
    lead.lastName,
    (lead as any).email ?? null,
    (lead as any).phone ?? null,
    'import', // DB enum: 'social_media','referral','webinar','import','manual','facebook_ads','website','cold_call','other'
    (lead as any).notes ?? null,
    (lead as any).loanType ?? null,
    (lead as any).propertyAddress ?? null,
    (lead as any).propertyCity ?? null,
    (lead as any).propertyState ?? null,
    (lead as any).propertyZip ?? null,
    (lead as any).estimatedPurchasePrice ?? null,
    (lead as any).referringAgent ?? null,
    (lead as any).referringBrokerage ?? null,
    now,
    now,
  ]);

  const placeholders = rows.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
  const flat = rows.flat();

  await conn.execute(
    `INSERT INTO leads
     (client_id, agency_id, first_name, last_name, email, phone, source, notes,
      loan_type, property_address, property_city, property_state, property_zip,
      loan_amount, assigned_to, company, createdAt, updatedAt)
     VALUES ${placeholders}`,
    flat
  );

  await conn.end();

  // Increment client lead count
  const client = await getClientById(clientId);
  if (client) {
    await updateClient(clientId, { leadCount: (client.leadCount || 0) + leadsData.length });
  }

  return { count: leadsData.length };
}

// ============= BULK IMPORT WITH DUPLICATE DETECTION =============

export type ImportLeadRow = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
  notes?: string;
  loanType?: string;
  contactType?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  loanAmount?: number;
  referringAgent?: string;
  referringBrokerage?: string;
};

export type ImportLeadResult = {
  imported: number;
  skipped: number;
  failed: number;
  skippedRows: Array<{ row: number; reason: string; name: string }>;
  failedRows: Array<{ row: number; reason: string; name: string }>;
};

/**
 * Bulk import leads with duplicate detection.
 * Duplicates are detected by matching email OR phone within the same client.
 * Rows without firstName are skipped with a validation error.
 */
export async function importLeadsWithDuplicateCheck(
  agencyId: number,
  clientId: number,
  rows: ImportLeadRow[]
): Promise<ImportLeadResult> {
  if (rows.length === 0) return { imported: 0, skipped: 0, failed: 0, skippedRows: [], failedRows: [] };

  const mysql2 = await import('mysql2/promise');
  const conn = await mysql2.createConnection(process.env.DATABASE_URL!);

  // Build duplicate index from existing leads for this client
  const existingEmails = new Set<string>();
  const existingPhones = new Set<string>();
  try {
    const [existing] = await conn.execute(
      `SELECT email, phone FROM leads WHERE client_id = ? AND (email IS NOT NULL OR phone IS NOT NULL)`,
      [clientId]
    ) as any[];
    for (const r of existing as any[]) {
      if (r.email) existingEmails.add(r.email.toLowerCase().trim());
      if (r.phone) existingPhones.add(r.phone.replace(/\D/g, ''));
    }
  } catch (e) {
    console.warn('[importLeads] Could not load existing leads for duplicate check:', e);
  }

  const result: ImportLeadResult = { imported: 0, skipped: 0, failed: 0, skippedRows: [], failedRows: [] };
  const toInsert: ImportLeadRow[] = [];
  const insertIndexes: number[] = [];

  // Validate and deduplicate
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const displayName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || `Row ${i + 2}`;

    if (!row.firstName?.trim()) {
      result.skipped++;
      result.skippedRows.push({ row: i + 2, reason: 'Missing first name', name: displayName });
      continue;
    }

    const emailKey = row.email?.toLowerCase().trim();
    const phoneKey = row.phone?.replace(/\D/g, '');
    const isDuplicate =
      (emailKey && existingEmails.has(emailKey)) ||
      (phoneKey && phoneKey.length >= 7 && existingPhones.has(phoneKey));

    if (isDuplicate) {
      result.skipped++;
      result.skippedRows.push({ row: i + 2, reason: 'Duplicate (email or phone already exists)', name: displayName });
      continue;
    }

    // Add to in-flight index so we don't insert the same email/phone twice within this batch
    if (emailKey) existingEmails.add(emailKey);
    if (phoneKey && phoneKey.length >= 7) existingPhones.add(phoneKey);

    toInsert.push(row);
    insertIndexes.push(i);
  }

  // Batch insert valid rows in chunks of 100
  if (toInsert.length > 0) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const CHUNK = 100;
    for (let c = 0; c < toInsert.length; c += CHUNK) {
      const chunk = toInsert.slice(c, c + CHUNK);
      const batchRows = chunk.map(lead => [
        clientId, agencyId,
        lead.firstName.trim(),
        (lead.lastName || '').trim(),
        lead.email?.trim() || null,
        lead.phone?.trim() || null,
        lead.source || 'import',
        lead.notes || null,
        lead.loanType || null,
        lead.propertyAddress || null,
        lead.propertyCity || null,
        lead.propertyState || null,
        lead.propertyZip || null,
        lead.loanAmount ? String(lead.loanAmount) : null,
        lead.referringAgent || null,
        lead.company || null,
        now, now,
      ]);
      const placeholders = batchRows.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',');
      try {
        await conn.execute(
          `INSERT INTO leads
           (client_id, agency_id, first_name, last_name, email, phone, source, notes,
            loan_type, property_address, property_city, property_state, property_zip,
            loan_amount, assigned_to, company, createdAt, updatedAt)
           VALUES ${placeholders}`,
          batchRows.flat()
        );
        result.imported += chunk.length;
      } catch (e: any) {
        for (let k = 0; k < chunk.length; k++) {
          const row = chunk[k];
          result.failed++;
          result.failedRows.push({
            row: insertIndexes[c + k] + 2,
            reason: e?.message || 'Insert failed',
            name: `${row.firstName} ${row.lastName}`.trim(),
          });
        }
      }
    }
  }

  await conn.end();

  // Update client lead count
  if (result.imported > 0) {
    try {
      const client = await getClientById(clientId);
      if (client) {
        await updateClient(clientId, { leadCount: (client.leadCount || 0) + result.imported });
      }
    } catch (e) {
      console.warn('[importLeads] Could not update client lead count:', e);
    }
  }

  return result;
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
  agencyId?: number;
  activityType: "call" | "email" | "sms" | "note" | "task" | "appointment" | "status_change" | "score_change" | "import" | "ai_call";
  description?: string;
  subject?: string;
  metadata?: Record<string, unknown>;
  vapiCallId?: string;
  callDuration?: number;
  callRecordingUrl?: string;
  performedBy?: number;
}) {
  // Use raw SQL to match the actual live DB schema (leadId, type, content columns)
  const mysql2 = await import('mysql2/promise');
  const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
  try {
    // If agencyId not provided, look it up from the lead record
    let resolvedAgencyId = activity.agencyId ?? null;
    if (!resolvedAgencyId) {
      const [leadRows] = await conn.execute('SELECT agency_id FROM leads WHERE id = ? LIMIT 1', [activity.leadId]) as any[];
      resolvedAgencyId = leadRows?.[0]?.agency_id ?? 1;
    }
    await conn.execute(
      `INSERT INTO lead_activities (leadId, agencyId, userId, type, subject, content, metadata, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        activity.leadId,
        resolvedAgencyId,
        activity.performedBy ?? null,
        activity.activityType,
        activity.subject ?? null,
        activity.description ?? null,
        activity.metadata ? JSON.stringify(activity.metadata) : null,
      ]
    );
  } finally {
    await conn.end();
  }
  
  // Recalculate lead score after new activity
  await updateLeadScore(activity.leadId);
}

export async function getLeadActivities(leadId: number) {
  // Use raw SQL to match the actual live DB schema
  const mysql2 = await import('mysql2/promise');
  const conn = await mysql2.createConnection(process.env.DATABASE_URL!);
  try {
    const [rows] = await conn.execute(
      `SELECT id, leadId, agencyId, userId, type as activityType, subject, content as description, metadata, createdAt
       FROM lead_activities WHERE leadId = ? ORDER BY createdAt DESC`,
      [leadId]
    ) as any[];
    return rows as Array<{
      id: number;
      leadId: number;
      agencyId: number | null;
      userId: number | null;
      activityType: string;
      subject: string | null;
      description: string | null;
      metadata: unknown;
      createdAt: Date;
    }>;
  } finally {
    await conn.end();
  }
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
