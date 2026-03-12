/**
 * Pipeline Close Date Reminders
 *
 * Runs daily and sends SMS + in-app notifications for opportunities
 * whose expected close date is within 3 days and are still open.
 */
import { getDb } from "../db";
import { opportunities } from "../../drizzle/schema-pipeline";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { sendSMS } from "../twilio";
import { notifyOwner } from "../_core/notification";

export async function processPipelineCloseDateReminders(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Pipeline Reminders] DB unavailable, skipping");
    return;
  }

  try {
    const now = new Date();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find open opportunities with close date between tomorrow and 3 days from now
    const dueOpps = await db
      .select({
        id: opportunities.id,
        name: opportunities.name,
        contactName: opportunities.contactName,
        value: opportunities.value,
        ownerName: opportunities.ownerName,
        expectedCloseDate: opportunities.expectedCloseDate,
        agencyId: opportunities.agencyId,
      })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.status, "open"),
          gte(opportunities.expectedCloseDate, tomorrow),
          lte(opportunities.expectedCloseDate, in3Days)
        )
      );

    if (dueOpps.length === 0) {
      console.log("[Pipeline Reminders] No upcoming close dates in next 3 days");
      return;
    }

    console.log(`[Pipeline Reminders] Found ${dueOpps.length} opportunities closing within 3 days`);

    // Group by agency for batched notifications
    const byAgency: Record<number, typeof dueOpps> = {};
    for (const opp of dueOpps) {
      if (!byAgency[opp.agencyId]) byAgency[opp.agencyId] = [];
      byAgency[opp.agencyId].push(opp);
    }

    for (const [agencyId, agencyOpps] of Object.entries(byAgency)) {
      const lines = agencyOpps.map(o => {
        const closeDate = o.expectedCloseDate
          ? new Date(o.expectedCloseDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : "soon";
        const val = o.value ? `$${(parseFloat(o.value) / 1000).toFixed(0)}K` : "";
        return `• ${o.name}${val ? ` (${val})` : ""} — closes ${closeDate}${o.ownerName ? ` [${o.ownerName}]` : ""}`;
      });

      const title = `⏰ ${agencyOpps.length} Deal${agencyOpps.length > 1 ? "s" : ""} Closing Within 3 Days`;
      const content = `The following opportunities are approaching their close dates:\n\n${lines.join("\n")}\n\nLog in to take action before they expire.`;

      // Send in-app notification to owner
      await notifyOwner({ title, content });

      console.log(`[Pipeline Reminders] Sent notification for agency ${agencyId}: ${agencyOpps.length} deals`);
    }
  } catch (err) {
    console.error("[Pipeline Reminders] Error processing close date reminders:", err);
  }
}
