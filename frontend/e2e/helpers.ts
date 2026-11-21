import { expect, type Locator, type Page } from "@playwright/test";

/** Boczny panel z kwotą liczoną na żywo. */
export function summary(page: Page): Locator {
  return page.getByRole("complementary", { name: "Podsumowanie na żywo" });
}

export function steps(page: Page): Locator {
  return page.getByRole("navigation", { name: "Kroki przewodnika" });
}

/** Kwota „12 345,67 zł” zapisana po polsku, także z twardą spacją. */
export function parseZl(text: string): number {
  const match = text.match(/(-?[\d\s\u00a0\u202f]+,\d{2})\s*zł/);
  if (!match) return Number.NaN;
  return Number(match[1].replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
}

export async function grandTotal(page: Page): Promise<number> {
  return parseZl(await summary(page).locator(".big").innerText());
}

export async function expectTotalAbove(page: Page, min: number) {
  await expect.poll(() => grandTotal(page), { timeout: 15_000 }).toBeGreaterThan(min);
}

export async function expectNoHorizontalScroll(page: Page) {
  const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(extra).toBeLessThanOrEqual(1);
}
