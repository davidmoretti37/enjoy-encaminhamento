// Affiliate database operations
import { supabaseAdmin } from "../supabase";

const db = supabaseAdmin as any;

export async function createAgencyInvitation(
  email: string,
  affiliateId: string,
  createdBy: string,
  notes?: string
): Promise<{ id: string; token: string }> {
  const { data, error } = await db
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
  const { data, error } = await db
    .from("agency_invitations")
    .select("*")
    .eq("token", token)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get agency invitation:", error);
    return null;
  }

  if (!data) return null;

  // Fetch affiliate data separately to avoid PostgREST relationship inference issues
  let affiliateData = null;
  if (data.affiliate_id) {
    const { data: affiliate } = await db
      .from("affiliates")
      .select("id, name")
      .eq("id", data.affiliate_id)
      .single();
    affiliateData = affiliate;
  }

  return { ...data, affiliates: affiliateData };
}

export async function acceptAgencyInvitation(
  token: string,
  password: string,
  agencyData: {
    agency_name: string;
    cnpj?: string;
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

  // Create user account in Supabase Auth (or reuse existing)
  let userId: string;
  let isExistingUser = false;

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email: invitation.email,
    password: password,
    email_confirm: true,
    user_metadata: {
      role: "agency",
    },
  });

  if (authError) {
    // If user already exists, reuse their account and update role to agency
    const msg = authError.message || "";
    if (msg.includes("already been registered") || msg.includes("already exists")) {
      console.log("[Database] User already exists, converting to agency:", invitation.email);
      const { data: listData } = await db.auth.admin.listUsers();
      const existingUser = listData?.users?.find((u: any) => u.email === invitation.email);
      if (!existingUser) {
        throw new Error("User exists in auth but could not be found by email");
      }
      // Update their auth metadata role to agency
      await db.auth.admin.updateUserById(existingUser.id, {
        user_metadata: { role: "agency" },
      });
      userId = existingUser.id;
      isExistingUser = true;
    } else {
      console.error("[Database] Failed to create auth user:", authError);
      throw authError;
    }
  } else {
    userId = authData.user.id;
  }

  // Create or update user profile (upsert handles existing users)
  const { error: userError } = await db
    .from("users")
    .upsert({
      id: userId,
      email: invitation.email,
      role: "agency",
      name: agencyData.agency_name,
    }, { onConflict: "id" });

  if (userError) {
    console.error("[Database] Failed to upsert user profile:", userError);
    // Clean up auth user if we just created it
    if (!isExistingUser) {
      await db.auth.admin.deleteUser(userId).catch(() => {});
    }
    throw userError;
  }

  // Create agency record
  const { data: agency, error: agencyError } = await db
    .from("agencies")
    .insert({
      user_id: userId,
      affiliate_id: invitation.affiliate_id,
      agency_name: agencyData.agency_name,
      cnpj: agencyData.cnpj || null,
      email: agencyData.email,
      phone: agencyData.phone || null,
      city: agencyData.city || null,
      state: agencyData.state || null,
      address: agencyData.address || null,
      status: "active",
    })
    .select()
    .single();

  if (agencyError) {
    console.error("[Database] Failed to create agency:", agencyError);
    // Clean up: revert user profile role if existing user, or delete new user
    if (isExistingUser) {
      await db.from("users").update({ role: "company" }).eq("id", userId).catch(() => {});
    } else {
      await db.auth.admin.deleteUser(userId).catch(() => {});
    }
    throw agencyError;
  }

  // Update invitation status
  await db
    .from("agency_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      agency_id: agency.id,
    })
    .eq("token", token);

  return { agency, user: authData?.user || { id: userId, email: invitation.email } };
}

export async function getAllAffiliates(): Promise<any[]> {
  const { data, error } = await db
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
  const { data, error } = await db
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
  const { data, error } = await db
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
  const { error } = await db
    .from("affiliates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[Database] Failed to update affiliate status:", error);
    throw error;
  }
}

export async function getAgenciesByAffiliateId(affiliateId: string): Promise<any[]> {
  const { data, error } = await db
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
    const { data, error } = await db
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
  const { data, error } = await db
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
  // Resolve the set of agencies this stat call covers: a single agency (per-city
  // drill-down) or every agency under the affiliate (combined "Todas" view).
  let agencyIds: string[] = [];
  let agencyInfo: { totalAgencies: number; activeAgencies: number; pendingAgencies: number };

  if (agencyId) {
    const { data: agency } = await db
      .from("agencies")
      .select("id, status")
      .eq("id", agencyId)
      .single();
    agencyIds = agency ? [agency.id] : [];
    agencyInfo = {
      totalAgencies: 1,
      activeAgencies: agency?.status === "active" ? 1 : 0,
      pendingAgencies: agency?.status === "pending" ? 1 : 0,
    };
  } else {
    const { data: agencies, error: agenciesError } = await db
      .from("agencies")
      .select("id, status")
      .eq("affiliate_id", affiliateId);
    if (agenciesError) {
      console.error("[Database] Failed to get agencies for stats:", agenciesError);
    }
    agencyIds = (agencies || []).map((a: any) => a.id);
    agencyInfo = {
      totalAgencies: agencies?.length || 0,
      activeAgencies: agencies?.filter((s: any) => s.status === "active").length || 0,
      pendingAgencies: agencies?.filter((s: any) => s.status === "pending").length || 0,
    };
  }

  const zero = {
    ...agencyInfo,
    totalCandidates: 0, activeCandidates: 0, employedCandidates: 0,
    totalApplications: 0, activeApplications: 0, totalHired: 0,
    totalJobs: 0, openJobs: 0, totalContracts: 0, activeContracts: 0,
  };
  if (agencyIds.length === 0) return zero;

  // Scope everything by agency_id — matches getAgencyDashboardStats exactly, so
  // the combined view is the true SUM of the per-agency numbers (the old code
  // counted candidates by city, which is why the head-owner cards read 0).
  // Include unassigned (null-agency) candidates/applications so the national
  // head's dashboard counts match the "Todas" candidate list (see
  // getCandidatesByAffiliateId). Per-agency drill-down (agencyId set) keeps a
  // strict single-agency scope below because agencyIds is then just that one id.
  const candFilter = agencyId
    ? undefined
    : `agency_id.in.(${agencyIds.join(",")}),agency_id.is.null`;

  const candQuery = db.from("candidates").select("id, status");
  const { data: candidates } = candFilter
    ? await candQuery.or(candFilter)
    : await candQuery.in("agency_id", agencyIds);
  const cand = candidates || [];

  const appQuery = db
    .from("applications")
    .select("id, status, candidates!inner(agency_id)");
  const { data: applications } = candFilter
    ? await appQuery.or(candFilter, { referencedTable: "candidates" })
    : await appQuery.in("candidates.agency_id", agencyIds);
  const apps = applications || [];

  const { data: companies } = await db
    .from("companies")
    .select("id")
    .in("agency_id", agencyIds);
  const companyIds = (companies || []).map((c: any) => c.id);

  let totalJobs = 0;
  let openJobs = 0;
  if (companyIds.length > 0) {
    const { data: jobs } = await db
      .from("jobs")
      .select("id, status")
      .in("company_id", companyIds);
    totalJobs = jobs?.length || 0;
    openJobs = jobs?.filter((j: any) => j.status === "open").length || 0;
  }

  const { data: contracts } = await db
    .from("contracts")
    .select("id, status")
    .in("agency_id", agencyIds);
  const cons = contracts || [];

  return {
    ...agencyInfo,
    totalCandidates: cand.length,
    activeCandidates: cand.filter((c: any) => c.status === "active").length,
    employedCandidates: cand.filter((c: any) => c.status === "employed").length,
    totalApplications: apps.length,
    activeApplications: apps.filter(
      (a: any) => a.status === "in_progress" || a.status === "interviewing"
    ).length,
    totalHired: cons.filter((c: any) => c.status === "active" || c.status === "completed").length,
    totalJobs,
    openJobs,
    totalContracts: cons.length,
    activeContracts: cons.filter((c: any) => c.status === "active").length,
  };
}

export async function getCandidatesByAffiliateId(
  affiliateId: string,
  agencyId?: string | null
): Promise<any[]> {
  // If a specific agency is selected, filter by agency_id
  if (agencyId) {
    const { data, error } = await db
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
  const { data: agencies } = await db
    .from("agencies")
    .select("id")
    .eq("affiliate_id", affiliateId);

  const agencyIds = (agencies || []).map((a: any) => a.id);
  if (agencyIds.length === 0) return [];

  // National ("Todas") view: this affiliate's agencies PLUS unassigned candidates.
  // A candidate who signs up under "Outra Região" gets agency_id = null (no local
  // sub-agency to hold them); a bare `.in(agencyIds)` silently dropped those from
  // the head's list. The national head is the top of the org, so orphaned
  // candidates must surface here or they fall into a black hole.
  const { data, error } = await db
    .from("candidates")
    .select("*")
    .or(`agency_id.in.(${agencyIds.join(",")}),agency_id.is.null`)
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
  // PER-CITY view: the head selected one sub-agency. Scope to that agency's
  // companies via `companies!inner` on company.agency_id (an inner embed so
  // the filter restricts the parent `jobs` rows). This replaces the old
  // fragile free-text `company.city` match, which — being a non-inner embed
  // filter — did not restrict jobs at all and returned the whole table.
  if (agencyId) {
    const { data, error } = await db
      .from("jobs")
      .select(
        `
        *,
        company:companies!inner (
          id,
          company_name,
          affiliate_id,
          agency_id,
          city
        )
      `
      )
      .eq("company.agency_id", agencyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching affiliate jobs by agency:", error);
      return [];
    }
    return data || [];
  }

  // COMBINED view: all jobs across every company under this head agency.
  // `companies!inner` so the affiliate_id filter actually restricts jobs.
  const { data, error } = await db
    .from("jobs")
    .select(
      `
      *,
      company:companies!inner (
        id,
        company_name,
        affiliate_id,
        agency_id
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

  const { data, error } = await db
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

  const { data, error } = await db
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
  // Get agencies for this affiliate
  const agencies = await getAgenciesByAffiliateId(affiliateId);
  let agencyIds = agencies.map((a: any) => a.id);

  // Filter to specific agency if provided
  if (agencyId) {
    agencyIds = agencyIds.filter((id: string) => id === agencyId);
  }

  if (agencyIds.length === 0) {
    return [];
  }

  // Query payments through companies belonging to these agencies
  const { data, error } = await db
    .from("payments")
    .select(
      `
      *,
      companies!inner(id, company_name, agency_id),
      contracts(id, contract_number)
    `
    )
    .in("companies.agency_id", agencyIds)
    .order("due_date", { ascending: false });

  if (error) {
    console.error("Error fetching affiliate payments:", error);
    throw error;
  }

  return data || [];
}
