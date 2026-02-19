import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

// Create a handler that wraps the tRPC middleware for Vercel
const trpcHandler = createExpressMiddleware({
  router: appRouter,
  createContext,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Adapt Vercel request/response to Express-like format
  // The tRPC Express middleware expects req.path (Express property not on VercelRequest)
  const url = req.url || '/';
  const pathname = url.split('?')[0];
  const strippedPath = pathname.replace(/^\/api\/trpc/, '') || '/';

  const expressReq = Object.assign(req, {
    cookies: parseCookies(req.headers.cookie || ""),
    path: strippedPath,
    url: strippedPath + (url.includes('?') ? '?' + url.split('?').slice(1).join('?') : ''),
  });

  return new Promise<void>((resolve, reject) => {
    trpcHandler(expressReq as any, res as any, (err) => {
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
