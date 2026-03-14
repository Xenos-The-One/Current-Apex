// ─── Campaign Template Library ────────────────────────────────────────────────
// 40+ prebuilt campaign templates across Email, SMS, and AI Calling channels.
// These are static data — no backend needed. Templates are used as starting
// points that users customize before launching.

export type CampaignChannel = "email" | "sms" | "ai-calling";

export type CampaignCategory =
  | "New Leads"
  | "Follow-Up"
  | "Reactivation"
  | "Nurture"
  | "Referral"
  | "Appointment"
  | "Reviews"
  | "Past Clients"
  | "Seasonal"
  | "Education";

export type AudienceTag =
  | "cold-leads"
  | "warm-leads"
  | "past-clients"
  | "referral-partners"
  | "all-leads"
  | "no-response"
  | "appointment-set"
  | "post-close";

export interface EmailStep {
  stepNumber: number;
  delayDays: number; // days after previous step (0 = immediately)
  subject: string;
  previewText: string;
  body: string;
}

export interface SmsStep {
  stepNumber: number;
  delayDays: number;
  message: string;
}

export interface AiCallStep {
  stepNumber: number;
  delayDays: number;
  objective: string;
  intro: string;
  qualifyingQuestions: string[];
  objectionHandling: string;
  bookingGoal: string;
  fallbackBehavior: string;
  expectedOutcomes: string[];
}

export interface CampaignTemplate {
  id: string;
  channel: CampaignChannel;
  category: CampaignCategory;
  name: string;
  description: string;
  stepCount: number;
  recommendedAudience: string;
  audienceTags: AudienceTag[];
  badges: string[]; // e.g. "High Engagement", "Beginner Friendly"
  estimatedDuration: string; // e.g. "7 days", "Instant"
  // Channel-specific steps
  emailSteps?: EmailStep[];
  smsSteps?: SmsStep[];
  aiCallSteps?: AiCallStep[];
  // AI Calling specific
  callObjective?: string;
  assistantType?: string;
  callFlowSummary?: string;
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

export const EMAIL_TEMPLATES: CampaignTemplate[] = [
  {
    id: "email-new-lead-welcome",
    channel: "email",
    category: "New Leads",
    name: "New Lead Welcome Sequence",
    description: "A 3-email sequence that introduces you, builds trust, and invites the lead to take the next step — all within the first 7 days.",
    stepCount: 3,
    recommendedAudience: "New leads who just opted in or were added to your database",
    audienceTags: ["cold-leads", "warm-leads"],
    badges: ["Beginner Friendly", "High Engagement"],
    estimatedDuration: "7 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Welcome! Let's find you the best rate possible",
        previewText: "I'm here to help you navigate the process — here's what to expect",
        body: `Hi {first_name},

Thank you for reaching out — I'm excited to help you navigate the mortgage process and find the best rate for your situation.

My name is {agent_name} and I specialize in helping {buyer_type} buyers like yourself get pre-approved quickly and close on time.

Here's what working with me looks like:
• Free pre-qualification (takes about 15 minutes)
• Personalized rate comparison across multiple lenders
• Dedicated support from application to closing

To get started, I'd love to schedule a quick 15-minute call. You can book directly at {calendar_link} or simply reply to this email.

Looking forward to working with you!

Best,
{agent_name}
{phone}`,
      },
      {
        stepNumber: 2,
        delayDays: 3,
        subject: "Quick question about your home goals, {first_name}",
        previewText: "I want to make sure I find the right program for you",
        body: `Hi {first_name},

I wanted to follow up and ask a quick question — what's your biggest priority right now?

A) Getting pre-approved as fast as possible
B) Finding the lowest rate available
C) Understanding exactly how much house I can afford
D) Just exploring my options for now

Your answer helps me tailor my approach so I'm not wasting your time with information that doesn't apply to you.

Just reply with A, B, C, or D — or feel free to call me directly at {phone}.

Talk soon,
{agent_name}`,
      },
      {
        stepNumber: 3,
        delayDays: 7,
        subject: "Here's what today's rates mean for your budget",
        previewText: "A quick breakdown based on your situation",
        body: `Hi {first_name},

I wanted to share a quick market update that's relevant to your situation.

Current 30-year fixed rates are around {current_rate}%. For a home in the {price_range} range, that translates to roughly {monthly_payment}/month — which may be more affordable than you think.

Here's what I can do for you this week:
✓ Run a free pre-qualification (no credit pull required)
✓ Show you programs with as little as 3% down
✓ Give you a side-by-side rate comparison

Ready to take the next step? Book a 15-minute call at {calendar_link} or reply to this email.

Best,
{agent_name}
{phone}`,
      },
    ],
  },
  {
    id: "email-follow-up-no-response",
    channel: "email",
    category: "Follow-Up",
    name: "Follow-Up After No Response",
    description: "A 4-email re-engagement sequence for leads who went quiet. Uses value-first messaging and a soft close to restart the conversation.",
    stepCount: 4,
    recommendedAudience: "Leads who haven't responded in 7–30 days",
    audienceTags: ["no-response", "cold-leads"],
    badges: ["High Engagement", "Best for Cold Leads"],
    estimatedDuration: "14 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Still thinking about it, {first_name}?",
        previewText: "No pressure — just wanted to check in",
        body: `Hi {first_name},

I noticed we haven't connected yet and I wanted to reach out one more time.

I understand life gets busy, and buying or refinancing a home is a big decision. There's absolutely no pressure here.

If you're still exploring your options, I'd love to answer any questions you might have — even if you're just in the early stages.

Would a quick 10-minute call work this week? You can grab a time at {calendar_link} or just reply here.

Best,
{agent_name}`,
      },
      {
        stepNumber: 2,
        delayDays: 4,
        subject: "Rates dropped this week — wanted you to know",
        previewText: "This could save you hundreds per month",
        body: `Hi {first_name},

Quick update — mortgage rates have moved favorably this week. If you've been waiting for the right time to lock in, this could be it.

Based on the information you shared, you may qualify for a rate as low as {estimated_rate}%. That could mean a payment of around {monthly_payment}/month on a {loan_amount} loan.

I can run a full pre-qualification in about 15 minutes with no impact to your credit score.

Interested? Reply to this email or book a call at {calendar_link}.

Best,
{agent_name}
{phone}`,
      },
      {
        stepNumber: 3,
        delayDays: 7,
        subject: "A quick resource for you, {first_name}",
        previewText: "The 5 things every buyer should know before applying",
        body: `Hi {first_name},

Whether you're ready to move forward now or still planning, I wanted to share something useful.

Here are 5 things every buyer should know before applying for a mortgage:

1. Your credit score matters — but it's not everything
2. Down payment assistance programs are more available than you think
3. Getting pre-approved doesn't lock you in
4. Rate shopping within 45 days counts as one credit inquiry
5. Closing costs can often be rolled into the loan

If any of these raise questions, I'm happy to walk you through them. Just reply or book a call at {calendar_link}.

Best,
{agent_name}`,
      },
      {
        stepNumber: 4,
        delayDays: 14,
        subject: "Last check-in from me, {first_name}",
        previewText: "I'll leave the door open — no pressure",
        body: `Hi {first_name},

I don't want to keep filling your inbox if now isn't the right time. This will be my last follow-up for a while.

If you ever want to revisit your options — whether it's in a week, a month, or a year — I'm here. Just reply to this email or call me at {phone}.

I genuinely enjoy helping people navigate this process and I'd love to work with you when the timing is right.

Wishing you all the best,
{agent_name}`,
      },
    ],
  },
  {
    id: "email-past-client-checkin",
    channel: "email",
    category: "Past Clients",
    name: "Past Client Check-In",
    description: "A warm 2-email sequence to reconnect with past clients, offer a free rate review, and generate referrals.",
    stepCount: 2,
    recommendedAudience: "Clients who closed 6–24 months ago",
    audienceTags: ["past-clients"],
    badges: ["Best for Warm Leads", "Referral Generator"],
    estimatedDuration: "7 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Checking in — how's the new home, {first_name}?",
        previewText: "It's been a while and I wanted to say hello",
        body: `Hi {first_name},

I can't believe it's been {months_since_close} months since we closed on your home! I hope you're settling in and loving it.

I wanted to reach out for two reasons:

1. **Free rate review** — Rates have shifted since you closed. A quick 10-minute review could reveal refinancing savings or help you understand your equity position.

2. **Referrals** — If you know anyone thinking about buying, selling, or refinancing, I'd be honored if you'd pass my name along. A referral from a happy client means the world to me.

No pressure on either front — just wanted to stay in touch and let you know I'm always here if you need anything.

Best,
{agent_name}
{phone}`,
      },
      {
        stepNumber: 2,
        delayDays: 7,
        subject: "One more thing, {first_name} — your home's value",
        previewText: "Here's what your neighborhood looks like right now",
        body: `Hi {first_name},

Quick follow-up — I ran a quick market analysis for your neighborhood and wanted to share what I found.

Homes similar to yours in {neighborhood} are currently selling for {estimated_value}. That means you may have built {equity_estimate} in equity since you purchased.

If you're curious what that means for you — whether it's a cash-out refinance, a HELOC, or just good to know — I'm happy to walk you through it.

Just reply or book a quick call at {calendar_link}.

Best,
{agent_name}`,
      },
    ],
  },
  {
    id: "email-referral-partner-outreach",
    channel: "email",
    category: "Referral",
    name: "Referral Partner Outreach",
    description: "A 3-email sequence to build relationships with real estate agents, attorneys, and other referral partners.",
    stepCount: 3,
    recommendedAudience: "Real estate agents, attorneys, financial advisors, builders",
    audienceTags: ["referral-partners"],
    badges: ["Relationship Builder"],
    estimatedDuration: "10 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Let's help each other's clients, {first_name}",
        previewText: "A quick introduction from {agent_name}",
        body: `Hi {first_name},

My name is {agent_name} and I'm a mortgage professional based in {city}. I specialize in helping {buyer_type} buyers close quickly and smoothly.

I've heard great things about your work and I'd love to explore how we might be able to help each other's clients.

Here's what I bring to the table for your buyers:
• Pre-approval letters within 24 hours
• Clear communication throughout the process
• On-time closings (I have a {close_rate}% on-time close rate)
• Dedicated support so you're never left wondering about status

Would you be open to a quick 15-minute call this week? I'd love to learn more about your business and see if there's a fit.

Best,
{agent_name}
{phone}`,
      },
      {
        stepNumber: 2,
        delayDays: 5,
        subject: "A resource for your buyers, {first_name}",
        previewText: "Feel free to share this with anyone exploring their options",
        body: `Hi {first_name},

I wanted to share something that might be useful for your clients — a free first-time buyer guide I put together.

It covers:
• How to get pre-approved without hurting your credit
• Down payment assistance programs in {state}
• What to expect at each stage of the mortgage process
• Common mistakes to avoid

Feel free to share it with any buyers who might find it helpful. And if you ever have a client who needs a fast, reliable pre-approval, I'd love to be your go-to resource.

Best,
{agent_name}
{phone}`,
      },
      {
        stepNumber: 3,
        delayDays: 10,
        subject: "Still open to connecting, {first_name}",
        previewText: "No pressure — just wanted to follow up one more time",
        body: `Hi {first_name},

I know you're busy, so I'll keep this short.

If you ever have a buyer who needs a mortgage professional who communicates well, closes on time, and treats your clients like VIPs — I'd love to be that person for you.

Feel free to reach out anytime at {phone} or {email}. I look forward to the possibility of working together.

Best,
{agent_name}`,
      },
    ],
  },
  {
    id: "email-review-request",
    channel: "email",
    category: "Reviews",
    name: "Review / Testimonial Request",
    description: "A 2-email sequence sent after closing to request a Google review and a written testimonial.",
    stepCount: 2,
    recommendedAudience: "Clients within 2 weeks of closing",
    audienceTags: ["post-close"],
    badges: ["High Engagement", "Reputation Builder"],
    estimatedDuration: "5 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Congratulations on your new home, {first_name}! 🎉",
        previewText: "It was a pleasure working with you — one quick favor",
        body: `Hi {first_name},

Congratulations on closing on your new home! It was truly a pleasure working with you throughout this process.

I have one small favor to ask — would you be willing to leave a quick Google review? It takes less than 2 minutes and means the world to a small business like mine.

Here's the link: {google_review_link}

If you're willing to share a few words about your experience, I'd be incredibly grateful. And if there's anything I could have done better, I'd love to hear that too — I'm always looking to improve.

Thank you again for trusting me with such an important milestone!

Warmly,
{agent_name}`,
      },
      {
        stepNumber: 2,
        delayDays: 5,
        subject: "One more thing, {first_name} — a quick testimonial?",
        previewText: "Just a sentence or two would help so much",
        body: `Hi {first_name},

I hope you're settling into your new home and loving every minute of it!

I wanted to follow up on my earlier email about a review. If Google isn't your thing, even a quick sentence or two I could use as a testimonial on my website would be incredibly helpful.

Something like: "Working with {agent_name} was a great experience. He/she was communicative, professional, and helped us close on time."

Just reply to this email with whatever feels natural — I'll take care of the rest.

Thank you so much, {first_name}. Wishing you many happy years in your new home!

Best,
{agent_name}`,
      },
    ],
  },
  {
    id: "email-appointment-reminder",
    channel: "email",
    category: "Appointment",
    name: "Appointment Reminder Sequence",
    description: "A 2-email sequence to confirm upcoming appointments and reduce no-shows.",
    stepCount: 2,
    recommendedAudience: "Leads with scheduled appointments",
    audienceTags: ["appointment-set"],
    badges: ["Appointment Focused", "Reduces No-Shows"],
    estimatedDuration: "2 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Your appointment is confirmed, {first_name}",
        previewText: "Here are the details for our upcoming call",
        body: `Hi {first_name},

Your appointment is confirmed! Here are the details:

📅 Date: {appointment_date}
⏰ Time: {appointment_time}
📞 How to join: {meeting_link_or_phone}

To make the most of our time together, it would be helpful if you could have the following ready:
• Your most recent pay stubs (last 2 months)
• Bank statements (last 2 months)
• A rough idea of your target purchase price or current loan balance

If you need to reschedule, no problem — just click here: {reschedule_link}

Looking forward to speaking with you!

Best,
{agent_name}
{phone}`,
      },
      {
        stepNumber: 2,
        delayDays: 1,
        subject: "Reminder: We're meeting tomorrow, {first_name}",
        previewText: "Just a quick reminder about our call",
        body: `Hi {first_name},

Just a friendly reminder that we have a call scheduled for tomorrow:

📅 {appointment_date} at {appointment_time}
📞 {meeting_link_or_phone}

If anything has come up and you need to reschedule, just let me know: {reschedule_link}

Otherwise, I'll talk to you tomorrow!

Best,
{agent_name}`,
      },
    ],
  },
  {
    id: "email-reengagement",
    channel: "email",
    category: "Reactivation",
    name: "Re-engagement Campaign",
    description: "A 3-email sequence to wake up cold leads who haven't engaged in 60+ days.",
    stepCount: 3,
    recommendedAudience: "Leads inactive for 60+ days",
    audienceTags: ["cold-leads", "no-response"],
    badges: ["Best for Cold Leads"],
    estimatedDuration: "10 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Is buying a home still on your radar, {first_name}?",
        previewText: "Things may have changed — let's catch up",
        body: `Hi {first_name},

It's been a while since we last connected and I wanted to check in.

A lot can change in a few months — rates, inventory, your personal situation. I'd love to hear where you're at and whether buying or refinancing is still something you're thinking about.

No pressure at all. Even if you're just curious about what's happening in the market, I'm happy to share what I'm seeing.

Would a quick 10-minute call work? Book a time at {calendar_link} or just reply here.

Best,
{agent_name}`,
      },
      {
        stepNumber: 2,
        delayDays: 5,
        subject: "The market has shifted, {first_name} — here's what it means for you",
        previewText: "Some updates that might change your timeline",
        body: `Hi {first_name},

I wanted to share a few market updates that might be relevant to your situation:

📉 Rates have {rate_direction} since we last spoke
🏠 Inventory in {city} is {inventory_status}
💰 Down payment assistance programs have {program_update}

If any of this changes your thinking, I'd love to reconnect and run some updated numbers for you. It only takes 15 minutes and there's no obligation.

Book a call: {calendar_link}

Best,
{agent_name}
{phone}`,
      },
      {
        stepNumber: 3,
        delayDays: 10,
        subject: "Closing the loop, {first_name}",
        previewText: "I'll stop reaching out — but I'm always here",
        body: `Hi {first_name},

I don't want to keep cluttering your inbox, so this will be my last email for now.

If your situation changes — or if you're ever ready to explore your options — I'm just one email or phone call away.

{phone} | {email}

Wishing you all the best,
{agent_name}`,
      },
    ],
  },
  {
    id: "email-market-update",
    channel: "email",
    category: "Nurture",
    name: "Market Update / Newsletter",
    description: "A single-send market update email to keep your database warm and position you as the local expert.",
    stepCount: 1,
    recommendedAudience: "Entire database — all leads and past clients",
    audienceTags: ["all-leads", "past-clients"],
    badges: ["Database Warmer", "Authority Builder"],
    estimatedDuration: "Instant",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "{month} Mortgage Market Update — What You Need to Know",
        previewText: "Rates, inventory, and what it means for buyers and homeowners",
        body: `Hi {first_name},

Here's your {month} mortgage market update:

📊 RATES
The 30-year fixed rate is currently averaging {current_rate}%. {rate_commentary}

🏠 HOUSING INVENTORY
{inventory_commentary}

💡 WHAT THIS MEANS FOR YOU
{personalized_insight}

📅 UPCOMING CHANGES TO WATCH
{upcoming_changes}

As always, I'm here to answer any questions or run personalized numbers for your situation. Just reply to this email or book a call at {calendar_link}.

Best,
{agent_name}
{phone}

P.S. Know someone thinking about buying or refinancing? I'd love an introduction. 🙏`,
      },
    ],
  },
  {
    id: "email-rate-drop-alert",
    channel: "email",
    category: "Nurture",
    name: "Rate Drop / Opportunity Alert",
    description: "A timely single-send email alerting your database to a rate drop and inviting them to lock in.",
    stepCount: 1,
    recommendedAudience: "All leads and past clients who haven't refinanced recently",
    audienceTags: ["all-leads", "past-clients"],
    badges: ["High Engagement", "Time-Sensitive"],
    estimatedDuration: "Instant",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "🚨 Rates just dropped — lock in before they rise again",
        previewText: "This window may not last long",
        body: `Hi {first_name},

I wanted to reach out personally because rates dropped significantly this week and I don't want you to miss this window.

Current 30-year fixed rates: {current_rate}%
(Down from {previous_rate}% just {days_ago} days ago)

For a {loan_amount} loan, that's a difference of approximately {monthly_savings}/month — or {annual_savings}/year.

If you're currently renting and thinking about buying, this could be the moment you've been waiting for.
If you already own and haven't refinanced recently, now might be the time.

I can run a free analysis for your specific situation in about 15 minutes. No credit pull required.

Book a call: {calendar_link}
Or call me directly: {phone}

Best,
{agent_name}

P.S. Rates can move quickly in either direction. I'd encourage you to reach out sooner rather than later.`,
      },
    ],
  },
  {
    id: "email-lead-nurture-sequence",
    channel: "email",
    category: "Nurture",
    name: "Lead Nurture Sequence",
    description: "A 5-email educational sequence that builds trust over 30 days and moves leads toward pre-approval.",
    stepCount: 5,
    recommendedAudience: "New leads who are 3–6 months from buying",
    audienceTags: ["cold-leads", "warm-leads"],
    badges: ["Education Focused", "Long-Term Nurture"],
    estimatedDuration: "30 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Your mortgage journey starts here, {first_name}",
        previewText: "What to expect over the next few weeks",
        body: `Hi {first_name},

Welcome! Over the next few weeks, I'll be sharing some helpful resources to guide you through the mortgage process — whether you're buying soon or just starting to explore.

Today's topic: The difference between pre-qualification and pre-approval.

Pre-qualification is a quick estimate based on self-reported information. Pre-approval is a verified commitment that makes your offer much stronger.

Most sellers and agents won't take an offer seriously without a pre-approval letter. The good news? I can get you one in as little as 24 hours.

Ready to start? Book a call at {calendar_link} or just reply here.

Best,
{agent_name}`,
      },
      {
        stepNumber: 2,
        delayDays: 7,
        subject: "How much house can you actually afford, {first_name}?",
        previewText: "The real numbers — not just what the bank says",
        body: `Hi {first_name},

One of the most common questions I get is: "How much can I afford?"

The bank's answer and the right answer are often different. Here's a simple framework:

✅ Your debt-to-income ratio (DTI) should ideally be under 43%
✅ Your monthly payment (PITI) should be under 28% of gross income
✅ Leave room for maintenance, HOA, and unexpected costs

For a quick estimate: take your gross monthly income × 0.28 = your max comfortable payment.

Want me to run the real numbers for your situation? It takes 10 minutes and there's no obligation.

Book a call: {calendar_link}

Best,
{agent_name}`,
      },
      {
        stepNumber: 3,
        delayDays: 14,
        subject: "The truth about down payments, {first_name}",
        previewText: "You don't need 20% — here's what you actually need",
        body: `Hi {first_name},

Many people delay buying because they think they need 20% down. The truth? Most buyers put down far less.

Here are the most common programs:
• FHA: 3.5% down (credit score 580+)
• Conventional: 3–5% down
• VA: 0% down (for veterans)
• USDA: 0% down (rural areas)
• Down payment assistance: varies by state

In {state}, there are currently {dpa_programs} down payment assistance programs available. Some offer grants that never need to be repaid.

Want to see which programs you qualify for? Reply or book a call at {calendar_link}.

Best,
{agent_name}`,
      },
      {
        stepNumber: 4,
        delayDays: 21,
        subject: "What happens to your credit when you apply, {first_name}?",
        previewText: "The answer might surprise you",
        body: `Hi {first_name},

A common fear I hear: "I don't want to apply because I don't want to hurt my credit."

Here's the good news: rate shopping for a mortgage is treated differently by credit bureaus.

Multiple mortgage inquiries within a 45-day window count as a single inquiry. So shopping around for the best rate won't tank your score.

Also, a pre-qualification (soft pull) has zero impact on your credit. Only a full application (hard pull) creates an inquiry — and even then, the impact is typically 5 points or less.

Ready to take the next step? I can start with a soft pull to give you a clear picture. Book a call: {calendar_link}

Best,
{agent_name}`,
      },
      {
        stepNumber: 5,
        delayDays: 30,
        subject: "Are you ready to take the next step, {first_name}?",
        previewText: "You've learned a lot — let's put it into action",
        body: `Hi {first_name},

Over the past month, I've shared some of the most important things to know about the mortgage process. I hope it's been helpful!

Now I want to ask: are you ready to take the next step?

Whether that's getting pre-approved, running some numbers, or just having a conversation about your options — I'm here.

Book a 15-minute call at {calendar_link} and let's make your homeownership goals a reality.

Best,
{agent_name}
{phone}`,
      },
    ],
  },
  {
    id: "email-first-time-buyer",
    channel: "email",
    category: "Education",
    name: "First-Time Buyer Education Sequence",
    description: "A 4-email educational series specifically for first-time buyers, covering the entire process from credit to closing.",
    stepCount: 4,
    recommendedAudience: "First-time homebuyers in early research phase",
    audienceTags: ["cold-leads"],
    badges: ["Beginner Friendly", "Education Focused"],
    estimatedDuration: "21 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "First-time buyer? Here's your complete roadmap",
        previewText: "From credit check to closing — everything you need to know",
        body: `Hi {first_name},

Buying your first home is one of the most exciting (and sometimes overwhelming) things you'll ever do. I want to make it as smooth as possible for you.

Here's the basic roadmap:

Step 1: Check your credit and finances
Step 2: Get pre-approved
Step 3: Find a real estate agent
Step 4: Search for homes
Step 5: Make an offer
Step 6: Home inspection and appraisal
Step 7: Final approval and closing

Over the next few weeks, I'll walk you through each step in detail. But if you want to jump ahead and get started right now, book a call at {calendar_link}.

Best,
{agent_name}`,
      },
      {
        stepNumber: 2,
        delayDays: 7,
        subject: "Step 1 for first-time buyers: Your credit score",
        previewText: "Here's what you need and how to improve it fast",
        body: `Hi {first_name},

Let's talk about credit — the foundation of your mortgage application.

Here's what lenders look for:
• 620+ for conventional loans
• 580+ for FHA loans
• 500–579 for FHA with 10% down

If your score needs work, here are the fastest ways to improve it:
1. Pay down credit card balances below 30% utilization
2. Don't close old accounts
3. Dispute any errors on your report
4. Avoid opening new credit lines

Most people can improve their score by 20–50 points in 60–90 days with the right strategy.

Want me to review your situation and give you a personalized plan? Book a call: {calendar_link}

Best,
{agent_name}`,
      },
      {
        stepNumber: 3,
        delayDays: 14,
        subject: "Step 2: Getting pre-approved (it's easier than you think)",
        previewText: "Here's exactly what you'll need",
        body: `Hi {first_name},

Pre-approval is your golden ticket in today's competitive market. Here's exactly what you'll need to get one:

Documents to gather:
✅ Last 2 pay stubs
✅ Last 2 months of bank statements
✅ Last 2 years of W-2s or tax returns
✅ Photo ID
✅ Social Security number

The process takes about 15–30 minutes and I can usually issue a pre-approval letter within 24 hours.

Ready to get yours? Book a call at {calendar_link} and let's get you pre-approved this week.

Best,
{agent_name}`,
      },
      {
        stepNumber: 4,
        delayDays: 21,
        subject: "You're more ready than you think, {first_name}",
        previewText: "Let's make your first home a reality",
        body: `Hi {first_name},

You've been learning about the process and I want to tell you something: you're more ready than you think.

The biggest barrier for most first-time buyers isn't money or credit — it's confidence. They keep waiting until they feel "ready enough."

Here's the truth: the best time to start is now. Even if you're 6 months away from buying, getting pre-approved today gives you:
• A clear picture of your budget
• Time to address any issues
• The ability to move fast when you find the right home

Let's talk. Book a 15-minute call at {calendar_link} — no pressure, no obligation.

Best,
{agent_name}
{phone}`,
      },
    ],
  },
  {
    id: "email-holiday-checkin",
    channel: "email",
    category: "Seasonal",
    name: "Holiday / Seasonal Check-In",
    description: "A warm single-send holiday email to stay top-of-mind with your entire database.",
    stepCount: 1,
    recommendedAudience: "Entire database",
    audienceTags: ["all-leads", "past-clients"],
    badges: ["Database Warmer", "Relationship Builder"],
    estimatedDuration: "Instant",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Happy {holiday} from {agent_name}! 🎉",
        previewText: "Wishing you and your family all the best",
        body: `Hi {first_name},

I just wanted to take a moment to wish you and your family a wonderful {holiday}!

This time of year always reminds me of how grateful I am for the relationships I've built with clients like you. It's truly the best part of my job.

As we head into the new year, if you have any questions about the real estate market, your mortgage, or your home's value — I'm always just a phone call or email away.

Wishing you health, happiness, and a wonderful holiday season!

Warmly,
{agent_name}
{phone}`,
      },
    ],
  },
  {
    id: "email-open-house-invite",
    channel: "email",
    category: "New Leads",
    name: "Open House / Event Invite",
    description: "A 2-email sequence to invite leads to an open house or homebuyer seminar.",
    stepCount: 2,
    recommendedAudience: "Active leads in the market to buy",
    audienceTags: ["warm-leads", "cold-leads"],
    badges: ["Event Focused", "High Engagement"],
    estimatedDuration: "3 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "You're invited: {event_name} on {event_date}",
        previewText: "Join us for a free homebuyer event — seats are limited",
        body: `Hi {first_name},

I'd love to invite you to {event_name} — a free event designed to help buyers like you navigate today's market with confidence.

📅 Date: {event_date}
⏰ Time: {event_time}
📍 Location: {event_location}

What you'll learn:
• How to get pre-approved in today's market
• Down payment assistance programs available in {state}
• How to make a competitive offer
• What to expect from application to closing

Space is limited. Reserve your spot at {rsvp_link} or reply to this email.

Hope to see you there!

Best,
{agent_name}`,
      },
      {
        stepNumber: 2,
        delayDays: 3,
        subject: "Reminder: {event_name} is tomorrow, {first_name}",
        previewText: "Don't forget — we're looking forward to seeing you",
        body: `Hi {first_name},

Just a quick reminder that {event_name} is tomorrow!

📅 {event_date} at {event_time}
📍 {event_location}

If you haven't registered yet, there are still a few spots available: {rsvp_link}

If you can't make it but still want to connect, feel free to book a one-on-one call at {calendar_link}.

See you tomorrow!

Best,
{agent_name}`,
      },
    ],
  },
  {
    id: "email-refinance-education",
    channel: "email",
    category: "Education",
    name: "Refinance Education Sequence",
    description: "A 3-email sequence educating homeowners about when and why to refinance.",
    stepCount: 3,
    recommendedAudience: "Current homeowners who haven't refinanced recently",
    audienceTags: ["past-clients", "warm-leads"],
    badges: ["Education Focused", "Refinance Focused"],
    estimatedDuration: "14 days",
    emailSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        subject: "Is now a good time to refinance, {first_name}?",
        previewText: "Here's how to know if it makes sense for you",
        body: `Hi {first_name},

One of the most common questions I get from homeowners is: "Should I refinance?"

The answer depends on a few key factors:
1. How much lower is the current rate vs. your existing rate?
2. How long do you plan to stay in the home?
3. What are the closing costs?

A general rule of thumb: if you can lower your rate by 0.75% or more and plan to stay for at least 2–3 years, refinancing usually makes financial sense.

Want me to run a free break-even analysis for your specific situation? Reply or book a call at {calendar_link}.

Best,
{agent_name}`,
      },
      {
        stepNumber: 2,
        delayDays: 7,
        subject: "The 3 types of refinancing — which is right for you?",
        previewText: "Rate-and-term, cash-out, or streamline?",
        body: `Hi {first_name},

Not all refinances are the same. Here are the three most common types:

🔄 Rate-and-Term Refinance
Lower your rate, shorten your term, or both. Best for reducing monthly payments or paying off your home faster.

💰 Cash-Out Refinance
Access your home equity as cash. Great for home improvements, debt consolidation, or major expenses.

⚡ Streamline Refinance
Available for FHA and VA loans. Minimal documentation, faster process, lower costs.

Which one might be right for you? Let's find out. Book a 15-minute call at {calendar_link}.

Best,
{agent_name}`,
      },
      {
        stepNumber: 3,
        delayDays: 14,
        subject: "Your free refinance analysis is ready, {first_name}",
        previewText: "I ran the numbers — here's what I found",
        body: `Hi {first_name},

I ran a quick analysis based on what I know about your situation and wanted to share what I found.

Based on current rates and your estimated loan balance, refinancing could potentially save you {estimated_savings}/month — or {annual_savings}/year.

Of course, these are estimates. A full analysis takes about 15 minutes and gives you exact numbers.

Ready to see your real savings? Book a call at {calendar_link} or call me at {phone}.

Best,
{agent_name}`,
      },
    ],
  },
];

// ─── SMS TEMPLATES ────────────────────────────────────────────────────────────

export const SMS_TEMPLATES: CampaignTemplate[] = [
  {
    id: "sms-new-lead-intro",
    channel: "sms",
    category: "New Leads",
    name: "New Lead Intro Text",
    description: "An instant intro text sent the moment a new lead comes in. Gets the conversation started within seconds.",
    stepCount: 1,
    recommendedAudience: "New leads immediately after opt-in",
    audienceTags: ["cold-leads", "warm-leads"],
    badges: ["Beginner Friendly", "High Engagement", "Best for Warm Leads"],
    estimatedDuration: "Instant",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hi {first_name}! This is {agent_name} from {company}. I saw you were looking into {interest} — I'd love to help! Are you available for a quick 10-min call today or tomorrow? Reply with a time that works or call me at {phone}. 😊",
      },
    ],
  },
  {
    id: "sms-missed-call-followup",
    channel: "sms",
    category: "Follow-Up",
    name: "Missed Call / No Answer Follow-Up",
    description: "A 3-message sequence for leads who didn't answer your call. Keeps the conversation alive without being pushy.",
    stepCount: 3,
    recommendedAudience: "Leads who missed your call",
    audienceTags: ["no-response", "warm-leads"],
    badges: ["High Engagement"],
    estimatedDuration: "3 days",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hi {first_name}, this is {agent_name}. I just tried to reach you — sorry I missed you! I'd love to connect about your mortgage options. What's the best time to reach you? Or feel free to text me back here. 📱",
      },
      {
        stepNumber: 2,
        delayDays: 1,
        message: "Hey {first_name}, {agent_name} here again. Just following up — I have some great options I think you'll want to hear about. Is there a time today or tomorrow that works for a quick call? No pressure at all. 🙂",
      },
      {
        stepNumber: 3,
        delayDays: 3,
        message: "Hi {first_name}, last follow-up from me — I don't want to bother you! If you're still interested in {interest}, I'm here whenever you're ready. Just text or call {phone} anytime. Take care! 👋",
      },
    ],
  },
  {
    id: "sms-quick-checkin",
    channel: "sms",
    category: "Follow-Up",
    name: "Quick Check-In Message",
    description: "A simple, friendly check-in text for leads you haven't heard from in a while.",
    stepCount: 1,
    recommendedAudience: "Leads inactive for 7–14 days",
    audienceTags: ["warm-leads", "no-response"],
    badges: ["Beginner Friendly"],
    estimatedDuration: "Instant",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hey {first_name}! {agent_name} here — just checking in. Still thinking about {interest}? Happy to answer any questions or run some numbers for you. No pressure! 😊",
      },
    ],
  },
  {
    id: "sms-appointment-reminder",
    channel: "sms",
    category: "Appointment",
    name: "Appointment Reminder Text",
    description: "A 2-message sequence to confirm appointments and reduce no-shows.",
    stepCount: 2,
    recommendedAudience: "Leads with upcoming appointments",
    audienceTags: ["appointment-set"],
    badges: ["Appointment Focused", "Reduces No-Shows"],
    estimatedDuration: "1 day",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hi {first_name}! Just confirming our call tomorrow at {appointment_time}. We'll be talking about {topic}. Reply YES to confirm or let me know if you need to reschedule. See you then! — {agent_name}",
      },
      {
        stepNumber: 2,
        delayDays: 1,
        message: "Hey {first_name}, reminder: we're talking in {hours_until} hours at {appointment_time}! Here's the dial-in: {meeting_link}. Looking forward to it! — {agent_name}",
      },
    ],
  },
  {
    id: "sms-reengagement",
    channel: "sms",
    category: "Reactivation",
    name: "Re-engagement Text",
    description: "A 2-message sequence to re-engage leads who went cold 30–90 days ago.",
    stepCount: 2,
    recommendedAudience: "Cold leads inactive for 30–90 days",
    audienceTags: ["cold-leads", "no-response"],
    badges: ["Best for Cold Leads"],
    estimatedDuration: "5 days",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hey {first_name}! {agent_name} here — it's been a while! Rates have changed a lot recently. Still thinking about {interest}? Would love to share what I'm seeing in the market. Free to chat? 📊",
      },
      {
        stepNumber: 2,
        delayDays: 5,
        message: "Hi {first_name}, last check-in from me. If you ever want to revisit your options, I'm here — just text or call {phone}. No pressure, no spam. Take care! 👋 — {agent_name}",
      },
    ],
  },
  {
    id: "sms-referral-followup",
    channel: "sms",
    category: "Referral",
    name: "Referral Follow-Up",
    description: "A quick text to follow up with a referred lead and warm up the introduction.",
    stepCount: 2,
    recommendedAudience: "Leads referred by past clients or partners",
    audienceTags: ["warm-leads"],
    badges: ["Best for Warm Leads", "Referral Generator"],
    estimatedDuration: "3 days",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hi {first_name}! This is {agent_name} — {referral_name} suggested I reach out. I'd love to help you with {interest}. Would a quick 10-min call work this week? 😊",
      },
      {
        stepNumber: 2,
        delayDays: 3,
        message: "Hey {first_name}, just following up! {referral_name} spoke highly of you — I'd love to connect. Any time that works for a quick call? — {agent_name} {phone}",
      },
    ],
  },
  {
    id: "sms-review-request",
    channel: "sms",
    category: "Reviews",
    name: "Review Request Text",
    description: "A simple 2-message sequence to request a Google review after closing.",
    stepCount: 2,
    recommendedAudience: "Clients within 1–2 weeks of closing",
    audienceTags: ["post-close"],
    badges: ["Reputation Builder", "High Engagement"],
    estimatedDuration: "3 days",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Congrats again on your new home, {first_name}! 🎉 It was a pleasure working with you. Would you mind leaving a quick Google review? It means the world to me: {google_review_link} — {agent_name}",
      },
      {
        stepNumber: 2,
        delayDays: 3,
        message: "Hey {first_name}! Just a gentle reminder about the review — even one sentence helps so much. Here's the link: {google_review_link} Thank you! 🙏 — {agent_name}",
      },
    ],
  },
  {
    id: "sms-event-reminder",
    channel: "sms",
    category: "Appointment",
    name: "Event Reminder Text",
    description: "A 2-message sequence to remind leads about an upcoming homebuyer event or webinar.",
    stepCount: 2,
    recommendedAudience: "Leads registered for an event",
    audienceTags: ["warm-leads"],
    badges: ["Event Focused"],
    estimatedDuration: "1 day",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hey {first_name}! Reminder: {event_name} is coming up on {event_date} at {event_time}. We'll cover {event_topics}. Can't wait to see you there! — {agent_name}",
      },
      {
        stepNumber: 2,
        delayDays: 1,
        message: "Hi {first_name}! {event_name} starts in a few hours at {event_time}. Here's the link: {event_link}. See you soon! — {agent_name}",
      },
    ],
  },
  {
    id: "sms-lead-nurture-sequence",
    channel: "sms",
    category: "Nurture",
    name: "Lead Nurture SMS Sequence",
    description: "A 4-message nurture sequence spread over 30 days to keep leads warm and move them toward a call.",
    stepCount: 4,
    recommendedAudience: "Leads who are 1–3 months from buying",
    audienceTags: ["warm-leads", "cold-leads"],
    badges: ["Long-Term Nurture"],
    estimatedDuration: "30 days",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hi {first_name}! {agent_name} here. Quick tip: getting pre-approved now (even if you're months away) gives you a huge advantage. Want to know why? Reply and I'll explain! 🏠",
      },
      {
        stepNumber: 2,
        delayDays: 10,
        message: "Hey {first_name}! Did you know you might qualify for down payment assistance? There are programs in {state} that can cover up to {dpa_amount}. Interested in learning more? — {agent_name}",
      },
      {
        stepNumber: 3,
        delayDays: 20,
        message: "Hi {first_name}! Quick market update: rates are currently at {current_rate}%. For a {loan_amount} loan, that's about {monthly_payment}/month. Want me to run your specific numbers? — {agent_name}",
      },
      {
        stepNumber: 4,
        delayDays: 30,
        message: "Hey {first_name}! It's been a month — how are things going with your home search? I'd love to catch up and see how I can help. Free for a quick call? — {agent_name} {phone}",
      },
    ],
  },
  {
    id: "sms-warm-lead-followup",
    channel: "sms",
    category: "Follow-Up",
    name: "Warm Lead Follow-Up",
    description: "A 3-message sequence for leads who showed interest but haven't booked a call yet.",
    stepCount: 3,
    recommendedAudience: "Leads who engaged but didn't book",
    audienceTags: ["warm-leads"],
    badges: ["Best for Warm Leads", "High Engagement"],
    estimatedDuration: "7 days",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hi {first_name}! {agent_name} here — I saw you were checking out {interest}. I have some great options that might fit your situation. Would a quick 10-min call work today? 😊",
      },
      {
        stepNumber: 2,
        delayDays: 3,
        message: "Hey {first_name}! Just following up — I know life gets busy. I have a few minutes open {day_of_week} if you want to chat about your options. No pressure! — {agent_name}",
      },
      {
        stepNumber: 3,
        delayDays: 7,
        message: "Hi {first_name}, last follow-up from me. If you're ready to explore your options, I'm here: {phone} or just reply to this text. Take care! — {agent_name}",
      },
    ],
  },
  {
    id: "sms-past-client-touchpoint",
    channel: "sms",
    category: "Past Clients",
    name: "Past Client Touchpoint",
    description: "A simple check-in text to stay top-of-mind with past clients and generate referrals.",
    stepCount: 1,
    recommendedAudience: "Past clients 6–12 months post-close",
    audienceTags: ["past-clients"],
    badges: ["Relationship Builder", "Referral Generator"],
    estimatedDuration: "Instant",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hey {first_name}! {agent_name} here — just thinking about you and hoping you're loving your home! 🏠 If you ever need anything or know someone looking to buy/refi, I'd love the referral. Take care! 😊",
      },
    ],
  },
  {
    id: "sms-rate-market-update",
    channel: "sms",
    category: "Nurture",
    name: "Rate / Market Update Text",
    description: "A timely single-send text alerting your database to a rate change or market opportunity.",
    stepCount: 1,
    recommendedAudience: "All leads and past clients",
    audienceTags: ["all-leads", "past-clients"],
    badges: ["Time-Sensitive", "Database Warmer"],
    estimatedDuration: "Instant",
    smsSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        message: "Hi {first_name}! Quick update from {agent_name}: rates just {rate_direction} to {current_rate}%. This could save you {monthly_savings}/month. Want me to run your numbers? Reply YES or call {phone}! 📊",
      },
    ],
  },
];

// ─── AI CALLING TEMPLATES ─────────────────────────────────────────────────────

export const AI_CALLING_TEMPLATES: CampaignTemplate[] = [
  {
    id: "ai-new-lead-qualification",
    channel: "ai-calling",
    category: "New Leads",
    name: "New Lead Qualification Call",
    description: "An AI-powered qualification call for brand new leads. Identifies timeline, budget, and readiness to move forward within the first 5 minutes of opt-in.",
    stepCount: 1,
    recommendedAudience: "New leads within the first hour of opt-in",
    audienceTags: ["cold-leads", "warm-leads"],
    badges: ["High Engagement", "Best for Cold Leads", "Appointment Focused"],
    estimatedDuration: "Instant",
    callObjective: "Qualify the lead, understand their timeline and budget, and book a follow-up appointment with the loan officer",
    assistantType: "New Lead Qualifier",
    callFlowSummary: "Intro → Confirm interest → Qualify (timeline, budget, credit) → Handle objections → Book appointment → Confirm details",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Qualify the lead and book a consultation appointment",
        intro: "Hi, is this {first_name}? Great! This is {ai_name} calling on behalf of {agent_name} at {company}. I saw you were looking into {interest} — I just have a few quick questions to make sure we can help you. Do you have 2 minutes?",
        qualifyingQuestions: [
          "Are you looking to purchase a home or refinance your current one?",
          "What's your ideal timeline — are you hoping to close within the next 30, 60, or 90 days?",
          "Do you have a purchase price range in mind?",
          "Have you been pre-approved before, or would this be your first time?",
          "Are you currently working with a real estate agent?",
        ],
        objectionHandling: "If they say they're just browsing: 'Totally understand — no pressure at all. Getting pre-approved now actually gives you a big advantage when you're ready. It only takes 15 minutes and there's no obligation. Would that be okay?' If they're busy: 'I completely understand. {agent_name} has some availability tomorrow — would morning or afternoon work better for you?'",
        bookingGoal: "Book a 15-minute consultation call with {agent_name} within the next 24–48 hours",
        fallbackBehavior: "If unable to book: 'No problem at all. I'll have {agent_name} send you a quick email with some information and a link to book whenever you're ready. What's the best email for you?'",
        expectedOutcomes: ["Appointment booked", "Voicemail left with callback number", "Not interested — marked as DNC", "Wrong number"],
      },
    ],
  },
  {
    id: "ai-follow-up-no-contact",
    channel: "ai-calling",
    category: "Follow-Up",
    name: "Follow-Up No Contact Call",
    description: "An AI call for leads who haven't responded to emails or texts. Makes one final attempt to connect before moving to a long-term nurture sequence.",
    stepCount: 1,
    recommendedAudience: "Leads who haven't responded to 2+ contact attempts",
    audienceTags: ["no-response", "cold-leads"],
    badges: ["Best for Cold Leads"],
    estimatedDuration: "Instant",
    callObjective: "Make contact with an unresponsive lead and either qualify them or confirm they're not interested",
    assistantType: "Re-engagement Caller",
    callFlowSummary: "Intro → Acknowledge previous attempts → Soft qualify → Book or confirm not interested",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Re-engage an unresponsive lead",
        intro: "Hi {first_name}? This is {ai_name} from {company}. I know {agent_name} has tried to reach you a couple of times — I just wanted to make one more attempt to connect. Is now an okay time for 2 minutes?",
        qualifyingQuestions: [
          "Are you still interested in {interest}, or has your situation changed?",
          "Is there anything that's been holding you back from moving forward?",
          "Would you prefer to connect via text or email instead of phone?",
        ],
        objectionHandling: "If they say they're not interested: 'Completely understood — I'll make sure to remove you from our follow-up list. Is there anything specific that changed, or just not the right time?' If they say they're busy: 'No problem — when would be a better time? I can have {agent_name} call you back at a specific time that works for you.'",
        bookingGoal: "Book a callback or confirm they want to be removed from follow-up",
        fallbackBehavior: "If voicemail: 'Hi {first_name}, this is {ai_name} calling for {agent_name} at {company}. This is our last attempt to reach you — if you're still interested in {interest}, please call us back at {phone} or visit {website}. We'd love to help. Have a great day!'",
        expectedOutcomes: ["Appointment booked", "Confirmed not interested — DNC", "Voicemail left", "Requested text/email instead"],
      },
    ],
  },
  {
    id: "ai-referral-followup",
    channel: "ai-calling",
    category: "Referral",
    name: "Referral Follow-Up Call",
    description: "An AI call to warm up a referred lead and book a consultation with the loan officer.",
    stepCount: 1,
    recommendedAudience: "Leads referred by past clients or referral partners",
    audienceTags: ["warm-leads"],
    badges: ["Best for Warm Leads", "Appointment Focused"],
    estimatedDuration: "Instant",
    callObjective: "Warm up the referred lead, establish credibility through the referral connection, and book a consultation",
    assistantType: "Referral Qualifier",
    callFlowSummary: "Intro with referral mention → Build rapport → Qualify → Book appointment",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Convert a referred lead into a booked consultation",
        intro: "Hi {first_name}? This is {ai_name} calling on behalf of {agent_name} at {company}. {referral_name} suggested I reach out — they had a great experience with us and thought we might be able to help you too. Do you have a couple of minutes?",
        qualifyingQuestions: [
          "Did {referral_name} mention what they used us for?",
          "Are you looking to purchase or refinance?",
          "What's your general timeline?",
          "Have you started the pre-approval process yet?",
        ],
        objectionHandling: "If skeptical: 'I completely understand — it's always smart to do your research. {referral_name} was in the same position and ended up saving {referral_savings} on their mortgage. Would you be open to a quick 15-minute call with {agent_name} to see if we can do the same for you?'",
        bookingGoal: "Book a 15-minute consultation with {agent_name}",
        fallbackBehavior: "If unavailable: 'No problem at all. I'll have {agent_name} reach out personally. What's the best time and way to reach you?'",
        expectedOutcomes: ["Appointment booked", "Requested callback at specific time", "Not interested", "Voicemail left"],
      },
    ],
  },
  {
    id: "ai-past-client-checkin",
    channel: "ai-calling",
    category: "Past Clients",
    name: "Past Client Check-In Call",
    description: "A warm AI check-in call to past clients to offer a free rate review and generate referrals.",
    stepCount: 1,
    recommendedAudience: "Past clients 6–18 months post-close",
    audienceTags: ["past-clients"],
    badges: ["Relationship Builder", "Referral Generator"],
    estimatedDuration: "Instant",
    callObjective: "Reconnect with past clients, offer a free rate/equity review, and ask for referrals",
    assistantType: "Client Retention Caller",
    callFlowSummary: "Warm intro → Check-in → Offer rate review → Ask for referrals → Book if interested",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Reconnect with past client and generate referrals or a refinance opportunity",
        intro: "Hi {first_name}! This is {ai_name} calling on behalf of {agent_name} at {company}. It's been about {months_since_close} months since you closed on your home — {agent_name} just wanted to check in and see how everything is going. Do you have a quick minute?",
        qualifyingQuestions: [
          "How are you enjoying the new home?",
          "Have you thought about refinancing now that rates have changed?",
          "Do you know anyone who might be looking to buy or refinance? We'd love to help them the same way we helped you.",
        ],
        objectionHandling: "If they say rates aren't better: 'You're right that it depends on your specific situation. {agent_name} can do a free 10-minute analysis — no obligation — to see if the numbers make sense for you. Would that be helpful?'",
        bookingGoal: "Book a free rate review or get a referral name/number",
        fallbackBehavior: "If not interested: 'No problem at all — {agent_name} just wanted to say hello and let you know we're always here if you need anything. Have a wonderful day!'",
        expectedOutcomes: ["Rate review booked", "Referral name collected", "Not interested — noted", "Voicemail left"],
      },
    ],
  },
  {
    id: "ai-reengagement-call",
    channel: "ai-calling",
    category: "Reactivation",
    name: "Re-engagement Call",
    description: "An AI call to wake up cold leads who went silent 60+ days ago.",
    stepCount: 1,
    recommendedAudience: "Cold leads inactive for 60–180 days",
    audienceTags: ["cold-leads", "no-response"],
    badges: ["Best for Cold Leads", "Reactivation"],
    estimatedDuration: "Instant",
    callObjective: "Re-engage a cold lead, understand what changed, and either qualify them or confirm they're no longer interested",
    assistantType: "Reactivation Caller",
    callFlowSummary: "Friendly re-intro → Acknowledge time gap → Soft qualify → Book or close the loop",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Re-engage a cold lead and determine next steps",
        intro: "Hi {first_name}? This is {ai_name} from {company}. I know it's been a while since we last connected — things change and I just wanted to check in and see where you're at with {interest}. Is now an okay time?",
        qualifyingQuestions: [
          "Is buying or refinancing still something you're thinking about?",
          "Has anything changed in your situation since we last spoke?",
          "What would need to happen for you to feel ready to move forward?",
        ],
        objectionHandling: "If timing isn't right: 'Totally understand — there's no rush. When do you think you might be ready to revisit this? I can make a note and have {agent_name} reach out then.' If not interested: 'No problem at all — I'll make sure to update your record. Is there anything that changed, or just not the right fit?'",
        bookingGoal: "Book a consultation or set a future callback date",
        fallbackBehavior: "If voicemail: 'Hi {first_name}, this is {ai_name} from {company}. Just reaching out to reconnect — a lot has changed in the market and {agent_name} would love to catch up. Give us a call at {phone} or visit {website} whenever you're ready. Take care!'",
        expectedOutcomes: ["Consultation booked", "Future callback scheduled", "Confirmed not interested", "Voicemail left"],
      },
    ],
  },
  {
    id: "ai-appointment-confirmation",
    channel: "ai-calling",
    category: "Appointment",
    name: "Appointment Confirmation Call",
    description: "An AI call to confirm upcoming appointments and reduce no-shows.",
    stepCount: 1,
    recommendedAudience: "Leads with appointments scheduled in the next 24–48 hours",
    audienceTags: ["appointment-set"],
    badges: ["Appointment Focused", "Reduces No-Shows"],
    estimatedDuration: "Instant",
    callObjective: "Confirm the upcoming appointment and ensure the lead has everything they need",
    assistantType: "Appointment Confirmer",
    callFlowSummary: "Intro → Confirm appointment details → Prep instructions → Handle reschedule requests",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Confirm appointment and reduce no-show rate",
        intro: "Hi {first_name}? This is {ai_name} calling from {company}. I'm just reaching out to confirm your appointment with {agent_name} tomorrow at {appointment_time}. Does that still work for you?",
        qualifyingQuestions: [
          "Do you have any questions before the call?",
          "Do you have your recent pay stubs and bank statements handy? Those will help us move faster.",
          "Is there anything specific you'd like to make sure we cover?",
        ],
        objectionHandling: "If they need to reschedule: 'No problem at all — let me help you find a new time. {agent_name} has availability on {available_days}. What works best for you?' If they're not sure they can make it: 'I understand — would it help if I sent you a reminder text an hour before?'",
        bookingGoal: "Confirm the existing appointment or reschedule to a new time",
        fallbackBehavior: "If voicemail: 'Hi {first_name}, this is {ai_name} from {company} confirming your appointment with {agent_name} tomorrow at {appointment_time}. If you need to reschedule, please call us at {phone} or reply to our text. See you tomorrow!'",
        expectedOutcomes: ["Appointment confirmed", "Appointment rescheduled", "Appointment cancelled", "Voicemail left"],
      },
    ],
  },
  {
    id: "ai-appointment-reminder",
    channel: "ai-calling",
    category: "Appointment",
    name: "Appointment Reminder Call",
    description: "An AI reminder call 1 hour before a scheduled appointment to minimize last-minute no-shows.",
    stepCount: 1,
    recommendedAudience: "Leads with appointments in the next 1–2 hours",
    audienceTags: ["appointment-set"],
    badges: ["Appointment Focused", "Reduces No-Shows"],
    estimatedDuration: "Instant",
    callObjective: "Remind the lead of their imminent appointment and confirm they're still attending",
    assistantType: "Appointment Reminder",
    callFlowSummary: "Quick reminder → Confirm attendance → Provide dial-in details",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Remind lead of appointment in 1 hour",
        intro: "Hi {first_name}! Quick reminder from {company} — you have a call with {agent_name} in about an hour at {appointment_time}. Just wanted to make sure you're still good to go!",
        qualifyingQuestions: [
          "Are you still able to make the call?",
          "Do you have the dial-in information handy?",
        ],
        objectionHandling: "If they can't make it: 'No problem — let me reschedule you. {agent_name} has some time later today or tomorrow. What works best?' If they forgot: 'No worries at all! Here's the dial-in: {meeting_link}. We'll see you in an hour!'",
        bookingGoal: "Confirm attendance or reschedule immediately",
        fallbackBehavior: "If voicemail: 'Hi {first_name}! Quick reminder from {company} — your call with {agent_name} is in 1 hour at {appointment_time}. Dial-in: {meeting_link}. See you soon!'",
        expectedOutcomes: ["Confirmed attending", "Rescheduled", "Cancelled", "No answer"],
      },
    ],
  },
  {
    id: "ai-database-reactivation",
    channel: "ai-calling",
    category: "Reactivation",
    name: "Database Reactivation Campaign",
    description: "A bulk AI calling campaign to reactivate an entire cold database. Identifies who is still in the market and books consultations at scale.",
    stepCount: 1,
    recommendedAudience: "Entire cold database — leads inactive for 90+ days",
    audienceTags: ["cold-leads", "no-response", "all-leads"],
    badges: ["Best for Cold Leads", "High Volume", "Reactivation"],
    estimatedDuration: "Instant",
    callObjective: "Contact every lead in the cold database, identify who is still in the market, and book consultations",
    assistantType: "Database Revival Caller",
    callFlowSummary: "Friendly intro → Market update hook → Qualify interest → Book or close the loop",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Reactivate cold database leads at scale",
        intro: "Hi, is this {first_name}? Great! This is {ai_name} from {company}. I know it's been a while — I'm reaching out because there have been some significant changes in the mortgage market that might be relevant to you. Do you have just 2 minutes?",
        qualifyingQuestions: [
          "Are you still thinking about buying or refinancing, or has that changed?",
          "Have you heard about the recent rate changes in the market?",
          "If rates were favorable for your situation, is that something you'd want to explore?",
        ],
        objectionHandling: "If not interested: 'Totally understand — things change. Would it be okay if I sent you a quick market update email occasionally, just so you're in the loop?' If skeptical about rates: 'Fair point — it really does depend on your specific situation. {agent_name} can do a free 10-minute analysis with no obligation. Would that be worth a quick call?'",
        bookingGoal: "Book a consultation or get permission to continue email nurture",
        fallbackBehavior: "If voicemail: 'Hi {first_name}, this is {ai_name} from {company}. I'm reaching out because there have been some big changes in the mortgage market that might benefit you. Give us a call at {phone} or visit {website} to learn more. Have a great day!'",
        expectedOutcomes: ["Consultation booked", "Email nurture opt-in", "Not interested — DNC", "Voicemail left", "Wrong number"],
      },
    ],
  },
  {
    id: "ai-warm-internet-lead",
    channel: "ai-calling",
    category: "New Leads",
    name: "Warm Internet Lead Qualification",
    description: "An AI call for warm internet leads (Zillow, Realtor.com, website) who need to be qualified within minutes of opt-in.",
    stepCount: 1,
    recommendedAudience: "Internet leads from Zillow, Realtor.com, website forms",
    audienceTags: ["warm-leads"],
    badges: ["Best for Warm Leads", "High Engagement", "Appointment Focused"],
    estimatedDuration: "Instant",
    callObjective: "Qualify a warm internet lead within 5 minutes of opt-in and book a consultation",
    assistantType: "Internet Lead Qualifier",
    callFlowSummary: "Immediate response → Acknowledge their search → Qualify → Book appointment",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Qualify warm internet lead and book consultation",
        intro: "Hi {first_name}! This is {ai_name} from {company}. I saw you were just looking at {property_or_interest} online — great choice! I wanted to reach out right away to see if I can help. Do you have 2 minutes?",
        qualifyingQuestions: [
          "Are you looking to buy that property specifically, or are you exploring the area in general?",
          "Are you currently pre-approved, or would that be a next step?",
          "What's your ideal move-in timeline?",
          "Are you working with a real estate agent yet?",
          "What's your approximate budget range?",
        ],
        objectionHandling: "If they just browsed: 'That's totally fine — a lot of people start by browsing. Getting pre-approved now actually gives you a huge advantage when you find the right place. It only takes 15 minutes and doesn't affect your credit. Would that be helpful?' If they have an agent: 'Perfect — I work with a lot of agents in the area. I can get you pre-approved so you're ready to make an offer the moment you find the right home.'",
        bookingGoal: "Book a 15-minute pre-approval consultation",
        fallbackBehavior: "If voicemail: 'Hi {first_name}! This is {ai_name} from {company}. I saw you were searching for homes online and wanted to reach out right away. Give us a call at {phone} — we can get you pre-approved today. Talk soon!'",
        expectedOutcomes: ["Pre-approval consultation booked", "Not ready yet — nurture sequence", "Already have a lender", "Voicemail left"],
      },
    ],
  },
  {
    id: "ai-facebook-lead-qualification",
    channel: "ai-calling",
    category: "New Leads",
    name: "Facebook Lead Qualification",
    description: "An AI call specifically designed for Facebook lead form submissions. Reaches out within minutes to qualify before the lead goes cold.",
    stepCount: 1,
    recommendedAudience: "Facebook lead form submissions",
    audienceTags: ["cold-leads", "warm-leads"],
    badges: ["Best for Cold Leads", "High Engagement"],
    estimatedDuration: "Instant",
    callObjective: "Contact a Facebook lead within 5 minutes of form submission and qualify them for a consultation",
    assistantType: "Facebook Lead Qualifier",
    callFlowSummary: "Reference Facebook ad → Qualify → Book consultation",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Qualify Facebook lead and book consultation",
        intro: "Hi {first_name}? This is {ai_name} calling from {company}. You just filled out a form on Facebook about {ad_topic} — I wanted to reach out right away while it's fresh. Do you have 2 minutes?",
        qualifyingQuestions: [
          "What caught your eye about the ad — was it the rate information, the down payment assistance, or something else?",
          "Are you looking to buy a home or refinance your current one?",
          "What's your timeline — are you thinking in the next 30, 60, or 90 days?",
          "Have you spoken with a mortgage professional before?",
        ],
        objectionHandling: "If they don't remember the ad: 'No worries — you may have filled out a quick form about {ad_topic}. Either way, I'm here to help! Are you currently thinking about buying or refinancing?' If skeptical: 'I completely understand — there's a lot of noise out there. I just want to ask a few quick questions to see if we can actually help you. No pressure at all.'",
        bookingGoal: "Book a 15-minute consultation with {agent_name}",
        fallbackBehavior: "If voicemail: 'Hi {first_name}! This is {ai_name} from {company}. You recently expressed interest in {ad_topic} on Facebook. I'd love to connect — call us at {phone} or visit {website}. Talk soon!'",
        expectedOutcomes: ["Consultation booked", "Not qualified — nurture", "Wrong number", "Voicemail left"],
      },
    ],
  },
  {
    id: "ai-instagram-lead-qualification",
    channel: "ai-calling",
    category: "New Leads",
    name: "Instagram Lead Qualification",
    description: "An AI call for Instagram lead form submissions, optimized for a younger, mobile-first audience.",
    stepCount: 1,
    recommendedAudience: "Instagram lead form submissions",
    audienceTags: ["cold-leads", "warm-leads"],
    badges: ["Best for Cold Leads"],
    estimatedDuration: "Instant",
    callObjective: "Contact an Instagram lead quickly and qualify them for a consultation",
    assistantType: "Instagram Lead Qualifier",
    callFlowSummary: "Reference Instagram → Qualify → Book or offer text follow-up",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Qualify Instagram lead and book consultation",
        intro: "Hey {first_name}! This is {ai_name} from {company}. You connected with us on Instagram about {ad_topic} — I wanted to reach out quickly. Do you have just 2 minutes?",
        qualifyingQuestions: [
          "Are you thinking about buying your first home, or is this more of an investment property?",
          "Are you in the early research phase, or are you actively looking?",
          "Do you have a budget range in mind?",
          "Would you prefer to chat by phone or would a text conversation work better for you?",
        ],
        objectionHandling: "If they prefer text: 'Totally — I'll have {agent_name} text you directly. What's the best number?' If they're just exploring: 'That's a great place to start! Even if you're months away, getting pre-approved now gives you a huge advantage. It only takes 15 minutes — want to try?'",
        bookingGoal: "Book a consultation or set up a text-based follow-up",
        fallbackBehavior: "If voicemail: 'Hey {first_name}! {ai_name} from {company} here — you connected with us on Instagram about {ad_topic}. Text us at {phone} or visit {website} whenever you're ready. Talk soon!'",
        expectedOutcomes: ["Consultation booked", "Text follow-up requested", "Not interested", "Voicemail left"],
      },
    ],
  },
  {
    id: "ai-review-request-followup",
    channel: "ai-calling",
    category: "Reviews",
    name: "Review Request Follow-Up Call",
    description: "An AI call to recent closings to request a Google review and check for referral opportunities.",
    stepCount: 1,
    recommendedAudience: "Clients within 2–4 weeks of closing",
    audienceTags: ["post-close"],
    badges: ["Reputation Builder", "Referral Generator"],
    estimatedDuration: "Instant",
    callObjective: "Request a Google review from a recent closing and ask for referrals",
    assistantType: "Review Request Caller",
    callFlowSummary: "Congratulate → Ask for review → Ask for referrals → Thank",
    aiCallSteps: [
      {
        stepNumber: 1,
        delayDays: 0,
        objective: "Get a Google review and referral from a recent closing",
        intro: "Hi {first_name}! This is {ai_name} calling on behalf of {agent_name} at {company}. Congratulations again on your new home — it was such a pleasure working with you! I'm calling with one quick favor to ask. Do you have 2 minutes?",
        qualifyingQuestions: [
          "How has everything been going since you moved in?",
          "Would you be willing to leave a quick Google review? It takes less than 2 minutes and means the world to us.",
          "Do you know anyone else who might be looking to buy or refinance? We'd love to help them the same way we helped you.",
        ],
        objectionHandling: "If they're too busy for a review: 'Totally understand — even just a star rating with no words would help so much. Here's the link: {google_review_link}.' If they don't know anyone right now: 'No worries at all — just keep us in mind! And if anything changes with your own mortgage, we're always here.'",
        bookingGoal: "Get a Google review commitment and/or a referral name",
        fallbackBehavior: "If voicemail: 'Hi {first_name}! {ai_name} from {company} here — congratulations again on your new home! We'd love a quick Google review when you have a moment: {google_review_link}. And if you know anyone looking to buy or refi, please send them our way. Thanks so much!'",
        expectedOutcomes: ["Review promised", "Referral name collected", "Both review and referral", "Not interested"],
      },
    ],
  },
];

// ─── Combined export ──────────────────────────────────────────────────────────

export const ALL_TEMPLATES: CampaignTemplate[] = [
  ...EMAIL_TEMPLATES,
  ...SMS_TEMPLATES,
  ...AI_CALLING_TEMPLATES,
];

export const CAMPAIGN_CATEGORIES: CampaignCategory[] = [
  "New Leads",
  "Follow-Up",
  "Reactivation",
  "Nurture",
  "Referral",
  "Appointment",
  "Reviews",
  "Past Clients",
  "Seasonal",
  "Education",
];

export const CHANNEL_LABELS: Record<CampaignChannel, string> = {
  email: "Email",
  sms: "SMS",
  "ai-calling": "AI Calling",
};

export const CHANNEL_COLORS: Record<CampaignChannel, { bg: string; text: string; border: string; icon: string }> = {
  email: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: "text-purple-600" },
  sms: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: "text-green-600" },
  "ai-calling": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: "text-blue-600" },
};

export const BADGE_STYLES: Record<string, string> = {
  "High Engagement": "bg-amber-50 text-amber-700 border-amber-200",
  "Beginner Friendly": "bg-teal-50 text-teal-700 border-teal-200",
  "Best for Cold Leads": "bg-slate-50 text-slate-700 border-slate-200",
  "Best for Warm Leads": "bg-orange-50 text-orange-700 border-orange-200",
  "Appointment Focused": "bg-blue-50 text-blue-700 border-blue-200",
  "Reduces No-Shows": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Reputation Builder": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Referral Generator": "bg-pink-50 text-pink-700 border-pink-200",
  "Relationship Builder": "bg-rose-50 text-rose-700 border-rose-200",
  "Database Warmer": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Education Focused": "bg-violet-50 text-violet-700 border-violet-200",
  "Long-Term Nurture": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Time-Sensitive": "bg-red-50 text-red-700 border-red-200",
  "High Volume": "bg-gray-50 text-gray-700 border-gray-200",
  "Reactivation": "bg-orange-50 text-orange-700 border-orange-200",
  "Authority Builder": "bg-purple-50 text-purple-700 border-purple-200",
  "Event Focused": "bg-teal-50 text-teal-700 border-teal-200",
  "Refinance Focused": "bg-blue-50 text-blue-700 border-blue-200",
};

// ─── Combined export ──────────────────────────────────────────────────────────
export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  ...EMAIL_TEMPLATES,
  ...SMS_TEMPLATES,
  ...AI_CALLING_TEMPLATES,
];

