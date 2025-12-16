// @ts-nocheck
// Affiliate database operations
import { supabaseAdmin } from "../supabase";

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

export async function getSchoolsByAffiliateId(affiliateId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("schools")
    .select("*")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get schools by affiliate:", error);
    throw error;
  }

  return data || [];
}

export async function getCompaniesByAffiliateId(
  affiliateId: string,
  schoolId?: string | null
): Promise<any[]> {
  console.log("[getCompaniesByAffiliateId] affiliateId:", affiliateId, "schoolId:", schoolId);

  // If a specific school is selected, filter by school_id
  if (schoolId) {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .eq("affiliate_id", affiliateId)
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });

    console.log("[getCompaniesByAffiliateId] filtered by school - result:", data?.length, "companies");

    if (error) {
      console.error("[Database] Failed to get companies by affiliate/school:", error);
      throw error;
    }

    return data || [];
  }

  // No school selected - get all companies for this affiliate
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
  schoolId?: string | null
): Promise<any> {
  let targetCity: string | null = null;
  let schoolInfo: { totalSchools: number; activeSchools: number; pendingSchools: number } | null =
    null;

  if (schoolId) {
    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("city, status")
      .eq("id", schoolId)
      .single();

    targetCity = school?.city || null;
    schoolInfo = {
      totalSchools: 1,
      activeSchools: school?.status === "active" ? 1 : 0,
      pendingSchools: school?.status === "pending" ? 1 : 0,
    };
  } else {
    const { data: schools, error: schoolsError } = await supabaseAdmin
      .from("schools")
      .select("id, status")
      .eq("affiliate_id", affiliateId);

    if (schoolsError) {
      console.error("[Database] Failed to get schools for stats:", schoolsError);
    }

    schoolInfo = {
      totalSchools: schools?.length || 0,
      activeSchools: schools?.filter((s) => s.status === "active").length || 0,
      pendingSchools: schools?.filter((s) => s.status === "pending").length || 0,
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

  if (schoolId && targetCity) {
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
    ...schoolInfo,
    totalCandidates,
    totalJobs,
    openJobs,
    totalContracts,
    activeContracts,
  };
}

export async function getCandidatesByAffiliateId(
  affiliateId: string,
  schoolId?: string | null
): Promise<any[]> {
  let targetCity: string | null = null;

  if (schoolId) {
    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("city")
      .eq("id", schoolId)
      .single();
    targetCity = school?.city || null;
  } else {
    const { data: affiliate } = await supabaseAdmin
      .from("affiliates")
      .select("city")
      .eq("id", affiliateId)
      .single();
    targetCity = affiliate?.city || null;
  }

  if (!targetCity) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .eq("city", targetCity)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching affiliate candidates:", error);
    return [];
  }

  return data || [];
}

export async function getJobsByAffiliateId(
  affiliateId: string,
  schoolId?: string | null
): Promise<any[]> {
  if (schoolId) {
    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("city")
      .eq("id", schoolId)
      .single();

    if (school?.city) {
      const { data, error } = await supabaseAdmin
        .from("jobs")
        .select(
          `
          *,
          company:companies!jobs_company_id_fkey (
            id,
            company_name,
            affiliate_id,
            city
          )
        `
        )
        .eq("company.affiliate_id", affiliateId)
        .eq("company.city", school.city)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching affiliate jobs by school:", error);
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
      company:companies!jobs_company_id_fkey (
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
  schoolId?: string | null
): Promise<any[]> {
  const jobs = await getJobsByAffiliateId(affiliateId, schoolId);
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
        company:companies!jobs_company_id_fkey (
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
  schoolId?: string | null
): Promise<any[]> {
  const applications = await getApplicationsByAffiliateId(affiliateId, schoolId);
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
          company:companies!jobs_company_id_fkey (
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
  schoolId?: string | null
): Promise<any[]> {
  const contracts = await getContractsByAffiliateId(affiliateId, schoolId);
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
            company:companies!jobs_company_id_fkey (
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
