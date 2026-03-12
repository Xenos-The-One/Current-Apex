/**
 * Standalone HTML login page served at /api/client-login
 * This route is NOT intercepted by the Manus hosting platform's OAuth gate.
 * It renders a self-contained HTML form that calls our tRPC loginWithPassword endpoint.
 *
 * Features:
 * - Email + password login
 * - Google / Manus OAuth button
 * - Forgot password flow (sends reset email)
 * - Login method hint (detects if account uses OAuth and shows hint)
 * - Session expiry notice (?reason=session_expired)
 * - Password reset form (?reset_token=...)
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
    .success-box {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 8px;
      color: #4ade80;
      font-size: 0.875rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      display: none;
    }
    .info-box {
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      color: #93c5fd;
      font-size: 0.875rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      display: none;
    }
    .warning-box {
      background: rgba(234, 179, 8, 0.1);
      border: 1px solid rgba(234, 179, 8, 0.3);
      border-radius: 8px;
      color: #fde047;
      font-size: 0.875rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
      display: none;
      align-items: center;
      gap: 0.5rem;
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
    .forgot-link {
      display: block;
      text-align: right;
      color: #3b82f6;
      font-size: 0.8125rem;
      text-decoration: none;
      margin-top: -0.75rem;
      margin-bottom: 1.25rem;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .forgot-link:hover { color: #60a5fa; text-decoration: underline; }
    .back-link {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      color: #64748b;
      font-size: 0.8125rem;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      margin-bottom: 1.5rem;
    }
    .back-link:hover { color: #94a3b8; }
    .oauth-hint {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      display: none;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .oauth-hint-text { color: #93c5fd; font-size: 0.8125rem; line-height: 1.5; }
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .view { display: none; }
    .view.active { display: block; }
  </style>
</head>
<body>
  <div class="card">
    <img src="${LOGO_URL}" alt="Sterling Marketing" class="logo" />

    <!-- Session expiry banner -->
    <div class="warning-box" id="sessionExpiredBanner">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Your session expired. Please sign in again.
    </div>

    <!-- ===== VIEW: Login ===== -->
    <div class="view active" id="viewLogin">
      <h1>Welcome Back</h1>
      <p class="subtitle">Sign in to your CRM account</p>

      <!-- OAuth hint (shown when email matches a Google/Manus account) -->
      <div class="oauth-hint" id="oauthHint">
        <svg width="16" height="16" fill="none" stroke="#60a5fa" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-top:2px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span class="oauth-hint-text">This account uses <strong>Google / Manus sign-in</strong>. Use the button below instead of a password.</span>
      </div>

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

        <button type="button" class="forgot-link" id="forgotBtn">Forgot password?</button>

        <div class="error-box" id="loginErrorBox"></div>

        <button type="submit" class="btn" id="submitBtn">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          Sign In
        </button>
      </form>

      <div class="divider"><span>or</span></div>

      <button class="admin-btn" id="adminBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google / Manus
      </button>

      <p class="help">Having trouble? Contact your account manager.</p>
    </div>

    <!-- ===== VIEW: Forgot Password ===== -->
    <div class="view" id="viewForgot">
      <button class="back-link" id="backFromForgot">
        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        Back to sign in
      </button>
      <h1>Reset Password</h1>
      <p class="subtitle" style="margin-bottom:1.5rem;">Enter your email and we'll send you a reset link.</p>

      <form id="forgotForm">
        <label for="forgotEmail">Email Address</label>
        <div class="input-wrap">
          <svg class="input-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
          <input type="email" id="forgotEmail" name="forgotEmail" placeholder="you@example.com" autocomplete="email" required />
        </div>

        <div class="error-box" id="forgotErrorBox"></div>
        <div class="success-box" id="forgotSuccessBox"></div>

        <button type="submit" class="btn" id="forgotSubmitBtn">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Send Reset Link
        </button>
      </form>
    </div>

    <!-- ===== VIEW: Reset Password ===== -->
    <div class="view" id="viewReset">
      <h1>Set New Password</h1>
      <p class="subtitle" style="margin-bottom:1.5rem;">Choose a new password for your account.</p>

      <form id="resetForm">
        <label for="newPassword">New Password</label>
        <div class="input-wrap">
          <svg class="input-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input type="password" id="newPassword" name="newPassword" placeholder="Min. 8 characters" autocomplete="new-password" required minlength="8" />
          <button type="button" class="eye-btn" id="eyeBtn2" aria-label="Toggle password visibility">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>

        <label for="confirmPassword">Confirm Password</label>
        <div class="input-wrap">
          <svg class="input-icon" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Repeat password" autocomplete="new-password" required minlength="8" />
        </div>

        <div class="error-box" id="resetErrorBox"></div>
        <div class="success-box" id="resetSuccessBox"></div>

        <button type="submit" class="btn" id="resetSubmitBtn">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          Set New Password
        </button>
      </form>
    </div>
  </div>

  <script>
    // ─── Helpers ──────────────────────────────────────────────────────────────
    const SIGN_IN_SVG = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>';
    const SEND_SVG = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>';
    const CHECK_SVG = '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';

    function showView(id) {
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }

    function showBox(id, msg) {
      const el = document.getElementById(id);
      el.textContent = msg;
      el.style.display = 'block';
    }
    function hideBox(id) { document.getElementById(id).style.display = 'none'; }

    // ─── Session expiry banner ────────────────────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'session_expired') {
      const banner = document.getElementById('sessionExpiredBanner');
      banner.style.display = 'flex';
    }

    // ─── Password reset token ─────────────────────────────────────────────────
    const resetToken = params.get('reset_token');
    if (resetToken) {
      showView('viewReset');
    }

    // ─── Toggle password visibility ───────────────────────────────────────────
    const pwInput = document.getElementById('password');
    document.getElementById('eyeBtn').addEventListener('click', () => {
      pwInput.type = pwInput.type === 'text' ? 'password' : 'text';
    });
    const pw2Input = document.getElementById('newPassword');
    document.getElementById('eyeBtn2').addEventListener('click', () => {
      pw2Input.type = pw2Input.type === 'text' ? 'password' : 'text';
    });

    // ─── OAuth button ─────────────────────────────────────────────────────────
    document.getElementById('adminBtn').addEventListener('click', () => {
      window.location.href = '/api/admin-login-redirect';
    });

    // ─── Forgot / back links ──────────────────────────────────────────────────
    document.getElementById('forgotBtn').addEventListener('click', () => {
      const email = document.getElementById('email').value.trim();
      if (email) document.getElementById('forgotEmail').value = email;
      showView('viewForgot');
    });
    document.getElementById('backFromForgot').addEventListener('click', () => showView('viewLogin'));

    // ─── Login method hint (on email blur) ────────────────────────────────────
    let lastCheckedEmail = '';
    document.getElementById('email').addEventListener('blur', async () => {
      const email = document.getElementById('email').value.trim();
      if (!email || email === lastCheckedEmail) return;
      lastCheckedEmail = email;
      try {
        const res = await fetch('/api/trpc/onboarding.getLoginMethod?input=' + encodeURIComponent(JSON.stringify({ json: { email } })), {
          credentials: 'include',
        });
        const data = await res.json();
        const method = data?.result?.data?.json?.loginMethod;
        const hint = document.getElementById('oauthHint');
        if (method && method !== 'email_password') {
          hint.style.display = 'flex';
        } else {
          hint.style.display = 'none';
        }
      } catch (_) { /* ignore */ }
    });

    // ─── Login form ───────────────────────────────────────────────────────────
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = 'loginErrorBox';
      const submitBtn = document.getElementById('submitBtn');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      hideBox(errorBox);
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
          showBox(errorBox, msg);
          submitBtn.disabled = false;
          submitBtn.innerHTML = SIGN_IN_SVG + ' Sign In';
          return;
        }
        window.location.replace('/api/app');
      } catch (err) {
        showBox(errorBox, 'Connection error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = SIGN_IN_SVG + ' Sign In';
      }
    });

    // ─── Forgot password form ─────────────────────────────────────────────────
    document.getElementById('forgotForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('forgotSubmitBtn');
      const email = document.getElementById('forgotEmail').value.trim();

      hideBox('forgotErrorBox');
      hideBox('forgotSuccessBox');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="spinner"></div> Sending...';

      try {
        const res = await fetch('/api/trpc/onboarding.requestPasswordReset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ json: { email, origin: window.location.origin } }),
        });
        const data = await res.json();

        if (data?.error) {
          const msg = data.error?.json?.message || 'Something went wrong. Please try again.';
          showBox('forgotErrorBox', msg);
        } else {
          showBox('forgotSuccessBox', 'If an account exists for that email, a reset link has been sent. Check your inbox.');
        }
      } catch (err) {
        showBox('forgotErrorBox', 'Connection error. Please try again.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = SEND_SVG + ' Send Reset Link';
      }
    });

    // ─── Reset password form ──────────────────────────────────────────────────
    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('resetSubmitBtn');
      const password = document.getElementById('newPassword').value;
      const confirm = document.getElementById('confirmPassword').value;

      hideBox('resetErrorBox');
      hideBox('resetSuccessBox');

      if (password !== confirm) {
        showBox('resetErrorBox', 'Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        showBox('resetErrorBox', 'Password must be at least 8 characters.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<div class="spinner"></div> Saving...';

      try {
        const res = await fetch('/api/trpc/onboarding.resetPassword', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ json: { token: document.getElementById('resetForm').dataset.token || '', password } }),
        });
        const data = await res.json();

        if (data?.error) {
          const msg = data.error?.json?.message || 'Invalid or expired reset link.';
          showBox('resetErrorBox', msg);
          submitBtn.disabled = false;
          submitBtn.innerHTML = CHECK_SVG + ' Set New Password';
          return;
        }
        showBox('resetSuccessBox', 'Password updated! Redirecting to sign in...');
        setTimeout(() => {
          window.location.href = '/api/client-login';
        }, 2000);
      } catch (err) {
        showBox('resetErrorBox', 'Connection error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = CHECK_SVG + ' Set New Password';
      }
    });

    // Fix: inject actual reset token into the reset form script
    (function() {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('reset_token') || '';
      const resetForm = document.getElementById('resetForm');
      if (resetForm && token) {
        resetForm.dataset.token = token;
      }
    })();

    // Override reset form submit to use dataset token
    document.getElementById('resetForm').addEventListener('submit', function handler(e) {
      // Remove the template-string version above and use real token
      const token = this.dataset.token || '';
      if (!token) {
        showBox('resetErrorBox', 'Invalid reset link. Please request a new one.');
        e.stopImmediatePropagation();
      }
    }, true); // capture phase — runs first
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
