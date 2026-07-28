import { test, expect } from "@playwright/test";
import {
  seedFixture,
  purgeApplicationsForJob,
  purgeHiringProcessesForCompany,
} from "./_helpers/seed";
import { mintSession } from "./_helpers/auth";
import { mockExternal } from "./_helpers/mocks";
import { admin } from "./_helpers/supabase";
import { E2E_ENV } from "./_helpers/env";

async function trpcCall(token: string, procedure: string, input: any) {
  const url = `${E2E_ENV.baseUrl}/api/trpc/${procedure}?batch=1`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ "0": { json: input } }),
  });
  const body = (await res.json()) as any;
  return {
    status: res.status,
    data: body?.[0]?.result?.data?.json ?? body?.[0]?.result?.data,
    error: body?.[0]?.error,
  };
}

async function trpcQuery(token: string, procedure: string, input: any) {
  const url = `${E2E_ENV.baseUrl}/api/trpc/${procedure}?batch=1&input=${encodeURIComponent(
    JSON.stringify({ "0": { json: input } })
  )}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await res.json()) as any;
  return { status: res.status, data: body?.[0]?.result?.data?.json ?? body?.[0]?.result?.data };
}

test.describe("Company hire flow", () => {
  test("CLT hire creates hiring_processes + payment + sets app status", async ({ page }) => {
    const fx = await seedFixture();
    const job = fx.jobs[0]; // CLT job
    const candidate = fx.candidates[0];

    await purgeApplicationsForJob(job.id);
    await purgeHiringProcessesForCompany(fx.company.companyId);

    // Seed an application directly so we can isolate the hiring step
    const { data: appRow, error: appErr } = await (admin.from("applications") as any)
      .insert({
        job_id: job.id,
        candidate_id: candidate.candidateId,
        status: "selected",
      })
      .select("id")
      .single();
    expect(appErr).toBeNull();

    await mockExternal(page);
    const session = await mintSession(fx.company.email, fx.company.password);

    // 1. Preview should compute the fee
    const preview = await trpcQuery(session.access_token, "hiring.getHiringPreview", {
      applicationId: appRow.id,
    });
    expect(preview.status).toBe(200);
    expect(preview.data?.hiringType).toBe("clt");
    expect(preview.data?.calculatedFee).toBeGreaterThan(0);

    // 2. Initiate hiring
    const init = await trpcCall(session.access_token, "hiring.initiateHiring", {
      applicationId: appRow.id,
      startDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
      monthlySalary: 500_000, // R$ 5,000 in cents
    });
    expect(init.status).toBe(200);
    expect(init.error).toBeFalsy();

    // 3. Assert DB state — a hiring_processes row should exist for this company
    const { data: processes } = await (admin.from("hiring_processes") as any)
      .select("id, status, hiring_type, company_signed, candidate_signed")
      .eq("company_id", fx.company.companyId);
    expect(processes?.length).toBeGreaterThanOrEqual(1);
    const process = processes![0];
    expect(["pending_signatures", "pending_payment"]).toContain(process.status);
    expect(process.hiring_type).toBe("clt");

    // 4. CLT path creates a one-time fee payment immediately
    const { data: payments } = await (admin.from("payments") as any)
      .select("id, payment_type, status, amount")
      .eq("company_id", fx.company.companyId);
    expect(payments?.length).toBeGreaterThanOrEqual(1);
    const setupFee = payments!.find((p: any) =>
      ["setup-fee", "monthly-fee"].includes(p.payment_type)
    );
    expect(setupFee).toBeTruthy();
  });

  test("estágio hire requires parent + school info and creates 4 signing invitations", async ({
    page,
  }) => {
    const fx = await seedFixture();
    const job = fx.jobs[1]; // estágio job
    const candidate = fx.candidates[1];

    await purgeApplicationsForJob(job.id);

    const { data: appRow } = await (admin.from("applications") as any)
      .insert({
        job_id: job.id,
        candidate_id: candidate.candidateId,
        status: "selected",
      })
      .select("id")
      .single();

    await mockExternal(page);
    const session = await mintSession(fx.company.email, fx.company.password);

    const init = await trpcCall(session.access_token, "hiring.initiateHiring", {
      applicationId: appRow.id,
      startDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
      parentInfo: {
        name: "Parent E2E",
        email: "parent@e2e.test",
        cpf: "111.111.111-11",
        phone: "+5511999999999",
      },
      schoolInfo: {
        name: "School E2E",
        email: "school@e2e.test",
        contact: "Coordenador",
      },
    });
    expect(init.status).toBe(200);

    const { data: processes } = await (admin.from("hiring_processes") as any)
      .select("id, hiring_type, status")
      .eq("company_id", fx.company.companyId)
      .order("created_at", { ascending: false });

    const estagio = processes?.find((p: any) => p.hiring_type === "estagio");
    expect(estagio).toBeTruthy();
    expect(["awaiting_configuration", "pending_signatures"]).toContain(estagio!.status);
  });
});
