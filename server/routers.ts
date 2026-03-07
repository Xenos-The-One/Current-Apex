import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { agenciesRouter } from "./routers/agencies";
import { aiRouter } from "./routers/ai";
import { analyticsRouter } from "./routers/analytics";
import { appointmentsRouter } from "./routers/appointments";
import { automationsRouter } from "./routers/automations";
import { billingRouter } from "./routers/billing";
import { borrowersRouter } from "./routers/borrowers";
import { campaignsRouter } from "./routers/campaigns";
import { contactsRouter } from "./routers/contacts";
import { contentRouter } from "./routers/content";
import { documentsRouter } from "./routers/documents";
import { leadsRouter } from "./routers/leads";
import { notificationsRouter } from "./routers/notifications";
import { vapiRouter } from "./routers/vapi";
import { conversationsRouter } from "./routers/conversations";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  agencies: agenciesRouter,
  leads: leadsRouter,
  borrowers: borrowersRouter,
  contacts: contactsRouter,
  campaigns: campaignsRouter,
  appointments: appointmentsRouter,
  automations: automationsRouter,
  vapi: vapiRouter,
  analytics: analyticsRouter,
  documents: documentsRouter,
  content: contentRouter,
  conversations: conversationsRouter,
  notifications: notificationsRouter,
  billing: billingRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
