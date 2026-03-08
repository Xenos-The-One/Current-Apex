// System email templates for Indigo Labs → Client communications
// These emails are sent from Indigo Labs to clients (loan officers/real estate agents)
// NOT for client → borrower campaigns (those should remain unbranded)

const INDIGO_LABS_LOGO_URL = "https://your-domain.manus.space/indigo-labs-logo.png"; // Will be updated with actual domain
const INDIGO_LABS_SUPPORT_EMAIL = "support@indigolabs.com"; // Update with actual email

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Base HTML template with Indigo Labs branding
function wrapEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      max-width: 200px;
      height: auto;
    }
    .content {
      padding: 40px 30px;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #6c757d;
      border-top: 1px solid #e9ecef;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      opacity: 0.9;
    }
    h1 {
      color: #1e3a8a;
      margin-top: 0;
    }
    .highlight {
      background-color: #eff6ff;
      padding: 20px;
      border-left: 4px solid #3b82f6;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${INDIGO_LABS_LOGO_URL}" alt="Indigo Labs" class="logo">
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Indigo Labs</strong></p>
      <p>AI-Powered Lead Management for Loan Officers & Real Estate Agents</p>
      <p>Questions? Contact us at <a href="mailto:${INDIGO_LABS_SUPPORT_EMAIL}">${INDIGO_LABS_SUPPORT_EMAIL}</a></p>
      <p style="font-size: 12px; color: #999; margin-top: 20px;">
        © ${new Date().getFullYear()} Indigo Labs. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getWelcomeEmail(params: {
  businessName: string;
  businessType: "loan_officer" | "real_estate";
  dashboardUrl: string;
}): EmailTemplate {
  const businessTypeLabel = params.businessType === "loan_officer" ? "Loan Officer" : "Real Estate Agent";
  
  const html = wrapEmailTemplate(`
    <h1>Welcome to Indigo Labs! 🎉</h1>
    
    <p>Hi there,</p>
    
    <p>Thank you for choosing Indigo Labs to power your lead management and AI automation! We're excited to help <strong>${params.businessName}</strong> transform how you connect with clients and close more deals.</p>
    
    <div class="highlight">
      <h3>Your Subscription Includes:</h3>
      <ul>
        <li>✅ Complete lead management system</li>
        <li>✅ Email & SMS campaigns</li>
        <li>✅ Social media automation</li>
        <li>✅ AI script generator & analytics</li>
      </ul>
    </div>
    
    <h3>Next Steps:</h3>
    <ol>
      <li><strong>Access Your Dashboard:</strong> Log in to view your CRM (limited access until strategy call)</li>
      <li><strong>Book Your Strategy Call:</strong> Schedule a 1-on-1 session to activate your account</li>
      <li><strong>AI Avatar Recording:</strong> Choose studio recording or self-record option</li>
      <li><strong>Start Converting:</strong> Import leads and launch your first campaign</li>
    </ol>
    
    <div style="text-align: center;">
      <a href="${params.dashboardUrl}" class="button">Access Your Dashboard</a>
    </div>
    
    <p>We're here to help you succeed. If you have any questions, don't hesitate to reach out!</p>
    
    <p>Best regards,<br>
    <strong>The Indigo Labs Team</strong></p>
  `);
  
  const text = `
Welcome to Indigo Labs!

Hi there,

Thank you for choosing Indigo Labs to power your lead management and AI automation! We're excited to help ${params.businessName} transform how you connect with clients and close more deals.

Your Subscription Includes:
- Complete lead management system
- Email & SMS campaigns
- Social media automation
- AI script generator & analytics

Next Steps:
1. Access Your Dashboard: Log in to view your CRM (limited access until strategy call)
2. Book Your Strategy Call: Schedule a 1-on-1 session to activate your account
3. AI Avatar Recording: Choose studio recording or self-record option
4. Start Converting: Import leads and launch your first campaign

Access your dashboard: ${params.dashboardUrl}

We're here to help you succeed. If you have any questions, don't hesitate to reach out!

Best regards,
The Indigo Labs Team

---
Indigo Labs
AI-Powered Lead Management for Loan Officers & Real Estate Agents
${INDIGO_LABS_SUPPORT_EMAIL}
  `.trim();
  
  return {
    subject: `Welcome to Indigo Labs - Let's Get Started! 🚀`,
    html,
    text,
  };
}

export function getStrategyCallReminderEmail(params: {
  businessName: string;
  callDate: string;
  callTime: string;
  calendarLink?: string;
}): EmailTemplate {
  const html = wrapEmailTemplate(`
    <h1>Strategy Call Reminder</h1>
    
    <p>Hi there,</p>
    
    <p>This is a friendly reminder about your upcoming strategy call with the Indigo Labs team!</p>
    
    <div class="highlight">
      <h3>📅 Call Details:</h3>
      <p><strong>Date:</strong> ${params.callDate}<br>
      <strong>Time:</strong> ${params.callTime}</p>
    </div>
    
    <p>During this call, we'll:</p>
    <ul>
      <li>Review your business goals and target markets</li>
      <li>Customize your CRM settings</li>
      <li>Set up your AI voice assistants</li>
      <li>Activate full access to your dashboard</li>
      <li>Answer any questions you have</li>
    </ul>
    
    ${params.calendarLink ? `<div style="text-align: center;">
      <a href="${params.calendarLink}" class="button">Add to Calendar</a>
    </div>` : ''}
    
    <p>See you soon!</p>
    
    <p>Best regards,<br>
    <strong>The Indigo Labs Team</strong></p>
  `);
  
  const text = `
Strategy Call Reminder

Hi there,

This is a friendly reminder about your upcoming strategy call with the Indigo Labs team!

Call Details:
Date: ${params.callDate}
Time: ${params.callTime}

During this call, we'll:
- Review your business goals and target markets
- Customize your CRM settings
- Set up your AI voice assistants
- Activate full access to your dashboard
- Answer any questions you have

${params.calendarLink ? `Add to calendar: ${params.calendarLink}` : ''}

See you soon!

Best regards,
The Indigo Labs Team
  `.trim();
  
  return {
    subject: `Reminder: Your Indigo Labs Strategy Call - ${params.callDate}`,
    html,
    text,
  };
}

export function getDay75TierChangeReminderEmail(params: {
  businessName: string;
  currentTier: string;
  billingStartDate: string;
  dashboardUrl: string;
}): EmailTemplate {
  const html = wrapEmailTemplate(`
    <h1>Important: Billing Starts in 15 Days</h1>
    
    <p>Hi there,</p>
    
    <p>Your 90-day setup period with Indigo Labs is almost complete! In just <strong>15 days</strong>, your monthly subscription billing will begin.</p>
    
    <div class="highlight">
      <h3>Current Plan:</h3>
      <p><strong>${params.currentTier}</strong></p>
      <p><strong>Billing starts:</strong> ${params.billingStartDate}</p>
    </div>
    
    <h3>Want to Change Your Tier?</h3>
    <p>Now is the perfect time to review your plan and make any changes before billing begins. You can upgrade or downgrade at any time, but it's easiest to do it now.</p>
    
    <p><strong>Our Plans:</strong></p>
    <ul>
      <li><strong>Starter ($297/mo):</strong> Perfect for individual agents</li>
      <li><strong>Professional ($497/mo):</strong> For growing teams</li>
      <li><strong>Enterprise ($997/mo):</strong> For scaling agencies</li>
      <li><strong>Done-For-You ($2,000/mo):</strong> We run everything for you</li>
    </ul>
    
    <p><em>All plans include unlimited leads!</em></p>
    
    <div style="text-align: center;">
      <a href="${params.dashboardUrl}" class="button">Review Your Plan</a>
    </div>
    
    <p>If you're happy with your current plan, no action is needed. Billing will automatically start on ${params.billingStartDate}.</p>
    
    <p>Questions? We're here to help!</p>
    
    <p>Best regards,<br>
    <strong>The Indigo Labs Team</strong></p>
  `);
  
  const text = `
Important: Billing Starts in 15 Days

Hi there,

Your 90-day setup period with Indigo Labs is almost complete! In just 15 days, your monthly subscription billing will begin.

Current Plan: ${params.currentTier}
Billing starts: ${params.billingStartDate}

Want to Change Your Tier?
Now is the perfect time to review your plan and make any changes before billing begins.

Our Plans:
- Starter ($297/mo): Perfect for individual agents
- Professional ($497/mo): For growing teams
- Enterprise ($997/mo): For scaling agencies
- Done-For-You ($2,000/mo): We run everything for you

All plans include unlimited leads!

Review your plan: ${params.dashboardUrl}

If you're happy with your current plan, no action is needed. Billing will automatically start on ${params.billingStartDate}.

Questions? We're here to help!

Best regards,
The Indigo Labs Team
  `.trim();
  
  return {
    subject: `⏰ Billing Starts in 15 Days - Review Your Plan`,
    html,
    text,
  };
}

export function getPaymentReceiptEmail(params: {
  businessName: string;
  amount: number;
  paymentDate: string;
  description: string;
  receiptUrl?: string;
}): EmailTemplate {
  const html = wrapEmailTemplate(`
    <h1>Payment Receipt</h1>
    
    <p>Hi there,</p>
    
    <p>Thank you for your payment! Here are the details:</p>
    
    <div class="highlight">
      <h3>Payment Details:</h3>
      <p><strong>Amount:</strong> $${(params.amount / 100).toFixed(2)}<br>
      <strong>Date:</strong> ${params.paymentDate}<br>
      <strong>Description:</strong> ${params.description}</p>
    </div>
    
    ${params.receiptUrl ? `<div style="text-align: center;">
      <a href="${params.receiptUrl}" class="button">View Receipt</a>
    </div>` : ''}
    
    <p>This payment has been processed successfully. If you have any questions about this charge, please don't hesitate to contact us.</p>
    
    <p>Thank you for choosing Indigo Labs!</p>
    
    <p>Best regards,<br>
    <strong>The Indigo Labs Team</strong></p>
  `);
  
  const text = `
Payment Receipt

Hi there,

Thank you for your payment! Here are the details:

Amount: $${(params.amount / 100).toFixed(2)}
Date: ${params.paymentDate}
Description: ${params.description}

${params.receiptUrl ? `View receipt: ${params.receiptUrl}` : ''}

This payment has been processed successfully. If you have any questions about this charge, please don't hesitate to contact us.

Thank you for choosing Indigo Labs!

Best regards,
The Indigo Labs Team
  `.trim();
  
  return {
    subject: `Payment Receipt - $${(params.amount / 100).toFixed(2)} - Indigo Labs`,
    html,
    text,
  };
}

export function getPaymentFailedEmail(params: {
  businessName: string;
  amount: number;
  failureReason?: string;
  updatePaymentUrl: string;
}): EmailTemplate {
  const html = wrapEmailTemplate(`
    <h1>Payment Failed - Action Required</h1>
    
    <p>Hi there,</p>
    
    <p>We attempted to process your payment but it was unsuccessful.</p>
    
    <div class="highlight" style="border-left-color: #dc2626;">
      <h3>Payment Details:</h3>
      <p><strong>Amount:</strong> $${(params.amount / 100).toFixed(2)}<br>
      ${params.failureReason ? `<strong>Reason:</strong> ${params.failureReason}<br>` : ''}
      <strong>Status:</strong> Failed</p>
    </div>
    
    <h3>What You Need to Do:</h3>
    <p>Please update your payment method to continue using Indigo Labs without interruption.</p>
    
    <div style="text-align: center;">
      <a href="${params.updatePaymentUrl}" class="button">Update Payment Method</a>
    </div>
    
    <p>If you believe this is an error or need assistance, please contact us immediately.</p>
    
    <p>Best regards,<br>
    <strong>The Indigo Labs Team</strong></p>
  `);
  
  const text = `
Payment Failed - Action Required

Hi there,

We attempted to process your payment but it was unsuccessful.

Payment Details:
Amount: $${(params.amount / 100).toFixed(2)}
${params.failureReason ? `Reason: ${params.failureReason}` : ''}
Status: Failed

What You Need to Do:
Please update your payment method to continue using Indigo Labs without interruption.

Update payment method: ${params.updatePaymentUrl}

If you believe this is an error or need assistance, please contact us immediately.

Best regards,
The Indigo Labs Team
  `.trim();
  
  return {
    subject: `⚠️ Payment Failed - Please Update Payment Method`,
    html,
    text,
  };
}
