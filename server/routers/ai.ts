import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import {
  getClientByUserId,
  createAiScript,
  getAiScriptsByClientId,
  getAiScriptById,
  updateAiScript,
} from "../db";

export const aiRouter = router({
  // ============= SCRIPT GENERATION =============
  
  generateScript: protectedProcedure
    .input(z.object({
      scriptType: z.enum(["email", "sms", "social", "voice", "youtube"]),
      prompt: z.string(),
      context: z.object({
        businessType: z.enum(["loan_officer", "real_estate"]).optional(),
        targetAudience: z.string().optional(),
        tone: z.enum(["professional", "friendly", "casual", "urgent"]).optional(),
        length: z.enum(["short", "medium", "long"]).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await getClientByUserId(ctx.user.id);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      // Check access mode
      if (client.accessMode !== "full") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: client.accessMode === "limited" 
            ? "Limited access mode. Please complete your strategy call to unlock full access."
            : "Read-only access. Contact your agency administrator.",
        });
      }

      // Build system prompt based on script type
      let systemPrompt = "";
      
      switch (input.scriptType) {
        case "voice":
          systemPrompt = `You are an expert AI voice script writer for ${input.context?.businessType || "sales"} professionals. Create a natural, conversational script for an AI voice assistant that will call leads. The script should:
- Be warm and professional
- Ask qualifying questions
- Handle objections gracefully
- Guide toward booking an appointment
- Sound natural when spoken aloud
- Include pauses and natural speech patterns
${input.context?.tone ? `Tone: ${input.context.tone}` : ""}`;
          break;
          
        case "email":
          systemPrompt = `You are an expert email copywriter for ${input.context?.businessType || "sales"} professionals. Create a compelling email that:
- Has an attention-grabbing subject line
- Opens with a personalized hook
- Provides clear value proposition
- Includes a strong call-to-action
- Is optimized for mobile reading
${input.context?.tone ? `Tone: ${input.context.tone}` : ""}
${input.context?.length ? `Length: ${input.context.length}` : ""}`;
          break;
          
        case "sms":
          systemPrompt = `You are an expert SMS copywriter for ${input.context?.businessType || "sales"} professionals. Create a concise, impactful text message that:
- Is under 160 characters if possible
- Gets straight to the point
- Includes a clear call-to-action
- Uses conversational language
- Respects the personal nature of SMS
${input.context?.tone ? `Tone: ${input.context.tone}` : ""}`;
          break;
          
        case "social":
          systemPrompt = `You are an expert social media content creator for ${input.context?.businessType || "sales"} professionals. Create engaging social media content that:
- Captures attention in the first line
- Provides value or entertainment
- Includes relevant hashtags
- Encourages engagement (likes, comments, shares)
- Is platform-appropriate (Facebook, Instagram, LinkedIn)
${input.context?.tone ? `Tone: ${input.context.tone}` : ""}
${input.context?.length ? `Length: ${input.context.length}` : ""}`;
          break;
          
        case "youtube":
          systemPrompt = `You are an expert YouTube script writer for ${input.context?.businessType || "sales"} professionals. Create a video script that:
- Has a hook in the first 10 seconds
- Provides valuable, actionable content
- Includes timestamps for key sections
- Has a strong call-to-action at the end
- Is engaging and keeps viewers watching
${input.context?.tone ? `Tone: ${input.context.tone}` : ""}
${input.context?.length ? `Length: ${input.context.length}` : ""}`;
          break;
      }

      // Generate content using LLM
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.prompt },
        ],
      });

      const messageContent = response.choices[0]?.message?.content;
      const generatedContent = typeof messageContent === 'string' ? messageContent : "";

      if (!generatedContent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate content",
        });
      }

      // Save to database
      await createAiScript({
        clientId: client.id,
        agencyId: client.agencyId,
        scriptType: input.scriptType,
        prompt: input.prompt,
        generatedContent,
        createdBy: ctx.user.id,
      });

      return {
        content: generatedContent,
      };
    }),

  listScripts: protectedProcedure.query(async ({ ctx }) => {
    const client = await getClientByUserId(ctx.user.id);
    if (!client) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Client profile not found",
      });
    }

    return await getAiScriptsByClientId(client.id);
  }),

  getScript: protectedProcedure
    .input(z.object({ scriptId: z.number() }))
    .query(async ({ ctx, input }) => {
      const client = await getClientByUserId(ctx.user.id);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      const script = await getAiScriptById(input.scriptId);
      if (!script || script.clientId !== client.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Script not found",
        });
      }

      return script;
    }),

  markAsUsed: protectedProcedure
    .input(z.object({ scriptId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const client = await getClientByUserId(ctx.user.id);
      if (!client) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client profile not found",
        });
      }

      const script = await getAiScriptById(input.scriptId);
      if (!script || script.clientId !== client.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Script not found",
        });
      }

      await updateAiScript(input.scriptId, { isUsed: true });
      return { success: true };
    }),
});
