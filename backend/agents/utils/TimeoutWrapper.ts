/**
 * Timeout Wrapper Utility
 *
 * Wraps async operations with configurable timeouts to prevent hanging operations.
 *
 * Features:
 * - Configurable timeout per operation
 * - Throws TimeoutError on timeout
 * - Fallback value support (return default instead of throwing)
 * - Proper cleanup of timeout timers
 */

import { TimeoutError } from './AgentErrors';

export class TimeoutWrapper {
  /**
   * Execute operation with timeout
   *
   * @param operation - Async operation to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param errorMessage - Custom error message (optional)
   * @returns Result of operation
   * @throws TimeoutError if operation exceeds timeout
   *
   * @example
   * const result = await TimeoutWrapper.execute(
   *   () => fetchData(),
   *   5000,
   *   'Data fetch timed out'
   * );
   */
  static async execute<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    errorMessage?: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new TimeoutError(
            errorMessage || `Operation timed out after ${timeoutMs}ms`,
            timeoutMs
          )
        );
      }, timeoutMs);
    });

    try {
      // Race between operation and timeout
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } finally {
      // Clear timeout to prevent memory leak
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Execute operation with timeout and fallback value
   * Returns fallback instead of throwing on timeout
   *
   * @param operation - Async operation to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param fallback - Value to return on timeout
   * @returns Result of operation or fallback value
   *
   * @example
   * const result = await TimeoutWrapper.executeWithFallback(
   *   () => fetchData(),
   *   5000,
   *   { defaultData: [] }
   * );
   */
  static async executeWithFallback<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    fallback: T
  ): Promise<T> {
    try {
      return await this.execute(operation, timeoutMs);
    } catch (error) {
      if (error instanceof TimeoutError) {
        return fallback;
      }
      throw error;
    }
  }

  /**
   * Execute operation with timeout, catching all errors
   * Returns { success: true, data } | { success: false, error, timedOut }
   *
   * @param operation - Async operation to execute
   * @param timeoutMs - Timeout in milliseconds
   * @returns Result object with success flag
   *
   * @example
   * const result = await TimeoutWrapper.executeSafe(() => fetchData(), 5000);
   * if (result.success) {
   *   console.log(result.data);
   * } else if (result.timedOut) {
   *   console.log('Operation timed out');
   * } else {
   *   console.log('Operation failed:', result.error);
   * }
   */
  static async executeSafe<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<
    | { success: true; data: T; timedOut: false }
    | { success: false; error: Error; timedOut: boolean }
  > {
    try {
      const data = await this.execute(operation, timeoutMs);
      return { success: true, data, timedOut: false };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        success: false,
        error: err,
        timedOut: error instanceof TimeoutError,
      };
    }
  }

  /**
   * Execute multiple operations with individual timeouts in parallel
   * Each operation has its own timeout
   *
   * @param operations - Array of [operation, timeoutMs] tuples
   * @returns Array of results or errors
   *
   * @example
   * const results = await TimeoutWrapper.executeParallel([
   *   [() => fetchUsers(), 5000],
   *   [() => fetchPosts(), 3000],
   *   [() => fetchComments(), 10000],
   * ]);
   */
  static async executeParallel<T>(
    operations: Array<[() => Promise<T>, number]>
  ): Promise<Array<{ success: true; data: T } | { success: false; error: Error }>> {
    const promises = operations.map(async ([operation, timeoutMs]) => {
      try {
        const data = await this.execute(operation, timeoutMs);
        return { success: true as const, data };
      } catch (error) {
        return {
          success: false as const,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Execute operations sequentially with individual timeouts
   * Stops on first timeout or error (unless continueOnError is true)
   *
   * @param operations - Array of [operation, timeoutMs] tuples
   * @param continueOnError - Continue even if operation fails
   * @returns Array of results
   *
   * @example
   * const results = await TimeoutWrapper.executeSequential([
   *   [() => step1(), 5000],
   *   [() => step2(), 3000],
   *   [() => step3(), 10000],
   * ]);
   */
  static async executeSequential<T>(
    operations: Array<[() => Promise<T>, number]>,
    continueOnError: boolean = false
  ): Promise<Array<{ success: true; data: T } | { success: false; error: Error }>> {
    const results: Array<{ success: true; data: T } | { success: false; error: Error }> = [];

    for (const [operation, timeoutMs] of operations) {
      try {
        const data = await this.execute(operation, timeoutMs);
        results.push({ success: true, data });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        results.push({ success: false, error: err });

        if (!continueOnError) {
          break; // Stop on first error
        }
      }
    }

    return results;
  }

  /**
   * Create a timeout wrapper with preset timeout
   * Useful for creating reusable timeout configurations
   *
   * @param timeoutMs - Default timeout in milliseconds
   * @returns Object with execute methods using preset timeout
   *
   * @example
   * const timeout5s = TimeoutWrapper.create(5000);
   * const result1 = await timeout5s.execute(() => fetchUsers());
   * const result2 = await timeout5s.execute(() => fetchPosts());
   */
  static create(timeoutMs: number) {
    return {
      execute: <T>(operation: () => Promise<T>, errorMessage?: string) =>
        TimeoutWrapper.execute(operation, timeoutMs, errorMessage),

      executeWithFallback: <T>(operation: () => Promise<T>, fallback: T) =>
        TimeoutWrapper.executeWithFallback(operation, timeoutMs, fallback),

      executeSafe: <T>(operation: () => Promise<T>) =>
        TimeoutWrapper.executeSafe(operation, timeoutMs),
    };
  }
}

/**
 * Convenience function for quick timeout without using class
 *
 * @example
 * const result = await withTimeout(() => fetchData(), 5000);
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  return TimeoutWrapper.execute(operation, timeoutMs, errorMessage);
}

/**
 * Convenience function for timeout with fallback
 *
 * @example
 * const result = await withTimeoutOrDefault(() => fetchData(), 5000, []);
 */
export async function withTimeoutOrDefault<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return TimeoutWrapper.executeWithFallback(operation, timeoutMs, fallback);
}
