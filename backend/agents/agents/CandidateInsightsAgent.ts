/**
 * Enhanced Candidate Insights Agent - ML-powered candidate analysis
 *
 * Features:
 * - Predictive performance scoring
 * - Career trajectory forecasting
 * - Skill gap analysis
 * - Attrition risk prediction
 * - Performance trend analysis
 * - Development recommendations
 */

import { BaseAgent, BaseAgentOptions } from "../BaseAgent";
import { AnalysisEngine } from "../utils/AnalysisEngine";
import {
  AgentResult,
  AgentStatus,
  ExecutionContext,
  RiskLevel,
  StatisticsResult,
  Trend,
} from "../types";

// Types
interface Candidate {
  id: string;
  fullName: string;
  skills?: string[];
  educationLevel?: string;
  industry?: string;
  city?: string;
}

interface Contract {
  id: string;
  status: string;
  duration: number;
  startDate: string;
  endDate: string;
  company_id?: string;
  job_title?: string;
}

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
  candidate_id?: string;
}

interface Application {
  id: string;
  status: string;
}

interface CandidateInsightsContext extends ExecutionContext {
  getCandidate(candidateId: string): Promise<Candidate>;
  getCandidateContracts(candidateId: string): Promise<Contract[]>;
  getCandidateFeedback(candidateId: string): Promise<Feedback[]>;
  getCandidateApplications(candidateId: string): Promise<Application[]>;
}

interface PerformanceAnalysis {
  score: number;
  ratings: Record<string, StatisticsResult>;
  trends: Record<string, Trend>;
  overallTrend: Trend;
  consistency: number;
  strengths: string[];
  weaknesses: string[];
}

interface CareerAnalysis {
  yearsOfExperience: number;
  totalCompanies: number;
  totalRoles: number;
  roles: string[];
  progression: string;
  completedContracts: number;
  terminatedContracts: number;
  completionRate: number;
  averageContractDuration: number;
  contractDurationStats: StatisticsResult;
}

interface StabilityAnalysis {
  score: number;
  level: string;
  pattern: string;
  riskFactors: string[];
  averageDuration: number;
  durationVariability: number;
}

interface SkillAnalysis {
  declaredSkills: string[];
  mentionedSkills: string[];
  skillGaps: string[];
  proficiency: {
    bySkill: Record<string, number>;
    average: number;
  };
  recommendedDevelopment: string[];
}

interface PerformancePrediction {
  predictedScore: number;
  confidence: number;
  trend: Trend | "unknown";
  forecast?: number[];
}

interface AttritionRisk {
  riskLevel: RiskLevel;
  probability: number;
  confidence: number;
  factors: string[];
}

interface CareerTrajectory {
  currentLevel: string;
  projectedLevel: string;
  yearsToNextLevel: number | "unknown";
  potentialRoles: string[];
}

interface CandidateInsightsReport {
  candidateId: string;
  candidateName: string;
  employabilityScore: number;
  growthPotential: number;
  performanceAnalysis: PerformanceAnalysis;
  careerAnalysis: CareerAnalysis;
  stabilityAnalysis: StabilityAnalysis;
  skillAnalysis: SkillAnalysis;
  predictions: {
    performancePrediction: PerformancePrediction;
    attritionRisk: AttritionRisk;
    careerTrajectory: CareerTrajectory;
  };
  recommendations: string[];
  analyzedAt: string;
}

export class EnhancedCandidateInsightsAgent extends BaseAgent {
  constructor(options: BaseAgentOptions = {}) {
    super({
      ...options,
      name: options.name || "EnhancedCandidateInsightsAgent",
    });
    this.capabilities = [
      "getCandidateInsightsAdvanced",
      "analyzePerformance",
      "predictAttritionRisk",
      "forecastCareerTrajectory",
    ];
  }

  /**
   * Get comprehensive candidate insights with ML analysis
   */
  async getCandidateInsightsAdvanced(
    params: { candidateId: string },
    context: CandidateInsightsContext
  ): Promise<AgentResult<CandidateInsightsReport>> {
    const { candidateId } = params;
    const startTime = Date.now();

    try {
      this.setStatus(AgentStatus.RUNNING);

      // Fetch candidate data
      const candidate = await context.getCandidate(candidateId);
      const contracts = await context.getCandidateContracts(candidateId);
      const feedback = await context.getCandidateFeedback(candidateId);

      // Comprehensive analysis
      const performanceAnalysis = this.analyzePerformanceAdvanced(feedback);
      const careerAnalysis = this.analyzeCareerAdvanced(contracts);
      const stabilityAnalysis = this.analyzeStabilityAdvanced(contracts);
      const skillAnalysis = this.analyzeSkillsAdvanced(candidate, feedback);

      // Predictive models
      const performancePrediction = this.predictFuturePerformance(feedback);
      const attritionRisk = this.predictAttritionRisk(contracts, feedback);
      const careerTrajectory = this.forecastCareerTrajectory(contracts);

      // Composite scores
      const employabilityScore = this.calculateEmployabilityScore(
        performanceAnalysis,
        stabilityAnalysis,
        skillAnalysis
      );

      const growthPotential = this.calculateGrowthPotential(
        performanceAnalysis,
        careerAnalysis,
        performancePrediction
      );

      const insights: CandidateInsightsReport = {
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        employabilityScore,
        growthPotential,
        performanceAnalysis,
        careerAnalysis,
        stabilityAnalysis,
        skillAnalysis,
        predictions: {
          performancePrediction,
          attritionRisk,
          careerTrajectory,
        },
        recommendations: this.generateDevelopmentPlan(
          performanceAnalysis,
          skillAnalysis,
          attritionRisk
        ),
        analyzedAt: new Date().toISOString(),
      };

      this.setStatus(AgentStatus.COMPLETED);
      const duration = Date.now() - startTime;

      return AgentResult.success(insights, duration);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return AgentResult.error<CandidateInsightsReport>(errorMessage);
    }
  }

  /**
   * Advanced performance analysis
   */
  private analyzePerformanceAdvanced(feedback: Feedback[]): PerformanceAnalysis {
    if (feedback.length === 0) {
      return {
        score: 50,
        ratings: {},
        trends: {},
        overallTrend: Trend.STABLE,
        consistency: 0,
        strengths: [],
        weaknesses: [],
      };
    }

    // Extract individual ratings
    const ratingKeys = ["performance", "punctuality", "communication", "teamwork", "technical"];
    const ratings: Record<string, number[]> = {};

    for (const key of ratingKeys) {
      ratings[key] = feedback.map((f) => (f as Record<string, number>)[`${key}_rating`] || 0);
    }

    // Calculate statistics for each rating type
    const ratingStats: Record<string, StatisticsResult> = {};
    for (const [key, values] of Object.entries(ratings)) {
      ratingStats[key] = AnalysisEngine.getStats(values);
    }

    // Detect trends
    const trends: Record<string, Trend> = {};
    for (const [key, values] of Object.entries(ratings)) {
      trends[key] = AnalysisEngine.detectTrend(
        feedback.map((f, i) => ({
          timestamp: f.createdAt,
          value: values[i],
        }))
      );
    }

    // Calculate consistency
    const allRatings = Object.values(ratings).flat();
    const consistency = 100 - AnalysisEngine.getStats(allRatings).stdDev * 5;

    // Overall trend
    const overallTrend = AnalysisEngine.detectTrend(
      feedback.map((f) => ({
        timestamp: f.createdAt,
        value: f.performance_rating || 0,
      }))
    );

    // Identify strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const [key, stats] of Object.entries(ratingStats)) {
      if (stats.mean >= 4.5) {
        strengths.push(`${this.formatRatingKey(key)}: ${stats.mean.toFixed(1)}/5`);
      } else if (stats.mean <= 2.5) {
        weaknesses.push(`${this.formatRatingKey(key)}: ${stats.mean.toFixed(1)}/5`);
      }
    }

    const overallScore = AnalysisEngine.calculateWeightedScore([
      { value: ratingStats.performance?.mean * 20 || 0, weight: 0.3 },
      { value: ratingStats.teamwork?.mean * 20 || 0, weight: 0.25 },
      { value: ratingStats.technical?.mean * 20 || 0, weight: 0.25 },
      { value: ratingStats.communication?.mean * 20 || 0, weight: 0.1 },
      { value: ratingStats.punctuality?.mean * 20 || 0, weight: 0.1 },
    ]);

    return {
      score: overallScore,
      ratings: ratingStats,
      trends,
      overallTrend,
      consistency: Math.max(0, Math.min(100, consistency)),
      strengths,
      weaknesses,
    };
  }

  /**
   * Advanced career analysis
   */
  private analyzeCareerAdvanced(contracts: Contract[]): CareerAnalysis {
    if (contracts.length === 0) {
      return {
        yearsOfExperience: 0,
        totalCompanies: 0,
        totalRoles: 0,
        roles: [],
        progression: "entry_level",
        completedContracts: 0,
        terminatedContracts: 0,
        completionRate: 0,
        averageContractDuration: 0,
        contractDurationStats: { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, count: 0 },
      };
    }

    const sortedContracts = [...contracts].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // Calculate experience
    const startDate = new Date(sortedContracts[0].startDate);
    const endDate = new Date(sortedContracts[sortedContracts.length - 1].endDate);
    const yearsOfExperience = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    // Analyze contract durations
    const durations = contracts.map((c) => c.duration);
    const durationStats = AnalysisEngine.getStats(durations);

    // Determine progression
    let progression = "entry_level";
    if (yearsOfExperience > 5) progression = "mid_level";
    if (yearsOfExperience > 10) progression = "senior_level";
    if (yearsOfExperience > 15) progression = "expert_level";

    // Analyze role progression
    const roles = contracts.map((c) => c.job_title).filter(Boolean) as string[];
    const uniqueRoles = [...new Set(roles)];

    // Completion analysis
    const completed = contracts.filter((c) => c.status === "completed").length;
    const terminated = contracts.filter((c) => c.status === "terminated").length;
    const completionRate = (completed / contracts.length) * 100;

    return {
      yearsOfExperience: parseFloat(yearsOfExperience.toFixed(1)),
      totalCompanies: new Set(contracts.map((c) => c.company_id)).size,
      totalRoles: uniqueRoles.length,
      roles: uniqueRoles,
      progression,
      completedContracts: completed,
      terminatedContracts: terminated,
      completionRate: parseFloat(completionRate.toFixed(2)),
      averageContractDuration: parseFloat(durationStats.mean.toFixed(1)),
      contractDurationStats: durationStats,
    };
  }

  /**
   * Advanced stability analysis
   */
  private analyzeStabilityAdvanced(contracts: Contract[]): StabilityAnalysis {
    if (contracts.length === 0) {
      return {
        score: 50,
        level: "unknown",
        pattern: "insufficient_data",
        riskFactors: [],
        averageDuration: 0,
        durationVariability: 0,
      };
    }

    const durations = contracts.map((c) => c.duration);
    const { mean, stdDev } = AnalysisEngine.getStats(durations);

    // Stability score based on consistency and duration
    let score = 50;
    if (mean > 12) score += 30;
    else if (mean > 6) score += 15;

    // Penalize high variance
    score -= Math.min(stdDev * 2, 20);

    // Check for recent terminations
    const recentContracts = contracts.slice(-3);
    const recentTerminations = recentContracts.filter((c) => c.status === "terminated").length;
    if (recentTerminations > 1) score -= 20;

    // Determine stability level
    let level = "low";
    if (score >= 70) level = "high";
    else if (score >= 50) level = "medium";

    // Identify patterns
    let pattern = "stable";
    if (stdDev > mean * 0.5) pattern = "variable";
    if (recentTerminations > 0) pattern = "declining";

    const riskFactors: string[] = [];
    if (stdDev > mean) riskFactors.push("Highly variable contract durations");
    if (recentTerminations > 0) riskFactors.push("Recent contract terminations");
    if (mean < 3) riskFactors.push("Short average contract duration");

    return {
      score: Math.max(0, Math.min(100, score)),
      level,
      pattern,
      riskFactors,
      averageDuration: parseFloat(mean.toFixed(1)),
      durationVariability: parseFloat(stdDev.toFixed(1)),
    };
  }

  /**
   * Advanced skills analysis
   */
  private analyzeSkillsAdvanced(candidate: Candidate, feedback: Feedback[]): SkillAnalysis {
    const skills = candidate.skills || [];

    // Extract mentioned skills from feedback
    const mentionedSkills = this.extractSkillsFromFeedback(feedback);

    // Identify skill gaps
    const skillGaps: string[] = [];
    const commonSkills = this.getCommonSkillsInIndustry(candidate.industry || "");

    for (const skill of commonSkills) {
      if (!skills.includes(skill) && !mentionedSkills.has(skill)) {
        skillGaps.push(skill);
      }
    }

    // Skill proficiency estimation
    const skillProficiency = this.estimateSkillProficiency(skills, feedback);

    return {
      declaredSkills: skills,
      mentionedSkills: Array.from(mentionedSkills),
      skillGaps: skillGaps.slice(0, 5),
      proficiency: skillProficiency,
      recommendedDevelopment: this.recommendSkillDevelopment(skillGaps),
    };
  }

  /**
   * Predict future performance
   */
  private predictFuturePerformance(feedback: Feedback[]): PerformancePrediction {
    if (feedback.length < 2) {
      return {
        predictedScore: 50,
        confidence: 30,
        trend: "unknown",
      };
    }

    const ratings = feedback.map((f) => f.performance_rating || 0);
    const forecast = AnalysisEngine.forecast(ratings, 3);

    const trend = AnalysisEngine.detectTrend(
      feedback.map((f) => ({
        timestamp: f.createdAt,
        value: f.performance_rating || 0,
      }))
    );

    const predictedScore = forecast.length > 0 ? forecast[0] * 20 : 50;
    const confidence = 60 + Math.abs(forecast[0] - ratings[ratings.length - 1]) * 5;

    return {
      predictedScore: Math.min(100, Math.max(0, predictedScore)),
      confidence: Math.min(100, confidence),
      trend,
      forecast: forecast.map((f) => f * 20),
    };
  }

  /**
   * Predict attrition risk
   */
  private predictAttritionRisk(contracts: Contract[], feedback: Feedback[]): AttritionRisk {
    const factors: string[] = [];
    let riskScore = 0;

    // Contract termination pattern
    const terminated = contracts.filter((c) => c.status === "terminated").length;
    const terminationRate = contracts.length > 0 ? (terminated / contracts.length) * 100 : 0;

    if (terminationRate > 40) {
      factors.push("High contract termination rate");
      riskScore += 35;
    }

    // Recent termination
    const recentContracts = contracts.slice(-2);
    const recentTerminations = recentContracts.filter((c) => c.status === "terminated").length;

    if (recentTerminations > 0) {
      factors.push("Recent contract termination");
      riskScore += 25;
    }

    // Performance trend
    if (feedback.length > 0) {
      const trend = AnalysisEngine.detectTrend(
        feedback.map((f) => ({
          timestamp: f.createdAt,
          value: f.performance_rating || 0,
        }))
      );

      if (trend === Trend.DECLINING) {
        factors.push("Declining performance trend");
        riskScore += 25;
      }
    }

    // Replacement requests
    const replacementRequests = feedback.filter((f) => f.requires_replacement).length;
    if (replacementRequests > 0) {
      factors.push("Replacement requests from companies");
      riskScore += 15;
    }

    const probability = Math.min(100, riskScore);
    const confidence = Math.max(40, 100 - factors.length * 15);

    return {
      riskLevel: probability > 70 ? RiskLevel.HIGH : probability > 40 ? RiskLevel.MEDIUM : RiskLevel.LOW,
      probability: parseFloat(probability.toFixed(2)),
      confidence: parseFloat(confidence.toFixed(2)),
      factors,
    };
  }

  /**
   * Forecast career trajectory
   */
  private forecastCareerTrajectory(contracts: Contract[]): CareerTrajectory {
    if (contracts.length === 0) {
      return {
        currentLevel: "entry_level",
        projectedLevel: "entry_level",
        yearsToNextLevel: "unknown",
        potentialRoles: [],
      };
    }

    const durations = contracts.map((c) => c.duration);

    // Estimate current level based on experience
    const totalMonths = durations.reduce((a, b) => a + b, 0);
    let currentLevel = "entry_level";
    if (totalMonths > 60) currentLevel = "mid_level";
    if (totalMonths > 120) currentLevel = "senior_level";

    // Project next level
    let nextLevel = "mid_level";
    let yearsToNextLevel = 2;

    if (currentLevel === "entry_level") {
      nextLevel = "mid_level";
      yearsToNextLevel = Math.max(1, 3 - totalMonths / 12);
    } else if (currentLevel === "mid_level") {
      nextLevel = "senior_level";
      yearsToNextLevel = Math.max(2, 5 - totalMonths / 12);
    }

    return {
      currentLevel,
      projectedLevel: nextLevel,
      yearsToNextLevel: parseFloat(yearsToNextLevel.toFixed(1)),
      potentialRoles: this.suggestPotentialRoles(currentLevel),
    };
  }

  /**
   * Calculate employability score
   */
  private calculateEmployabilityScore(
    performance: PerformanceAnalysis,
    stability: StabilityAnalysis,
    skills: SkillAnalysis
  ): number {
    return AnalysisEngine.calculateWeightedScore([
      { value: performance.score, weight: 0.4 },
      { value: stability.score, weight: 0.3 },
      { value: skills.proficiency.average * 20, weight: 0.3 },
    ]);
  }

  /**
   * Calculate growth potential
   */
  private calculateGrowthPotential(
    performance: PerformanceAnalysis,
    career: CareerAnalysis,
    prediction: PerformancePrediction
  ): number {
    let score = 50;

    // Performance trend
    if (performance.overallTrend === Trend.IMPROVING) score += 20;
    else if (performance.overallTrend === Trend.DECLINING) score -= 20;

    // Career progression
    if (career.progression === "entry_level") score += 25;
    else if (career.progression === "mid_level") score += 15;

    // Predicted performance
    if (prediction.trend === Trend.IMPROVING) score += 15;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate development plan
   */
  private generateDevelopmentPlan(
    performance: PerformanceAnalysis,
    skills: SkillAnalysis,
    attritionRisk: AttritionRisk
  ): string[] {
    const recommendations: string[] = [];

    // Based on weaknesses
    for (const weakness of performance.weaknesses) {
      recommendations.push(`Improve ${weakness.split(":")[0].toLowerCase()}`);
    }

    // Based on skill gaps
    for (const gap of skills.skillGaps.slice(0, 3)) {
      recommendations.push(`Develop ${gap} skills`);
    }

    // Based on attrition risk
    if (attritionRisk.probability > 60) {
      recommendations.push("Discuss career growth opportunities");
    }

    return recommendations;
  }

  /**
   * Helper: Format rating key
   */
  private formatRatingKey(key: string): string {
    return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Helper: Extract skills from feedback
   */
  private extractSkillsFromFeedback(feedback: Feedback[]): Set<string> {
    const skills = new Set<string>();
    const commonSkillKeywords = [
      "javascript",
      "python",
      "react",
      "node",
      "sql",
      "communication",
      "leadership",
      "problem-solving",
      "excel",
      "word",
    ];

    for (const f of feedback) {
      for (const keyword of commonSkillKeywords) {
        if (f.comments?.toLowerCase().includes(keyword)) {
          skills.add(keyword);
        }
      }
    }

    return skills;
  }

  /**
   * Helper: Get common skills in industry
   */
  private getCommonSkillsInIndustry(industry: string): string[] {
    const skillsByIndustry: Record<string, string[]> = {
      technology: ["JavaScript", "Python", "Cloud", "DevOps", "SQL"],
      finance: ["Excel", "Analysis", "Compliance", "Risk Management"],
      healthcare: ["Patient Care", "Documentation", "Communication"],
      administrative: ["Excel", "Word", "PowerPoint", "Communication", "Organization"],
    };

    return skillsByIndustry[industry] || skillsByIndustry.administrative;
  }

  /**
   * Helper: Estimate skill proficiency
   */
  private estimateSkillProficiency(
    skills: string[],
    feedback: Feedback[]
  ): { bySkill: Record<string, number>; average: number } {
    const proficiency: Record<string, number> = {};
    let totalScore = 0;

    for (const skill of skills) {
      let score = 50;
      for (const f of feedback) {
        if (f.comments?.toLowerCase().includes(skill.toLowerCase())) {
          score += (f.technical_rating || 3) * 10;
        }
      }
      proficiency[skill] = Math.min(100, score);
      totalScore += proficiency[skill];
    }

    return {
      bySkill: proficiency,
      average: skills.length > 0 ? totalScore / skills.length : 50,
    };
  }

  /**
   * Helper: Recommend skill development
   */
  private recommendSkillDevelopment(gaps: string[]): string[] {
    return gaps.map((gap) => `Recommend training in ${gap}`);
  }

  /**
   * Helper: Suggest potential roles
   */
  private suggestPotentialRoles(level: string): string[] {
    const rolesByLevel: Record<string, string[]> = {
      entry_level: ["Junior Developer", "Support Specialist", "Analyst"],
      mid_level: ["Senior Developer", "Team Lead", "Specialist"],
      senior_level: ["Manager", "Architect", "Director"],
    };

    return rolesByLevel[level] || [];
  }
}
