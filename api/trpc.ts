import type { VercelRequest, VercelResponse } from "@vercel/node";

// Dynamically import the pre-bundled handler to avoid ESM resolution issues.
// The actual source is in backend/api-handler.ts, bundled by esbuild during
// the build step into api/trpc.mjs.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { default: bundledHandler } = await import("./trpc.mjs");
  return bundledHandler(req, res);
}
