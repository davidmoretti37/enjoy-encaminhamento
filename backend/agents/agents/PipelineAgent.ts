/**
 * Pipeline Agent - Sales pipeline optimization and analysis
 */

import { BaseAgent, BaseAgentOptions } from "../BaseAgent";
import { AgentResult, AgentStatus, ExecutionContext } from "../types";

interface Lead {
  id: string;
  stage: string;
  lastActivity: string;
}

interface Application {
  id: string;
  status: string;
}

interface PipelineContext extends ExecutionContext {
  getAffiliateLeads(affiliateId: string): Promise<Lead[]>;
  getAffiliateApplications(affiliateId: string): Promise<Application[]>;
}

interface StageData {
  [stage: string]: Lead[];
}

interface ConversionRates {
  [transition: string]: number;
}

interface Bottleneck {
  stage: string;
  rate: number;
}

interface PipelineReport {
  affiliateId: string;
  stageData: StageData;
  conversionRates: ConversionRates;
  bottlenecks: Bottleneck[];
  staleLeads: number;
  insights: string[];
  analyzedAt: string;
}

export class PipelineAgent extends BaseAgent {
  constructor(options: BaseAgentOptions = {}) {
    super({ ...options, name: options.name || "PipelineAgent" });
    this.capabilities = ["analyzePipeline"];
  }

  /**
   * Analyze sales pipeline
   */
  async analyzePipeline(
    params: { affiliateId: string },
    context: PipelineContext
  ): Promise<AgentResult<PipelineReport>> {
    const { affiliateId } = params;
    const startTime = Date.now();

    try {
      this.setStatus(AgentStatus.RUNNING);

      // Get pipeline data
      const leads = await context.getAffiliateLeads(affiliateId);

      // Aggregate by stage
      const stageData = this.aggregateByStage(leads);

      // Calculate conversion rates
      const conversionRates = this.calculateConversionRates(stageData);

      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(conversionRates);

      // Find stale leads
      const staleLeads = this.findStaleLeads(leads);

      // Generate insights
      const insights = this.generatePipelineInsights(stageData, conversionRates, bottlenecks);

      const report: PipelineReport = {
        affiliateId,
        stageData,
        conversionRates,
        bottlenecks,
        staleLeads: staleLeads.length,
        insights,
        analyzedAt: new Date().toISOString(),
      };

      this.setStatus(AgentStatus.COMPLETED);
      return AgentResult.success(report, Date.now() - startTime);
    } catch (error) {
      this.setStatus(AgentStatus.FAILED);
      return AgentResult.error<PipelineReport>(error instanceof Error ? error.message : String(error));
    }
  }

  private aggregateByStage(leads: Lead[]): StageData {
    const stages: StageData = {};
    for (const lead of leads) {
      if (!stages[lead.stage]) {
        stages[lead.stage] = [];
      }
      stages[lead.stage].push(lead);
    }
    return stages;
  }

  private calculateConversionRates(stageData: StageData): ConversionRates {
    const rates: ConversionRates = {};
    const stages = Object.keys(stageData).sort();

    for (let i = 0; i < stages.length - 1; i++) {
      const current = stageData[stages[i]].length;
      const next = stageData[stages[i + 1]].length;
      rates[`${stages[i]} -> ${stages[i + 1]}`] = current > 0 ? (next / current) * 100 : 0;
    }

    return rates;
  }

  private identifyBottlenecks(conversionRates: ConversionRates): Bottleneck[] {
    return Object.entries(conversionRates)
      .filter(([_, rate]) => rate < 30)
      .map(([stage, rate]) => ({ stage, rate }));
  }

  private findStaleLeads(leads: Lead[]): Lead[] {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return leads.filter((l) => new Date(l.lastActivity) < thirtyDaysAgo);
  }

  private generatePipelineInsights(
    stageData: StageData,
    _conversionRates: ConversionRates,
    bottlenecks: Bottleneck[]
  ): string[] {
    const insights: string[] = [];

    if (bottlenecks.length > 0) {
      insights.push(`Bottleneck identified: ${bottlenecks[0].stage}`);
    }

    const totalLeads = Object.values(stageData).reduce((sum, arr) => sum + arr.length, 0);
    insights.push(`Total leads in pipeline: ${totalLeads}`);

    return insights;
  }
}
