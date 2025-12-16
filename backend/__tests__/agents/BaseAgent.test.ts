/**
 * BaseAgent Tests - Test base agent functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseAgent } from "../../agents/BaseAgent";
import { AgentStatus } from "../../agents/types";

// Concrete implementation for testing
class TestAgent extends BaseAgent {
  constructor() {
    super({ name: "TestAgent", cacheTTL: 1000 });
    this.capabilities = ["doSomething", "doAnother"];
  }

  async doSomething() {
    return "done";
  }
}

describe("BaseAgent", () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent();
  });

  describe("Initialization", () => {
    it("should initialize with correct name", () => {
      expect(agent.name).toBe("TestAgent");
    });

    it("should start with IDLE status", () => {
      expect(agent.status).toBe(AgentStatus.IDLE);
    });

    it("should have capabilities defined", () => {
      expect(agent.capabilities).toContain("doSomething");
      expect(agent.capabilities).toContain("doAnother");
    });
  });

  describe("Status Management", () => {
    it("should allow setting status", () => {
      agent.setStatus(AgentStatus.RUNNING);
      expect(agent.status).toBe(AgentStatus.RUNNING);

      agent.setStatus(AgentStatus.COMPLETED);
      expect(agent.status).toBe(AgentStatus.COMPLETED);
    });
  });

  describe("Caching", () => {
    it("should store and retrieve cache", () => {
      agent.setCache("key1", { value: "test" });
      const cached = agent.getCache("key1");

      expect(cached).toEqual({ value: "test" });
    });

    it("should return undefined for non-existent cache", () => {
      const cached = agent.getCache("nonexistent");
      expect(cached).toBeUndefined();
    });

    it("should clear cache", () => {
      agent.setCache("key1", { value: "test" });
      agent.setCache("key2", { value: "test2" });

      agent.clearCache();

      expect(agent.getCache("key1")).toBeUndefined();
      expect(agent.getCache("key2")).toBeUndefined();
    });

    it("should expire cache after TTL", async () => {
      // Create agent with short TTL
      const shortTTLAgent = new (class extends BaseAgent {
        constructor() {
          super({ name: "ShortTTL", cacheTTL: 100 }); // 100ms TTL
        }
      })();

      shortTTLAgent.setCache("key", { value: "test" });

      // Should exist immediately
      expect(shortTTLAgent.getCache("key")).toEqual({ value: "test" });

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(shortTTLAgent.getCache("key")).toBeUndefined();
    });
  });

  describe("Agent Info", () => {
    it("should return correct agent info", () => {
      agent.setStatus(AgentStatus.RUNNING);
      const info = agent.getInfo();

      expect(info.name).toBe("TestAgent");
      expect(info.status).toBe(AgentStatus.RUNNING);
      expect(info.capabilities).toContain("doSomething");
    });
  });

  describe("Logging", () => {
    it("should log messages with agent name", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      agent.log("Test message");

      expect(consoleSpy).toHaveBeenCalledWith("[TestAgent] Test message");

      consoleSpy.mockRestore();
    });
  });
});
