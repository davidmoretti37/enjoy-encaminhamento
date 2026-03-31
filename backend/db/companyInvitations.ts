// Company invitation database operations
import { supabaseAdmin } from "../supabase";

// Table not yet in generated Database types — use untyped client for queries
const db = supabaseAdmin as any;

export async function createCompanyInvitation(
  companyId: string,
  email: string,
  createdBy: string
): Promise<{ id: string; token: string }> {
  const { data, error } = await db
    .from("company_invitations")
    .insert({
      company_id: companyId,
      email,
      created_by: createdBy,
      status: "pending",
    })
    .select("id, token")
    .single();

  if (error) {
    console.error("[Database] Failed to create company invitation:", error);
    throw error;
  }

  return data;
}

export async function getCompanyInvitationByToken(token: string): Promise<any | null> {
  const { data, error } = await db
    .from("company_invitations")
    .select(`
      *,
      companies (
        id,
        company_name,
        business_name,
        email,
        agency_id,
        agencies (
          id,
          agency_name,
          affiliate_id
        )
      )
    `)
    .eq("token", token)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get company invitation:", error);
    return null;
  }

  return data;
}

export async function getCompanyInvitationByCompanyId(companyId: string): Promise<any | null> {
  const { data, error } = await db
    .from("company_invitations")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Database] Failed to get company invitation by company id:", error);
    return null;
  }

  return data;
}

export async function acceptCompanyInvitation(
  token: string,
  password: string
): Promise<{ company: any; user: any }> {
  // Get the invitation with company data
  const invitation = await getCompanyInvitationByToken(token);
  if (!invitation) {
    throw new Error("Invitation not found");
  }
  if (invitation.status !== "pending") {
    throw new Error("Invitation already used");
  }
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error("Invitation expired");
  }

  const company = invitation.companies;
  if (!company) {
    throw new Error("Company not found");
  }

  // Create user account in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: invitation.email,
    password: password,
    email_confirm: true,
    user_metadata: {
      role: "company",
    },
  });

  if (authError) {
    console.error("[Database] Failed to create auth user:", authError);
    throw authError;
  }

  const userId = authData.user.id;

  // Create user profile
  const { error: userError } = await (supabaseAdmin as any)
    .from("users")
    .insert({
      id: userId,
      email: invitation.email,
      role: "company",
      name: company.company_name,
      agency_id: company.agency_id,
    });

  if (userError) {
    console.error("[Database] Failed to create user profile:", userError);
    throw userError;
  }

  // Link user_id to the existing company record
  const { data: updatedCompany, error: companyError } = await (supabaseAdmin as any)
    .from("companies")
    .update({
      user_id: userId,
      status: "active",
    })
    .eq("id", company.id)
    .select()
    .single();

  if (companyError) {
    console.error("[Database] Failed to link user to company:", companyError);
    throw companyError;
  }

  // Update invitation status
  await db
    .from("company_invitations")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("token", token);

  return { company: updatedCompany, user: authData.user };
}

export async function getCompanyInvitationsByAgency(agencyId: string): Promise<any[]> {
  const { data, error } = await db
    .from("company_invitations")
    .select(`
      *,
      companies (
        id,
        company_name,
        email
      )
    `)
    .eq("companies.agency_id", agencyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get company invitations:", error);
    return [];
  }

  return data || [];
}

export async function revokeCompanyInvitation(token: string): Promise<void> {
  const { error } = await db
    .from("company_invitations")
    .update({
      status: "revoked",
    })
    .eq("token", token);

  if (error) {
    console.error("[Database] Failed to revoke company invitation:", error);
    throw error;
  }
}

export async function getJobsForCompany(companyId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("id, title, contract_type, status")
    .eq("company_id", companyId)
    .limit(5);

  if (error) {
    console.error("[Database] Failed to get jobs for company:", error);
    return [];
  }

  return data || [];
}
