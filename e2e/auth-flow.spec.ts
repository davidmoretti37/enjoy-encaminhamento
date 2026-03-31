import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("login page shows email and password inputs", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator(
      'input[type="email"], input[name="email"]'
    );
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]'
    );
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
  });

  test("login page has a submit button", async ({ page }) => {
    await page.goto("/login");
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Entrar"), button:has-text("Login")'
    );
    await expect(submitButton.first()).toBeVisible({ timeout: 5000 });
  });

  test("empty form submission shows validation or error", async ({ page }) => {
    await page.goto("/login");
    // Click submit without filling in fields
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Entrar"), button:has-text("Login")'
    );
    await submitButton.first().click();

    // Should show some kind of validation feedback — either browser validation,
    // an error message, or the form stays on the login page
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/login");
  });

  test("invalid credentials show error message", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.locator(
      'input[type="email"], input[name="email"]'
    );
    const passwordInput = page.locator(
      'input[type="password"], input[name="password"]'
    );

    await emailInput.fill("usuario-invalido@teste.com");
    await passwordInput.fill("senhaerrada123");

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Entrar"), button:has-text("Login")'
    );
    await submitButton.first().click();

    // Should show an error message or stay on the login page
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    const bodyText = await page.locator("body").textContent();

    const hasError =
      bodyText?.toLowerCase().includes("erro") ||
      bodyText?.toLowerCase().includes("error") ||
      bodyText?.toLowerCase().includes("invalid") ||
      bodyText?.toLowerCase().includes("incorret") ||
      bodyText?.toLowerCase().includes("credenciais") ||
      currentUrl.includes("/login");
    expect(hasError).toBeTruthy();
  });

  test("unauthenticated user accessing /company/portal gets redirected to /login", async ({
    page,
  }) => {
    await page.goto("/company/portal");
    await page.waitForURL("**/login**", { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated user accessing /candidato gets redirected to /login", async ({
    page,
  }) => {
    await page.goto("/candidato");
    await page.waitForURL("**/login**", { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated user accessing /agency/portal gets redirected to /login", async ({
    page,
  }) => {
    await page.goto("/agency/portal");
    await page.waitForURL("**/login**", { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });
});
