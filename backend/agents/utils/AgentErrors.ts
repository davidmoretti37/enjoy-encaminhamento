/**
 * Custom Error Types for Multi-Agent System
 *
 * Provides specific error types with:
 * - Retryable flag (should operation be retried?)
 * - Error codes for programmatic handling
 * - Context data for debugging
 */

export class AgentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentError';

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AgentError);
    }
  }
}

/**
 * Database operation errors
 * Always retryable (transient connection issues, deadlocks, etc.)
 */
export class DatabaseError extends AgentError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'DATABASE_ERROR', true, context);
    this.name = 'DatabaseError';
  }
}

/**
 * LLM/AI service errors
 * Retryable by default (rate limits, temporary outages)
 * Can be marked non-retryable for specific cases
 */
export class LLMError extends AgentError {
  constructor(
    message: string,
    retryable: boolean = true,
    context?: Record<string, unknown>
  ) {
    super(message, 'LLM_ERROR', retryable, context);
    this.name = 'LLMError';
  }
}

/**
 * Validation errors (bad input, schema mismatch)
 * Not retryable (retrying won't fix invalid data)
 */
export class ValidationError extends AgentError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', false, context);
    this.name = 'ValidationError';
  }
}

/**
 * Operation timeout errors
 * Not retryable at this level (caller should decide)
 */
export class TimeoutError extends AgentError {
  constructor(
    message: string,
    public readonly timeoutMs: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'TIMEOUT_ERROR', false, { ...context, timeoutMs });
    this.name = 'TimeoutError';
  }
}

/**
 * Circuit breaker open errors
 * Not retryable (circuit needs to close first)
 */
export class CircuitBreakerOpenError extends AgentError {
  constructor(
    public readonly serviceName: string,
    public readonly nextAttemptTime?: number
  ) {
    const message = nextAttemptTime
      ? `Service "${serviceName}" is temporarily unavailable. Next attempt at ${new Date(nextAttemptTime).toISOString()}`
      : `Service "${serviceName}" is temporarily unavailable (circuit breaker open)`;

    super(message, 'CIRCUIT_BREAKER_OPEN', false, { serviceName, nextAttemptTime });
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Configuration errors
 * Not retryable (configuration needs to be fixed)
 */
export class ConfigurationError extends AgentError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'CONFIGURATION_ERROR', false, context);
    this.name = 'ConfigurationError';
  }
}

/**
 * Agent execution errors
 * Retryable if caused by transient issues
 */
export class AgentExecutionError extends AgentError {
  constructor(
    message: string,
    public readonly agentName: string,
    public readonly taskName: string,
    retryable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message, 'AGENT_EXECUTION_ERROR', retryable, { ...context, agentName, taskName });
    this.name = 'AgentExecutionError';
  }
}

/**
 * Helper function to check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AgentError) {
    return error.retryable;
  }

  // Handle standard Node.js errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network/connection errors are retryable
    const networkErrors = [
      'econnreset',
      'etimedout',
      'enotfound',
      'econnrefused',
      'enetunreach',
      'ehostunreach',
      'fetch failed',
      'network error',
      'connection',
    ];

    // Database errors are retryable
    const dbErrors = ['pgrst', 'postgres', 'database'];

    // HTTP status codes that are retryable
    const retryableStatuses = ['429', '503', '504'];

    return (
      networkErrors.some((err) => message.includes(err)) ||
      dbErrors.some((err) => message.includes(err)) ||
      retryableStatuses.some((status) => message.includes(status))
    );
  }

  return false;
}

/**
 * Helper function to extract error context for logging
 */
export function getErrorContext(error: unknown): Record<string, unknown> {
  if (error instanceof AgentError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      context: error.context,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    error: String(error),
  };
}
