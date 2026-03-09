import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { generatedWebsites, agencies } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

const ADMIN_ROLES = ["super_admin", "admin", "agency_owner"];

async function getAgencyId(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
  const agency = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.ownerId, userId)).limit(1);
  if (agency.length > 0) return agency[0].id;
  return 1; // fallback to agency 1
}

export const websiteGeneratorRouter = router({
  // List all generated websites for this agency
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const agencyId = await getAgencyId(ctx.user.id);
    const sites = await db
      .select()
      .from(generatedWebsites)
      .where(eq(generatedWebsites.agencyId, agencyId))
      .orderBy(desc(generatedWebsites.createdAt));
    return sites;
  }),

  // Get a single website
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await getAgencyId(ctx.user.id);
      const sites = await db
        .select()
        .from(generatedWebsites)
        .where(and(eq(generatedWebsites.id, input.id), eq(generatedWebsites.agencyId, agencyId)))
        .limit(1);
      if (!sites.length) throw new TRPCError({ code: "NOT_FOUND" });
      return sites[0];
    }),

  // Create a new website (starts as draft)
  create: protectedProcedure
    .input(z.object({
      businessName: z.string().min(1),
      ownerName: z.string().optional(),
      tagline: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      licenseNumber: z.string().optional(),
      specialties: z.array(z.string()).optional(),
      yearsExperience: z.number().optional(),
      colorScheme: z.enum(["navy", "dark", "forest", "burgundy", "charcoal"]).optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await getAgencyId(ctx.user.id);
      const [result] = await db.insert(generatedWebsites).values({
        agencyId,
        clientId: input.clientId ?? null,
        businessName: input.businessName,
        ownerName: input.ownerName ?? null,
        tagline: input.tagline ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        licenseNumber: input.licenseNumber ?? null,
        specialties: input.specialties ? JSON.stringify(input.specialties) : null,
        yearsExperience: input.yearsExperience ?? null,
        colorScheme: input.colorScheme ?? "navy",
        status: "draft",
        createdBy: ctx.user.id,
      });
      const newId = (result as any).insertId;
      const sites = await db.select().from(generatedWebsites).where(eq(generatedWebsites.id, newId)).limit(1);
      return sites[0];
    }),

  // Generate all website content using AI
  generate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await getAgencyId(ctx.user.id);
      const sites = await db
        .select()
        .from(generatedWebsites)
        .where(and(eq(generatedWebsites.id, input.id), eq(generatedWebsites.agencyId, agencyId)))
        .limit(1);
      if (!sites.length) throw new TRPCError({ code: "NOT_FOUND" });
      const site = sites[0];

      // Mark as generating
      await db.update(generatedWebsites).set({ status: "generating" }).where(eq(generatedWebsites.id, input.id));

      const specialties = site.specialties ? JSON.parse(site.specialties) : ["Purchase Loans", "Refinancing", "FHA/VA Loans"];
      const location = [site.city, site.state].filter(Boolean).join(", ") || "your area";
      const ownerName = site.ownerName || site.businessName;
      const years = site.yearsExperience || 10;

      const prompt = `You are a professional website copywriter specializing in mortgage and loan officer websites. Generate compelling, conversion-focused website content for a loan officer.

Business Info:
- Business Name: ${site.businessName}
- Owner/Loan Officer: ${ownerName}
- Location: ${location}
- License #: ${site.licenseNumber || "NMLS #XXXXXX"}
- Specialties: ${specialties.join(", ")}
- Years Experience: ${years}
- Phone: ${site.phone || "(555) 000-0000"}
- Email: ${site.email || "contact@example.com"}

Generate a complete website content package as JSON with this exact structure:
{
  "hero": {
    "headline": "Bold, powerful headline (max 10 words) that speaks to home buyers' pain points",
    "subheadline": "2-sentence value proposition that builds trust and urgency",
    "cta_primary": "Primary CTA button text",
    "cta_secondary": "Secondary CTA button text",
    "trust_badges": ["badge1", "badge2", "badge3"]
  },
  "services": [
    {"icon": "Home", "title": "Service Name", "description": "2-sentence description", "highlight": "Key stat or benefit"},
    {"icon": "DollarSign", "title": "Service Name", "description": "2-sentence description", "highlight": "Key stat or benefit"},
    {"icon": "Shield", "title": "Service Name", "description": "2-sentence description", "highlight": "Key stat or benefit"},
    {"icon": "TrendingUp", "title": "Service Name", "description": "2-sentence description", "highlight": "Key stat or benefit"},
    {"icon": "Users", "title": "Service Name", "description": "2-sentence description", "highlight": "Key stat or benefit"},
    {"icon": "Clock", "title": "Service Name", "description": "2-sentence description", "highlight": "Key stat or benefit"}
  ],
  "testimonials": [
    {"name": "First Last", "location": "City, State", "rating": 5, "text": "Compelling 2-3 sentence testimonial", "loan_type": "Purchase Loan"},
    {"name": "First Last", "location": "City, State", "rating": 5, "text": "Compelling 2-3 sentence testimonial", "loan_type": "Refinance"},
    {"name": "First Last", "location": "City, State", "rating": 5, "text": "Compelling 2-3 sentence testimonial", "loan_type": "FHA Loan"},
    {"name": "First Last", "location": "City, State", "rating": 5, "text": "Compelling 2-3 sentence testimonial", "loan_type": "VA Loan"}
  ],
  "about": {
    "headline": "Why Homebuyers Choose ${ownerName}",
    "bio": "3-4 sentence professional bio that builds trust and shows expertise",
    "stats": [
      {"value": "500+", "label": "Loans Closed"},
      {"value": "${years}+", "label": "Years Experience"},
      {"value": "98%", "label": "Client Satisfaction"},
      {"value": "$200M+", "label": "Loans Funded"}
    ],
    "certifications": ["Certified Mortgage Planner", "FHA Approved Lender", "VA Approved Lender"]
  },
  "faq": [
    {"question": "Relevant FAQ question", "answer": "Clear, helpful answer"},
    {"question": "Relevant FAQ question", "answer": "Clear, helpful answer"},
    {"question": "Relevant FAQ question", "answer": "Clear, helpful answer"},
    {"question": "Relevant FAQ question", "answer": "Clear, helpful answer"},
    {"question": "Relevant FAQ question", "answer": "Clear, helpful answer"}
  ],
  "cta": {
    "headline": "Urgency-driven CTA headline",
    "subheadline": "Supporting sentence that reduces friction",
    "button_text": "CTA button text",
    "phone_cta": "Call us today"
  }
}

Make the content specific to ${location} and the loan officer's specialties. Use powerful, conversion-focused language. Return ONLY valid JSON.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional website copywriter. Return only valid JSON, no markdown code blocks." },
            { role: "user", content: prompt },
          ],
        });

        const rawContent = response.choices[0]?.message?.content || "{}";
        // Strip markdown code blocks if present
        const cleanContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const content = JSON.parse(cleanContent);

        // Generate the full HTML
        const html = generateWebsiteHtml(site, content);

        await db.update(generatedWebsites).set({
          heroSection: JSON.stringify(content.hero),
          servicesSection: JSON.stringify(content.services),
          testimonialsSection: JSON.stringify(content.testimonials),
          aboutSection: JSON.stringify(content.about),
          faqSection: JSON.stringify(content.faq),
          ctaSection: JSON.stringify(content.cta),
          generatedHtml: html,
          status: "ready",
        }).where(eq(generatedWebsites.id, input.id));

        const updated = await db.select().from(generatedWebsites).where(eq(generatedWebsites.id, input.id)).limit(1);
        return updated[0];
      } catch (err) {
        await db.update(generatedWebsites).set({ status: "draft" }).where(eq(generatedWebsites.id, input.id));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate website content" });
      }
    }),

  // Update website details
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      businessName: z.string().optional(),
      ownerName: z.string().optional(),
      tagline: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      licenseNumber: z.string().optional(),
      colorScheme: z.string().optional(),
      status: z.enum(["draft", "generating", "ready", "published", "archived"]).optional(),
      publishedUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await getAgencyId(ctx.user.id);
      const { id, ...updates } = input;
      await db.update(generatedWebsites)
        .set(updates as any)
        .where(and(eq(generatedWebsites.id, id), eq(generatedWebsites.agencyId, agencyId)));
      const updated = await db.select().from(generatedWebsites).where(eq(generatedWebsites.id, id)).limit(1);
      return updated[0];
    }),

  // Delete a website
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const agencyId = await getAgencyId(ctx.user.id);
      await db.delete(generatedWebsites)
        .where(and(eq(generatedWebsites.id, input.id), eq(generatedWebsites.agencyId, agencyId)));
      return { success: true };
    }),
});

// ─── HTML Generator ────────────────────────────────────────────────────────────
function generateWebsiteHtml(site: any, content: any): string {
  const colors: Record<string, { primary: string; accent: string; bg: string; text: string }> = {
    navy: { primary: "#0f172a", accent: "#3b82f6", bg: "#0f172a", text: "#f8fafc" },
    dark: { primary: "#111827", accent: "#6366f1", bg: "#111827", text: "#f9fafb" },
    forest: { primary: "#14532d", accent: "#22c55e", bg: "#052e16", text: "#f0fdf4" },
    burgundy: { primary: "#4c0519", accent: "#f43f5e", bg: "#1c0a0e", text: "#fff1f2" },
    charcoal: { primary: "#1c1917", accent: "#f59e0b", bg: "#1c1917", text: "#fafaf9" },
  };
  const c = colors[site.colorScheme || "navy"];
  const hero = content.hero || {};
  const services = content.services || [];
  const testimonials = content.testimonials || [];
  const about = content.about || {};
  const faq = content.faq || [];
  const cta = content.cta || {};

  const servicesHtml = services.map((s: any) => `
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:28px;transition:transform 0.2s;">
      <div style="width:48px;height:48px;background:${c.accent};border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
        <svg width="24" height="24" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:${c.text}">${s.title}</h3>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.6;margin:0 0 12px">${s.description}</p>
      <span style="color:${c.accent};font-size:13px;font-weight:600">${s.highlight}</span>
    </div>`).join("");

  const testimonialsHtml = testimonials.map((t: any) => `
    <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:28px;">
      <div style="color:${c.accent};font-size:20px;margin-bottom:12px">★★★★★</div>
      <p style="color:rgba(255,255,255,0.85);font-size:15px;line-height:1.7;margin:0 0 16px;font-style:italic">"${t.text}"</p>
      <div>
        <div style="font-weight:700;color:${c.text}">${t.name}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:13px">${t.location} · ${t.loan_type}</div>
      </div>
    </div>`).join("");

  const faqHtml = faq.map((f: any, i: number) => `
    <div style="border-bottom:1px solid rgba(255,255,255,0.1);padding:20px 0;">
      <h4 style="font-size:16px;font-weight:600;color:${c.text};margin:0 0 10px">${f.question}</h4>
      <p style="color:rgba(255,255,255,0.7);font-size:14px;line-height:1.7;margin:0">${f.answer}</p>
    </div>`).join("");

  const statsHtml = (about.stats || []).map((s: any) => `
    <div style="text-align:center">
      <div style="font-size:36px;font-weight:800;color:${c.accent}">${s.value}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:14px;margin-top:4px">${s.label}</div>
    </div>`).join("");

  const trustBadges = (hero.trust_badges || []).map((b: string) => `
    <span style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,0.1);border-radius:20px;padding:6px 14px;font-size:13px;color:rgba(255,255,255,0.8)">
      ✓ ${b}
    </span>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${site.businessName} | Mortgage Loan Officer${site.city ? ` in ${site.city}` : ""}</title>
<meta name="description" content="${hero.subheadline || `Trusted mortgage loan officer in ${site.city || "your area"}. Get pre-approved today.`}">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:${c.bg};color:${c.text};line-height:1.6}
  a{color:inherit;text-decoration:none}
  .container{max-width:1200px;margin:0 auto;padding:0 24px}
  .btn-primary{display:inline-block;background:${c.accent};color:white;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer;border:none;transition:opacity 0.2s}
  .btn-primary:hover{opacity:0.9}
  .btn-outline{display:inline-block;border:2px solid rgba(255,255,255,0.3);color:${c.text};padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;cursor:pointer;background:transparent;transition:border-color 0.2s}
  .btn-outline:hover{border-color:rgba(255,255,255,0.6)}
  nav{position:sticky;top:0;z-index:100;background:rgba(${c.primary === "#0f172a" ? "15,23,42" : "17,24,39"},0.95);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,0.08);padding:16px 0}
  .nav-inner{display:flex;align-items:center;justify-content:space-between}
  .logo{font-size:20px;font-weight:800;color:${c.text}}
  .logo span{color:${c.accent}}
  .nav-links{display:flex;gap:32px;align-items:center}
  .nav-links a{color:rgba(255,255,255,0.7);font-size:15px;transition:color 0.2s}
  .nav-links a:hover{color:${c.text}}
  section{padding:80px 0}
  .section-label{color:${c.accent};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px}
  .section-title{font-size:clamp(28px,4vw,42px);font-weight:800;line-height:1.2;margin-bottom:16px}
  .section-sub{color:rgba(255,255,255,0.6);font-size:17px;max-width:560px}
  .grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}
  .grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}
  .badge{display:inline-block;background:rgba(255,255,255,0.1);border-radius:4px;padding:4px 12px;font-size:12px;font-weight:600;color:${c.accent};text-transform:uppercase;letter-spacing:1px}
  @media(max-width:768px){.nav-links{display:none}.grid-3,.grid-2{grid-template-columns:1fr}}
</style>
</head>
<body>

<!-- Navigation -->
<nav>
  <div class="container">
    <div class="nav-inner">
      <div class="logo">${site.businessName.split(" ").map((w: string, i: number) => i === 0 ? `<span>${w}</span>` : ` ${w}`).join("")}</div>
      <div class="nav-links">
        <a href="#services">Services</a>
        <a href="#about">About</a>
        <a href="#testimonials">Reviews</a>
        <a href="#faq">FAQ</a>
        <a href="#contact" class="btn-primary" style="padding:10px 20px;font-size:14px">Get Pre-Approved</a>
      </div>
    </div>
  </div>
</nav>

<!-- Hero Section -->
<section style="padding:100px 0 80px;background:linear-gradient(135deg,${c.bg} 0%,${c.primary} 100%)">
  <div class="container">
    <div style="max-width:720px">
      <div class="badge" style="margin-bottom:20px">Trusted Mortgage Professional</div>
      <h1 style="font-size:clamp(36px,5vw,60px);font-weight:900;line-height:1.1;margin-bottom:20px">${hero.headline || `Get Your Dream Home Financed Fast in ${site.city || "Your Area"}`}</h1>
      <p style="font-size:18px;color:rgba(255,255,255,0.75);margin-bottom:32px;max-width:580px;line-height:1.7">${hero.subheadline || "Expert mortgage guidance with fast approvals and competitive rates. Let us make your homeownership dream a reality."}</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:40px">
        <a href="#contact" class="btn-primary">${hero.cta_primary || "Get Pre-Approved Today"}</a>
        <a href="#about" class="btn-outline">${hero.cta_secondary || "Learn More"}</a>
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">${trustBadges}</div>
    </div>
  </div>
</section>

<!-- Services Section -->
<section id="services" style="background:${c.primary}">
  <div class="container">
    <div class="section-label">What We Offer</div>
    <h2 class="section-title">Loan Solutions for Every Situation</h2>
    <p class="section-sub" style="margin-bottom:48px">From first-time buyers to seasoned investors, we have the right mortgage product for you.</p>
    <div class="grid-3">${servicesHtml}</div>
  </div>
</section>

<!-- About Section -->
<section id="about" style="background:${c.bg}">
  <div class="container">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center">
      <div>
        <div class="section-label">About</div>
        <h2 class="section-title">${about.headline || `Why Choose ${site.ownerName || site.businessName}`}</h2>
        <p style="color:rgba(255,255,255,0.7);font-size:16px;line-height:1.8;margin-bottom:32px">${about.bio || `With ${site.yearsExperience || 10}+ years of experience helping families achieve homeownership in ${site.city || "the area"}, we provide personalized mortgage solutions tailored to your unique situation.`}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">${statsHtml}</div>
        ${site.licenseNumber ? `<p style="color:rgba(255,255,255,0.4);font-size:13px">NMLS License: ${site.licenseNumber}</p>` : ""}
      </div>
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:40px;text-align:center">
        <div style="width:100px;height:100px;background:${c.accent};border-radius:50%;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:white">${(site.ownerName || site.businessName).charAt(0)}</div>
        <h3 style="font-size:22px;font-weight:700;margin-bottom:8px">${site.ownerName || site.businessName}</h3>
        <p style="color:${c.accent};font-size:14px;font-weight:600;margin-bottom:16px">Licensed Mortgage Professional</p>
        ${site.phone ? `<p style="color:rgba(255,255,255,0.7);margin-bottom:8px">📞 ${site.phone}</p>` : ""}
        ${site.email ? `<p style="color:rgba(255,255,255,0.7);margin-bottom:16px">✉ ${site.email}</p>` : ""}
        <a href="#contact" class="btn-primary" style="width:100%;text-align:center;display:block">Schedule a Free Consultation</a>
      </div>
    </div>
  </div>
</section>

<!-- Testimonials Section -->
<section id="testimonials" style="background:${c.primary}">
  <div class="container">
    <div style="text-align:center;margin-bottom:48px">
      <div class="section-label">Client Reviews</div>
      <h2 class="section-title">Real Stories from Real Homeowners</h2>
      <div style="color:${c.accent};font-size:24px;margin-top:8px">★★★★★ <span style="color:rgba(255,255,255,0.6);font-size:16px">5.0 Average Rating</span></div>
    </div>
    <div class="grid-2">${testimonialsHtml}</div>
  </div>
</section>

<!-- FAQ Section -->
<section id="faq" style="background:${c.bg}">
  <div class="container">
    <div style="max-width:720px;margin:0 auto">
      <div class="section-label" style="text-align:center">FAQ</div>
      <h2 class="section-title" style="text-align:center">Common Questions</h2>
      <div style="margin-top:40px">${faqHtml}</div>
    </div>
  </div>
</section>

<!-- CTA Section -->
<section id="contact" style="background:linear-gradient(135deg,${c.accent} 0%,${c.primary} 100%);padding:80px 0">
  <div class="container" style="text-align:center">
    <h2 style="font-size:clamp(28px,4vw,48px);font-weight:900;margin-bottom:16px">${cta.headline || "Ready to Get Pre-Approved?"}</h2>
    <p style="font-size:18px;color:rgba(255,255,255,0.85);margin-bottom:40px;max-width:520px;margin-left:auto;margin-right:auto">${cta.subheadline || "Take the first step toward homeownership today. No obligation, no pressure."}</p>
    <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
      <a href="tel:${site.phone || ""}" class="btn-primary" style="background:white;color:${c.primary}">${cta.button_text || "Apply Now — It's Free"}</a>
      ${site.phone ? `<a href="tel:${site.phone}" class="btn-outline">${cta.phone_cta || "Call Us Today"}: ${site.phone}</a>` : ""}
    </div>
  </div>
</section>

<!-- Footer -->
<footer style="background:${c.primary};border-top:1px solid rgba(255,255,255,0.08);padding:40px 0">
  <div class="container">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
      <div>
        <div class="logo" style="margin-bottom:8px">${site.businessName}</div>
        ${site.city ? `<p style="color:rgba(255,255,255,0.4);font-size:13px">${site.city}${site.state ? `, ${site.state}` : ""}</p>` : ""}
        ${site.licenseNumber ? `<p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:4px">NMLS #${site.licenseNumber}</p>` : ""}
      </div>
      <div style="color:rgba(255,255,255,0.4);font-size:13px;text-align:right">
        <p>© ${new Date().getFullYear()} ${site.businessName}. All rights reserved.</p>
        <p style="margin-top:4px">Equal Housing Lender</p>
      </div>
    </div>
  </div>
</footer>

</body>
</html>`;
}
