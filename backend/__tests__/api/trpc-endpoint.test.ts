/**
 * tRPC API Endpoint Tests
 *
 * Tests the actual HTTP layer of the tRPC API handler.
 * Uses native fetch against a real Express server instance.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { createServer, type Server } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import superjson from "superjson";
import { appRouter } from "../../routers";
import { createContext } from "../../_core/context";

let server: Server;
let baseUrl: string;

/**
 * Encode input using superjson (matching the transformer configured in trpc.ts).
 * For GET requests, tRPC expects the input as a JSON-encoded query param
 * where the value is the superjson-serialized object.
 */
function encodeInput(data: unknown): string {
  return JSON.stringify(superjson.serialize(data));
}

/**
 * Spin up a lightweight Express server with the real appRouter
 * on a random available port.
 */
beforeAll(async () => {
  const app = express();
  app.use(express.json());

  // CORS headers (mirrors api-handler.ts)
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    if (_req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  await new Promise<void>((resolve) => {
    server = createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server?.close((err) => (err ? reject(err) : resolve()));
  });
});

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("tRPC API endpoint", () => {
  it("responds to system.health with tRPC-shaped JSON", async () => {
    // system.health expects { timestamp: number } — superjson-encoded
    const input = encodeInput({ timestamp: Date.now() });
    const url = `${baseUrl}/api/trpc/system.health?input=${encodeURIComponent(input)}`;

    const res = await fetch(url);
    expect(res.status).toBe(200);

    const body = await res.json();

    // tRPC wraps responses in { result: { data: ... } }
    expect(body).toHaveProperty("result");
    expect(body.result).toHaveProperty("data");

    // The health endpoint returns { ok: true } — superjson-encoded as { json: { ok: true } }
    expect(body.result.data).toHaveProperty("json");
    expect(body.result.data.json).toEqual({ ok: true });
  });

  it("returns tRPC error when system.health input is invalid", async () => {
    // Send empty object — missing required timestamp field
    // Still need superjson encoding: { json: {} }
    const input = encodeInput({});
    const url = `${baseUrl}/api/trpc/system.health?input=${encodeURIComponent(input)}`;

    const res = await fetch(url);
    expect(res.status).toBe(400);

    const body = await res.json();
    // tRPC with superjson wraps errors: { error: { json: { message, code, data: { code } } } }
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("json");
    expect(body.error.json.data).toHaveProperty("code", "BAD_REQUEST");
  });

  it("sets CORS headers on responses", async () => {
    const input = encodeInput({ timestamp: Date.now() });
    const url = `${baseUrl}/api/trpc/system.health?input=${encodeURIComponent(input)}`;

    const res = await fetch(url);

    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });

  it("responds 200 to CORS preflight OPTIONS request", async () => {
    const res = await fetch(`${baseUrl}/api/trpc/system.health`, {
      method: "OPTIONS",
    });
    expect(res.status).toBe(200);
  });

  it("returns UNAUTHORIZED for auth.createProfile without a token", async () => {
    // createProfile is a protectedProcedure — requires auth
    // For mutations, tRPC expects POST with superjson body
    const url = `${baseUrl}/api/trpc/auth.createProfile`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(superjson.serialize({ name: "Test" })),
    });

    // tRPC returns 401 for UNAUTHORIZED errors
    expect(res.status).toBe(401);

    const body = await res.json();
    // tRPC with superjson wraps errors: { error: { json: { data: { code } } } }
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("json");
    expect(body.error.json.data).toHaveProperty("code", "UNAUTHORIZED");
  });

  it("returns 404-like error for non-existent procedures", async () => {
    const url = `${baseUrl}/api/trpc/nonExistent.procedure`;

    const res = await fetch(url);

    // tRPC returns 404 for unknown procedures
    expect(res.status).toBe(404);
  });

  it("auth.me returns null for unauthenticated requests (public procedure)", async () => {
    const url = `${baseUrl}/api/trpc/auth.me`;

    const res = await fetch(url);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("result");
    // auth.me returns ctx.user which is null when unauthenticated
    expect(body.result.data.json).toBeNull();
  });
});
