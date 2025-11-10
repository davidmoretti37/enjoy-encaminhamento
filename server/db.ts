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
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Database] Failed to get companies:', error);
    return [];
  }

  return data || [];
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
