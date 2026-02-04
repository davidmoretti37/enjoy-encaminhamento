// @ts-nocheck
// Agency context router for admin agency switching
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import * as db from "../db";

export const agencyContextRouter = router({
  // Get current agency context
  getCurrent: adminProcedure.query(async ({ ctx }) => {
    const agencyId = await db.getAdminAgencyContext(ctx.user.id);
    if (agencyId) {
      const agency = await db.getAgencyById(agencyId);
      return agency ? { id: agency.id, name: agency.agency_name, city: agency.city } : null;
    }
    return null;
  }),

  // Set current agency context
  setCurrent: adminProcedure
    .input(z.object({
      agencyId: z.string().uuid().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.agencyId !== null) {
        const agency = await db.getAgencyById(input.agencyId);
        if (!agency) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Agência não encontrada',
          });
        }
      }

      await db.setAdminAgencyContext(ctx.user.id, input.agencyId);
      return { success: true };
    }),

  // Get all available agencies for this admin
  getAvailable: adminProcedure.query(async ({ ctx }) => {
    return await db.getAgenciesForAdmin(ctx.user.id, ctx.user.role);
  }),
});
