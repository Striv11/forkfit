import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("first run shows the empty state and no plan", async ({ page }) => {
  await expect(page.locator('[data-state="empty"]')).toBeVisible();
  await expect(page.locator('[data-state="plan"]')).toHaveCount(0);
});

test("solving a preset shows a plan with cost", async ({ page }) => {
  await page.selectOption("#preset", "balanced");
  await expect(page.locator('[data-state="plan"]')).toBeVisible();
  await expect(page.locator(".cost")).toContainText("$");
  expect(
    await page.locator("table").first().locator("tbody tr").count(),
  ).toBeGreaterThan(0);
});

test("Enter in a field solves", async ({ page }) => {
  await page.fill('input[name="calories"]', "2000");
  await page.fill('input[name="protein"]', "100");
  await page.press('input[name="protein"]', "Enter");
  await expect(page.locator('[data-state="plan"]')).toBeVisible();
});

test("impossible targets show an error message", async ({ page }) => {
  await page.selectOption("#preset", "impossible");
  const err = page.locator('[data-state="error"]');
  await expect(err).toBeVisible();
  await expect(err).toHaveAttribute("role", "alert");
});

test("dark mode toggle switches and persists", async ({ page }) => {
  const before = await page.locator("html").getAttribute("data-theme");
  await page.click("#theme-btn");
  const after = await page.locator("html").getAttribute("data-theme");
  expect(after).not.toBe(before);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", after ?? "");
});

test("shortcuts: ? opens help, Esc closes, / focuses form", async ({
  page,
}) => {
  await page.keyboard.press("?");
  await expect(page.locator("#help")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#help")).toBeHidden();
  await page.keyboard.press("/");
  await expect(page.locator("#form input").first()).toBeFocused();
});

test("no horizontal overflow after solving (360 px check)", async ({
  page,
}) => {
  await page.selectOption("#preset", "balanced");
  await expect(page.locator('[data-state="plan"]')).toBeVisible();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
