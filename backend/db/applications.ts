// @ts-nocheck
// Application database operations
import { supabase, supabaseAdmin } from "../supabase";
import type { Application, InsertApplication } from "./types";

export async function createApplication(application: InsertApplication): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .insert(application)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getApplicationsByJobId(jobId: string): Promise<Application[]> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .order("applied_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getApplicationsByCandidateId(candidateId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(`
      *,
      jobs (
        id,
        title,
        description,
        contract_type,
        work_type,
        location,
        salary,
        company_id,
        companies (
          id,
          company_name
        )
      )
    `)
    .eq("candidate_id", candidateId)
    .order("applied_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateApplication(
  id: string,
  data: Partial<InsertApplication>
): Promise<void> {
  const { error } = await supabaseAdmin.from("applications").update(data).eq("id", id);

  if (error) throw error;
}

// Get candidate IDs who applied to a specific job (for matching pipeline)
export async function getApplicantCandidateIds(jobId: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("candidate_id")
    .eq("job_id", jobId);

  if (error) {
    console.error("[Database] Failed to get applicant IDs:", error);
    return [];
  }
  return data?.map(a => a.candidate_id) || [];
}

export async function updateApplicationsByCandidateIds(
  jobId: string,
  candidateIds: string[],
  status: string
): Promise<void> {
  if (candidateIds.length === 0) return;

  const { error } = await supabaseAdmin
    .from("applications")
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq("job_id", jobId)
    .in("candidate_id", candidateIds);

  if (error) {
    console.error("[Database] Failed to update applications by candidate IDs:", error);
    throw error;
  }
}

export async function getApplicationByJobAndCandidate(
  jobId: string,
  candidateId: string
): Promise<Application | null> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("job_id", jobId)
    .eq("candidate_id", candidateId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Database] Failed to get application:", error);
    return null;
  }

  return data;
}

export async function getApplicationById(applicationId: string): Promise<Application | null> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Database] Failed to get application by ID:", error);
    return null;
  }

  return data;
}

export async function getApplicationWithDetails(applicationId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(`
      *,
      candidates (
        id,
        full_name,
        email,
        phone,
        city,
        education_level,
        user_id
      ),
      jobs (
        id,
        title,
        company_id,
        companies (
          id,
          company_name
        )
      )
    `)
    .eq("id", applicationId)
    .single();

  if (error) {
    console.error("[Database] Failed to get application details:", error);
    return null;
  }

  return data;
}
