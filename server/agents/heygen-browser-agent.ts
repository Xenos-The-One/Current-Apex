/**
 * HeyGen Browser Automation Agent
 *
 * Uses puppeteer-core with Browserless.io cloud browser to generate videos
 * via the HeyGen Video Agent UI — bypassing the API plan requirement.
 *
 * Architecture: Cookie-based authentication.
 * - User logs into HeyGen manually once via a popup in the CRM
 * - CRM captures auth cookies/tokens from the popup
 * - Browser agent injects stored cookies to skip login entirely (no Cloudflare captcha)
 *
 * Multi-session approach to work within Browserless free tier (60s max per session).
 * Session 1 (SUBMIT): Inject cookies → Video Agent → Brand System → Type prompt → Submit
 * Wait: 5 min (no browser)
 * Session 2 (DOWNLOAD): Inject cookies → Check for completed video → Download → CDN
 */

import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import puppeteer from "puppeteer-core";
import type { Browser, Page, Protocol } from "puppeteer-core";
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "../seo-db";
import { heygenSessions } from "../../drizzle/seo-schema";

const HEYGEN_URL = "https://app.heygen.com";
const BROWSERLESS_WSS = "wss://production-sfo.browserless.io";

function getBrowserlessToken(): string {
  const token = process.env.BROWSERLESS_API_TOKEN;
  if (!token) {
    throw new Error(
      "BROWSERLESS_API_TOKEN is required. Sign up at https://browserless.io and add the token in Settings → Secrets."
    );
  }
  return token;
}

// ─── Concurrency Lock ────────────────────────────────────────────────────────
interface LockState {
  locked: boolean;
  contentPackageId: number | null;
  topic: string | null;
  startedAt: number | null;
}

const agentLock: LockState = {
  locked: false,
  contentPackageId: null,
  topic: null,
  startedAt: null,
};

export function isAgentBusy(): { busy: boolean; currentJob: { contentPackageId: number | null; topic: string | null; startedAt: number | null; elapsedMs: number | null } } {
  return {
    busy: agentLock.locked,
    currentJob: {
      contentPackageId: agentLock.contentPackageId,
      topic: agentLock.topic,
      startedAt: agentLock.startedAt,
      elapsedMs: agentLock.startedAt ? Date.now() - agentLock.startedAt : null,
    },
  };
}

function acquireLock(contentPackageId: number, topic: string): boolean {
  if (agentLock.locked) return false;
  agentLock.locked = true;
  agentLock.contentPackageId = contentPackageId;
  agentLock.topic = topic;
  agentLock.startedAt = Date.now();
  return true;
}

function releaseLock(): void {
  agentLock.locked = false;
  agentLock.contentPackageId = null;
  agentLock.topic = null;
  agentLock.startedAt = null;
}

export interface HeyGenBrowserJobInput {
  prompt: string;
  brandSystemName: string;
  contentPackageId: number;
  topic: string;
  seoClientId: number;
}

export interface HeyGenBrowserJobResult {
  success: boolean;
  cdnUrl?: string;
  heygenVideoId?: string;
  error?: string;
  durationMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Cookie/Token Management ────────────────────────────────────────────────

/**
 * Get stored HeyGen session for a client.
 * Returns the most recent active session.
 */
export async function getStoredSession(seoClientId: number): Promise<{ token: string; cookies: string | null } | null> {
  try {
    const db = (await getDb())!;
    if (!db) return null;
    const sessions = await db
      .select()
      .from(heygenSessions)
      .where(and(eq(heygenSessions.seoClientId, seoClientId), eq(heygenSessions.isActive, 1)))
      .orderBy(desc(heygenSessions.createdAt))
      .limit(1);

    if (sessions.length === 0) return null;

    const session = sessions[0];
    // Check if expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      await db.update(heygenSessions).set({ isActive: 0 }).where(eq(heygenSessions.id, session.id));
      return null;
    }

    return { token: session.token, cookies: session.cookies };
  } catch (err: any) {
    console.error(`[HeyGenBrowser] Error fetching stored session: ${err.message}`);
    return null;
  }
}

/**
 * Save a new HeyGen session (from the popup capture flow).
 */
export async function saveSession(data: {
  seoClientId: number;
  token: string;
  cookies?: string;
  tokenType?: string;
  expiresAt?: Date;
  capturedBy?: number;
}): Promise<void> {
  const db = (await getDb())!;
  if (!db) throw new Error("Database unavailable");
  // Deactivate old sessions for this client
  await db.update(heygenSessions)
    .set({ isActive: 0 })
    .where(eq(heygenSessions.seoClientId, data.seoClientId));

  // Insert new session
  await db.insert(heygenSessions).values({
    seoClientId: data.seoClientId,
    token: data.token,
    cookies: data.cookies || null,
    tokenType: data.tokenType || "cookie",
    expiresAt: data.expiresAt || null,
    isActive: 1,
    capturedBy: data.capturedBy || null,
  });

  console.log(`[HeyGenBrowser] Saved new session for client ${data.seoClientId}`);
}

/**
 * Check if a client has a valid HeyGen session.
 */
export async function hasValidSession(seoClientId: number): Promise<boolean> {
  const session = await getStoredSession(seoClientId);
  return session !== null;
}

/**
 * Mark a session as used (update lastUsedAt).
 */
async function markSessionUsed(seoClientId: number): Promise<void> {
  try {
    const db = (await getDb())!;
    if (!db) return;
    const sessions = await db
      .select()
      .from(heygenSessions)
      .where(and(eq(heygenSessions.seoClientId, seoClientId), eq(heygenSessions.isActive, 1)))
      .orderBy(desc(heygenSessions.createdAt))
      .limit(1);

    if (sessions.length > 0) {
      await db.update(heygenSessions)
        .set({ lastUsedAt: new Date() })
        .where(eq(heygenSessions.id, sessions[0].id));
    }
  } catch (err: any) {
    console.warn(`[HeyGenBrowser] Could not update lastUsedAt: ${err.message}`);
  }
}

/**
 * Mark session as expired/invalid.
 */
async function invalidateSession(seoClientId: number): Promise<void> {
  const db = (await getDb())!;
  if (!db) return;
  await db.update(heygenSessions)
    .set({ isActive: 0 })
    .where(eq(heygenSessions.seoClientId, seoClientId));
  console.log(`[HeyGenBrowser] Invalidated sessions for client ${seoClientId}`);
}

// ─── Browser Connection ──────────────────────────────────────────────────────

async function connectBrowser(): Promise<Browser> {
  const token = getBrowserlessToken();
  const wsEndpoint = `${BROWSERLESS_WSS}/?token=${token}&stealth=true`;
  console.log(`[HeyGenBrowser] Connecting to Browserless.io cloud browser...`);

  const browser = await puppeteer.connect({
    browserWSEndpoint: wsEndpoint,
    protocolTimeout: 55000,
  });

  console.log(`[HeyGenBrowser] ✅ Connected to Browserless.io`);
  return browser;
}

/**
 * Inject stored cookies into a browser page to authenticate with HeyGen.
 */
async function injectCookies(page: Page, cookiesJson: string): Promise<void> {
  try {
    const cookies: Protocol.Network.CookieParam[] = JSON.parse(cookiesJson);
    if (cookies.length > 0) {
      await page.setCookie(...cookies);
      console.log(`[HeyGenBrowser] Injected ${cookies.length} cookies`);
    }
  } catch (err: any) {
    console.warn(`[HeyGenBrowser] Cookie injection error: ${err.message}`);
  }
}

/**
 * Inject auth token via localStorage (HeyGen stores JWT in localStorage).
 */
async function injectToken(page: Page, token: string): Promise<void> {
  try {
    // Navigate to HeyGen first so we can set localStorage on the correct origin
    await page.goto(HEYGEN_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    await sleep(500);

    // Set the token in localStorage (HeyGen uses various keys)
    await page.evaluate((t: string) => {
      localStorage.setItem("token", t);
      localStorage.setItem("hg_token", t);
      localStorage.setItem("auth_token", t);
    }, token);

    console.log(`[HeyGenBrowser] Injected auth token into localStorage`);
  } catch (err: any) {
    console.warn(`[HeyGenBrowser] Token injection error: ${err.message}`);
  }
}

/**
 * Set up a page with auth (cookies + token) and navigate to target URL.
 */
async function setupAuthenticatedPage(browser: Browser, session: { token: string; cookies: string | null }, targetUrl: string): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
  page.setDefaultNavigationTimeout(45000);
  page.setDefaultTimeout(45000);

  // Inject cookies first (before navigation)
  if (session.cookies) {
    await injectCookies(page, session.cookies);
  }

  // Inject token via localStorage
  await injectToken(page, session.token);

  // Now navigate to the target page with auth
  console.log(`[HeyGenBrowser] Navigating to: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 40000 });
  await sleep(2000);

  // Check if we're still on login page (session expired)
  const currentUrl = page.url();
  if (currentUrl.includes("/login") || currentUrl.includes("auth.heygen.com")) {
    throw new Error("SESSION_EXPIRED: Stored HeyGen session is no longer valid. Please reconnect HeyGen in Content Studio.");
  }

  console.log(`[HeyGenBrowser] ✅ Authenticated — on page: ${currentUrl}`);
  return page;
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

export async function generateVideoViaBrowser(
  input: HeyGenBrowserJobInput
): Promise<HeyGenBrowserJobResult> {
  const startMs = Date.now();

  // Check for stored session
  const session = await getStoredSession(input.seoClientId);
  if (!session) {
    return {
      success: false,
      error: "No HeyGen session found. Please click 'Connect HeyGen' in Content Studio to log in and capture auth tokens.",
    };
  }

  if (!acquireLock(input.contentPackageId, input.topic)) {
    const status = isAgentBusy();
    const busyMsg = `Agent is already generating a video for "${status.currentJob.topic}" (package #${status.currentJob.contentPackageId}). ` +
      `Started ${Math.round((status.currentJob.elapsedMs ?? 0) / 1000)}s ago. Please wait for it to finish.`;
    return { success: false, error: busyMsg };
  }

  console.log(`[HeyGenBrowser] Lock acquired. Starting video generation for: "${input.topic}" (Brand: ${input.brandSystemName})`);

  try {
    // ── SESSION 1: Submit Prompt (cookies → Video Agent → type → submit) ─────
    console.log("[HeyGenBrowser] === SESSION 1: Submit Prompt ===");
    await sessionSubmitPrompt(session, input);
    await markSessionUsed(input.seoClientId);

    // ── WAIT: 5 minutes for video generation ─────────────────────────────────
    console.log("[HeyGenBrowser] === WAITING: 5 min for video generation ===");
    let elapsed = 0;
    const waitTimeMs = 5 * 60 * 1000;
    while (elapsed < waitTimeMs) {
      await sleep(30000);
      elapsed += 30000;
      console.log(`[HeyGenBrowser] Waiting... ${Math.round(elapsed / 60000 * 10) / 10} min`);
    }

    // ── SESSION 2: Check/Download Video ──────────────────────────────────────
    console.log("[HeyGenBrowser] === SESSION 2: Check/Download Video ===");
    const videoUrl = await sessionCheckAndDownload(session);

    if (!videoUrl) {
      console.log("[HeyGenBrowser] Not ready yet, waiting 3 more min...");
      await sleep(3 * 60 * 1000);

      console.log("[HeyGenBrowser] === SESSION 3: Retry Download ===");
      const retryUrl = await sessionCheckAndDownload(session);

      if (!retryUrl) {
        console.log("[HeyGenBrowser] Still not ready, waiting 3 more min...");
        await sleep(3 * 60 * 1000);

        console.log("[HeyGenBrowser] === SESSION 4: Final Attempt ===");
        const finalUrl = await sessionCheckAndDownload(session);

        if (!finalUrl) {
          throw new Error("Video generation timed out — no video found after ~11 minutes. Check HeyGen dashboard manually.");
        }
        return await finishWithVideo(finalUrl, input, startMs);
      }
      return await finishWithVideo(retryUrl, input, startMs);
    }

    return await finishWithVideo(videoUrl, input, startMs);
  } catch (err: any) {
    const durationMs = Date.now() - startMs;
    console.error(`[HeyGenBrowser] ❌ Failed after ${Math.round(durationMs / 1000)}s: ${err.message}`);

    // If session expired, invalidate it
    if (err.message.includes("SESSION_EXPIRED")) {
      await invalidateSession(input.seoClientId);
      await notifyOwner({
        title: `⚠️ HeyGen Session Expired — ${input.topic}`,
        content: `The HeyGen session for this brand has expired. Please go to Content Studio and click "Connect HeyGen" to re-authenticate.`,
      }).catch(() => {});
    } else {
      await notifyOwner({
        title: `❌ HeyGen Video Failed — ${input.topic}`,
        content: `Browser automation failed for "${input.topic}": ${err.message}. Please generate manually in HeyGen.`,
      }).catch(() => {});
    }

    return { success: false, error: err.message, durationMs };
  } finally {
    releaseLock();
    console.log(`[HeyGenBrowser] Lock released for: "${input.topic}"`);
  }
}

async function finishWithVideo(videoUrl: string, input: HeyGenBrowserJobInput, startMs: number): Promise<HeyGenBrowserJobResult> {
  console.log(`[HeyGenBrowser] Video ready at: ${videoUrl}`);
  const cdnUrl = await downloadAndUploadToCdn(videoUrl, input.contentPackageId, input.topic);
  const durationMs = Date.now() - startMs;
  console.log(`[HeyGenBrowser] ✅ Done in ${Math.round(durationMs / 1000)}s — CDN: ${cdnUrl}`);

  await notifyOwner({
    title: `🎬 Video Ready for Review — ${input.topic}`,
    content: `HeyGen video for "${input.topic}" (Brand: ${input.brandSystemName}) is ready. Open Content Studio to preview and approve.`,
  });

  return { success: true, cdnUrl, durationMs };
}

// ─── Session 1: Submit Prompt ───────────────────────────────────────────────

async function sessionSubmitPrompt(
  session: { token: string; cookies: string | null },
  input: HeyGenBrowserJobInput
): Promise<void> {
  let browser: Browser | null = null;
  try {
    browser = await connectBrowser();
    const page = await setupAuthenticatedPage(browser, session, `${HEYGEN_URL}/video-agent`);

    // Verify we're on Video Agent page
    const pageUrl = page.url();
    if (!pageUrl.includes("video-agent") && !pageUrl.includes("agent")) {
      console.log("[HeyGenBrowser] Not on Video Agent, trying direct nav...");
      await page.goto(`${HEYGEN_URL}/video-agent`, { waitUntil: "networkidle2", timeout: 30000 });
      await sleep(2000);
    }
    console.log(`[HeyGenBrowser] On page: ${page.url()}`);

    // Activate Brand System
    console.log(`[HeyGenBrowser] Activating Brand System: "${input.brandSystemName}"`);
    await activateBrandSystem(page, input.brandSystemName);

    // Enter prompt
    console.log("[HeyGenBrowser] Entering video prompt...");
    const promptEntered = await enterVideoPrompt(page, input.prompt);
    if (!promptEntered) {
      throw new Error("Could not find the Video Agent prompt input field");
    }

    // Submit
    console.log("[HeyGenBrowser] Submitting prompt...");
    await submitPrompt(page);
    await sleep(3000);

    console.log("[HeyGenBrowser] ✅ Session 1 complete — prompt submitted");
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ─── Session 2+: Check/Download Video ───────────────────────────────────────

async function sessionCheckAndDownload(
  session: { token: string; cookies: string | null }
): Promise<string | null> {
  let browser: Browser | null = null;
  try {
    browser = await connectBrowser();
    const page = await setupAuthenticatedPage(browser, session, `${HEYGEN_URL}/video-agent`);
    await sleep(3000);

    // Check for completed video in the agent chat
    const videoUrl = await checkForCompletedVideo(page);
    if (videoUrl) {
      console.log(`[HeyGenBrowser] ✅ Found completed video: ${videoUrl}`);
      return videoUrl;
    }

    // Also check recent videos page
    console.log("[HeyGenBrowser] Checking recent videos...");
    try {
      await page.goto(`${HEYGEN_URL}/videos`, { waitUntil: "networkidle2", timeout: 20000 });
      await sleep(2000);

      const recentVideoUrl = await page.evaluate(() => {
        const videoCards = document.querySelectorAll('[class*="video-card"], [class*="video-item"], [data-testid*="video"]');
        for (const card of videoCards) {
          const link = card.querySelector('a[href*="video"]');
          if (link) return (link as HTMLAnchorElement).href;
        }
        const video = document.querySelector('video[src]') as HTMLVideoElement;
        if (video?.src && video.src.startsWith('http')) return video.src;
        return null;
      }).catch(() => null);

      if (recentVideoUrl) {
        console.log(`[HeyGenBrowser] Found recent video: ${recentVideoUrl}`);
        return recentVideoUrl;
      }
    } catch (e) {
      console.log("[HeyGenBrowser] Could not check recent videos");
    }

    console.log("[HeyGenBrowser] Video not ready yet");
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────

async function activateBrandSystem(page: Page, brandSystemName: string): Promise<boolean> {
  try {
    await sleep(1000);

    // Look for the "+" button near the prompt input area
    const plusButtonSelectors = [
      'button[aria-label*="add" i]',
      'button[title*="add" i]',
      '[data-testid*="plus"]',
      '[data-testid*="add"]',
      'button[class*="plus"]',
      'button[class*="add"]',
    ];

    let plusButton = null;
    for (const selector of plusButtonSelectors) {
      plusButton = await page.$(selector);
      if (plusButton) {
        console.log(`[HeyGenBrowser] Found + button: ${selector}`);
        break;
      }
    }

    if (!plusButton) {
      // Fallback: find button by text content "+"
      const allButtons = await page.$$('button');
      for (const btn of allButtons) {
        const text = await page.evaluate((el: Element) => el.textContent?.trim() || '', btn);
        const ariaLabel = await page.evaluate((el: Element) => el.getAttribute('aria-label') || '', btn);
        if (text === '+' || ariaLabel.includes('add') || ariaLabel.includes('plus')) {
          plusButton = btn;
          break;
        }
      }
    }

    if (!plusButton) {
      console.warn("[HeyGenBrowser] Could not find + button for Brand Systems — skipping");
      return false;
    }

    await plusButton.click();
    await sleep(1000);

    // Look for "Brand Systems" or "Brand Kit" menu item
    let brandSystemMenuItem = null;
    const menuItems = await page.$$('[role="menuitem"], li, div[class*="menu"] div, button');
    for (const item of menuItems) {
      const text = await page.evaluate((el: Element) => el.textContent?.trim() || '', item);
      if (text.includes('Brand System') || text.includes('Brand Kit')) {
        brandSystemMenuItem = item;
        console.log(`[HeyGenBrowser] Found Brand Systems menu item: "${text}"`);
        break;
      }
    }

    if (!brandSystemMenuItem) {
      console.warn("[HeyGenBrowser] Could not find Brand Systems menu item");
      await page.keyboard.press('Escape');
      return false;
    }

    await brandSystemMenuItem.click();
    await sleep(1000);

    // Select the specific brand system by name
    const allClickable = await page.$$('[role="option"], li, button, div[class*="brand"], div[class*="item"]');
    let brandItem = null;
    for (const el of allClickable) {
      const text = await page.evaluate((el: Element) => el.textContent?.trim() || '', el);
      if (text.includes(brandSystemName) || text.includes(brandSystemName.split(' ')[0])) {
        brandItem = el;
        console.log(`[HeyGenBrowser] Found brand system: "${text}"`);
        break;
      }
    }

    if (!brandItem) {
      console.warn(`[HeyGenBrowser] Brand system "${brandSystemName}" not found`);
      await page.keyboard.press('Escape');
      return false;
    }

    await brandItem.click();
    await sleep(500);

    console.log(`[HeyGenBrowser] ✅ Brand System "${brandSystemName}" activated`);
    return true;
  } catch (err: any) {
    console.warn(`[HeyGenBrowser] Brand System activation error: ${err.message}`);
    return false;
  }
}

async function enterVideoPrompt(page: Page, prompt: string): Promise<boolean> {
  try {
    const inputSelectors = [
      'textarea[placeholder*="prompt" i]',
      'textarea[placeholder*="describe" i]',
      'textarea[placeholder*="video" i]',
      'textarea[placeholder*="type" i]',
      'textarea[placeholder*="message" i]',
      'div[contenteditable="true"]',
      'textarea',
      'input[type="text"][placeholder*="prompt" i]',
    ];

    let inputEl = null;
    for (const selector of inputSelectors) {
      inputEl = await page.$(selector);
      if (inputEl) {
        console.log(`[HeyGenBrowser] Found prompt input: ${selector}`);
        break;
      }
    }

    if (!inputEl) {
      console.warn("[HeyGenBrowser] Could not find prompt input");
      return false;
    }

    await inputEl.click();
    await sleep(300);

    // Clear and type
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
    await inputEl.type(prompt, { delay: 5 });
    await sleep(300);

    return true;
  } catch (err: any) {
    console.warn(`[HeyGenBrowser] Prompt entry error: ${err.message}`);
    return false;
  }
}

async function submitPrompt(page: Page): Promise<void> {
  const submitSelectors = [
    'button[type="submit"]',
    'button[aria-label*="send" i]',
    'button[aria-label*="submit" i]',
    'button[aria-label*="generate" i]',
  ];

  let submitBtn = null;
  for (const selector of submitSelectors) {
    submitBtn = await page.$(selector);
    if (submitBtn) {
      const isDisabled = await page.evaluate((el: Element) => (el as HTMLButtonElement).disabled, submitBtn);
      if (!isDisabled) {
        console.log(`[HeyGenBrowser] Found submit button: ${selector}`);
        break;
      }
      submitBtn = null;
    }
  }

  if (!submitBtn) {
    const allBtns = await page.$$('button');
    for (const btn of allBtns) {
      const text = await page.evaluate((el: Element) => el.textContent?.toLowerCase() || '', btn);
      if (text.includes('generate') || text.includes('send') || text.includes('create')) {
        const isDisabled = await page.evaluate((el: Element) => (el as HTMLButtonElement).disabled, btn);
        if (!isDisabled) {
          submitBtn = btn;
          break;
        }
      }
    }
  }

  if (!submitBtn) {
    console.log("[HeyGenBrowser] No submit button found, trying Enter key");
    await page.keyboard.press('Enter');
  } else {
    await submitBtn.click();
  }
}

async function checkForCompletedVideo(page: Page): Promise<string | null> {
  try {
    const videoSrc = await page.evaluate(() => {
      const video = document.querySelector('video[src]:not([src=""])') as HTMLVideoElement;
      if (video?.src && video.src.startsWith('http') && (video.src.includes('.mp4') || video.src.includes('heygen') || video.src.includes('cdn'))) {
        return video.src;
      }
      return null;
    }).catch(() => null);
    if (videoSrc) return videoSrc;

    const downloadUrl = await page.evaluate(() => {
      const anchors = document.querySelectorAll('a[href]');
      for (const a of anchors) {
        const href = (a as HTMLAnchorElement).href;
        if (href && (href.includes('.mp4') || (href.includes('heygen') && href.includes('video')))) {
          return href;
        }
      }
      return null;
    }).catch(() => null);
    if (downloadUrl) return downloadUrl;

    const sourceSrc = await page.evaluate(() => {
      const sources = document.querySelectorAll('video source, video');
      for (const s of sources) {
        const src = s.getAttribute('src') || (s as HTMLVideoElement).src;
        if (src && src.startsWith('http')) return src;
      }
      return null;
    }).catch(() => null);
    if (sourceSrc) return sourceSrc;

    return null;
  } catch {
    return null;
  }
}

async function downloadAndUploadToCdn(
  videoUrl: string,
  contentPackageId: number,
  topic: string
): Promise<string> {
  console.log(`[HeyGenBrowser] Downloading from: ${videoUrl}`);

  const response = await fetch(videoUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AgencyCRM/1.0)" },
  });

  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`[HeyGenBrowser] Downloaded ${Math.round(buffer.length / 1024 / 1024 * 10) / 10}MB`);

  const timestamp = Date.now();
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
  const fileKey = `heygen-videos/pkg-${contentPackageId}-${slug}-${timestamp}.mp4`;

  const { url } = await storagePut(fileKey, buffer, "video/mp4");
  console.log(`[HeyGenBrowser] Uploaded to CDN: ${url}`);

  return url;
}

// ─── Test Connection ────────────────────────────────────────────────────────

/**
 * Test if stored HeyGen session is still valid.
 */
export async function testHeyGenConnection(seoClientId: number): Promise<{ success: boolean; error?: string }> {
  const session = await getStoredSession(seoClientId);
  if (!session) {
    return { success: false, error: "No HeyGen session found. Please click 'Connect HeyGen' to authenticate." };
  }

  let browser: Browser | null = null;
  try {
    browser = await connectBrowser();
    const page = await setupAuthenticatedPage(browser, session, `${HEYGEN_URL}/home`);

    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("auth.heygen.com")) {
      await invalidateSession(seoClientId);
      return { success: false, error: "Session expired. Please reconnect HeyGen." };
    }

    await markSessionUsed(seoClientId);
    return { success: true };
  } catch (err: any) {
    if (err.message.includes("SESSION_EXPIRED")) {
      await invalidateSession(seoClientId);
      return { success: false, error: "Session expired. Please reconnect HeyGen." };
    }
    return { success: false, error: err.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ─── Legacy Test Login (kept for backward compat) ───────────────────────────

export async function testHeyGenLogin(): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  return { success: false, error: "Login-based auth is deprecated. Use 'Connect HeyGen' cookie capture instead." };
}
