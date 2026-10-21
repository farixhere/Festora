import { expect, test } from "@playwright/test";

// Requires a configured DATABASE_URL and BETTER_AUTH_SECRET (see README).
test("sign up, create an organization, and reach the dashboard", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/sign-up");
  await page.getByLabel(/name/i).first().fill("E2E Tester");
  await page.getByLabel(/email/i).fill(`e2e+${stamp}@example.com`);
  await page.getByLabel(/^password/i).first().fill("correct-horse-battery");
  await page.getByRole("button", { name: /create account|sign up/i }).click();
  await expect(page).toHaveURL(/onboarding|dashboard/);
  if (page.url().includes("onboarding")) {
    await page.getByLabel(/organization name/i).fill(`E2E Club ${stamp}`);
    await page.getByRole("button", { name: /create organization/i }).click();
  }
  await expect(page).toHaveURL(/dashboard/);
});
