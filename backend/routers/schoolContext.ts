// @ts-nocheck
// School context router for admin school switching
import { z } from "zod";
import { router } from "../_core/trpc";
import { adminProcedure } from "./procedures";
import * as db from "../db";

export const schoolContextRouter = router({
  // Get current school context
  getCurrent: adminProcedure.query(async ({ ctx }) => {
    const schoolId = await db.getAdminSchoolContext(ctx.user.id);
    if (schoolId) {
      const school = await db.getSchoolById(schoolId);
      return school ? { id: school.id, name: school.school_name, city: school.city } : null;
    }
    return null;
  }),

  // Set current school context
  setCurrent: adminProcedure
    .input(z.object({
      schoolId: z.string().uuid().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.setAdminSchoolContext(ctx.user.id, input.schoolId);
      return { success: true };
    }),

  // Get all available schools for this admin
  getAvailable: adminProcedure.query(async ({ ctx }) => {
    return await db.getSchoolsForAdmin(ctx.user.id, ctx.user.role);
  }),
});
