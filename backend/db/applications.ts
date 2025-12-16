// @ts-nocheck
// Application database operations
import { supabase, supabaseAdmin } from "../supabase";
import type { Application, InsertApplication } from "./types";

export async function createApplication(application: InsertApplication): Promise<string> {
  const { data, error } = await supabase
    .from("applications")
    .insert(application)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getApplicationsByJobId(jobId: string): Promise<Application[]> {
  const { data, error } = await supabase
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
          name
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
  const { error } = await supabase.from("applications").update(data).eq("id", id);

  if (error) throw error;
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
