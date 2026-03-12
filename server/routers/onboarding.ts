import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { users, accountInvitations, subAccountCredentials, clients, agencies, passwordResetTokens } from "../../drizzle/schema";
import { sendEmail } from "../email-service";
import { upsertUser as upsertSeoUser, getUserByOpenId, ensureLinkedSeoClient, getFirstAdminSeoUser } from "../seo-db";
import { sdk } from "../_core/sdk";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const onboardingRouter = router({
  /**
   * Admin creates a sub-account invitation.
   * Creates a pending user record + invitation token + sends verification email.
   */
  createSubAccount: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email(),
      phone: z.string().optional(),
      company: z.string().optional(),
      role: z.enum(["admin", "agency_owner", "client_user", "loa"]).default("client_user"),
      agencyId: z.number().optional(),
      clientId: z.number().optional(),
      origin: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only admins and super_admins can create sub-accounts
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      // Only super_admin can create admin or super_admin accounts
      if ((input.role === "admin" || input.role === "super_admin") && ctx.user.role !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can create admin-level accounts.",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Check if email already exists
      const [existingUser] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists.",
        });
      }

      // Create a pending user record with a placeholder openId
      const placeholderOpenId = `pending_${crypto.randomBytes(16).toString("hex")}`;
      const fullName = `${input.firstName} ${input.lastName}`;

      const [insertResult] = await db.insert(users).values({
        openId: placeholderOpenId,
        name: fullName,
        email: input.email,
        phone: input.phone || null,
        loginMethod: "email_password",
        role: input.role,
      });

      const newUserId = (insertResult as any).insertId as number;

      // Generate a secure invitation token (valid for 7 days)
      const token = crypto.randomBytes(48).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.insert(accountInvitations).values({
        token,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        company: input.company || null,
        role: input.role,
        agencyId: input.agencyId || null,
        clientId: input.clientId || null,
        status: "pending",
        invitedByUserId: ctx.user.id,
        expiresAt,
      });

      // Send verification email
      const activationUrl = `${input.origin}/activate-account?token=${token}`;
      const emailResult = await sendEmail({
        to: input.email,
        subject: "Activate Your Sterling Marketing CRM Account",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:40px 40px 32px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Sterling Marketing</h1>
      <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">AI-Powered CRM Platform</p>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;">Welcome, ${input.firstName}! 👋</h2>
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;">
        Your account has been created on the Sterling Marketing CRM platform${input.company ? ` for <strong>${input.company}</strong>` : ""}. 
        Click the button below to verify your email and set up your password to get started.
      </p>
      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${activationUrl}" 
           style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;box-shadow:0 4px 12px rgba(37,99,235,0.4);">
          Activate My Account →
        </a>
      </div>
      <!-- Details -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:24px 0;">
        <p style="color:#64748b;font-size:13px;margin:0 0 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Account Details</p>
        <p style="color:#1e293b;font-size:15px;margin:0 0 4px;"><strong>Name:</strong> ${fullName}</p>
        <p style="color:#1e293b;font-size:15px;margin:0 0 4px;"><strong>Email:</strong> ${input.email}</p>
        ${input.company ? `<p style="color:#1e293b;font-size:15px;margin:0;"><strong>Company:</strong> ${input.company}</p>` : ""}
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:24px 0 0;">
        This activation link expires in <strong>7 days</strong>. If you did not request this account, you can safely ignore this email.
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} Sterling Marketing | AI-Powered Lead Management
      </p>
    </div>
  </div>
</body>
</html>`,
        skipFooter: true,
      });

      console.log(`[Onboarding] Sub-account created for ${input.email} (userId: ${newUserId}), email sent: ${emailResult.success}`);

      // Auto-provision a CRM client record and linked SEO client for client-level roles
      let provisionedClientId: number | null = null;
      if (input.role === "client_user" || input.role === "agency_owner") {
        try {
          let crmClientId: number | undefined = input.clientId;
          if (!crmClientId) {
            // Create a new CRM client record linked to this user
            const agencyRows = await db.select().from(agencies).limit(1);
            const agencyId = input.agencyId ?? (agencyRows[0]?.id ?? 1);
            const clientInsert = await db.insert(clients).values({
              agencyId,
              userId: newUserId,
              name: input.company || fullName,
              email: input.email,
              phone: input.phone || null,
              subscriptionTier: "starter",
              subscriptionStatus: "trial",
              trialEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
              accessMode: "limited",
            });
            crmClientId = (clientInsert as any)[0]?.insertId ?? (clientInsert as any).insertId;
          }
          if (crmClientId) {
            provisionedClientId = crmClientId;
            // Ensure the creating admin exists in seo_users
            await upsertSeoUser({
              openId: ctx.user.openId,
              name: ctx.user.name,
              email: ctx.user.email,
              role: "admin",
            });
            const adminSeoUser = await getUserByOpenId(ctx.user.openId) ?? await getFirstAdminSeoUser();
            if (adminSeoUser) {
              await ensureLinkedSeoClient({
                crmClientId,
                name: input.company || fullName,
                email: input.email,
                phone: input.phone,
                seoUserId: adminSeoUser.id,
              });
              console.log(`[Onboarding] SEO client auto-provisioned for crmClientId=${crmClientId}`);
            }
          }
        } catch (seoErr) {
          console.error("[Onboarding] Failed to auto-provision SEO client:", seoErr);
        }
      }

      return {
        success: true,
        userId: newUserId,
        clientId: provisionedClientId,
        clientName: input.company || fullName,
        emailSent: emailResult.success,
        message: `Account created and activation email sent to ${input.email}`,
      };
    }),

  /**
   * Validate an invitation token (public — called when user opens the activation link)
   */
  validateInvitationToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [invitation] = await db
        .select()
        .from(accountInvitations)
        .where(eq(accountInvitations.token, input.token))
        .limit(1);

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid activation link." });
      }

      if (invitation.status === "accepted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This account has already been activated." });
      }

      if (invitation.status === "expired" || new Date() > invitation.expiresAt) {
        // Mark as expired if not already
        await db
          .update(accountInvitations)
          .set({ status: "expired" })
          .where(eq(accountInvitations.id, invitation.id));
        throw new TRPCError({ code: "BAD_REQUEST", message: "This activation link has expired. Please contact your administrator." });
      }

      return {
        valid: true,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        email: invitation.email,
        company: invitation.company,
      };
    }),

  /**
   * Activate account — user sets their password (public — no auth required)
   */
  activateAccount: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(8, "Password must be at least 8 characters"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [invitation] = await db
        .select()
        .from(accountInvitations)
        .where(and(
          eq(accountInvitations.token, input.token),
          eq(accountInvitations.status, "pending"),
        ))
        .limit(1);

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or already used activation link." });
      }

      if (new Date() > invitation.expiresAt) {
        await db.update(accountInvitations).set({ status: "expired" }).where(eq(accountInvitations.id, invitation.id));
        throw new TRPCError({ code: "BAD_REQUEST", message: "This activation link has expired." });
      }

      // Find the pending user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, invitation.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User account not found." });
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Create or update sub-account credentials
      const [existingCred] = await db
        .select()
        .from(subAccountCredentials)
        .where(eq(subAccountCredentials.userId, user.id))
        .limit(1);

      if (existingCred) {
        await db
          .update(subAccountCredentials)
          .set({ passwordHash, isActive: true, activatedAt: new Date() })
          .where(eq(subAccountCredentials.userId, user.id));
      } else {
        await db.insert(subAccountCredentials).values({
          userId: user.id,
          passwordHash,
          isActive: true,
          activatedAt: new Date(),
        });
      }

      // Mark invitation as accepted
      await db
        .update(accountInvitations)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(accountInvitations.id, invitation.id));

      console.log(`[Onboarding] Account activated for ${invitation.email} (userId: ${user.id})`);

      return {
        success: true,
        message: "Account activated successfully! You can now log in.",
        email: invitation.email,
        name: `${invitation.firstName} ${invitation.lastName}`,
      };
    }),

  /**
   * Email + password login for sub-account users (those invited by an admin).
   * Verifies the bcrypt hash stored in sub_account_credentials, then issues
   * the same session cookie that the OAuth callback uses.
   */
  loginWithPassword: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      if (user.loginMethod !== "email_password") {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Please use the Manus login button for this account" });
      }
      const [cred] = await db
        .select()
        .from(subAccountCredentials)
        .where(eq(subAccountCredentials.userId, user.id))
        .limit(1);
      if (!cred || !cred.isActive) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Account not yet activated. Please check your email for the activation link." });
      }
      const valid = await bcrypt.compare(input.password, cred.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });
      }
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || "",
        expiresInMs: ONE_YEAR_MS,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
      return {
        success: true,
        name: user.name,
        role: user.role,
      };
    }),

  /**
   * List all sub-accounts (admin only)
   */
  listSubAccounts: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const invitations = await db
      .select()
      .from(accountInvitations)
      .orderBy(accountInvitations.createdAt);

    return invitations;
  }),

  /**
   * Resend an invitation email — regenerates the token and extends expiry by 7 days.
   */
  resendInvitation: protectedProcedure
    .input(z.object({
      invitationId: z.number(),
      origin: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [invitation] = await db
        .select()
        .from(accountInvitations)
        .where(eq(accountInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation not found" });
      }

      if (invitation.status === "accepted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This invitation has already been accepted — the account is active." });
      }

      // Generate a new token and extend expiry by 7 days
      const newToken = crypto.randomBytes(48).toString("hex");
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db
        .update(accountInvitations)
        .set({ token: newToken, expiresAt: newExpiry, status: "pending" })
        .where(eq(accountInvitations.id, input.invitationId));

      const activationUrl = `${input.origin}/activate-account?token=${newToken}`;
      const fullName = `${invitation.firstName} ${invitation.lastName}`;

      await sendEmail({
        to: invitation.email,
        subject: "Your Sterling Marketing CRM Activation Link (Resent)",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:40px 40px 32px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Sterling Marketing</h1>
      <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">AI-Powered CRM Platform</p>
    </div>
    <div style="padding:40px;">
      <h2 style="color:#1e293b;font-size:22px;margin:0 0 16px;">Hi ${fullName}, here's your new activation link!</h2>
      <p style="color:#475569;font-size:16px;line-height:1.6;margin:0 0 24px;">
        Your previous activation link expired. We've generated a fresh one — click below to set up your password and access your account.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${activationUrl}" style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;box-shadow:0 4px 12px rgba(37,99,235,0.4);">Activate My Account →</a>
      </div>
      <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:24px 0 0;">This link expires in <strong>7 days</strong>.</p>
    </div>
    <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} Sterling Marketing | AI-Powered Lead Management</p>
    </div>
  </div>
</body>
</html>`,
        skipFooter: true,
      });

      return { success: true, message: `Activation email resent to ${invitation.email}` };
    }),

  /**
   * Check login method for a given email — used to show OAuth hint on login page.
   */
  getLoginMethod: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { loginMethod: null };
      const [user] = await db
        .select({ id: users.id, loginMethod: users.loginMethod })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (!user) return { loginMethod: null };
      // If the user has active password credentials, they can always use email+password
      // regardless of what loginMethod field says (e.g. admin may have set a password for them)
      const [creds] = await db
        .select({ id: subAccountCredentials.id })
        .from(subAccountCredentials)
        .where(and(eq(subAccountCredentials.userId, user.id), eq(subAccountCredentials.isActive, true)))
        .limit(1);
      if (creds) return { loginMethod: 'email_password' };
      return { loginMethod: user.loginMethod ?? null };
    }),

  /**
   * Request a password reset — sends a reset link to the user's email.
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email(), origin: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: true };
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);
      if (!user) return { success: true };
      if (user.loginMethod !== 'email_password') {
        await sendEmail({
          to: input.email,
          subject: 'Sign in to your CRM account',
          html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;"><h2 style="color:#1e293b;">Sign in with Google / Manus</h2><p style="color:#475569;">Hi ${user.name || 'there'},</p><p style="color:#475569;">Your account uses <strong>Google / Manus sign-in</strong> — you don't have a password. Please use the <strong>"Continue with Google / Manus"</strong> button on the login page.</p><div style="text-align:center;margin:32px 0;"><a href="${input.origin}/api/client-login" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">Go to Login Page</a></div></div>`,
          skipFooter: false,
        });
        return { success: true };
      }
      const token = crypto.randomBytes(48).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });
      const resetUrl = `${input.origin}/api/client-login?reset_token=${token}`;
      await sendEmail({
        to: input.email,
        subject: 'Reset your CRM password',
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;"><h2 style="color:#1e293b;">Reset your password</h2><p style="color:#475569;">Hi ${user.name || 'there'},</p><p style="color:#475569;">Click the button below to set a new password. This link expires in 1 hour.</p><div style="text-align:center;margin:32px 0;"><a href="${resetUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;display:inline-block;">Reset Password</a></div><p style="color:#94a3b8;font-size:13px;">If you didn't request this, you can safely ignore this email.</p></div>`,
        skipFooter: false,
      });
      return { success: true };
    }),

  /**
   * Complete a password reset — validates token and updates the password hash.
   */
  resetPassword: publicProcedure
    .input(z.object({ token: z.string(), password: z.string().min(8, 'Password must be at least 8 characters') }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const [resetToken] = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, input.token))
        .limit(1);
      if (!resetToken) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired reset link.' });
      if (resetToken.usedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This reset link has already been used.' });
      if (new Date() > resetToken.expiresAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'This reset link has expired. Please request a new one.' });
      const passwordHash = await bcrypt.hash(input.password, 12);
      const [existing] = await db
        .select()
        .from(subAccountCredentials)
        .where(eq(subAccountCredentials.userId, resetToken.userId))
        .limit(1);
      if (existing) {
        await db.update(subAccountCredentials)
          .set({ passwordHash, isActive: true, updatedAt: new Date() })
          .where(eq(subAccountCredentials.userId, resetToken.userId));
      } else {
        await db.insert(subAccountCredentials).values({ userId: resetToken.userId, passwordHash, isActive: true, activatedAt: new Date() });
      }
      await db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));
      return { success: true };
    }),
});
