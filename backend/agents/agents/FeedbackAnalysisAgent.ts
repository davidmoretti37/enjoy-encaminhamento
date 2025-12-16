/**
 * Feedback Analysis Agent - Analyze feedback patterns and trends
 */

import { BaseAgent, BaseAgentOptions } from "../BaseAgent";
import { AnalysisEngine } from "../utils/AnalysisEngine";
import { AgentResult, AgentStatus, ExecutionContext, Trend } from "../types";

interface Feedback {
  id: string;
  rating: number;
  createdAt: string;
  performance_rating?: number;
  punctuality_rating?: number;
  communication_rating?: number;
  teamwork_rating?: number;
  technical_rating?: number;
  requires_replacement?: boolean;
  comments?: string;
  candidate_id: string;
}

interface FeedbackContext extends ExecutionContext {
  getAffiliateFeedback(affiliateId: string): Promise<Feedback[]>;
}

interface OverallMetrics {
  averagePerformance: number;
  averagePunctuality: number;
  averageCommunication: number;
  averageTeamwork: number;
  averageTechnical: number;
}

interface MonthlyAverage {
  month: string;
  average: number;
}

interface TrendAnalysis {
  overallTrend: Trend;
  monthlyAverages: MonthlyAverage[];
}

interface TopPerformer {
  candidateId: string;
  averageRating: number;
  feedbackCount: number;
}

interface ConcerningCase {
  candidateId: string;
  issue: string;
  rating: number;
}

interface PatternTerm {
  term: string;
  count: number;
}

interface Patterns {
  commonStrengths: PatternTerm[];
  commonIssues: PatternTerm[];
}

interface FeedbackAnalysisReport {
  affiliateId: string;
  period: {
    months: number;
    startDate: Date;
    endDate: Date;
  };
  totalFeedbacks: number;
  overallMetrics: OverallMetrics;
  trends: TrendAnalysis;
  topPerformers: TopPerformer[];
  concerningCases: ConcerningCase[];
  patterns: Patterns;
  insights: string[];
  analyzedAt: string;
}

export class FeedbackAnalysisAgent extends BaseAgent {
  private positiveWords = ["excellent", "great", "good", "strong", "reliable", "professional", "dedicated"];
  private negativeWords = ["poor", "bad", "weak", "unreliable", "unprofessional", "late", "absent"];

  constructor(options: BaseAgentOptions = {}) {
    super({ ...options, name: options.name || "FeedbackAnalysisAgent" });
    this.capabilities = ["analyzeFeedbackTrends"];
  }

  /**
   * Analyze feedback trends
   */
  async analyzeFeedbackTrends(
    params: { affiliateId: string; months?: number },
    context: FeedbackContext
  ): Promise<AgentResult<FeedbackAnalysisReport>> {
    const { affiliateId, months = 6 } = params;
    const startTime = Date.now();

    try {
      this.setStatus(AgentStatus.RUNNING);

      // Get feedback data
      const feedback = await context.getAffiliateFeedback(affiliateId);
      const recentFeedback = this.filterByMonths(feedback, months);

      // Calculate metrics
      const overallMetrics = this.calculateOverallMetrics(recentFeedback);
      const trends = this.analyzeTrends(recentFeedback);
      const topPerformers = this.identifyTopPerformers(recentFeedback);
      const concerningCases = this.identifyConcerningCases(recentFeedback);
      const patterns = this.analyzePatterns(recentFeedback);

      const report: FeedbackAnalysisReport = {
        affiliateId,
        period: {
          months,
          startDate: new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
        totalFeedbacks: recentFeedback.length,
        overallMetrics,
        trends,
        topPerformers,
        concerningCases,
        patterns,
        insights: this.generateInsights(overallMetrics, trends, patterns),
        analyzedAt: new Date().toISOString(),
      };

      this.setStatus(AgentStatus.COMPLETED);
      return AgentResult.success(report, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      return AgentResult.error<FeedbackAnalysisReport>(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private calculateOverallMetrics(feedback: Feedback[]): OverallMetrics {
    if (feedback.length === 0) {
      return {
        averagePerformance: 0,
        averagePunctuality: 0,
        averageCommunication: 0,
        averageTeamwork: 0,
        averageTechnical: 0,
      };
    }

    return {
      averagePerformance:
        feedback.reduce((sum, f) => sum + (f.performance_rating || 0), 0) / feedback.length,
      averagePunctuality:
        feedback.reduce((sum, f) => sum + (f.punctuality_rating || 0), 0) / feedback.length,
      averageCommunication:
        feedback.reduce((sum, f) => sum + (f.communication_rating || 0), 0) / feedback.length,
      averageTeamwork:
        feedback.reduce((sum, f) => sum + (f.teamwork_rating || 0), 0) / feedback.length,
      averageTechnical:
        feedback.reduce((sum, f) => sum + (f.technical_rating || 0), 0) / feedback.length,
    };
  }

  private analyzeTrends(feedback: Feedback[]): TrendAnalysis {
    const performanceRatings = feedback.map((f) => ({
      timestamp: f.createdAt,
      value: f.performance_rating || 0,
    }));
    const trend = AnalysisEngine.detectTrend(performanceRatings);

    // Monthly averages
    const monthlyAverages = this.calculateMonthlyAverages(feedback);

    return {
      overallTrend: trend,
      monthlyAverages,
    };
  }

  private calculateMonthlyAverages(feedback: Feedback[]): MonthlyAverage[] {
    const byMonth: Record<string, number[]> = {};

    for (const f of feedback) {
      const date = new Date(f.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!byMonth[monthKey]) {
        byMonth[monthKey] = [];
      }
      byMonth[monthKey].push(f.performance_rating || 0);
    }

    return Object.entries(byMonth).map(([month, ratings]) => ({
      month,
      average: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    }));
  }

  private identifyTopPerformers(feedback: Feedback[]): TopPerformer[] {
    const byCandidate: Record<string, Feedback[]> = {};

    for (const f of feedback) {
      if (!byCandidate[f.candidate_id]) {
        byCandidate[f.candidate_id] = [];
      }
      byCandidate[f.candidate_id].push(f);
    }

    return Object.entries(byCandidate)
      .map(([candidateId, feedbacks]) => ({
        candidateId,
        averageRating: feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length,
        feedbackCount: feedbacks.length,
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 10);
  }

  private identifyConcerningCases(feedback: Feedback[]): ConcerningCase[] {
    return feedback
      .filter((f) => (f.performance_rating || 0) <= 2.5 || f.requires_replacement)
      .map((f) => ({
        candidateId: f.candidate_id,
        issue: f.requires_replacement ? "Replacement requested" : "Low performance",
        rating: f.performance_rating || 0,
      }))
      .slice(0, 10);
  }

  private analyzePatterns(feedback: Feedback[]): Patterns {
    const strengths: Record<string, number> = {};
    const issues: Record<string, number> = {};

    for (const f of feedback) {
      if (f.comments) {
        const words = f.comments.toLowerCase().split(/\s+/);
        for (const word of words) {
          if (this.positiveWords.includes(word)) {
            strengths[word] = (strengths[word] || 0) + 1;
          } else if (this.negativeWords.includes(word)) {
            issues[word] = (issues[word] || 0) + 1;
          }
        }
      }
    }

    return {
      commonStrengths: Object.entries(strengths)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([term, count]) => ({ term, count })),
      commonIssues: Object.entries(issues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([term, count]) => ({ term, count })),
    };
  }

  private generateInsights(
    metrics: OverallMetrics,
    trends: TrendAnalysis,
    _patterns: Patterns
  ): string[] {
    const insights: string[] = [];

    if (metrics.averagePerformance >= 4) {
      insights.push("Overall performance is strong");
    } else if (metrics.averagePerformance < 3) {
      insights.push("Performance needs improvement");
    }

    if (trends.overallTrend === Trend.IMPROVING) {
      insights.push("Performance is improving over time");
    } else if (trends.overallTrend === Trend.DECLINING) {
      insights.push("Performance is declining - intervention needed");
    }

    return insights;
  }

  private filterByMonths(feedback: Feedback[], months: number): Feedback[] {
    const cutoffDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);
    return feedback.filter((f) => new Date(f.createdAt) >= cutoffDate);
  }
}
