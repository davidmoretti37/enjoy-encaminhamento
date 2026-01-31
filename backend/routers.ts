// @ts-nocheck
/**
 * Main Router Configuration
 *
 * This file assembles all the individual routers into the main appRouter.
 * Each router is defined in its own module under ./routers/
 */
import { router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";

// Import all routers from modular structure
import {
  authRouter,
  dashboardRouter,
  notificationRouter,
  outreachRouter,
  agencyContextRouter,
  companyRouter,
  agencyRouter,
  candidateRouter,
  jobRouter,
  applicationRouter,
  contractRouter,
  invitationRouter,
  affiliateRouter,
  adminRouter,
  batchRouter,
  matchingRouter,
  companyInvitationRouter,
} from "./routers/index";

// Assemble the main application router
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  dashboard: dashboardRouter,
  notification: notificationRouter,
  outreach: outreachRouter,
  agencyContext: agencyContextRouter,
  agency: agencyRouter,
  company: companyRouter,
  candidate: candidateRouter,
  job: jobRouter,
  application: applicationRouter,
  contract: contractRouter,
  invitation: invitationRouter,
  affiliate: affiliateRouter,
  admin: adminRouter,
  batch: batchRouter,
  matching: matchingRouter,
  companyInvitation: companyInvitationRouter,
});

export type AppRouter = typeof appRouter;
