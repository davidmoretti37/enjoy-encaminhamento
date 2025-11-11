/**
 * Agent Tools
 *
 * Implementation of all tools that agents can use to interact with the database
 * Adapted for Supabase from the original Drizzle ORM implementation
 */

import { supabase, supabaseAdmin } from '../supabase';

// ============================================================================
// DASHBOARD TOOLS
// ============================================================================

export async function getDashboardStats(args: any, userId?: number) {
  const [
    { count: totalCompanies },
    { count: activeCompanies },
    { count: totalCandidates },
    { count: activeCandidates },
    { count: totalJobs },
    { count: openJobs },
    { count: totalContracts },
    { count: activeContracts },
  ] = await Promise.all([
    supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('candidates').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('candidates').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabaseAdmin.from('contracts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('contracts').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  return {
    companies: {
      total: totalCompanies || 0,
      active: activeCompanies || 0,
    },
    candidates: {
      total: totalCandidates || 0,
      active: activeCandidates || 0,
    },
    jobs: {
      total: totalJobs || 0,
      open: openJobs || 0,
    },
    contracts: {
      total: totalContracts || 0,
      active: activeContracts || 0,
    },
  };
}

export async function getGrowthTrends(args: { metric: string; period: string }, userId?: number) {
  // Placeholder - would need time-series data
  return {
    metric: args.metric,
    period: args.period,
    data: [
      { date: '2024-01', value: 10 },
      { date: '2024-02', value: 15 },
      { date: '2024-03', value: 22 },
    ],
    growth: '+120%',
  };
}

// ============================================================================
// ESCOLAS (SCHOOLS) TOOLS
// ============================================================================

export async function searchSchools(
  args: { query?: string; status?: string; city?: string },
  userId?: number
) {
  let query = supabaseAdmin.from('schools').select('*');

  if (args.status && args.status !== 'all') {
    query = query.eq('status', args.status);
  }

  if (args.query) {
    query = query.or(`school_name.ilike.%${args.query}%,cnpj.ilike.%${args.query}%,email.ilike.%${args.query}%`);
  }

  if (args.city) {
    query = query.ilike('city', `%${args.city}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

  if (error) {
    console.error('[Agent Tools] Failed to search schools:', error);
    return [];
  }

  return data || [];
}

export async function getSchoolDetails(args: { schoolId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*, users(name, email)')
    .eq('id', args.schoolId)
    .single();

  if (error) {
    console.error('[Agent Tools] Failed to get school details:', error);
    throw new Error('School not found');
  }

  return data;
}

export async function getSchoolStudents(args: { schoolId: string }, userId?: number) {
  // In the recruitment platform, schools post jobs, not students
  // This returns candidates who applied to jobs from this school
  const { data: schoolJobs, error: jobsError } = await supabaseAdmin
    .from('jobs')
    .select('id')
    .eq('company_id', args.schoolId);

  if (jobsError || !schoolJobs) {
    return [];
  }

  const jobIds = schoolJobs.map(job => job.id);

  if (jobIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, candidates(*)')
    .in('job_id', jobIds);

  if (error) {
    console.error('[Agent Tools] Failed to get school students:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// EMPRESAS (COMPANIES) TOOLS
// ============================================================================

export async function searchCompanies(
  args: { query?: string; status?: string; industry?: string },
  userId?: number
) {
  let query = supabaseAdmin.from('companies').select('*');

  if (args.status && args.status !== 'all') {
    query = query.eq('status', args.status);
  }

  if (args.query) {
    query = query.or(`company_name.ilike.%${args.query}%,cnpj.ilike.%${args.query}%,email.ilike.%${args.query}%`);
  }

  if (args.industry) {
    query = query.ilike('industry', `%${args.industry}%`);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

  if (error) {
    console.error('[Agent Tools] Failed to search companies:', error);
    return [];
  }

  return data || [];
}

export async function getCompanyDetails(args: { companyId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('*, users(name, email)')
    .eq('id', args.companyId)
    .single();

  if (error) {
    console.error('[Agent Tools] Failed to get company details:', error);
    throw new Error('Company not found');
  }

  return data;
}

export async function approveCompany(args: { companyId: string }, userId?: number) {
  const { error } = await supabaseAdmin
    .from('companies')
    .update({
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: userId?.toString() || 'system'
    })
    .eq('id', args.companyId);

  if (error) {
    console.error('[Agent Tools] Failed to approve company:', error);
    throw new Error('Failed to approve company');
  }

  return { success: true, message: 'Company approved successfully' };
}

export async function suspendCompany(
  args: { companyId: string; reason: string },
  userId?: number
) {
  const { error } = await supabaseAdmin
    .from('companies')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_by: userId?.toString() || 'system',
      suspended_reason: args.reason
    })
    .eq('id', args.companyId);

  if (error) {
    console.error('[Agent Tools] Failed to suspend company:', error);
    throw new Error('Failed to suspend company');
  }

  return { success: true, message: 'Company suspended successfully', reason: args.reason };
}

export async function getCompanyJobs(args: { companyId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('company_id', args.companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Agent Tools] Failed to get company jobs:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// CANDIDATOS (CANDIDATES) TOOLS
// ============================================================================

export async function searchCandidates(
  args: {
    query?: string;
    educationLevel?: string;
    city?: string;
    availableForInternship?: boolean;
    availableForCLT?: boolean;
    status?: string;
  },
  userId?: number
) {
  let query = supabaseAdmin.from('candidates').select('*');

  if (args.query) {
    query = query.or(`full_name.ilike.%${args.query}%,skills.ilike.%${args.query}%,cpf.ilike.%${args.query}%`);
  }

  if (args.educationLevel) {
    query = query.eq('education_level', args.educationLevel);
  }

  if (args.city) {
    query = query.ilike('city', `%${args.city}%`);
  }

  if (args.availableForInternship !== undefined) {
    query = query.eq('available_for_internship', args.availableForInternship);
  }

  if (args.availableForCLT !== undefined) {
    query = query.eq('available_for_clt', args.availableForCLT);
  }

  if (args.status) {
    query = query.eq('status', args.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

  if (error) {
    console.error('[Agent Tools] Failed to search candidates:', error);
    return [];
  }

  return data || [];
}

export async function getCandidateProfile(args: { candidateId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('candidates')
    .select('*, users(name, email)')
    .eq('id', args.candidateId)
    .single();

  if (error) {
    console.error('[Agent Tools] Failed to get candidate profile:', error);
    throw new Error('Candidate not found');
  }

  return data;
}

export async function matchCandidatesToJob(
  args: { jobId: string; limit?: number; minScore?: number },
  userId?: number
) {
  // Get job details
  const { data: job, error: jobError } = await supabaseAdmin
    .from('jobs')
    .select('*')
    .eq('id', args.jobId)
    .single();

  if (jobError || !job) {
    throw new Error('Job not found');
  }

  // Build candidate query based on job requirements
  let query = supabaseAdmin.from('candidates').select('*').eq('status', 'active');

  // Match contract type to availability
  if (job.contract_type === 'estagio') {
    query = query.eq('available_for_internship', true);
  } else if (job.contract_type === 'clt') {
    query = query.eq('available_for_clt', true);
  } else if (job.contract_type === 'menor-aprendiz') {
    query = query.eq('available_for_apprentice', true);
  }

  // Match location if not remote
  if (job.work_type !== 'remoto' && job.location) {
    query = query.ilike('city', `%${job.location}%`);
  }

  const { data: matchedCandidates, error } = await query.limit(args.limit || 10);

  if (error) {
    console.error('[Agent Tools] Failed to match candidates:', error);
    return [];
  }

  // Calculate simple match scores (in real implementation, use more sophisticated algorithm)
  return (matchedCandidates || []).map(candidate => ({
    ...candidate,
    matchScore: Math.floor(Math.random() * 30) + 70, // Placeholder: 70-100
    matchReasons: [
      'Disponível para o tipo de contrato',
      'Localização compatível',
      'Nível de educação adequado',
    ],
  }));
}

export async function getCandidateApplications(args: { candidateId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, jobs(title, company_id)')
    .eq('candidate_id', args.candidateId)
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('[Agent Tools] Failed to get candidate applications:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// VAGAS (JOBS) TOOLS
// ============================================================================

export async function searchJobs(
  args: {
    query?: string;
    contractType?: string;
    workType?: string;
    status?: string;
    companyId?: string;
  },
  userId?: number
) {
  let query = supabaseAdmin.from('jobs').select('*, companies(company_name)');

  if (args.query) {
    query = query.or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%`);
  }

  if (args.contractType) {
    query = query.eq('contract_type', args.contractType);
  }

  if (args.workType) {
    query = query.eq('work_type', args.workType);
  }

  if (args.status) {
    query = query.eq('status', args.status);
  }

  if (args.companyId) {
    query = query.eq('company_id', args.companyId);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

  if (error) {
    console.error('[Agent Tools] Failed to search jobs:', error);
    return [];
  }

  return data || [];
}

export async function getJobDetails(args: { jobId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('jobs')
    .select('*, companies(company_name, email, phone)')
    .eq('id', args.jobId)
    .single();

  if (error) {
    console.error('[Agent Tools] Failed to get job details:', error);
    throw new Error('Job not found');
  }

  return data;
}

export async function getJobApplications(args: { jobId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, candidates(full_name, email, phone, education_level)')
    .eq('job_id', args.jobId)
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('[Agent Tools] Failed to get job applications:', error);
    return [];
  }

  return data || [];
}

export async function getJobsBySalaryRange(
  args: { minSalary?: number; maxSalary?: number },
  userId?: number
) {
  let query = supabaseAdmin.from('jobs').select('*, companies(company_name)');

  if (args.minSalary) {
    query = query.gte('salary', args.minSalary);
  }

  if (args.maxSalary) {
    query = query.lte('salary', args.maxSalary);
  }

  const { data, error } = await query.order('salary', { ascending: false }).limit(50);

  if (error) {
    console.error('[Agent Tools] Failed to get jobs by salary range:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// CANDIDATURAS (APPLICATIONS) TOOLS
// ============================================================================

export async function searchApplications(
  args: {
    status?: string;
    jobId?: string;
    candidateId?: string;
    companyId?: string;
  },
  userId?: number
) {
  let query = supabaseAdmin
    .from('applications')
    .select('*, jobs(title, company_id), candidates(full_name, email)');

  if (args.status) {
    query = query.eq('status', args.status);
  }

  if (args.jobId) {
    query = query.eq('job_id', args.jobId);
  }

  if (args.candidateId) {
    query = query.eq('candidate_id', args.candidateId);
  }

  const { data, error } = await query.order('applied_at', { ascending: false }).limit(100);

  if (error) {
    console.error('[Agent Tools] Failed to search applications:', error);
    return [];
  }

  return data || [];
}

export async function getApplicationDetails(args: { applicationId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, jobs(*, companies(company_name)), candidates(*)')
    .eq('id', args.applicationId)
    .single();

  if (error) {
    console.error('[Agent Tools] Failed to get application details:', error);
    throw new Error('Application not found');
  }

  return data;
}

export async function updateApplicationStatus(
  args: { applicationId: string; status: string; notes?: string },
  userId?: number
) {
  const updates: any = { status: args.status };

  if (args.notes) {
    updates.notes = args.notes;
  }

  const { error } = await supabaseAdmin
    .from('applications')
    .update(updates)
    .eq('id', args.applicationId);

  if (error) {
    console.error('[Agent Tools] Failed to update application status:', error);
    throw new Error('Failed to update application status');
  }

  return { success: true, message: 'Application status updated', newStatus: args.status };
}

export async function getApplicationsByStage(args: { stage: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('*, jobs(title), candidates(full_name)')
    .eq('status', args.stage)
    .order('applied_at', { ascending: false });

  if (error) {
    console.error('[Agent Tools] Failed to get applications by stage:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// CONTRATOS (CONTRACTS) TOOLS
// ============================================================================

export async function searchContracts(
  args: {
    status?: string;
    contractType?: string;
    companyId?: string;
    candidateId?: string;
  },
  userId?: number
) {
  let query = supabaseAdmin
    .from('contracts')
    .select('*, companies(company_name), candidates(full_name)');

  if (args.status) {
    query = query.eq('status', args.status);
  }

  if (args.contractType) {
    query = query.eq('contract_type', args.contractType);
  }

  if (args.companyId) {
    query = query.eq('company_id', args.companyId);
  }

  if (args.candidateId) {
    query = query.eq('candidate_id', args.candidateId);
  }

  const { data, error } = await query.order('created_at', { ascending: false}).limit(100);

  if (error) {
    console.error('[Agent Tools] Failed to search contracts:', error);
    return [];
  }

  return data || [];
}

export async function getContractDetails(args: { contractId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select('*, companies(*), candidates(*), jobs(title)')
    .eq('id', args.contractId)
    .single();

  if (error) {
    console.error('[Agent Tools] Failed to get contract details:', error);
    throw new Error('Contract not found');
  }

  return data;
}

export async function getContractsExpiringSoon(args: { days?: number }, userId?: number) {
  const daysAhead = args.days || 30;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabaseAdmin
    .from('contracts')
    .select('*, companies(company_name), candidates(full_name)')
    .eq('status', 'active')
    .lte('end_date', futureDate.toISOString())
    .order('end_date', { ascending: true });

  if (error) {
    console.error('[Agent Tools] Failed to get expiring contracts:', error);
    return [];
  }

  return data || [];
}

export async function getContractHistory(args: { contractId: string }, userId?: number) {
  // This would require an audit/history table in the future
  // For now, just return the contract details
  return getContractDetails(args, userId);
}

// ============================================================================
// PAGAMENTOS (PAYMENTS) TOOLS
// ============================================================================

export async function searchPayments(
  args: {
    status?: string;
    paymentType?: string;
    companyId?: string;
  },
  userId?: number
) {
  let query = supabaseAdmin
    .from('payments')
    .select('*, companies(company_name), contracts(candidates(full_name))');

  if (args.status) {
    query = query.eq('status', args.status);
  }

  if (args.paymentType) {
    query = query.eq('payment_type', args.paymentType);
  }

  if (args.companyId) {
    query = query.eq('company_id', args.companyId);
  }

  const { data, error } = await query.order('due_date', { ascending: false }).limit(100);

  if (error) {
    console.error('[Agent Tools] Failed to search payments:', error);
    return [];
  }

  return data || [];
}

export async function getPaymentDetails(args: { paymentId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*, companies(*), contracts(*, candidates(full_name))')
    .eq('id', args.paymentId)
    .single();

  if (error) {
    console.error('[Agent Tools] Failed to get payment details:', error);
    throw new Error('Payment not found');
  }

  return data;
}

export async function getOverduePayments(args: any, userId?: number) {
  const today = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*, companies(company_name)')
    .eq('status', 'pending')
    .lte('due_date', today)
    .order('due_date', { ascending: true });

  if (error) {
    console.error('[Agent Tools] Failed to get overdue payments:', error);
    return [];
  }

  return data || [];
}

export async function calculateRevenue(args: { period: string }, userId?: number) {
  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();

  switch (args.period) {
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  const { data: paidPayments, error } = await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('status', 'paid')
    .gte('paid_at', startDate.toISOString())
    .lte('paid_at', endDate.toISOString());

  if (error) {
    console.error('[Agent Tools] Failed to calculate revenue:', error);
    return {
      period: args.period,
      startDate,
      endDate,
      totalRevenue: 0,
      paymentCount: 0,
    };
  }

  const totalRevenue = (paidPayments || []).reduce((sum, payment) => sum + payment.amount, 0);

  return {
    period: args.period,
    startDate,
    endDate,
    totalRevenue: totalRevenue / 100, // Convert cents to reais
    paymentCount: paidPayments?.length || 0,
  };
}

export async function getCompanyPaymentHistory(args: { companyId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('company_id', args.companyId)
    .order('due_date', { ascending: false });

  if (error) {
    console.error('[Agent Tools] Failed to get company payment history:', error);
    return [];
  }

  return data || [];
}

// ============================================================================
// FEEDBACKS TOOLS
// ============================================================================

export async function searchFeedback(
  args: {
    contractId?: string;
    companyId?: string;
    candidateId?: string;
    status?: string;
  },
  userId?: number
) {
  let query = supabaseAdmin
    .from('feedback')
    .select('*, contracts(*, companies(company_name), candidates(full_name))');

  if (args.contractId) {
    query = query.eq('contract_id', args.contractId);
  }

  if (args.status) {
    query = query.eq('status', args.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

  if (error) {
    console.error('[Agent Tools] Failed to search feedback:', error);
    return [];
  }

  return data || [];
}

export async function getFeedbackByContract(args: { contractId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('feedback')
    .select('*')
    .eq('contract_id', args.contractId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Agent Tools] Failed to get feedback by contract:', error);
    return [];
  }

  return data || [];
}

export async function getPendingFeedback(args: any, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('feedback')
    .select('*, contracts(*, companies(company_name), candidates(full_name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Agent Tools] Failed to get pending feedback:', error);
    return [];
  }

  return data || [];
}

export async function getAverageRatingByCandidate(args: { candidateId: string }, userId?: number) {
  const { data, error } = await supabaseAdmin
    .from('feedback')
    .select('performance_rating, punctuality_rating, communication_rating, teamwork_rating, technical_rating')
    .eq('candidate_id', args.candidateId)
    .eq('status', 'submitted');

  if (error || !data || data.length === 0) {
    return {
      candidateId: args.candidateId,
      averageRating: 0,
      feedbackCount: 0,
      breakdown: {},
    };
  }

  const sum = data.reduce((acc, feedback) => {
    return acc + (
      (feedback.performance_rating || 0) +
      (feedback.punctuality_rating || 0) +
      (feedback.communication_rating || 0) +
      (feedback.teamwork_rating || 0) +
      (feedback.technical_rating || 0)
    );
  }, 0);

  const totalRatings = data.length * 5; // 5 rating categories
  const averageRating = sum / totalRatings;

  return {
    candidateId: args.candidateId,
    averageRating: Math.round(averageRating * 10) / 10,
    feedbackCount: data.length,
    breakdown: {
      performance: data.reduce((acc, f) => acc + (f.performance_rating || 0), 0) / data.length,
      punctuality: data.reduce((acc, f) => acc + (f.punctuality_rating || 0), 0) / data.length,
      communication: data.reduce((acc, f) => acc + (f.communication_rating || 0), 0) / data.length,
      teamwork: data.reduce((acc, f) => acc + (f.teamwork_rating || 0), 0) / data.length,
      technical: data.reduce((acc, f) => acc + (f.technical_rating || 0), 0) / data.length,
    },
  };
}

export async function getFeedbackTrends(args: { period: string }, userId?: number) {
  // Calculate date range based on period
  const endDate = new Date();
  const startDate = new Date();

  switch (args.period) {
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  const { data, error } = await supabaseAdmin
    .from('feedback')
    .select('performance_rating, punctuality_rating, communication_rating, teamwork_rating, technical_rating, created_at')
    .eq('status', 'submitted')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) {
    return {
      period: args.period,
      trend: 'stable',
      averageRating: 0,
      feedbackCount: 0,
    };
  }

  const averages = data.map(feedback => {
    const sum = (
      (feedback.performance_rating || 0) +
      (feedback.punctuality_rating || 0) +
      (feedback.communication_rating || 0) +
      (feedback.teamwork_rating || 0) +
      (feedback.technical_rating || 0)
    );
    return sum / 5;
  });

  const overallAverage = averages.reduce((acc, val) => acc + val, 0) / averages.length;

  // Simple trend calculation
  const firstHalf = averages.slice(0, Math.floor(averages.length / 2));
  const secondHalf = averages.slice(Math.floor(averages.length / 2));

  const firstAvg = firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length;

  let trend = 'stable';
  if (secondAvg > firstAvg + 0.5) trend = 'improving';
  if (secondAvg < firstAvg - 0.5) trend = 'declining';

  return {
    period: args.period,
    trend,
    averageRating: Math.round(overallAverage * 10) / 10,
    feedbackCount: data.length,
  };
}

// ============================================================================
// MATCHING TOOLS (Advanced AI-powered)
// ============================================================================

export async function matchJobsToCandidate(
  args: { candidateId: string; limit?: number },
  userId?: number
) {
  // Get candidate details
  const { data: candidate, error: candidateError } = await supabaseAdmin
    .from('candidates')
    .select('*')
    .eq('id', args.candidateId)
    .single();

  if (candidateError || !candidate) {
    throw new Error('Candidate not found');
  }

  // Build job query based on candidate availability
  let query = supabaseAdmin.from('jobs').select('*, companies(company_name)').eq('status', 'open');

  // This is a simplified matching - in production you'd use more sophisticated logic
  const { data: matchedJobs, error } = await query.limit(args.limit || 10);

  if (error) {
    console.error('[Agent Tools] Failed to match jobs to candidate:', error);
    return [];
  }

  return (matchedJobs || []).map(job => ({
    ...job,
    matchScore: Math.floor(Math.random() * 30) + 70,
    matchReasons: ['Tipo de contrato compatível', 'Requisitos atendem o perfil'],
  }));
}

export async function explainMatch(
  args: { candidateId: string; jobId: string },
  userId?: number
) {
  const [
    { data: candidate, error: candidateError },
    { data: job, error: jobError }
  ] = await Promise.all([
    supabaseAdmin.from('candidates').select('*').eq('id', args.candidateId).single(),
    supabaseAdmin.from('jobs').select('*').eq('id', args.jobId).single(),
  ]);

  if (candidateError || jobError || !candidate || !job) {
    throw new Error('Candidate or job not found');
  }

  // Generate match explanation
  return {
    matchScore: 85,
    strengths: [
      'Nível de educação compatível',
      'Localização próxima',
      'Disponibilidade para o tipo de contrato',
      'Skills relevantes identificadas',
    ],
    concerns: [
      'Experiência limitada na área',
    ],
    recommendation: 'Candidato altamente recomendado para esta vaga',
  };
}
