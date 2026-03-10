/**
 * Square Webhook Handler
 * Processes payment events from Square
 *
 * Register this webhook URL in Square Developer Dashboard:
 *   https://developer.squareup.com/apps → Webhooks → Add endpoint
 *   URL: https://your-domain.com/api/square/webhook
 *   Events: payment.completed, order.updated, subscription.created, subscription.updated
 */

import type { Request, Response } from "express";
import { verifySquareWebhook } from "../square";

export async function handleSquareWebhook(req: Request, res: Response) {
  const signature = req.headers["x-square-hmacsha256-signature"] as string;
  const notificationUrl = `${req.protocol}://${req.get("host")}/api/square/webhook`;

  // Verify the webhook signature
  const body = req.body as Buffer;
  const bodyStr = body.toString("utf8");

  // For test events
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(bodyStr);
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  // Verify signature (skip in sandbox/test mode)
  if (process.env.SQUARE_ENVIRONMENT !== "sandbox" && signature) {
    const isValid = verifySquareWebhook(bodyStr, signature, notificationUrl);
    if (!isValid) {
      console.warn("[Square Webhook] Invalid signature — rejecting event");
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  const eventType = event.type as string;
  console.log(`[Square Webhook] Received event: ${eventType}`);

  try {
    switch (eventType) {
      case "payment.completed": {
        const payment = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;
        console.log(`[Square Webhook] Payment completed: ${payment?.id}`);
        // TODO: Update subscription status in DB
        break;
      }
      case "order.updated": {
        const order = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;
        console.log(`[Square Webhook] Order updated: ${order?.id}`);
        break;
      }
      case "subscription.created": {
        const subscription = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;
        console.log(`[Square Webhook] Subscription created: ${subscription?.id}`);
        break;
      }
      case "subscription.updated": {
        const subscription = (event.data as Record<string, unknown>)?.object as Record<string, unknown>;
        console.log(`[Square Webhook] Subscription updated: ${subscription?.id}`);
        break;
      }
      default:
        console.log(`[Square Webhook] Unhandled event type: ${eventType}`);
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("[Square Webhook] Error processing event:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
