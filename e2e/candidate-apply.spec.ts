import { test, expect } from "@playwright/test";
import { seedFixture, purgeApplicationsForJob } from "./_helpers/seed";
import { loginAs } from "./_helpers/auth";
import { admin } from "./_helpers/supabase";

test.describe("Candidate apply flow", () => {
  test("seeded candidate can apply to a seeded job and the application row is persisted", async ({
    page,
  }) => {
    const fx = await seedFixture();
    const job = fx.jobs[0];
    const candidate = fx.candidates[0];

    // Start clean for this job so the count assertion is meaningful
    await purgeApplicationsForJob(job.id);

    await loginAs(page, candidate);

    // Navigate into the candidate jobs list. Both legacy + new portal mount it.
    await page.goto("/candidate/vagas");
    await page.waitForLoadState("networkidle");

    // Find the seeded job card by its tagged title (seed prepends a [tag])
    const jobCard = page
      .locator(`*:has-text("${job.title}")`)
      .filter({ hasText: "Candidatar" })
      .first();
    await expect(jobCard).toBeVisible({ timeout: 10_000 });

    await jobCard.locator('button:has-text("Candidatar-se")').first().click();

    // Wait for tRPC mutation round-trip
    await page.waitForResponse(
      (r) => r.url().includes("/api/trpc") && r.request().method() === "POST",
      { timeout: 10_000 }
    );

    // Verify the row landed in Postgres
    const { data, error } = await (admin.from("applications") as any)
      .select("id, status, candidate_id, job_id")
      .eq("job_id", job.id)
      .eq("candidate_id", candidate.candidateId);

    expect(error).toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0]?.status).toBe("applied");
  });

  test("applying twice to the same job does not create duplicate rows", async ({ page }) => {
    const fx = await seedFixture();
    const job = fx.jobs[0];
    const candidate = fx.candidates[1];

    await purgeApplicationsForJob(job.id);
    await loginAs(page, candidate);

    await page.goto("/candidate/vagas");
    await page.waitForLoadState("networkidle");

    const jobCard = page.locator(`*:has-text("${job.title}")`).first();
    await jobCard.locator('button:has-text("Candidatar-se")').first().click();
    await page.waitForResponse((r) => r.url().includes("/api/trpc"));

    // Reload + try again
    await page.reload();
    const btnAgain = page.locator(`*:has-text("${job.title}")`).first().locator("button").first();
    if (await btnAgain.isVisible()) {
      await btnAgain.click().catch(() => {});
    }

    const { data } = await (admin.from("applications") as any)
      .select("id")
      .eq("job_id", job.id)
      .eq("candidate_id", candidate.candidateId);
    expect(data?.length).toBe(1);
  });
});
