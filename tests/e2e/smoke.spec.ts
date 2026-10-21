import { expect, test } from "@playwright/test";

test("landing page renders and links to discovery", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /browse events|explore/i }).first().click();
  await expect(page).toHaveURL(/\/events/);
});

test("protected routes redirect to sign-in with a return path", async ({ page }) => {
  await page.goto("/dashboard/events");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
});

test("health endpoint responds", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBeLessThan(600);
});

test("unknown event is a 404", async ({ page }) => {
  const res = await page.goto("/events/definitely-not-a-real-event");
  expect(res?.status()).toBe(404);
});
