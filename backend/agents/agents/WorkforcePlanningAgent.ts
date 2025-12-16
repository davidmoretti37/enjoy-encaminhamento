/**
 * Workforce Planning Agent - Strategic workforce forecasting and planning
 */

import { BaseAgent, BaseAgentOptions } from "../BaseAgent";
import { AnalysisEngine } from "../utils/AnalysisEngine";
import { AgentResult, AgentStatus, ExecutionContext, Trend } from "../types";

interface Job {
  id: string;
  status: string;
  createdAt: string;
}

interface Contract {
  id: string;
  status: string;
  startDate: string;
}

interface Candidate {
  id: string;
  status: string;
}

interface WorkforceContext extends ExecutionContext {
  getAffiliateJobs(affiliateId: string): Promise<Job[]>;
  getAffiliateContracts(affiliateId: string): Promise<Contract[]>;
  getAffiliateCandidates(affiliateId: string): Promise<Candidate[]>;
}

interface WorkforceReport {
  affiliateId: string;
  forecastPeriodMonths: number;
  currentState: {
    openJobs: number;
    activeContracts: number;
    candidates: number;
  };
  trends: {
    jobTrend: Trend;
    contractTrend: Trend;
  };
  forecasts: {
    demandForecast: number[];
    supplyForecast: number[];
    gaps: number[];
  };
  recommendations: string[];
  generatedAt: string;
}

export class WorkforcePlanningAgent extends BaseAgent {
  constructor(options: BaseAgentOptions = {}) {
    super({ ...options, name: options.name || "WorkforcePlanningAgent" });
    this.capabilities = ["forecastWorkforceNeeds"];
  }

  /**
   * Forecast workforce needs
   */
  async forecastWorkforceNeeds(
    params: { affiliateId: string; months?: number },
    context: WorkforceContext
  ): Promise<AgentResult<WorkforceReport>> {
    const { affiliateId, months = 12 } = params;
    const startTime = Date.now();

    try {
      this.setStatus(AgentStatus.RUNNING);

      // Get historical data
      const jobs = await context.getAffiliateJobs(affiliateId);
      const contracts = await context.getAffiliateContracts(affiliateId);
      const candidates = await context.getAffiliateCandidates(affiliateId);

      // Analyze trends
      const jobTrend = AnalysisEngine.detectTrend(
        jobs.map((j) => ({
          timestamp: j.createdAt,
          value: j.status === "open" ? 1 : 0,
        }))
      );

      const contractTrend = AnalysisEngine.detectTrend(
        contracts.map((c) => ({
          timestamp: c.startDate,
          value: c.status === "active" ? 1 : 0,
        }))
      );

      // Forecast demand
      const openJobs = jobs.filter((j) => j.status === "open").length;
      const activeContracts = contracts.filter((c) => c.status === "active").length;

      const demandForecast = AnalysisEngine.forecast([openJobs], months);
      const supplyForecast = AnalysisEngine.forecast([activeContracts], months);

      // Calculate gaps
      const gaps = demandForecast.map((demand, i) => demand - (supplyForecast[i] || 0));

      // Recommendations
      const recommendations = this.generateWorkforceRecommendations(gaps, jobTrend);

      const report: WorkforceReport = {
        affiliateId,
        forecastPeriodMonths: months,
        currentState: {
          openJobs,
          activeContracts,
          candidates: candidates.length,
        },
        trends: {
          jobTrend,
          contractTrend,
        },
        forecasts: {
          demandForecast,
          supplyForecast,
          gaps,
        },
        recommendations,
        generatedAt: new Date().toISOString(),
      };

      this.setStatus(AgentStatus.COMPLETED);
      return AgentResult.success(report, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      return AgentResult.error<WorkforceReport>(error instanceof Error ? error.message : String(error));
    }
  }

  private generateWorkforceRecommendations(gaps: number[], trend: Trend): string[] {
    const recommendations: string[] = [];
    const maxGap = Math.max(...gaps);

    if (maxGap > 5) {
      recommendations.push("Significant workforce shortage predicted - increase recruitment");
    }

    if (trend === Trend.IMPROVING) {
      recommendations.push("Demand is increasing - plan for scaling");
    }

    if (trend === Trend.DECLINING) {
      recommendations.push("Demand is declining - focus on retention");
    }

    return recommendations;
  }
}
