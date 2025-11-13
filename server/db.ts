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
    .select('*, affiliates(name, contact_email)')
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
    .select('*, affiliates(name, contact_email, city)')
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

// Get school by user ID (for logged-in school users)
export async function getSchoolByUserId(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[Database] Failed to get school by user ID:', error);
    return null;
  }

  return data;
}

// Get dashboard statistics for school portal
export async function getSchoolDashboardStats(schoolId: string) {
  const [candidatesResult, applicationsResult, contractsResult] = await Promise.all([
    supabaseAdmin.from('candidates').select('id, status').eq('school_id', schoolId),
    supabaseAdmin
      .from('applications')
      .select('id, status, candidates!inner(school_id)')
      .eq('candidates.school_id', schoolId),
    supabaseAdmin
      .from('contracts')
      .select('id, status, candidates!inner(school_id)')
      .eq('candidates.school_id', schoolId)
  ]);

  const candidates = candidatesResult.data || [];
  const applications = applicationsResult.data || [];
  const contracts = contractsResult.data || [];

  return {
    totalCandidates: candidates.length,
    activeCandidates: candidates.filter(c => c.status === 'active').length,
    employedCandidates: candidates.filter(c => c.status === 'employed').length,
    totalApplications: applications.length,
    activeApplications: applications.filter(a => a.status === 'in_progress' || a.status === 'interviewing').length,
    totalHired: contracts.filter(c => c.status === 'active' || c.status === 'completed').length,
  };
}

// Get all candidates registered by a specific school
export async function getCandidatesBySchoolId(schoolId: string) {
  // First get the school's city
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('city')
    .eq('id', schoolId)
    .single();

  if (!school || !school.city) {
    console.error('[Database] School not found or has no city');
    return [];
  }

  // Get candidates from the same city
  const { data, error } = await supabaseAdmin
    .from('candidates')
    .select(`
      *,
      users(email, name)
    `)
    .eq('city', school.city)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get candidates by school city:', error);
    return [];
  }

  return data || [];
}

// Get all applications from candidates of a specific school (by city)
export async function getApplicationsBySchoolId(schoolId: string) {
  // First get the school's city
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('city')
    .eq('id', schoolId)
    .single();

  if (!school || !school.city) {
    console.error('[Database] School not found or has no city');
    return [];
  }

  // Get applications from candidates in the same city
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
      *,
      candidates!inner(
        id,
        full_name,
        city
      ),
      jobs(
        id,
        title,
        companies(company_name)
      )
    `)
    .eq('candidates.city', school.city)
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get applications by school city:', error);
    return [];
  }

  return data || [];
}

// Get all companies from a specific school's city
export async function getCompaniesBySchoolId(schoolId: string) {
  // First get the school's city
  const { data: school } = await supabaseAdmin
    .from('schools')
    .select('city')
    .eq('id', schoolId)
    .single();

  if (!school || !school.city) {
    console.error('[Database] School not found or has no city');
    return [];
  }

  // Get companies from the same city
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('city', school.city)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get companies by school city:', error);
    return [];
  }

  return data || [];
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
          schools(school_name, affiliates(name))
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
        schools(school_name, affiliates(name))
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
  affiliateId: string,
  createdBy: string,
  notes?: string
) {
  console.log('[Database] Creating school invitation:', { email, affiliateId, createdBy, notes });
  const { data, error } = await supabaseAdmin
    .from('school_invitations')
    .insert({
      email,
      affiliate_id: affiliateId,
      created_by: createdBy,
      notes,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[Database] Failed to create school invitation:', error);
    throw error;
  }

  console.log('[Database] Created invitation with token:', data.token);
  return data;
}

export async function getInvitationByToken(token: string) {
  console.log('[Database] Getting invitation by token:', token);
  const { data, error } = await supabaseAdmin
    .from('school_invitations')
    .select(`
      *,
      affiliates(id, name, city)
    `)
    .eq('token', token)
    .single();

  console.log('[Database] Query result - data:', data, 'error:', error);

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
      affiliate_id: invitation.affiliate_id,
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

// ==================== AFFILIATE FUNCTIONS ====================

export async function getAllAffiliates(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('affiliates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get affiliates:', error);
    throw error;
  }

  return data || [];
}

export async function getAffiliateById(id: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from('affiliates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[Database] Failed to get affiliate:', error);
    return null;
  }

  return data;
}

export async function getAffiliateByUserId(userId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from('affiliates')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('[Database] Failed to get affiliate by user:', error);
    return null;
  }

  return data;
}

export async function updateAffiliateStatus(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[Database] Failed to update affiliate status:', error);
    throw error;
  }
}

export async function getSchoolsByAffiliateId(affiliateId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get schools by affiliate:', error);
    throw error;
  }

  return data || [];
}

export async function getCompaniesByAffiliateId(affiliateId: string): Promise<any[]> {
  const { data, error} = await supabaseAdmin
    .from('companies')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get companies by affiliate:', error);
    throw error;
  }

  return data || [];
}

export async function getAffiliateDashboardStats(affiliateId: string): Promise<any> {
  // Get schools count
  const { data: schools, error: schoolsError } = await supabaseAdmin
    .from('schools')
    .select('id, status')
    .eq('affiliate_id', affiliateId);

  if (schoolsError) {
    console.error('[Database] Failed to get schools for stats:', schoolsError);
  }

  const totalSchools = schools?.length || 0;
  const activeSchools = schools?.filter(s => s.status === 'active').length || 0;
  const pendingSchools = schools?.filter(s => s.status === 'pending').length || 0;

  // Get affiliate's city for filtering candidates
  const { data: affiliate } = await supabaseAdmin
    .from('affiliates')
    .select('city')
    .eq('id', affiliateId)
    .single();

  const affiliateCity = affiliate?.city;

  // Get candidates count by city
  const { data: candidates, error: candidatesError } = await supabaseAdmin
    .from('candidates')
    .select('id')
    .eq('city', affiliateCity || '');

  if (candidatesError) {
    console.error('[Database] Failed to get candidates for stats:', candidatesError);
  }

  const totalCandidates = candidates?.length || 0;

  // Get companies for this affiliate
  const { data: companies } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('affiliate_id', affiliateId);

  const companyIds = companies?.map(c => c.id) || [];

  // Get jobs count from affiliate's companies
  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from('jobs')
    .select('id, status')
    .in('company_id', companyIds);

  if (jobsError) {
    console.error('[Database] Failed to get jobs for stats:', jobsError);
  }

  const totalJobs = jobs?.length || 0;
  const openJobs = jobs?.filter(j => j.status === 'open').length || 0;

  // Get contracts count from companies
  const { data: contracts, error: contractsError } = await supabaseAdmin
    .from('contracts')
    .select('id, status')
    .in('company_id', companyIds);

  if (contractsError) {
    console.error('[Database] Failed to get contracts for stats:', contractsError);
  }

  const totalContracts = contracts?.length || 0;
  const activeContracts = contracts?.filter(c => c.status === 'active').length || 0;

  return {
    totalSchools,
    activeSchools,
    pendingSchools,
    totalCandidates,
    totalJobs,
    openJobs,
    totalContracts,
    activeContracts,
  };
}

// ==================== AFFILIATE INVITATION FUNCTIONS ====================

export async function getAllAffiliateInvitations(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('affiliate_invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get affiliate invitations:', error);
    throw error;
  }

  return data || [];
}

export async function createAffiliateInvitation(input: {
  email: string;
  cities: string[];
  franchiseData: any;
  schoolsData: any[];
  commission_rate: number;
  createdBy: string;
}): Promise<any> {
  // Generate unique token
  const token = crypto.randomUUID() + '-' + Date.now();

  const { data, error } = await supabaseAdmin
    .from('affiliate_invitations')
    .insert({
      email: input.email,
      token,
      cities: input.cities,
      franchise_data: input.franchiseData,
      schools_data: input.schoolsData,
      commission_rate: input.commission_rate,
      created_by: input.createdBy,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('[Database] Failed to create affiliate invitation:', error);
    throw error;
  }

  return data;
}

export async function verifyAffiliateInvitation(token: string): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from('affiliate_invitations')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single();

  if (error) {
    console.error('[Database] Failed to verify invitation:', error);
    throw new Error('Invalid or expired invitation');
  }

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    throw new Error('Invitation has expired');
  }

  // Check if already claimed
  if (data.claimed_at) {
    throw new Error('Invitation has already been used');
  }

  return data;
}

export async function acceptAffiliateInvitation(input: {
  token: string;
  name: string;
  phone: string;
  password: string;
}): Promise<any> {
  // Verify invitation first
  const invitation = await verifyAffiliateInvitation(input.token);

  // Get franchise and schools data from invitation
  const franchiseData = invitation.franchise_data;
  const schoolsData = invitation.schools_data;

  if (!franchiseData || !schoolsData) {
    throw new Error('Invitation data is incomplete');
  }

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === invitation.email);

  let authData;
  if (existingUser) {
    // User exists, update their password instead
    console.log('[Database] User already exists, updating password');
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password: input.password }
    );

    if (updateError) {
      console.error('[Database] Failed to update existing user:', updateError);
      throw new Error(`Failed to update user account: ${updateError.message || 'Unknown error'}`);
    }

    authData = { user: updateData.user };
  } else {
    // Create new user account in Supabase Auth
    const { data: createData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: input.password,
      email_confirm: true,
    });

    if (authError) {
      console.error('[Database] Failed to create auth user:', authError);
      console.error('[Database] Auth error details:', JSON.stringify(authError, null, 2));
      throw new Error(`Failed to create user account: ${authError.message || 'Unknown error'}`);
    }

    authData = createData;
  }

  // Create user in users table with the name provided by the affiliate
  await upsertUser({
    id: authData.user.id,
    email: invitation.email,
    name: input.name,
    role: 'affiliate',
  });

  // Check if affiliate already exists for this user
  const { data: existingAffiliate } = await supabaseAdmin
    .from('affiliates')
    .select()
    .eq('user_id', authData.user.id)
    .single();

  let affiliate;
  if (existingAffiliate) {
    // Update existing affiliate
    console.log('[Database] Affiliate already exists, updating');
    const { data: updatedAffiliate, error: updateError } = await supabaseAdmin
      .from('affiliates')
      .update({
        name: franchiseData.name,
        trade_name: franchiseData.trade_name,
        legal_name: franchiseData.legal_name,
        cnpj: franchiseData.cnpj,
        contact_email: franchiseData.contact_email,
        contact_phone: input.phone,
        address: franchiseData.address,
        city: franchiseData.city,
        state: franchiseData.state,
        postal_code: franchiseData.postal_code,
        website: franchiseData.website,
        commission_rate: invitation.commission_rate || 0.10,
        is_active: true,
      })
      .eq('user_id', authData.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Database] Failed to update affiliate:', updateError);
      throw new Error('Failed to update affiliate profile');
    }
    affiliate = updatedAffiliate;
  } else {
    // Create new affiliate record
    const { data: newAffiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .insert({
        user_id: authData.user.id,
        name: franchiseData.name,
        trade_name: franchiseData.trade_name,
        legal_name: franchiseData.legal_name,
        cnpj: franchiseData.cnpj,
        contact_email: franchiseData.contact_email,
        contact_phone: input.phone,
        address: franchiseData.address,
        city: franchiseData.city,
        state: franchiseData.state,
        postal_code: franchiseData.postal_code,
        website: franchiseData.website,
        commission_rate: invitation.commission_rate || 0.10,
        is_active: true,
        created_by: invitation.created_by,
      })
      .select()
      .single();

    if (affiliateError) {
      console.error('[Database] Failed to create affiliate:', affiliateError);
      throw new Error('Failed to create affiliate profile');
    }
    affiliate = newAffiliate;
  }

  // Create all schools using data from invitation
  const schoolsToInsert = schoolsData.map((school: any) => ({
    user_id: authData.user.id,
    franchise_id: affiliate.id, // Database still uses franchise_id
    school_name: school.school_name,
    trade_name: school.trade_name,
    legal_name: school.legal_name,
    cnpj: school.cnpj,
    email: school.email,
    phone: school.phone,
    address: school.address,
    city: school.city,
    state: school.state,
    postal_code: school.postal_code,
    website: school.website,
    status: 'active', // Automatically active when created by affiliate
  }));

  const { data: createdSchools, error: schoolsError } = await supabaseAdmin
    .from('schools')
    .insert(schoolsToInsert)
    .select();

  if (schoolsError) {
    console.error('[Database] Failed to create schools:', schoolsError);
    // Rollback would be ideal here, but Supabase doesn't support transactions via client
    // In production, consider using RPC with PostgreSQL transactions
    throw new Error('Failed to create schools');
  }

  // Mark invitation as claimed
  await supabaseAdmin
    .from('affiliate_invitations')
    .update({
      claimed_at: new Date().toISOString(),
      claimed_by: authData.user.id,
    })
    .eq('token', input.token);

  return {
    user: authData.user,
    affiliate,
    schools: createdSchools,
  };
}

// Accept school invitation with password (creates user account)
export async function acceptSchoolInvitationWithPassword(input: {
  token: string;
  password: string;
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
  };
}): Promise<any> {
  // Verify invitation first
  const invitation = await getInvitationByToken(input.token);

  if (!invitation || !invitation.isValid) {
    throw new Error(invitation?.reason || 'Invalid invitation');
  }

  // Check if user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === invitation.email);

  let authData;
  if (existingUser) {
    // User exists, update their password instead
    console.log('[Database] User already exists, updating password');
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      { password: input.password }
    );

    if (updateError) {
      console.error('[Database] Failed to update existing user:', updateError);
      throw new Error(`Failed to update user account: ${updateError.message || 'Unknown error'}`);
    }

    authData = { user: updateData.user };
  } else {
    // Create new user account in Supabase Auth
    const { data: createData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: invitation.email,
      password: input.password,
      email_confirm: true,
    });

    if (authError) {
      console.error('[Database] Failed to create auth user:', authError);
      console.error('[Database] Auth error details:', JSON.stringify(authError, null, 2));
      throw new Error(`Failed to create user account: ${authError.message || 'Unknown error'}`);
    }

    authData = createData;
  }

  // Create user in users table
  await upsertUser({
    id: authData.user.id,
    email: invitation.email,
    name: input.schoolData.school_name, // Use school name as user name
    role: 'school',
  });

  // Create school
  const { data: school, error: schoolError } = await supabaseAdmin
    .from('schools')
    .insert({
      user_id: authData.user.id,
      franchise_id: invitation.affiliate_id, // Database uses franchise_id
      status: 'active', // Automatically active when created by affiliate
      ...input.schoolData,
    })
    .select('*')
    .single();

  if (schoolError) {
    console.error('[Database] Failed to create school:', schoolError);
    throw new Error('Failed to create school');
  }

  // Mark invitation as accepted
  await supabaseAdmin
    .from('school_invitations')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      school_id: school.id,
    })
    .eq('token', input.token);

  return {
    user: authData.user,
    school,
  };
}

// Get all candidates from affiliate's region (by city)
export async function getCandidatesByAffiliateId(affiliateId: string): Promise<any[]> {
  // First get the affiliate's city
  const { data: affiliate } = await supabaseAdmin
    .from('affiliates')
    .select('city')
    .eq('id', affiliateId)
    .single();

  if (!affiliate?.city) {
    return [];
  }

  // Get candidates from the same city
  const { data, error } = await supabaseAdmin
    .from('candidates')
    .select('*')
    .eq('city', affiliate.city)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching affiliate candidates:', error);
    return [];
  }

  return data || [];
}

// Get all jobs from companies in affiliate's region
export async function getJobsByAffiliateId(affiliateId: string): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select(`
      *,
      company:companies!jobs_company_id_fkey (
        id,
        company_name,
        affiliate_id
      )
    `)
    .eq('company.affiliate_id', affiliateId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching affiliate jobs:', error);
    return [];
  }

  return data || [];
}

// Get all applications from affiliate's region
export async function getApplicationsByAffiliateId(affiliateId: string): Promise<any[]> {
  // Get all jobs from affiliate's schools first
  const jobs = await getJobsByAffiliateId(affiliateId);
  const jobIds = jobs.map(job => job.id);

  if (jobIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(`
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
    `)
    .in('job_id', jobIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching affiliate applications:', error);
    throw error;
  }

  return data || [];
}

// Get all contracts from affiliate's region
export async function getContractsByAffiliateId(affiliateId: string): Promise<any[]> {
  // Get all applications from affiliate's region first
  const applications = await getApplicationsByAffiliateId(affiliateId);
  const applicationIds = applications.map(app => app.id);

  if (applicationIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select(`
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
    `)
    .in('application_id', applicationIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching affiliate contracts:', error);
    throw error;
  }

  return data || [];
}

// Get all payments from affiliate's region
export async function getPaymentsByAffiliateId(affiliateId: string): Promise<any[]> {
  // Get all contracts from affiliate's region first
  const contracts = await getContractsByAffiliateId(affiliateId);
  const contractIds = contracts.map(contract => contract.id);

  if (contractIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select(`
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
    `)
    .in('contract_id', contractIds)
    .order('payment_date', { ascending: false });

  if (error) {
    console.error('Error fetching affiliate payments:', error);
    throw error;
  }

  return data || [];
}
