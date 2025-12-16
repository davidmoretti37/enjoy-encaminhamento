/**
 * School Performance Agent - Educational partner analysis and ranking
 */

import { BaseAgent, BaseAgentOptions } from "../BaseAgent";
import { AnalysisEngine } from "../utils/AnalysisEngine";
import { AgentResult, AgentStatus, ExecutionContext, StatisticsResult } from "../types";

interface School {
  id: string;
  name: string;
}

interface Candidate {
  id: string;
  fullName?: string;
  skills?: string[];
  educationLevel?: string;
  city?: string;
  status?: string;
}

interface Contract {
  id: string;
  status: string;
  candidate_id: string;
}

interface Feedback {
  id: string;
  rating: number;
  candidate_id: string;
}

interface SchoolContext extends ExecutionContext {
  getSchool(schoolId: string): Promise<School>;
  getSchoolCandidates(schoolId: string): Promise<Candidate[]>;
  getSchoolContracts(schoolId: string): Promise<Contract[]>;
  getSchoolFeedback(schoolId: string): Promise<Feedback[]>;
}

interface CandidateMetrics {
  totalCandidates: number;
  activeCandidates: number;
  profileCompleteness: number;
}

interface PlacementMetrics {
  totalCandidates: number;
  placedCandidates: number;
  placementRate: number;
}

interface QualityMetrics {
  averageFeedbackRating: number;
  contractCompletionRate: number;
}

interface SchoolPerformanceReport {
  schoolId: string;
  schoolName: string;
  overallScore: number;
  candidateMetrics: CandidateMetrics;
  placementMetrics: PlacementMetrics;
  qualityMetrics: QualityMetrics;
  topPerformers: Candidate[];
  areasOfExcellence: string[];
  areasForImprovement: string[];
  analyzedAt: string;
}

export class SchoolPerformanceAgent extends BaseAgent {
  constructor(options: BaseAgentOptions = {}) {
    super({ ...options, name: options.name || "SchoolPerformanceAgent" });
    this.capabilities = ["analyzeSchoolPerformance"];
  }

  /**
   * Analyze school performance
   */
  async analyzeSchoolPerformance(
    params: { schoolId: string },
    context: SchoolContext
  ): Promise<AgentResult<SchoolPerformanceReport>> {
    const { schoolId } = params;
    const startTime = Date.now();

    try {
      this.setStatus(AgentStatus.RUNNING);

      // Get school data
      const school = await context.getSchool(schoolId);
      const candidates = await context.getSchoolCandidates(schoolId);
      const contracts = await context.getSchoolContracts(schoolId);
      const feedback = await context.getSchoolFeedback(schoolId);

      // Calculate metrics
      const candidateMetrics = this.calculateCandidateMetrics(candidates);
      const placementMetrics = this.calculatePlacementMetrics(candidates, contracts);
      const qualityMetrics = this.calculateQualityMetrics(contracts, feedback);

      // Identify top performers and issues
      const topPerformers = this.identifyTopPerformers(candidates, feedback);
      const areasOfExcellence = this.identifyStrengths(qualityMetrics);
      const areasForImprovement = this.identifyWeaknesses(qualityMetrics);

      const report: SchoolPerformanceReport = {
        schoolId: school.id,
        schoolName: school.name,
        overallScore: this.calculateOverallScore(
          candidateMetrics,
          placementMetrics,
          qualityMetrics
        ),
        candidateMetrics,
        placementMetrics,
        qualityMetrics,
        topPerformers,
        areasOfExcellence,
        areasForImprovement,
        analyzedAt: new Date().toISOString(),
      };

      this.setStatus(AgentStatus.COMPLETED);
      return AgentResult.success(report, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      return AgentResult.error<SchoolPerformanceReport>(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private calculateCandidateMetrics(candidates: Candidate[]): CandidateMetrics {
    return {
      totalCandidates: candidates.length,
      activeCandidates: candidates.filter((c) => c.status === "active").length,
      profileCompleteness: this.calculateProfileCompleteness(candidates),
    };
  }

  private calculatePlacementMetrics(candidates: Candidate[], contracts: Contract[]): PlacementMetrics {
    const placed = candidates.filter((c) =>
      contracts.some((ct) => ct.candidate_id === c.id)
    ).length;
    return {
      totalCandidates: candidates.length,
      placedCandidates: placed,
      placementRate: candidates.length > 0 ? (placed / candidates.length) * 100 : 0,
    };
  }

  private calculateQualityMetrics(contracts: Contract[], feedback: Feedback[]): QualityMetrics {
    const avgRating =
      feedback.length > 0
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
        : 0;

    return {
      averageFeedbackRating: avgRating,
      contractCompletionRate: this.calculateCompletionRate(contracts),
    };
  }

  private calculateProfileCompleteness(candidates: Candidate[]): number {
    if (candidates.length === 0) return 0;
    const completeness = candidates.map((c) => {
      let complete = 0;
      if (c.fullName) complete++;
      if (c.skills && c.skills.length > 0) complete++;
      if (c.educationLevel) complete++;
      if (c.city) complete++;
      return (complete / 4) * 100;
    });
    return completeness.reduce((a, b) => a + b, 0) / candidates.length;
  }

  private calculateCompletionRate(contracts: Contract[]): number {
    if (contracts.length === 0) return 0;
    const completed = contracts.filter((c) => c.status === "completed").length;
    return (completed / contracts.length) * 100;
  }

  private identifyTopPerformers(candidates: Candidate[], feedback: Feedback[]): Candidate[] {
    return candidates
      .filter((c) => feedback.some((f) => f.candidate_id === c.id && f.rating >= 4.5))
      .slice(0, 5);
  }

  private identifyStrengths(qualityMetrics: QualityMetrics): string[] {
    const strengths: string[] = [];
    if (qualityMetrics.averageFeedbackRating >= 4) {
      strengths.push("High quality candidates");
    }
    if (qualityMetrics.contractCompletionRate >= 80) {
      strengths.push("Strong contract completion rate");
    }
    return strengths;
  }

  private identifyWeaknesses(qualityMetrics: QualityMetrics): string[] {
    const weaknesses: string[] = [];
    if (qualityMetrics.averageFeedbackRating < 3) {
      weaknesses.push("Low feedback ratings");
    }
    if (qualityMetrics.contractCompletionRate < 60) {
      weaknesses.push("High contract termination rate");
    }
    return weaknesses;
  }

  private calculateOverallScore(
    candidateMetrics: CandidateMetrics,
    placementMetrics: PlacementMetrics,
    qualityMetrics: QualityMetrics
  ): number {
    return AnalysisEngine.calculateWeightedScore([
      { value: placementMetrics.placementRate, weight: 0.4 },
      { value: qualityMetrics.averageFeedbackRating * 20, weight: 0.4 },
      { value: qualityMetrics.contractCompletionRate, weight: 0.2 },
    ]);
  }
}
