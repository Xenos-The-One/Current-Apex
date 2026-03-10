import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      const email = userInfo.email ?? null;
      const openId = userInfo.openId;
      const loginMethod = userInfo.loginMethod ?? userInfo.platform ?? null;

      // ── Step 1: Check if a user with this openId already exists ──────────────
      let existingUser = await db.getUserByOpenId(openId);

      // ── Step 2: If not found by openId, try to find by email ─────────────────
      // This handles the case where a user was created with an email/password
      // account (placeholder openId) and is now logging in via Google OAuth.
      if (!existingUser && email) {
        const userByEmail = await db.getUserByEmail(email);
        if (userByEmail) {
          console.log(`[OAuth] Found existing account for email ${email} (id=${userByEmail.id}, oldOpenId=${userByEmail.openId}) — migrating to Google OAuth openId`);
          // Update their openId to the real Google identity so future logins work
          await db.updateUserOpenId(userByEmail.id, openId, loginMethod);
          existingUser = { ...userByEmail, openId, loginMethod };
        }
      }

      // ── Step 3: Determine role for new users ──────────────────────────────────
      let role: string | undefined = undefined;
      let clientRecord: Awaited<ReturnType<typeof db.getClientByEmail>> | undefined = undefined;

      if (!existingUser) {
        // Brand new user — check if their email matches a client account
        if (email) {
          clientRecord = await db.getClientByEmail(email);
          if (clientRecord) {
            role = "client_user";
            console.log(`[OAuth] New user email ${email} matched client account (id=${clientRecord.id}) — assigning client_user role`);
          }
        }
        // Check if this is the owner
        if (!role && openId === ENV.ownerOpenId) {
          role = "admin";
        }

        // Create the new user
        await db.upsertUser({
          openId,
          name: userInfo.name || null,
          email,
          loginMethod,
          lastSignedIn: new Date(),
          ...(role ? { role: role as any } : {}),
        });

        // Link to client account if applicable
        if (clientRecord) {
          const newUser = await db.getUserByEmail(email!);
          if (newUser && clientRecord.userId !== newUser.id) {
            await db.updateClient(clientRecord.id, { userId: newUser.id });
            console.log(`[OAuth] Linked new user (id=${newUser.id}) to client account (id=${clientRecord.id})`);
          }
        }
      } else {
        // Existing user — just update lastSignedIn
        await db.upsertUser({
          openId,
          lastSignedIn: new Date(),
        });
      }

      // ── Step 4: Issue session cookie ──────────────────────────────────────────
      const sessionToken = await sdk.createSessionToken(openId, {
        name: userInfo.name || existingUser?.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
