// @ts-nocheck
/**
 * Router Modules Index
 *
 * Re-exports all routers and shared utilities.
 * This provides a modular structure for the API routes.
 *
 * Usage:
 *   import { authRouter, companyRouter } from "./routers";
 */

// Shared procedures and utilities
export * from "./procedures";
export * from "./email";

// Individual routers
export { authRouter } from "./auth";
export { dashboardRouter } from "./dashboard";
export { notificationRouter } from "./notification";
export { outreachRouter } from "./outreach";
export { schoolContextRouter } from "./schoolContext";
export { companyRouter } from "./company";
export { schoolRouter } from "./school";
export { candidateRouter } from "./candidate";
export { jobRouter } from "./job";
export { applicationRouter } from "./application";
export { contractRouter } from "./contract";
export { invitationRouter } from "./invitation";
export { affiliateRouter } from "./affiliate";
export { adminRouter } from "./admin";
export { agentsRouter } from "./agents";
export { batchRouter } from "./batch";
