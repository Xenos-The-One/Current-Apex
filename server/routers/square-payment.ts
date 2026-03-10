/**
 * Square Payment Router
 * Handles subscription checkout via Square Payment Links
 */
import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { createSquareCheckoutLink } from "../square";
import { SUBSCRIPTION_TIERS } from "../products";
import { createAgency } from "../db";

export const squarePaymentRouter = router({
  /**
   * Create a Square Payment Link for a subscription tier.
   * Used on the pricing/onboarding page.
   */
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
        buyerEmail: z.string().email().optional(),
        buyerName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const origin = ctx.req.headers.origin || "http://localhost:3000";
      const tier = SUBSCRIPTION_TIERS[input.selectedTier];

      if (!tier) {
        throw new Error("Invalid tier selected");
      }

      const isAnnual = input.billingInterval === "annual";
      const amountCents = isAnnual ? tier.annualPriceInCents : tier.priceInCents;
      const intervalLabel = isAnnual ? "year" : "month";

      // Create the agency record before checkout so we have a reference ID
      const agencyId = `agency-${Date.now()}`;

      const { checkoutUrl, orderId } = await createSquareCheckoutLink({
        name: `${tier.name} Plan — ${intervalLabel}ly`,
        description: tier.description,
        amountCents,
        currency: tier.currency,
        redirectUrl: `${origin}/payment-success?orderId=${orderId || ""}`,
        referenceId: agencyId,
        buyerEmail: input.buyerEmail,
        buyerName: input.buyerName,
      });

      return {
        checkoutUrl,
        orderId,
        tier: input.selectedTier,
        amount: amountCents / 100,
        interval: intervalLabel,
      };
    }),

  /**
   * Get subscription tiers for display on the pricing page.
   */
  getPlans: publicProcedure.query(() => {
    return Object.values(SUBSCRIPTION_TIERS).map((tier) => ({
      id: tier.tier,
      name: tier.name,
      price: tier.price,
      annualPrice: tier.annualPrice,
      currency: tier.currency,
      description: tier.description,
      features: tier.features,
      notIncluded: tier.notIncluded,
    }));
  }),
});
