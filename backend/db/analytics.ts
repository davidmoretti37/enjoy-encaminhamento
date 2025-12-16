// @ts-nocheck
// Analytics and dashboard statistics
import { supabase, supabaseAdmin } from "../supabase";

export async function getDashboardStats() {
  const [
    { count: totalCompanies },
    { count: totalCandidates },
    { count: totalJobs },
    { count: activeContracts },
    { count: pendingApplications },
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("candidates").select("*", { count: "exact", head: true }),
    supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("contracts").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "applied"),
  ]);

  return {
    totalCompanies: totalCompanies || 0,
    totalCandidates: totalCandidates || 0,
    totalOpenJobs: totalJobs || 0,
    activeContracts: activeContracts || 0,
    pendingApplications: pendingApplications || 0,
  };
}

export async function getAdminDashboardStats(): Promise<any> {
  const [companies, candidates, jobs, contracts, applications, payments] = await Promise.all([
    supabaseAdmin.from("companies").select("status"),
    supabaseAdmin.from("candidates").select("status"),
    supabaseAdmin.from("jobs").select("status"),
    supabaseAdmin.from("contracts").select("status"),
    supabaseAdmin.from("applications").select("status"),
    supabaseAdmin.from("payments").select("status, amount"),
  ]);

  const stats = {
    totalCompanies: companies.data?.length || 0,
    activeCompanies: companies.data?.filter((c: any) => c.status === "active").length || 0,
    pendingCompanies: companies.data?.filter((c: any) => c.status === "pending").length || 0,
    suspendedCompanies: companies.data?.filter((c: any) => c.status === "suspended").length || 0,

    totalCandidates: candidates.data?.length || 0,
    activeCandidates: candidates.data?.filter((c: any) => c.status === "active").length || 0,
    employedCandidates: candidates.data?.filter((c: any) => c.status === "employed").length || 0,
    inactiveCandidates: candidates.data?.filter((c: any) => c.status === "inactive").length || 0,

    totalJobs: jobs.data?.length || 0,
    openJobs: jobs.data?.filter((j: any) => j.status === "open").length || 0,
    closedJobs: jobs.data?.filter((j: any) => j.status === "closed").length || 0,
    filledJobs: jobs.data?.filter((j: any) => j.status === "filled").length || 0,

    totalContracts: contracts.data?.length || 0,
    activeContracts: contracts.data?.filter((c: any) => c.status === "active").length || 0,
    pendingContracts:
      contracts.data?.filter((c: any) => c.status === "pending-signature").length || 0,
    completedContracts: contracts.data?.filter((c: any) => c.status === "completed").length || 0,

    totalApplications: applications.data?.length || 0,
    pendingApplications: applications.data?.filter((a: any) => a.status === "applied").length || 0,
    selectedApplications:
      applications.data?.filter((a: any) => a.status === "selected").length || 0,
    rejectedApplications:
      applications.data?.filter((a: any) => a.status === "rejected").length || 0,

    totalPayments: payments.data?.length || 0,
    paidPayments: payments.data?.filter((p: any) => p.status === "paid").length || 0,
    pendingPayments: payments.data?.filter((p: any) => p.status === "pending").length || 0,
    overduePayments: payments.data?.filter((p: any) => p.status === "overdue").length || 0,
    totalRevenue:
      payments.data
        ?.filter((p: any) => p.status === "paid")
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
    pendingRevenue:
      payments.data
        ?.filter((p: any) => p.status === "pending")
        .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0,
  };

  return stats;
}

export async function getAIMatchingStats(): Promise<any> {
  const { data: applications, error } = await supabaseAdmin
    .from("applications")
    .select("ai_match_score, status");

  if (error) {
    console.error("[Database] Failed to get AI matching stats:", error);
    return {
      totalMatches: 0,
      averageScore: 0,
      highQualityMatches: 0,
      successRate: 0,
    };
  }

  const totalMatches = applications?.length || 0;
  const withScores = applications?.filter((a: any) => a.ai_match_score != null) || [];
  const averageScore =
    withScores.length > 0
      ? Math.round(
          withScores.reduce((sum: number, a: any) => sum + (a.ai_match_score || 0), 0) /
            withScores.length
        )
      : 0;
  const highQualityMatches = withScores.filter((a: any) => (a.ai_match_score || 0) >= 75).length;
  const selectedApplications =
    applications?.filter((a: any) => a.status === "selected").length || 0;
  const successRate =
    totalMatches > 0 ? Math.round((selectedApplications / totalMatches) * 100) : 0;

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
    .from("applications")
    .select(
      `
      *,
      jobs(title, company_id),
      candidates(full_name, email),
      companies:jobs(companies(company_name))
    `
    )
    .not("ai_match_score", "is", null)
    .order("ai_match_score", { ascending: false });

  if (error) {
    console.error("[Database] Failed to get applications with scores:", error);
    return [];
  }

  return data || [];
}
