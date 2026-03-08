import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";

export const clientsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { getClientsByUser } = await import("../seo-db");
    return getClientsByUser(ctx.user.id);
  }),
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const { getClientById } = await import("../seo-db");
      return getClientById(input.id);
    }),
});
