import { getDb } from "./seo-db";
import { clientPortalUsers, seoClients as clients } from "../drizzle/seo-schema";
import { eq, and } from "drizzle-orm";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const INVITATION_EXPIRY_HOURS = 72; // 3 days

/**
 * Hash password using SHA-256
 */
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const passwordHash = hashPassword(password);
  return passwordHash === hash;
}

/**
 * Generate invitation token
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create client portal user invitation
 */
export async function createClientPortalInvitation(
  clientId: number,
  email: string,
  name: string,
  role: "client_admin" | "client_viewer" = "client_viewer"
) {
  const db = (await getDb())!;
  if (!db) throw new Error("Database not available");

  // Check if user already exists
  const existing = await db.select()
    .from(clientPortalUsers)
    .where(eq(clientPortalUsers.email, email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error("User with this email already exists");
  }

  // Generate invitation token
  const token = generateInvitationToken();
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + INVITATION_EXPIRY_HOURS);

  // Create temporary password (will be changed on first login)
  const tempPassword = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(tempPassword);

  // Insert user
  const [result] = await db.insert(clientPortalUsers).values({
    clientId,
    email,
    name,
    role,
    passwordHash,
    invitationToken: token,
    invitationExpiry: expiry,
    isActive: 0, // Inactive until they accept invitation
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    id: result.insertId,
    token,
    email,
    expiresAt: expiry,
  };
}

/**
 * Accept invitation and set password
 */
export async function acceptInvitation(token: string, newPassword: string) {
  const db = (await getDb())!;
  if (!db) throw new Error("Database not available");

  // Find user by token
  const [user] = await db.select()
    .from(clientPortalUsers)
    .where(eq(clientPortalUsers.invitationToken, token))
    .limit(1);

  if (!user) {
    throw new Error("Invalid invitation token");
  }

  // Check if token expired
  if (user.invitationExpiry && new Date() > user.invitationExpiry) {
    throw new Error("Invitation has expired");
  }

  // Update user with new password and activate
  const passwordHash = hashPassword(newPassword);
  await db.update(clientPortalUsers)
    .set({
      passwordHash,
      isActive: 1,
      invitationToken: null,
      invitationExpiry: null,
      updatedAt: new Date(),
    })
    .where(eq(clientPortalUsers.id, user.id));

  return { success: true, userId: user.id };
}

/**
 * Login client portal user
 */
export async function loginClientPortalUser(email: string, password: string) {
  const db = (await getDb())!;
  if (!db) throw new Error("Database not available");

  // Find user
  const [user] = await db.select()
    .from(clientPortalUsers)
    .where(eq(clientPortalUsers.email, email))
    .limit(1);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if active
  if (user.isActive === 0) {
    throw new Error("Account is not activated. Please check your invitation email.");
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }

  // Update last login
  await db.update(clientPortalUsers)
    .set({ lastLoginAt: new Date() })
    .where(eq(clientPortalUsers.id, user.id));

  // Generate JWT token
  const token = jwt.sign(
    {
      userId: user.id,
      clientId: user.clientId,
      email: user.email,
      role: user.role,
      type: "client_portal",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user.id,
      clientId: user.clientId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

/**
 * Verify client portal JWT token
 */
export function verifyClientPortalToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      clientId: number;
      email: string;
      role: string;
      type: string;
    };

    if (decoded.type !== "client_portal") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Get client portal user by ID
 */
export async function getClientPortalUser(userId: number) {
  const db = (await getDb())!;
  if (!db) throw new Error("Database not available");

  const [user] = await db.select({
    id: clientPortalUsers.id,
    clientId: clientPortalUsers.clientId,
    email: clientPortalUsers.email,
    name: clientPortalUsers.name,
    role: clientPortalUsers.role,
    isActive: clientPortalUsers.isActive,
    lastLoginAt: clientPortalUsers.lastLoginAt,
    clientName: clients.name,
    clientCompany: clients.company,
  })
    .from(clientPortalUsers)
    .leftJoin(clients, eq(clientPortalUsers.clientId, clients.id))
    .where(eq(clientPortalUsers.id, userId))
    .limit(1);

  return user;
}

/**
 * List all portal users for a client
 */
export async function listClientPortalUsers(clientId: number) {
  const db = (await getDb())!;
  if (!db) throw new Error("Database not available");

  const users = await db.select({
    id: clientPortalUsers.id,
    email: clientPortalUsers.email,
    name: clientPortalUsers.name,
    role: clientPortalUsers.role,
    isActive: clientPortalUsers.isActive,
    lastLoginAt: clientPortalUsers.lastLoginAt,
    createdAt: clientPortalUsers.createdAt,
  })
    .from(clientPortalUsers)
    .where(eq(clientPortalUsers.clientId, clientId));

  return users;
}

/**
 * Change password
 */
export async function changeClientPortalPassword(
  userId: number,
  oldPassword: string,
  newPassword: string
) {
  const db = (await getDb())!;
  if (!db) throw new Error("Database not available");

  // Get user
  const [user] = await db.select()
    .from(clientPortalUsers)
    .where(eq(clientPortalUsers.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  // Verify old password
  if (!verifyPassword(oldPassword, user.passwordHash)) {
    throw new Error("Current password is incorrect");
  }

  // Update password
  const newPasswordHash = hashPassword(newPassword);
  await db.update(clientPortalUsers)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    })
    .where(eq(clientPortalUsers.id, userId));

  return { success: true };
}

/**
 * Deactivate client portal user
 */
export async function deactivateClientPortalUser(userId: number) {
  const db = (await getDb())!;
  if (!db) throw new Error("Database not available");

  await db.update(clientPortalUsers)
    .set({
      isActive: 0,
      updatedAt: new Date(),
    })
    .where(eq(clientPortalUsers.id, userId));

  return { success: true };
}
