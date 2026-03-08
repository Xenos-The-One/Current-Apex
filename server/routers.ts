import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { paymentRouter } from "./routers/payment";
import { adminRouter } from "./routers/admin";
import { vapiRouter } from "./routers/vapi";
import { clientRouter as crmRouter } from "./routers/client";
import { socialRouter } from "./routers/social";
import { aiRouter } from "./routers/ai";
import { campaignsRouter } from "./routers/campaigns";
import { campaignsMonitoringRouter } from "./routers/campaigns-monitoring";
import { analyticsRouter } from "./routers/analytics";
import { templatesRouter } from "./routers/templates";
import { leadsRouter } from "./routers/leads";
import { appointmentsRouter } from "./routers/appointments";
import { smsCampaignsRouter } from "./routers/sms-campaigns";
import { contentApprovalsRouter } from "./routers/content-approvals";
import { indigoLabsRouter } from "./routers/indigo-labs";
import { birthdaysRouter } from "./routers/birthdays";
import { webinarsRouter } from "./routers/webinars";
import { aiOpsRouter } from "./routers/ai-ops";
import { notificationsRouter } from "./routers/notifications";
import { metricsRouter } from "./routers/metrics";
import { loaRouter } from "./routers/loa";
import { accountRouter } from "./routers/account";
import { borrowersRouter } from "./routers/borrowers";
import { referralPartnersRouter } from "./routers/referral-partners";
import { marketAnalyticsRouter } from "./routers/market-analytics";
import { vapiCallsRouter } from "./routers/vapi-calls";
import { facebookLeadsRouter } from "./routers/facebookLeads";
import { seoRouter } from "./seo-routers";
import { seoBridgeRouter } from "./routers/seo-bridge";
import { notificationCenterRouter } from "./routers/notification-center";
import { aiAssistantRouter } from "./routers/ai-assistant";
import { followUpsRouter } from "./routers/follow-ups";
import { workflowsRouter } from "./routers/workflows";
import { milestonesTasksRouter } from "./routers/milestones-tasks";
import { publicFeaturesRouter } from "./routers/public-features";
import { onboardingRouter } from "./routers/onboarding";
import { launchpadRouter } from "./routers/launchpad";
import { seedTemplatesRouter } from "./routers/seed-templates";
import { onboardingSnapshotRouter } from "./routers/onboarding-snapshot";
import { clientOnboardingRouter } from "./routers/client-onboarding";
// Additional routers used by client pages
import { automationsRouter } from "./routers/automations";
import { billingRouter } from "./routers/billing";
import { agenciesRouter } from "./routers/agencies";
import { contentRouter } from "./routers/content";
import { wordpressRouter } from "./routers/seo/wordpress";
import { bulkPublishingRouter } from "./routers/seo/bulkPublishing";
import { clientsRouter } from "./routers/clients";

export const appRouter = router({
  system: systemRouter,
  payment: paymentRouter,
  admin: adminRouter,
  vapi: vapiRouter,
  crm: crmRouter,
  social: socialRouter,
  ai: aiRouter,
  campaigns: campaignsMonitoringRouter,
  campaignsOld: campaignsRouter,
  analytics: analyticsRouter,
  templates: templatesRouter,
  leads: leadsRouter,
  appointments: appointmentsRouter,
  smsCampaigns: smsCampaignsRouter,
  contentApprovals: contentApprovalsRouter,
  indigoLabs: indigoLabsRouter,
  birthdays: birthdaysRouter,
  webinars: webinarsRouter,
  aiOps: aiOpsRouter,
  notifications: notificationsRouter,
  metrics: metricsRouter,
  loa: loaRouter,
  account: accountRouter,
  borrowers: borrowersRouter,
  referralPartners: referralPartnersRouter,
  marketAnalytics: marketAnalyticsRouter,
  vapiCalls: vapiCallsRouter,
  facebookLeads: facebookLeadsRouter,
  seo: seoRouter,
  seoBridge: seoBridgeRouter,
  notificationCenter: notificationCenterRouter,
  aiAssistant: aiAssistantRouter,
  followUps: followUpsRouter,
  workflows: workflowsRouter,
  milestonesTasks: milestonesTasksRouter,
  publicFeatures: publicFeaturesRouter,
  onboarding: onboardingRouter,
  launchpad: launchpadRouter,
  seedTemplates: seedTemplatesRouter,
  onboardingSnapshot: onboardingSnapshotRouter,
  clientOnboarding: clientOnboardingRouter,
  // Top-level aliases for client pages
  automations: automationsRouter,
  billing: billingRouter,
  agencies: agenciesRouter,
  content: contentRouter,
  wordpress: wordpressRouter,
  bulkPublishing: bulkPublishingRouter,
  clients: clientsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
