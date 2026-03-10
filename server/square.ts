/**
 * Square Payment Integration
 * Replaces Stripe for all payment processing
 *
 * Environment variables required:
 *   SQUARE_ACCESS_TOKEN  — from Square Developer Dashboard → Applications → Credentials
 *   SQUARE_LOCATION_ID   — from Square Developer Dashboard → Locations
 *   SQUARE_WEBHOOK_SIGNATURE_KEY — from Square Developer Dashboard → Webhooks
 *
 * Sandbox vs Production is determined by the SQUARE_ENVIRONMENT env var:
 *   "sandbox"    → Square Sandbox (default for development)
 *   "production" → Square Production
 */

import { SquareClient, SquareEnvironment } from "square";

const environment =
  process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

export const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN || "",
  environment,
});

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || "";

/**
 * Create a Square Payment Link for a subscription tier.
 * Returns the checkout URL to redirect the customer to.
 */
export async function createSquareCheckoutLink(params: {
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  redirectUrl: string;
  referenceId?: string;
  buyerEmail?: string;
  buyerName?: string;
}): Promise<{ checkoutUrl: string; orderId: string }> {
  const { name, description, amountCents, currency, redirectUrl, referenceId, buyerEmail, buyerName } = params;

  const response = await squareClient.checkout.paymentLinks.create({
    idempotencyKey: `${referenceId || "order"}-${Date.now()}`,
    order: {
      locationId: SQUARE_LOCATION_ID,
      referenceId: referenceId,
      lineItems: [
        {
          name,
          note: description,
          quantity: "1",
          basePriceMoney: {
            amount: BigInt(amountCents),
            currency: currency.toUpperCase() as "USD",
          },
        },
      ],
      ...(buyerEmail || buyerName
        ? {
            fulfillments: [
              {
                type: "DIGITAL",
                digitalDetails: {
                  emailAddress: buyerEmail,
                },
              },
            ],
          }
        : {}),
    },
    checkoutOptions: {
      redirectUrl,
      askForShippingAddress: false,
      acceptedPaymentMethods: {
        applePay: true,
        googlePay: true,
        cashAppPay: false,
        afterpayClearpay: false,
      },
    },
    prePopulatedData: buyerEmail
      ? {
          buyerEmail,
        }
      : undefined,
  });

  const link = response.paymentLink;
  if (!link?.url || !link?.orderId) {
    throw new Error("Square checkout link creation failed — no URL returned");
  }

  return {
    checkoutUrl: link.url,
    orderId: link.orderId,
  };
}

/**
 * Verify a Square webhook signature.
 * Returns true if the signature is valid.
 */
export function verifySquareWebhook(
  body: string,
  signature: string,
  notificationUrl: string
): boolean {
  try {
    const { WebhooksHelper } = require("square");
    return WebhooksHelper.isValidWebhookEventSignature(
      body,
      signature,
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "",
      notificationUrl
    );
  } catch {
    return false;
  }
}
