// Agency database operations
import { supabaseAdmin } from "../supabase";

// Cast to any to work around TS 5.9 overload resolution issues with Supabase client
const db = supabaseAdmin as any;

export async function getAllAgencies() {
  const { data, error } = await db
    .from("agencies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get agencies:", error);
    return [];
  }

  const agencies = data || [];

  // Batch-fetch affiliate data for agencies that have an affiliate_id
  const affiliateIds = [...new Set(agencies.map((a: any) => a.affiliate_id).filter(Boolean))];
  let affiliateMap: Record<string, { name: string; contact_email: string }> = {};
  if (affiliateIds.length > 0) {
    const { data: affiliates } = await db
      .from("affiliates")
      .select("id, name, contact_email")
      .in("id", affiliateIds);
    for (const af of affiliates || []) {
      affiliateMap[af.id] = { name: af.name, contact_email: af.contact_email };
    }
  }

  return agencies.map((a: any) => ({
    ...a,
    affiliates: a.affiliate_id ? affiliateMap[a.affiliate_id] || null : null,
  }));
}

export async function getActiveAgenciesPublic() {
  const { data, error } = await db
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
  const { data, error } = await db
    .from("agencies")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get agency:", error);
    return null;
  }

  if (!data) return null;

  // Fetch affiliate data separately to avoid PostgREST relationship inference issues
  let affiliateData = null;
  if (data.affiliate_id) {
    const { data: affiliate } = await db
      .from("affiliates")
      .select("name, contact_email, city")
      .eq("id", data.affiliate_id)
      .single();
    affiliateData = affiliate;
  }

  return { ...data, affiliates: affiliateData };
}

export async function updateAgencyStatus(
  id: string,
  status: "pending" | "active" | "suspended" | "rejected",
  rejectionReason?: string | null
) {
  const patch: any = { status, updated_at: new Date().toISOString() };
  if (status === "rejected") patch.rejection_reason = rejectionReason ?? null;
  const { error } = await db.from("agencies").update(patch).eq("id", id);

  if (error) {
    console.error("[Database] Failed to update agency status:", error);
    throw error;
  }
}

export async function updateAgency(id: string, data: any) {
  const { error } = await db
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
  const { error } = await db
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
    db.from("jobs").select("id, status").eq("agency_id", agencyId),
    db.from("contracts").select("id, status").eq("agency_id", agencyId),
  ]);

  return {
    totalJobs: jobsResult.data?.length || 0,
    openJobs: jobsResult.data?.filter((j: any) => j.status === "open").length || 0,
    totalContracts: contractsResult.data?.length || 0,
    activeContracts: contractsResult.data?.filter((c: any) => c.status === "active").length || 0,
  };
}

export async function getAgencyByUserId(userId: string) {
  const { data, error } = await db
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
 * For admin users: returns the agency they've selected via agency context switcher
 * For other roles: returns null
 */
export async function getAgencyForUserContext(userId: string, role: string) {
  if (role === 'agency') {
    return await getAgencyByUserId(userId);
  }
  if (role === 'admin' || role === 'super_admin') {
    const { getAdminAgencyContext } = await import("./scheduling");
    const agencyId = await getAdminAgencyContext(userId);
    if (!agencyId) return null;
    return await getAgencyById(agencyId);
  }
  return null;
}

export async function getAgencyDashboardStats(agencyId: string) {
  const [candidatesResult, applicationsResult, contractsResult] = await Promise.all([
    db.from("candidates").select("id, status").eq("agency_id", agencyId),
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
    activeCandidates: candidates.filter((c: any) => c.status === "active").length,
    employedCandidates: candidates.filter((c: any) => c.status === "employed").length,
    totalApplications: applications.length,
    activeApplications: applications.filter(
      (a: any) => a.status === "in_progress" || a.status === "interviewing"
    ).length,
    totalHired: contracts.filter((c: any) => c.status === "active" || c.status === "completed").length,
  };
}

export async function getCandidatesByAgencyId(agencyId: string) {
  // Use explicit agency_id relationship instead of city-based filtering
  const { data, error } = await db
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
  const { data, error } = await db
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

  const results = data || [];

  if (results.length === 0) {
    console.warn('[getApplicationsByAgencyId] No applications found for agencyId:', agencyId,
      '— check for candidates with null agency_id');
  }

  return results;
}

export async function getCompaniesByAgencyId(agencyId: string) {
  // Get companies that were imported/assigned to this specific agency
  const { data, error } = await db
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
  // Tenant-scope to jobs whose company belongs to THIS agency.
  // `companies!inner` makes the embed filter actually restrict the parent
  // `jobs` rows; a non-inner embed filter does not (PostgREST returns every
  // row with the embed nulled). Scope by companies.agency_id (the canonical
  // company->agency assignment key) rather than affiliate_id, so Uberlândia
  // and Ipatinga see only their own jobs, not the whole head-agency region.
  const { data, error } = await db
    .from("jobs")
    .select(`*, companies!inner(id, company_name, city, agency_id)`)
    .eq("companies.agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get jobs by agency:", error);
    return [];
  }

  return data || [];
}

export async function getContractsByAgencyId(agencyId: string) {
  // `candidates!inner` so the agency_id filter actually restricts the parent
  // `contracts` rows (a non-inner embed filter returns every contract in the
  // table with `candidates` nulled). Matches getAgencyDashboardStats, which
  // also scopes contracts by candidates.agency_id, so list == dashboard count.
  const { data, error } = await db
    .from("contracts")
    .select(
      `
      *,
      candidates!inner(id, full_name, agency_id),
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
  const { data, error } = await db
    .from("payments")
    .select(
      `
      *,
      companies!inner(id, company_name, agency_id),
      contracts(
        id, contract_number,
        candidate:candidates(id, full_name),
        job:jobs(id, title)
      )
    `
    )
    .eq("companies.agency_id", agencyId)
    .order("due_date", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get payments by agency:", error);
    return [];
  }

  return data || [];
}

export async function getMeetingsByAgencyId(agencyId: string) {
  const { data, error } = await db
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

