import { test, expect } from "@playwright/test";

test.describe("Public Pages", () => {
  test("landing page loads and has content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/./);
    await expect(page.locator("body")).toBeVisible();
    // Page should have meaningful content (not blank)
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test("login page loads with email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
    // Should have email and password inputs
    await expect(
      page.locator('input[type="email"], input[name="email"]')
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('input[type="password"], input[name="password"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("public job listings page loads", async ({ page }) => {
    await page.goto("/vagas");
    await expect(page.locator("body")).toBeVisible();
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test("non-existent route shows 404 or redirects", async ({ page }) => {
    await page.goto("/rota-que-nao-existe");
    // Either shows a 404 page or redirects somewhere
    const url = page.url();
    const bodyText = await page.locator("body").textContent();
    const is404 =
      bodyText?.includes("404") ||
      bodyText?.toLowerCase().includes("not found") ||
      bodyText?.toLowerCase().includes("encontrad");
    const didRedirect = !url.includes("/rota-que-nao-existe");
    expect(is404 || didRedirect).toBeTruthy();
  });

  test("navigation between public pages works", async ({ page }) => {
    // Start at landing page
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    // Navigate to vagas
    await page.goto("/vagas");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/vagas");

    // Navigate to login
    await page.goto("/login");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/login");
  });
});
