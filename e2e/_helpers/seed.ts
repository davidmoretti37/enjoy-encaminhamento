import { admin } from "./supabase";
import { ensureAuthUser, type SeededUser } from "./auth";
import { E2E_ENV } from "./env";

export type SeedFixture = {
  superAdmin: SeededUser;
  agency: SeededUser & { agencyId: string };
  company: SeededUser & { companyId: string };
  candidates: Array<SeededUser & { candidateId: string }>;
  jobs: Array<{ id: string; title: string; contract_type: string }>;
};

const TAG = E2E_ENV.seedTag;

function tagged(s: string) {
  return `[${TAG}] ${s}`;
}

// Idempotent: creates the canonical fixture set or returns existing IDs.
// Safe to call from beforeAll() of any spec.
export async function seedFixture(): Promise<SeedFixture> {
  // 1. Super admin (root user)
  const superAdmin = await ensureAuthUser({
    email: `e2e-superadmin@${TAG}.test`,
    password: "E2eP@ssword!1",
    role: "super_admin",
    name: tagged("Super Admin"),
  });

  // 2. Agency + agency user
  const agencyUser = await ensureAuthUser({
    email: `e2e-agency@${TAG}.test`,
    password: "E2eP@ssword!1",
    role: "agency",
    name: tagged("Agency User"),
  });

  const { data: existingAgency } = await (admin.from("agencies") as any)
    .select("id")
    .eq("user_id", agencyUser.id)
    .maybeSingle();

  let agencyId: string;
  if (existingAgency?.id) {
    agencyId = existingAgency.id;
  } else {
    const { data, error } = await (admin.from("agencies") as any)
      .insert({
        user_id: agencyUser.id,
        agency_name: tagged("Test Agency"),
        cnpj: "00.000.000/0001-00",
        email: agencyUser.email,
        city: "São Paulo",
        state: "SP",
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(`agency insert failed: ${error.message}`);
    agencyId = data.id;
  }

  // Backfill user.agency_id
  await (admin.from("users") as any)
    .update({ agency_id: agencyId })
    .eq("id", agencyUser.id);

  // 3. Company user + company
  const companyUser = await ensureAuthUser({
    email: `e2e-company@${TAG}.test`,
    password: "E2eP@ssword!1",
    role: "company",
    agencyId,
    name: tagged("Company User"),
  });

  const { data: existingCompany } = await (admin.from("companies") as any)
    .select("id")
    .eq("user_id", companyUser.id)
    .maybeSingle();

  let companyId: string;
  if (existingCompany?.id) {
    companyId = existingCompany.id;
  } else {
    const { data, error } = await (admin.from("companies") as any)
      .insert({
        user_id: companyUser.id,
        company_name: tagged("Test Co Ltda"),
        cnpj: "11.111.111/0001-11",
        email: companyUser.email,
        city: "São Paulo",
        state: "SP",
        status: "active",
        pipeline_status: "contract_signed",
      })
      .select("id")
      .single();
    if (error) throw new Error(`company insert failed: ${error.message}`);
    companyId = data.id;
  }

  // 4. 5 candidates with DISC + PDP populated (so matching pipeline has data to chew)
  const candidates: SeedFixture["candidates"] = [];
  for (let i = 0; i < 5; i++) {
    const cu = await ensureAuthUser({
      email: `e2e-candidate-${i}@${TAG}.test`,
      password: "E2eP@ssword!1",
      role: "candidate",
      name: tagged(`Candidate ${i}`),
    });

    const { data: existing } = await (admin.from("candidates") as any)
      .select("id")
      .eq("user_id", cu.id)
      .maybeSingle();

    let candidateId: string;
    if (existing?.id) {
      candidateId = existing.id;
    } else {
      const { data, error } = await (admin.from("candidates") as any)
        .insert({
          user_id: cu.id,
          full_name: tagged(`Candidate ${i}`),
          cpf: `000.000.000-${String(i).padStart(2, "0")}`,
          email: cu.email,
          city: "São Paulo",
          state: "SP",
          education_level: i % 2 === 0 ? "superior" : "medio",
          skills: ["JavaScript", "React", "Node.js"].slice(0, (i % 3) + 1),
          available_for_clt: true,
          available_for_internship: true,
          preferred_work_type: "hibrido",
          status: "active",
          // DISC quadrant — vary per candidate so re-rank actually has signal
          disc_dominante: 30 + i * 10,
          disc_influente: 40 - i * 5,
          disc_estavel: 20 + i * 3,
          disc_conforme: 10 + i * 2,
          pdp_competencies: ["Comunicação", "Organização", "Iniciativa"],
        })
        .select("id")
        .single();
      if (error) throw new Error(`candidate ${i} insert failed: ${error.message}`);
      candidateId = data.id;
    }

    candidates.push({ ...cu, candidateId });
  }

  // 5. 2 jobs: one CLT, one estágio
  const jobs: SeedFixture["jobs"] = [];
  const jobSpecs = [
    { title: tagged("Dev Frontend CLT"), contract_type: "clt" as const, salary: 5000 },
    { title: tagged("Estagiário Marketing"), contract_type: "estagio" as const, salary: 1500 },
  ];

  for (const spec of jobSpecs) {
    const { data: existing } = await (admin.from("jobs") as any)
      .select("id")
      .eq("company_id", companyId)
      .eq("title", spec.title)
      .maybeSingle();

    let jobId: string;
    if (existing?.id) {
      jobId = existing.id;
    } else {
      const { data, error } = await (admin.from("jobs") as any)
        .insert({
          company_id: companyId,
          title: spec.title,
          description: `Vaga de ${spec.title} (fixture e2e)`,
          contract_type: spec.contract_type,
          work_type: "hibrido",
          location: "São Paulo, SP",
          salary: spec.salary,
          required_skills: ["JavaScript", "React"],
          status: "open",
          openings: 1,
          filled_positions: 0,
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(`job ${spec.title} insert failed: ${error.message}`);
      jobId = data.id;
    }

    jobs.push({ id: jobId, title: spec.title, contract_type: spec.contract_type });
  }

  return {
    superAdmin: superAdmin as SeededUser,
    agency: { ...agencyUser, agencyId },
    company: { ...companyUser, companyId },
    candidates,
    jobs,
  };
}

// Remove a row by id from a table, swallowing missing-row errors
async function silentDelete(table: string, id: string) {
  await (admin.from(table) as any).delete().eq("id", id);
}

// Cleanup helper for after a spec. Use sparingly — most fixtures are idempotent
// and can be left in place between runs.
export async function purgeApplicationsForJob(jobId: string) {
  await (admin.from("applications") as any).delete().eq("job_id", jobId);
}

export async function purgeMatchesForJob(jobId: string) {
  await (admin.from("job_matches") as any).delete().eq("job_id", jobId);
}

export async function purgeHiringProcessesForCompany(companyId: string) {
  const { data } = await (admin.from("hiring_processes") as any)
    .select("id")
    .eq("company_id", companyId);
  for (const row of data ?? []) {
    await (admin.from("signing_invitations") as any).delete().eq("hiring_process_id", row.id);
    await silentDelete("hiring_processes", row.id);
  }
}
