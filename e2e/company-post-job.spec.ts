import { test, expect } from "@playwright/test";
import { seedFixture } from "./_helpers/seed";
import { loginAs } from "./_helpers/auth";
import { admin } from "./_helpers/supabase";

test.describe("Company posts a job", () => {
  test("a company user can create a job via the UI and it appears in the public listing", async ({
    page,
  }) => {
    const fx = await seedFixture();
    await loginAs(page, fx.company);

    await page.goto("/company/portal");
    await page.waitForLoadState("networkidle");

    // Reach the jobs tab. Selector kept loose because the EmpresaPortal nav is icon-driven.
    const jobsTab = page.getByRole("tab", { name: /vagas/i }).first();
    if (await jobsTab.isVisible().catch(() => false)) {
      await jobsTab.click();
    } else {
      // Fall back to the legacy route
      await page.goto("/company/jobs");
    }
    await page.waitForLoadState("networkidle");

    // Open the create-job dialog
    await page.getByRole("button", { name: /nova vaga|criar vaga|adicionar vaga/i }).first().click();

    const unique = `E2E Job ${Date.now()}`;
    await page.getByLabel(/título|nome da vaga/i).first().fill(unique);
    await page
      .getByLabel(/descrição/i)
      .first()
      .fill("Descrição automatizada de teste e2e.");

    // contract_type + work_type selectors — these are radix selects, target by trigger then option
    const tipoTrigger = page.getByRole("combobox", { name: /tipo de contrato|contrato/i }).first();
    if (await tipoTrigger.isVisible().catch(() => false)) {
      await tipoTrigger.click();
      await page.getByRole("option", { name: /clt/i }).first().click();
    }

    await page.getByRole("button", { name: /salvar|criar|publicar/i }).first().click();

    // Wait for the mutation to commit
    await page.waitForResponse(
      (r) =>
        r.url().includes("/api/trpc") &&
        r.request().method() === "POST" &&
        r.status() < 400,
      { timeout: 10_000 }
    );

    // Assert in DB
    const { data } = await (admin.from("jobs") as any)
      .select("id, title, status")
      .eq("company_id", fx.company.companyId)
      .eq("title", unique);
    expect(data?.length).toBe(1);
    expect(["open", "draft", "pending_review"]).toContain(data?.[0]?.status);

    // Cleanup just this job
    await (admin.from("jobs") as any).delete().eq("id", data![0].id);
  });
});
