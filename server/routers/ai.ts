import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { leads } from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";

type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

async function callLLM(messages: LLMMessage[], schema: Record<string, unknown>, schemaName: string) {
  const response = await invokeLLM({
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    },
  });
  const content = response.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned unexpected content" });
  return JSON.parse(content);
}

export const aiRouter = router({
  scoreLead: protectedProcedure
    .input(z.object({ leadId: z.number(), agencyId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      const parsed = await callLLM(
        [
          { role: "system", content: "You are a mortgage CRM lead scoring expert. Score leads from 0-100 based on their profile. Return JSON only." },
          { role: "user", content: `Score this lead and explain why:\n${JSON.stringify({ name: `${lead.firstName} ${lead.lastName}`, email: lead.email, phone: lead.phone, contactType: lead.contactType, status: lead.status, source: lead.source, loanAmount: lead.loanAmount, notes: lead.notes })}` },
        ],
        {
          type: "object",
          properties: {
            score: { type: "integer", description: "Score 0-100" },
            reasoning: { type: "string", description: "Why this score" },
            nextActions: { type: "array", items: { type: "string" }, description: "Recommended next actions" },
          },
          required: ["score", "reasoning", "nextActions"],
          additionalProperties: false,
        },
        "lead_score"
      );

      const score = Math.min(100, Math.max(0, parsed.score || 0));
      await db.update(leads).set({ score }).where(eq(leads.id, input.leadId));
      return { score, reasoning: parsed.reasoning as string, nextActions: parsed.nextActions as string[] };
    }),

  getRecommendations: protectedProcedure
    .input(z.object({ leadId: z.number(), agencyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [lead] = await db.select().from(leads).where(eq(leads.id, input.leadId)).limit(1);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });

      return callLLM(
        [
          { role: "system", content: "You are a mortgage CRM assistant. Analyze the lead and provide actionable recommendations. Return JSON only." },
          { role: "user", content: `Analyze this lead:\n${JSON.stringify({ name: `${lead.firstName} ${lead.lastName}`, contactType: lead.contactType, status: lead.status, pipelineStage: lead.pipelineStage, source: lead.source, score: lead.score, loanAmount: lead.loanAmount, notes: lead.notes })}` },
        ],
        {
          type: "object",
          properties: {
            priority: { type: "string" },
            summary: { type: "string" },
            nextActions: { type: "array", items: { type: "string" } },
            suggestedMessage: { type: "string" },
            riskFactors: { type: "array", items: { type: "string" } },
          },
          required: ["priority", "summary", "nextActions", "suggestedMessage", "riskFactors"],
          additionalProperties: false,
        },
        "recommendations"
      );
    }),

  generateEmailContent: protectedProcedure
    .input(z.object({
      purpose: z.string(),
      recipientName: z.string().optional(),
      senderName: z.string().optional(),
      context: z.string().optional(),
      tone: z.enum(["professional", "friendly", "urgent", "nurturing"]).default("professional"),
    }))
    .mutation(async ({ input }) => {
      return callLLM(
        [
          { role: "system", content: "You are an expert mortgage marketing copywriter. Generate compelling email content. Return JSON only." },
          { role: "user", content: `Generate an email for: ${input.purpose}. Recipient: ${input.recipientName || "the lead"}. Sender: ${input.senderName || "a loan officer"}. Context: ${input.context || "mortgage services"}. Tone: ${input.tone}.` },
        ],
        {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
            callToAction: { type: "string" },
          },
          required: ["subject", "body", "callToAction"],
          additionalProperties: false,
        },
        "email_content"
      );
    }),

  generateSmsContent: protectedProcedure
    .input(z.object({
      purpose: z.string(),
      recipientName: z.string().optional(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return callLLM(
        [
          { role: "system", content: "You are a mortgage marketing expert. Write concise, effective SMS messages under 160 characters. Return JSON only." },
          { role: "user", content: `Write an SMS for: ${input.purpose}. Recipient: ${input.recipientName || "the lead"}. Context: ${input.context || "mortgage services"}.` },
        ],
        {
          type: "object",
          properties: {
            message: { type: "string" },
            alternatives: { type: "array", items: { type: "string" } },
          },
          required: ["message", "alternatives"],
          additionalProperties: false,
        },
        "sms_content"
      );
    }),

  generateCallScript: protectedProcedure
    .input(z.object({
      purpose: z.enum(["cold_call", "follow_up", "appointment_booking", "re_engagement", "referral_request", "other"]),
      leadContext: z.string().optional(),
      agentName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return callLLM(
        [
          { role: "system", content: "You are an expert mortgage sales trainer. Generate a professional call script. Return JSON only." },
          { role: "user", content: `Generate a ${input.purpose} call script for loan officer ${input.agentName || "the agent"}. Lead context: ${input.leadContext || "prospective borrower"}.` },
        ],
        {
          type: "object",
          properties: {
            opening: { type: "string" },
            mainPoints: { type: "array", items: { type: "string" } },
            objectionHandlers: {
              type: "array",
              items: {
                type: "object",
                properties: { objection: { type: "string" }, response: { type: "string" } },
                required: ["objection", "response"],
                additionalProperties: false,
              },
            },
            closing: { type: "string" },
            fullScript: { type: "string" },
          },
          required: ["opening", "mainPoints", "objectionHandlers", "closing", "fullScript"],
          additionalProperties: false,
        },
        "call_script"
      );
    }),
});
