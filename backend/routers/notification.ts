// Notification router - notification endpoints
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

export const notificationRouter = router({
  // Get user notifications
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await db.getNotificationsByUserId(ctx.user.id);
  }),

  // Get unread count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUnreadNotificationsCount(ctx.user.id);
  }),

  // Mark as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.markNotificationAsRead(input.id);
      return { success: true };
    }),

  // Mark all as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markAllNotificationsAsRead(ctx.user.id);
    return { success: true };
  }),
});
