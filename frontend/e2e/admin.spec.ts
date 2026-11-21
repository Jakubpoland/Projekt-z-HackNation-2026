import { expect, test } from "@playwright/test";

test("panel parametrów filtruje listę i cofa niezapisaną zmianę", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Parametry" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Parametry prawne" })).toBeVisible();

  const rows = page.locator("tbody tr");
  await expect.poll(async () => rows.count()).toBeGreaterThan(10);

  const search = page.getByLabel("Szukaj parametru");
  await search.fill("maternityRateBps");
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("maternityRateBps");

  const save = page.getByRole("button", { name: "Zapisz parametry" });
  const undo = page.getByRole("button", { name: "Cofnij zmiany" });
  await expect(save).toBeDisabled();
  await expect(undo).toBeDisabled();

  const value = rows.locator('input[type="number"]');
  const original = await value.inputValue();
  await value.fill(original === "8150" ? "8000" : "8150");
  await expect(save).toBeEnabled();
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(value).toHaveValue(original);
  await expect(save).toBeDisabled();

  await page.getByRole("link", { name: "Przewodnik", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Twoja sytuacja" })).toBeVisible();
});
