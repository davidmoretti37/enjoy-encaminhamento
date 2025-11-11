import { supabase, supabaseAdmin } from './supabase';
import type { Database } from './types/database';

type User = Database['public']['Tables']['users']['Row'];
type InsertUser = Database['public']['Tables']['users']['Insert'];
type Company = Database['public']['Tables']['companies']['Row'];
type InsertCompany = Database['public']['Tables']['companies']['Insert'];
type Candidate = Database['public']['Tables']['candidates']['Row'];
type InsertCandidate = Database['public']['Tables']['candidates']['Insert'];
type Job = Database['public']['Tables']['jobs']['Row'];
type InsertJob = Database['public']['Tables']['jobs']['Insert'];
type Application = Database['public']['Tables']['applications']['Row'];
type InsertApplication = Database['public']['Tables']['applications']['Insert'];
type Contract = Database['public']['Tables']['contracts']['Row'];
type InsertContract = Database['public']['Tables']['contracts']['Insert'];
type Feedback = Database['public']['Tables']['feedback']['Row'];
type InsertFeedback = Database['public']['Tables']['feedback']['Insert'];
type Payment = Database['public']['Tables']['payments']['Row'];
type InsertPayment = Database['public']['Tables']['payments']['Insert'];
type Document = Database['public']['Tables']['documents']['Row'];
type InsertDocument = Database['public']['Tables']['documents']['Insert'];
type Notification = Database['public']['Tables']['notifications']['Row'];
type InsertNotification = Database['public']['Tables']['notifications']['Insert'];

// ==================== USER FUNCTIONS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  const { error } = await supabaseAdmin
    .from('users')
    .upsert(user, { onConflict: 'id' });

  if (error) {
    console.error('[Database] Failed to upsert user:', error);
    throw error;
  }
}

export async function getUserById(id: string): Promise<User | undefined> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Database] Failed to get user:', error);
    return undefined;
  }

  return data || undefined;
}

// ==================== COMPANY FUNCTIONS ====================

export async function createCompany(company: InsertCompany): Promise<string> {
  const { data, error } = await supabase
    .from('companies')
    .insert(company)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getCompanyByUserId(userId: string): Promise<Company | undefined> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Database] Failed to get company:', error);
    return undefined;
  }

  return data || undefined;
}

export async function getCompanyById(id: string): Promise<Company | undefined> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') return undefined;
  return data || undefined;
}

export async function getAllCompanies(): Promise<Company[]> {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select(`
      *,
      users!companies_user_id_fkey1(email, name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get companies:', error);
    return [];
  }

  return data || [];
}

export async function updateCompanyStatus(id: string, status: 'pending' | 'active' | 'suspended' | 'inactive', updatedBy: string): Promise<void> {
  const updates: any = { status };

  if (status === 'active') {
    updates.approved_at = new Date().toISOString();
    updates.approved_by = updatedBy;
    updates.suspended_at = null;
    updates.suspended_by = null;
    updates.suspended_reason = null;
  } else if (status === 'suspended') {
    updates.suspended_at = new Date().toISOString();
    updates.suspended_by = updatedBy;
  }

  const { error } = await supabaseAdmin
    .from('companies')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update company status:', error);
    throw error;
  }
}

export async function updateCompany(id: string, data: Partial<InsertCompany>): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}

// ==================== CANDIDATE FUNCTIONS ====================

export async function createCandidate(candidate: InsertCandidate): Promise<string> {
  const { data, error } = await supabase
    .from('candidates')
    .insert(candidate)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getCandidateByUserId(userId: string): Promise<Candidate | undefined> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') return undefined;
  return data || undefined;
}

export async function getCandidateById(id: string): Promise<Candidate | undefined> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') return undefined;
  return data || undefined;
}

export async function getAllCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateCandidate(id: string, data: Partial<InsertCandidate>): Promise<void> {
  const { error } = await supabase
    .from('candidates')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}

export async function searchCandidates(filters: {
  educationLevel?: string;
  city?: string;
  availableForInternship?: boolean;
  availableForCLT?: boolean;
  status?: string;
}): Promise<Candidate[]> {
  let query = supabase.from('candidates').select('*');

  if (filters.educationLevel) {
    query = query.eq('education_level', filters.educationLevel);
  }
  if (filters.city) {
    query = query.eq('city', filters.city);
  }
  if (filters.availableForInternship !== undefined) {
    query = query.eq('available_for_internship', filters.availableForInternship);
  }
  if (filters.availableForCLT !== undefined) {
    query = query.eq('available_for_clt', filters.availableForCLT);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

// ==================== JOB FUNCTIONS ====================

export async function createJob(job: InsertJob): Promise<string> {
  const { data, error } = await supabase
    .from('jobs')
    .insert(job)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getJobById(id: string): Promise<Job | undefined> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') return undefined;
  return data || undefined;
}

export async function getJobsByCompanyId(companyId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllOpenJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('status', 'open')
    .order('published_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateJob(id: string, data: Partial<InsertJob>): Promise<void> {
  const { error } = await supabase
    .from('jobs')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}

export async function searchJobs(filters: {
  contractType?: string;
  workType?: string;
  city?: string;
  status?: string;
}): Promise<Job[]> {
  let query = supabase.from('jobs').select('*');

  if (filters.contractType) {
    query = query.eq('contract_type', filters.contractType);
  }
  if (filters.workType) {
    query = query.eq('work_type', filters.workType);
  }
  if (filters.city) {
    query = query.eq('location', filters.city);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllJobs(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select(`
      *,
      companies(company_name, email),
      users(name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get jobs:', error);
    return [];
  }

  return data || [];
}

export async function updateJobStatus(id: string, status: 'draft' | 'open' | 'closed' | 'filled', updatedBy: string): Promise<void> {
  const updates: any = { status };

  if (status === 'open') {
    updates.published_at = new Date().toISOString();
  } else if (status === 'closed' || status === 'filled') {
    updates.closed_at = new Date().toISOString();
    updates.closed_by = updatedBy;
    if (status === 'filled') {
      updates.filled_at = new Date().toISOString();
    }
  }

  const { error } = await supabaseAdmin
    .from('jobs')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update job status:', error);
    throw error;
  }
}

// ==================== APPLICATION FUNCTIONS ====================

export async function createApplication(application: InsertApplication): Promise<string> {
  const { data, error } = await supabase
    .from('applications')
    .insert(application)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getApplicationById(id: string): Promise<Application | undefined> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') return undefined;
  return data || undefined;
}

export async function getApplicationsByJobId(jobId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('job_id', jobId)
    .order('applied_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getApplicationsByCandidateId(candidateId: string): Promise<Application[]> {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('applied_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateApplication(id: string, data: Partial<InsertApplication>): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}

// ==================== CONTRACT FUNCTIONS ====================

export async function createContract(contract: InsertContract): Promise<string> {
  const { data, error } = await supabase
    .from('contracts')
    .insert(contract)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getContractById(id: string): Promise<Contract | undefined> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') return undefined;
  return data || undefined;
}

export async function getContractsByCompanyId(companyId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getContractsByCandidateId(candidateId: string): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getAllActiveContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('status', 'active')
    .order('start_date', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateContract(id: string, data: Partial<InsertContract>): Promise<void> {
  const { error } = await supabase
    .from('contracts')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}

// ==================== FEEDBACK FUNCTIONS ====================

export async function createFeedback(feedbackData: InsertFeedback): Promise<string> {
  const { data, error } = await supabase
    .from('feedback')
    .insert(feedbackData)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getFeedbackByContractId(contractId: string): Promise<Feedback[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('contract_id', contractId)
    .order('review_year', { ascending: false })
    .order('review_month', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function updateFeedback(id: string, data: Partial<InsertFeedback>): Promise<void> {
  const { error } = await supabase
    .from('feedback')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}

// ==================== PAYMENT FUNCTIONS ====================

export async function createPayment(payment: InsertPayment): Promise<string> {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getPaymentsByContractId(contractId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('contract_id', contractId)
    .order('due_date', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getPaymentsByCompanyId(companyId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('company_id', companyId)
    .order('due_date', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getOverduePayments(): Promise<Payment[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('status', 'pending')
    .lte('due_date', now)
    .order('due_date', { ascending: true });

  if (error) return [];
  return data || [];
}

export async function updatePayment(id: string, data: Partial<InsertPayment>): Promise<void> {
  const { error } = await supabase
    .from('payments')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}

// ==================== DOCUMENT FUNCTIONS ====================

export async function createDocument(document: InsertDocument): Promise<string> {
  const { data, error } = await supabase
    .from('documents')
    .insert(document)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getDocumentsByRelatedEntity(
  relatedToType: string,
  relatedToId: string
): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('related_to_type', relatedToType)
    .eq('related_to_id', relatedToId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

// ==================== NOTIFICATION FUNCTIONS ====================

export async function createNotification(notification: InsertNotification): Promise<string> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getNotificationsByUserId(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return data || [];
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

// ==================== ANALYTICS FUNCTIONS ====================

export async function getDashboardStats() {
  const [
    { count: totalCompanies },
    { count: totalCandidates },
    { count: totalJobs },
    { count: activeContracts },
    { count: pendingApplications }
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('candidates').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'applied')
  ]);

  return {
    totalCompanies: totalCompanies || 0,
    totalCandidates: totalCandidates || 0,
    totalOpenJobs: totalJobs || 0,
    activeContracts: activeContracts || 0,
    pendingApplications: pendingApplications || 0
  };
}

// ==================== SCHOOL FUNCTIONS (NEW) ====================

export async function getAllSchools() {
  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*, franchises(name, contact_email)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get schools:', error);
    return [];
  }

  return data || [];
}

export async function getSchoolById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*, franchises(name, contact_email, region)')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Database] Failed to get school:', error);
    return null;
  }

  return data;
}

export async function updateSchoolStatus(id: string, status: 'pending' | 'active' | 'suspended') {
  const { error } = await supabaseAdmin
    .from('schools')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update school status:', error);
    throw error;
  }
}

export async function updateSchool(id: string, data: any) {
  const { error } = await supabaseAdmin
    .from('schools')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update school:', error);
    throw error;
  }
}

export async function getSchoolStats(schoolId: string) {
  const [jobsResult, contractsResult] = await Promise.all([
    supabaseAdmin.from('jobs').select('id, status').eq('school_id', schoolId),
    supabaseAdmin.from('contracts').select('id, status').eq('school_id', schoolId)
  ]);

  return {
    totalJobs: jobsResult.data?.length || 0,
    openJobs: jobsResult.data?.filter(j => j.status === 'open').length || 0,
    totalContracts: contractsResult.data?.length || 0,
    activeContracts: contractsResult.data?.filter(c => c.status === 'active').length || 0
  };
}

// ==================== CANDIDATE ADMIN FUNCTIONS (NEW) ====================

export async function getAllCandidatesForAdmin() {
  const { data, error } = await supabaseAdmin
    .from('candidates')
    .select(`
      *,
      users(email, name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get candidates for admin:', error);
    return [];
  }

  return data || [];
}

export async function getCandidateByIdForAdmin(id: string) {
  const { data, error } = await supabaseAdmin
    .from('candidates')
    .select(`
      *,
      users(email, name),
      applications(
        id,
        status,
        applied_at,
        jobs(
          id,
          title,
          schools(school_name, franchises(name))
        )
      ),
      contracts(
        id,
        status,
        start_date,
        end_date,
        schools(school_name)
      )
    `)
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Database] Failed to get candidate for admin:', error);
    return null;
  }

  return data;
}

export async function updateCandidateStatus(id: string, status: 'active' | 'inactive' | 'employed') {
  const { error } = await supabaseAdmin
    .from('candidates')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update candidate status:', error);
    throw error;
  }
}

export async function searchCandidatesForAdmin(filters: {
  search?: string;
  educationLevel?: string;
  city?: string;
  status?: string;
  availableForInternship?: boolean;
  availableForCLT?: boolean;
}) {
  let query = supabaseAdmin
    .from('candidates')
    .select(`
      *,
      users(email, name)
    `);

  if (filters.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%`);
  }
  if (filters.educationLevel) {
    query = query.eq('education_level', filters.educationLevel);
  }
  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.availableForInternship !== undefined) {
    query = query.eq('available_for_internship', filters.availableForInternship);
  }
  if (filters.availableForCLT !== undefined) {
    query = query.eq('available_for_clt', filters.availableForCLT);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to search candidates:', error);
    return [];
  }

  return data || [];
}

export async function getCandidateApplications(candidateId: string) {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      jobs(
        id,
        title,
        contract_type,
        schools(school_name, franchises(name))
      )
    `)
    .eq('candidate_id', candidateId)
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get candidate applications:', error);
    return [];
  }

  return data || [];
}

export async function getCandidateStats(candidateId: string) {
  const [applicationsResult, contractsResult] = await Promise.all([
    supabaseAdmin.from('applications').select('id, status').eq('candidate_id', candidateId),
    supabaseAdmin.from('contracts').select('id, status').eq('candidate_id', candidateId)
  ]);

  return {
    totalApplications: applicationsResult.data?.length || 0,
    pendingApplications: applicationsResult.data?.filter(a => a.status === 'applied').length || 0,
    totalContracts: contractsResult.data?.length || 0,
    activeContracts: contractsResult.data?.filter(c => c.status === 'active').length || 0
  };
}

// ==================== SCHOOL INVITATION FUNCTIONS (NEW) ====================

export async function createSchoolInvitation(
  email: string,
  franchiseId: string,
  createdBy: string,
  notes?: string
) {
  const { data, error } = await supabaseAdmin
    .from('school_invitations')
    .insert({
      email,
      franchise_id: franchiseId,
      created_by: createdBy,
      notes,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[Database] Failed to create school invitation:', error);
    throw error;
  }

  return data;
}

export async function getInvitationByToken(token: string) {
  const { data, error } = await supabaseAdmin
    .from('school_invitations')
    .select(`
      *,
      franchises(id, name, region)
    `)
    .eq('token', token)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Database] Failed to get invitation by token:', error);
    return null;
  }

  // Check if invitation is valid
  if (data) {
    const now = new Date();
    const expiresAt = new Date(data.expires_at);

    if (data.status !== 'pending') {
      return { ...data, isValid: false, reason: `Invitation is ${data.status}` };
    }

    if (expiresAt < now) {
      // Auto-expire the invitation
      await supabaseAdmin
        .from('school_invitations')
        .update({ status: 'expired' })
        .eq('token', token);

      return { ...data, isValid: false, reason: 'Invitation has expired' };
    }

    return { ...data, isValid: true };
  }

  return null;
}

export async function acceptInvitation(
  token: string,
  userId: string,
  schoolData: {
    school_name: string;
    trade_name?: string;
    legal_name?: string;
    cnpj: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    website?: string;
  }
) {
  // Get and validate invitation
  const invitation = await getInvitationByToken(token);

  if (!invitation || !invitation.isValid) {
    throw new Error(invitation?.reason || 'Invalid invitation');
  }

  // Create school
  const { data: school, error: schoolError } = await supabaseAdmin
    .from('schools')
    .insert({
      user_id: userId,
      franchise_id: invitation.franchise_id,
      status: 'pending', // Requires admin approval
      ...schoolData,
    })
    .select('*')
    .single();

  if (schoolError) {
    console.error('[Database] Failed to create school:', schoolError);
    throw schoolError;
  }

  // Mark invitation as accepted
  const { error: updateError } = await supabaseAdmin
    .from('school_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      school_id: school.id,
    })
    .eq('token', token);

  if (updateError) {
    console.error('[Database] Failed to mark invitation as accepted:', updateError);
    // Don't throw - school was created successfully
  }

  // Update user role to 'school'
  const { error: userError } = await supabaseAdmin
    .from('users')
    .update({ role: 'school' })
    .eq('id', userId);

  if (userError) {
    console.error('[Database] Failed to update user role:', userError);
  }

  return school;
}

export async function getAllInvitations() {
  const { data, error } = await supabaseAdmin
    .from('school_invitations')
    .select(`
      *,
      franchises(name, region),
      created_by_user:users!school_invitations_created_by_fkey(name, email),
      schools(school_name, status)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get invitations:', error);
    return [];
  }

  return data || [];
}

export async function revokeInvitation(token: string, revokedBy: string) {
  const { error } = await supabaseAdmin
    .from('school_invitations')
    .update({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
    })
    .eq('token', token);

  if (error) {
    console.error('[Database] Failed to revoke invitation:', error);
    throw error;
  }
}

export async function getAllFranchises() {
  const { data, error } = await supabaseAdmin
    .from('franchises')
    .select('id, name, region, contact_email')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('[Database] Failed to get franchises:', error);
    return [];
  }

  return data || [];
}

// ==================== ADMIN ANALYTICS FUNCTIONS ====================

export async function getAdminDashboardStats(): Promise<any> {
  const [companies, candidates, jobs, contracts, applications, payments] = await Promise.all([
    supabaseAdmin.from('companies').select('status'),
    supabaseAdmin.from('candidates').select('status'),
    supabaseAdmin.from('jobs').select('status'),
    supabaseAdmin.from('contracts').select('status'),
    supabaseAdmin.from('applications').select('status'),
    supabaseAdmin.from('payments').select('status, amount'),
  ]);

  const stats = {
    totalCompanies: companies.data?.length || 0,
    activeCompanies: companies.data?.filter((c: any) => c.status === 'active').length || 0,
    pendingCompanies: companies.data?.filter((c: any) => c.status === 'pending').length || 0,
    suspendedCompanies: companies.data?.filter((c: any) => c.status === 'suspended').length || 0,

    totalCandidates: candidates.data?.length || 0,
    activeCandidates: candidates.data?.filter((c: any) => c.status === 'active').length || 0,
    employedCandidates: candidates.data?.filter((c: any) => c.status === 'employed').length || 0,
    inactiveCandidates: candidates.data?.filter((c: any) => c.status === 'inactive').length || 0,

    totalJobs: jobs.data?.length || 0,
    openJobs: jobs.data?.filter((j: any) => j.status === 'open').length || 0,
    closedJobs: jobs.data?.filter((j: any) => j.status === 'closed').length || 0,
    filledJobs: jobs.data?.filter((j: any) => j.status === 'filled').length || 0,

    totalContracts: contracts.data?.length || 0,
    activeContracts: contracts.data?.filter((c: any) => c.status === 'active').length || 0,
    pendingContracts: contracts.data?.filter((c: any) => c.status === 'pending-signature').length || 0,
    completedContracts: contracts.data?.filter((c: any) => c.status === 'completed').length || 0,

    totalApplications: applications.data?.length || 0,
    pendingApplications: applications.data?.filter((a: any) => a.status === 'applied').length || 0,
    selectedApplications: applications.data?.filter((a: any) => a.status === 'selected').length || 0,
    rejectedApplications: applications.data?.filter((a: any) => a.status === 'rejected').length || 0,

    totalPayments: payments.data?.length || 0,
    paidPayments: payments.data?.filter((p: any) => p.status === 'paid').length || 0,
    pendingPayments: payments.data?.filter((p: any) => p.status === 'pending').length || 0,
    overduePayments: payments.data?.filter((p: any) => p.status === 'overdue').length || 0,
    totalRevenue: payments.data?.filter((p: any) => p.status === 'paid').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
    pendingRevenue: payments.data?.filter((p: any) => p.status === 'pending').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
  };

  return stats;
}

// ==================== ADMIN APPLICATION FUNCTIONS ====================

export async function getAllApplications(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      jobs(title, company_id, companies(company_name)),
      candidates(full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get applications:', error);
    return [];
  }

  return data || [];
}

export async function updateApplicationStatus(id: string, status: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('applications')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update application status:', error);
    throw error;
  }
}

// ==================== ADMIN CONTRACT FUNCTIONS ====================

export async function getAllContracts(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select(`
      *,
      companies(company_name, email),
      candidates(full_name, email),
      jobs(title)
    `)
    .order('created_at', { ascending: false});

  if (error) {
    console.error('[Database] Failed to get contracts:', error);
    return [];
  }

  return data || [];
}

export async function updateContractStatus(id: string, status: string, updatedBy: string): Promise<void> {
  const updates: any = { status };

  if (status === 'active') {
    updates.signed_at = new Date().toISOString();
  } else if (status === 'terminated' || status === 'completed') {
    updates.terminated_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('contracts')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update contract status:', error);
    throw error;
  }
}

// ==================== ADMIN PAYMENT FUNCTIONS ====================

export async function getAllPayments(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select(`
      *,
      contracts(contract_number),
      companies(company_name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get payments:', error);
    return [];
  }

  return data || [];
}

export async function updatePaymentStatus(id: string, status: string): Promise<void> {
  const updates: any = { status };

  if (status === 'paid') {
    updates.paid_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('payments')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update payment status:', error);
    throw error;
  }
}

// ==================== ADMIN FEEDBACK FUNCTIONS ====================

export async function getAllFeedback(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('feedback')
    .select(`
      *,
      contracts(contract_number, companies(company_name, email)),
      candidates(full_name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get feedback:', error);
    return [];
  }

  return data || [];
}

export async function updateFeedbackStatus(id: string, status: string): Promise<void> {
  const updates: any = { status };

  if (status === 'reviewed') {
    updates.reviewed_at = new Date().toISOString();
  }

  const { error } = await supabaseAdmin
    .from('feedback')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update feedback status:', error);
    throw error;
  }
}

// ==================== AI MATCHING FUNCTIONS ====================

export async function getAIMatchingStats(): Promise<any> {
  const { data: applications, error } = await supabaseAdmin
    .from('applications')
    .select('ai_match_score, status');

  if (error) {
    console.error('[Database] Failed to get AI matching stats:', error);
    return {
      totalMatches: 0,
      averageScore: 0,
      highQualityMatches: 0,
      successRate: 0,
    };
  }

  const totalMatches = applications?.length || 0;
  const withScores = applications?.filter((a: any) => a.ai_match_score != null) || [];
  const averageScore = withScores.length > 0
    ? Math.round(withScores.reduce((sum: number, a: any) => sum + (a.ai_match_score || 0), 0) / withScores.length)
    : 0;
  const highQualityMatches = withScores.filter((a: any) => (a.ai_match_score || 0) >= 75).length;
  const selectedApplications = applications?.filter((a: any) => a.status === 'selected').length || 0;
  const successRate = totalMatches > 0 ? Math.round((selectedApplications / totalMatches) * 100) : 0;

  return {
    totalMatches,
    averageScore,
    highQualityMatches,
    successRate,
    lowScoreMatches: withScores.filter((a: any) => (a.ai_match_score || 0) < 50).length,
    mediumScoreMatches: withScores.filter((a: any) => {
      const score = a.ai_match_score || 0;
      return score >= 50 && score < 75;
    }).length,
  };
}

export async function getApplicationsWithScores(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      jobs(title, company_id),
      candidates(full_name, email),
      companies:jobs(companies(company_name))
    `)
    .not('ai_match_score', 'is', null)
    .order('ai_match_score', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get applications with scores:', error);
    return [];
  }

  return data || [];
}

// Export types
export type {
  User,
  InsertUser,
  Company,
  InsertCompany,
  Candidate,
  InsertCandidate,
  Job,
  InsertJob,
  Application,
  InsertApplication,
  Contract,
  InsertContract,
  Feedback,
  InsertFeedback,
  Payment,
  InsertPayment,
  Document,
  InsertDocument,
  Notification,
  InsertNotification
};
