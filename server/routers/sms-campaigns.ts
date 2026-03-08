import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { smsCampaigns, smsCampaignRecipients, clients } from "../../drizzle/schema";
import { sendSMS } from "../twilio";
import { eq, and, desc } from "drizzle-orm";

export const smsCampaignsRouter = router({
  // Create a new SMS campaign
  createCampaign: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      name: z.string(),
      message: z.string().max(1600), // SMS limit
      recipients: z.array(z.object({
        name: z.string(),
        phone: z.string(),
      })),
      scheduledFor: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get agency ID from client
      const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId));
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

      // Create campaign
      const result = await db.insert(smsCampaigns).values({
        agencyId: client.agencyId,
        clientId: input.clientId,
        name: input.name,
        message: input.message,
        totalRecipients: input.recipients.length,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 0,
        recipientFilter: "custom",
        status: input.scheduledFor ? "scheduled" : "draft",
        scheduledFor: input.scheduledFor,
        createdBy: ctx.user.id,
      });

      const campaignId = Number((result as any).insertId);

      // Add recipients
      const recipientValues = input.recipients.map(r => ({
        campaignId,
        name: r.name,
        phone: r.phone,
        status: "pending" as const,
      }));

      await db.insert(smsCampaignRecipients).values(recipientValues);

      // If not scheduled, send immediately
      if (!input.scheduledFor) {
        // Send in background (don't await)
        sendCampaignMessages(campaignId).catch(err => {
          console.error(`[SMS Campaign] Error sending campaign ${campaignId}:`, err);
        });
      }

      return {
        success: true,
        campaignId,
      };
    }),

  // Get all campaigns for a client
  getCampaigns: protectedProcedure
    .input(z.object({
      clientId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const campaigns = await db
        .select()
        .from(smsCampaigns)
        .where(eq(smsCampaigns.clientId, input.clientId))
        .orderBy(desc(smsCampaigns.createdAt));

      return campaigns;
    }),

  // Get campaign details with recipients
  getCampaignDetails: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [campaign] = await db
        .select()
        .from(smsCampaigns)
        .where(eq(smsCampaigns.id, input.campaignId));

      if (!campaign) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
      }

      const recipients = await db
        .select()
        .from(smsCampaignRecipients)
        .where(eq(smsCampaignRecipients.campaignId, input.campaignId));

      return {
        campaign,
        recipients,
      };
    }),

  // Send a campaign immediately
  sendCampaign: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Update status to sending
      await db
        .update(smsCampaigns)
        .set({ status: "sending", sentAt: new Date() })
        .where(eq(smsCampaigns.id, input.campaignId));

      // Send messages in background
      sendCampaignMessages(input.campaignId).catch(err => {
        console.error(`[SMS Campaign] Error sending campaign ${input.campaignId}:`, err);
      });

      return { success: true };
    }),
});

// Helper function to send all messages in a campaign
async function sendCampaignMessages(campaignId: number) {
  const db = await getDb();
  if (!db) return;

  // Get campaign details
  const [campaign] = await db
    .select()
    .from(smsCampaigns)
    .where(eq(smsCampaigns.id, campaignId));

  if (!campaign) return;

  // Get all pending recipients
  const recipients = await db
    .select()
    .from(smsCampaignRecipients)
    .where(
      and(
        eq(smsCampaignRecipients.campaignId, campaignId),
        eq(smsCampaignRecipients.status, "pending")
      )
    );

  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;

  // Send to each recipient
  for (const recipient of recipients) {
    try {
      const result = await sendSMS({
        to: recipient.phone,
        body: campaign.message,
      });

      if (result.success) {
        sentCount++;
        deliveredCount++; // Assume delivered if sent successfully
        
        await db
          .update(smsCampaignRecipients)
          .set({
            status: "sent",
            sentAt: new Date(),
            messageSid: result.messageId,
          })
          .where(eq(smsCampaignRecipients.id, recipient.id));
      } else {
        failedCount++;
        
        await db
          .update(smsCampaignRecipients)
          .set({
            status: "failed",
            errorMessage: result.error,
          })
          .where(eq(smsCampaignRecipients.id, recipient.id));
      }
    } catch (error: any) {
      failedCount++;
      
      await db
        .update(smsCampaignRecipients)
        .set({
          status: "failed",
          errorMessage: error.message || "Unknown error",
        })
        .where(eq(smsCampaignRecipients.id, recipient.id));
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Update campaign stats
  await db
    .update(smsCampaigns)
    .set({
      status: "sent",
      sentCount: (campaign.sentCount || 0) + sentCount,
      deliveredCount: (campaign.deliveredCount || 0) + deliveredCount,
      failedCount: (campaign.failedCount || 0) + failedCount,
      completedAt: new Date(),
    })
    .where(eq(smsCampaigns.id, campaignId));

  console.log(`[SMS Campaign] Campaign ${campaignId} completed: ${sentCount} sent, ${failedCount} failed`);
}
