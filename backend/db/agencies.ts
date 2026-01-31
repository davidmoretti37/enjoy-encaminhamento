// @ts-nocheck
// Agency database operations
import { supabaseAdmin } from "../supabase";

export async function getAllAgencies() {
  const { data, error } = await supabaseAdmin
    .from("agencies")
    .select("*, affiliates(name, contact_email)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get agencies:", error);
    return [];
  }

  return data || [];
}

export async function getActiveAgenciesPublic() {
  const { data, error } = await supabaseAdmin
    .from("agencies")
    .select("id, agency_name, city, state")
    .eq("status", "active")
    .order("agency_name", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get public agencies:", error);
    return [];
  }

  return data || [];
}

export async function getAgencyById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("agencies")
    .select("*, affiliates(name, contact_email, city)")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get agency:", error);
    return null;
  }

  return data;
}

export async function updateAgencyStatus(id: string, status: "pending" | "active" | "suspended") {
  const { error } = await supabaseAdmin
    .from("agencies")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[Database] Failed to update agency status:", error);
    throw error;
  }
}

export async function updateAgency(id: string, data: any) {
  const { error } = await supabaseAdmin
    .from("agencies")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[Database] Failed to update agency:", error);
    throw error;
  }
}

export async function updateAgencyContract(
  agencyId: string,
  data: {
    contract_type: "pdf" | "html" | null;
    contract_pdf_url?: string | null;
    contract_pdf_key?: string | null;
    contract_html?: string | null;
  }
) {
  const { error } = await supabaseAdmin
    .from("agencies")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", agencyId);

  if (error) {
    console.error("[Database] Failed to update agency contract:", error);
    throw error;
  }
}

export async function getAgencyStats(agencyId: string) {
  const [jobsResult, contractsResult] = await Promise.all([
    supabaseAdmin.from("jobs").select("id, status").eq("agency_id", agencyId),
    supabaseAdmin.from("contracts").select("id, status").eq("agency_id", agencyId),
  ]);

  return {
    totalJobs: jobsResult.data?.length || 0,
    openJobs: jobsResult.data?.filter((j) => j.status === "open").length || 0,
    totalContracts: contractsResult.data?.length || 0,
    activeContracts: contractsResult.data?.filter((c) => c.status === "active").length || 0,
  };
}

export async function getAgencyByUserId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("agencies")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("[Database] Failed to get agency by user ID:", error);
    return null;
  }

  return data;
}

/**
 * Get agency for user context based on role
 * For agency users: returns their agency
 * For other roles: returns null (they should use role-specific routes)
 */
export async function getAgencyForUserContext(userId: string, role: string) {
  if (role === 'agency') {
    return await getAgencyByUserId(userId);
  }
  return null;
}

export async function getAgencyDashboardStats(agencyId: string) {
  const [candidatesResult, applicationsResult, contractsResult] = await Promise.all([
    supabaseAdmin.from("candidates").select("id, status").eq("agency_id", agencyId),
    supabaseAdmin
      .from("applications")
      .select("id, status, candidates!inner(agency_id)")
      .eq("candidates.agency_id", agencyId),
    supabaseAdmin
      .from("contracts")
      .select("id, status, candidates!inner(agency_id)")
      .eq("candidates.agency_id", agencyId),
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

export async function getCandidatesByAgencyId(agencyId: string) {
  // Use explicit agency_id relationship instead of city-based filtering
  const { data, error } = await supabaseAdmin
    .from("candidates")
    .select(`*, users(email, name)`)
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get candidates by agency_id:", error);
    return [];
  }

  return data || [];
}

export async function getApplicationsByAgencyId(agencyId: string) {
  // Use explicit agency_id relationship instead of city-based filtering
  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(
      `
      *,
      candidates!inner(id, full_name, agency_id),
      jobs(id, title, companies(company_name))
    `
    )
    .eq("candidates.agency_id", agencyId)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get applications by agency_id:", error);
    return [];
  }

  return data || [];
}

export async function getCompaniesByAgencyId(agencyId: string) {
  // Get companies that were imported/assigned to this specific agency
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get companies by agency_id:", error);
    return [];
  }

  return data || [];
}

export async function getJobsByAgencyId(agencyId: string) {
  const { data: agency } = await supabaseAdmin
    .from("agencies")
    .select("affiliate_id")
    .eq("id", agencyId)
    .single();

  if (!agency || !agency.affiliate_id) {
    console.error("[Database] Agency not found or has no affiliate_id");
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select(`*, companies(id, company_name, city)`)
    .eq("companies.affiliate_id", agency.affiliate_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get jobs by agency:", error);
    return [];
  }

  return data || [];
}

export async function getContractsByAgencyId(agencyId: string) {
  const { data, error } = await supabaseAdmin
    .from("contracts")
    .select(
      `
      *,
      candidates(id, full_name, agency_id),
      companies(id, company_name),
      jobs(id, title)
    `
    )
    .eq("candidates.agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get contracts by agency:", error);
    return [];
  }

  return data || [];
}

export async function getPaymentsByAgencyId(agencyId: string) {
  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      `
      *,
      contracts(
        id,
        candidates(id, full_name, agency_id),
        companies(id, company_name)
      )
    `
    )
    .eq("contracts.candidates.agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get payments by agency:", error);
    return [];
  }

  return data || [];
}

export async function getMeetingsByAgencyId(agencyId: string) {
  const { data, error } = await supabaseAdmin
    .from("scheduled_meetings")
    .select("*")
    .eq("agency_id", agencyId)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[Database] Failed to get meetings by agency:", error);
    return [];
  }

  return data || [];
}

