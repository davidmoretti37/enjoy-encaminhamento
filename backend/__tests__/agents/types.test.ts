/**
 * Types Tests - Test core type definitions and classes
 */

import { describe, it, expect } from "vitest";
import {
  RiskLevel,
  Trend,
  Recommendation,
  AgentStatus,
  AgentResult,
  ExecutionContext,
  AgentMessage,
} from "../../agents/types";

describe("Types", () => {
  describe("Enums", () => {
    it("should have correct RiskLevel values", () => {
      expect(RiskLevel.LOW).toBe("low");
      expect(RiskLevel.MEDIUM).toBe("medium");
      expect(RiskLevel.HIGH).toBe("high");
      expect(RiskLevel.CRITICAL).toBe("critical");
    });

    it("should have correct Trend values", () => {
      expect(Trend.IMPROVING).toBe("improving");
      expect(Trend.STABLE).toBe("stable");
      expect(Trend.DECLINING).toBe("declining");
    });

    it("should have correct Recommendation values", () => {
      expect(Recommendation.HIGHLY_RECOMMENDED).toBe("highly_recommended");
      expect(Recommendation.RECOMMENDED).toBe("recommended");
      expect(Recommendation.NEUTRAL).toBe("neutral");
      expect(Recommendation.CAUTION).toBe("caution");
      expect(Recommendation.NOT_RECOMMENDED).toBe("not_recommended");
    });

    it("should have correct AgentStatus values", () => {
      expect(AgentStatus.IDLE).toBe("idle");
      expect(AgentStatus.RUNNING).toBe("running");
      expect(AgentStatus.COMPLETED).toBe("completed");
      expect(AgentStatus.FAILED).toBe("failed");
    });
  });

  describe("AgentResult", () => {
    it("should create a success result", () => {
      const data = { test: "value" };
      const result = AgentResult.success(data, 100);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.executionTime).toBe(100);
      expect(result.error).toBeUndefined();
    });

    it("should create an error result", () => {
      const result = AgentResult.error("Something went wrong");

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBe("Something went wrong");
    });
  });

  describe("ExecutionContext", () => {
    it("should create a valid execution context", () => {
      const ctx = new ExecutionContext("user-123", "affiliate-456", { key: "value" });

      expect(ctx.userId).toBe("user-123");
      expect(ctx.affiliateId).toBe("affiliate-456");
      expect(ctx.metadata).toEqual({ key: "value" });
      expect(typeof ctx.startTime).toBe("number");
      expect(ctx.executionId).toBeDefined();
    });

    it("should generate unique execution IDs", () => {
      const ctx1 = new ExecutionContext("user-1", "affiliate-1");
      const ctx2 = new ExecutionContext("user-2", "affiliate-2");

      expect(ctx1.executionId).not.toBe(ctx2.executionId);
    });

    it("should calculate duration correctly", async () => {
      const ctx = new ExecutionContext("user-123", "affiliate-456");

      // Wait a small amount of time
      await new Promise(resolve => setTimeout(resolve, 50));

      const duration = ctx.getDuration();
      expect(duration).toBeGreaterThanOrEqual(50);
    });

    it("should serialize to JSON correctly", () => {
      const ctx = new ExecutionContext("user-123", "affiliate-456", { key: "value" });
      const json = ctx.toJSON();

      expect(json.userId).toBe("user-123");
      expect(json.affiliateId).toBe("affiliate-456");
      expect(json.metadata).toEqual({ key: "value" });
      expect(json.executionId).toBeDefined();
      expect(json.duration).toBeDefined();
    });
  });

  describe("AgentMessage", () => {
    it("should create a message between agents", () => {
      const msg = new AgentMessage("agent1", "agent2", "process", { data: "test" });

      expect(msg.fromAgent).toBe("agent1");
      expect(msg.toAgent).toBe("agent2");
      expect(msg.action).toBe("process");
      expect(msg.payload).toEqual({ data: "test" });
      expect(msg.messageId).toBeDefined();
    });

    it("should generate unique message IDs", () => {
      const msg1 = new AgentMessage("a1", "a2", "action1");
      const msg2 = new AgentMessage("a1", "a2", "action2");

      expect(msg1.messageId).not.toBe(msg2.messageId);
    });

    it("should have default empty payload", () => {
      const msg = new AgentMessage("agent1", "agent2", "test");

      expect(msg.payload).toEqual({});
    });
  });
});
