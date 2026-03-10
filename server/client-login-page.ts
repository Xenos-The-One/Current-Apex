/**
 * Standalone HTML login page served at /api/client-login
 * This route is NOT intercepted by the Manus hosting platform's OAuth gate.
 * It renders a self-contained HTML form that calls our tRPC loginWithPassword endpoint.
 */
import type { Express, Request, Response } from "express";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663346016577/LMov9oD5hWD87TsDa4kZ8o/GradientLogoBlue2Green_5403585a.png";

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign In — Sterling Marketing CRM</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .card {
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid rgba(71, 85, 105, 0.5);
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    }
    .logo { display: block; height: 48px; margin: 0 auto 1.5rem; object-fit: contain; }
    h1 { color: #f1f5f9; font-size: 1.5rem; font-weight: 700; text-align: center; margin-bottom: 0.5rem; }
    .subtitle { color: #94a3b8; font-size: 0.875rem; text-align: center; margin-bottom: 2rem; }
    label { display: block; color: #cbd5e1; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.375rem; }
    .input-wrap { position: relative; margin-bottom: 1.25rem; }
    .input-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; }
    input[type="email"], input[type="password"], input[type="text"] {
      width: 100%;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 0.9375rem;
      padding: 0.625rem 2.5rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus { border-color: #3b82f6; }
    input::placeholder { color: #475569; }
    .eye-btn {
      position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer; color: #64748b; padding: 0;
      display: flex; align-items: center;
    }
    .eye-btn:hover { color: #cbd5e1; }
    .error-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #f87171;
      font-size: 0.875rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      display: none;
    }
    .btn {
      width: 100%;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 600;
      padding: 0.75rem;
      cursor: pointer;
      transition: background 0.15s;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    }
    .btn:hover:not(:disabled) { background: #1d4ed8; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .divider { display: flex; align-items: center; gap: 0.75rem; margin: 1.25rem 0; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #334155; }
    .divider span { color: #475569; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .admin-btn {
      width: 100%;
      background: transparent;
      color: #94a3b8;
      border: 1px solid #475569;
      border-radius: 8px;
      font-size: 0.875rem;
      padding: 0.625rem;
      cursor: pointer;
      transition: all 0.15s;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
    }
    .admin-btn:hover { background: #1e293b; color: #f1f5f9; border-color: #64748b; }
    .help { color: #475569; font-size: 0.75rem; text-align: center; margin-top: 1.25rem; }
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <img src="${LOGO_URL}" alt="Sterling Marketing" class="logo" />
    <h1>Welcome Back</h1>
    <p class="subtitle">Sign in to your CRM account</p>

    <form id="loginForm">
      <label for="email">Email Address</label>
      <div class="input-wrap">
        <svg class="input-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
        <input type="email" id="email" name="email" placeholder="you@example.com" autocomplete="email" autofocus required />
      </div>

      <label for="password">Password</label>
      <div class="input-wrap">
        <svg class="input-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <input type="password" id="password" name="password" placeholder="••••••••" autocomplete="current-password" required />
        <button type="button" class="eye-btn" id="eyeBtn" aria-label="Toggle password visibility">
          <svg id="eyeIcon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>

      <div class="error-box" id="errorBox"></div>

      <button type="submit" class="btn" id="submitBtn">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        Sign In
      </button>
    </form>

    <div class="divider"><span>or</span></div>

    <button class="admin-btn" id="adminBtn">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
      Admin: Continue with Manus
    </button>

    <p class="help">Having trouble? Contact your account manager.</p>
  </div>

  <script>
    // Toggle password visibility
    const pwInput = document.getElementById('password');
    const eyeBtn = document.getElementById('eyeBtn');
    eyeBtn.addEventListener('click', () => {
      const isText = pwInput.type === 'text';
      pwInput.type = isText ? 'password' : 'text';
    });

    // Admin OAuth button
    document.getElementById('adminBtn').addEventListener('click', () => {
      window.location.href = '/api/admin-login-redirect';
    });

    // Login form submit
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = document.getElementById('errorBox');
      const submitBtn = document.getElementById('submitBtn');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      errorBox.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="spinner"></div> Signing in...';

      try {
        const res = await fetch('/api/trpc/onboarding.loginWithPassword', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ json: { email, password } }),
        });
        const data = await res.json();

        if (data?.error) {
          const msg = data.error?.json?.message || data.error?.message || 'Invalid email or password.';
          errorBox.textContent = msg;
          errorBox.style.display = 'block';
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Sign In';
          return;
        }

        // Success — redirect to dashboard
        window.location.replace('/');
      } catch (err) {
        errorBox.textContent = 'Connection error. Please try again.';
        errorBox.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Sign In';
      }
    });
  </script>
</body>
</html>`;

export function registerClientLoginRoute(app: Express) {
  // Serve the standalone login page — NOT intercepted by Manus platform OAuth gate
  app.get("/api/client-login", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(LOGIN_HTML);
  });

  // Admin OAuth redirect — generates the Manus OAuth URL server-side
  app.get("/api/admin-login-redirect", (req: Request, res: Response) => {
    const oauthPortalUrl = process.env.VITE_OAUTH_PORTAL_URL || "https://manus.im";
    const appId = process.env.VITE_APP_ID || "";
    const origin = `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${origin}/api/oauth/callback`;
    const state = Buffer.from(redirectUri).toString("base64");

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");

    res.redirect(302, url.toString());
  });
}
