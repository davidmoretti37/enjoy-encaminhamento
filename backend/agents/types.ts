/**
 * Shared Types and Interfaces for Enhanced Multi-Agent System
 */

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum Trend {
  IMPROVING = "improving",
  STABLE = "stable",
  DECLINING = "declining",
}

export enum Recommendation {
  HIGHLY_RECOMMENDED = "highly_recommended",
  RECOMMENDED = "recommended",
  CONSIDER = "consider",
  NOT_RECOMMENDED = "not_recommended",
}

export enum AgentStatus {
  IDLE = "idle",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  QUEUED = "queued",
}

export class AgentResult<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
  processingTime: number;
  tokensUsed: number;

  constructor(
    data: T | null = null,
    error: string | null = null,
    processingTime: number = 0,
    tokensUsed: number = 0
  ) {
    this.success = error === null;
    this.data = data;
    this.error = error;
    this.processingTime = processingTime;
    this.tokensUsed = tokensUsed;
  }

  static success<T>(data: T, processingTime: number = 0, tokensUsed: number = 0): AgentResult<T> {
    return new AgentResult<T>(data, null, processingTime, tokensUsed);
  }

  static error<T = unknown>(error: string, processingTime: number = 0): AgentResult<T> {
    return new AgentResult<T>(null, error, processingTime, 0);
  }
}

export class ExecutionContext {
  userId: string;
  affiliateId: string;
  metadata: Record<string, unknown>;
  startTime: number;
  executionId: string;

  constructor(userId: string, affiliateId: string, metadata: Record<string, unknown> = {}) {
    this.userId = userId;
    this.affiliateId = affiliateId;
    this.metadata = metadata;
    this.startTime = Date.now();
    this.executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }

  toJSON(): Record<string, unknown> {
    return {
      userId: this.userId,
      affiliateId: this.affiliateId,
      executionId: this.executionId,
      metadata: this.metadata,
      duration: this.getDuration(),
    };
  }
}

export class AgentMessage {
  fromAgent: string;
  toAgent: string;
  action: string;
  payload: Record<string, unknown>;
  timestamp: string;
  messageId: string;

  constructor(
    fromAgent: string,
    toAgent: string,
    action: string,
    payload: Record<string, unknown> = {}
  ) {
    this.fromAgent = fromAgent;
    this.toAgent = toAgent;
    this.action = action;
    this.payload = payload;
    this.timestamp = new Date().toISOString();
    this.messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Execution history record
export interface ExecutionRecord {
  executionId: string;
  agentName: string;
  taskName: string;
  status: "completed" | "failed";
  result?: unknown;
  error?: string;
  duration: number;
  timestamp: string;
}

// Agent metrics
export interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
}

// Registered agent info
export interface RegisteredAgent {
  instance: unknown;
  capabilities: string[];
  status: AgentStatus;
  lastExecuted: string | null;
  executionCount: number;
  failureCount: number;
}

// Task definition for parallel/sequential execution
export interface TaskDefinition {
  id?: string;
  agent: string;
  task: string;
  params: Record<string, unknown>;
  passResultTo?: string;
}

// Cache entry
export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
}

// Schema property for JSON validation
export interface SchemaProperty {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
}

// JSON Schema for LLM responses
export interface JSONSchema {
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

// Matching types
export interface MatchFactors {
  skillsMatch: number;
  experienceMatch: number;
  locationMatch: number;
  educationMatch: number;
  reliabilityScore: number;
  performanceScore: number;
  stabilityScore: number;
  growthPotential: number;
}

export interface MatchResult {
  candidateId: string;
  candidateName: string;
  compositeScore: number;
  confidenceScore: number;
  successProbability: number;
  factors: MatchFactors;
  recommendation: Recommendation;
  ensembleScore?: number;
  strategyVotes?: Record<string, number>;
}

// Company health types
export interface FinancialAnalysis {
  score: number;
  totalPayments: number;
  onTimePayments: number;
  onTimeRate: number;
  latePayments: number;
  lateRate: number;
  overduePayments: number;
  overdueAmount: number;
  paymentDelayStats: StatisticsResult;
  paymentAnomalies: number;
  paymentForecast: number[];
  trend: Trend;
}

export interface OperationalAnalysis {
  score: number;
  totalJobs: number;
  openJobs: number;
  filledJobs: number;
  fillRate: number;
  fillTimeStats: StatisticsResult;
  totalContracts: number;
  completedContracts: number;
  terminatedContracts: number;
  terminationRate: number;
  earlyTerminations: number;
  contractDurationStats: StatisticsResult;
}

export interface RelationshipAnalysis {
  score: number;
  totalFeedbacks: number;
  averageRating: number;
  ratingStats: StatisticsResult;
  replacementRequests: number;
  replacementRate: number;
  renewals: number;
  renewalRate: number;
  trend: Trend;
  feedbackRenewalCorrelation: number;
}

export interface RiskPrediction {
  riskLevel: RiskLevel | "unknown";
  probability: number;
  confidence: number;
  factors: string[];
  trend?: Trend;
}

export interface PaymentForecast {
  nextSixMonths: number[];
  totalForecast: number;
  averageMonthly: number;
}

// Statistics result
export interface StatisticsResult {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  count: number;
}

// Time series data point
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

// Weighted score factor
export interface WeightedFactor {
  value: number;
  weight: number;
  max?: number;
}
