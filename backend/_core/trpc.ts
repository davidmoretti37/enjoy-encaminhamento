import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { checkRateLimit, RATE_LIMIT_CONFIG, type RateLimitConfig } from "./rateLimit";
import { signContractsUrlsInResponse } from "../storage";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

// ============================================================
// Global storage-URL signing middleware
// ============================================================
// Runs on EVERY procedure (outermost, so it post-processes the already-
// authorized resolver output). Deep-walks the response and swaps any stored
// public "contracts" bucket URL for a short-lived signed URL. This is what makes
// the bucket safe to flip private: the URL a client receives is scoped to the
// exact data that procedure was allowed to return, so there is no "any logged-in
// user can guess a path" hole and no display site to migrate one-by-one.
// Fail-soft: a signing error logs and leaves the original value so a list
// endpoint never 500s over an image.
const signStorageUrls = t.middleware(async ({ next }) => {
  const result = await next();
  if (result.ok) {
    try {
      await signContractsUrlsInResponse((result as { data: unknown }).data);
    } catch (err) {
      console.error("[storage] failed to sign response URLs:", err);
    }
  }
  return result;
});

// The base every exported procedure builds on, so no procedure escapes signing.
const baseProcedure = t.procedure.use(signStorageUrls);

export const publicProcedure = baseProcedure;

// ============================================================
// Authentication Middleware
// ============================================================

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = baseProcedure.use(requireUser);

export const adminProcedure = baseProcedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    // Only admin/super_admin role has admin access
    if (!ctx.user || (ctx.user.role !== "admin" && ctx.user.role !== "super_admin")) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);

// ============================================================
// Rate Limiting Middleware
// ============================================================

/**
 * Create a rate limiting middleware for a specific operation
 */
const createRateLimitMiddleware = (operation: string, config?: RateLimitConfig) => {
  return t.middleware(async ({ ctx, next }) => {
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
  });
};

// ============================================================
// Rate-Limited Procedure Variants
// ============================================================

/**
 * Create a rate-limited public procedure
 * Use for operations that need rate limiting but don't require auth
 */
export const rateLimitedPublicProcedure = (operation: string, config?: RateLimitConfig) =>
  baseProcedure.use(createRateLimitMiddleware(operation, config));

/**
 * Create a rate-limited protected procedure
 * Use for authenticated operations that need rate limiting
 */
export const rateLimitedProtectedProcedure = (operation: string, config?: RateLimitConfig) =>
  baseProcedure.use(requireUser).use(createRateLimitMiddleware(operation, config));

// ============================================================
// Pre-configured Rate-Limited Procedures
// ============================================================

/**
 * Email sending procedure - strictly rate limited to prevent spam
 */
export const emailProcedure = protectedProcedure.use(
  createRateLimitMiddleware("outreach.sendEmail", RATE_LIMIT_CONFIG["outreach.sendEmail"])
);

/**
 * Application submission procedure - rate limited to prevent spam
 */
export const applicationProcedure = protectedProcedure.use(
  createRateLimitMiddleware("application.create", RATE_LIMIT_CONFIG["application.create"])
);

/**
 * Account creation procedure - rate limited to prevent abuse
 */
export const createProfileProcedure = publicProcedure.use(
  createRateLimitMiddleware("auth.createProfile", RATE_LIMIT_CONFIG["auth.createProfile"])
);

/**
 * AI matching procedure - rate limited due to expensive LLM calls
 */
export const matchingProcedure = protectedProcedure.use(
  createRateLimitMiddleware("job.runMatching", RATE_LIMIT_CONFIG["job.runMatching"])
);
