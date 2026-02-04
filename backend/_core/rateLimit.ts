/**
 * Rate Limiting Module
 *
 * Provides both Express middleware and tRPC procedure-level rate limiting.
 * Uses in-memory storage suitable for single-server deployments.
 */

import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { TRPCError } from "@trpc/server";

// ============================================================
// Express Middleware Rate Limiters
// ============================================================

/**
 * Global rate limiter for all requests
 * 1000 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  // Use default key generator which handles IPv6 properly
  validate: { xForwardedForHeader: false },
});

/**
 * Stricter rate limiter for authentication endpoints
 * 20 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

// ============================================================
// tRPC Rate Limiting
// ============================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Rate limit configurations for specific operations
 */
export const RATE_LIMIT_CONFIG: Record<string, RateLimitConfig> = {
  // High-risk: email sending (prevents spam)
  "outreach.sendEmail": { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // 50/hour

  // Account creation (prevents abuse)
  "auth.createProfile": { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // 5/hour

  // Application submission (prevents spam)
  "application.create": { windowMs: 60 * 60 * 1000, maxRequests: 20 }, // 20/hour

  // Job posting (reasonable limit)
  "job.create": { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10/hour

  // AI matching (expensive operation)
  "job.runMatching": { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10/hour

  // Default for mutations
  "default.mutation": { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100/15min

  // Default for queries (more lenient)
  "default.query": { windowMs: 15 * 60 * 1000, maxRequests: 500 }, // 500/15min

  // Public booking/meeting endpoints
  "outreach.getAvailableSlots": { windowMs: 15 * 60 * 1000, maxRequests: 60 }, // 60/15min
  "outreach.createBooking": { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10/hour
  "outreach.getMeetingByToken": { windowMs: 15 * 60 * 1000, maxRequests: 30 }, // 30/15min
  "outreach.cancelMeetingByToken": { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10/hour
  "outreach.confirmMeetingByToken": { windowMs: 60 * 60 * 1000, maxRequests: 10 }, // 10/hour
};

// In-memory rate limit store
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    rateLimitStore.forEach((entry, key) => {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    });
  },
  5 * 60 * 1000
);

/**
 * Check rate limit for a specific operation
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  operation: string,
  config?: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const effectiveConfig =
    config || RATE_LIMIT_CONFIG[operation] || RATE_LIMIT_CONFIG["default.mutation"];

  const key = `${identifier}:${operation}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create new entry or reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + effectiveConfig.windowMs,
    };
  }

  entry.count++;
  rateLimitStore.set(key, entry);

  const remaining = Math.max(0, effectiveConfig.maxRequests - entry.count);
  const allowed = entry.count <= effectiveConfig.maxRequests;

  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Create a tRPC middleware for rate limiting
 * Use this to create rate-limited procedure variants
 */
export function createRateLimitMiddleware(operation: string, config?: RateLimitConfig) {
  return async <T extends { ctx: { user?: { id: string } | null; req: Request }; next: () => Promise<unknown> }>({
    ctx,
    next,
  }: T) => {
    const identifier = ctx.user?.id || ctx.req.ip || "anonymous";
    const result = checkRateLimit(identifier, operation, config);

    if (!result.allowed) {
      const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
      });
    }

    return next();
  };
}
