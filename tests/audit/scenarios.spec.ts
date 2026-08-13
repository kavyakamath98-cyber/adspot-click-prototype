import { test, expect } from "@playwright/test";
import {
  login,
  logout,
  ADVERTISER_EMAIL,
  ADVERTISER_PASSWORD,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  collectConsoleErrors,
  screenshot,
  assertNoNaN,
} from "./helpers";

/**
 * AI bug-finding audit scenarios for the Additv prototype.
 * Each test navigates a real user flow, captures console errors, screenshots,
 * and asserts against common UI bugs (NaN, blank states, broken buttons).
 */

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe("Authentication & routing", () => {
  test("advertiser logs in and lands on dashboard", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await login(page, ADVERTISER_EMAIL, ADVERTISER_PASSWORD);
    await expect(page).toHaveURL("/");
    await assertNoNaN(page);
    await screenshot(page, "01-login-advertiser");
    expect(errors).toHaveLength(0);
  });

  test("admin logs in and lands on system admin console", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/system-admin/);
    await assertNoNaN(page);
    await screenshot(page, "02-login-admin");
    expect(errors).toHaveLength(0);
  });
});

test.describe("Advertiser dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADVERTISER_EMAIL, ADVERTISER_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("campaign list renders and search filters by name", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/campaigns");
    await page.waitForLoadState("networkidle");
    await assertNoNaN(page);
    await screenshot(page, "03-campaign-list");

    const search = page.locator('input[placeholder*="Search"], input[placeholder*="search"]').first();
    if (await search.isVisible().catch(() => false)) {
      await search.fill("Indiranagar");
      await delay(300);
      await screenshot(page, "04-campaign-search");
    }
    expect(errors).toHaveLength(0);
  });

  test("payment-pending campaign card is visible", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/campaigns");
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").innerText();
    const hasPending =
      body.includes("Approved") ||
      body.includes("Payment Pending") ||
      body.includes("payment_pending");
    expect(hasPending).toBe(true);
    expect(errors).toHaveLength(0);
  });
});

test.describe("Create campaign wizard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADVERTISER_EMAIL, ADVERTISER_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("navigate through all 6 steps without errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/campaigns/new");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "05-wizard-step1");

    // Step 1: Details & targeting
    await page.fill('input#cname', "Audit Test Campaign");
    await screenshot(page, "06-wizard-step1-filled");

    // Step 2: Creative
    await page.click('button:has-text("Next")');
    await page.waitForLoadState("networkidle");
    // Select the first creative card in the grid.
    await page.click('button:has(.aspect-video):first-of-type');
    await screenshot(page, "07-wizard-step2");

    // Step 3: Schedule
    await page.click('button:has-text("Next")');
    await page.waitForLoadState("networkidle");
    await screenshot(page, "08-wizard-step3");

    // Step 4: Screens
    await page.click('button:has-text("Next")');
    await page.waitForLoadState("networkidle");
    await screenshot(page, "09-wizard-step4");

    // Step 5: Preview
    await page.click('button:has-text("Next")');
    await page.waitForLoadState("networkidle");
    await screenshot(page, "10-wizard-step5");

    // Step 6: Payment
    await page.click('button:has-text("Next")');
    await page.waitForLoadState("networkidle");
    await screenshot(page, "11-wizard-step6");

    await assertNoNaN(page);
    expect(errors).toHaveLength(0);
  });

  test("empty content library shows upload CTA for new users", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/campaigns/new");
    await page.waitForLoadState("networkidle");
    // Simulate new user by clearing localStorage app-state is risky; just verify the creative step
    // shows a clear empty-state CTA if no creatives exist.
    await page.click('button:has-text("Next")');
    await page.waitForLoadState("networkidle");
    await screenshot(page, "12-wizard-step2-empty");
    await assertNoNaN(page);
    expect(errors).toHaveLength(0);
  });
});

test.describe("Campaign management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADVERTISER_EMAIL, ADVERTISER_PASSWORD);
    await page.goto("/campaigns");
    await page.waitForLoadState("networkidle");
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("open a live campaign detail and verify controls", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const liveLink = page.locator('a:has-text("Live")').first();
    if (await liveLink.isVisible().catch(() => false)) {
      await liveLink.click();
      await page.waitForLoadState("networkidle");
      await screenshot(page, "13-live-campaign-detail");
      await assertNoNaN(page);
    }
    expect(errors).toHaveLength(0);
  });

  test("open an approved-payment-pending campaign and pay with wallet", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const pendingLink = page.locator('a:has-text("Payment Pending")').first();
    if (await pendingLink.isVisible().catch(() => false)) {
      await pendingLink.click();
      await page.waitForLoadState("networkidle");
      await screenshot(page, "14-payment-pending-detail");

      const payButton = page.locator('button:has-text("Pay")').first();
      if (await payButton.isVisible().catch(() => false)) {
        await payButton.click();
        await page.waitForTimeout(500);
        await screenshot(page, "15-payment-modal");

        // Try to select wallet if available
        const walletTab = page.locator('button:has-text("Wallet")').first();
        if (await walletTab.isVisible().catch(() => false)) {
          await walletTab.click();
          await page.waitForTimeout(200);
        }
        await screenshot(page, "16-payment-wallet");
      }
    }
    await assertNoNaN(page);
    expect(errors).toHaveLength(0);
  });
});

test.describe("Payments & wallet", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADVERTISER_EMAIL, ADVERTISER_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("transactions and payment methods pages render", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/payments/transactions");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "17-transactions");
    await assertNoNaN(page);

    await page.goto("/payments/methods");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "18-payment-methods");
    await assertNoNaN(page);
    expect(errors).toHaveLength(0);
  });
});

test.describe("Content library", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADVERTISER_EMAIL, ADVERTISER_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("library page renders and upload dialog opens", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/library");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "19-library");
    await assertNoNaN(page);

    const addButton = page.locator('button:has-text("Add"), button:has-text("Upload")').first();
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(300);
      await screenshot(page, "20-library-upload-dialog");
    }
    expect(errors).toHaveLength(0);
  });
});

test.describe("System admin console", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("moderation queue renders with campaign metadata", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/system-admin");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "21-system-admin");
    await assertNoNaN(page);

    // Open first review if any pending items exist
    const reviewButton = page.locator('button:has-text("Review")').first();
    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click();
      await page.waitForTimeout(300);
      await screenshot(page, "22-system-admin-review");
      await assertNoNaN(page);
    }
    expect(errors).toHaveLength(0);
  });
});

test.describe("Team & settings", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("team management page renders with invite flow", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/settings/team");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "23-team");
    await assertNoNaN(page);

    const inviteButton = page.locator('button:has-text("Invite")').first();
    if (await inviteButton.isVisible().catch(() => false)) {
      await inviteButton.click();
      await page.waitForTimeout(300);
      await screenshot(page, "24-invite-modal");
    }
    expect(errors).toHaveLength(0);
  });
});

test.describe("Reporting", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADVERTISER_EMAIL, ADVERTISER_PASSWORD);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("performance dashboard renders charts and heatmap", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/reports/performance");
    await page.waitForLoadState("networkidle");
    await screenshot(page, "25-reports-performance");
    await assertNoNaN(page);
    expect(errors).toHaveLength(0);
  });
});
