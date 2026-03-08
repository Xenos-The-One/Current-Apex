/**
 * HeyGen Cookie Capture Routes
 *
 * Serves a proxy page that:
 * 1. Opens HeyGen login in an iframe/redirect
 * 2. User logs in manually (solving captcha themselves)
 * 3. After login, captures auth cookies/tokens from HeyGen
 * 4. Sends them back to the CRM to store in the database
 *
 * The approach uses a popup window flow:
 * - CRM opens /api/heygen/capture?seoClientId=X
 * - Page redirects to HeyGen login
 * - After successful login, a script captures the auth token
 * - Token is sent back to the CRM via postMessage
 */

import type { Express, Request, Response } from "express";

export function registerHeyGenCaptureRoutes(app: Express): void {
  /**
   * GET /api/heygen/capture
   * Serves the capture page that the user opens in a popup.
   * After login, it extracts HeyGen auth tokens and sends them back.
   */
  app.get("/api/heygen/capture", (req: Request, res: Response) => {
    const seoClientId = req.query.seoClientId as string;
    if (!seoClientId) {
      return res.status(400).send("Missing seoClientId parameter");
    }

    // Serve an HTML page that:
    // 1. Redirects to HeyGen login
    // 2. After login, checks for auth tokens in cookies/localStorage
    // 3. Sends tokens back to the opener window via postMessage
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Connect HeyGen</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      max-width: 500px;
      padding: 40px;
    }
    h1 { font-size: 24px; margin-bottom: 16px; }
    p { color: #94a3b8; margin-bottom: 24px; line-height: 1.6; }
    .status {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .status.success { border-color: #22c55e; background: #052e16; }
    .status.error { border-color: #ef4444; background: #450a0a; }
    .status.waiting { border-color: #3b82f6; background: #172554; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid #334155;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn {
      display: inline-block;
      padding: 12px 32px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn:hover { background: #2563eb; }
    .btn.success { background: #22c55e; }
    .btn.success:hover { background: #16a34a; }
    .step { margin-bottom: 8px; color: #94a3b8; }
    .step.active { color: #3b82f6; font-weight: 600; }
    .step.done { color: #22c55e; }
  </style>
</head>
<body>
  <div class="container">
    <div id="step-login">
      <h1>Connect HeyGen Account</h1>
      <p>Click the button below to open HeyGen's login page. After you log in successfully, come back to this window and click "Capture Session".</p>
      <div class="status waiting">
        <div class="step active">Step 1: Log into HeyGen</div>
        <div class="step">Step 2: Return here and capture session</div>
        <div class="step">Step 3: Connection confirmed</div>
      </div>
      <a href="https://app.heygen.com/login" target="_blank" class="btn" id="openHeyGen" onclick="showStep2()">
        Open HeyGen Login →
      </a>
    </div>

    <div id="step-capture" style="display:none;">
      <h1>Capture HeyGen Session</h1>
      <p>After logging into HeyGen in the other tab, click the button below to capture your session tokens.</p>
      <div class="status waiting">
        <div class="step done">✓ Step 1: Log into HeyGen</div>
        <div class="step active">Step 2: Capture session tokens</div>
        <div class="step">Step 3: Connection confirmed</div>
      </div>
      <button class="btn" id="captureBtn" onclick="captureSession()">
        Capture Session
      </button>
    </div>

    <div id="step-capturing" style="display:none;">
      <h1>Capturing Session...</h1>
      <div class="status waiting">
        <div class="spinner"></div>
        <p>Opening HeyGen to extract auth tokens...</p>
      </div>
    </div>

    <div id="step-success" style="display:none;">
      <h1>✅ HeyGen Connected!</h1>
      <div class="status success">
        <div class="step done">✓ Step 1: Logged into HeyGen</div>
        <div class="step done">✓ Step 2: Session tokens captured</div>
        <div class="step done">✓ Step 3: Connection confirmed</div>
      </div>
      <p>Your HeyGen account is now connected. The video agent can generate videos automatically. You can close this window.</p>
      <button class="btn success" onclick="window.close()">Close Window</button>
    </div>

    <div id="step-error" style="display:none;">
      <h1>❌ Connection Failed</h1>
      <div class="status error">
        <p id="errorMessage">Could not capture HeyGen session tokens.</p>
      </div>
      <p>Make sure you are logged into HeyGen in another tab, then try again.</p>
      <button class="btn" onclick="showStep2()">Try Again</button>
    </div>
  </div>

  <script>
    const seoClientId = ${JSON.stringify(seoClientId)};
    let heygenWindow = null;

    function showStep2() {
      document.getElementById('step-login').style.display = 'none';
      document.getElementById('step-capture').style.display = 'block';
      document.getElementById('step-capturing').style.display = 'none';
      document.getElementById('step-success').style.display = 'none';
      document.getElementById('step-error').style.display = 'none';
    }

    async function captureSession() {
      document.getElementById('step-capture').style.display = 'none';
      document.getElementById('step-capturing').style.display = 'block';

      try {
        // Open HeyGen in a new window to capture cookies
        const captureWindow = window.open('https://app.heygen.com/home', '_blank', 'width=1200,height=800');
        
        // Wait for the page to load and check if we're logged in
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Try to extract token from the HeyGen page
        // HeyGen stores auth tokens in localStorage
        let token = null;
        let attempts = 0;
        const maxAttempts = 12; // 60 seconds total
        
        while (!token && attempts < maxAttempts) {
          try {
            // Try to read from the opened window's localStorage
            if (captureWindow && !captureWindow.closed) {
              try {
                // This will fail due to CORS, which is expected
                token = captureWindow.localStorage.getItem('token');
              } catch (e) {
                // Cross-origin - expected. We'll use the API approach instead.
              }
            }
          } catch (e) {}
          
          if (!token) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }

        // Close the capture window
        if (captureWindow && !captureWindow.closed) {
          captureWindow.close();
        }

        // Since cross-origin localStorage access doesn't work,
        // use the manual token entry approach
        if (!token) {
          // Show manual token entry
          showManualEntry();
          return;
        }

        await saveToken(token);
      } catch (err) {
        showError(err.message || 'Failed to capture session');
      }
    }

    function showManualEntry() {
      document.getElementById('step-capturing').style.display = 'none';
      
      // Create manual entry UI
      const container = document.querySelector('.container');
      const manualDiv = document.createElement('div');
      manualDiv.id = 'step-manual';
      manualDiv.innerHTML = \`
        <h1>Manual Token Entry</h1>
        <p>Due to browser security, we need you to copy the auth token from HeyGen manually.</p>
        <div class="status waiting">
          <div class="step done">✓ Step 1: Logged into HeyGen</div>
          <div class="step active">Step 2: Copy auth token</div>
          <div class="step">Step 3: Paste token here</div>
        </div>
        <div style="text-align:left; background:#0f172a; padding:16px; border-radius:8px; margin-bottom:16px;">
          <p style="color:#e2e8f0; margin-bottom:12px;"><strong>Instructions:</strong></p>
          <ol style="color:#94a3b8; padding-left:20px; line-height:2;">
            <li>Go to your HeyGen tab (should be logged in)</li>
            <li>Press <strong>F12</strong> to open Developer Tools</li>
            <li>Click the <strong>Console</strong> tab</li>
            <li>Paste this command and press Enter:<br>
              <code style="background:#1e293b; padding:4px 8px; border-radius:4px; color:#22c55e; font-size:13px; display:block; margin-top:4px;">
                copy(localStorage.getItem('token') || document.cookie)
              </code>
            </li>
            <li>Come back here and paste the result below</li>
          </ol>
        </div>
        <textarea id="tokenInput" placeholder="Paste your HeyGen auth token here..." 
          style="width:100%; height:80px; background:#1e293b; border:1px solid #334155; border-radius:8px; color:#e2e8f0; padding:12px; font-family:monospace; font-size:13px; resize:vertical; margin-bottom:16px;"></textarea>
        <button class="btn" onclick="submitManualToken()">Connect HeyGen</button>
      \`;
      container.appendChild(manualDiv);
    }

    async function submitManualToken() {
      const tokenInput = document.getElementById('tokenInput');
      const token = tokenInput.value.trim();
      if (!token) {
        alert('Please paste your HeyGen auth token');
        return;
      }
      
      document.getElementById('step-manual').style.display = 'none';
      document.getElementById('step-capturing').style.display = 'block';
      document.querySelector('#step-capturing p').textContent = 'Saving session...';
      
      await saveToken(token);
    }

    async function saveToken(token) {
      try {
        const response = await fetch('/api/heygen/save-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seoClientId: parseInt(seoClientId),
            token: token,
            tokenType: token.startsWith('ey') ? 'jwt' : 'cookie',
          }),
        });

        const result = await response.json();
        if (result.success) {
          showSuccess();
          // Notify the opener window
          if (window.opener) {
            window.opener.postMessage({ type: 'heygen-connected', seoClientId: parseInt(seoClientId) }, '*');
          }
        } else {
          showError(result.error || 'Failed to save session');
        }
      } catch (err) {
        showError(err.message || 'Network error');
      }
    }

    function showSuccess() {
      document.querySelectorAll('[id^="step-"]').forEach(el => el.style.display = 'none');
      document.getElementById('step-success').style.display = 'block';
    }

    function showError(msg) {
      document.querySelectorAll('[id^="step-"]').forEach(el => el.style.display = 'none');
      document.getElementById('step-error').style.display = 'block';
      document.getElementById('errorMessage').textContent = msg;
    }
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  /**
   * POST /api/heygen/save-session
   * Receives captured HeyGen auth tokens from the capture page.
   */
  app.post("/api/heygen/save-session", async (req: Request, res: Response) => {
    try {
      const { seoClientId, token, cookies, tokenType } = req.body;

      if (!seoClientId || !token) {
        return res.status(400).json({ success: false, error: "Missing seoClientId or token" });
      }

      const { saveSession } = await import("../agents/heygen-browser-agent");
      await saveSession({
        seoClientId: parseInt(seoClientId),
        token,
        cookies: cookies || null,
        tokenType: tokenType || "cookie",
      });

      res.json({ success: true, message: "HeyGen session saved successfully" });
    } catch (err: any) {
      console.error("[HeyGen Capture] Error saving session:", err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
}
