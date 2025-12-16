/**
 * Enhanced Company Health Agent - Predictive analytics and risk assessment
 *
 * Features:
 * - Predictive payment risk modeling
 * - Churn prediction
 * - Anomaly detection in payment patterns
 * - Forecasting and trend analysis
 * - Risk scoring with confidence intervals
 * - Comparative benchmarking
 */

import { BaseAgent, BaseAgentOptions } from "../BaseAgent";
import { AnalysisEngine } from "../utils/AnalysisEngine";
import {
  AgentResult,
  AgentStatus,
  ExecutionContext,
  FinancialAnalysis,
  OperationalAnalysis,
  PaymentForecast,
  RelationshipAnalysis,
  RiskLevel,
  RiskPrediction,
  Trend,
} from "../types";

// Types
interface Company {
  id: string;
  name: string;
  status?: string;
}

interface Contract {
  id: string;
  status: string;
  duration: number;
  createdAt: string;
  startDate?: string;
  endDate?: string;
  company_id?: string;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  date: string;
  daysLate: number;
}

interface Feedback {
  id: string;
  rating: number;
  createdAt: string;
  requires_replacement?: boolean;
}

interface Job {
  id: string;
  status: string;
  daysToFill?: number;
}

interface CompanyHealthContext extends ExecutionContext {
  getCompany(companyId: string): Promise<Company>;
  getCompanyContracts(companyId: string): Promise<Contract[]>;
  getCompanyPayments(companyId: string): Promise<Payment[]>;
  getCompanyFeedback(companyId: string): Promise<Feedback[]>;
  getCompanyJobs(companyId: string): Promise<Job[]>;
}

interface CompanyHealthReport {
  companyId: string;
  companyName: string;
  healthScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  financialAnalysis: FinancialAnalysis;
  operationalAnalysis: OperationalAnalysis;
  relationshipAnalysis: RelationshipAnalysis;
  predictions: {
    paymentRisk: RiskPrediction;
    churnRisk: RiskPrediction;
    paymentForecast: PaymentForecast;
  };
  recommendations: string[];
  analyzedAt: string;
}

export class EnhancedCompanyHealthAgent extends BaseAgent {
  constructor(options: BaseAgentOptions = {}) {
    super({
      ...options,
      name: options.name || "EnhancedCompanyHealthAgent",
    });
    this.capabilities = [
      "analyzeCompanyHealthAdvanced",
      "predictPaymentRisk",
      "predictChurnRisk",
      "forecastPayments",
    ];
  }

  /**
   * Comprehensive company health analysis with predictive insights
   */
  async analyzeCompanyHealthAdvanced(
    params: { companyId: string },
    context: CompanyHealthContext
  ): Promise<AgentResult<CompanyHealthReport>> {
    const { companyId } = params;
    const startTime = Date.now();

    try {
      this.setStatus(AgentStatus.RUNNING);

      // Fetch company data
      const company = await context.getCompany(companyId);
      const contracts = await context.getCompanyContracts(companyId);
      const payments = await context.getCompanyPayments(companyId);
      const feedback = await context.getCompanyFeedback(companyId);
      const jobs = await context.getCompanyJobs(companyId);

      // Financial analysis with predictions
      const financialAnalysis = this.analyzeFinancialHealthAdvanced(contracts, payments);

      // Operational analysis
      const operationalAnalysis = this.analyzeOperationalHealthAdvanced(jobs, contracts);

      // Relationship analysis
      const relationshipAnalysis = this.analyzeRelationshipHealthAdvanced(feedback, contracts);

      // Predictive models
      const paymentRiskPrediction = this.predictPaymentRisk(payments);
      const churnPrediction = this.predictChurnRisk(contracts, feedback, payments);
      const paymentForecast = this.forecastPayments(payments);

      // Composite risk score
      const riskScore = this.calculateCompositeRiskScore(
        financialAnalysis,
        operationalAnalysis,
        relationshipAnalysis,
        paymentRiskPrediction,
        churnPrediction
      );

      const report: CompanyHealthReport = {
        companyId: company.id,
        companyName: company.name,
        healthScore: 100 - riskScore,
        riskScore,
        riskLevel: this.determineRiskLevel(riskScore),
        financialAnalysis,
        operationalAnalysis,
        relationshipAnalysis,
        predictions: {
          paymentRisk: paymentRiskPrediction,
          churnRisk: churnPrediction,
          paymentForecast,
        },
        recommendations: this.generateRecommendations(
          financialAnalysis,
          operationalAnalysis,
          relationshipAnalysis,
          paymentRiskPrediction,
          churnPrediction
        ),
        analyzedAt: new Date().toISOString(),
      };

      this.setStatus(AgentStatus.COMPLETED);
      const duration = Date.now() - startTime;

      return AgentResult.success(report, duration);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return AgentResult.error<CompanyHealthReport>(errorMessage);
    }
  }

  /**
   * Advanced financial health analysis
   */
  private analyzeFinancialHealthAdvanced(
    _contracts: Contract[],
    payments: Payment[]
  ): FinancialAnalysis {
    const onTimePayments = payments.filter((p) => p.status === "paid" && p.daysLate <= 0);
    const latePayments = payments.filter((p) => p.daysLate > 0);
    const overduePayments = payments.filter((p) => p.status === "overdue");

    const onTimeRate = payments.length > 0 ? (onTimePayments.length / payments.length) * 100 : 100;
    const lateRate = payments.length > 0 ? (latePayments.length / payments.length) * 100 : 0;

    // Analyze payment delays
    const delays = latePayments.map((p) => p.daysLate);
    const delayStats = AnalysisEngine.getStats(delays);

    // Detect payment anomalies
    const paymentAmounts = payments.map((p) => p.amount);
    const anomalies = AnalysisEngine.findAnomalies(paymentAmounts);

    // Forecast next payment
    const forecast = AnalysisEngine.forecast(paymentAmounts, 3);

    const overdueAmount = overduePayments.reduce((sum, p) => sum + p.amount, 0);

    const trend = AnalysisEngine.detectTrend(
      payments.map((p) => ({
        timestamp: p.date,
        value: p.status === "paid" ? 100 : 0,
      }))
    );

    return {
      score: this.calculateFinancialScore(onTimeRate, overdueAmount, delayStats.mean),
      totalPayments: payments.length,
      onTimePayments: onTimePayments.length,
      onTimeRate: parseFloat(onTimeRate.toFixed(2)),
      latePayments: latePayments.length,
      lateRate: parseFloat(lateRate.toFixed(2)),
      overduePayments: overduePayments.length,
      overdueAmount,
      paymentDelayStats: delayStats,
      paymentAnomalies: anomalies.length,
      paymentForecast: forecast,
      trend,
    };
  }

  /**
   * Advanced operational health analysis
   */
  private analyzeOperationalHealthAdvanced(jobs: Job[], contracts: Contract[]): OperationalAnalysis {
    const openJobs = jobs.filter((j) => j.status === "open");
    const filledJobs = jobs.filter((j) => j.status === "filled");
    const completedContracts = contracts.filter((c) => c.status === "completed");
    const terminatedContracts = contracts.filter((c) => c.status === "terminated");

    const fillRate = jobs.length > 0 ? (filledJobs.length / jobs.length) * 100 : 0;
    const terminationRate =
      contracts.length > 0 ? (terminatedContracts.length / contracts.length) * 100 : 0;

    // Time to fill analysis
    const timeToFill = filledJobs.map((j) => j.daysToFill || 0).filter((t) => t > 0);
    const fillTimeStats = AnalysisEngine.getStats(timeToFill);

    // Contract duration analysis
    const durations = contracts.map((c) => c.duration);
    const durationStats = AnalysisEngine.getStats(durations);

    // Early termination analysis
    const earlyTerminations = terminatedContracts.filter(
      (c) => c.duration < durationStats.mean
    );

    return {
      score: this.calculateOperationalScore(fillRate, terminationRate),
      totalJobs: jobs.length,
      openJobs: openJobs.length,
      filledJobs: filledJobs.length,
      fillRate: parseFloat(fillRate.toFixed(2)),
      fillTimeStats,
      totalContracts: contracts.length,
      completedContracts: completedContracts.length,
      terminatedContracts: terminatedContracts.length,
      terminationRate: parseFloat(terminationRate.toFixed(2)),
      earlyTerminations: earlyTerminations.length,
      contractDurationStats: durationStats,
    };
  }

  /**
   * Advanced relationship health analysis
   */
  private analyzeRelationshipHealthAdvanced(
    feedback: Feedback[],
    contracts: Contract[]
  ): RelationshipAnalysis {
    const ratings = feedback.map((f) => f.rating);
    const ratingStats = AnalysisEngine.getStats(ratings);

    const replacementRequests = feedback.filter((f) => f.requires_replacement).length;
    const renewals = contracts.filter((c) => c.status === "renewed").length;

    // Trend analysis
    const trend = AnalysisEngine.detectTrend(
      feedback.map((f) => ({
        timestamp: f.createdAt,
        value: f.rating,
      }))
    );

    // Correlation between feedback and renewals
    const feedbackScores = feedback.map((f) => f.rating);
    const renewalIndicators = contracts.map((c) => (c.status === "renewed" ? 1 : 0));
    const correlation = AnalysisEngine.getCorrelation(feedbackScores, renewalIndicators);

    return {
      score: this.calculateRelationshipScore(ratingStats.mean, replacementRequests),
      totalFeedbacks: feedback.length,
      averageRating: parseFloat(ratingStats.mean.toFixed(2)),
      ratingStats,
      replacementRequests,
      replacementRate: feedback.length > 0 ? (replacementRequests / feedback.length) * 100 : 0,
      renewals,
      renewalRate: contracts.length > 0 ? (renewals / contracts.length) * 100 : 0,
      trend,
      feedbackRenewalCorrelation: correlation,
    };
  }

  /**
   * Predict payment risk
   */
  predictPaymentRisk(payments: Payment[]): RiskPrediction {
    if (payments.length < 3) {
      return {
        riskLevel: "unknown" as RiskLevel,
        probability: 0,
        confidence: 0,
        factors: [],
      };
    }

    const recentPayments = payments.slice(-10);
    const latePaymentsCount = recentPayments.filter((p) => p.daysLate > 0).length;
    const lateRate = (latePaymentsCount / recentPayments.length) * 100;

    const delays = recentPayments.map((p) => p.daysLate);
    const { mean: avgDelay, stdDev } = AnalysisEngine.getStats(delays);

    // Risk factors
    const factors: string[] = [];
    let riskScore = 0;

    if (lateRate > 50) {
      factors.push("High frequency of late payments");
      riskScore += 30;
    }

    if (avgDelay > 15) {
      factors.push("Average delay exceeds 15 days");
      riskScore += 25;
    }

    if (stdDev > avgDelay) {
      factors.push("Inconsistent payment patterns");
      riskScore += 20;
    }

    const trend = AnalysisEngine.detectTrend(
      recentPayments.map((p) => ({
        timestamp: p.date,
        value: p.daysLate,
      }))
    );

    if (trend === Trend.DECLINING) {
      riskScore += 15;
      factors.push("Payment delays are worsening");
    }

    const probability = Math.min(100, riskScore);
    const confidence = Math.max(50, 100 - stdDev);

    return {
      riskLevel: probability > 70 ? RiskLevel.HIGH : probability > 40 ? RiskLevel.MEDIUM : RiskLevel.LOW,
      probability: parseFloat(probability.toFixed(2)),
      confidence: parseFloat(confidence.toFixed(2)),
      factors,
      trend,
    };
  }

  /**
   * Predict churn risk
   */
  predictChurnRisk(contracts: Contract[], feedback: Feedback[], payments: Payment[]): RiskPrediction {
    const factors: string[] = [];
    let riskScore = 0;

    // Contract termination rate
    const terminated = contracts.filter((c) => c.status === "terminated").length;
    const terminationRate = contracts.length > 0 ? (terminated / contracts.length) * 100 : 0;

    if (terminationRate > 30) {
      factors.push("High contract termination rate");
      riskScore += 35;
    }

    // Feedback trend
    if (feedback.length > 0) {
      const trend = AnalysisEngine.detectTrend(
        feedback.map((f) => ({
          timestamp: f.createdAt,
          value: f.rating,
        }))
      );

      if (trend === Trend.DECLINING) {
        factors.push("Declining satisfaction trend");
        riskScore += 30;
      }
    }

    // Payment issues
    const overduePayments = payments.filter((p) => p.status === "overdue").length;
    if (overduePayments > 0) {
      factors.push("Outstanding payment issues");
      riskScore += 20;
    }

    // Recent activity
    const recentContracts = contracts.filter((c) => {
      const daysOld = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysOld < 90;
    });

    if (recentContracts.length === 0) {
      factors.push("No recent activity");
      riskScore += 15;
    }

    const probability = Math.min(100, riskScore);
    const confidence = Math.max(40, 100 - factors.length * 10);

    return {
      riskLevel: probability > 70 ? RiskLevel.HIGH : probability > 40 ? RiskLevel.MEDIUM : RiskLevel.LOW,
      probability: parseFloat(probability.toFixed(2)),
      confidence: parseFloat(confidence.toFixed(2)),
      factors,
    };
  }

  /**
   * Forecast payments
   */
  forecastPayments(payments: Payment[]): PaymentForecast {
    const amounts = payments.map((p) => p.amount);
    const forecast = AnalysisEngine.forecast(amounts, 6);

    return {
      nextSixMonths: forecast,
      totalForecast: forecast.reduce((a, b) => a + b, 0),
      averageMonthly: forecast.length > 0 ? forecast.reduce((a, b) => a + b, 0) / forecast.length : 0,
    };
  }

  /**
   * Calculate composite risk score
   */
  private calculateCompositeRiskScore(
    financial: FinancialAnalysis,
    operational: OperationalAnalysis,
    relationship: RelationshipAnalysis,
    paymentRisk: RiskPrediction,
    churnRisk: RiskPrediction
  ): number {
    return AnalysisEngine.calculateWeightedScore([
      { value: 100 - financial.score, weight: 30 },
      { value: 100 - operational.score, weight: 20 },
      { value: 100 - relationship.score, weight: 20 },
      { value: paymentRisk.probability, weight: 20 },
      { value: churnRisk.probability, weight: 10 },
    ]);
  }

  /**
   * Calculate financial score
   */
  private calculateFinancialScore(onTimeRate: number, overdueAmount: number, avgDelay: number): number {
    let score = 100;
    score -= (100 - onTimeRate) * 0.5;
    score -= Math.min(overdueAmount / 10000, 20);
    score -= Math.min(avgDelay / 30, 15);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate operational score
   */
  private calculateOperationalScore(fillRate: number, terminationRate: number): number {
    let score = 50;
    score += fillRate * 0.5;
    score -= terminationRate * 0.5;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate relationship score
   */
  private calculateRelationshipScore(avgRating: number, replacementRequests: number): number {
    let score = avgRating * 20;
    score -= replacementRequests * 5;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine risk level
   */
  private determineRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 75) return RiskLevel.CRITICAL;
    if (riskScore >= 50) return RiskLevel.HIGH;
    if (riskScore >= 25) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    financial: FinancialAnalysis,
    operational: OperationalAnalysis,
    relationship: RelationshipAnalysis,
    paymentRisk: RiskPrediction,
    churnRisk: RiskPrediction
  ): string[] {
    const recommendations: string[] = [];

    if (financial.score < 50) {
      recommendations.push("Implement stricter payment terms and follow-up procedures");
    }

    if (paymentRisk.probability > 60) {
      recommendations.push("Schedule immediate discussion about payment issues");
    }

    if (operational.score < 50) {
      recommendations.push("Review job requirements and hiring process");
    }

    if (relationship.score < 50) {
      recommendations.push("Conduct relationship review meeting with company");
    }

    if (churnRisk.probability > 70) {
      recommendations.push("Implement retention strategy immediately");
    }

    return recommendations;
  }
}
