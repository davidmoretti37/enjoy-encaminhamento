// Candidate database operations
import { supabase, supabaseAdmin } from "../supabase";
import type { Candidate, InsertCandidate } from "./types";
import { generateCandidateSummary } from "../services/ai/summarizer";
import { generateCandidateEmbedding } from "../services/matching";

// Cast to any to work around TS 5.9 overload resolution issues with Supabase client
const db = supabaseAdmin as any;

export async function createCandidate(candidate: InsertCandidate): Promise<string> {
  // Use admin client to bypass RLS during candidate creation (e.g., during onboarding)
  const { data, error } = await db
    .from("candidates")
    .insert(candidate)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function getCandidateByUserId(userId: string): Promise<Candidate | undefined> {
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") return undefined;
  return data || undefined;
}

export async function getCandidateById(id: string): Promise<Candidate | undefined> {
  // Use admin client to bypass RLS (needed during onboarding flow)
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") return undefined;
  return data || undefined;
}

export async function getCandidatesByIds(ids: string[]): Promise<Candidate[]> {
  if (!ids || ids.length === 0) return [];

  const { data, error } = await db
    .from("candidates")
    .select("*")
    .in("id", ids);

  if (error) {
    console.error("[Database] Failed to get candidates by IDs:", error);
    return [];
  }

  return data || [];
}

export async function getAllCandidates(): Promise<Candidate[]> {
  // Use admin client to bypass RLS (called from admin-only routes)
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateCandidate(id: string, data: Partial<InsertCandidate>): Promise<void> {
  // Use admin client to bypass RLS (needed during onboarding flow)
  const { error } = await db.from("candidates").update(data).eq("id", id);

  if (error) throw error;
}

export async function searchCandidates(filters: {
  educationLevel?: string;
  city?: string;
  availableForInternship?: boolean;
  availableForCLT?: boolean;
  status?: string;
}): Promise<Candidate[]> {
  // Use admin client to bypass RLS (called from admin/company-only routes)
  let query = db.from("candidates").select("*");

  if (filters.educationLevel) {
    query = query.eq("education_level", filters.educationLevel);
  }
  if (filters.city) {
    query = query.eq("city", filters.city);
  }
  if (filters.availableForInternship !== undefined) {
    query = query.eq("available_for_internship", filters.availableForInternship);
  }
  if (filters.availableForCLT !== undefined) {
    query = query.eq("available_for_clt", filters.availableForCLT);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

// ============================================
// MATCHING-RELATED FUNCTIONS
// ============================================

/**
 * Get all active candidates for an affiliate/admin
 * Used by: Background matching service
 */
export async function getAllActiveCandidates(affiliateId: string): Promise<Candidate[]> {
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get active candidates:", error);
    return [];
  }

  return data || [];
}

/**
 * Get all active candidates for an agency
 * Used by: Background matching service for agency-based job matching
 */
export async function getAllActiveCandidatesByAgency(agencyId: string): Promise<Candidate[]> {
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get active candidates by agency:", error);
    return [];
  }

  return data || [];
}

/**
 * Get candidate contracts (for matching history)
 * Used by: BackgroundMatchingService context
 */
export async function getCandidateContracts(candidateId: string): Promise<any[]> {
  const { data, error } = await db
    .from("contracts")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

/**
 * Get candidate feedback (for matching history)
 * Used by: BackgroundMatchingService context
 */
export async function getCandidateFeedback(candidateId: string): Promise<any[]> {
  const { data, error } = await db
    .from("feedback")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false});

  if (error) return [];
  return data || [];
}

/**
 * Get candidate interviews (for matching history)
 * Used by: BackgroundMatchingService context
 */
export async function getCandidateInterviews(candidateId: string): Promise<any[]> {
  const { data, error } = await db
    .from("scheduled_meetings")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("scheduled_at", { ascending: false });

  if (error) return [];
  return data || [];
}

/**
 * Get candidate applications (for matching history)
 * Used by: BackgroundMatchingService context
 */
export async function getCandidateApplications(candidateId: string): Promise<any[]> {
  const { data, error } = await db
    .from("applications")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

/**
 * Get candidate by CPF
 */
export async function getCandidateByCpf(cpf: string): Promise<Candidate | null> {
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .eq("cpf", cpf.replace(/\D/g, ''))
    .single();

  if (error) return null;
  return data;
}

/**
 * Get candidate by email
 */
export async function getCandidateByEmail(email: string): Promise<Candidate | null> {
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error) return null;
  return data;
}

/**
 * Bulk create candidates from Excel/CSV import
 * @param candidates Array of candidate data to insert
 * @param agencyId The agency ID that imported these candidates
 * @returns Object with created candidate IDs and any errors
 */
export async function bulkCreateCandidates(
  candidates: Array<{
    full_name: string;
    cpf: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    education_level?: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | 'mestrado' | 'doutorado';
    currently_studying?: boolean;
    institution?: string;
    course?: string;
    skills?: string[];
    languages?: string[];
    has_work_experience?: boolean;
    profile_summary?: string;
    available_for_internship?: boolean;
    available_for_clt?: boolean;
    available_for_apprentice?: boolean;
    preferred_work_type?: 'presencial' | 'remoto' | 'hibrido';
    // DISC profile
    disc_dominante?: number;
    disc_influente?: number;
    disc_estavel?: number;
    disc_conforme?: number;
    // PDP data
    pdp_competencies?: string[];
    pdp_intrapersonal?: Record<string, string>;
    pdp_interpersonal?: Record<string, string>;
  }>,
  agencyId: string
): Promise<{ created: string[]; errors: { email: string; message: string }[] }> {
  const created: string[] = [];
  const errors: { email: string; message: string }[] = [];

  for (const candidate of candidates) {
    try {
      // Normalize CPF (remove non-digits)
      const normalizedCpf = candidate.cpf.replace(/\D/g, '');

      // Check if candidate with this CPF already exists
      const existingByCpf = await getCandidateByCpf(normalizedCpf);
      if (existingByCpf) {
        errors.push({
          email: candidate.email,
          message: `Candidato com CPF ${candidate.cpf} já existe`,
        });
        continue;
      }

      // Check if candidate with this email already exists
      const existingByEmail = await getCandidateByEmail(candidate.email);
      if (existingByEmail) {
        errors.push({
          email: candidate.email,
          message: `Candidato com email ${candidate.email} já existe`,
        });
        continue;
      }

      // Create auth user for the candidate
      const { data: authData, error: authError } = await db.auth.admin.createUser({
        email: candidate.email,
        email_confirm: true,
        user_metadata: {
          role: 'candidate',
          name: candidate.full_name,
        },
      });

      if (authError || !authData.user) {
        errors.push({
          email: candidate.email,
          message: authError?.message || 'Erro ao criar conta de usuário',
        });
        continue;
      }

      // Create user record
      const { error: userError } = await db.from("users").insert({
        id: authData.user.id,
        email: candidate.email,
        name: candidate.full_name,
        role: "candidate",
        agency_id: agencyId,
      });

      if (userError) {
        // Rollback auth user
        await db.auth.admin.deleteUser(authData.user.id);
        errors.push({
          email: candidate.email,
          message: userError.message,
        });
        continue;
      }

      // Prepare candidate data
      const candidateData: any = {
        user_id: authData.user.id,
        full_name: candidate.full_name,
        cpf: normalizedCpf,
        email: candidate.email.toLowerCase().trim(),
        agency_id: agencyId,
        status: 'active',
      };

      // Add optional fields if provided
      if (candidate.phone) candidateData.phone = candidate.phone;
      if (candidate.date_of_birth) candidateData.date_of_birth = candidate.date_of_birth;
      if (candidate.address) candidateData.address = candidate.address;
      if (candidate.city) candidateData.city = candidate.city;
      if (candidate.state) candidateData.state = candidate.state.length === 2 ? candidate.state.toUpperCase() : candidate.state;
      if (candidate.zip_code) candidateData.zip_code = candidate.zip_code;
      if (candidate.education_level) candidateData.education_level = candidate.education_level;
      if (candidate.currently_studying !== undefined) candidateData.currently_studying = candidate.currently_studying;
      if (candidate.institution) candidateData.institution = candidate.institution;
      if (candidate.course) candidateData.course = candidate.course;
      if (candidate.skills) candidateData.skills = candidate.skills;
      if (candidate.languages) candidateData.languages = candidate.languages;
      if (candidate.has_work_experience !== undefined) candidateData.has_work_experience = candidate.has_work_experience;
      if (candidate.profile_summary) candidateData.profile_summary = candidate.profile_summary;
      if (candidate.available_for_internship !== undefined) candidateData.available_for_internship = candidate.available_for_internship;
      if (candidate.available_for_clt !== undefined) candidateData.available_for_clt = candidate.available_for_clt;
      if (candidate.available_for_apprentice !== undefined) candidateData.available_for_apprentice = candidate.available_for_apprentice;
      if (candidate.preferred_work_type) candidateData.preferred_work_type = candidate.preferred_work_type;
      // DISC profile fields
      if (candidate.disc_dominante !== undefined) candidateData.disc_dominante = candidate.disc_dominante;
      if (candidate.disc_influente !== undefined) candidateData.disc_influente = candidate.disc_influente;
      if (candidate.disc_estavel !== undefined) candidateData.disc_estavel = candidate.disc_estavel;
      if (candidate.disc_conforme !== undefined) candidateData.disc_conforme = candidate.disc_conforme;
      // PDP data
      if (candidate.pdp_competencies) candidateData.pdp_competencies = candidate.pdp_competencies;
      if (candidate.pdp_intrapersonal) candidateData.pdp_intrapersonal = candidate.pdp_intrapersonal;
      if (candidate.pdp_interpersonal) candidateData.pdp_interpersonal = candidate.pdp_interpersonal;

      // Insert the candidate
      const { data, error } = await db
        .from("candidates")
        .insert(candidateData)
        .select("id")
        .single();

      if (error) {
        // Rollback user records
        await db.from("users").delete().eq("id", authData.user.id);
        await db.auth.admin.deleteUser(authData.user.id);
        errors.push({
          email: candidate.email,
          message: error.message,
        });
      } else if (data) {
        created.push(data.id);

        // Generate summary in background (fire-and-forget)
        const candidateId = data.id;
        generateCandidateSummary({
          fullName: candidate.full_name,
          city: candidate.city || '',
          state: candidate.state || '',
          educationLevel: candidate.education_level || '',
          institution: candidate.institution,
          course: candidate.course,
          skills: Array.isArray(candidate.skills) ? candidate.skills : [],
          languages: Array.isArray(candidate.languages) ? candidate.languages : [],
          discDominante: candidate.disc_dominante,
          discInfluente: candidate.disc_influente,
          discEstavel: candidate.disc_estavel,
          discConforme: candidate.disc_conforme,
          pdpCompetencies: candidate.pdp_competencies,
          pdpIntrapersonal: candidate.pdp_intrapersonal,
          pdpInterpersonal: candidate.pdp_interpersonal,
        }).then(async (summary) => {
          if (summary) {
            await db
              .from('candidates')
              .update({
                summary,
                summary_generated_at: new Date().toISOString(),
              })
              .eq('id', candidateId);

            // Generate embedding for vector matching
            await generateCandidateEmbedding(candidateId);
            console.log(`Generated summary and embedding for imported candidate ${candidateId}`);
          }
        }).catch((err) => {
          console.error(`Failed to generate summary for candidate ${candidate.full_name}:`, err);
        });
      }
    } catch (err: any) {
      errors.push({
        email: candidate.email,
        message: err.message || 'Erro desconhecido',
      });
    }
  }

  return { created, errors };
}

/**
 * Get candidate profile for a company
 * Only returns profile if candidate is in an unlocked batch for this company
 */
export async function getCandidateProfileForCompany(
  candidateId: string,
  companyId: string
): Promise<any | null> {
  // Check if candidate is in an unlocked batch for this company
  const { data: batches, error: batchError } = await db
    .from("candidate_batches")
    .select("candidate_ids")
    .eq("company_id", companyId)
    .eq("unlocked", true);

  if (batchError || !batches) return null;

  // Check if candidateId is in any of the batches
  const isInBatch = batches.some((batch: any) =>
    batch.candidate_ids?.includes(candidateId)
  );

  if (!isInBatch) return null;

  // Get full candidate profile
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (error || !data) return null;

  // Calculate age from birth_date
  let age = null;
  if (data.birth_date || data.date_of_birth) {
    const birthDate = new Date(data.birth_date || data.date_of_birth);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  return {
    id: data.id,
    name: data.full_name,
    city: data.city,
    state: data.state,
    age,
    // Education
    education: data.education_level,
    institution: data.institution,
    course: data.course,
    currently_studying: data.currently_studying,
    // Skills & Languages
    skills: data.skills || [],
    languages: data.languages || [],
    // Experience
    has_work_experience: data.has_work_experience,
    experience: data.experience || [],
    // Summary (AI generated)
    summary: data.summary,
    profile_summary: data.profile_summary,
    // Availability
    available_for_internship: data.available_for_internship,
    available_for_clt: data.available_for_clt,
    available_for_apprentice: data.available_for_apprentice,
    preferred_work_type: data.preferred_work_type,
    // DISC Profile
    disc_dominante: data.disc_dominante,
    disc_influente: data.disc_influente,
    disc_estavel: data.disc_estavel,
    disc_conforme: data.disc_conforme,
    // PDP Profile
    pdp_competencies: data.pdp_competencies,
    pdp_top_10_competencies: data.pdp_top_10_competencies,
    pdp_develop_competencies: data.pdp_develop_competencies,
    pdp_skills: data.pdp_skills,
    pdp_action_plans: data.pdp_action_plans,
    // Photo & Resume
    photo_url: data.photo_url,
    resume_url: data.resume_url,
  };
}
