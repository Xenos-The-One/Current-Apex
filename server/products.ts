/**
 * Stripe Products and Pricing Configuration
 * Centralized product definitions for the Agency CRM
 * 
 * NEW MODEL: No setup fee. Monthly subscription only.
 * 30-day money-back guarantee. Annual prepay discount available.
 */

export const SUBSCRIPTION_TIERS = {
  starter: {
    tier: "starter",
    name: "Starter",
    price: 297,
    priceInCents: 29700,
    annualPrice: 2970,
    annualPriceInCents: 297000,
    currency: "usd",
    interval: "month" as const,
    description: "DIY lead management for solo agents",
    features: [
      "Full CRM access (unlimited leads & clients)",
      "Email & SMS campaigns (SendGrid/Twilio)",
      "Social media scheduler",
      "AI script generator",
      "Lead scoring & analytics",
      "Google Calendar integration",
    ],
    notIncluded: [
      "No AI Avatar",
      "No Vapi AI calling (manual calls only)",
      "Self-setup (video tutorials provided)",
    ],
  },
  pro: {
    tier: "pro",
    name: "Professional",
    price: 497,
    priceInCents: 49700,
    annualPrice: 4970,
    annualPriceInCents: 497000,
    currency: "usd",
    interval: "month" as const,
    description: "Automation for busy agents who want to scale",
    features: [
      "Everything in Starter",
      "Vapi AI calling (auto-call leads in 60 seconds)",
      "Self-recorded AI avatar (you film, we upload to HeyGen)",
      "30-min onboarding walkthrough call",
      "Campaign A/B testing",
      "Priority support",
    ],
    notIncluded: [
      "No professional avatar shoot",
      "No done-for-you content",
    ],
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    price: 997,
    priceInCents: 99700,
    annualPrice: 9970,
    annualPriceInCents: 997000,
    currency: "usd",
    interval: "month" as const,
    description: "Full-service with professional AI avatar",
    features: [
      "Everything in Professional",
      "Professional HeyGen avatar shoot (studio quality, 5 outfits)",
      "Monthly strategy calls",
      "Pre-written content library (50+ scripts)",
      "White-label options",
      "API access & custom integrations",
      "Dedicated account manager",
    ],
    notIncluded: [],
  },
  done_for_you: {
    tier: "done_for_you",
    name: "Done-For-You",
    price: 2000,
    priceInCents: 200000,
    annualPrice: 20000,
    annualPriceInCents: 2000000,
    currency: "usd",
    interval: "month" as const,
    description: "We run everything — you focus on closing deals",
    features: [
      "Everything in Enterprise",
      "Full-service campaign management",
      "We create all content for you",
      "We manage ad campaigns",
      "We monitor leads and follow-up",
      "Monthly funnel optimization",
      "White-glove dedicated account manager",
      "Monthly performance reports",
    ],
    notIncluded: [],
  },
} as const;

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS;

export function getSubscriptionTier(tier: string) {
  return SUBSCRIPTION_TIERS[tier as SubscriptionTierKey] || null;
}

export function getAllTiers() {
  return Object.values(SUBSCRIPTION_TIERS);
}
