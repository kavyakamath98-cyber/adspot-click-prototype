import { Page, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

export const ADVERTISER_EMAIL = "advertiser@demo.com";
export const ADVERTISER_PASSWORD = "Demo@1234";
export const ADMIN_EMAIL = "admin@adittv.com";
export const ADMIN_PASSWORD = "Admin@1234";

const screenshotsDir = path.join(process.cwd(), "tests/audit/results/screenshots");

export function ensureDirs() {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

export async function screenshot(page: Page, name: string) {
  ensureDirs();
  const filePath = path.join(screenshotsDir, `${name}.png`);
  await page.screenshot({ path: filePath });
  return filePath;
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[id="email"]', email);
  await page.fill('input[id="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
}

export async function logout(page: Page) {
  try {
    await page.evaluate(() => {
      window.localStorage.removeItem("additv.auth.v1");
    });
  } catch {
    /* ignore */
  }
  await page.goto("/login");
}

export function collectConsoleErrors(page: Page, { ignoreMissingResources = true } = {}): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (ignoreMissingResources && text.includes("Failed to load resource") && text.includes("404")) {
        return; // Prototype uses mock creative URLs that may not resolve.
      }
      errors.push(`[console.error] ${text}`);
    }
  });
  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}

export async function assertNoNaN(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toContain("NaN");
  expect(text).not.toContain("undefined");
  expect(text).not.toContain("null");
}

export async function captureStep(
  page: Page,
  stepName: string,
  errors: string[],
  action?: () => Promise<void>,
) {
  if (action) await action();
  await page.waitForLoadState("networkidle");
  await assertNoNaN(page);
  const shot = await screenshot(page, stepName);
  return { stepName, screenshot: shot, errors: [...errors] };
}
