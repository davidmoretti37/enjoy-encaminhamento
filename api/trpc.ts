import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

let trpcHandler: any;
let initError: Error | null = null;

// Initialize handler lazily to catch initialization errors
try {
  const { appRouter } = require("../backend/routers");
  const { createContext } = require("../backend/_core/context");
  trpcHandler = createExpressMiddleware({
    router: appRouter,
    createContext,
  });
} catch (err: any) {
  initError = err;
  console.error("Failed to initialize tRPC handler:", err?.message, err?.stack);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // If initialization failed, return the error details
  if (initError || !trpcHandler) {
    console.error("tRPC init error:", initError?.message, initError?.stack);
    return res.status(500).json({
      error: "Server initialization failed",
      message: initError?.message || "Unknown error",
    });
  }

  // Adapt Vercel request/response to Express-like format
  // The tRPC Express middleware expects certain properties
  const expressReq = Object.assign(req, {
    cookies: parseCookies(req.headers.cookie || ""),
  });

  // Strip /api/trpc prefix so tRPC can resolve the procedure name
  expressReq.url = expressReq.url?.replace(/^\/api\/trpc/, '') || '/';

  return new Promise<void>((resolve, reject) => {
    trpcHandler(expressReq as any, res as any, (err: any) => {
      if (err) {
        console.error("tRPC handler error:", err);
        res.status(500).json({ error: "Internal server error" });
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.split("=");
    if (name) {
      cookies[name.trim()] = rest.join("=").trim();
    }
  });
  return cookies;
}
