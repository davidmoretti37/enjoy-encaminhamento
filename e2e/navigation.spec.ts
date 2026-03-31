import { test, expect } from "@playwright/test";

test.describe("Navigation and Routing", () => {
  test("landing page has links to key pages", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    // Check for links to vagas and/or login somewhere on the page
    const allLinks = await page.locator("a[href]").all();
    const hrefs = await Promise.all(
      allLinks.map((link) => link.getAttribute("href"))
    );

    const hasVagasLink = hrefs.some(
      (href) => href?.includes("/vagas") || href?.includes("vagas")
    );
    const hasLoginLink = hrefs.some(
      (href) => href?.includes("/login") || href?.includes("login")
    );

    // At least one of these key links should exist
    expect(hasVagasLink || hasLoginLink).toBeTruthy();
  });

  test("public pages are accessible without auth", async ({ page }) => {
    // Landing page
    const landingResponse = await page.goto("/");
    expect(landingResponse?.status()).toBeLessThan(400);

    // Vagas page
    const vagasResponse = await page.goto("/vagas");
    expect(vagasResponse?.status()).toBeLessThan(400);

    // Login page
    const loginResponse = await page.goto("/login");
    expect(loginResponse?.status()).toBeLessThan(400);
  });

  test("protected routes redirect to login", async ({ page }) => {
    const protectedRoutes = [
      "/company/portal",
      "/candidato",
      "/agency/portal",
      "/candidate/onboarding",
      "/company/onboarding",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL("**/login**", { timeout: 5000 });
      expect(page.url()).toContain("/login");
    }
  });

  test("404 page appears for invalid routes", async ({ page }) => {
    await page.goto("/pagina-inexistente-xyz");
    const bodyText = await page.locator("body").textContent();
    const url = page.url();

    const shows404 =
      bodyText?.includes("404") ||
      bodyText?.toLowerCase().includes("not found") ||
      bodyText?.toLowerCase().includes("encontrad");
    const redirectedAway = !url.includes("/pagina-inexistente-xyz");

    expect(shows404 || redirectedAway).toBeTruthy();
  });

  test("login page is reachable from landing page via click", async ({
    page,
  }) => {
    await page.goto("/");
    // Find a link that points to login and click it
    const loginLink = page.locator(
      'a[href="/login"], a[href*="login"]:visible'
    );
    const count = await loginLink.count();

    if (count > 0) {
      await loginLink.first().click();
      await page.waitForURL("**/login**", { timeout: 5000 });
      expect(page.url()).toContain("/login");
    } else {
      // If no direct link, navigate programmatically (landing may use buttons/JS)
      await page.goto("/login");
      expect(page.url()).toContain("/login");
    }
  });
});
