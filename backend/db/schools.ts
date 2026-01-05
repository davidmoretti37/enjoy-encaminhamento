// @ts-nocheck
// School database operations
import { supabaseAdmin } from "../supabase";

export async function getAllSchools() {
  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("*, affiliates(name, contact_email)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get schools:", error);
    return [];
  }

  return data || [];
}

export async function getActiveSchoolsPublic() {
  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("id, school_name, city")
    .eq("status", "active")
    .order("school_name", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get public schools:", error);
    return [];
  }

  return data || [];
}

export async function getSchoolById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("*, affiliates(name, contact_email, city)")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get school:", error);
    return null;
  }

  return data;
}

export async function updateSchoolStatus(id: string, status: "pending" | "active" | "suspended") {
  const { error } = await supabaseAdmin
    .from("schools")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[Database] Failed to update school status:", error);
    throw error;
  }
}

export async function updateSchool(id: string, data: any) {
  const { error } = await supabaseAdmin
    .from("schools")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[Database] Failed to update school:", error);
    throw error;
  }
}

export async function updateSchoolContract(
  schoolId: string,
  data: {
    contract_type: "pdf" | "html" | null;
    contract_pdf_url?: string | null;
    contract_pdf_key?: string | null;
    contract_html?: string | null;
  }
) {
  const { error } = await supabaseAdmin
    .from("schools")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", schoolId);

  if (error) {
    console.error("[Database] Failed to update school contract:", error);
    throw error;
  }
}

export async function getSchoolStats(schoolId: string) {
  const [jobsResult, contractsResult] = await Promise.all([
    supabaseAdmin.from("jobs").select("id, status").eq("school_id", schoolId),
    supabaseAdmin.from("contracts").select("id, status").eq("school_id", schoolId),
  ]);

  return {
    totalJobs: jobsResult.data?.length || 0,
    openJobs: jobsResult.data?.filter((j) => j.status === "open").length || 0,
    totalContracts: contractsResult.data?.length || 0,
    activeContracts: contractsResult.data?.filter((c) => c.status === "active").length || 0,
  };
}

export async function getSchoolByUserId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("[Database] Failed to get school by user ID:", error);
    return null;
  }

  return data;
}

/**
 * Get school for user context based on role
 * For school users: returns their school
 * For other roles: returns null (they should use role-specific routes)
 */
export async function getSchoolForUserContext(userId: string, role: string) {
  if (role === 'school') {
    return await getSchoolByUserId(userId);
  }
  return null;
}

export async function getSchoolDashboardStats(schoolId: string) {
  const [candidatesResult, applicationsResult, contractsResult] = await Promise.all([
    supabaseAdmin.from("candidates").select("id, status").eq("school_id", schoolId),
    supabaseAdmin
      .from("applications")
      .select("id, status, candidates!inner(school_id)")
      .eq("candidates.school_id", schoolId),
    supabaseAdmin
      .from("contracts")
      .select("id, status, candidates!inner(school_id)")
      .eq("candidates.school_id", schoolId),
  ]);

  const candidates = candidatesResult.data || [];
  const applications = applicationsResult.data || [];
  const contracts = contractsResult.data || [];

  return {
    totalCandidates: candidates.length,
    activeCandidates: candidates.filter((c) => c.status === "active").length,
    employedCandidates: candidates.filter((c) => c.status === "employed").length,
    totalApplications: applications.length,
    activeApplications: applications.filter(
      (a) => a.status === "in_progress" || a.status === "interviewing"
    ).length,
    totalHired: contracts.filter((c) => c.status === "active" || c.status === "completed").length,
  };
}

export async function getCandidatesBySchoolId(schoolId: string) {
  const { data: school } = await supabaseAdmin
    .from("schools")
    .select("city")
    .eq("id", schoolId)
    .single();

  if (!school || !school.city) {
    console.error("[Database] School not found or has no city");
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("candidates")
    .select(`*, users(email, name)`)
    .eq("city", school.city)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get candidates by school city:", error);
    return [];
  }

  return data || [];
}

export async function getApplicationsBySchoolId(schoolId: string) {
  const { data: school } = await supabaseAdmin
    .from("schools")
    .select("city")
    .eq("id", schoolId)
    .single();

  if (!school || !school.city) {
    console.error("[Database] School not found or has no city");
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(
      `
      *,
      candidates!inner(id, full_name, city),
      jobs(id, title, companies(company_name))
    `
    )
    .eq("candidates.city", school.city)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get applications by school city:", error);
    return [];
  }

  return data || [];
}

export async function getCompaniesBySchoolId(schoolId: string) {
  // Get companies that were imported/assigned to this specific school
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get companies by school_id:", error);
    return [];
  }

  return data || [];
}

export async function getJobsBySchoolId(schoolId: string) {
  const { data: school } = await supabaseAdmin
    .from("schools")
    .select("affiliate_id")
    .eq("id", schoolId)
    .single();

  if (!school || !school.affiliate_id) {
    console.error("[Database] School not found or has no affiliate_id");
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select(`*, companies(id, company_name, city)`)
    .eq("companies.affiliate_id", school.affiliate_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get jobs by school:", error);
    return [];
  }

  return data || [];
}

export async function getContractsBySchoolId(schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("contracts")
    .select(
      `
      *,
      candidates(id, full_name, school_id),
      companies(id, company_name),
      jobs(id, title)
    `
    )
    .eq("candidates.school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get contracts by school:", error);
    return [];
  }

  return data || [];
}

export async function getPaymentsBySchoolId(schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      `
      *,
      contracts(
        id,
        candidates(id, full_name, school_id),
        companies(id, company_name)
      )
    `
    )
    .eq("contracts.candidates.school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get payments by school:", error);
    return [];
  }

  return data || [];
}

export async function getMeetingsBySchoolId(schoolId: string) {
  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .select("*")
    .eq("school_id", schoolId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get meetings by school:", error);
    return [];
  }

  return data || [];
}
