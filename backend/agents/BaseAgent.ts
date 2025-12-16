/**
 * Base Agent Class - Core functionalities for all enhanced agents
 */

import { AgentStatus, CacheEntry } from "./types";

export interface BaseAgentOptions {
  name?: string;
  logger?: Console;
}

export abstract class BaseAgent {
  name: string;
  status: AgentStatus;
  protected logger: Console;
  protected cache: Map<string, CacheEntry>;
  capabilities: string[];

  constructor(options: BaseAgentOptions = {}) {
    this.name = options.name || "BaseAgent";
    this.status = AgentStatus.IDLE;
    this.logger = options.logger || console;
    this.cache = new Map();
    this.capabilities = [];
  }

  setStatus(status: AgentStatus): void {
    this.status = status;
    this.log("INFO", `Status changed to ${status}`);
  }

  protected log(level: "DEBUG" | "INFO" | "WARN" | "ERROR", message: string, data: Record<string, unknown> = {}): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.name}] [${level}] ${message}`;

    switch (level) {
      case "ERROR":
        this.logger.error(logMessage, data);
        break;
      case "WARN":
        this.logger.warn(logMessage, data);
        break;
      default:
        this.logger.log(logMessage, Object.keys(data).length > 0 ? data : "");
    }
  }

  protected getCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && entry.expiresAt > Date.now()) {
      return entry.value;
    }
    this.cache.delete(key);
    return null;
  }

  protected setCache<T>(key: string, value: T, ttl: number = 3600000): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  getInfo(): { name: string; status: AgentStatus; cacheSize: number; capabilities: string[] } {
    return {
      name: this.name,
      status: this.status,
      cacheSize: this.cache.size,
      capabilities: this.capabilities,
    };
  }

  // Optional message handler for inter-agent communication
  async handleMessage?(message: unknown): Promise<unknown>;
}
