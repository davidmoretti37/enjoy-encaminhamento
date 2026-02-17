// @ts-nocheck
// Hiring process database operations
// Handles the flow from interview completion to employee management

import { supabase, supabaseAdmin } from "../supabase";

// ============================================
// TYPES
// ============================================

export interface HiringProcess {
  id: string;
  application_id: string;
  contract_id: string | null;
  batch_id: string | null;
  company_id: string;
  candidate_id: string;
  job_id: string;
  hiring_type: "estagio" | "clt" | "menor-aprendiz";
  status: "pending_signatures" | "pending_payment" | "active" | "completed" | "cancelled";
  is_first_intern: boolean;
  calculated_fee: number;
  company_signed: boolean;
  company_signed_at: string | null;
  company_signer_name: string | null;
  company_signer_cpf: string | null;
  candidate_signed: boolean;
  candidate_signed_at: string | null;
  candidate_signer_cpf: string | null;
  parent_signed: boolean;
  parent_signed_at: string | null;
  parent_signer_name: string | null;
  parent_signer_cpf: string | null;
  school_signed: boolean;
  school_signed_at: string | null;
  school_signer_name: string | null;
  school_signer_contact: string | null;
  start_date: string;
  end_date: string | null;
  monthly_salary: number | null;
  insurance_status: "pending" | "active" | "expired" | null;
  insurance_expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SigningInvitation {
  id: string;
  hiring_process_id: string;
  signer_role: "candidate" | "parent_guardian" | "educational_institution";
  signer_name: string;
  signer_email: string;
  signer_phone: string | null;
  token: string;
  email_sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signature: string | null;
  signer_cpf: string | null;
  signer_ip: string | null;
  expires_at: string;
  created_at: string;
}

export interface FollowUp {
  id: string;
  hiring_process_id: string | null;
  contract_id: string | null;
  company_id: string;
  scheduled_at: string;
  type: "monthly" | "bimonthly" | "clt_30_day" | "contract_expiring" | "insurance_expiring";
  notification_sent_at: string | null;
  completed_at: string | null;
  feedback_received: boolean;
  notes: string | null;
  created_at: string;
}

// ============================================
// HIRING PROCESS OPERATIONS
// ============================================

/**
 * Create a new hiring process
 */
export async function createHiringProcess(params: {
  applicationId: string;
  batchId?: string;
  companyId: string;
  candidateId: string;
  jobId: string;
  hiringType: "estagio" | "clt" | "menor-aprendiz";
  isFirstIntern: boolean;
  calculatedFee: number;
  startDate: string;
  endDate?: string;
  monthlySalary?: number;
  status?: string;
  paymentDay?: number;
  contractDurationMonths?: number;
}): Promise<HiringProcess> {
  const { data, error } = await supabaseAdmin
    .from("hiring_processes")
    .insert({
      application_id: params.applicationId,
      batch_id: params.batchId,
      company_id: params.companyId,
      candidate_id: params.candidateId,
      job_id: params.jobId,
      hiring_type: params.hiringType,
      is_first_intern: params.isFirstIntern,
      calculated_fee: params.calculatedFee,
      start_date: params.startDate,
      end_date: params.endDate,
      monthly_salary: params.monthlySalary,
      status: params.status || "pending_signatures",
      payment_day: params.paymentDay,
      contract_duration_months: params.contractDurationMonths,
      // For estágio, start insurance tracking
      insurance_status: params.hiringType === "estagio" ? "pending" : null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[Hiring] Failed to create hiring process:", error);
    throw error;
  }

  return data;
}

/**
 * Get hiring process by ID with full details
 */
export async function getHiringProcessById(id: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("hiring_processes")
    .select(`
      *,
      application:applications(*),
      contract:contracts(*),
      company:companies(id, company_name, email, cnpj),
      candidate:candidates(id, full_name, email, phone, cpf, parent_guardian_name, parent_guardian_email, parent_guardian_cpf, educational_institution_name, educational_institution_email),
      job:jobs(id, title, contract_type, salary),
      signing_invitations:signing_invitations(*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Hiring] Failed to get hiring process:", error);
    throw error;
  }

  return data;
}

/**
 * Get hiring processes by job ID (for agency visibility)
 */
export async function getHiringProcessesByJobId(jobId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("hiring_processes")
    .select(`
      id, status, hiring_type, created_at, start_date, end_date,
      company_signed, candidate_signed, parent_signed, school_signed,
      candidate:candidates(id, full_name),
      signing_invitations:signing_invitations(id, signer_role, signer_name, signer_email, signed_at, email_sent_at, token)
    `)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Hiring] Failed to get hiring processes by job:", error);
    return [];
  }

  return data || [];
}

/**
 * Get hiring process by application ID
 */
export async function getHiringProcessByApplication(applicationId: string): Promise<HiringProcess | null> {
  const { data, error } = await supabaseAdmin
    .from("hiring_processes")
    .select("*")
    .eq("application_id", applicationId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Hiring] Failed to get hiring process by application:", error);
    return null;
  }

  return data;
}

/**
 * Get all hiring processes for a company
 */
export async function getHiringProcessesByCompany(
  companyId: string,
  status?: string
): Promise<any[]> {
  let query = supabaseAdmin
    .from("hiring_processes")
    .select(`
      *,
      candidate:candidates(id, full_name, email, phone),
      job:jobs(id, title, contract_type),
      signing_invitations:signing_invitations(id, signer_role, signer_name, signed_at, email_sent_at, viewed_at)
    `)
    .eq("company_id", companyId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[Hiring] Failed to get company hiring processes:", error);
    return [];
  }

  return data || [];
}

/**
 * Update hiring process
 */
export async function updateHiringProcess(
  id: string,
  updates: Partial<HiringProcess>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("hiring_processes")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[Hiring] Failed to update hiring process:", error);
    throw error;
  }
}

/**
 * Count active estágio contracts for a company (for first intern check)
 */
export async function countActiveEstagioContracts(companyId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("hiring_processes")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("hiring_type", "estagio")
    .in("status", ["pending_signatures", "active"]);

  if (error) {
    console.error("[Hiring] Failed to count estágio contracts:", error);
    return 0;
  }

  return count || 0;
}

/**
 * Record company signature
 */
export async function recordCompanySignature(
  hiringProcessId: string,
  signerName: string,
  signerCpf: string,
  signature: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("hiring_processes")
    .update({
      company_signed: true,
      company_signed_at: new Date().toISOString(),
      company_signer_name: signerName,
      company_signer_cpf: signerCpf,
      company_signature: signature,
    })
    .eq("id", hiringProcessId);

  if (error) {
    console.error("[Hiring] Failed to record company signature:", error);
    throw error;
  }
}

/**
 * Record candidate signature
 */
export async function recordCandidateSignature(
  hiringProcessId: string,
  signerCpf: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("hiring_processes")
    .update({
      candidate_signed: true,
      candidate_signed_at: new Date().toISOString(),
      candidate_signer_cpf: signerCpf,
    })
    .eq("id", hiringProcessId);

  if (error) {
    console.error("[Hiring] Failed to record candidate signature:", error);
    throw error;
  }
}

/**
 * Record parent signature
 */
export async function recordParentSignature(
  hiringProcessId: string,
  signerName: string,
  signerCpf: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("hiring_processes")
    .update({
      parent_signed: true,
      parent_signed_at: new Date().toISOString(),
      parent_signer_name: signerName,
      parent_signer_cpf: signerCpf,
    })
    .eq("id", hiringProcessId);

  if (error) {
    console.error("[Hiring] Failed to record parent signature:", error);
    throw error;
  }
}

/**
 * Record school signature
 */
export async function recordSchoolSignature(
  hiringProcessId: string,
  signerName: string,
  signerContact: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("hiring_processes")
    .update({
      school_signed: true,
      school_signed_at: new Date().toISOString(),
      school_signer_name: signerName,
      school_signer_contact: signerContact,
    })
    .eq("id", hiringProcessId);

  if (error) {
    console.error("[Hiring] Failed to record school signature:", error);
    throw error;
  }
}

/**
 * Check if all signatures are complete
 */
export async function checkAllSignaturesComplete(hiringProcessId: string): Promise<{
  complete: boolean;
  signed: number;
  total: number;
  missing: string[];
}> {
  const process = await getHiringProcessById(hiringProcessId);
  if (!process) {
    return { complete: false, signed: 0, total: 0, missing: [] };
  }

  if (process.hiring_type === "clt") {
    // CLT only needs company signature
    return {
      complete: process.company_signed,
      signed: process.company_signed ? 1 : 0,
      total: 1,
      missing: process.company_signed ? [] : ["company"],
    };
  }

  // Estágio needs 4 signatures
  const missing: string[] = [];
  let signed = 0;

  if (process.company_signed) signed++;
  else missing.push("company");

  if (process.candidate_signed) signed++;
  else missing.push("candidate");

  if (process.parent_signed) signed++;
  else missing.push("parent_guardian");

  if (process.school_signed) signed++;
  else missing.push("educational_institution");

  return {
    complete: signed === 4,
    signed,
    total: 4,
    missing,
  };
}

// ============================================
// SIGNING INVITATIONS
// ============================================

/**
 * Create signing invitation for external party
 */
export async function createSigningInvitation(params: {
  hiringProcessId: string;
  signerRole: "candidate" | "parent_guardian" | "educational_institution";
  signerName: string;
  signerEmail: string;
  signerPhone?: string;
}): Promise<SigningInvitation> {
  const { data, error } = await supabaseAdmin
    .from("signing_invitations")
    .insert({
      hiring_process_id: params.hiringProcessId,
      signer_role: params.signerRole,
      signer_name: params.signerName,
      signer_email: params.signerEmail,
      signer_phone: params.signerPhone,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[Hiring] Failed to create signing invitation:", error);
    throw error;
  }

  return data;
}

/**
 * Get signing invitation by ID
 */
export async function getSigningInvitationById(id: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("signing_invitations")
    .select(`
      *,
      hiring_process:hiring_processes(
        *,
        candidate:candidates(id, full_name),
        company:companies(id, company_name),
        job:jobs(id, title)
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Hiring] Failed to get signing invitation by ID:", error);
    return null;
  }

  return data;
}

/**
 * Get signing invitation by token
 */
export async function getSigningInvitationByToken(token: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from("signing_invitations")
    .select(`
      *,
      hiring_process:hiring_processes(
        *,
        candidate:candidates(id, full_name),
        company:companies(id, company_name, agency_id),
        job:jobs(id, title, contract_type)
      )
    `)
    .eq("token", token)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Hiring] Failed to get signing invitation:", error);
    return null;
  }

  return data;
}

/**
 * Mark invitation as viewed
 */
export async function markInvitationViewed(invitationId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("signing_invitations")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", invitationId)
    .is("viewed_at", null);

  if (error) {
    console.error("[Hiring] Failed to mark invitation viewed:", error);
  }
}

/**
 * Complete signing invitation
 */
export async function completeSigningInvitation(
  invitationId: string,
  signature: string,
  signerCpf: string,
  signerIp?: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("signing_invitations")
    .update({
      signed_at: new Date().toISOString(),
      signature,
      signer_cpf: signerCpf,
      signer_ip: signerIp,
    })
    .eq("id", invitationId);

  if (error) {
    console.error("[Hiring] Failed to complete signing invitation:", error);
    throw error;
  }
}

/**
 * Update email sent timestamp
 */
export async function markInvitationEmailSent(invitationId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("signing_invitations")
    .update({ email_sent_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (error) {
    console.error("[Hiring] Failed to mark email sent:", error);
  }
}

/**
 * Get all signing invitations for a hiring process
 */
export async function getSigningInvitationsByHiringProcess(hiringProcessId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("signing_invitations")
    .select("*")
    .eq("hiring_process_id", hiringProcessId);

  if (error) {
    console.error("[Hiring] Failed to get signing invitations:", error);
    return [];
  }
  return data || [];
}

/**
 * Get unsent invitations for a hiring process (not yet emailed, not yet signed)
 */
export async function getUnsentInvitations(hiringProcessId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from("signing_invitations")
    .select(`
      *,
      hiring_process:hiring_processes(
        *,
        candidate:candidates(id, full_name),
        company:companies(id, company_name),
        job:jobs(id, title)
      )
    `)
    .eq("hiring_process_id", hiringProcessId)
    .is("email_sent_at", null)
    .is("signed_at", null);

  if (error) {
    console.error("[Hiring] Failed to get unsent invitations:", error);
    return [];
  }

  return data || [];
}

/**
 * Get pending invitations for a hiring process
 */
export async function getPendingInvitations(hiringProcessId: string): Promise<SigningInvitation[]> {
  const { data, error } = await supabaseAdmin
    .from("signing_invitations")
    .select("*")
    .eq("hiring_process_id", hiringProcessId)
    .is("signed_at", null)
    .gt("expires_at", new Date().toISOString());

  if (error) {
    console.error("[Hiring] Failed to get pending invitations:", error);
    return [];
  }

  return data || [];
}

// ============================================
// FOLLOW-UP SCHEDULE
// ============================================

/**
 * Create follow-up schedule for estágio (monthly for 3 months, then bimonthly)
 */
export async function createEstagioFollowUps(
  hiringProcessId: string,
  contractId: string,
  companyId: string,
  startDate: Date
): Promise<number> {
  const followUps: any[] = [];
  const contractEndDate = new Date(startDate);
  contractEndDate.setFullYear(contractEndDate.getFullYear() + 1);

  // Monthly for first 3 months
  for (let i = 1; i <= 3; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    followUps.push({
      hiring_process_id: hiringProcessId,
      contract_id: contractId,
      company_id: companyId,
      scheduled_at: date.toISOString(),
      type: "monthly",
    });
  }

  // Bimonthly from month 4 to end
  for (let month = 5; month <= 12; month += 2) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + month);
    if (date < contractEndDate) {
      followUps.push({
        hiring_process_id: hiringProcessId,
        contract_id: contractId,
        company_id: companyId,
        scheduled_at: date.toISOString(),
        type: "bimonthly",
      });
    }
  }

  // Contract expiring alert (30 days before)
  const expiryAlert = new Date(contractEndDate);
  expiryAlert.setDate(expiryAlert.getDate() - 30);
  followUps.push({
    hiring_process_id: hiringProcessId,
    contract_id: contractId,
    company_id: companyId,
    scheduled_at: expiryAlert.toISOString(),
    type: "contract_expiring",
  });

  const { error } = await supabaseAdmin
    .from("follow_up_schedule")
    .insert(followUps);

  if (error) {
    console.error("[Hiring] Failed to create estágio follow-ups:", error);
    throw error;
  }

  return followUps.length;
}

/**
 * Create single 30-day follow-up for CLT
 */
export async function createCLTFollowUp(
  hiringProcessId: string,
  companyId: string,
  startDate: Date
): Promise<void> {
  const followUpDate = new Date(startDate);
  followUpDate.setDate(followUpDate.getDate() + 30);

  const { error } = await supabaseAdmin
    .from("follow_up_schedule")
    .insert({
      hiring_process_id: hiringProcessId,
      company_id: companyId,
      scheduled_at: followUpDate.toISOString(),
      type: "clt_30_day",
    });

  if (error) {
    console.error("[Hiring] Failed to create CLT follow-up:", error);
    throw error;
  }
}

/**
 * Get upcoming follow-ups for a company
 */
export async function getUpcomingFollowUps(
  companyId: string,
  limit: number = 10
): Promise<FollowUp[]> {
  const { data, error } = await supabaseAdmin
    .from("follow_up_schedule")
    .select(`
      *,
      hiring_process:hiring_processes(
        id,
        candidate:candidates(id, full_name),
        job:jobs(id, title)
      )
    `)
    .eq("company_id", companyId)
    .is("completed_at", null)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[Hiring] Failed to get upcoming follow-ups:", error);
    return [];
  }

  return data || [];
}

/**
 * Mark follow-up as completed
 */
export async function completeFollowUp(
  followUpId: string,
  notes?: string,
  feedbackReceived: boolean = false
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("follow_up_schedule")
    .update({
      completed_at: new Date().toISOString(),
      notes,
      feedback_received: feedbackReceived,
    })
    .eq("id", followUpId);

  if (error) {
    console.error("[Hiring] Failed to complete follow-up:", error);
    throw error;
  }
}

// ============================================
// PAYMENT DAY CALCULATION (ANEC Rules)
// ============================================

/**
 * Calculate payment day based on start date
 * Days 1-10 → bill on 10th
 * Days 11-20 → bill on 20th
 * Days 21-30 → bill on 30th
 */
export function calculatePaymentDay(startDate: Date): number {
  const day = startDate.getDate();
  if (day <= 10) return 10;
  if (day <= 20) return 20;
  return 30;
}

/**
 * Calculate estágio fee based on whether it's first intern
 * First intern: R$150 (15000 cents)
 * Subsequent: R$130 (13000 cents)
 */
export function calculateEstagioFee(isFirstIntern: boolean): number {
  return isFirstIntern ? 15000 : 13000;
}

/**
 * Calculate CLT fee (50% of salary)
 */
export function calculateCLTFee(monthlySalary: number): number {
  return Math.round(monthlySalary * 0.5);
}
