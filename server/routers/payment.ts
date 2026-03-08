import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { stripe } from "../stripe";
import { SUBSCRIPTION_TIERS } from "../products";
import { createAgency } from "../db";

export const paymentRouter = router({
  // Create a subscription checkout session (no setup fee)
  createSubscriptionCheckout: publicProcedure
    .input(
      z.object({
        businessName: z.string(),
        businessLocation: z.string(),
        businessType: z.enum(["loan_officer", "real_estate"]),
        targetMarkets: z.object({
          zipCodes: z.array(z.string()),
          cities: z.array(z.string()),
          states: z.array(z.string()),
        }),
        borrowerProfile: z.string().optional(),
        webinarWillingness: z.boolean(),
        teamSize: z.number(),
        currentTools: z.string().optional(),
        avatarRecording: z.enum(["self", "studio"]),
        selectedTier: z.enum(["starter", "pro", "enterprise", "done_for_you"]),
        billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const origin = ctx.req.headers.origin || "http://localhost:3000";
      const tier = SUBSCRIPTION_TIERS[input.selectedTier];
      
      if (!tier) {
        throw new Error("Invalid tier selected");
      }

      const isAnnual = input.billingInterval === "annual";
      const amount = isAnnual ? tier.annualPriceInCents : tier.priceInCents;
      const intervalLabel = isAnnual ? "year" : "month";

      // Create Stripe checkout session for subscription
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        line_items: [
          {
            price_data: {
              currency: tier.currency,
              product_data: {
                name: `${tier.name} Plan`,
                description: tier.description,
              },
              unit_amount: amount,
              recurring: {
                interval: isAnnual ? "year" : "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/get-started`,
        metadata: {
          businessName: input.businessName,
          businessLocation: input.businessLocation,
          businessType: input.businessType,
          targetMarkets: JSON.stringify(input.targetMarkets),
          borrowerProfile: input.borrowerProfile || "",
          webinarWillingness: input.webinarWillingness.toString(),
          teamSize: input.teamSize.toString(),
          currentTools: input.currentTools || "",
          avatarRecording: input.avatarRecording,
          selectedTier: input.selectedTier,
          billingInterval: input.billingInterval,
        },
      });

      return {
        checkoutUrl: session.url!,
        sessionId: session.id,
      };
    }),

  // Legacy alias for backward compatibility
  createSetupCheckout: publicProcedure
    .input(
      z.object({
        businessName: z.string(),
        businessLocation: z.string(),
        businessType: z.enum(["loan_officer", "real_estate"]),
        targetMarkets: z.object({
          zipCodes: z.array(z.string()),
          cities: z.array(z.string()),
          states: z.array(z.string()),
        }),
        borrowerProfile: z.string().optional(),
        webinarWillingness: z.boolean(),
        teamSize: z.number(),
        currentTools: z.string().optional(),
        avatarRecording: z.enum(["self", "studio"]),
        selectedTier: z.enum(["starter", "pro", "enterprise", "done_for_you"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const origin = ctx.req.headers.origin || "http://localhost:3000";
      const tier = SUBSCRIPTION_TIERS[input.selectedTier];
      
      if (!tier) {
        throw new Error("Invalid tier selected");
      }

      // Create Stripe checkout session for monthly subscription (no setup fee)
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        line_items: [
          {
            price_data: {
              currency: tier.currency,
              product_data: {
                name: `${tier.name} Plan`,
                description: tier.description,
              },
              unit_amount: tier.priceInCents,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/get-started`,
        metadata: {
          businessName: input.businessName,
          businessLocation: input.businessLocation,
          businessType: input.businessType,
          targetMarkets: JSON.stringify(input.targetMarkets),
          borrowerProfile: input.borrowerProfile || "",
          webinarWillingness: input.webinarWillingness.toString(),
          teamSize: input.teamSize.toString(),
          currentTools: input.currentTools || "",
          avatarRecording: input.avatarRecording,
          selectedTier: input.selectedTier,
        },
      });

      return {
        checkoutUrl: session.url!,
        sessionId: session.id,
      };
    }),
});
