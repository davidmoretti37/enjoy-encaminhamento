/**
 * Enhanced Multi-Agent System - Main exports
 */

// Core types
export * from "./types";

// Base classes
export { BaseAgent } from "./BaseAgent";
export type { BaseAgentOptions } from "./BaseAgent";
export { EnhancedOrchestrator } from "./Orchestrator";
export type { OrchestratorOptions } from "./Orchestrator";

// Utilities
export { AnalysisEngine } from "./utils/AnalysisEngine";
export { AIUtils } from "./utils/AIUtils";
export type { AIUtilsOptions, InvokeJSONResult, ReasoningStep, FewShotExample } from "./utils/AIUtils";

// Agents
export { EnhancedMatchingAgent } from "./agents/MatchingAgent";
export { EnhancedCompanyHealthAgent } from "./agents/CompanyHealthAgent";
export { EnhancedCandidateInsightsAgent } from "./agents/CandidateInsightsAgent";
export { WorkforcePlanningAgent } from "./agents/WorkforcePlanningAgent";
export { PipelineAgent } from "./agents/PipelineAgent";
export { SchoolPerformanceAgent } from "./agents/SchoolPerformanceAgent";
export { ContractRenewalAgent } from "./agents/ContractRenewalAgent";
export { FeedbackAnalysisAgent } from "./agents/FeedbackAnalysisAgent";

// Context
export type { AgentContext } from "./AgentContext";
export { createAgentContext } from "./AgentContext";

// Chat Handler (LLM-powered)
export { IntelligentChatHandler } from "./IntelligentChatHandler";
export type { ChatMessage, ChatResponse, IntentDetectionResult, ConversationContext } from "./IntelligentChatHandler";

// Database Adapter
export { DatabaseAdapter } from "./DatabaseAdapter";
export type { QueryOptions, FilterOptions } from "./DatabaseAdapter";
