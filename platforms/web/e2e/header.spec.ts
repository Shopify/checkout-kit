import { expect, test } from "@playwright/test";

test("playground header shows the Checkout Kit heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Checkout Kit");
});
