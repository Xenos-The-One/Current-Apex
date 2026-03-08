import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { sendDailyStandups, sendWeeklyStrategy, sendWeeklyReport, sendSmartAlert } from "../ai-operations-director";

export const aiOpsRouter = router({
  /**
   * Send daily standups manually (for testing)
   */
  sendDailyStandups: protectedProcedure
    .mutation(async () => {
      await sendDailyStandups();
      return { success: true, message: "Daily standups sent to all team members" };
    }),

  /**
   * Send weekly strategy manually (for testing)
   */
  sendWeeklyStrategy: protectedProcedure
    .mutation(async () => {
      await sendWeeklyStrategy();
      return { success: true, message: "Weekly strategy sent to all team members" };
    }),

  /**
   * Send weekly report manually (for testing)
   */
  sendWeeklyReport: protectedProcedure
    .mutation(async () => {
      await sendWeeklyReport();
      return { success: true, message: "Weekly report sent to all team members" };
    }),

  /**
   * Send smart alert manually (for testing)
   */
  sendSmartAlert: protectedProcedure
    .input(z.object({
      alertType: z.enum(["hot_lead", "birthday_today", "appointment_no_show", "webinar_milestone", "ad_spend_threshold"]),
      data: z.record(z.string(), z.any())
    }))
    .mutation(async ({ input }) => {
      await sendSmartAlert(input.alertType, input.data);
      return { success: true, message: `Smart alert '${input.alertType}' sent` };
    }),
});
