/**
 * Enhanced Orchestrator - Advanced multi-agent coordination and management
 */

import { EventEmitter } from "events";
import {
  AgentMessage,
  AgentMetrics,
  AgentStatus,
  ExecutionContext,
  ExecutionRecord,
  RegisteredAgent,
  TaskDefinition,
} from "./types";
import { BaseAgent } from "./BaseAgent";

export interface OrchestratorOptions {
  maxHistorySize?: number;
  logger?: Console;
}

export class EnhancedOrchestrator extends EventEmitter {
  private agents: Map<string, RegisteredAgent>;
  private executionHistory: ExecutionRecord[];
  private maxHistorySize: number;
  private logger: Console;
  private metrics: AgentMetrics;

  constructor(options: OrchestratorOptions = {}) {
    super();
    this.agents = new Map();
    this.executionHistory = [];
    this.maxHistorySize = options.maxHistorySize || 1000;
    this.logger = options.logger || console;
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
    };
  }

  registerAgent(name: string, agent: BaseAgent): void {
    if (this.agents.has(name)) {
      this.logger.warn(`Agent ${name} is already registered. Overwriting.`);
    }

    this.agents.set(name, {
      instance: agent,
      capabilities: agent.capabilities || [],
      status: AgentStatus.IDLE,
      lastExecuted: null,
      executionCount: 0,
      failureCount: 0,
    });

    this.logger.log(`Agent registered: ${name}`);
    this.emit("agent_registered", { name });
  }

  unregisterAgent(name: string): boolean {
    const deleted = this.agents.delete(name);
    if (deleted) {
      this.emit("agent_unregistered", { name });
    }
    return deleted;
  }

  getAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  getAgent(name: string): BaseAgent | null {
    const agent = this.agents.get(name);
    return agent ? (agent.instance as BaseAgent) : null;
  }

  getAgentInfo(name: string): {
    name: string;
    status: AgentStatus;
    capabilities: string[];
    executionCount: number;
    failureCount: number;
    lastExecuted: string | null;
  } | null {
    const agent = this.agents.get(name);
    if (!agent) return null;

    return {
      name,
      status: agent.status,
      capabilities: agent.capabilities,
      executionCount: agent.executionCount,
      failureCount: agent.failureCount,
      lastExecuted: agent.lastExecuted,
    };
  }

  async executeTask<T = unknown>(
    agentName: string,
    taskName: string,
    params: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<T> {
    const executionId = context.executionId;
    const startTime = Date.now();

    try {
      this.logger.log(`[${executionId}] Executing task: ${agentName}.${taskName}`);

      const agent = this.agents.get(agentName);
      if (!agent) {
        throw new Error(`Agent not found: ${agentName}`);
      }

      agent.status = AgentStatus.RUNNING;
      this.emit("task_started", { agentName, taskName, executionId });

      const instance = agent.instance as Record<string, unknown>;
      const method = instance[taskName];
      if (!method || typeof method !== "function") {
        throw new Error(`Task not found: ${taskName}`);
      }

      const result = await (method as (params: unknown, context: ExecutionContext) => Promise<T>).call(
        instance,
        params,
        context
      );

      const duration = Date.now() - startTime;
      agent.status = AgentStatus.COMPLETED;
      agent.lastExecuted = new Date().toISOString();
      agent.executionCount++;

      this.updateMetrics(duration, true);

      const execution: ExecutionRecord = {
        executionId,
        agentName,
        taskName,
        status: "completed",
        result,
        duration,
        timestamp: new Date().toISOString(),
      };

      this.recordExecution(execution);
      this.emit("task_completed", { agentName, taskName, executionId, duration });

      this.logger.log(`[${executionId}] Task completed: ${agentName}.${taskName} (${duration}ms)`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const agent = this.agents.get(agentName);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (agent) {
        agent.status = AgentStatus.FAILED;
        agent.failureCount++;
      }

      this.updateMetrics(duration, false);

      const execution: ExecutionRecord = {
        executionId,
        agentName,
        taskName,
        status: "failed",
        error: errorMessage,
        duration,
        timestamp: new Date().toISOString(),
      };

      this.recordExecution(execution);
      this.emit("task_failed", {
        agentName,
        taskName,
        executionId,
        error: errorMessage,
      });

      this.logger.error(`[${executionId}] Task failed: ${agentName}.${taskName}`, error);

      throw error;
    }
  }

  async executeParallel<T = unknown>(
    tasks: TaskDefinition[],
    context: ExecutionContext
  ): Promise<{
    executionId: string;
    tasks: number;
    results: (T | { agent: string; task: string; error: string })[];
    timestamp: string;
  }> {
    const executionId = context.executionId;
    this.logger.log(`[${executionId}] Executing ${tasks.length} tasks in parallel`);

    const promises = tasks.map((task) =>
      this.executeTask<T>(task.agent, task.task, task.params, context).catch((error) => ({
        agent: task.agent,
        task: task.task,
        error: error instanceof Error ? error.message : String(error),
      }))
    );

    const results = await Promise.all(promises);

    return {
      executionId,
      tasks: tasks.length,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  async executeSequence<T = unknown>(
    tasks: TaskDefinition[],
    context: ExecutionContext
  ): Promise<{
    executionId: string;
    tasks: number;
    results: T[];
    timestamp: string;
  }> {
    const executionId = context.executionId;
    this.logger.log(`[${executionId}] Executing ${tasks.length} tasks in sequence`);

    const results: T[] = [];

    for (const task of tasks) {
      try {
        const result = await this.executeTask<T>(task.agent, task.task, task.params, context);
        results.push(result);

        if (task.passResultTo) {
          const nextTask = tasks.find((t) => t.id === task.passResultTo);
          if (nextTask) {
            nextTask.params = { ...nextTask.params, previousResult: result };
          }
        }
      } catch (error) {
        this.logger.error(`[${executionId}] Sequence execution failed:`, error);
        throw error;
      }
    }

    return {
      executionId,
      tasks: tasks.length,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  async sendMessage(message: AgentMessage): Promise<unknown> {
    const { fromAgent, toAgent, action } = message;

    this.logger.log(`Message from ${fromAgent} to ${toAgent}: ${action}`);

    const targetAgent = this.agents.get(toAgent);
    if (!targetAgent) {
      throw new Error(`Target agent not found: ${toAgent}`);
    }

    const instance = targetAgent.instance as BaseAgent;
    if (instance.handleMessage) {
      return await instance.handleMessage(message);
    }

    return null;
  }

  getExecutionHistory(filter: {
    agentName?: string;
    status?: "completed" | "failed";
    limit?: number;
  } = {}): ExecutionRecord[] {
    let history = this.executionHistory;

    if (filter.agentName) {
      history = history.filter((e) => e.agentName === filter.agentName);
    }

    if (filter.status) {
      history = history.filter((e) => e.status === filter.status);
    }

    if (filter.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  private recordExecution(execution: ExecutionRecord): void {
    this.executionHistory.push(execution);

    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory.shift();
    }
  }

  private updateMetrics(duration: number, success: boolean): void {
    this.metrics.totalExecutions++;

    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    const totalTime =
      this.metrics.averageExecutionTime * (this.metrics.totalExecutions - 1) + duration;
    this.metrics.averageExecutionTime = Math.round(totalTime / this.metrics.totalExecutions);
  }

  getMetrics(): AgentMetrics & { successRate: string; registeredAgents: number } {
    const successRate =
      this.metrics.totalExecutions > 0
        ? ((this.metrics.successfulExecutions / this.metrics.totalExecutions) * 100).toFixed(2)
        : "0";

    return {
      totalExecutions: this.metrics.totalExecutions,
      successfulExecutions: this.metrics.successfulExecutions,
      failedExecutions: this.metrics.failedExecutions,
      averageExecutionTime: this.metrics.averageExecutionTime,
      successRate: `${successRate}%`,
      registeredAgents: this.agents.size,
    };
  }

  getSystemStatus(): {
    agents: Array<{
      name: string;
      status: AgentStatus;
      executionCount: number;
      failureCount: number;
    }>;
    metrics: ReturnType<EnhancedOrchestrator["getMetrics"]>;
    timestamp: string;
  } {
    const agents = Array.from(this.agents.entries()).map(([name, agent]) => ({
      name,
      status: agent.status,
      executionCount: agent.executionCount,
      failureCount: agent.failureCount,
    }));

    return {
      agents,
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
    };
  }

  clearHistory(): void {
    this.executionHistory = [];
  }

  shutdown(): void {
    this.logger.log("Orchestrator shutting down...");
    this.agents.clear();
    this.executionHistory = [];
    this.removeAllListeners();
  }
}
