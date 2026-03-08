import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MailOpen, Plus, Pencil, Trash2, Send, Eye, RefreshCw, Search } from "lucide-react";
import { useState } from "react";

// ─── Shared HTML building blocks ────────────────────────────────────────────
const HEADER = (accentColor: string, emoji: string, title: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${accentColor};border-radius:8px 8px 0 0">
    <tr><td style="padding:32px 40px;text-align:center">
      <div style="font-size:48px;margin-bottom:8px">${emoji}</div>
      <h1 style="margin:0;font-family:Arial,sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">${title}</h1>
    </td></tr>
  </table>`;

const FOOTER = `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 8px 8px">
    <tr><td style="padding:24px 40px;text-align:center">
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#1e293b">Tim Haskins</p>
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#64748b">Lock In Loans | NMLS #1116876</p>
      <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;color:#64748b">📞 (661) 992-7005 &nbsp;|&nbsp; ✉️ tim@lockinloans.com</p>
      <p style="margin:12px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8">This email was sent to you because you expressed interest in home financing. To unsubscribe, reply with "STOP".</p>
      <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8">Lock In Loans is a licensed mortgage company. NMLS #1116876. Equal Housing Lender.</p>
    </td></tr>
  </table>`;

const CTA_BUTTON = (text: string, url: string, color: string) => `
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="text-align:center;padding:24px 0">
    <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:6px;letter-spacing:0.3px">${text}</a>
  </td></tr></table>`;

const BODY_WRAP = (content: string) => `
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 40px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#334155">
    ${content}
  </td></tr></table>`;

const INFO_BOX = (rows: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;margin:20px 0">
    <tr><td style="padding:20px 24px">${rows}</td></tr>
  </table>`;

const INFO_ROW = (label: string, value: string) => `<p style="margin:6px 0;font-family:Arial,sans-serif;font-size:14px;color:#334155"><strong style="color:#1e293b">${label}:</strong> ${value}</p>`;

// ─── 17 Professional Templates ───────────────────────────────────────────────
const DEFAULT_TEMPLATES = [
  {
    campaignType: "new_lead_welcome",
    name: "New Lead Welcome",
    category: "lead_nurture",
    description: "First email sent when a new lead comes in",
    fromAddress: "tim@lockinloans.com",
    subject: "Hi {{firstName}}, let's get you into your dream home 🏡",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#2563eb", "🏡", "Welcome to Lock In Loans!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>Thank you for reaching out! My name is <strong>Tim Haskins</strong>, and I'm a licensed mortgage professional with <strong>Lock In Loans</strong>. I've helped hundreds of families in Nevada and beyond navigate the home financing process — and I'd love to help you too.</p>
  <p>Whether you're buying your first home, moving up, investing, or refinancing — I'll work to find you the best rate and program for your situation.</p>
  <p><strong>Here's what happens next:</strong></p>
  <ul style="padding-left:20px">
    <li style="margin-bottom:8px">We'll schedule a <strong>free 15-minute consultation</strong> to understand your goals</li>
    <li style="margin-bottom:8px">I'll review your options and present the best loan programs available</li>
    <li style="margin-bottom:8px">We'll get you <strong>pre-approved fast</strong> — often within 24 hours</li>
  </ul>
  ${CTA_BUTTON("📅 Book Your Free Consultation", "https://lockinloans.com/book", "#2563eb")}
  <p>Have questions? Just reply to this email or call me directly. I'm here to help.</p>
  <p>Looking forward to working with you,</p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "appointment_confirmation",
    name: "Appointment Confirmation",
    category: "appointment",
    description: "Sent when an appointment is booked",
    fromAddress: "tim@lockinloans.com",
    subject: "✅ Confirmed: Your mortgage consultation, {{firstName}}",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#16a34a", "✅", "Appointment Confirmed!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>Your mortgage consultation with <strong>Tim Haskins</strong> is officially on the calendar. Here are your details:</p>
  ${INFO_BOX(`
    ${INFO_ROW("Date", "{{appointmentDate}}")}
    ${INFO_ROW("Time", "{{appointmentTime}}")}
    ${INFO_ROW("Type", "Mortgage Consultation (Phone / Zoom)")}
    ${INFO_ROW("With", "Tim Haskins — Lock In Loans")}
  `)}
  <p><strong>To prepare, please have the following handy (if available):</strong></p>
  <ul style="padding-left:20px">
    <li style="margin-bottom:6px">Most recent pay stubs (last 30 days)</li>
    <li style="margin-bottom:6px">Last 2 years of W-2s or tax returns</li>
    <li style="margin-bottom:6px">Last 2 months of bank statements</li>
    <li style="margin-bottom:6px">Government-issued ID</li>
  </ul>
  <p>Need to reschedule? No problem — just reply to this email or call us.</p>
  ${CTA_BUTTON("📋 Add to My Calendar", "https://lockinloans.com/calendar", "#16a34a")}
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "appointment_reminder_24h",
    name: "Appointment Reminder (24h)",
    category: "appointment",
    description: "Reminder sent 24 hours before appointment",
    fromAddress: "tim@lockinloans.com",
    subject: "⏰ Reminder: Your consultation is tomorrow, {{firstName}}",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#f59e0b", "⏰", "Your Appointment is Tomorrow")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>Just a friendly reminder that your mortgage consultation with <strong>Tim Haskins</strong> is <strong>tomorrow at {{appointmentTime}}</strong>.</p>
  ${INFO_BOX(`
    ${INFO_ROW("Date", "{{appointmentDate}}")}
    ${INFO_ROW("Time", "{{appointmentTime}}")}
    ${INFO_ROW("With", "Tim Haskins — Lock In Loans")}
  `)}
  <p>Come prepared with any questions about rates, loan programs, down payment options, or your financial situation. We'll make the most of our time together.</p>
  <p>If anything has changed, please let me know as soon as possible so we can reschedule.</p>
  <p>See you tomorrow!</p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "appointment_reminder_1h",
    name: "Appointment Reminder (1h)",
    category: "appointment",
    description: "Reminder sent 1 hour before appointment",
    fromAddress: "tim@lockinloans.com",
    subject: "🔔 Starting in 1 hour — your consultation with Tim",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#f59e0b", "🔔", "Starting in 1 Hour!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>Your mortgage consultation with <strong>Tim Haskins</strong> starts in about <strong>1 hour</strong> at {{appointmentTime}}.</p>
  <p>We'll be reaching out to you at the phone number on file. If you'd prefer a Zoom call instead, just reply to this email and we'll send you a link right away.</p>
  <p>Looking forward to speaking with you!</p>
  <p>— Tim Haskins | Lock In Loans | 📞 (702) 900-0000</p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "post_appointment_followup",
    name: "Post-Appointment Follow-up",
    category: "appointment",
    description: "Sent after appointment is completed",
    fromAddress: "tim@lockinloans.com",
    subject: "Great talking with you, {{firstName}} — here are your next steps",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#2563eb", "🤝", "Thanks for Meeting With Me!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>It was a pleasure speaking with you today! I'm excited about the opportunity to help you achieve your home financing goals.</p>
  <p>Based on our conversation, here are your <strong>next steps to get pre-approved</strong>:</p>
  ${INFO_BOX(`
    <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#1e293b">Documents to Gather:</p>
    ${INFO_ROW("Income", "Last 2 years of W-2s or tax returns + last 30 days pay stubs")}
    ${INFO_ROW("Assets", "Last 2 months of bank/investment statements")}
    ${INFO_ROW("Identity", "Government-issued photo ID")}
    ${INFO_ROW("Debt", "Any current loan or credit card statements (if applicable)")}
  `)}
  <p>Once you have these ready, reply to this email or click below to upload them securely. I'll have your pre-approval letter ready as quickly as possible.</p>
  ${CTA_BUTTON("📁 Submit My Documents", "https://lockinloans.com/apply", "#2563eb")}
  <p>Questions? I'm always available. Just reply here or call me directly.</p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "sales_followup_day1",
    name: "Sales Follow-up (Day 1)",
    category: "sales_followup",
    description: "Follow-up sent 1 day after initial contact",
    fromAddress: "tim@lockinloans.com",
    subject: "{{firstName}}, rates are moving — let's lock yours in",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#0ea5e9", "📈", "Rates Are Moving")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>I wanted to follow up from our recent conversation. Mortgage rates have been shifting, and I want to make sure you have the most current information before you make any decisions.</p>
  <p>Right now, buyers who act quickly are locking in rates that could save them <strong>hundreds of dollars per month</strong> compared to waiting.</p>
  <p>I'd love to take 15 minutes to walk you through your options — no pressure, no obligation. Just real numbers for your situation.</p>
  ${CTA_BUTTON("📅 Schedule a Quick Call", "https://lockinloans.com/book", "#0ea5e9")}
  <p>Or simply reply to this email and I'll reach out at a time that works for you.</p>
  <p>Best,<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "sales_followup_day3",
    name: "Sales Follow-up (Day 3)",
    category: "sales_followup",
    description: "Follow-up sent 3 days after initial contact",
    fromAddress: "tim@lockinloans.com",
    subject: "Still thinking about it, {{firstName}}? Here's something to consider",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#7c3aed", "💡", "Something to Consider")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>I know life gets busy, so I just wanted to check in one more time.</p>
  <p>Here's something worth knowing: <strong>getting pre-approved costs you nothing</strong> and takes less than 24 hours. It gives you a clear picture of what you can afford and puts you in a much stronger position when you find the right home.</p>
  <p>Many of my clients tell me they wish they had started the process sooner. I don't want that to be your experience.</p>
  ${CTA_BUTTON("🚀 Get Pre-Approved Today", "https://lockinloans.com/apply", "#7c3aed")}
  <p>I'm here whenever you're ready. No rush, no pressure.</p>
  <p>Best,<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "sales_followup_day7",
    name: "Sales Follow-up (Day 7)",
    category: "sales_followup",
    description: "Final follow-up sent 7 days after initial contact",
    fromAddress: "tim@lockinloans.com",
    subject: "My last note to you, {{firstName}} — the door is always open",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#64748b", "✉️", "One Last Note")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>I don't want to keep filling your inbox, so this will be my last follow-up for now.</p>
  <p>I just want you to know: whenever you're ready to explore your home financing options — whether that's tomorrow or six months from now — I'm here and happy to help.</p>
  <p>Buying a home is one of the biggest financial decisions you'll make. I take that seriously, and I'll always give you honest, straightforward advice.</p>
  <p>Save my contact info for when the time is right:</p>
  ${INFO_BOX(`
    ${INFO_ROW("Name", "Tim Haskins — Lock In Loans")}
    ${INFO_ROW("Phone", "(702) 900-0000")}
    ${INFO_ROW("Email", "tim@lockinloans.com")}
    ${INFO_ROW("NMLS", "#1116876")}
  `)}
  <p>Wishing you all the best,<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "webinar_confirmation",
    name: "Webinar Confirmation",
    category: "webinar",
    description: "Sent when someone registers for a webinar",
    fromAddress: "tim@lockinloans.com",
    subject: "🎓 You're registered! {{webinarTitle}}",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#7c3aed", "🎓", "You're Registered!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>You're all set! We're excited to have you join us for:</p>
  ${INFO_BOX(`
    ${INFO_ROW("Webinar", "{{webinarTitle}}")}
    ${INFO_ROW("Date", "{{webinarDate}}")}
    ${INFO_ROW("Time", "{{webinarTime}}")}
    ${INFO_ROW("Host", "Tim &amp; Belinda Haskins — Lock In Loans")}
  `)}
  <p>We'll send you a reminder 24 hours before and again 1 hour before the event starts. Make sure to add this to your calendar so you don't miss it!</p>
  <p>This webinar is designed to give you <strong>real, actionable information</strong> about home buying and financing — no fluff, no sales pitch. Just the knowledge you need to make confident decisions.</p>
  ${CTA_BUTTON("📅 Add to My Calendar", "https://lockinloans.com/webinar/{{webinarSlug}}", "#7c3aed")}
  <p>See you there!<br><strong>Tim &amp; Belinda Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "webinar_reminder_24h",
    name: "Webinar Reminder (24h)",
    category: "webinar",
    description: "Reminder sent 24 hours before webinar",
    fromAddress: "tim@lockinloans.com",
    subject: "📅 Tomorrow: {{webinarTitle}} — Don't miss it!",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#7c3aed", "📅", "Tomorrow's Webinar")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>Your webinar is <strong>tomorrow</strong> — we can't wait to see you there!</p>
  ${INFO_BOX(`
    ${INFO_ROW("Webinar", "{{webinarTitle}}")}
    ${INFO_ROW("Date", "{{webinarDate}}")}
    ${INFO_ROW("Time", "{{webinarTime}}")}
  `)}
  <p>Make sure you have a good internet connection and a quiet space. We'll be covering a lot of valuable information and there will be time for Q&amp;A at the end.</p>
  ${CTA_BUTTON("🔗 Join the Webinar", "https://lockinloans.com/webinar/{{webinarSlug}}", "#7c3aed")}
  <p>See you tomorrow!<br><strong>Tim &amp; Belinda Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "webinar_reminder_1h",
    name: "Webinar Reminder (1h)",
    category: "webinar",
    description: "Reminder sent 1 hour before webinar",
    fromAddress: "tim@lockinloans.com",
    subject: "🔔 Starting in 1 hour: {{webinarTitle}}",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#7c3aed", "🔔", "Starting in 1 Hour!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p><strong>{{webinarTitle}}</strong> starts in about <strong>1 hour</strong> at {{webinarTime}}. Get ready!</p>
  <p>Click the button below to join when it's time. We recommend joining a few minutes early to make sure your audio and video are working.</p>
  ${CTA_BUTTON("🚀 Join the Webinar Now", "https://lockinloans.com/webinar/{{webinarSlug}}", "#7c3aed")}
  <p>See you in a bit!<br><strong>Tim &amp; Belinda Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "birthday_notification",
    name: "Birthday Email",
    category: "milestone",
    description: "Sent on a client's birthday",
    fromAddress: "tim@lockinloans.com",
    subject: "🎂 Happy Birthday, {{firstName}}! A special message from us",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#ec4899", "🎂", "Happy Birthday!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>Wishing you a wonderful birthday filled with joy, laughter, and everything you deserve! 🎉</p>
  <p>It's been an honor to be part of your home journey, and we're grateful for the trust you placed in us. We hope this year brings you everything you're hoping for.</p>
  <p>From our family to yours — <strong>Happy Birthday!</strong></p>
  <p>With warm wishes,<br><strong>Tim &amp; Belinda Haskins</strong><br>Lock In Loans</p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "anniversary_6month",
    name: "6-Month Home Anniversary",
    category: "milestone",
    description: "Sent 6 months after closing",
    fromAddress: "tim@lockinloans.com",
    subject: "🏠 6 months in your new home, {{firstName}}!",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#16a34a", "🏠", "6-Month Home Anniversary!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>Can you believe it's already been <strong>6 months</strong> since you closed on your home? Congratulations — you're officially a homeowner! 🎉</p>
  <p>We hope you've been settling in and making it truly yours. As your mortgage professional, I want to make sure you're always in the best financial position possible.</p>
  <p><strong>A few things worth knowing at the 6-month mark:</strong></p>
  <ul style="padding-left:20px">
    <li style="margin-bottom:8px">Home values in your area may have increased — you could have more equity than you think</li>
    <li style="margin-bottom:8px">If rates have dropped, a refinance could lower your monthly payment</li>
    <li style="margin-bottom:8px">You may qualify for a cash-out refinance to fund home improvements</li>
  </ul>
  ${CTA_BUTTON("📊 Get a Free Rate Review", "https://lockinloans.com/book", "#16a34a")}
  <p>No obligation — just a quick conversation to make sure your mortgage is still working for you.</p>
  <p>Congratulations again!<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "anniversary_1year",
    name: "1-Year Home Anniversary",
    category: "milestone",
    description: "Sent 1 year after closing",
    fromAddress: "tim@lockinloans.com",
    subject: "🎊 1 year in your home, {{firstName}} — Happy Anniversary!",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#16a34a", "🎊", "1-Year Home Anniversary!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>One full year in your home — <strong>Happy Anniversary!</strong> 🏡</p>
  <p>This is a big milestone, and we're so proud to have been part of your journey. A lot can change in a year, and we want to make sure your mortgage is still the best fit for your life today.</p>
  <p><strong>At the 1-year mark, it's a great time to:</strong></p>
  <ul style="padding-left:20px">
    <li style="margin-bottom:8px">Review your current rate vs. today's market rates</li>
    <li style="margin-bottom:8px">Check your home's current value and available equity</li>
    <li style="margin-bottom:8px">Consider if a refinance could save you money or shorten your loan term</li>
    <li style="margin-bottom:8px">Explore investment property options if you're ready to grow your portfolio</li>
  </ul>
  ${CTA_BUTTON("📅 Schedule Your Annual Mortgage Review", "https://lockinloans.com/book", "#16a34a")}
  <p>It's complimentary, takes about 20 minutes, and could save you thousands.</p>
  <p>Congratulations on one year!<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "rank_alert",
    name: "SEO Rank Alert",
    category: "seo",
    description: "Sent when a keyword drops below threshold",
    fromAddress: "tim@lockinloans.com",
    subject: "📉 SEO Alert: Keyword rank drop detected — action needed",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#dc2626", "📉", "Keyword Rank Alert")}
${BODY_WRAP(`
  <p>Hi {{recipientName}},</p>
  <p>A keyword you're tracking has dropped below your alert threshold. Here are the details:</p>
  ${INFO_BOX(`
    ${INFO_ROW("Keyword", "{{keyword}}")}
    ${INFO_ROW("Previous Position", "#{{oldPosition}}")}
    ${INFO_ROW("Current Position", "#{{newPosition}}")}
    ${INFO_ROW("Alert Threshold", "Position #{{threshold}}")}
    ${INFO_ROW("Client", "{{clientName}}")}
    ${INFO_ROW("Detected", "{{detectedAt}}")}
  `)}
  <p>This drop may be caused by algorithm changes, increased competition, or content issues. We recommend reviewing the page and taking action within 48 hours to minimize impact.</p>
  ${CTA_BUTTON("🔍 View SEO Dashboard", "https://lockinloans.com/seo", "#dc2626")}
  <p>— Sterling Marketing SEO Team</p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "seo_audit_report",
    name: "SEO Audit Report",
    category: "seo",
    description: "Monthly SEO audit report email",
    fromAddress: "tim@lockinloans.com",
    subject: "📊 Monthly SEO Report — {{clientName}} ({{reportMonth}})",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#1e40af", "📊", "Monthly SEO Report")}
${BODY_WRAP(`
  <p>Hi {{recipientName}},</p>
  <p>Here's your monthly SEO performance summary for <strong>{{clientName}}</strong> — {{reportMonth}}.</p>
  ${INFO_BOX(`
    ${INFO_ROW("Overall SEO Score", "{{score}}/100")}
    ${INFO_ROW("Keywords Tracked", "{{keywordCount}}")}
    ${INFO_ROW("Content Published", "{{contentCount}} articles")}
    ${INFO_ROW("Top Issue", "{{topIssue}}")}
    ${INFO_ROW("Organic Traffic Change", "{{trafficChange}}")}
  `)}
  <p>Our team is actively working on the identified issues. You'll see improvements reflected in next month's report.</p>
  ${CTA_BUTTON("📈 View Full Report", "https://lockinloans.com/seo/reports", "#1e40af")}
  <p>Questions about your report? Reply to this email or schedule a call with your account manager.</p>
  <p>— Sterling Marketing SEO Team</p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "client_nurture_general",
    name: "Client Nurture — General",
    category: "lead_nurture",
    description: "General nurture email for long-term leads",
    fromAddress: "tim@lockinloans.com",
    subject: "{{firstName}}, here's what's happening in the market right now",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#0f172a", "📰", "Market Update")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>I wanted to share a quick market update that could be relevant to your home buying plans.</p>
  <p>The housing market is always changing, and staying informed is one of the best things you can do as a buyer. Here's what I'm seeing right now:</p>
  <ul style="padding-left:20px">
    <li style="margin-bottom:8px"><strong>Rates:</strong> Still historically favorable for qualified buyers</li>
    <li style="margin-bottom:8px"><strong>Inventory:</strong> More homes are coming to market — more options for you</li>
    <li style="margin-bottom:8px"><strong>Competition:</strong> Buyers who are pre-approved are winning more offers</li>
  </ul>
  <p>If you've been on the fence, now is a great time to at least get your pre-approval in place so you're ready when the right home comes along.</p>
  ${CTA_BUTTON("📅 Let's Talk — Book a Free Call", "https://lockinloans.com/book", "#0f172a")}
  <p>As always, I'm here to answer any questions — no pressure, just honest advice.</p>
  <p>Best,<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
];

// ─── Refi Campaign Templates ────────────────────────────────────────────────
const REFI_TEMPLATES = [
  {
    campaignType: "refi_rate_drop_alert",
    name: "Refi — Rate Drop Alert",
    category: "sales_followup",
    description: "Sent to past leads/clients when rates hit record lows — urgency-driven outreach",
    fromAddress: "tim@lockinloans.com",
    subject: "{{firstName}}, rates just dropped to record lows — here's what that means for you 📉",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#dc2626", "📉", "Rates Just Hit Record Lows")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>I don't send emails like this often — but this one is worth your attention.</p>
  <p><strong>Mortgage rates have dropped to levels we haven't seen in years.</strong> If you currently have a mortgage, this could mean saving hundreds of dollars every single month — without changing your home or your lifestyle.</p>
  ${INFO_BOX(`
    ${INFO_ROW("Current Rate Environment", "Near historic lows — limited window")}
    ${INFO_ROW("Potential Monthly Savings", "$200–$600+ depending on your loan balance")}
    ${INFO_ROW("Break-Even Timeline", "Most clients recoup closing costs in 12–18 months")}
    ${INFO_ROW("Time to Act", "Rates can move fast — locking in now protects you")}
  `)}
  <p>This isn't a sales pitch. This is me doing my job — making sure the people I've worked with (and those who've reached out before) don't miss a window that could save them real money.</p>
  <p>A quick 15-minute call is all it takes to find out if a refi makes sense for your situation. No obligation, no pressure.</p>
  ${CTA_BUTTON("📞 Book My Free Refi Review", "https://lockinloans.com/book", "#dc2626")}
  <p>If the numbers don't work for you, I'll tell you straight. But if they do — you'll be glad you called.</p>
  <p>Talk soon,<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "refi_intro_outreach",
    name: "Refi — Initial Outreach",
    category: "lead_nurture",
    description: "First refi email for leads who haven't worked with Tim yet — introduce the opportunity",
    fromAddress: "tim@lockinloans.com",
    subject: "{{firstName}} — could you be overpaying on your mortgage right now?",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#1d4ed8", "🏠", "Are You Overpaying on Your Mortgage?")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>My name is <strong>Tim Haskins</strong> with <strong>Lock In Loans</strong>. I specialize in helping homeowners in Nevada review their current mortgage and find out if there's a better deal available — and right now, there almost certainly is.</p>
  <p>Rates have dropped significantly. Homeowners who locked in 12–24 months ago are often sitting on a rate that's 1–2% higher than what's available today. On a $300,000 loan, that's a difference of <strong>$200–$400 per month.</strong></p>
  ${INFO_BOX(`
    ${INFO_ROW("Who This Is For", "Homeowners with a rate above 6.5% or purchased in 2022–2024")}
    ${INFO_ROW("What We Review", "Your current rate, loan balance, remaining term, and equity")}
    ${INFO_ROW("What You Get", "A clear side-by-side comparison — keep your loan or refinance")}
    ${INFO_ROW("Cost to You", "Zero — the review is completely free")}
  `)}
  <p>There's no commitment and no pressure. I'll run the numbers for your specific situation and give you an honest answer. If a refi doesn't make sense for you, I'll tell you that too.</p>
  ${CTA_BUTTON("✅ Get My Free Mortgage Review", "https://lockinloans.com/book", "#1d4ed8")}
  <p>Looking forward to connecting,<br><strong>Tim Haskins</strong><br>Lock In Loans | NMLS #1116876</p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "refi_followup_day3",
    name: "Refi — Follow-Up Day 3",
    category: "sales_followup",
    description: "Day 3 follow-up — 'Did you see this?' nudge with savings calculator hook",
    fromAddress: "tim@lockinloans.com",
    subject: "Quick question, {{firstName}} — did you get a chance to look at this?",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#0369a1", "💬", "Just Checking In")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>I sent you a note a few days ago about the current rate environment and whether a refinance might make sense for you. I wanted to follow up in case it got buried.</p>
  <p>Here's a quick way to think about it: <strong>if your current rate is above 6.5%, there's a very good chance we can lower your payment.</strong></p>
  ${INFO_BOX(`
    ${INFO_ROW("$200,000 loan at 7.5%", "→ ~$1,398/mo | At 6.0% → ~$1,199/mo | Savings: $199/mo")}
    ${INFO_ROW("$300,000 loan at 7.5%", "→ ~$2,098/mo | At 6.0% → ~$1,799/mo | Savings: $299/mo")}
    ${INFO_ROW("$400,000 loan at 7.5%", "→ ~$2,797/mo | At 6.0% → ~$2,398/mo | Savings: $399/mo")}
  `)}
  <p>These are estimates — your actual savings depend on your specific loan details. That's exactly why I offer a free review: to give you the <em>real</em> numbers for your situation.</p>
  <p>It takes 15 minutes. No paperwork upfront. Just a conversation.</p>
  ${CTA_BUTTON("📅 Book My 15-Min Refi Review", "https://lockinloans.com/book", "#0369a1")}
  <p>If now isn't the right time, no worries at all — just let me know and I'll follow up when it makes more sense for you.</p>
  <p>Best,<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "refi_followup_day7",
    name: "Refi — Follow-Up Day 7",
    category: "sales_followup",
    description: "Day 7 follow-up — social proof + urgency, rates won't stay this low",
    fromAddress: "tim@lockinloans.com",
    subject: "{{firstName}}, here's what my clients are saying about their refi savings",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#7c3aed", "⭐", "Real Clients. Real Savings.")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>I've been getting a lot of calls lately from homeowners who are genuinely surprised by how much they're saving after refinancing. I wanted to share a few of those stories with you.</p>
  ${INFO_BOX(`
    <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;color:#334155"><em>"Tim walked me through the whole process. I was skeptical, but we ended up saving $312 a month. That's almost $4,000 a year back in our pocket."</em><br><strong style="color:#1e293b">— Henderson homeowner, refinanced in 2024</strong></p>
    <p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:14px;color:#334155"><em>"I thought refinancing was complicated. Tim made it simple. We closed in 3 weeks and our payment dropped by $280."</em><br><strong style="color:#1e293b">— Las Vegas homeowner, refinanced in 2024</strong></p>
    <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#334155"><em>"Wish I had called sooner. Tim was honest about whether it made sense — and it definitely did."</em><br><strong style="color:#1e293b">— North Las Vegas homeowner, refinanced in 2025</strong></p>
  `)}
  <p>I'm sharing these because I want you to know this is real. These are real people who took 15 minutes to find out if a refi made sense — and it changed their monthly budget.</p>
  <p><strong>One important note:</strong> rates at this level don't last forever. The Fed can move, the market can shift, and the window closes. I'd hate for you to look back in 6 months and wish you'd acted.</p>
  ${CTA_BUTTON("🔒 Lock In My Rate — Book Now", "https://lockinloans.com/book", "#7c3aed")}
  <p>I'm here when you're ready,<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "refi_urgency_close",
    name: "Refi — Urgency Close (Day 14)",
    category: "sales_followup",
    description: "Day 14 last-chance email — rates won't stay this low, final push to book",
    fromAddress: "tim@lockinloans.com",
    subject: "{{firstName}}, this is my last note about rates — I don't want you to miss this",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#b45309", "⏰", "Last Chance to Lock In These Rates")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>I've reached out a few times about refinancing, and I want to be respectful of your inbox — so this will be my last note on this topic for a while.</p>
  <p>But before I step back, I want to be direct with you: <strong>the rate environment we're in right now is genuinely rare.</strong> Rates like these don't stick around. When they move, they move fast — and the homeowners who waited often tell me they wish they hadn't.</p>
  ${INFO_BOX(`
    ${INFO_ROW("If you have a rate above 6.5%", "You are almost certainly leaving money on the table")}
    ${INFO_ROW("Average time to close a refi", "21–30 days — you could be saving by next month")}
    ${INFO_ROW("Average monthly savings", "$200–$500 for most Nevada homeowners")}
    ${INFO_ROW("Cost of waiting 6 months", "$1,200–$3,000 in payments you didn't have to make")}
  `)}
  <p>If you're ready to find out your real numbers — no obligation, no pressure, just facts — I'd love to talk. If the timing isn't right, I completely understand and I'll be here when it is.</p>
  ${CTA_BUTTON("📞 Book My Free Refi Review — Final Call", "https://lockinloans.com/book", "#b45309")}
  <p>Either way, thank you for your time. I hope to earn your business when the moment is right.</p>
  <p>Warmly,<br><strong>Tim Haskins</strong><br>Lock In Loans | NMLS #1116876</p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "refi_appointment_confirmation",
    name: "Refi — Appointment Confirmation",
    category: "appointment",
    description: "Confirmation email when a client books a refi strategy call with Tim",
    fromAddress: "tim@lockinloans.com",
    subject: "You're booked, {{firstName}} — here's everything for your refi strategy call 📅",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#059669", "✅", "Your Refi Strategy Call is Confirmed!")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>You're all set! I'm looking forward to our conversation about your refinancing options. Here are your appointment details:</p>
  ${INFO_BOX(`
    ${INFO_ROW("Date", "{{appointmentDate}}")}
    ${INFO_ROW("Time", "{{appointmentTime}}")}
    ${INFO_ROW("Type", "Refi Strategy Call (Phone/Zoom)")}
    ${INFO_ROW("Duration", "15–30 minutes")}
    ${INFO_ROW("Your Advisor", "Tim Haskins | NMLS #1116876")}
  `)}
  <p><strong>To make the most of our call, it helps to have:</strong></p>
  <ul style="padding-left:20px">
    <li style="margin-bottom:8px">Your current mortgage statement (or just your current rate and balance)</li>
    <li style="margin-bottom:8px">Approximate home value (a rough estimate is fine)</li>
    <li style="margin-bottom:8px">Any goals you have — lower payment, cash out, shorter term</li>
  </ul>
  <p>Don't worry if you don't have everything — we can work with what you have. The goal of this call is simply to see if the numbers make sense for you.</p>
  ${CTA_BUTTON("📋 View My Refi Checklist", "https://lockinloans.com/refi-checklist", "#059669")}
  <p>See you soon,<br><strong>Tim Haskins</strong></p>
`)}
${FOOTER}
</div>`,
  },
  {
    campaignType: "refi_pre_approval_checklist",
    name: "Refi — Pre-Approval Checklist",
    category: "appointment",
    description: "Sent after booking — what to gather before the refi strategy call",
    fromAddress: "tim@lockinloans.com",
    subject: "{{firstName}}, here's what to bring to our call (takes 5 min to prep)",
    html: `<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
${HEADER("#0891b2", "📋", "Your Refi Prep Checklist")}
${BODY_WRAP(`
  <p>Hi <strong>{{firstName}}</strong>,</p>
  <p>Our call is coming up soon and I want to make sure we use every minute productively. Here's a quick checklist of what's helpful to have on hand — even rough estimates are totally fine.</p>
  ${INFO_BOX(`
    <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#1e293b">📄 Documents That Help (Not Required)</p>
    ${INFO_ROW("Mortgage Statement", "Current balance, rate, and monthly payment")}
    ${INFO_ROW("Recent Pay Stubs", "Last 30 days — shows income for qualification")}
    ${INFO_ROW("W-2 or Tax Returns", "Last 2 years — especially if self-employed")}
    ${INFO_ROW("Credit Score", "Rough idea is fine — we'll pull a soft check if needed")}
  `)}
  ${INFO_BOX(`
    <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#1e293b">🏠 Property Info (Estimates Are Fine)</p>
    ${INFO_ROW("Home Value", "Zillow estimate or what you think it's worth")}
    ${INFO_ROW("Remaining Loan Balance", "From your mortgage statement or online portal")}
    ${INFO_ROW("Current Interest Rate", "On your statement or in your original loan docs")}
    ${INFO_ROW("Year You Purchased", "Helps us understand your equity position")}
  `)}
  <p><strong>Don't stress if you don't have everything.</strong> The most important thing is showing up to the call. I'll guide you through the rest.</p>
  <p>If you have any questions before we talk, just reply to this email.</p>
  ${CTA_BUTTON("📅 View My Appointment Details", "https://lockinloans.com/book", "#0891b2")}
  <p>See you soon,<br><strong>Tim Haskins</strong><br>Lock In Loans | NMLS #1116876</p>
`)}
${FOOTER}
</div>`,
  },
];

const ALL_TEMPLATES = [...DEFAULT_TEMPLATES, ...REFI_TEMPLATES];

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  lead_nurture: "Lead Nurture",
  appointment: "Appointment",
  sales_followup: "Sales Follow-up",
  webinar: "Webinar",
  milestone: "Milestone",
  seo: "SEO",
  general: "General",
};

const CATEGORY_COLORS: Record<string, string> = {
  lead_nurture: "bg-blue-100 text-blue-800",
  appointment: "bg-green-100 text-green-800",
  sales_followup: "bg-orange-100 text-orange-800",
  webinar: "bg-purple-100 text-purple-800",
  milestone: "bg-pink-100 text-pink-800",
  seo: "bg-gray-100 text-gray-800",
  general: "bg-slate-100 text-slate-800",
};

type TemplateForm = {
  campaignType: string;
  name: string;
  category: string;
  description: string;
  fromAddress: string;
  subject: string;
  html: string;
};

export default function EmailTemplates() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editTemplate, setEditTemplate] = useState<TemplateForm | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateForm | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const utils = trpc.useUtils();
  const { data: templates = [], isLoading } = trpc.notificationCenter.getEmailTemplates.useQuery();
  const upsert = trpc.notificationCenter.upsertEmailTemplate.useMutation({
    onSuccess: () => { utils.notificationCenter.getEmailTemplates.invalidate(); toast.success("Template saved"); setEditTemplate(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteTemplate = trpc.notificationCenter.deleteEmailTemplate.useMutation({
    onSuccess: () => { utils.notificationCenter.getEmailTemplates.invalidate(); toast.success("Template deleted"); },
    onError: (e) => toast.error(e.message),
  });
  const sendTest = trpc.notificationCenter.sendTestCampaign.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const loadDefaults = async () => {
    let count = 0;
    for (const t of ALL_TEMPLATES) {
      await upsert.mutateAsync(t);
      count++;
    }
    toast.success(`Loaded ${count} templates (including 7 Refi Campaign templates)`);
  };

  const handleSendTest = async () => {
    if (!previewTemplate || !testEmail) return;
    setSendingTest(true);
    try {
      const result = await sendTest.mutateAsync({ campaignType: previewTemplate.campaignType, testEmail, testName: "Test User" });
      if (result.success) toast.success(`Test email sent to ${testEmail}`);
      else toast.error(result.error || "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  const filtered = templates.filter(t => {
    const matchesCat = categoryFilter === "all" || t.category === categoryFilter;
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const openNew = () => setEditTemplate({
    campaignType: `custom_${Date.now()}`,
    name: "",
    category: "general",
    description: "",
    fromAddress: "tim@lockinloans.com",
    subject: "",
    html: `<div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,sans-serif"><p>Hi {{firstName}},</p><p>Your message here.</p><p>Best,<br>Tim Haskins<br>Lock In Loans | NMLS #1116876</p></div>`,
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><MailOpen className="w-6 h-6 text-blue-600" /> Email Templates</h1>
            <p className="text-muted-foreground mt-1">Manage and preview all outbound email templates. Use <code className="bg-muted px-1 rounded text-xs">{"{{firstName}}"}</code> style variables for personalization.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadDefaults} disabled={upsert.isPending}>
              <RefreshCw className="w-4 h-4 mr-2" /> Load Defaults
            </Button>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search templates..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filtered.length} template{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MailOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm mt-1">Click "Load Defaults" to seed all 24 campaign templates (including the full Refi sequence), or create your own.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <Card key={t.campaignType} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => setPreviewTemplate(t as TemplateForm)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{t.name}</CardTitle>
                    <Badge className={`text-xs shrink-0 ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.general}`}>
                      {CATEGORY_LABELS[t.category] || t.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-1">{t.description}</p>
                  <div className="text-xs space-y-1 border-t pt-2">
                    <div className="flex gap-1"><span className="text-muted-foreground">Subject:</span><span className="font-medium truncate">{t.subject}</span></div>
                    <div className="flex gap-1"><span className="text-muted-foreground">From:</span><span className="truncate">{t.fromAddress}</span></div>
                  </div>
                  <div className="flex gap-1 pt-2 border-t">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={e => { e.stopPropagation(); setPreviewTemplate(t as TemplateForm); }}>
                      <Eye className="w-3 h-3 mr-1" /> Preview
                    </Button>
                    <Button size="sm" variant="default" className="flex-1 h-8 text-xs" onClick={e => { e.stopPropagation(); setEditTemplate({ campaignType: t.campaignType, name: t.name, category: t.category, description: t.description || '', fromAddress: t.fromAddress, subject: t.subject, html: t.html }); }}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); if (confirm(`Delete "${t.name}"?`)) deleteTemplate.mutate({ campaignType: t.campaignType }); }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" /> {previewTemplate.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex gap-4 text-sm text-muted-foreground border-b pb-3">
              <div><span className="text-foreground font-medium">Subject: </span>{previewTemplate.subject}</div>
              <div><span className="text-foreground font-medium">From: </span>{previewTemplate.fromAddress}</div>
              <Badge className={`${CATEGORY_COLORS[previewTemplate.category] || CATEGORY_COLORS.general}`}>
                {CATEGORY_LABELS[previewTemplate.category] || previewTemplate.category}
              </Badge>
            </div>
            <div className="flex-1 overflow-auto border rounded-lg bg-gray-50">
              <iframe
                srcDoc={previewTemplate.html}
                className="w-full h-full min-h-[400px]"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
            <div className="flex gap-2 items-center pt-2">
              <Input placeholder="Send test to: your@email.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="flex-1" />
              <Button onClick={handleSendTest} disabled={sendingTest || !testEmail} variant="outline">
                <Send className="w-4 h-4 mr-2" /> {sendingTest ? "Sending..." : "Send Test"}
              </Button>
              <Button onClick={() => { setEditTemplate(previewTemplate); setPreviewTemplate(null); }}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editTemplate && (
        <Dialog open onOpenChange={() => setEditTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editTemplate.campaignType.startsWith("custom_") ? "New Template" : `Edit: ${editTemplate.name}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Template Name</Label>
                  <Input value={editTemplate.name} onChange={e => setEditTemplate(f => f ? { ...f, name: e.target.value } : f)} placeholder="e.g. New Lead Welcome" />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={editTemplate.category} onValueChange={v => setEditTemplate(f => f ? { ...f, category: v } : f)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>From Address</Label>
                <Input value={editTemplate.fromAddress} onChange={e => setEditTemplate(f => f ? { ...f, fromAddress: e.target.value } : f)} />
              </div>
              <div className="space-y-1">
                <Label>Subject Line</Label>
                <Input value={editTemplate.subject} onChange={e => setEditTemplate(f => f ? { ...f, subject: e.target.value } : f)} placeholder="Use {{firstName}} for personalization" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={editTemplate.description} onChange={e => setEditTemplate(f => f ? { ...f, description: e.target.value } : f)} placeholder="When is this email sent?" />
              </div>
              <div className="space-y-1">
                <Label>HTML Body &amp; Live Preview</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Edit HTML below. Variables: <code className="bg-muted px-1 rounded">{"{{firstName}}"}</code> <code className="bg-muted px-1 rounded">{"{{appointmentDate}}"}</code> <code className="bg-muted px-1 rounded">{"{{appointmentTime}}"}</code></p>
                    <Textarea
                      value={editTemplate.html}
                      onChange={e => setEditTemplate(f => f ? { ...f, html: e.target.value } : f)}
                      className="font-mono text-xs resize-none"
                      style={{ height: '400px' }}
                      placeholder="Paste your HTML here..."
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Live preview (updates as you type)</p>
                    <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '420px' }}>
                      <iframe srcDoc={editTemplate.html || '<p style="padding:20px;color:#94a3b8">Start typing HTML to see preview...</p>'} className="w-full h-full" title="Live Preview" sandbox="allow-same-origin" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTemplate(null)}>Cancel</Button>
              <Button onClick={() => upsert.mutate(editTemplate)} disabled={upsert.isPending}>
                {upsert.isPending ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
