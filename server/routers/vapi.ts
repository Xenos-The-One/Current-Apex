import z from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createVapiAssistant,
  getVapiAssistant,
  updateVapiAssistant,
  deleteVapiAssistant,
  makeVapiCall,
  getVapiCall,
  listVapiCalls,
  testVapiConnection,
} from "../vapi";
import { createLeadActivity } from "../db";
import { getConfiguredAssistants, validateAssistantConfiguration } from "../vapi-assistant-mapper";

export const vapiRouter = router({
  // ============= CONNECTION TEST =============

  testConnection: protectedProcedure
    .query(async () => {
      const result = await testVapiConnection();
      const assistants = getConfiguredAssistants();
      const validation = validateAssistantConfiguration();
      return {
        connected: result.success,
        error: result.success ? undefined : result.error,
        assistants,
        allAssistantsConfigured: validation.valid,
        missingAssistants: validation.missing,
      };
    }),

  // ============= ASSISTANT MANAGEMENT =============
  
  createAssistant: protectedProcedure
    .input(z.object({
      name: z.string(),
      firstMessage: z.string().optional(),
      systemPrompt: z.string().optional(),
      voice: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const assistant = await createVapiAssistant(input);
        return assistant;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create assistant",
        });
      }
    }),

  getAssistant: protectedProcedure
    .input(z.object({ assistantId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getVapiAssistant(input.assistantId);
      } catch (error: any) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assistant not found",
        });
      }
    }),

  updateAssistant: protectedProcedure
    .input(z.object({
      assistantId: z.string(),
      name: z.string().optional(),
      firstMessage: z.string().optional(),
      systemPrompt: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { assistantId, ...updates } = input;
      try {
        return await updateVapiAssistant(assistantId, updates);
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update assistant",
        });
      }
    }),

  deleteAssistant: protectedProcedure
    .input(z.object({ assistantId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        await deleteVapiAssistant(input.assistantId);
        return { success: true };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete assistant",
        });
      }
    }),

  // ============= CALL MANAGEMENT =============

  makeCall: protectedProcedure
    .input(z.object({
      assistantId: z.string(),
      phoneNumber: z.string(),
      customerName: z.string().optional(),
      leadId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const call = await makeVapiCall({
          assistantId: input.assistantId,
          phoneNumber: input.phoneNumber,
          customerName: input.customerName,
        });

        // Log call activity if leadId is provided
        if (input.leadId) {
          await createLeadActivity({
            leadId: input.leadId,
            activityType: "call",
            description: `AI call initiated to ${input.phoneNumber}`,
            vapiCallId: call.id,
            performedBy: ctx.user.id,
          });
        }

        return call;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to initiate call",
        });
      }
    }),

  getCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await getVapiCall(input.callId);
      } catch (error: any) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Call not found",
        });
      }
    }),

  listCalls: protectedProcedure
    .input(z.object({
      assistantId: z.string().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      try {
        return await listVapiCalls(input);
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to list calls",
        });
      }
    }),
});
