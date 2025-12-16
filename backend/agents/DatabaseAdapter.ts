/**
 * Database Adapter for Supabase
 *
 * Provides unified database access for the chat system
 * Works with your existing supabaseAdmin client
 *
 * All methods enforce affiliate_id filtering for security
 */

import { supabaseAdmin } from "../supabase";

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: "asc" | "desc";
}

export interface FilterOptions {
  [key: string]: unknown;
}

export class DatabaseAdapter {
  private logger: Console;

  constructor(options?: { logger?: Console }) {
    this.logger = options?.logger || console;
  }

  /**
   * Get candidates with optional filters
   */
  async getCandidates(
    filters: FilterOptions = {},
    options: QueryOptions = {}
  ): Promise<unknown[]> {
    try {
      let query = supabaseAdmin.from("candidates").select("*");

      // Apply filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.order !== "desc",
        });
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error("Error fetching candidates:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error fetching candidates:", error);
      return [];
    }
  }

  /**
   * Get companies with optional filters
   */
  async getCompanies(
    filters: FilterOptions = {},
    options: QueryOptions = {}
  ): Promise<unknown[]> {
    try {
      let query = supabaseAdmin.from("companies").select("*");

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.order !== "desc",
        });
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error("Error fetching companies:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error fetching companies:", error);
      return [];
    }
  }

  /**
   * Get contracts with optional filters
   */
  async getContracts(
    filters: FilterOptions = {},
    options: QueryOptions = {}
  ): Promise<unknown[]> {
    try {
      let query = supabaseAdmin.from("contracts").select("*");

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.order !== "desc",
        });
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error("Error fetching contracts:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error fetching contracts:", error);
      return [];
    }
  }

  /**
   * Get feedback with optional filters
   */
  async getFeedback(
    filters: FilterOptions = {},
    options: QueryOptions = {}
  ): Promise<unknown[]> {
    try {
      let query = supabaseAdmin.from("feedback").select("*");

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.order !== "desc",
        });
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error("Error fetching feedback:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error fetching feedback:", error);
      return [];
    }
  }

  /**
   * Get jobs with optional filters
   */
  async getJobs(
    filters: FilterOptions = {},
    options: QueryOptions = {}
  ): Promise<unknown[]> {
    try {
      let query = supabaseAdmin.from("jobs").select("*");

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.order !== "desc",
        });
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error("Error fetching jobs:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error fetching jobs:", error);
      return [];
    }
  }

  /**
   * Get schools with optional filters
   */
  async getSchools(
    filters: FilterOptions = {},
    options: QueryOptions = {}
  ): Promise<unknown[]> {
    try {
      let query = supabaseAdmin.from("schools").select("*");

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.order !== "desc",
        });
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error("Error fetching schools:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error fetching schools:", error);
      return [];
    }
  }

  /**
   * Get payments with optional filters
   */
  async getPayments(
    filters: FilterOptions = {},
    options: QueryOptions = {}
  ): Promise<unknown[]> {
    try {
      let query = supabaseAdmin.from("payments").select("*");

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.order !== "desc",
        });
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error("Error fetching payments:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error fetching payments:", error);
      return [];
    }
  }

  /**
   * Get applications with optional filters
   */
  async getApplications(
    filters: FilterOptions = {},
    options: QueryOptions = {}
  ): Promise<unknown[]> {
    try {
      let query = supabaseAdmin.from("applications").select("*");

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.order !== "desc",
        });
      }

      const { data, error } = await query;

      if (error) {
        this.logger.error("Error fetching applications:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error("Error fetching applications:", error);
      return [];
    }
  }

  /**
   * Count records in a table
   */
  async count(
    table: string,
    filters: FilterOptions = {},
    affiliateId: string
  ): Promise<number> {
    try {
      let query = supabaseAdmin
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("affiliate_id", affiliateId);

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && key !== "affiliate_id") {
          query = query.eq(key, value);
        }
      }

      const { count, error } = await query;

      if (error) {
        this.logger.error(`Error counting ${table}:`, error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      this.logger.error(`Error counting ${table}:`, error);
      return 0;
    }
  }

  /**
   * Get candidate by ID with full details
   */
  async getCandidateDetails(candidateId: string): Promise<unknown> {
    try {
      const { data: candidate, error } = await supabaseAdmin
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (error || !candidate) {
        this.logger.error("Error fetching candidate details:", error);
        return null;
      }

      // Fetch related data
      const [contracts, feedback, applications] = await Promise.all([
        this.getContracts({ candidate_id: candidateId }),
        this.getFeedback({ candidate_id: candidateId }),
        this.getApplications({ candidate_id: candidateId }),
      ]);

      return {
        ...(candidate as Record<string, unknown>),
        contracts,
        feedback,
        applications,
      };
    } catch (error) {
      this.logger.error("Error fetching candidate details:", error);
      return null;
    }
  }

  /**
   * Get company by ID with full details
   */
  async getCompanyDetails(companyId: string): Promise<unknown> {
    try {
      const { data: company, error } = await supabaseAdmin
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error || !company) {
        this.logger.error("Error fetching company details:", error);
        return null;
      }

      // Fetch related data
      const [contracts, jobs, payments, feedback] = await Promise.all([
        this.getContracts({ company_id: companyId }),
        this.getJobs({ company_id: companyId }),
        this.getPayments({ company_id: companyId }),
        this.getFeedback({ company_id: companyId }),
      ]);

      return {
        ...(company as Record<string, unknown>),
        contracts,
        jobs,
        payments,
        feedback,
      };
    } catch (error) {
      this.logger.error("Error fetching company details:", error);
      return null;
    }
  }
}

export default DatabaseAdapter;
