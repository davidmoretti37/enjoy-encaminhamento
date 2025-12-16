/**
 * Agent Context - Database adapter for agent operations
 *
 * This module provides a context object that wraps existing database functions
 * to provide the interface expected by the agent system.
 */

import { ExecutionContext } from "./types";

// Import existing database functions
import * as db from "../db";
import { supabaseAdmin } from "../supabase";

/**
 * Extended context with database access methods
 */
export interface AgentContext extends ExecutionContext {
  // Company methods
  getCompany(id: string): Promise<any>;
  getCompanyContracts(companyId: string): Promise<any[]>;
  getCompanyPayments(companyId: string): Promise<any[]>;
  getCompanyFeedback(companyId: string): Promise<any[]>;
  getCompanyJobs(companyId: string): Promise<any[]>;

  // Candidate methods
  getCandidate(id: string): Promise<any>;
  getCandidateContracts(candidateId: string): Promise<any[]>;
  getCandidateFeedback(candidateId: string): Promise<any[]>;
  getCandidateInterviews(candidateId: string): Promise<any[]>;
  getCandidateApplications(candidateId: string): Promise<any[]>;

  // School methods
  getSchool(id: string): Promise<any>;
  getSchoolCandidates(schoolId: string): Promise<any[]>;
  getSchoolContracts(schoolId: string): Promise<any[]>;
  getSchoolFeedback(schoolId: string): Promise<any[]>;

  // Affiliate methods
  getAffiliateJobs(affiliateId: string): Promise<any[]>;
  getAffiliateContracts(affiliateId: string): Promise<any[]>;
  getAffiliateCandidates(affiliateId: string): Promise<any[]>;
  getAffiliateLeads(affiliateId: string): Promise<any[]>;
  getAffiliateApplications(affiliateId: string): Promise<any[]>;
  getAffiliateFeedback(affiliateId: string): Promise<any[]>;

  // Contract methods
  getContract(id: string): Promise<any>;
  getContractFeedback(contractId: string): Promise<any[]>;
  getContractPayments(contractId: string): Promise<any[]>;
}

/**
 * Create an agent context with database access
 */
export function createAgentContext(
  userId: string,
  affiliateId: string,
  metadata: Record<string, unknown> = {}
): AgentContext {
  const baseContext = new ExecutionContext(userId, affiliateId, metadata);

  return {
    // Spread base context properties
    ...baseContext,
    userId: baseContext.userId,
    affiliateId: baseContext.affiliateId,
    metadata: baseContext.metadata,
    startTime: baseContext.startTime,
    executionId: baseContext.executionId,
    getDuration: () => baseContext.getDuration(),
    toJSON: () => baseContext.toJSON(),

    // Company methods
    async getCompany(id: string) {
      const company = await db.getCompanyById(id);
      return company || null;
    },

    async getCompanyContracts(companyId: string) {
      return await db.getContractsByCompanyId(companyId);
    },

    async getCompanyPayments(companyId: string) {
      // Get contracts first, then get payments for each
      const contracts = await db.getContractsByCompanyId(companyId);
      const payments: any[] = [];
      for (const contract of contracts) {
        const contractPayments = await db.getPaymentsByContractId(contract.id);
        payments.push(...contractPayments);
      }
      return payments;
    },

    async getCompanyFeedback(companyId: string) {
      // Get feedback from the feedback table for company
      const { data, error } = await supabaseAdmin
        .from("feedback")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching company feedback:", error);
        return [];
      }
      return data || [];
    },

    async getCompanyJobs(companyId: string) {
      return await db.getJobsByCompanyId(companyId);
    },

    // Candidate methods
    async getCandidate(id: string) {
      const candidate = await db.getCandidateById(id);
      return candidate || null;
    },

    async getCandidateContracts(candidateId: string) {
      return await db.getContractsByCandidateId(candidateId);
    },

    async getCandidateFeedback(candidateId: string) {
      const { data, error } = await supabaseAdmin
        .from("feedback")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching candidate feedback:", error);
        return [];
      }
      return data || [];
    },

    async getCandidateInterviews(candidateId: string) {
      const { data, error } = await supabaseAdmin
        .from("scheduled_meetings")
        .select("*")
        .eq("candidate_id", candidateId)
        .order("scheduled_at", { ascending: false });

      if (error) {
        console.error("Error fetching candidate interviews:", error);
        return [];
      }
      return data || [];
    },

    async getCandidateApplications(candidateId: string) {
      return await db.getApplicationsByCandidateId(candidateId);
    },

    // School methods
    async getSchool(id: string) {
      const school = await db.getSchoolById(id);
      return school || null;
    },

    async getSchoolCandidates(schoolId: string) {
      return await db.getCandidatesBySchoolId(schoolId);
    },

    async getSchoolContracts(schoolId: string) {
      return await db.getContractsBySchoolId(schoolId);
    },

    async getSchoolFeedback(schoolId: string) {
      const { data, error } = await supabaseAdmin
        .from("feedback")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching school feedback:", error);
        return [];
      }
      return data || [];
    },

    // Affiliate methods
    async getAffiliateJobs(affiliateId: string) {
      return await db.getJobsByAffiliateId(affiliateId);
    },

    async getAffiliateContracts(affiliateId: string) {
      return await db.getContractsByAffiliateId(affiliateId);
    },

    async getAffiliateCandidates(affiliateId: string) {
      return await db.getCandidatesByAffiliateId(affiliateId);
    },

    async getAffiliateLeads(affiliateId: string) {
      // Leads are companies in early pipeline stages
      const companies = await db.getCompaniesByAffiliateId(affiliateId);
      return companies.filter((c: any) =>
        ["new", "form_filled", "meeting_scheduled"].includes(c.pipeline_status)
      );
    },

    async getAffiliateApplications(affiliateId: string) {
      return await db.getApplicationsByAffiliateId(affiliateId);
    },

    async getAffiliateFeedback(affiliateId: string) {
      const { data, error } = await supabaseAdmin
        .from("feedback")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching affiliate feedback:", error);
        return [];
      }
      return data || [];
    },

    // Contract methods
    async getContract(id: string) {
      const contract = await db.getContractWithDetails(id);
      return contract || null;
    },

    async getContractFeedback(contractId: string) {
      const { data, error } = await supabaseAdmin
        .from("feedback")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching contract feedback:", error);
        return [];
      }
      return data || [];
    },

    async getContractPayments(contractId: string) {
      return await db.getPaymentsByContractId(contractId);
    },
  };
}

/**
 * Create a minimal context for simple operations
 */
export function createSimpleContext(
  userId: string = "system",
  affiliateId: string = "system"
): ExecutionContext {
  return new ExecutionContext(userId, affiliateId, {});
}
