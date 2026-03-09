/**
 * One-time script: send admin invitation email to Tariq Haskins
 * Run with: node scripts/send-admin-invite.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY not set");
  process.exit(1);
}

const appUrl = "https://3000-i4t5i2c48u0llkyjjvdkw-c6e5d74a.us2.manus.computer";
const oauthPortalUrl = "https://manus.im";
const appId = "Rus3EtBPxB9CmZuwDUFVXj";
const redirectUri = `${appUrl}/api/oauth/callback`;
const state = Buffer.from(redirectUri).toString("base64");
const loginUrl = `${oauthPortalUrl}/app-auth?appId=${appId}&redirectUri=${encodeURIComponent(redirectUri)}&state=${state}&type=signIn`;

const recipientEmail = "tariqhaskins@indigolabsai.com";
const recipientName = "Tariq Haskins";
const appTitle = process.env.VITE_APP_TITLE || "Agency CRM Platform";

const emailBody = {
  personalizations: [
    {
      to: [{ email: recipientEmail, name: recipientName }],
      subject: `You've been added as an Admin on ${appTitle}`,
    },
  ],
  from: {
    email: process.env.FROM_EMAIL || "noreply@lockinloans.com",
    name: appTitle,
  },
  content: [
    {
      type: "text/plain",
      value: `Welcome to ${appTitle}, ${recipientName}!\n\nYou've been granted Admin access.\n\nSign in here: ${loginUrl}\n\nDirect app URL: ${appUrl}`,
    },
    {
      type: "text/html",
      value: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; margin: 0; padding: 40px 20px; }
    .card { background: #1e293b; border-radius: 12px; max-width: 520px; margin: 0 auto; padding: 40px; }
    h1 { color: #f1f5f9; font-size: 22px; margin: 0 0 8px; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .footer { color: #475569; font-size: 12px; margin-top: 32px; }
    .badge { display: inline-block; background: #312e81; color: #a5b4fc; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Admin Access Granted</span>
    <h1>Welcome to ${appTitle}, ${recipientName}!</h1>
    <p>
      You've been granted <strong style="color:#a5b4fc">Admin</strong> access to the ${appTitle}. 
      You can manage leads, clients, campaigns, AI calling, content approvals, and more.
    </p>
    <p>Click the button below to sign in with your Google account (<strong style="color:#e2e8f0">${recipientEmail}</strong>):</p>
    <a href="${loginUrl}" class="btn">Sign In to ${appTitle}</a>
    <div class="footer">
      <p>If you weren't expecting this email, you can safely ignore it. This link will always be valid — bookmark it for easy access.</p>
      <p style="margin-top:8px">Direct URL: <a href="${appUrl}" style="color:#6366f1">${appUrl}</a></p>
    </div>
  </div>
</body>
</html>
      `.trim(),
    },
  ],
};

try {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailBody),
  });

  if (res.status === 202) {
    console.log(`✅ Invitation email sent to ${recipientEmail}`);
  } else {
    const text = await res.text();
    console.error(`❌ SendGrid error ${res.status}:`, text);
    process.exit(1);
  }
} catch (err) {
  console.error("❌ Network error:", err.message);
  process.exit(1);
}
