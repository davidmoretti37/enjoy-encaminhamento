// @ts-nocheck
// Affiliate database operations
import { supabaseAdmin } from "../supabase";

export async function createAgencyInvitation(
  email: string,
  affiliateId: string,
  createdBy: string,
  notes?: string
): Promise<{ id: string; token: string }> {
  const { data, error } = await supabaseAdmin
    .from("agency_invitations")
    .insert({
      email,
      affiliate_id: affiliateId,
      created_by: createdBy,
      notes: notes || null,
      status: 'pending',
    })
    .select("id, token")
    .single();

  if (error) {
    console.error("[Database] Failed to create agency invitation:", error);
    throw error;
  }

  return data;
}

export async function getAgencyInvitationByToken(token: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("agency_invitations")
    .select("*, affiliates(id, name)")
    .eq("token", token)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get agency invitation:", error);
    return null;
  }

  return data;
}

export async function acceptAgencyInvitation(
  token: string,
  password: string,
  agencyData: {
    agency_name: string;
    cnpj: string;
    email: string;
    phone?: string;
    city?: string;
    state?: string;
    address?: string;
  },
  contractUrl?: string
): Promise<{ agency: any; user: any }> {
  // Get the invitation
  const invitation = await getAgencyInvitationByToken(token);
  if (!invitation) {
    throw new Error("Invitation not found");
  }
  if (invitation.status !== "pending") {
    throw new Error("Invitation already used");
  }
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error("Invitation expired");
  }

  // Create user account in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: invitation.email,
    password: password,
    email_confirm: true,
    user_metadata: {
      role: "agency",
    },
  });

  if (authError) {
    console.error("[Database] Failed to create auth user:", authError);
    throw authError;
  }

  const userId = authData.user.id;

  // Create user profile
  const { error: userError } = await supabaseAdmin
    .from("users")
    .insert({
      id: userId,
      email: invitation.email,
      role: "agency",
      name: agencyData.agency_name,
    });

  if (userError) {
    console.error("[Database] Failed to create user profile:", userError);
    throw userError;
  }

  // Create agency record
  // Note: Database may still use franchise_id instead of affiliate_id
  const { data: agency, error: agencyError } = await supabaseAdmin
    .from("agencies")
    .insert({
      user_id: userId,
      affiliate_id: invitation.affiliate_id,
      franchise_id: invitation.affiliate_id, // Legacy column name
      agency_name: agencyData.agency_name,
      cnpj: agencyData.cnpj,
      email: agencyData.email,
      phone: agencyData.phone || null,
      city: agencyData.city || null,
      state: agencyData.state || null,
      address: agencyData.address || null,
      status: "active",
      contract_pdf_url: contractUrl || null,
    })
    .select()
    .single();

  if (agencyError) {
    console.error("[Database] Failed to create agency:", agencyError);
    throw agencyError;
  }

  // Update invitation status
  await supabaseAdmin
    .from("agency_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      agency_id: agency.id,
    })
    .eq("token", token);

  return { agency, user: authData.user };
}

export async function getAllAffiliates(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("affiliates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get affiliates:", error);
    throw error;
  }

  return data || [];
}

export async function getAffiliateById(id: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("affiliates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[Database] Failed to get affiliate:", error);
    return null;
  }

  return data;
}

export async function getAffiliateByUserId(userId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("affiliates")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get affiliate by user:", error);
    return null;
  }

  return data;
}

export async function updateAffiliateStatus(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from("affiliates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[Database] Failed to update affiliate status:", error);
    throw error;
  }
}

export async function getAgenciesByAffiliateId(affiliateId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("agencies")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get agencies by affiliate:", error);
    throw error;
  }

  return data || [];
}

export async function getCompaniesByAffiliateId(
  affiliateId: string,
  agencyId?: string | null
): Promise<any[]> {
  console.log("[getCompaniesByAffiliateId] affiliateId:", affiliateId, "agencyId:", agencyId);

  // If a specific agency is selected, filter by agency_id
  if (agencyId) {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    console.log("[getCompaniesByAffiliateId] filtered by agency - result:", data?.length, "companies");

    if (error) {
      console.error("[Database] Failed to get companies by affiliate/agency:", error);
      throw error;
    }

    return data || [];
  }

  // No agency selected - get all companies for this affiliate
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });

  console.log("[getCompaniesByAffiliateId] all companies - result:", data?.length, "companies");

  if (error) {
    console.error("[Database] Failed to get companies by affiliate:", error);
    throw error;
  }

  return data || [];
}

export async function getAffiliateDashboardStats(
  affiliateId: string,
  agencyId?: string | null
): Promise<any> {
  let targetCity: string | null = null;
  let agencyInfo: { totalAgencies: number; activeAgencies: number; pendingAgencies: number } | null =
    null;

  if (agencyId) {
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("city, status")
      .eq("id", agencyId)
      .single();

    targetCity = agency?.city || null;
    agencyInfo = {
      totalAgencies: 1,
      activeAgencies: agency?.status === "active" ? 1 : 0,
      pendingAgencies: agency?.status === "pending" ? 1 : 0,
    };
  } else {
    const { data: agencies, error: agenciesError } = await supabaseAdmin
      .from("agencies")
      .select("id, status")
      .eq("affiliate_id", affiliateId);

    if (agenciesError) {
      console.error("[Database] Failed to get agencies for stats:", agenciesError);
    }

    agencyInfo = {
      totalAgencies: agencies?.length || 0,
      activeAgencies: agencies?.filter((s) => s.status === "active").length || 0,
      pendingAgencies: agencies?.filter((s) => s.status === "pending").length || 0,
    };

    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("city")
      .eq("id", affiliateId)
      .single();

    targetCity = affiliate?.city || null;
  }

  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("id")
    .eq("city", targetCity || "");

  const totalCandidates = candidates?.length || 0;

  let companiesQuery = supabaseAdmin
    .from("companies")
    .select("id")
    .eq("affiliate_id", affiliateId);

  if (agencyId && targetCity) {
    companiesQuery = companiesQuery.eq("city", targetCity);
  }

  const { data: companies } = await companiesQuery;
  const companyIds = companies?.map((c) => c.id) || [];

  let totalJobs = 0;
  let openJobs = 0;
  if (companyIds.length > 0) {
    const { data: jobs } = await supabaseAdmin
      .from("jobs")
      .select("id, status")
      .in("company_id", companyIds);

    totalJobs = jobs?.length || 0;
    openJobs = jobs?.filter((j) => j.status === "open").length || 0;
  }

  let totalContracts = 0;
  let activeContracts = 0;
  if (companyIds.length > 0) {
    const { data: contracts } = await supabaseAdmin
      .from("contracts")
      .select("id, status")
      .in("company_id", companyIds);

    totalContracts = contracts?.length || 0;
    activeContracts = contracts?.filter((c) => c.status === "active").length || 0;
  }

  return {
    ...agencyInfo,
    totalCandidates,
    totalJobs,
    openJobs,
    totalContracts,
    activeContracts,
  };
}

export async function getCandidatesByAffiliateId(
  affiliateId: string,
  agencyId?: string | null
): Promise<any[]> {
  // If a specific agency is selected, filter by agency_id
  if (agencyId) {
    const { data, error } = await supabaseAdmin
      .from("candidates")
      .select("*")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching affiliate candidates:", error);
      return [];
    }
    return data || [];
  }

  // Otherwise, get all agencies under this affiliate and fetch all their candidates
  const { data: agencies } = await supabaseAdmin
    .from("agencies")
    .select("id")
    .eq("affiliate_id", affiliateId);

  const agencyIds = (agencies || []).map(a => a.id);
  if (agencyIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .in("agency_id", agencyIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching affiliate candidates:", error);
    return [];
  }

  return data || [];
}

export async function getJobsByAffiliateId(
  affiliateId: string,
  agencyId?: string | null
): Promise<any[]> {
  if (agencyId) {
    const { data: agency } = await supabaseAdmin
      .from("agencies")
      .select("city")
      .eq("id", agencyId)
      .single();

    if (agency?.city) {
      const { data, error } = await supabaseAdmin
        .from("jobs")
        .select(
          `
          *,
          company:companies (
            id,
            company_name,
            affiliate_id,
            city
          )
        `
        )
        .eq("company.affiliate_id", affiliateId)
        .eq("company.city", agency.city)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching affiliate jobs by agency:", error);
        return [];
      }
      return data || [];
    }
  }

  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select(
      `
      *,
      company:companies (
        id,
        company_name,
        affiliate_id
      )
    `
    )
    .eq("company.affiliate_id", affiliateId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching affiliate jobs:", error);
    return [];
  }

  return data || [];
}

export async function getApplicationsByAffiliateId(
  affiliateId: string,
  agencyId?: string | null
): Promise<any[]> {
  const jobs = await getJobsByAffiliateId(affiliateId, agencyId);
  const jobIds = jobs.map((job) => job.id);

  if (jobIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(
      `
      *,
      candidate:candidates!applications_candidate_id_fkey (
        id,
        full_name,
        email,
        phone
      ),
      job:jobs!applications_job_id_fkey (
        id,
        title,
        company:companies (
          id,
          company_name
        )
      )
    `
    )
    .in("job_id", jobIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching affiliate applications:", error);
    throw error;
  }

  return data || [];
}

export async function getContractsByAffiliateId(
  affiliateId: string,
  agencyId?: string | null
): Promise<any[]> {
  const applications = await getApplicationsByAffiliateId(affiliateId, agencyId);
  const applicationIds = applications.map((app) => app.id);

  if (applicationIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("contracts")
    .select(
      `
      *,
      application:applications!contracts_application_id_fkey (
        id,
        candidate:candidates!applications_candidate_id_fkey (
          id,
          full_name
        ),
        job:jobs!applications_job_id_fkey (
          id,
          title,
          company:companies (
            id,
            company_name
          )
        )
      )
    `
    )
    .in("application_id", applicationIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching affiliate contracts:", error);
    throw error;
  }

  return data || [];
}

export async function getPaymentsByAffiliateId(
  affiliateId: string,
  agencyId?: string | null
): Promise<any[]> {
  const contracts = await getContractsByAffiliateId(affiliateId, agencyId);
  const contractIds = contracts.map((contract) => contract.id);

  if (contractIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("payments")
    .select(
      `
      *,
      contract:contracts!payments_contract_id_fkey (
        id,
        application:applications!contracts_application_id_fkey (
          candidate:candidates!applications_candidate_id_fkey (
            id,
            full_name
          ),
          job:jobs!applications_job_id_fkey (
            id,
            title,
            company:companies (
              id,
              company_name
            )
          )
        )
      )
    `
    )
    .in("contract_id", contractIds)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Error fetching affiliate payments:", error);
    throw error;
  }

  return data || [];
}
