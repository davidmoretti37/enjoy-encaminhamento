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
  schoolContextRouter,
  companyRouter,
  schoolRouter,
  candidateRouter,
  jobRouter,
  applicationRouter,
  contractRouter,
  invitationRouter,
  affiliateRouter,
  adminRouter,
  agentsRouter,
  batchRouter,
} from "./routers/index";

// Assemble the main application router
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  dashboard: dashboardRouter,
  notification: notificationRouter,
  outreach: outreachRouter,
  schoolContext: schoolContextRouter,
  company: companyRouter,
  school: schoolRouter,
  candidate: candidateRouter,
  job: jobRouter,
  application: applicationRouter,
  contract: contractRouter,
  invitation: invitationRouter,
  affiliate: affiliateRouter,
  admin: adminRouter,
  agents: agentsRouter,
  batch: batchRouter,
});

export type AppRouter = typeof appRouter;
