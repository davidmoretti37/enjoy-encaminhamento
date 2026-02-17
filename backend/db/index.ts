// @ts-nocheck
/**
 * Database Module Index
 *
 * Re-exports all database operations from their respective modules.
 * This allows gradual migration from the monolithic db.ts file.
 *
 * Usage:
 *   import { createCandidate, getAllJobs } from "./db";
 *   // or
 *   import { createCandidate } from "./db/candidates";
 */

// Types
export * from "./types";

// User operations
export * from "./users";

// Company operations
export * from "./companies";

// Candidate operations
export * from "./candidates";

// Job operations
export * from "./jobs";

// Application operations
export * from "./applications";

// Contract operations
export * from "./contracts";

// Payment operations
export * from "./payments";

// Notification operations
export * from "./notifications";

// Analytics operations
export * from "./analytics";

// Agency operations
export * from "./agencies";

// Affiliate operations
export * from "./affiliates";

// Scheduling operations
export * from "./scheduling";

// Batch operations (candidate pre-selection)
export * from "./batches";

// Company invitation operations
export * from "./companyInvitations";

// Document template and signing operations
export * from "./documents";

// Interview scheduling operations
export * from "./interviews";

// Hiring process operations
export * from "./hiring";
