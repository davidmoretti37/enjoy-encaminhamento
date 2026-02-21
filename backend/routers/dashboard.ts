// Dashboard router - analytics and stats endpoints
import { router, protectedProcedure } from "../_core/trpc";
import { adminProcedure, companyProcedure, candidateProcedure } from "./procedures";
import * as db from "../db";

export const dashboardRouter = router({
  // Get dashboard stats (admin)
  getStats: adminProcedure.query(async () => {
    return await db.getDashboardStats();
  }),

  // Get company dashboard stats
  getCompanyStats: companyProcedure.query(async ({ ctx }) => {
    const company = await db.getCompanyByUserId(ctx.user.id);
    if (!company) return null;

    const jobs = await db.getJobsByCompanyId(company.id);
    const contracts = await db.getContractsByCompanyId(company.id);

    return {
      totalJobs: jobs.length,
      openJobs: jobs.filter((j) => j.status === "open").length,
      activeContracts: contracts.filter((c) => c.status === "active").length,
      totalContracts: contracts.length,
    };
  }),

  // Get candidate dashboard stats
  getCandidateStats: candidateProcedure.query(async ({ ctx }) => {
    const candidate = await db.getCandidateByUserId(ctx.user.id);
    if (!candidate) return null;

    const applications = await db.getApplicationsByCandidateId(candidate.id);
    const contracts = await db.getContractsByCandidateId(candidate.id);

    return {
      totalApplications: applications.length,
      pendingApplications: applications.filter((a) => a.status === "applied").length,
      activeContracts: contracts.filter((c) => c.status === "active").length,
      totalContracts: contracts.length,
    };
  }),
});
