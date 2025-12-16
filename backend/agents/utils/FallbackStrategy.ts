/**
 * Fallback Strategy for Graceful Degradation
 *
 * Provides patterns for handling failures gracefully by falling back to
 * alternative implementations, cached data, or default values.
 *
 * Patterns supported:
 * - Primary → Fallback
 * - Multiple strategies (try in order)
 * - Conditional fallback
 * - Circuit breaker integration
 */

export interface FallbackOptions<T> {
  /**
   * Primary operation to try first
   */
  primary: () => Promise<T>;

  /**
   * Fallback operation if primary fails
   */
  fallback: () => Promise<T>;

  /**
   * Custom condition to determine if fallback should be used
   * If not provided, fallback is used on any error
   *
   * @param error - Error from primary operation
   * @returns true if should fallback, false to rethrow error
   */
  shouldFallback?: (error: Error) => boolean;

  /**
   * Callback invoked when falling back
   * Useful for logging and monitoring
   *
   * @param error - Error that triggered fallback
   */
  onFallback?: (error: Error) => void;

  /**
   * Callback invoked when primary succeeds
   * Useful for monitoring
   */
  onPrimarySuccess?: () => void;

  /**
   * Callback invoked when fallback succeeds
   * Useful for monitoring
   */
  onFallbackSuccess?: () => void;
}

export class FallbackStrategy {
  /**
   * Try primary operation, fallback on failure
   *
   * @param options - Fallback configuration
   * @returns Result from primary or fallback
   * @throws Error if both primary and fallback fail, or shouldFallback returns false
   *
   * @example
   * const result = await FallbackStrategy.execute({
   *   primary: () => fetchFromAPI(),
   *   fallback: () => fetchFromCache(),
   *   onFallback: (error) => console.log('Using cache:', error.message)
   * });
   */
  static async execute<T>(options: FallbackOptions<T>): Promise<T> {
    try {
      const result = await options.primary();
      options.onPrimarySuccess?.();
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Check if we should fallback for this error
      const shouldFallback = options.shouldFallback?.(err) ?? true;

      if (!shouldFallback) {
        throw err;
      }

      // Notify about fallback
      options.onFallback?.(err);

      // Try fallback
      try {
        const result = await options.fallback();
        options.onFallbackSuccess?.();
        return result;
      } catch (fallbackError) {
        // Both failed, throw original error
        throw err;
      }
    }
  }

  /**
   * Try multiple strategies in order until one succeeds
   * Stops at first success
   *
   * @param strategies - Array of strategies to try (in order)
   * @param onFailure - Callback for each failure
   * @returns Result from first successful strategy
   * @throws Last error if all strategies fail
   *
   * @example
   * const result = await FallbackStrategy.tryStrategies([
   *   () => fetchFromPrimaryAPI(),
   *   () => fetchFromSecondaryAPI(),
   *   () => fetchFromCache(),
   *   () => Promise.resolve(defaultValue),
   * ]);
   */
  static async tryStrategies<T>(
    strategies: Array<() => Promise<T>>,
    onFailure?: (index: number, error: Error) => void
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < strategies.length; i++) {
      try {
        return await strategies[i]();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        onFailure?.(i, lastError);

        // If last strategy, throw
        if (i === strategies.length - 1) {
          throw lastError;
        }
      }
    }

    // TypeScript: Unreachable, but keeps compiler happy
    throw lastError!;
  }

  /**
   * Execute with fallback to default value
   * Never throws, always returns a value
   *
   * @param operation - Operation to try
   * @param defaultValue - Value to return on failure
   * @param onError - Callback when using default
   * @returns Result or default value
   *
   * @example
   * const users = await FallbackStrategy.withDefault(
   *   () => fetchUsers(),
   *   [],
   *   (error) => console.log('Using empty array:', error.message)
   * );
   */
  static async withDefault<T>(
    operation: () => Promise<T>,
    defaultValue: T,
    onError?: (error: Error) => void
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      return defaultValue;
    }
  }

  /**
   * Execute with cached fallback
   * Useful for serving stale data when fresh fetch fails
   *
   * @param fetch - Operation to fetch fresh data
   * @param getCache - Function to retrieve cached data
   * @param setCache - Function to store fresh data in cache
   * @param onCacheFallback - Callback when using cached data
   * @returns Fresh or cached data
   *
   * @example
   * const data = await FallbackStrategy.withCache(
   *   () => fetchFreshData(),
   *   () => cache.get('key'),
   *   (data) => cache.set('key', data),
   *   () => console.log('Serving stale data from cache')
   * );
   */
  static async withCache<T>(
    fetch: () => Promise<T>,
    getCache: () => Promise<T | null> | T | null,
    setCache: (data: T) => void | Promise<void>,
    onCacheFallback?: () => void
  ): Promise<T> {
    try {
      const data = await fetch();
      await setCache(data); // Update cache with fresh data
      return data;
    } catch (error) {
      // Try to serve from cache
      const cached = await getCache();

      if (cached !== null && cached !== undefined) {
        onCacheFallback?.();
        return cached;
      }

      // No cache available, throw original error
      throw error;
    }
  }

  /**
   * Conditional fallback based on error type
   *
   * @param operation - Primary operation
   * @param fallbacks - Map of error types/patterns to fallback operations
   * @param defaultFallback - Default fallback if no match found
   * @returns Result from primary or matched fallback
   *
   * @example
   * const result = await FallbackStrategy.conditionalFallback(
   *   () => fetchData(),
   *   {
   *     'ETIMEDOUT': () => fetchFromCache(),
   *     'ECONNREFUSED': () => fetchFromSecondary(),
   *     'ValidationError': () => Promise.resolve(defaultData),
   *   },
   *   () => Promise.resolve(safeDefault)
   * );
   */
  static async conditionalFallback<T>(
    operation: () => Promise<T>,
    fallbacks: Record<string, () => Promise<T>>,
    defaultFallback?: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Try to match error to a fallback
      for (const [pattern, fallback] of Object.entries(fallbacks)) {
        if (err.name === pattern || err.message.includes(pattern)) {
          return await fallback();
        }
      }

      // Use default fallback if provided
      if (defaultFallback) {
        return await defaultFallback();
      }

      // No matching fallback, rethrow
      throw err;
    }
  }

  /**
   * Degraded mode pattern
   * Tries full operation first, falls back to limited/degraded version
   *
   * @param fullOperation - Full-featured operation
   * @param degradedOperation - Limited/simplified operation
   * @param onDegrade - Callback when degrading
   * @returns Result with degraded flag
   *
   * @example
   * const { data, degraded } = await FallbackStrategy.degradedMode(
   *   () => fetchCompleteUserProfile(),
   *   () => fetchBasicUserInfo(),
   *   () => console.log('Serving degraded user profile')
   * );
   *
   * if (degraded) {
   *   console.log('Limited data available');
   * }
   */
  static async degradedMode<T>(
    fullOperation: () => Promise<T>,
    degradedOperation: () => Promise<T>,
    onDegrade?: () => void
  ): Promise<{ data: T; degraded: boolean }> {
    try {
      const data = await fullOperation();
      return { data, degraded: false };
    } catch (error) {
      onDegrade?.();
      const data = await degradedOperation();
      return { data, degraded: true };
    }
  }

  /**
   * Timeout with fallback
   * Combines timeout handling with fallback strategy
   *
   * @param operation - Operation to execute
   * @param timeoutMs - Timeout in milliseconds
   * @param fallback - Fallback to use on timeout
   * @param onTimeout - Callback when timeout occurs
   * @returns Result or fallback
   *
   * @example
   * const result = await FallbackStrategy.withTimeout(
   *   () => slowOperation(),
   *   5000,
   *   () => getCachedResult(),
   *   () => console.log('Operation timed out, using cache')
   * );
   */
  static async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    fallback: () => Promise<T>,
    onTimeout?: () => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        onTimeout?.();
        fallback().then(resolve).catch(reject);
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          fallback().then(resolve).catch(() => reject(error));
        });
    });
  }
}
