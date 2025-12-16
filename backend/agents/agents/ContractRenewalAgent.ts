/**
 * Contract Renewal Agent - Predict and manage contract renewals
 */

import { BaseAgent, BaseAgentOptions } from "../BaseAgent";
import { AnalysisEngine } from "../utils/AnalysisEngine";
import { AgentResult, AgentStatus, ExecutionContext, Trend } from "../types";

interface Contract {
  id: string;
  status: string;
  duration: number;
  startDate: string;
  endDate: string;
}

interface Feedback {
  id: string;
  rating: number;
  createdAt: string;
  recommend_continuation?: boolean;
}

interface Payment {
  id: string;
  amount: number;
  status: string;
}

interface ContractRenewalContext extends ExecutionContext {
  getContract(contractId: string): Promise<Contract>;
  getContractFeedback(contractId: string): Promise<Feedback[]>;
  getContractPayments(contractId: string): Promise<Payment[]>;
}

interface FeedbackAnalysis {
  averageRating: number;
  trend: Trend | "unknown";
  recommendContinuation: boolean;
  totalFeedbacks: number;
}

interface PaymentHealth {
  onTimeRate: number;
  currentOverdue: number;
  totalPayments: number;
}

interface ContractHistory {
  duration: number;
  startDate: string;
  endDate: string;
  daysUntilEnd: number;
}

type RenewalStrategy = "proactive_renew" | "address_concerns" | "prepare_replacement" | "let_expire";

interface RenewalPrediction {
  contractId: string;
  renewalProbability: number;
  confidence: number;
  feedbackAnalysis: FeedbackAnalysis;
  paymentHealth: PaymentHealth;
  strategy: RenewalStrategy;
  recommendedActions: string[];
  predictedAt: string;
}

export class ContractRenewalAgent extends BaseAgent {
  constructor(options: BaseAgentOptions = {}) {
    super({ ...options, name: options.name || "ContractRenewalAgent" });
    this.capabilities = ["predictContractRenewal"];
  }

  /**
   * Predict contract renewal probability
   */
  async predictContractRenewal(
    params: { contractId: string },
    context: ContractRenewalContext
  ): Promise<AgentResult<RenewalPrediction>> {
    const { contractId } = params;
    const startTime = Date.now();

    try {
      this.setStatus(AgentStatus.RUNNING);

      // Get contract data
      const contract = await context.getContract(contractId);
      const feedback = await context.getContractFeedback(contractId);
      const payments = await context.getContractPayments(contractId);

      // Analyze factors
      const feedbackAnalysis = this.analyzeFeedbackForRenewal(feedback);
      const paymentHealth = this.analyzePaymentHealth(payments);
      const contractHistory = this.analyzeContractHistory(contract);

      // Calculate renewal probability
      const renewalProbability = this.calculateRenewalProbability(
        feedbackAnalysis,
        paymentHealth,
        contractHistory
      );

      // Generate strategy
      const strategy = this.generateRenewalStrategy(
        renewalProbability,
        feedbackAnalysis,
        paymentHealth
      );

      const prediction: RenewalPrediction = {
        contractId: contract.id,
        renewalProbability,
        confidence: this.calculateConfidence(feedbackAnalysis, paymentHealth),
        feedbackAnalysis,
        paymentHealth,
        strategy,
        recommendedActions: this.generateActions(renewalProbability, strategy),
        predictedAt: new Date().toISOString(),
      };

      this.setStatus(AgentStatus.COMPLETED);
      return AgentResult.success(prediction, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      return AgentResult.error<RenewalPrediction>(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private analyzeFeedbackForRenewal(feedback: Feedback[]): FeedbackAnalysis {
    if (feedback.length === 0) {
      return { averageRating: 0, trend: "unknown", recommendContinuation: false, totalFeedbacks: 0 };
    }

    const ratings = feedback.map((f) => f.rating);
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const trend = AnalysisEngine.detectTrend(
      feedback.map((f) => ({ timestamp: f.createdAt, value: f.rating }))
    );

    const recommendContinuation = feedback.some((f) => f.recommend_continuation);

    return {
      averageRating: avgRating,
      trend,
      recommendContinuation,
      totalFeedbacks: feedback.length,
    };
  }

  private analyzePaymentHealth(payments: Payment[]): PaymentHealth {
    if (payments.length === 0) {
      return { onTimeRate: 100, currentOverdue: 0, totalPayments: 0 };
    }

    const onTime = payments.filter((p) => p.status === "paid").length;
    const onTimeRate = (onTime / payments.length) * 100;
    const overdue = payments.filter((p) => p.status === "overdue");
    const currentOverdue = overdue.reduce((sum, p) => sum + p.amount, 0);

    return {
      onTimeRate,
      currentOverdue,
      totalPayments: payments.length,
    };
  }

  private analyzeContractHistory(contract: Contract): ContractHistory {
    return {
      duration: contract.duration,
      startDate: contract.startDate,
      endDate: contract.endDate,
      daysUntilEnd: Math.ceil(
        (new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
    };
  }

  private calculateRenewalProbability(
    feedback: FeedbackAnalysis,
    payment: PaymentHealth,
    _history: ContractHistory
  ): number {
    let probability = 50;

    // Feedback impact
    if (feedback.averageRating >= 4.5) probability += 25;
    else if (feedback.averageRating < 3) probability -= 25;

    // Trend impact
    if (feedback.trend === Trend.IMPROVING) probability += 15;
    else if (feedback.trend === Trend.DECLINING) probability -= 20;

    // Payment impact
    if (payment.onTimeRate >= 95) probability += 15;
    else if (payment.currentOverdue > 0) probability -= 20;

    // Recommendation
    if (feedback.recommendContinuation) probability += 20;

    return Math.max(0, Math.min(100, probability));
  }

  private calculateConfidence(feedback: FeedbackAnalysis, payment: PaymentHealth): number {
    let confidence = 50;
    if (feedback.totalFeedbacks >= 5) confidence += 20;
    if (payment.totalPayments >= 5) confidence += 20;
    return Math.min(100, confidence);
  }

  private generateRenewalStrategy(
    probability: number,
    _feedback: FeedbackAnalysis,
    _payment: PaymentHealth
  ): RenewalStrategy {
    if (probability >= 75) return "proactive_renew";
    if (probability >= 50) return "address_concerns";
    if (probability >= 25) return "prepare_replacement";
    return "let_expire";
  }

  private generateActions(probability: number, strategy: RenewalStrategy): string[] {
    const actions: string[] = [];

    switch (strategy) {
      case "proactive_renew":
        actions.push("Schedule renewal discussion immediately");
        actions.push("Prepare renewal proposal");
        break;
      case "address_concerns":
        actions.push("Identify and address main concerns");
        actions.push("Schedule improvement meeting");
        break;
      case "prepare_replacement":
        actions.push("Begin searching for replacement candidates");
        actions.push("Prepare transition plan");
        break;
      case "let_expire":
        actions.push("Plan contract end date");
        actions.push("Prepare exit documentation");
        break;
    }

    return actions;
  }
}
