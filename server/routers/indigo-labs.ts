import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { createLead } from "../db";
import { sendEmail } from "../sendgrid";

export const indigoLabsRouter = router({
  /**
   * Capture lead from Indigo Labs landing page
   * Public endpoint - no auth required
   */
  captureLead: publicProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        source: z.string().default("indigo_labs_landing"),
      })
    )
    .mutation(async ({ input }) => {
      // Split name into first/last
      const nameParts = input.name.trim().split(" ");
      const firstName = nameParts[0] || input.name;
      const lastName = nameParts.slice(1).join(" ") || "";

      // Create lead in database
      // Note: Using agency_id = 1 (Indigo Labs) and client_id = 1 (default)
      // These should be created in the database first
      const lead = await createLead({
        agencyId: 1, // Indigo Labs agency
        clientId: 1, // Default client for Indigo Labs leads
        firstName,
        lastName,
        email: input.email,
        phone: input.phone || null,
        source: input.source,
        status: "new" as const,
        score: 50, // Initial score for landing page leads
        scoreTier: "warm" as const,
      });

      // Send blueprint email
      try {
        const emailResult = await sendEmail({
          to: [input.email],
          from: process.env.FROM_EMAIL || "noreply@lockinloans.com",
          subject: "Your AI Lead Conversion Blueprint is Ready! 🚀",
          html: getBlueprintEmailHTML(firstName),
        });
        
        if (emailResult.success) {
          console.log(`[Indigo Labs] Blueprint email sent to ${input.email}`);
        } else {
          console.error(`[Indigo Labs] Email failed: ${emailResult.error}`);
        }
      } catch (error) {
        console.error("[Indigo Labs] Failed to send blueprint email:", error);
        // Don't fail the mutation if email fails - lead is still captured
      }

      // TODO: Add to 7-day email nurture sequence
      // This would typically be done via a separate email automation service
      // or a scheduled job that checks for new leads

      return {
        success: true,
        leadId: lead.id,
        message: "Blueprint sent! Check your email.",
      };
    }),
});

/**
 * Email template for blueprint delivery
 */
function getBlueprintEmailHTML(firstName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AI Lead Conversion Blueprint</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">INDIGO LABS</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI-Powered Lead Management</p>
  </div>

  <div style="background: white; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    
    <h2 style="color: #1f2937; margin-top: 0;">Hey ${firstName}! 👋</h2>
    
    <p>Thanks for downloading the <strong>AI Lead Conversion Blueprint</strong>!</p>
    
    <p>This is the exact system Tim Haskins used to go from <strong>0 to 15 appointments per week</strong> in just 14 days.</p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
      <h3 style="margin-top: 0; color: #1f2937;">📥 Download Your Blueprint</h3>
      <p style="margin-bottom: 15px;">Click the button below to get instant access:</p>
      <a href="https://3000-i7e8hzo4jtluuzevbu61j-ae919bba.us1.manus.computer/blueprint.pdf" 
         style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Download Blueprint (PDF)
      </a>
    </div>

    <h3 style="color: #1f2937;">What's Inside:</h3>
    <ul style="padding-left: 20px;">
      <li>The exact AI voice script that converts 80% of leads</li>
      <li>Step-by-step CRM setup guide (no tech skills needed)</li>
      <li>30 days of social media content templates</li>
      <li>ROI calculator to project YOUR results</li>
      <li>7-day implementation checklist</li>
      <li>Tim's complete before/after case study</li>
    </ul>

    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0;">
      <p style="margin: 0;"><strong>⚡ Quick Win:</strong> Read pages 3-5 first. That's the AI voice script. You can implement it TODAY and start seeing results within 48 hours.</p>
    </div>

    <h3 style="color: #1f2937;">Want Us to Build This For You?</h3>
    <p>We're offering <strong>5 founding client spots</strong> with exclusive pricing starting at $297/month and a 30-day money-back guarantee.</p>
    
    <p><strong>The guarantee:</strong> 10+ qualified appointments in 30 days or full refund.</p>
    
    <a href="https://3000-i7e8hzo4jtluuzevbu61j-ae919bba.us1.manus.computer/book-demo" 
       style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
      Book Your Free Strategy Call
    </a>

    <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
      Questions? Just reply to this email.<br>
      I read every message personally.
    </p>

    <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
      Talk soon,<br>
      <strong>Tariq Haskins</strong><br>
      Founder, Indigo Labs AI<br>
      <a href="mailto:tariqhaskins@indigolabsai.com" style="color: #667eea;">tariqhaskins@indigolabsai.com</a>
    </p>

  </div>

  <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
    <p>© 2026 Indigo Labs AI. All rights reserved.</p>
    <p>
      <a href="#" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> | 
      <a href="#" style="color: #9ca3af; text-decoration: underline;">Update Preferences</a>
    </p>
  </div>

</body>
</html>
  `.trim();
}
