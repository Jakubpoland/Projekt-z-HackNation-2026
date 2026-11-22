"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, type Catalog } from "@/lib/api";
import { pct, zl } from "@/lib/format";
import { saveGuideHandoff } from "@/lib/scan-handoff";
import { ScanCard } from "./ScanCard";

export function Intro() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState("");
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    api.catalog().then(setCatalog, (e: ApiError) => setError(e.message));
  }, []);

  const rate = (bps: number | undefined) => (bps == null ? "…" : pct(bps));
  const weeks = (n: number | undefined) => (n == null ? "…" : `${n} tyg.`);
  const contribution =
    catalog == null
      ? "…"
      : pct(Math.round((catalog.basis.socialContributionNumerator * 10000) / catalog.basis.socialContributionDenominator));

  return (
    <article className="reading">
      <ScanCard
        onApply={(state) => {
          saveGuideHandoff(state);
          setScanned(true);
        }}
      />
      {scanned && (
        <p className="btn-row" style={{ marginTop: 0 }}>
          <Link className="btn primary" href="/przewodnik">
            Otwórz uzupełniony kalkulator
          </Link>
        </p>
      )}
      <header className="card intro-hero">
        <p className="hint">Zanim policzysz kwotę</p>
        <h1>Najpierw przeczytaj, potem licz</h1>
        <p>
          Zasiłkowy Przewodnik Przyszłego Rodzica zbiera w jednym miejscu to, co wynika z ustawy zasiłkowej i Kodeksu pracy: czy
          zasiłek w ogóle przysługuje, na jak długo, w jakiej stawce, kto go wypłaci i jakich dokumentów nie pominąć. Kalkulator
          jest następnym krokiem. Ta strona jest po to, żeby wejść w niego ze znajomością własnych uprawnień, a nie tylko z
          pustym formularzem.
        </p>
        <p className="muted">
          To nie jest decyzja ZUS. Liczby biorą się z parametrów prawnych
          {catalog ? ` (${catalog.parametersVersion})` : ""}. Gdy przepis się zmieni, te same zdania pokażą nowe wymiary, o ile
          katalog na serwerze zostanie zaktualizowany.
        </p>
        <Link className="btn primary" href="/przewodnik">
          Przejdź do kalkulatora
        </Link>
      </header>

      {error && <div className="alert error">{error} Wymiary poniżej pojawią się, gdy serwer obliczeń odpowie.</div>}

      <section className="card">
        <h2>Jak poruszać się po przewodniku</h2>
        <ol className="intro-ol">
          <li>
            <strong>Wstęp</strong> — ta strona. Zostaw ją otwartą, jeśli w trakcie liczenia chcesz wrócić do zasady, a nie do
            wyniku.
          </li>
          <li>
            <strong>Kalkulator, krok „Start”</strong> — wybierz poród, adopcję albo rodzinę zastępczą oraz to, które z rodziców
            ma własne ubezpieczenie chorobowe. Możesz wgrać skan wniosku (PDF albo zdjęcie) albo wybrać przykładową sprawę.
            Pole, którego skaner nie odczyta, zostaje na czerwono i trzeba je wpisać ręcznie.
          </li>
          <li>
            <strong>Ubezpieczenie i dochód</strong> — tytuł ubezpieczenia, liczba osób u płatnika i podstawa wymiaru. Bez
            podstawy wymiary urlopu nadal się liczą, ale kwota wynosi zero.
          </li>
          <li>
            <strong>Ciąża</strong> — tylko przy porodzie i rodzinie zastępczej. Przy adopcji tego kroku nie ma, bo nie dotyczy
            zwolnienia lekarskiego w ciąży.
          </li>
          <li>
            <strong>Dziecko</strong> — liczba dzieci, „Za życiem”, wcześniak, urodzenie martwe albo zgon. Przy adopcji i pieczy
            liczy się też wiek dziecka.
          </li>
          <li>
            <strong>Podział urlopu</strong> — ile tygodni bierze matka, ile ojciec, czy któreś łączy urlop rodzicielski z pracą
            i czy ojciec bierze urlop ojcowski.
          </li>
          <li>
            <strong>Wynik oraz dokumenty i pomoc</strong> — kwota brutto, kto wypłaca, ostrzeżenia, lista formularzy, terminy i
            miejsca, w których szukać wsparcia.
          </li>
        </ol>
        <p className="hint">Przycisk „Dalej” nie przechodzi dalej, dopóki na bieżącym kroku są pola oznaczone jako nieodczytane.</p>
      </section>

      <section className="card">
        <h2>Od czego zależy prawo do zasiłku</h2>
        <p>
          Zasiłek macierzyński przysługuje osobie, która w dniu porodu albo przyjęcia dziecka na wychowanie ma ubezpieczenie
          chorobowe. Dotyczy to umowy o pracę, zlecenia i działalności, jeśli składka chorobowa jest opłacana. Brak
          ubezpieczenia w tym dniu oznacza brak zasiłku z tego tytułu. Drugi rodzic może mieć własne prawo. Gdy nie ma go żadne
          z rodziców, zostaje świadczenie rodzicielskie spoza tego kalkulatora (gov.pl).
        </p>
        <p>
          Wysokość bierze się z podstawy wymiaru. U pracownika jest to średnia wynagrodzenia z miesięcy przepracowanych co
          najmniej w połowie, pomniejszona o składki społeczne ({contribution}). U zleceniobiorcy i osoby prowadzącej
          działalność podstawą są przychody albo zadeklarowana podstawa składki, z limitem
          {catalog ? ` ${zl(catalog.basis.maxNonEmployeeBenefitBasis)}` : ""}. Stawka dzienna to podstawa miesięczna podzielona
          przez {catalog?.basis.dailyDivisor ?? "…"}.
        </p>
        <p>
          Zasiłek wypłaca płatnik składek, gdy zgłasza do ubezpieczenia chorobowego powyżej{" "}
          {catalog?.sickness.payerInsuredThreshold ?? "…"} osób. W pozostałych przypadkach wypłaca ZUS. Osoba prowadząca
          działalność zawsze dostaje zasiłek z ZUS.
        </p>
      </section>

      <section className="card">
        <h2>Co przysługuje w ciąży</h2>
        <p>
          Za czas niezdolności do pracy w ciąży wynagrodzenie chorobowe i zasiłek chorobowy wynoszą {rate(catalog?.ratesBps.sickPregnancy)}{" "}
          podstawy, gdy zwolnienie ma kod B. Najpierw płaci pracodawca: do {catalog?.sickness.sickPayDaysUnder50 ?? "…"} dni w
          roku, a {catalog?.sickness.sickPayDaysAge50 ?? "…"} dni, gdy zwolnienie przypada w roku po 50. urodzinach. Potem
          zasiłek. Okres zasiłkowy trwa {catalog?.sickness.benefitPeriodDays ?? "…"} dni. Wyczekiwanie to{" "}
          {catalog?.sickness.waitingDaysCompulsory ?? "…"} dni przy ubezpieczeniu obowiązkowym i{" "}
          {catalog?.sickness.waitingDaysVoluntary ?? "…"} dni przy dobrowolnym, chyba że przepis zwalnia z wyczekiwania.
        </p>
        <p className="hint">
          Po wyczerpaniu okresu zasiłkowego może przysługiwać świadczenie rehabilitacyjne. Ten przewodnik jeszcze go nie liczy.
          Dane e-ZLA w kalkulatorze są symulacją.
        </p>
      </section>

      <section className="card">
        <h2>Urlop macierzyński i zasiłek po porodzie</h2>
        <p>Wymiar urlopu macierzyńskiego zależy od liczby dzieci urodzonych przy jednym porodzie:</p>
        <ul className="intro-ol">
          {(catalog?.maternityWeeks ?? []).map((row, i, all) => (
            <li key={row.children}>
              {i === all.length - 1 && all.length > 1 ? `${row.children} i więcej` : row.children}{" "}
              {row.children === 1 ? "dziecko" : "dzieci"} — <strong>{row.weeks} tyg.</strong>
            </li>
          ))}
          {!catalog && <li>Wymiary pokażą się po połączeniu z serwerem obliczeń.</li>}
        </ul>
        <p>
          Część tego urlopu matka może wykorzystać jeszcze przed porodem. Resztę, albo całość, po narodzinach. Zasiłek za sam
          urlop macierzyński to {rate(catalog?.ratesBps.maternity)} podstawy, chyba że matka złoży wniosek o pełny wymiar urlopu
          macierzyńskiego i rodzicielskiego w terminie. Wtedy oba okresy są liczone po {rate(catalog?.ratesBps.combinedRequest)}.
        </p>
        <p>
          Gdy dziecko urodzi się martwe albo umrze wkrótce po porodzie, wymiar jest krótszy. Przewodnik liczy go osobno i
          podaje, gdzie szukać pomocy. To nie zastępuje wsparcia w szpitalu ani w urzędzie stanu cywilnego.
        </p>
      </section>

      <section className="card">
        <h2>Urlop rodzicielski obojga rodziców</h2>
        <p>
          Po urlopie macierzyńskim jest pula urlopu rodzicielskiego: {weeks(catalog?.parental.oneChildWeeks)} przy jednym
          dziecku i {weeks(catalog?.parental.multiChildWeeks)} przy większej liczbie. Z zaświadczeniem „Za życiem” pula wynosi{" "}
          {weeks(catalog?.parental.oneChildZaZyciemWeeks)} albo {weeks(catalog?.parental.multiChildZaZyciemWeeks)}. W tej puli
          każdy rodzic ma {weeks(catalog?.parental.exclusiveWeeksPerParent)} tylko dla siebie. Tych tygodni nie można oddać
          drugiemu rodzicowi. Jedna osoba może więc wziąć pulę pomniejszoną o część niezbywalną drugiego.
        </p>
        <p>
          Niezbywalne tygodnie drugiego rodzica są płatne w stawce {rate(catalog?.ratesBps.secondParentExclusive)}, także wtedy,
          gdy reszta urlopu idzie po {rate(catalog?.ratesBps.combinedRequest)}. Bez wniosku o pełny wymiar w terminie urlop
          rodzicielski jest liczony po {rate(catalog?.ratesBps.parental)}.
        </p>
        <p>
          Pracownik może łączyć urlop rodzicielski z pracą do połowy etatu. Urlop wydłuża się o tyle, o ile etat jest niższy, a
          zasiłek za wydłużoną część jest odpowiednio mniejszy. Zlecenie i działalność nie dają tego wydłużenia. Nie obejmuje
          ich też szczególna ochrona stosunku pracy z Kodeksu pracy.
        </p>
      </section>

      <section className="card">
        <h2>Urlop ojcowski, wcześniak, adopcja i rodzina zastępcza</h2>
        <div className="intro-grid">
          <div>
            <h3>Urlop ojcowski</h3>
            <p>
              Ojcu przysługuje {weeks(catalog?.paternity.weeks)} urlopu ojcowskiego, w najwyżej {catalog?.paternity.maxParts ?? "…"}{" "}
              częściach, do {catalog?.paternity.untilMonths ?? "…"}. miesiąca życia dziecka. Zasiłek wynosi{" "}
              {rate(catalog?.ratesBps.paternity)}. Ten urlop nie wchodzi w stawkę {rate(catalog?.ratesBps.combinedRequest)}.
            </p>
          </div>
          <div>
            <h3>Wcześniak i szpital</h3>
            <p>
              Gdy dziecko urodzi się przedwcześnie albo długo zostaje w szpitalu, przysługuje uzupełniający urlop macierzyński.
              Zasiłek za ten czas to {rate(catalog?.ratesBps.supplementary)}. Kalkulator pyta o tydzień ciąży, masę urodzeniową
              i dni pobytu.
            </p>
          </div>
          <div>
            <h3>Adopcja</h3>
            <p>
              Przy przysposobieniu jest urlop na warunkach urlopu macierzyńskiego, a potem rodzicielski. Granica wieku dziecka
              w przewodniku to 14 lat. Kroku o ciąży nie ma.
            </p>
          </div>
          <div>
            <h3>Rodzina zastępcza</h3>
            <p>
              Przyjęcie dziecka do niezawodowej rodziny zastępczej daje ten sam rodzaj urlopu. Granica wieku to 7 lat, a 10
              lat, gdy dziecko ma odroczony obowiązek szkolny. Urlop liczy się do tej granicy, nie dłużej niż pełny wymiar.
            </p>
          </div>
        </div>
      </section>

      {catalog && catalog.notes.length > 0 && (
        <section className="card">
          <h2>Zasady, których trzyma się kalkulator</h2>
          <ul className="intro-ol">
            {catalog.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="hint">Parametry: {catalog.parametersVersion}. Najniższe wynagrodzenie w podstawie: {zl(catalog.basis.minWage)}.</p>
        </section>
      )}

      <section className="card">
        <h2>Czego ten przewodnik nie zastępuje</h2>
        <p>
          Logowanie przez mObywatel, podgląd e-ZLA, zaległości składkowe i wysyłka wniosku do PUE/eZUS są w kalkulatorze
          oznaczone jako symulacja. Nie łączą się z systemami ZUS. Wniosek o zasiłek to formularz ZAM. Zaświadczenie płatnika
          dla pracownika to Z-3, a dla zlecenia Z-3a.
        </p>
        <ul className="intro-ol">
          <li>
            <a href="https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski">ZUS — zasiłek macierzyński</a>
          </li>
          <li>
            <a href="https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy">ZUS — zasiłek chorobowy</a>
          </li>
          <li>
            <a href="https://www.gov.pl/web/rodzina/urlop-rodzicielski">gov.pl/rodzina — urlop rodzicielski</a>
          </li>
          <li>
            <a href="https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo">Państwowa Inspekcja Pracy — rodzicielstwo</a>
          </li>
        </ul>
        <Link className="btn primary" href="/przewodnik">
          Znam swoje uprawnienia, otwórz kalkulator
        </Link>
      </section>
    </article>
  );
}
