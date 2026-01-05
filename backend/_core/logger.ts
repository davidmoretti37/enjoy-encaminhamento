/**
 * Centralized Logging & Error Tracking
 *
 * This module provides structured logging with severity levels.
 * In production, this can be extended to integrate with external services
 * like Sentry, Datadog, or CloudWatch.
 */

import { ENV } from "./env";
import type { Request, Response, NextFunction } from "express";

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Minimum log level based on environment
const MIN_LOG_LEVEL = ENV.isProduction ? "info" : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatLogEntry(entry: LogEntry): string {
  if (ENV.isProduction) {
    // JSON format for production (easier to parse by log aggregators)
    return JSON.stringify(entry);
  }
  // Human-readable format for development
  const timestamp = entry.timestamp.split("T")[1].split(".")[0];
  const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
  let message = `${prefix} ${entry.message}`;
  if (entry.context && Object.keys(entry.context).length > 0) {
    message += ` ${JSON.stringify(entry.context)}`;
  }
  if (entry.error) {
    message += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
    if (entry.error.stack && !ENV.isProduction) {
      message += `\n${entry.error.stack}`;
    }
  }
  return message;
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return;

  const entry = createLogEntry(level, message, context, error);
  const formatted = formatLogEntry(entry);

  switch (level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

/**
 * Logger interface for structured logging
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext, error?: Error) =>
    log("error", message, context, error),
};

/**
 * Capture and track an error
 * In production, this would send to Sentry/similar service
 */
export function captureError(error: Error, context?: LogContext): void {
  logger.error(error.message, context, error);

  // TODO: In production, send to error tracking service
  // if (ENV.isProduction && sentryDsn) {
  //   Sentry.captureException(error, { extra: context });
  // }
}

/**
 * Create a scoped logger with a prefix
 */
export function createScopedLogger(scope: string) {
  return {
    debug: (message: string, context?: LogContext) =>
      logger.debug(`[${scope}] ${message}`, context),
    info: (message: string, context?: LogContext) =>
      logger.info(`[${scope}] ${message}`, context),
    warn: (message: string, context?: LogContext) =>
      logger.warn(`[${scope}] ${message}`, context),
    error: (message: string, context?: LogContext, error?: Error) =>
      logger.error(`[${scope}] ${message}`, context, error),
  };
}

/**
 * Express error handler middleware
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  captureError(err, { path: _req.path, method: _req.method });

  res.status(500).json({
    error: ENV.isProduction ? "Internal server error" : err.message,
  });
}
