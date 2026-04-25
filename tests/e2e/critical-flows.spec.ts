import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("Critical product flows", () => {
  test("Employee sends a recognition (web)", async ({ page }) => {
    await login(page, "employee-a@test.com", "password123");
    await page.goto("/dashboard/recognise");

    await page.getByPlaceholder("Search by name...").fill("employee b");
    await page.getByRole("button", { name: /employee b/i }).first().click();
    await page.getByRole("button", { name: /ownership|collaboration|innovation|customer/i }).first().click();
    await page.getByPlaceholder("Share what they did well...").fill("Great teamwork and support today.");
    await page.getByRole("button", { name: "2" }).click();
    await page.getByRole("button", { name: "Send Spotcoin 🪙" }).click();

    await expect(page.getByText(/Spotcoin sent to/i)).toBeVisible();

    await page.goto("/dashboard/feed");
    await expect(page.getByText(/Great teamwork and support today\./i)).toBeVisible();
  });

  test("Admin invites a new user", async ({ page }) => {
    await login(page, "admin@test.com", "password123");
    await page.goto("/admin");

    await page.getByRole("button", { name: "Invite" }).click();
    await page.getByPlaceholder("name@company.com").fill("new.user@test.com");
    await page.getByRole("button", { name: "Send invite" }).click();

    await expect(page.getByText(/Invite sent successfully/i)).toBeVisible();
    await expect(page.getByText(/new\.user@test\.com/i)).toBeVisible();
  });

  test("Admin marks a payout complete", async ({ page, request }) => {
    // Seed payout-target user via API helper endpoint if available.
    // If you add a dedicated seed route, update this request URL.
    await request.post("/api/test/seed-payout-user", {
      data: { email: "payout.user@test.com", spotTokensEarned: 10 },
    });

    await login(page, "admin@test.com", "password123");
    await page.goto("/admin/payout");

    if (await page.getByRole("button", { name: "Open Payout Window" }).isVisible()) {
      await page.getByRole("button", { name: "Open Payout Window" }).click();
      await page.getByRole("button", { name: "Confirm" }).click();
    }

    await expect(page.getByText(/payout\.user@test\.com/i)).toBeVisible();
    await page.getByRole("button", { name: "Mark paid" }).first().click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/paid/i)).toBeVisible();

    // Optional DB verification endpoint hook.
    const verify = await request.get("/api/test/assert-payout-user-cleared?email=payout.user@test.com");
    expect(verify.ok()).toBeTruthy();
  });
});
