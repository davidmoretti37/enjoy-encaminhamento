/**
 * Orchestrator Tests - Test agent coordination
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EnhancedOrchestrator } from "../../agents/Orchestrator";
import { BaseAgent } from "../../agents/BaseAgent";
import { AgentResult, ExecutionContext, AgentStatus } from "../../agents/types";

// Mock agent for testing
class MockAgent extends BaseAgent {
  public mockResult: any;
  public shouldFail: boolean = false;

  constructor(name: string = "MockAgent") {
    super({ name });
    this.capabilities = ["testTask", "anotherTask"];
    this.mockResult = { data: "test" };
  }

  async testTask(params: any, _context: ExecutionContext): Promise<AgentResult<any>> {
    if (this.shouldFail) {
      this.setStatus(AgentStatus.FAILED);
      return AgentResult.error("Mock error");
    }

    this.setStatus(AgentStatus.COMPLETED);
    return AgentResult.success(this.mockResult, 100);
  }

  async anotherTask(params: any, _context: ExecutionContext): Promise<AgentResult<any>> {
    this.setStatus(AgentStatus.COMPLETED);
    return AgentResult.success({ processed: params }, 50);
  }
}

describe("EnhancedOrchestrator", () => {
  let orchestrator: EnhancedOrchestrator;
  let mockAgent: MockAgent;

  beforeEach(() => {
    orchestrator = new EnhancedOrchestrator();
    mockAgent = new MockAgent();
  });

  describe("Agent Registration", () => {
    it("should register an agent", () => {
      orchestrator.registerAgent("mock", mockAgent);

      const agents = orchestrator.getAgents();
      expect(agents).toContain("mock");
    });

    it("should get agent info", () => {
      orchestrator.registerAgent("mock", mockAgent);

      const info = orchestrator.getAgentInfo("mock");
      expect(info).toBeDefined();
      expect(info?.name).toBe("MockAgent");
      expect(info?.capabilities).toContain("testTask");
    });

    it("should return undefined for unknown agent", () => {
      const info = orchestrator.getAgentInfo("unknown");
      expect(info).toBeUndefined();
    });
  });

  describe("Task Execution", () => {
    it("should execute a task on a registered agent", async () => {
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      const result = await orchestrator.executeTask(
        "mock",
        "testTask",
        { foo: "bar" },
        context
      );

      expect(result).toBeDefined();
    });

    it("should throw error for unknown agent", async () => {
      const context = new ExecutionContext("user-1", "affiliate-1");

      await expect(
        orchestrator.executeTask("unknown", "testTask", {}, context)
      ).rejects.toThrow();
    });

    it("should throw error for unknown task", async () => {
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      await expect(
        orchestrator.executeTask("mock", "unknownTask", {}, context)
      ).rejects.toThrow();
    });

    it("should handle task failure gracefully", async () => {
      mockAgent.shouldFail = true;
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      // Should not throw, but return error result
      const result = await orchestrator.executeTask(
        "mock",
        "testTask",
        {},
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Parallel Execution", () => {
    it("should execute multiple tasks in parallel", async () => {
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      const tasks = [
        { agent: "mock", task: "testTask", params: { id: 1 } },
        { agent: "mock", task: "anotherTask", params: { id: 2 } },
      ];

      const result = await orchestrator.executeParallel(tasks, context);

      expect(result.tasks).toBe(2);
      expect(result.results.length).toBe(2);
    });

    it("should handle partial failures in parallel execution", async () => {
      const failingAgent = new MockAgent("FailingAgent");
      failingAgent.shouldFail = true;

      orchestrator.registerAgent("mock", mockAgent);
      orchestrator.registerAgent("failing", failingAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      const tasks = [
        { agent: "mock", task: "testTask", params: {} },
        { agent: "failing", task: "testTask", params: {} },
      ];

      const result = await orchestrator.executeParallel(tasks, context);

      expect(result.tasks).toBe(2);
      expect(result.results.length).toBe(2);
    });
  });

  describe("Sequential Execution", () => {
    it("should execute tasks sequentially", async () => {
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      const tasks = [
        { agent: "mock", task: "testTask", params: { step: 1 } },
        { agent: "mock", task: "anotherTask", params: { step: 2 } },
      ];

      const result = await orchestrator.executeSequence(tasks, context);

      expect(result.tasks).toBe(2);
      expect(result.results.length).toBe(2);
    });

    it("should continue on failure in sequential execution", async () => {
      const failingAgent = new MockAgent("FailingAgent");
      failingAgent.shouldFail = true;

      orchestrator.registerAgent("failing", failingAgent);
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      const tasks = [
        { agent: "failing", task: "testTask", params: {} },
        { agent: "mock", task: "testTask", params: {} },
      ];

      const result = await orchestrator.executeSequence(tasks, context);

      expect(result.tasks).toBe(2);
    });
  });

  describe("Metrics", () => {
    it("should track execution metrics", async () => {
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      // Execute some tasks
      await orchestrator.executeTask("mock", "testTask", {}, context);
      await orchestrator.executeTask("mock", "testTask", {}, context);

      const metrics = orchestrator.getMetrics();

      expect(metrics.totalExecutions).toBe(2);
      expect(metrics.successfulExecutions).toBe(2);
      expect(metrics.failedExecutions).toBe(0);
    });

    it("should track failed executions", async () => {
      mockAgent.shouldFail = true;
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      await orchestrator.executeTask("mock", "testTask", {}, context);

      const metrics = orchestrator.getMetrics();

      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.failedExecutions).toBe(1);
    });
  });

  describe("System Status", () => {
    it("should return system status", () => {
      orchestrator.registerAgent("mock", mockAgent);
      orchestrator.registerAgent("another", new MockAgent("AnotherAgent"));

      const status = orchestrator.getSystemStatus();

      expect(status.activeAgents).toContain("mock");
      expect(status.activeAgents).toContain("another");
      expect(status.metrics).toBeDefined();
    });
  });

  describe("Execution History", () => {
    it("should maintain execution history", async () => {
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      await orchestrator.executeTask("mock", "testTask", { id: 1 }, context);
      await orchestrator.executeTask("mock", "anotherTask", { id: 2 }, context);

      const history = orchestrator.getExecutionHistory();

      expect(history.length).toBe(2);
    });

    it("should filter history by agent name", async () => {
      orchestrator.registerAgent("mock1", mockAgent);
      orchestrator.registerAgent("mock2", new MockAgent("Mock2"));
      const context = new ExecutionContext("user-1", "affiliate-1");

      await orchestrator.executeTask("mock1", "testTask", {}, context);
      await orchestrator.executeTask("mock2", "testTask", {}, context);

      const history = orchestrator.getExecutionHistory({ agentName: "mock1" });

      expect(history.length).toBe(1);
      expect(history[0].agentName).toBe("mock1");
    });

    it("should filter history by status", async () => {
      mockAgent.shouldFail = true;
      orchestrator.registerAgent("failing", mockAgent);
      orchestrator.registerAgent("working", new MockAgent());
      const context = new ExecutionContext("user-1", "affiliate-1");

      await orchestrator.executeTask("failing", "testTask", {}, context);
      await orchestrator.executeTask("working", "testTask", {}, context);

      const failedHistory = orchestrator.getExecutionHistory({ status: "failed" });
      expect(failedHistory.length).toBe(1);

      const completedHistory = orchestrator.getExecutionHistory({ status: "completed" });
      expect(completedHistory.length).toBe(1);
    });

    it("should limit history results", async () => {
      orchestrator.registerAgent("mock", mockAgent);
      const context = new ExecutionContext("user-1", "affiliate-1");

      // Execute 5 tasks
      for (let i = 0; i < 5; i++) {
        await orchestrator.executeTask("mock", "testTask", { i }, context);
      }

      const history = orchestrator.getExecutionHistory({ limit: 3 });

      expect(history.length).toBe(3);
    });
  });
});
