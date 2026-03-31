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

export async function getAdminDashboardStats(): Promise<Record<string, number>> {
  const [companies, candidates, jobs, contracts, applications, payments] = await Promise.all([
    supabaseAdmin.from("companies").select("status"),
    supabaseAdmin.from("candidates").select("status"),
    supabaseAdmin.from("jobs").select("status"),
    supabaseAdmin.from("contracts").select("status"),
    supabaseAdmin.from("applications").select("status"),
    supabaseAdmin.from("payments").select("status, amount"),
  ]) as any[];

  type StatusRow = { status: string };
  type PaymentRow = { status: string; amount: number };

  const stats = {
    totalCompanies: companies.data?.length || 0,
    activeCompanies: companies.data?.filter((c: StatusRow) => c.status === "active").length || 0,
    pendingCompanies: companies.data?.filter((c: StatusRow) => c.status === "pending").length || 0,
    suspendedCompanies: companies.data?.filter((c: StatusRow) => c.status === "suspended").length || 0,

    totalCandidates: candidates.data?.length || 0,
    activeCandidates: candidates.data?.filter((c: StatusRow) => c.status === "active").length || 0,
    employedCandidates: candidates.data?.filter((c: StatusRow) => c.status === "employed").length || 0,
    inactiveCandidates: candidates.data?.filter((c: StatusRow) => c.status === "inactive").length || 0,

    totalJobs: jobs.data?.length || 0,
    openJobs: jobs.data?.filter((j: StatusRow) => j.status === "open").length || 0,
    closedJobs: jobs.data?.filter((j: StatusRow) => j.status === "closed").length || 0,
    filledJobs: jobs.data?.filter((j: StatusRow) => j.status === "filled").length || 0,

    totalContracts: contracts.data?.length || 0,
    activeContracts: contracts.data?.filter((c: StatusRow) => c.status === "active").length || 0,
    pendingContracts:
      contracts.data?.filter((c: StatusRow) => c.status === "pending-signature").length || 0,
    completedContracts: contracts.data?.filter((c: StatusRow) => c.status === "completed").length || 0,

    totalApplications: applications.data?.length || 0,
    pendingApplications: applications.data?.filter((a: StatusRow) => a.status === "applied").length || 0,
    selectedApplications:
      applications.data?.filter((a: StatusRow) => a.status === "selected").length || 0,
    rejectedApplications:
      applications.data?.filter((a: StatusRow) => a.status === "rejected").length || 0,

    totalPayments: payments.data?.length || 0,
    paidPayments: payments.data?.filter((p: StatusRow) => p.status === "paid").length || 0,
    pendingPayments: payments.data?.filter((p: StatusRow) => p.status === "pending").length || 0,
    overduePayments: payments.data?.filter((p: StatusRow) => p.status === "overdue").length || 0,
    totalRevenue:
      payments.data
        ?.filter((p: StatusRow) => p.status === "paid")
        .reduce((sum: number, p: PaymentRow) => sum + (p.amount || 0), 0) || 0,
    pendingRevenue:
      payments.data
        ?.filter((p: StatusRow) => p.status === "pending")
        .reduce((sum: number, p: PaymentRow) => sum + (p.amount || 0), 0) || 0,
  };

  return stats;
}

