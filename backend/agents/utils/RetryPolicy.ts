/**
 * Retry Policy with Exponential Backoff and Jitter
 *
 * Features:
 * - Configurable max attempts
 * - Exponential backoff (delay doubles each attempt)
 * - Jitter to prevent thundering herd
 * - Retryable error detection
 * - onRetry callback for logging
 */

import { isRetryableError } from './AgentErrors';

export interface RetryOptions {
  /**
   * Maximum number of attempts (including initial attempt)
   * Default: 3
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds before first retry
   * Default: 1000ms (1 second)
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds (cap for exponential growth)
   * Default: 10000ms (10 seconds)
   */
  maxDelayMs?: number;

  /**
   * Backoff multiplier (delay *= multiplier each attempt)
   * Default: 2 (exponential doubling)
   */
  backoffMultiplier?: number;

  /**
   * Custom retryable error patterns (in addition to defaults)
   * Error messages/codes to retry on
   */
  retryableErrors?: string[];

  /**
   * Callback invoked before each retry attempt
   * Useful for logging and monitoring
   */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;

  /**
   * Custom condition to determine if error is retryable
   * If provided, overrides default retryable error detection
   */
  shouldRetry?: (error: Error) => boolean;
}

export class RetryPolicy {
  private readonly defaultOptions: Required<Omit<RetryOptions, 'shouldRetry'>> & Pick<RetryOptions, 'shouldRetry'> = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: [],
    onRetry: () => {},
    shouldRetry: undefined,
  };

  /**
   * Execute an operation with retry logic
   *
   * @param operation - Async operation to execute
   * @param options - Retry configuration options
   * @returns Result of the operation
   * @throws Last error if all retries exhausted
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error;
    let attempt = 0;

    while (attempt < opts.maxAttempts) {
      attempt++;

      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        const shouldRetry = opts.shouldRetry
          ? opts.shouldRetry(lastError)
          : this.isRetryableError(lastError, opts.retryableErrors);

        // Don't retry on last attempt or non-retryable errors
        if (attempt >= opts.maxAttempts || !shouldRetry) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const baseDelay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
        const cappedDelay = Math.min(baseDelay, opts.maxDelayMs);

        // Add jitter (±25%) to avoid thundering herd problem
        const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
        const finalDelay = Math.max(0, Math.round(cappedDelay + jitter));

        // Call onRetry callback
        opts.onRetry(attempt, lastError, finalDelay);

        // Wait before retrying
        await this.delay(finalDelay);
      }
    }

    // TypeScript: This line is unreachable but keeps compiler happy
    throw lastError!;
  }

  /**
   * Execute operation with retry, but catch and return error instead of throwing
   *
   * @param operation - Async operation to execute
   * @param options - Retry configuration options
   * @returns { success: true, data: T } | { success: false, error: Error }
   */
  async executeSafe<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<{ success: true; data: T } | { success: false; error: Error }> {
    try {
      const data = await this.execute(operation, options);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Check if an error should be retried
   *
   * @param error - Error to check
   * @param customPatterns - Custom error patterns to consider retryable
   * @returns true if error is retryable
   */
  private isRetryableError(error: Error, customPatterns: string[]): boolean {
    // Use the isRetryableError helper from AgentErrors
    if (isRetryableError(error)) {
      return true;
    }

    // Check custom patterns
    if (customPatterns.length > 0) {
      const errorString = error.message.toLowerCase();
      return customPatterns.some((pattern) =>
        errorString.includes(pattern.toLowerCase())
      );
    }

    return false;
  }

  /**
   * Delay execution for specified milliseconds
   *
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Convenience function for quick retry without instantiating RetryPolicy
 *
 * @example
 * const result = await retry(() => fetchData(), { maxAttempts: 5 });
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const policy = new RetryPolicy();
  return policy.execute(operation, options);
}

/**
 * Convenience function for safe retry (catches errors)
 *
 * @example
 * const result = await retrySafe(() => fetchData());
 * if (result.success) {
 *   console.log(result.data);
 * } else {
 *   console.error(result.error);
 * }
 */
export async function retrySafe<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  const policy = new RetryPolicy();
  return policy.executeSafe(operation, options);
}
