/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by stopping requests to failing services.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service failing, requests rejected immediately
 * - HALF_OPEN: Testing if service recovered
 *
 * Flow:
 * 1. Start CLOSED (normal operation)
 * 2. Track failures in monitoring window
 * 3. If failures >= threshold → OPEN (stop requests)
 * 4. After timeout → HALF_OPEN (test recovery)
 * 5. If test succeeds → CLOSED (resume normal)
 * 6. If test fails → OPEN (wait longer)
 */

import { CircuitBreakerOpenError } from './AgentErrors';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject immediately
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export interface CircuitBreakerOptions {
  /**
   * Number of failures before opening circuit
   * Default: 5
   */
  failureThreshold?: number;

  /**
   * Number of successes to close from half-open
   * Default: 2
   */
  successThreshold?: number;

  /**
   * Time to wait before trying again (ms)
   * Default: 60000ms (1 minute)
   */
  timeout?: number;

  /**
   * Time window for counting failures (ms)
   * Failures older than this are discarded
   * Default: 120000ms (2 minutes)
   */
  monitoringPeriod?: number;

  /**
   * Callback when state changes
   * Useful for logging and monitoring
   */
  onStateChange?: (oldState: CircuitState, newState: CircuitState) => void;

  /**
   * Callback when failure occurs
   * Useful for logging
   */
  onFailure?: (error: Error) => void;

  /**
   * Callback when success occurs
   * Useful for logging
   */
  onSuccess?: () => void;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttemptTime: number = 0;
  private failures: number[] = []; // Timestamps of recent failures

  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 60000,
      monitoringPeriod: options.monitoringPeriod ?? 120000,
      onStateChange: options.onStateChange ?? (() => {}),
      onFailure: options.onFailure ?? (() => {}),
      onSuccess: options.onSuccess ?? (() => {}),
    };
  }

  /**
   * Execute operation through circuit breaker
   *
   * @param operation - Async operation to execute
   * @returns Result of operation
   * @throws CircuitBreakerOpenError if circuit is open
   * @throws Original error if operation fails
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Remove old failures outside monitoring period
    this.cleanupOldFailures();

    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        // Still in timeout period
        throw new CircuitBreakerOpenError(this.name, this.nextAttemptTime);
      }

      // Timeout elapsed, transition to half-open for testing
      this.transitionTo(CircuitState.HALF_OPEN);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.options.onSuccess();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;

      if (this.successCount >= this.options.successThreshold) {
        // Recovered! Close circuit
        this.transitionTo(CircuitState.CLOSED);
        this.reset();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
      this.failures = [];
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(error: Error): void {
    this.options.onFailure(error);

    const now = Date.now();
    this.failures.push(now);
    this.failureCount = this.failures.length;
    this.successCount = 0; // Reset success count

    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureCount >= this.options.failureThreshold
    ) {
      // Open circuit
      this.nextAttemptTime = now + this.options.timeout;
      this.transitionTo(CircuitState.OPEN);
    }
  }

  /**
   * Remove failures older than monitoring period
   */
  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.options.monitoringPeriod;
    this.failures = this.failures.filter((timestamp) => timestamp > cutoff);
    this.failureCount = this.failures.length;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;

    if (oldState !== newState) {
      this.state = newState;
      this.options.onStateChange(oldState, newState);
    }
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.failures = [];
    this.nextAttemptTime = 0;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current metrics
   */
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    nextAttemptTime: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttemptTime: this.nextAttemptTime > 0 ? this.nextAttemptTime : null,
    };
  }

  /**
   * Force circuit to specific state (for testing/debugging)
   */
  forceState(state: CircuitState): void {
    const oldState = this.state;
    this.state = state;

    if (state === CircuitState.OPEN) {
      this.nextAttemptTime = Date.now() + this.options.timeout;
    }

    if (oldState !== state) {
      this.options.onStateChange(oldState, state);
    }
  }
}

/**
 * Circuit Breaker Registry
 * Singleton registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Get or create circuit breaker
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get metrics for all breakers
   */
  getAllMetrics(): Record<string, ReturnType<CircuitBreaker['getMetrics']>> {
    const metrics: Record<string, ReturnType<CircuitBreaker['getMetrics']>> = {};

    for (const [name, breaker] of this.breakers) {
      metrics[name] = breaker.getMetrics();
    }

    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Clear registry (for testing)
   */
  clear(): void {
    this.breakers.clear();
  }
}
