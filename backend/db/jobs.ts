// Job database operations
import { supabase, supabaseAdmin } from "../supabase";
import type { Job, InsertJob } from "./types";
import { generateJobSummary } from "../services/ai/summarizer";
import { generateJobEmbedding } from "../services/matching";

// Cast to any to work around TS 5.9 overload resolution issues with Supabase client
const db = supabaseAdmin as any;
const dbAnon = supabase as any;

export async function createJob(job: InsertJob): Promise<string> {
  const { data, error } = await dbAnon
    .from("jobs")
    .insert(job)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getJobById(id: string): Promise<Job | undefined> {
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") return undefined;
  return data || undefined;
}

export async function getJobsByCompanyId(companyId: string): Promise<Job[]> {
  const { data, error } = await dbAnon
    .from("jobs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllOpenJobs(): Promise<Job[]> {
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("status", "open")
    .order("published_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateJob(id: string, data: Partial<InsertJob>): Promise<void> {
  const { error } = await db.from("jobs").update(data).eq("id", id);

  if (error) throw error;
}

export async function searchJobs(filters: {
  contractType?: string;
  workType?: string;
  city?: string;
  status?: string;
}): Promise<Job[]> {
  let query = dbAnon.from("jobs").select("*");

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
  const { data, error } = await db
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

  const { error } = await db.from("jobs").update(updates).eq("id", id);

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
    contract_type: "estagio" | "clt" | "menor-aprendiz" | "pj";
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
    agency_id: string;
    subsidiary_cnpj?: string;
    subsidiary_name?: string;
  }
): Promise<string> {
  const { data: job, error } = await db
    .from("jobs")
    .insert({
      company_id: companyId,
      agency_id: data.agency_id,
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
      subsidiary_cnpj: data.subsidiary_cnpj || null,
      subsidiary_name: data.subsidiary_name || null,
      status: data.status || "open",
      published_at: data.published_at || new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;

  // Generate job summary in background (fire and forget)
  generateJobSummary({
    title: data.title,
    description: data.description,
    contractType: data.contract_type,
    workType: data.work_type,
    city: data.location?.split(',')[0]?.trim(),
    state: data.location?.split(',')[1]?.trim(),
    requirements: data.requirements,
    benefits: data.benefits?.join(', '),
    salary: data.salary ? `R$ ${data.salary}` : undefined,
  }).then(async (summary) => {
    if (summary) {
      await db
        .from("jobs")
        .update({
          summary,
          summary_generated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      console.log(`Generated summary for job ${job.id}`);
      // Generate embedding from summary
      await generateJobEmbedding(job.id);
      console.log(`Generated embedding for job ${job.id}`);
    }
  }).catch((err) => {
    console.error('Failed to generate job summary/embedding:', err);
  });

  return job.id;
}

export async function createJobFromCompanyForm(
  companyId: string,
  agencyId: string,
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

  const contractTypeMap: Record<string, "estagio" | "clt" | "menor-aprendiz" | "pj"> = {
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
    agency_id: agencyId,
  });
}

