import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll, expectTotalAbove, grandTotal, parseZl, steps, summary } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Twoja sytuacja" })).toBeVisible();
});

test("start pokazuje kroki przewodnika i wyłącza Wstecz", async ({ page }) => {
  const nav = steps(page);
  for (const label of ["Start", "Ubezpieczenie i dochód", "Ciąża", "Dziecko", "Podział urlopu", "Wynik", "Dokumenty i pomoc"]) {
    await expect(nav.getByRole("button", { name: label })).toBeVisible();
  }
  await expect(nav.getByRole("button", { name: "Start" })).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("button", { name: "Wstecz" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Dalej: Ubezpieczenie i dochód" })).toBeEnabled();
  await expect(summary(page)).toContainText(/Liczę…|zł|Brak wyniku/);
});

test("Dalej przechodzi przez wszystkie kroki, a Zacznij od nowa wraca na start", async ({ page }) => {
  await page.getByRole("button", { name: /^Dalej:/ }).click();
  await expect(page.getByLabel("Tytuł ubezpieczenia").first()).toBeVisible();

  const headings = ["Zwolnienie lekarskie w ciąży", "Dziecko", "Urlop macierzyński", "Wynik", "Dokumenty"];
  for (const heading of headings) {
    await page.getByRole("button", { name: /^Dalej:/ }).click();
    await expect(page.getByRole("heading", { name: heading, level: 2 })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Zacznij od nowa" })).toBeVisible();
  await page.getByRole("button", { name: "Zacznij od nowa" }).click();
  await expect(page.getByRole("heading", { name: "Twoja sytuacja" })).toBeVisible();
  await expect(steps(page).getByRole("button", { name: "Start" })).toHaveAttribute("aria-current", "step");
});

test("przykład Anny i Piotra liczy zasiłek, płatnika i dokumenty", async ({ page }) => {
  await page.getByRole("button", { name: /Anna i Piotr/ }).click();
  await expectTotalAbove(page, 1000);
  await expect(summary(page).locator(".row", { hasText: "Matka" })).toContainText("zł");
  await expect(summary(page).locator(".row", { hasText: "Ojciec" })).toContainText("zł");

  await steps(page).getByRole("button", { name: "Wynik" }).click();
  await expect(page.getByText("Zastosowano stawkę z wniosku złożonego w 21 dni po porodzie.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Odcinki i kwoty" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Pracodawca (płatnik)" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "ZUS" }).first()).toBeVisible();

  await steps(page).getByRole("button", { name: "Dokumenty i pomoc" }).click();
  await expect(page.getByText(/ZAM/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "ZUS — zasiłek macierzyński" })).toHaveAttribute(
    "href",
    "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski",
  );
  await expect(page.getByRole("heading", { name: "Projekt wniosku urlopowego" })).toBeVisible();
  await page.getByLabel("Imię i nazwisko dziecka").fill("Zosia");
  await expect(page.getByText(/dziecka Zosia/).first()).toBeVisible();

  await page.getByRole("button", { name: "Wyślij wniosek (symulacja)" }).click();
  await expect(page.getByText(/Wniosek przyjęty \(symulacja\)/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Wyślij wniosek (symulacja)" })).toHaveCount(0);
});

test("łączenie urlopu z pracą pokazuje wydłużenie o pół etatu", async ({ page }) => {
  await page.getByRole("button", { name: /łączy urlop z pracą/ }).click();
  await expectTotalAbove(page, 1000);
  await steps(page).getByRole("button", { name: "Wynik" }).click();
  await expect(page.getByText(/praca 1\/2 etatu, wydłużenie o \d+ dni/).first()).toBeVisible();
});

test("brak ubezpieczenia w dniu porodu odcina zasiłek", async ({ page }) => {
  await page.getByRole("button", { name: /Brak ubezpieczenia w dniu porodu/ }).click();
  await expect(page.getByRole("button", { name: /^Nie Np\./, pressed: true })).toBeVisible();

  await page.getByRole("button", { name: "Dalej: Ubezpieczenie i dochód" }).click();
  await expect(page.getByText(/Bez ubezpieczenia chorobowego w dniu porodu zasiłek macierzyński nie przysługuje/)).toBeVisible();

  await steps(page).getByRole("button", { name: "Wynik" }).click();
  await expect(page.getByText("W tym wariancie nie przysługuje zasiłek macierzyński.")).toBeVisible();
  await expect.poll(() => grandTotal(page)).toBe(0);

  await steps(page).getByRole("button", { name: "Dokumenty i pomoc" }).click();
  await expect(page.getByText("Brak dokumentów dla tego wariantu.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Wyślij wniosek (symulacja)" })).toHaveCount(0);
});

test("adopcja pomija ciążę i liczy dni do granicy wieku", async ({ page }) => {
  await page.getByRole("button", { name: /^Adopcja Przysposobienie/ }).click();
  await expect(page.getByText("Czy w dniu przyjęcia dziecka jest ubezpieczenie chorobowe?")).toBeVisible();

  await page.getByRole("button", { name: /Adopcja 3-latka/ }).click();
  await steps(page).getByRole("button", { name: "Ciąża" }).click();
  await expect(page.getByText("Ten krok dotyczy ciąży. Przy adopcji i rodzinie zastępczej przejdź dalej.")).toBeVisible();

  await steps(page).getByRole("button", { name: "Dziecko" }).click();
  await expect(page.getByRole("heading", { name: "Przyjęte dziecko" })).toBeVisible();
  await expect(page.getByText(/Do granicy wieku zostało \d+ dni/)).toBeVisible();
  await expectTotalAbove(page, 1000);
});

test("urodzenie martwe skraca urlop macierzyński do 8 tygodni", async ({ page }) => {
  await steps(page).getByRole("button", { name: "Dziecko" }).click();
  await page.getByText("Poronienie, urodzenie martwe albo zgon dziecka").click();
  await page.getByRole("button", { name: "Urodzenie martwe / poronienie" }).click();
  await expect(summary(page).locator(".row", { hasText: "Macierzyński" })).toContainText("8 tyg.");
});

test("logowanie mObywatel uzupełnia 12 miesięcy i pomija niepełny", async ({ page }) => {
  await page.getByRole("button", { name: "Zaloguj przez mObywatel (symulacja)" }).click();
  await expect(page.getByText(/Zalogowano \(symulacja\)/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Zaloguj przez mObywatel (symulacja)" })).toHaveCount(0);

  await steps(page).getByRole("button", { name: "Ubezpieczenie i dochód" }).click();
  await expect(page.getByLabel("Brutto, miesiąc 5")).toHaveValue("8100");
  await expect(page.getByLabel("Czas pracy, miesiąc 5")).toHaveValue("40");
  await expect(page.getByText(/Pominięte miesiące: 1/)).toBeVisible();
});

test("pensja matki liczy podstawę i zwolnienie w ciąży", async ({ page }) => {
  await steps(page).getByRole("button", { name: "Ubezpieczenie i dochód" }).click();
  await page.getByLabel("Wynagrodzenie brutto miesięcznie").first().fill("8000");
  const basisRow = page.locator(".row", { hasText: "Podstawa wymiaru zasiłku" }).first();
  await expect.poll(async () => parseZl(await basisRow.innerText()), { timeout: 15_000 }).toBeGreaterThan(1000);

  await steps(page).getByRole("button", { name: "Ciąża" }).click();
  await page.getByRole("checkbox", { name: /Chcę policzyć zwolnienie w ciąży/ }).check();
  await expect(page.getByRole("heading", { name: "Wynik zwolnienia w ciąży" })).toBeVisible();
  await expect(page.getByText("Wynagrodzenie chorobowe (pracodawca)")).toBeVisible();
  await expect(page.getByText("Zasiłek chorobowy", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Chcę policzyć świadczenie rehabilitacyjne/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /zasiłek do dnia porodu/ })).toBeVisible();
  await expect(page.getByText(/ten kalkulator jeszcze go nie liczy/)).toHaveCount(0);
});

test("zlecenie i działalność ustawiają tytuł ubezpieczenia", async ({ page }) => {
  await page.getByRole("button", { name: /Matka na zleceniu/ }).click();
  await steps(page).getByRole("button", { name: "Ubezpieczenie i dochód" }).click();
  await expect(page.locator("#mother-title")).toHaveValue("mandate");
  await expect(page.locator("#father-title")).toHaveValue("business");
  await expect(page.getByLabel("Miesięczne podstawy składek (12 miesięcy)").first()).toHaveValue(/5200/);
});

test("odrzucona symulacja pokazuje komunikat z serwera", async ({ page }) => {
  await page.route("**/api/v1/calculations/simulate", (route) =>
    route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "TEST", message: "Symulacja odrzucona w teście." } }),
    }),
  );
  await page.goto("/");
  await expect(summary(page)).toContainText("Symulacja odrzucona w teście.");
  await steps(page).getByRole("button", { name: "Wynik" }).click();
  await expect(page.getByText("Nie da się policzyć tego wariantu.")).toBeVisible();
});

test.describe("wąski ekran", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("przewodnik nie rozpycha strony w poziomie", async ({ page }) => {
    await expectNoHorizontalScroll(page);
    await page.getByRole("button", { name: /Bliźnięta, wcześniaki/ }).click();
    await expectTotalAbove(page, 1000);
    await steps(page).getByRole("button", { name: "Wynik" }).click();
    await expect(page.getByRole("heading", { name: "Wynik" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await steps(page).getByRole("button", { name: "Dokumenty i pomoc" }).click();
    await expectNoHorizontalScroll(page);
  });
});
