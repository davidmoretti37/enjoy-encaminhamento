// @ts-nocheck
// Job database operations
import { supabase, supabaseAdmin } from "../supabase";
import type { Job, InsertJob } from "./types";

export async function createJob(job: InsertJob): Promise<string> {
  const { data, error } = await supabase
    .from("jobs")
    .insert(job)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getJobById(id: string): Promise<Job | undefined> {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") return undefined;
  return data || undefined;
}

export async function getJobsByCompanyId(companyId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllOpenJobs(): Promise<Job[]> {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .eq("status", "open")
    .order("published_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateJob(id: string, data: Partial<InsertJob>): Promise<void> {
  const { error } = await supabase.from("jobs").update(data).eq("id", id);

  if (error) throw error;
}

export async function searchJobs(filters: {
  contractType?: string;
  workType?: string;
  city?: string;
  status?: string;
}): Promise<Job[]> {
  let query = supabase.from("jobs").select("*");

  if (filters.contractType) {
    query = query.eq("contract_type", filters.contractType);
  }
  if (filters.workType) {
    query = query.eq("work_type", filters.workType);
  }
  if (filters.city) {
    query = query.eq("location", filters.city);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllJobs(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select(`
      *,
      companies(company_name, email),
      users(name, email)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get jobs:", error);
    return [];
  }

  return data || [];
}

export async function updateJobStatus(
  id: string,
  status: "draft" | "open" | "closed" | "filled",
  updatedBy: string
): Promise<void> {
  const updates: any = { status };

  if (status === "open") {
    updates.published_at = new Date().toISOString();
  } else if (status === "closed" || status === "filled") {
    updates.closed_at = new Date().toISOString();
    updates.closed_by = updatedBy;
    if (status === "filled") {
      updates.filled_at = new Date().toISOString();
    }
  }

  const { error } = await supabaseAdmin.from("jobs").update(updates).eq("id", id);

  if (error) {
    console.error("[Database] Failed to update job status:", error);
    throw error;
  }
}

export async function createJobForOnboarding(
  companyId: string,
  data: {
    title: string;
    description: string;
    contract_type: "estagio" | "clt" | "menor-aprendiz";
    work_type: "presencial" | "remoto" | "hibrido";
    salary?: number | null;
    salary_min?: number | null;
    salary_max?: number | null;
    benefits?: string[];
    min_education_level?: "fundamental" | "medio" | "superior" | "pos-graduacao" | null;
    required_skills?: string[];
    requirements?: string;
    work_schedule?: string;
    location?: string;
    openings?: number;
    status?: "draft" | "open" | "closed" | "filled";
    published_at?: string;
    school_id: string;
  }
): Promise<string> {
  const { data: job, error } = await supabaseAdmin
    .from("jobs")
    .insert({
      company_id: companyId,
      school_id: data.school_id,
      title: data.title,
      description: data.description,
      contract_type: data.contract_type,
      work_type: data.work_type,
      salary: data.salary,
      salary_min: data.salary_min,
      salary_max: data.salary_max,
      benefits: data.benefits,
      min_education_level: data.min_education_level,
      required_skills: data.required_skills,
      requirements: data.requirements,
      work_schedule: data.work_schedule,
      location: data.location,
      specific_requirements: data.requirements || null,
      openings: data.openings || 1,
      filled_positions: 0,
      status: data.status || "draft",
      published_at: data.published_at || null,
    })
    .select("id")
    .single();

  if (error) throw error;
  return job.id;
}

export async function createJobFromCompanyForm(
  companyId: string,
  schoolId: string,
  formData: any
): Promise<string | null> {
  if (!formData?.job_title) {
    return null;
  }

  // Parse salary from compensation string (e.g., "R$ 2.000,00" -> 2000)
  let salary: number | null = null;
  if (formData.compensation) {
    const match = formData.compensation.match(/[\d.,]+/);
    if (match) {
      salary = parseFloat(match[0].replace(/\./g, "").replace(",", "."));
    }
  }

  const contractTypeMap: Record<string, "estagio" | "clt" | "menor-aprendiz"> = {
    clt: "clt",
    estagio: "estagio",
    jovem_aprendiz: "menor-aprendiz",
    pj: "clt",
    temporario: "clt",
  };
  const contractType = contractTypeMap[formData.employment_type] || "clt";

  let minEducation: "fundamental" | "medio" | "superior" | "pos-graduacao" | null = null;
  if (formData.education_level) {
    const eduLower = formData.education_level.toLowerCase();
    if (eduLower.includes("fundamental")) minEducation = "fundamental";
    else if (eduLower.includes("medio")) minEducation = "medio";
    else if (eduLower.includes("superior")) minEducation = "superior";
    else if (eduLower.includes("pos")) minEducation = "pos-graduacao";
  }

  // Build description from form fields
  let description = formData.main_activities || "";
  if (formData.required_skills) {
    description += `\n\nRequisitos: ${formData.required_skills}`;
  }
  if (formData.notes) {
    description += `\n\n${formData.notes}`;
  }

  // Build location from city and state
  const location = formData.city && formData.state
    ? `${formData.city}, ${formData.state}`
    : formData.city || formData.state || null;

  const openings = formData.positions_count ? parseInt(formData.positions_count) : 1;

  // Map work_type from form data if available
  const workTypeMap: Record<string, "presencial" | "remoto" | "hibrido"> = {
    presencial: "presencial",
    remoto: "remoto",
    hibrido: "hibrido",
    hybrid: "hibrido",
    remote: "remoto",
    onsite: "presencial",
  };
  const workType = workTypeMap[formData.work_type?.toLowerCase()] || "presencial";

  return createJobForOnboarding(companyId, {
    title: formData.job_title,
    description: description.trim(),
    contract_type: contractType,
    work_type: workType,
    salary: salary ? Math.round(salary * 100) : null, // Convert to cents for legacy column
    salary_min: salary, // Store in reais for new column
    salary_max: salary, // Same as min if single value
    benefits: formData.benefits || [],
    min_education_level: minEducation,
    required_skills: formData.required_skills ? [formData.required_skills] : [],
    requirements: formData.required_skills || null,
    work_schedule: formData.work_schedule,
    location,
    openings,
    status: "open",
    published_at: new Date().toISOString(),
    school_id: schoolId,
  });
}

// ============================================
// JOB MATCHING FUNCTIONS
// ============================================

/**
 * Get matching progress for a job
 * Used by: getMatchingProgress endpoint
 */
export async function getMatchingProgress(jobId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from("job_matching_progress")
    .select("*")
    .eq("job_id", jobId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get matching progress:", error);
    return null;
  }

  return data;
}

/**
 * Get all matches for a job (sorted by score)
 * Used by: getMatchesForJob endpoint, chat queries
 */
export async function getJobMatchesByJobId(jobId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from("job_matches")
    .select("*")
    .eq("job_id", jobId)
    .order("composite_score", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get job matches:", error);
    return [];
  }

  return data || [];
}

/**
 * Store match results for a job (batch upsert)
 * Used by: BackgroundMatchingService
 */
export async function storeMatchResults(jobId: string, matches: any[]): Promise<void> {
  if (matches.length === 0) return;

  // Get job's franchise_id
  const { data: job, error: jobError } = await supabaseAdmin
    .from("jobs")
    .select("franchise_id")
    .eq("id", jobId)
    .single();

  if (jobError || !job?.franchise_id) {
    console.error("[Database] Failed to get job franchise_id:", jobError);
    throw new Error("Could not determine franchise_id for job");
  }

  // Prepare records for insertion
  const matchRecords = matches.map((match) => ({
    job_id: jobId,
    candidate_id: match.candidateId,
    franchise_id: job.franchise_id,
    composite_score: match.compositeScore,
    confidence_score: match.confidenceScore,
    success_probability: match.successProbability || null,
    match_factors: match.factors || {},
    semantic_factors: match.semanticScore
      ? {
          semanticScore: match.semanticScore,
          reasoning: match.semanticReasoning,
          missingSkills: match.missingSkills || [],
          transferableSkills: match.transferableSkills || [],
        }
      : null,
    recommendation: match.recommendation,
    match_reasoning: match.semanticReasoning || match.reasoning || null,
  }));

  // Batch upsert (insert or update if exists)
  const { error } = await supabaseAdmin.from("job_matches").upsert(matchRecords, {
    onConflict: "job_id,candidate_id",
  });

  if (error) {
    console.error("[Database] Failed to store match results:", error);
    throw error;
  }

  console.log(`[Database] Stored ${matchRecords.length} match results for job ${jobId}`);
}

/**
 * Update matching progress
 * Used by: BackgroundMatchingService
 */
export async function updateMatchingProgress(progress: {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed";
  totalCandidates: number;
  processedCandidates: number;
  matchesFound: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("job_matching_progress").upsert(
    {
      job_id: progress.jobId,
      status: progress.status,
      total_candidates: progress.totalCandidates,
      processed_candidates: progress.processedCandidates,
      matches_found: progress.matchesFound,
      started_at: progress.startedAt ? progress.startedAt.toISOString() : null,
      completed_at: progress.completedAt ? progress.completedAt.toISOString() : null,
      error_message: progress.errorMessage || null,
    },
    { onConflict: "job_id" }
  );

  if (error) {
    console.error("[Database] Failed to update matching progress:", error);
    throw error;
  }
}
