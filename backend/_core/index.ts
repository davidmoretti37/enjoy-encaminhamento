import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV, validateEnv } from "./env";
import { globalRateLimiter, authRateLimiter } from "./rateLimit";
import { logger, captureError } from "./logger";
import streamingRoutes from "../routes/streaming";

// Validate environment on startup
const envValidation = validateEnv();
if (!envValidation.valid) {
  logger.error("Environment validation failed", { errors: envValidation.errors });
  if (ENV.isProduction) {
    process.exit(1);
  }
}

// Global error handlers for uncaught exceptions
process.on("uncaughtException", (error) => {
  captureError(error, { type: "uncaughtException" });
  if (ENV.isProduction) {
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  captureError(error, { type: "unhandledRejection" });
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy for accurate IP detection (if behind reverse proxy)
  app.set("trust proxy", 1);

  // Global rate limiting
  app.use(globalRateLimiter);

  // Configure body parser with reasonable size limit (reduced from 50mb)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Stricter rate limiting for auth endpoints
  app.use("/api/trpc/auth", authRateLimiter);

  // Streaming chat routes (SSE)
  app.use("/api/chat", streamingRoutes);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (ENV.isDevelopment) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = ENV.port;
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch((error) => {
  captureError(error, { phase: "startup" });
  process.exit(1);
});
