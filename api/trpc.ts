import type { VercelRequest, VercelResponse } from "@vercel/node";

// Dynamically import the pre-bundled handler to avoid ESM resolution issues.
// Source: backend/api-handler.ts → bundled to backend/_bundled.mjs by esbuild.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const mod = await import("../backend/_bundled.mjs");
  return mod.default(req, res);
}
