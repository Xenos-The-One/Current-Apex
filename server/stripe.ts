import Stripe from "stripe";

let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set. Add it via Settings → Secrets.");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-01-27.acacia" as any,
      typescript: true,
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) { return (getStripe() as any)[prop]; },
});

/**
 * Create or get Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(params: {
  email: string;
  name?: string;
  userId: number;
}) {
  const { email, name, userId } = params;

  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      user_id: userId.toString(),
    },
  });
}

/**
 * Create a Stripe Price for a subscription tier
 */
export async function createStripePrice(params: {
  productName: string;
  amount: number; // in cents
  currency: string;
  interval: "month" | "year";
  description?: string;
}) {
  const { productName, amount, currency, interval, description } = params;

  // Create product first
  const product = await stripe.products.create({
    name: productName,
    description,
  });

  // Create price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency,
    recurring: {
      interval,
    },
  });

  return { product, price };
}
