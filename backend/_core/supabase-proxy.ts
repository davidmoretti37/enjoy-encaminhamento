import { Router, type Request, type Response } from "express";
import { ipv4Fetch } from "../lib/ipv4-fetch";
import { ENV } from "./env";

export const supabaseProxyRouter = Router();

const SKIP_RESPONSE_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "content-encoding",
  "content-length",
]);

supabaseProxyRouter.all("/api/supabase-proxy/*", async (req: Request, res: Response) => {
  try {
    const supabasePath = (req.params as any)[0];
    const targetUrl = new URL(supabasePath, ENV.supabaseUrl);
    targetUrl.search = new URLSearchParams(req.query as Record<string, string>).toString();

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      const lk = key.toLowerCase();
      if (lk === "host" || lk === "connection" || lk === "keep-alive") continue;
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
    }
    // Tell Supabase not to compress so we get raw bytes to forward
    headers.set("accept-encoding", "identity");

    const hasBody = !["GET", "HEAD"].includes(req.method);
    let body: any = undefined;
    if (hasBody) {
      body = Buffer.isBuffer(req.body)
        ? req.body
        : typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body);
    }

    const response = await ipv4Fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  } catch (err: any) {
    console.error("[Supabase Proxy] Error:", err.message);
    res.status(502).json({ error: "Supabase proxy error", message: err.message });
  }
});
