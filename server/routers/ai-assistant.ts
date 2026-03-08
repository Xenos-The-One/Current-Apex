import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import {
  getClientByUserId,
  getLeadsByClientId,
  getDb,
} from "../db";
import { contentApprovals, appointments, leads } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const aiAssistantRouter = router({
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ),
        context: z.enum(["dashboard", "leads", "appointments", "content", "general"]).default("general"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const isAdmin = ctx.user.role === "admin";
      let contextData = "";

      if (isAdmin) {
        // Admin context: aggregate stats
        const [leadCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(leads);
        const [apptCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(appointments);
        const [pendingCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(contentApprovals)
          .where(eq(contentApprovals.status, "pending"));

        contextData = `
Admin Context:
- Total leads across all clients: ${leadCount?.count ?? 0}
- Total appointments: ${apptCount?.count ?? 0}
- Pending content approvals: ${pendingCount?.count ?? 0}
- User role: Agency Admin
`;
      } else {
        // Client context
        const client = await getClientByUserId(ctx.user.id);
        if (client) {
          const clientLeads = await getLeadsByClientId(client.id);
          const newLeads = clientLeads.filter((l) => l.status === "new").length;
          const contacted = clientLeads.filter((l) => l.status === "contacted").length;
          const qualified = clientLeads.filter((l) => l.status === "qualified").length;
          const apptSet = clientLeads.filter((l) => l.status === "appointment_set").length;
          const closedWon = clientLeads.filter((l) => l.status === "closed_won").length;

          const [pendingCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(contentApprovals)
            .where(
              and(
                eq(contentApprovals.clientId, client.id),
                eq(contentApprovals.status, "pending")
              )
            );

          contextData = `
Client Context:
- Client: ${client.name} (${client.businessType})
- Plan: ${client.subscriptionTier}
- Total leads: ${clientLeads.length}
- New leads: ${newLeads}
- Contacted: ${contacted}
- Qualified: ${qualified}
- Appointments set: ${apptSet}
- Closed won: ${closedWon}
- Pending content approvals: ${pendingCount?.count ?? 0}
`;
        }
      }

      const systemPrompt = `You are the AI Assistant for Sterling Marketing's CRM platform. You help ${isAdmin ? "agency administrators" : "clients"} manage their lead pipeline, appointments, content, and marketing campaigns.

${contextData}

Current page context: ${input.context}

Guidelines:
- Be concise and actionable. Keep responses under 150 words unless the user asks for detail.
- Reference the user's actual data when answering questions about their pipeline.
- For leads questions, suggest specific next steps (call, email, text).
- For content questions, remind them about the approval flow.
- For appointment questions, suggest follow-up actions.
- If asked about features, explain what the CRM can do.
- Use a professional but friendly tone.
- When suggesting actions, reference specific pages they can navigate to (e.g., "Go to Leads", "Check Content Approvals").
- Never make up data. If you don't have specific information, say so.`;

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...input.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await invokeLLM({ messages: llmMessages });
      const assistantMessage =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "I'm sorry, I couldn't generate a response. Please try again.";

      return { content: assistantMessage };
    }),
});
