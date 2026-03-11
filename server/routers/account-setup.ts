import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
// Uses raw mysql2 to avoid Drizzle schema drift issues

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getConn() {
  const mysql2 = await import('mysql2/promise');
  return mysql2.createConnection(process.env.DATABASE_URL!);
}

async function getClientIdForUser(userId: number): Promise<number | null> {
  const conn = await getConn();
  try {
    const [rows] = await conn.execute<any[]>(
      "SELECT id FROM clients WHERE user_id = ? LIMIT 1",
      [userId]
    );
    return (rows as any[])[0]?.id ?? null;
  } finally {
    await conn.end();
  }
}

async function getSetupRow(clientId: number): Promise<any | null> {
  const conn = await getConn();
  try {
    const [rows] = await conn.execute<any[]>(
      "SELECT * FROM client_account_setup WHERE client_id = ? LIMIT 1",
      [clientId]
    );
    return (rows as any[])[0] ?? null;
  } finally {
    await conn.end();
  }
}

async function upsertSetup(clientId: number, data: Record<string, any>): Promise<void> {
  const conn = await getConn();
  try {
    const existing = await getSetupRow(clientId);

    if (existing) {
      const setClauses = Object.keys(data)
        .map((k) => `\`${k}\` = ?`)
        .join(", ");
      const values = [...Object.values(data), clientId];
      await conn.execute(
        `UPDATE client_account_setup SET ${setClauses} WHERE client_id = ?`,
        values
      );
    } else {
      const cols = ["client_id", ...Object.keys(data)].map((c) => `\`${c}\``).join(", ");
      const placeholders = Array(Object.keys(data).length + 1).fill("?").join(", ");
      const values = [clientId, ...Object.values(data)];
      await conn.execute(
        `INSERT INTO client_account_setup (${cols}) VALUES (${placeholders})`,
        values
      );
    }
  } finally {
    await conn.end();
  }
}

// ─── Zod schemas for each section ────────────────────────────────────────────

const socialMediaSchema = z.object({
  fbEmail: z.string().email().max(320).optional().or(z.literal("")),
  fbPassword: z.string().max(500).optional(),
  fbPageId: z.string().max(64).optional(),
  fbPageName: z.string().max(255).optional(),
  igUsername: z.string().max(100).optional(),
  igPassword: z.string().max(500).optional(),
  linkedinEmail: z.string().email().max(320).optional().or(z.literal("")),
  linkedinPassword: z.string().max(500).optional(),
  linkedinPageUrl: z.string().url().max(500).optional().or(z.literal("")),
  tiktokUsername: z.string().max(100).optional(),
  tiktokPassword: z.string().max(500).optional(),
  youtubeEmail: z.string().email().max(320).optional().or(z.literal("")),
  youtubePassword: z.string().max(500).optional(),
  youtubeChannelUrl: z.string().url().max(500).optional().or(z.literal("")),
  twitterUsername: z.string().max(100).optional(),
  twitterPassword: z.string().max(500).optional(),
});

const websiteAccessSchema = z.object({
  websiteUrl: z.string().url().max(500).optional().or(z.literal("")),
  websitePlatform: z.string().max(50).optional(),
  websiteAdminUrl: z.string().url().max(500).optional().or(z.literal("")),
  websiteAdminEmail: z.string().email().max(320).optional().or(z.literal("")),
  websiteAdminPassword: z.string().max(500).optional(),
  ftpHost: z.string().max(255).optional(),
  ftpUsername: z.string().max(255).optional(),
  ftpPassword: z.string().max(500).optional(),
  hostingProvider: z.string().max(100).optional(),
  hostingEmail: z.string().email().max(320).optional().or(z.literal("")),
  hostingPassword: z.string().max(500).optional(),
  domainRegistrar: z.string().max(100).optional(),
  domainEmail: z.string().email().max(320).optional().or(z.literal("")),
  domainPassword: z.string().max(500).optional(),
});

const adAccountsSchema = z.object({
  metaAdAccountId: z.string().max(100).optional(),
  metaAdEmail: z.string().email().max(320).optional().or(z.literal("")),
  metaAdPassword: z.string().max(500).optional(),
  metaBusinessManagerId: z.string().max(100).optional(),
  googleAdsCustomerId: z.string().max(50).optional(),
  googleAdsEmail: z.string().email().max(320).optional().or(z.literal("")),
  googleAdsPassword: z.string().max(500).optional(),
  googleAnalyticsId: z.string().max(50).optional(),
  googleSearchConsoleAccess: z.boolean().optional(),
  tiktokAdsAccountId: z.string().max(100).optional(),
  tiktokAdsEmail: z.string().email().max(320).optional().or(z.literal("")),
  tiktokAdsPassword: z.string().max(500).optional(),
});

const websitePreferencesSchema = z.object({
  wantsNewWebsite: z.boolean().optional(),
  websiteGoal: z.string().max(50).optional(),
  websiteStyle: z.string().max(50).optional(),
  websitePages: z.string().max(2000).optional(),
  websiteFeatures: z.string().max(2000).optional(),
  websiteColorPrimary: z.string().max(20).optional(),
  websiteColorSecondary: z.string().max(20).optional(),
  websiteExamples: z.string().max(2000).optional(),
  websiteAdditionalNotes: z.string().max(5000).optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const accountSetupRouter = router({
  // Get all setup data for the current client
  getSetup: protectedProcedure.query(async ({ ctx }) => {
    const clientId = await getClientIdForUser(ctx.user.id);
    if (!clientId) return null;
    const row = await getSetupRow(clientId);
    return row ?? null;
  }),

  // Save social media section
  saveSocialMedia: protectedProcedure
    .input(socialMediaSchema)
    .mutation(async ({ ctx, input }) => {
      const clientId = await getClientIdForUser(ctx.user.id);
      if (!clientId) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });

      const dbData: Record<string, any> = {
        fb_email: input.fbEmail || null,
        fb_password: input.fbPassword || null,
        fb_page_id: input.fbPageId || null,
        fb_page_name: input.fbPageName || null,
        ig_username: input.igUsername || null,
        ig_password: input.igPassword || null,
        linkedin_email: input.linkedinEmail || null,
        linkedin_password: input.linkedinPassword || null,
        linkedin_page_url: input.linkedinPageUrl || null,
        tiktok_username: input.tiktokUsername || null,
        tiktok_password: input.tiktokPassword || null,
        youtube_email: input.youtubeEmail || null,
        youtube_password: input.youtubePassword || null,
        youtube_channel_url: input.youtubeChannelUrl || null,
        twitter_username: input.twitterUsername || null,
        twitter_password: input.twitterPassword || null,
        last_updated_section: "social_media",
      };

      await upsertSetup(clientId, dbData);
      return { success: true };
    }),

  // Save website access section
  saveWebsiteAccess: protectedProcedure
    .input(websiteAccessSchema)
    .mutation(async ({ ctx, input }) => {
      const clientId = await getClientIdForUser(ctx.user.id);
      if (!clientId) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });

      const dbData: Record<string, any> = {
        website_url: input.websiteUrl || null,
        website_platform: input.websitePlatform || null,
        website_admin_url: input.websiteAdminUrl || null,
        website_admin_email: input.websiteAdminEmail || null,
        website_admin_password: input.websiteAdminPassword || null,
        ftp_host: input.ftpHost || null,
        ftp_username: input.ftpUsername || null,
        ftp_password: input.ftpPassword || null,
        hosting_provider: input.hostingProvider || null,
        hosting_email: input.hostingEmail || null,
        hosting_password: input.hostingPassword || null,
        domain_registrar: input.domainRegistrar || null,
        domain_email: input.domainEmail || null,
        domain_password: input.domainPassword || null,
        last_updated_section: "website_access",
      };

      await upsertSetup(clientId, dbData);
      return { success: true };
    }),

  // Save ad accounts section
  saveAdAccounts: protectedProcedure
    .input(adAccountsSchema)
    .mutation(async ({ ctx, input }) => {
      const clientId = await getClientIdForUser(ctx.user.id);
      if (!clientId) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });

      const dbData: Record<string, any> = {
        meta_ad_account_id: input.metaAdAccountId || null,
        meta_ad_email: input.metaAdEmail || null,
        meta_ad_password: input.metaAdPassword || null,
        meta_bm_id: input.metaBusinessManagerId || null,
        google_ads_customer_id: input.googleAdsCustomerId || null,
        google_ads_email: input.googleAdsEmail || null,
        google_ads_password: input.googleAdsPassword || null,
        google_analytics_id: input.googleAnalyticsId || null,
        google_search_console_access: input.googleSearchConsoleAccess ?? false,
        tiktok_ads_account_id: input.tiktokAdsAccountId || null,
        tiktok_ads_email: input.tiktokAdsEmail || null,
        tiktok_ads_password: input.tiktokAdsPassword || null,
        last_updated_section: "ad_accounts",
      };

      await upsertSetup(clientId, dbData);
      return { success: true };
    }),

  // Save website preferences section
  saveWebsitePreferences: protectedProcedure
    .input(websitePreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      const clientId = await getClientIdForUser(ctx.user.id);
      if (!clientId) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });

      const dbData: Record<string, any> = {
        wants_new_website: input.wantsNewWebsite ?? false,
        website_goal: input.websiteGoal || null,
        website_style: input.websiteStyle || null,
        website_pages: input.websitePages || null,
        website_features: input.websiteFeatures || null,
        website_color_primary: input.websiteColorPrimary || null,
        website_color_secondary: input.websiteColorSecondary || null,
        website_examples: input.websiteExamples || null,
        website_additional_notes: input.websiteAdditionalNotes || null,
        last_updated_section: "website_preferences",
      };

      await upsertSetup(clientId, dbData);
      return { success: true };
    }),

  // Mark setup as complete
  markComplete: protectedProcedure.mutation(async ({ ctx }) => {
    const clientId = await getClientIdForUser(ctx.user.id);
    if (!clientId) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });

    await upsertSetup(clientId, {
      setup_completed_at: new Date(),
      last_updated_section: "completed",
    });

    return { success: true };
  }),
});
