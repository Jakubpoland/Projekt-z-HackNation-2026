"use client";

import type { BasisResult, Catalog, SicknessResult, SimulationResult, TakeoverReason, Title } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { daysUntilAgeLimit } from "@/lib/dates";
import { pct, TITLE, weeksDays, zl } from "@/lib/format";
import { PRESETS, simulatedZusData } from "@/lib/presets";
import { dropGaps, withParent, type GuideState, type ParentForm } from "@/lib/state";
import { ScanCard } from "./ScanCard";
import { Check, Choices, Range, Sim, TextInput } from "./ui";

export interface StepProps {
  s: GuideState;
  set: (next: GuideState | ((prev: GuideState) => GuideState)) => void;
  catalog: Catalog | null;
  result: SimulationResult | null;
}

/* ---------- 1. Start ---------- */

export function StepStart({ s, set }: StepProps) {
  return (
    <>
      <div className="card">
        <h2>Twoja sytuacja</h2>
        <p className="muted">
          Przewodnik sprawdzi, czy przysługuje Ci zasiłek, na jak długo i ile wyniesie, kto go wypłaci, jakie dokumenty
          przygotować i na co uważać. Wyliczenia robi serwer obliczeń na aktualnych parametrach prawnych.
        </p>
        <Choices
          label="Co się wydarzy (albo wydarzyło)?"
          value={s.situation}
          missing={s.gaps.includes("situation")}
          onChange={(situation) =>
            set(
              dropGaps(
                {
                  ...s,
                  situation,
                  preBirthWeeks: situation === "birth" ? s.preBirthWeeks : 0,
                  pregnancy: situation === "adoption" ? { ...s.pregnancy, enabled: false } : s.pregnancy,
                },
                ["situation"],
              ),
            )
          }
          options={[
            { value: "birth", label: "Ciąża / poród", hint: "Urodzenie dziecka" },
            { value: "adoption", label: "Adopcja", hint: "Przysposobienie dziecka" },
            { value: "foster", label: "Rodzina zastępcza", hint: "Niezawodowa, przyjęcie dziecka" },
          ]}
        />
        <Choices
          label="Kto ma prawo do zasiłku z własnego ubezpieczenia chorobowego?"
          value={s.role}
          onChange={(role) =>
            set({
              ...s,
              role,
              mother: { ...s.mother, hasRight: role !== "father" },
              father: { ...s.father, hasRight: role !== "mother" },
              takeover: role === "father" ? true : s.takeover,
              takeoverReason: role === "father" ? "mother_uninsured" : s.takeoverReason,
            })
          }
          options={[
            { value: "both", label: "Oboje rodzice" },
            { value: "mother", label: "Tylko matka" },
            { value: "father", label: "Tylko ojciec", hint: "Matka nie jest ubezpieczona" },
          ]}
        />
        <Choices
          label={s.situation === "birth" ? "Czy w dniu porodu jest ubezpieczenie chorobowe?" : "Czy w dniu przyjęcia dziecka jest ubezpieczenie chorobowe?"}
          value={s.insuredOnEvent ? "yes" : "no"}
          missing={s.gaps.includes("insuredOnEvent")}
          onChange={(v) => set(dropGaps({ ...s, insuredOnEvent: v === "yes" }, ["insuredOnEvent"]))}
          options={[
            { value: "yes", label: "Tak" },
            { value: "no", label: "Nie", hint: "Np. umowa skończyła się wcześniej" },
          ]}
        />
        <TextInput
          label={s.situation === "birth" ? "Data porodu (planowana lub faktyczna)" : "Data przyjęcia dziecka"}
          hint="Opcjonalnie. Posłuży do harmonogramu urlopów i terminów wniosków."
          type="date"
          value={s.eventDate}
          missing={s.gaps.includes("eventDate")}
          onChange={(eventDate) => set(dropGaps({ ...s, eventDate }, ["eventDate"]))}
        />
      </div>

      <ScanCard onApply={(next) => set(next)} />

      <div className="card">
        <h3>
          Pobierz dane z ZUS <Sim />
        </h3>
        <p className="muted">
          W docelowej wersji logowanie przez mObywatel pobierze tytuł ubezpieczenia, historię wynagrodzeń, e-ZLA i stan
          rozliczeń składek. Tutaj dane są przykładowe.
        </p>
        {s.mObywatel ? (
          <div className="alert sim">
            Zalogowano (symulacja). Pobrano: umowa o pracę, 12 miesięcy wynagrodzeń, płatnik zgłasza 85 osób, brak zaległości składkowych, brak e-ZLA w ostatnich 30 dniach.
          </div>
        ) : (
          <button type="button" className="btn sim" onClick={() => set(simulatedZusData(s))}>
            Zaloguj przez mObywatel (symulacja)
          </button>
        )}
      </div>

      <div className="card">
        <h3>Albo wybierz przykładowy wniosek</h3>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="choice" onClick={() => set(p.build())}>
              <strong>{p.title}</strong>
              <small>{p.description}</small>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------- 2. Ubezpieczenie i dochód ---------- */

function ParentBasis({
  who,
  p,
  onChange,
  basis,
  catalog,
  missingTitle,
  missingSalary,
  missingPayer,
}: {
  who: "mother" | "father";
  p: ParentForm;
  onChange: (patch: Partial<ParentForm>) => void;
  basis: BasisResult | ApiError | undefined;
  catalog: Catalog | null;
  missingTitle?: boolean;
  missingSalary?: boolean;
  missingPayer?: boolean;
}) {
  const name = who === "mother" ? "Matka" : "Ojciec";
  if (!p.hasRight) {
    return (
      <div className="card soft">
        <h3>
          <span className={`dot ${who}`} />
          {name}
        </h3>
        <p className="muted">Bez prawa do zasiłku w tej symulacji.</p>
      </div>
    );
  }
  const threshold = catalog?.sickness.payerInsuredThreshold;
  return (
    <div className="card">
      <h3>
        <span className={`dot ${who}`} />
        {name}
      </h3>
      <div className={missingTitle ? "field need-manual" : "field"}>
        <label htmlFor={`${who}-title`}>Tytuł ubezpieczenia</label>
        {missingTitle && <span className="hint need-manual-text">Nie odczytano ze skanu. Wybierz tytuł, nawet jeśli etat jest już podświetlony.</span>}
        <select
          id={`${who}-title`}
          value={p.title}
          onChange={(e) => {
            const title = e.target.value as Title;
            onChange({
              title,
              basisMode: title === "employee" ? (p.basisMode === "non_employee" ? "salary" : p.basisMode) : "non_employee",
              works: title === "employee" ? p.works : false,
            });
          }}
        >
          {(Object.keys(TITLE) as Title[]).map((t) => (
            <option key={t} value={t}>
              {TITLE[t]}
            </option>
          ))}
        </select>
      </div>
      {p.title !== "business" && (
        <TextInput
          label="Ile osób zgłasza do ubezpieczenia płatnik?"
          hint={threshold ? `Powyżej ${threshold} osób zasiłek wypłaca płatnik, w pozostałych przypadkach ZUS.` : undefined}
          inputMode="numeric"
          value={p.payerInsuredCount}
          missing={missingPayer}
          onChange={(payerInsuredCount) => onChange({ payerInsuredCount: payerInsuredCount.replace(/\D/g, "") })}
          placeholder="np. 25"
        />
      )}

      <Choices
        label="Jak ustalić podstawę wymiaru?"
        value={p.basisMode}
        onChange={(basisMode) => onChange({ basisMode, months: basisMode === "months" && !p.months.length ? defaultMonths(p.salary) : p.months })}
        options={
          p.title === "employee"
            ? [
                { value: "salary", label: "Stała pensja" },
                { value: "months", label: "12 miesięcy" },
                { value: "direct", label: "Znam podstawę" },
              ]
            : [
                { value: "non_employee", label: "Podstawa składek" },
                { value: "direct", label: "Znam podstawę" },
              ]
        }
      />

      {p.basisMode === "salary" && (
        <TextInput label="Wynagrodzenie brutto miesięcznie" inputMode="decimal" suffix="zł" value={p.salary} missing={missingSalary} onChange={(salary) => onChange({ salary })} placeholder="np. 8000" />
      )}
      {p.basisMode === "months" && (
        <div className={missingSalary ? "field need-manual" : "field"}>
          <span className="label">Wynagrodzenie brutto z 12 miesięcy przed zdarzeniem</span>
          {missingSalary && <span className="hint need-manual-text">Nie odczytano ze skanu. Wpisz ręcznie.</span>}
          <span className="hint">Miesiąc przepracowany w mniej niż połowie wypada ze średniej.</span>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mies.</th>
                  <th>Brutto (zł)</th>
                  <th>Przepracowano (%)</th>
                </tr>
              </thead>
              <tbody>
                {p.months.map((m, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <input
                        aria-label={`Brutto, miesiąc ${i + 1}`}
                        type="text"
                        inputMode="decimal"
                        value={m.gross}
                        data-empty={m.gross.trim() === "" ? "" : undefined}
                        onChange={(e) => onChange({ months: p.months.map((x, j) => (j === i ? { ...x, gross: e.target.value } : x)) })}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Czas pracy, miesiąc ${i + 1}`}
                        type="text"
                        inputMode="numeric"
                        value={m.workedPct}
                        data-empty={m.workedPct.trim() === "" ? "" : undefined}
                        onChange={(e) => onChange({ months: p.months.map((x, j) => (j === i ? { ...x, workedPct: e.target.value } : x)) })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {p.basisMode === "non_employee" && (
        <TextInput
          label="Miesięczne podstawy składek (12 miesięcy)"
          hint="Oddziel średnikiem, np. 5200; 5200; 5600. Dla działalności to zadeklarowana podstawa składki chorobowej."
          value={p.revenues}
          missing={missingSalary}
          onChange={(revenues) => onChange({ revenues })}
        />
      )}
      {p.basisMode === "direct" && (
        <TextInput
          label="Podstawa wymiaru zasiłku (po odliczeniu składek)"
          hint="Np. z zaświadczenia Z-3 lub z decyzji o poprzednim zasiłku."
          inputMode="decimal"
          suffix="zł"
          value={p.direct}
          missing={missingSalary}
          onChange={(direct) => onChange({ direct })}
        />
      )}

      <BasisBox
        basis={p.basisMode === "direct" ? undefined : basis}
        basisGrosze={p.basisGrosze}
        contributionPct={catalog ? pct(Math.round((catalog.basis.socialContributionNumerator * 10000) / catalog.basis.socialContributionDenominator)) : undefined}
      />

      <details>
        <summary>Ryzyka przy podstawie i umowie</summary>
        <div style={{ marginTop: 10 }}>
          <Check
            label="Wynagrodzenie albo podstawa zmieniły się w czasie ciąży"
            checked={p.basisChangedDuringPregnancy}
            onChange={(basisChangedDuringPregnancy) => onChange({ basisChangedDuringPregnancy })}
          />
          <Check
            label="Umowa zawarta krótko przed ciążą lub w ciąży, z wysokim wynagrodzeniem"
            hint="ZUS może badać, czy umowa nie jest pozorna."
            checked={p.possibleShamEngagement}
            onChange={(possibleShamEngagement) => onChange({ possibleShamEngagement })}
          />
        </div>
      </details>
    </div>
  );
}

function filledKeys(who: "mother" | "father", patch: Partial<ParentForm>): string[] {
  const keys: string[] = [];
  const titleKey = who === "mother" ? "motherTitle" : "fatherTitle";
  const salaryKey = who === "mother" ? "motherSalary" : "fatherSalary";
  if ("title" in patch) keys.push(titleKey);
  const hasMoney =
    ("salary" in patch && !!patch.salary?.trim()) ||
    ("revenues" in patch && !!patch.revenues?.trim()) ||
    ("direct" in patch && !!patch.direct?.trim()) ||
    ("months" in patch && !!patch.months?.some((m) => m.gross.trim()));
  if (hasMoney) keys.push(salaryKey);
  if ("payerInsuredCount" in patch && !!patch.payerInsuredCount?.trim()) keys.push("payerCount");
  return keys;
}

function defaultMonths(salary: string) {
  return Array.from({ length: 12 }, () => ({ gross: salary, workedPct: "100" }));
}

function BasisBox({ basis, basisGrosze, contributionPct }: { basis: BasisResult | ApiError | undefined; basisGrosze: number; contributionPct?: string }) {
  if (basis instanceof ApiError) return <div className="alert error">{basis.message}</div>;
  if (!basis) {
    if (basisGrosze > 0) return <div className="alert info">Podstawa wymiaru: <strong>{zl({ grosze: basisGrosze, zloty: (basisGrosze / 100).toFixed(2) })}</strong></div>;
    return null;
  }
  return (
    <div className="alert info">
      <div className="row">
        <span>Średnia brutto</span>
        <strong>{zl(basis.grossAverage)}</strong>
      </div>
      <div className="row">
        <span>Składki społeczne{contributionPct ? ` (${contributionPct})` : ""}</span>
        <span>− {zl(basis.contribution)}</span>
      </div>
      <div className="row">
        <span>Podstawa wymiaru zasiłku</span>
        <strong>{zl(basis.basis)}</strong>
      </div>
      {basis.monthsSkipped > 0 && <div className="hint">Pominięte miesiące: {basis.monthsSkipped}</div>}
      {basis.capApplied && <div className="hint">Zastosowano limit podstawy dla osoby niebędącej pracownikiem.</div>}
      {basis.notes?.map((n) => (
        <div key={n} className="hint">
          {n}
        </div>
      ))}
    </div>
  );
}

export function StepInsurance({ s, set, catalog, basis }: StepProps & { basis: Record<string, BasisResult | ApiError | undefined> }) {
  return (
    <>
      {!s.insuredOnEvent && (
        <div className="alert warn">
          Bez ubezpieczenia chorobowego w dniu {s.situation === "birth" ? "porodu" : "przyjęcia dziecka"} zasiłek macierzyński nie przysługuje.
          Sprawdź, czy drugi rodzic jest ubezpieczony albo czy przysługuje świadczenie rodzicielskie (1000 zł, gov.pl).
        </div>
      )}
      <div className="split">
        <ParentBasis
          who="mother"
          p={s.mother}
          catalog={catalog}
          basis={basis.mother}
          missingTitle={s.gaps.includes("motherTitle")}
          missingSalary={s.gaps.includes("motherSalary")}
          missingPayer={s.gaps.includes("payerCount")}
          onChange={(patch) => set((prev) => dropGaps(withParent(prev, "mother", patch), filledKeys("mother", patch)))}
        />
        <ParentBasis
          who="father"
          p={s.father}
          catalog={catalog}
          basis={basis.father}
          missingTitle={s.gaps.includes("fatherTitle")}
          missingSalary={s.gaps.includes("fatherSalary")}
          onChange={(patch) => set((prev) => dropGaps(withParent(prev, "father", patch), filledKeys("father", patch)))}
        />
      </div>
    </>
  );
}

/* ---------- 3. Ciąża ---------- */

export function StepPregnancy({ s, set, catalog, sickness }: StepProps & { sickness: SicknessResult | ApiError | null }) {
  if (s.situation !== "birth") {
    return (
      <div className="card">
        <h2>Ciąża</h2>
        <p className="muted">Ten krok dotyczy ciąży. Przy adopcji i rodzinie zastępczej przejdź dalej.</p>
      </div>
    );
  }
  const p = s.pregnancy;
  const up = (patch: Partial<typeof p>) => set({ ...s, pregnancy: { ...p, ...patch } });
  return (
    <>
      <div className="card">
        <h2>Zwolnienie lekarskie w ciąży</h2>
        <p className="muted">
          W ciąży zasiłek chorobowy wynosi 100% podstawy, jeśli na zwolnieniu jest kod <strong>B</strong>. Pracownik najpierw dostaje
          wynagrodzenie chorobowe od pracodawcy{catalog ? ` (${catalog.sickness.sickPayDaysUnder50} dni w roku, ${catalog.sickness.sickPayDaysAge50} po 50. roku życia)` : ""}, potem zasiłek.
        </p>
        <Check
          label="Chcę policzyć zwolnienie w ciąży"
          checked={p.enabled}
          onChange={(enabled) => set(dropGaps({ ...s, pregnancy: { ...p, enabled } }, enabled ? [] : ["pregnancyDays"]))}
        />
        {p.enabled && (
          <>
            <Choices
              label="Ubezpieczenie chorobowe"
              value={p.insurance}
              onChange={(insurance) => up({ insurance })}
              options={[
                { value: "compulsory", label: "Obowiązkowe", hint: "Umowa o pracę" },
                { value: "voluntary", label: "Dobrowolne", hint: "Zlecenie, działalność" },
                { value: "none", label: "Brak" },
              ]}
            />
            <div className="grid-2">
              <TextInput
                label="Dni zwolnienia"
                inputMode="numeric"
                value={p.incapacityDays}
                missing={s.gaps.includes("pregnancyDays")}
                onChange={(incapacityDays) => set(dropGaps({ ...s, pregnancy: { ...p, incapacityDays } }, ["pregnancyDays"]))}
                suffix="dni"
              />
              <TextInput
                label="Dni ubezpieczenia przed zwolnieniem"
                hint={catalog ? `Okres wyczekiwania: ${catalog.sickness.waitingDaysCompulsory} dni (obowiązkowe), ${catalog.sickness.waitingDaysVoluntary} (dobrowolne).` : undefined}
                inputMode="numeric"
                value={p.coveredDaysBefore}
                onChange={(coveredDaysBefore) => up({ coveredDaysBefore })}
                suffix="dni"
              />
              <TextInput
                label="Wykorzystane już dni wynagrodzenia chorobowego w tym roku"
                inputMode="numeric"
                value={p.sickPayDaysUsed}
                onChange={(sickPayDaysUsed) => up({ sickPayDaysUsed })}
                suffix="dni"
              />
            </div>
            <Check label="Zwolnienie ma kod B (ciąża)" checked={p.codeB} onChange={(codeB) => up({ codeB })} />
            <Check label="Zwolnienie przypada w roku po 50. urodzinach" checked={p.age50Rule} onChange={(age50Rule) => up({ age50Rule })} />
            <Check
              label="Okres wyczekiwania nie obowiązuje (wyjątek ustawowy)"
              hint="Np. absolwent szkoły, który zgłosił się w ciągu 90 dni, albo co najmniej 10 lat ubezpieczenia obowiązkowego."
              checked={p.waitingPeriodAlreadyMet}
              onChange={(waitingPeriodAlreadyMet) => up({ waitingPeriodAlreadyMet })}
            />
            <div className="alert sim">
              <Sim>e-ZLA</Sim> W wersji docelowej dane zwolnienia (dni, kod B) zostaną pobrane z e-ZLA.
            </div>
          </>
        )}
      </div>
      {p.enabled && <SicknessBox r={sickness} basisGrosze={s.mother.basisGrosze} />}
    </>
  );
}

function SicknessBox({ r, basisGrosze }: { r: SicknessResult | ApiError | null; basisGrosze: number }) {
  if (!basisGrosze) return <div className="alert warn">Podaj wynagrodzenie matki w kroku „Ubezpieczenie i dochód”, aby policzyć kwotę.</div>;
  if (r instanceof ApiError) return <div className="alert error">{r.message}</div>;
  if (!r) return <div className="card muted">Liczę…</div>;
  return (
    <div className="card">
      <h3>Wynik zwolnienia w ciąży</h3>
      {!r.eligible && <div className="alert warn">Za ten okres zasiłek chorobowy nie przysługuje.</div>}
      <div className="row">
        <span>Wynagrodzenie chorobowe (pracodawca)</span>
        <span>
          {r.sickPayDays} dni × {zl(r.sickPayDaily)} ({pct(r.sickPayRateBps)}) = <strong>{zl(r.sickPayTotal)}</strong>
        </span>
      </div>
      <div className="row">
        <span>Zasiłek chorobowy</span>
        <span>
          {r.benefitDays} dni × {zl(r.benefitDaily)} ({pct(r.benefitRateBps)}) = <strong>{zl(r.benefitTotal)}</strong>
        </span>
      </div>
      {r.unpaidDays > 0 && (
        <div className="row">
          <span>Dni bez świadczenia</span>
          <span>{r.unpaidDays}</span>
        </div>
      )}
      <div className="row">
        <span>Okres zasiłkowy</span>
        <span>{r.periodLimitDays} dni</span>
      </div>
      {r.warnings.map((w) => (
        <div key={w.code} className="alert warn" style={{ marginTop: 10 }}>
          {w.message}
        </div>
      ))}
      <p className="hint" style={{ marginTop: 10 }}>
        Po wyczerpaniu okresu zasiłkowego może przysługiwać świadczenie rehabilitacyjne — ten kalkulator jeszcze go nie liczy.
      </p>
    </div>
  );
}

/* ---------- 4. Dziecko ---------- */

export function StepChild({ s, set, catalog }: StepProps) {
  const birth = s.situation === "birth";
  const maxChildren = catalog ? catalog.maternityWeeks[catalog.maternityWeeks.length - 1].children : 5;
  const ageDays = !birth ? daysUntilAgeLimit(s.childBirthDate, s.eventDate, s.ageLimitYears) : null;
  return (
    <div className="card">
      <h2>{birth ? "Dziecko" : "Przyjęte dziecko"}</h2>
      <Choices
        label={birth ? "Liczba dzieci urodzonych przy jednym porodzie" : "Liczba dzieci przyjętych jednocześnie"}
        value={s.childCount}
        missing={s.gaps.includes("childCount")}
        onChange={(childCount) => set(dropGaps({ ...s, childCount }, ["childCount"]))}
        options={Array.from({ length: maxChildren }, (_, i) => ({
          value: i + 1,
          label: i + 1 === maxChildren ? `${i + 1}+` : String(i + 1),
          hint: catalog ? `${catalog.maternityWeeks[i].weeks} tyg.` : undefined,
        }))}
      />
      <Check
        label="Zaświadczenie „Za życiem” (ciężkie i nieodwracalne upośledzenie albo nieuleczalna choroba)"
        hint={catalog ? `Urlop rodzicielski: ${catalog.parental.oneChildZaZyciemWeeks} tyg. zamiast ${catalog.parental.oneChildWeeks}.` : undefined}
        checked={s.zaZyciem}
        missing={s.gaps.includes("zaZyciem")}
        onDismiss={() => set(dropGaps(s, ["zaZyciem"]))}
        onChange={(zaZyciem) => set(dropGaps({ ...s, zaZyciem }, ["zaZyciem"]))}
      />

      {!birth && (
        <>
          <div className="grid-2">
            <TextInput label="Data urodzenia dziecka" type="date" value={s.childBirthDate} missing={s.gaps.includes("childBirthDate")} onChange={(childBirthDate) => set(dropGaps({ ...s, childBirthDate }, ["childBirthDate"]))} />
            <TextInput label="Data przyjęcia dziecka" type="date" value={s.eventDate} missing={s.gaps.includes("eventDate")} onChange={(eventDate) => set(dropGaps({ ...s, eventDate }, ["eventDate"]))} />
          </div>
          <Choices
            label="Granica wieku dziecka"
            value={s.ageLimitYears}
            onChange={(ageLimitYears) => set({ ...s, ageLimitYears })}
            options={[
              { value: 14, label: "14 lat", hint: "Adopcja" },
              { value: 7, label: "7 lat", hint: "Rodzina zastępcza" },
              { value: 10, label: "10 lat", hint: "Odroczony obowiązek szkolny" },
            ]}
          />
          {ageDays != null && (
            <div className={`alert ${ageDays > 0 ? "info" : "error"}`}>
              Do granicy wieku zostało {ageDays} dni ({weeksDays(Math.max(0, ageDays))}).
              {ageDays <= 0 && " Dziecko przekroczyło wiek uprawniający."}
            </div>
          )}
        </>
      )}

      {birth && (
        <>
          <details open={s.premature}>
            <summary>Wcześniak albo dziecko w szpitalu po porodzie</summary>
            <div style={{ marginTop: 10 }}>
              <Check label="Dziecko urodziło się przedwcześnie lub wymagało hospitalizacji" checked={s.premature} onChange={(premature) => set({ ...s, premature })} />
              {s.premature && (
                <>
                  <div className="grid-3">
                    <TextInput label="Tydzień ciąży przy porodzie" inputMode="numeric" value={s.pregnancyWeekAtBirth} missing={s.gaps.includes("pregnancyWeek")} onChange={(pregnancyWeekAtBirth) => set(dropGaps({ ...s, pregnancyWeekAtBirth }, ["pregnancyWeek"]))} />
                    <TextInput label="Najniższa masa urodzeniowa" inputMode="numeric" suffix="g" value={s.birthWeight} missing={s.gaps.includes("birthWeight")} onChange={(birthWeight) => set(dropGaps({ ...s, birthWeight }, ["birthWeight"]))} />
                    <TextInput label="Dni w szpitalu" hint="Przy bliźniętach — najdłuższy pobyt." inputMode="numeric" value={s.hospitalDays} missing={s.gaps.includes("hospitalDays")} onChange={(hospitalDays) => set(dropGaps({ ...s, hospitalDays }, ["hospitalDays"]))} />
                  </div>
                  <Choices
                    label="Kto weźmie uzupełniający urlop macierzyński?"
                    value={s.supplementaryTo}
                    onChange={(supplementaryTo) => set({ ...s, supplementaryTo })}
                    options={[
                      { value: "mother", label: "Matka" },
                      { value: "father", label: "Ojciec", disabled: !s.father.hasRight },
                    ]}
                  />
                </>
              )}
            </div>
          </details>
          <details open={s.loss !== "none"}>
            <summary>Poronienie, urodzenie martwe albo zgon dziecka</summary>
            <div style={{ marginTop: 10 }}>
              <p className="hint">
                Wiemy, że to trudne. Przewodnik pokaże skrócony urlop i miejsca, gdzie można szukać wsparcia (krok „Dokumenty i pomoc”).
              </p>
              <Choices
                value={s.loss}
                onChange={(loss) => set({ ...s, loss })}
                options={[
                  { value: "none", label: "Nie dotyczy" },
                  { value: "stillbirth", label: "Urodzenie martwe / poronienie" },
                  { value: "death", label: "Zgon dziecka po porodzie" },
                ]}
              />
              {s.loss === "death" && (
                <TextInput label="Dzień życia, w którym nastąpił zgon" hint="Dzień porodu = 0." inputMode="numeric" value={s.deathDay} onChange={(deathDay) => set({ ...s, deathDay })} />
              )}
              {s.loss !== "none" && s.childCount > 1 && (
                <TextInput
                  label="Ile dzieci z tego porodu żyje?"
                  inputMode="numeric"
                  value={s.aliveCount}
                  onChange={(aliveCount) => set({ ...s, aliveCount })}
                />
              )}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

/* ---------- 5. Podział urlopu ---------- */

const TAKEOVER: { value: TakeoverReason; label: string }[] = [
  { value: "resignation_after_14", label: "Matka rezygnuje po 14 tygodniach" },
  { value: "incapacity", label: "Matka jest niezdolna do samodzielnej opieki" },
  { value: "hospital", label: "Matka przebywa w szpitalu" },
  { value: "death", label: "Zgon matki" },
  { value: "abandonment", label: "Matka porzuciła dziecko" },
  { value: "mother_uninsured", label: "Matka nie jest ubezpieczona" },
];

export function StepSplit({ s, set, catalog, result }: StepProps) {
  const e = result?.entitlement;
  const maxOne = e?.maxWeeksForOneParent ?? 32;
  const excl = e?.exclusiveWeeksPerParent ?? 9;
  const shared = e?.sharedWeeks ?? 23;
  const matWeeks = e ? Math.floor(e.maternityDays / 7) : 20;
  const birth = s.situation === "birth";

  const motherMax = s.father.hasRight ? Math.min(maxOne, excl + Math.max(0, shared - Math.max(0, s.father.parentalWeeks - excl))) : maxOne;
  const fatherMax = s.mother.hasRight ? Math.min(maxOne, excl + Math.max(0, shared - Math.max(0, s.mother.parentalWeeks - excl))) : maxOne;

  return (
    <>
      <div className="card">
        <h2>{birth ? "Urlop macierzyński" : "Urlop na warunkach urlopu macierzyńskiego"}</h2>
        {e && (
          <p>
            Wymiar: <strong>{weeksDays(e.maternityDays)}</strong>
            {e.shortParental && " (skrócony, bo dziecko zbliża się do granicy wieku)"}
            {e.supplementaryWeeks > 0 && `. Do tego uzupełniający urlop macierzyński: ${e.supplementaryWeeks} tyg.`}
          </p>
        )}
        {birth && s.mother.hasRight && (
          <Range
            label="Ile tygodni matka wykorzysta przed porodem?"
            hint="Najwyżej 6 tygodni. To część urlopu macierzyńskiego, nie dodatkowy czas."
            value={s.preBirthWeeks}
            min={0}
            max={6}
            onChange={(preBirthWeeks) => set({ ...s, preBirthWeeks })}
          />
        )}
        {s.father.hasRight && (
          <Check
            label="Ojciec przejmuje część urlopu macierzyńskiego"
            checked={s.takeover}
            onChange={(takeover) =>
              set({ ...s, takeover, takeoverReason: takeover ? (s.mother.hasRight ? "resignation_after_14" : "mother_uninsured") : "none", motherMaternityWeeks: takeover ? 14 : null })
            }
          />
        )}
        {s.takeover && (
          <>
            <div className="field">
              <label htmlFor="takeover">Powód</label>
              <select id="takeover" value={s.takeoverReason} onChange={(ev) => set({ ...s, takeoverReason: ev.target.value as TakeoverReason })}>
                {TAKEOVER.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {s.takeoverReason !== "mother_uninsured" && s.mother.hasRight && (
              <Range
                label="Tygodnie matki"
                hint="Resztę wymiaru wykorzysta ojciec."
                value={s.motherMaternityWeeks ?? matWeeks}
                min={0}
                max={matWeeks}
                onChange={(motherMaternityWeeks) => set({ ...s, motherMaternityWeeks })}
              />
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>Urlop rodzicielski</h2>
        {e && (
          <p className="muted">
            Pula: <strong>{e.parentalPoolWeeks} tyg.</strong> W tym po {e.exclusiveWeeksPerParent} tyg. niezbywalnych dla każdego rodzica i{" "}
            {e.sharedWeeks} tyg. wspólnych. Jedna osoba może wziąć najwyżej {e.maxWeeksForOneParent} tyg.
          </p>
        )}
        <div className="split">
          {s.mother.hasRight && (
            <Range label={<><span className="dot mother" />Matka</>} value={s.mother.parentalWeeks} min={0} max={motherMax} onChange={(parentalWeeks) => set(withParent(s, "mother", { parentalWeeks }))} />
          )}
          {s.father.hasRight && (
            <Range label={<><span className="dot father" />Ojciec</>} value={s.father.parentalWeeks} min={0} max={fatherMax} onChange={(parentalWeeks) => set(withParent(s, "father", { parentalWeeks }))} />
          )}
        </div>
        {s.mother.hasRight && s.father.hasRight && (
          <div className="btn-row" style={{ justifyContent: "flex-start", marginTop: 0, marginBottom: 12 }}>
            <button type="button" className="btn" onClick={() => set({ ...s, mother: { ...s.mother, parentalWeeks: maxOne }, father: { ...s.father, parentalWeeks: 0 } })}>
              Całość matka
            </button>
            <button type="button" className="btn" onClick={() => set({ ...s, mother: { ...s.mother, parentalWeeks: maxOne }, father: { ...s.father, parentalWeeks: excl } })}>
              Matka + 9 tyg. ojca
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const half = Math.floor(shared / 2);
                set({ ...s, mother: { ...s.mother, parentalWeeks: excl + half }, father: { ...s.father, parentalWeeks: excl + (shared - half) } });
              }}
            >
              Po równo
            </button>
          </div>
        )}
        {s.mother.hasRight && s.father.hasRight && s.mother.parentalWeeks > 0 && s.father.parentalWeeks > 0 && (
          <Check
            label="Korzystamy z urlopu rodzicielskiego jednocześnie"
            hint="Domyślnie przyjmujemy, że rodzice biorą urlop po sobie."
            checked={s.simultaneousParental}
            onChange={(simultaneousParental) => set({ ...s, simultaneousParental })}
          />
        )}

        {s.mother.hasRight && (
          <div className="card soft" style={{ marginTop: 8 }}>
            <Check
              label={`Matka składa wniosek o zasiłek za cały okres urlopu (${catalog ? pct(catalog.ratesBps.combinedRequest) : "81,5%"})`}
              hint="Wniosek trzeba złożyć najpóźniej 21 dni po porodzie. Inaczej: 100% za macierzyński i 70% za rodzicielski."
              checked={s.combinedRateRequest}
              onChange={(combinedRateRequest) => set({ ...s, combinedRateRequest })}
            />
            {s.combinedRateRequest && (
              <TextInput label="Ile dni po porodzie wniosek zostanie złożony?" inputMode="numeric" value={s.combinedDaysAfter} onChange={(combinedDaysAfter) => set({ ...s, combinedDaysAfter })} suffix="dni" />
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Praca w trakcie urlopu rodzicielskiego</h2>
        <p className="muted">Pracownik może łączyć urlop rodzicielski z pracą do połowy etatu. Urlop wydłuża się proporcjonalnie, a zasiłek jest niższy.</p>
        {s.gaps.includes("whoWorks") && (
          <Choices
            label="Kto łączy urlop rodzicielski z pracą?"
            missing
            value=""
            onChange={(who) => {
              if (who === "mother") set(dropGaps(withParent(s, "mother", { works: true, workFraction: "1/2" }), ["whoWorks"]));
              else if (who === "father") set(dropGaps(withParent({ ...s, father: { ...s.father, parentalWeeks: Math.max(s.father.parentalWeeks, 9) } }, "father", { works: true, workFraction: "1/2" }), ["whoWorks"]));
              else set(dropGaps(s, ["whoWorks"]));
            }}
            options={[
              { value: "mother", label: "Matka" },
              { value: "father", label: "Ojciec" },
              { value: "none", label: "Nikt" },
            ]}
          />
        )}
        <div className="split">
          {(["mother", "father"] as const).map((who) => {
            const p = s[who];
            if (!p.hasRight || p.parentalWeeks === 0) return null;
            const disabled = p.title !== "employee";
            return (
              <div key={who}>
                <Check
                  label={<><span className={`dot ${who}`} />{who === "mother" ? "Matka" : "Ojciec"} pracuje w trakcie urlopu</>}
                  hint={disabled ? "Dotyczy tylko umowy o pracę." : undefined}
                  checked={p.works && !disabled}
                  onChange={(works) => !disabled && set(withParent(s, who, { works }))}
                />
                {p.works && !disabled && (
                  <Choices
                    value={p.workFraction}
                    onChange={(workFraction) => set(withParent(s, who, { workFraction }))}
                    options={[
                      { value: "1/2", label: "1/2 etatu" },
                      { value: "1/3", label: "1/3" },
                      { value: "1/4", label: "1/4" },
                      { value: "1/5", label: "1/5" },
                    ]}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {s.father.hasRight && s.situation !== "foster" && (
        <div className="card">
          <h2>Urlop ojcowski</h2>
          <Range
            label="Tygodnie urlopu ojcowskiego"
            hint={catalog ? `Do ${catalog.paternity.weeks} tyg., w najwyżej ${catalog.paternity.maxParts} częściach, do ${catalog.paternity.untilMonths}. miesiąca życia dziecka. Zasiłek ${pct(catalog.ratesBps.paternity)}.` : undefined}
            value={s.father.paternityWeeks}
            min={0}
            max={catalog?.paternity.weeks ?? 2}
            onChange={(paternityWeeks) => set(withParent(s, "father", { paternityWeeks }))}
          />
        </div>
      )}
    </>
  );
}

