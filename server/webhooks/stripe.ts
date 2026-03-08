import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../stripe";
import { createAgency, updateAgencySetupFee } from "../db";
import { sendEmail } from "../sendgrid";
import { getWelcomeEmail } from "../email-templates";

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Stripe Webhook] No signature found");
    return res.status(400).send("No signature");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Payment succeeded: ${paymentIntent.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`[Stripe Webhook] Payment failed: ${paymentIntent.id}`);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Subscription canceled: ${subscription.id}`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice paid: ${invoice.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Invoice payment failed: ${invoice.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error processing event:`, error);
    res.status(500).json({ error: error.message });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`[Stripe Webhook] Processing checkout completion: ${session.id}`);

  const metadata = session.metadata;
  if (!metadata) {
    console.error("[Stripe Webhook] No metadata in session");
    return;
  }

  // Extract onboarding data from metadata
  const targetMarkets = metadata.targetMarkets ? JSON.parse(metadata.targetMarkets) : {};

  // Create agency record
  // Note: We don't have a user yet since they haven't logged in
  // We'll link the user after they complete OAuth
  const agencyData = {
    ownerId: 0, // Placeholder - will be updated when user logs in
    name: metadata.businessName,
    businessType: metadata.businessType as "loan_officer" | "real_estate",
    targetMarkets: JSON.stringify(targetMarkets),
    teamSize: parseInt(metadata.teamSize) || 1,
    webinarWillingness: metadata.webinarWillingness === "true",
    avatarRecording: metadata.avatarRecording as "self" | "studio",
    setupFeePaid: true,
    setupFeePaymentIntentId: session.payment_intent as string,
    status: "pending_call" as const,
  };

  try {
    const result = await createAgency(agencyData);
    console.log(`[Stripe Webhook] Created agency record for ${metadata.businessName}`);
    
    // Send welcome email
    if (session.customer_details?.email) {
      const dashboardUrl = process.env.VITE_APP_URL || "https://your-domain.manus.space";
      const welcomeEmail = getWelcomeEmail({
        businessName: metadata.businessName,
        businessType: metadata.businessType as "loan_officer" | "real_estate",
        dashboardUrl,
      });
      
      await sendEmail({
        to: [session.customer_details.email],
        from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
        text: welcomeEmail.text,
      });
      
      console.log(`[Stripe Webhook] Sent welcome email to ${session.customer_details.email}`);
    }
    
    // Store the agency ID in session metadata for later retrieval
    await stripe.checkout.sessions.update(session.id, {
      metadata: {
        ...metadata,
        agencyCreated: "true",
      },
    });
  } catch (error: any) {
    console.error("[Stripe Webhook] Error creating agency:", error);
    throw error;
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  console.log(`[Stripe Webhook] Processing subscription change: ${subscription.id}`);
  
  // This will be called when the 90-day trial ends and subscription billing starts
  // We'll update the client record with the subscription details
  
  const customerId = subscription.customer as string;
  const status = subscription.status;
  
  console.log(`[Stripe Webhook] Subscription ${subscription.id} status: ${status}`);
  
  // TODO: Update client record with subscription status
  // This will be implemented when we build the client management system
}
