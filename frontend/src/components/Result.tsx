"use client";

import type { Segment, SimulationResult } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { addDays, fmtDate, parseDate } from "@/lib/dates";
import { PAYER, PERSON, pct, segmentLabel, weeksDays, zl } from "@/lib/format";
import type { GuideState } from "@/lib/state";

/** Kolejność odcinków w przykładowym harmonogramie (nie wpływa na kwoty). */
const ORDER = [
  "mother-maternity",
  "father-maternity",
  "mother-supplementary",
  "father-supplementary",
  "mother-parental-exclusive",
  "mother-parental-shared",
  "father-parental-exclusive",
  "father-parental-shared",
];

export interface ScheduledSegment extends Segment {
  start?: Date;
  end?: Date;
}

/**
 * Przykładowy harmonogram: odcinki jeden po drugim od daty zdarzenia
 * (minus tygodnie przed porodem). Urlop ojcowski osobno — może być w dowolnym momencie.
 * Przy `simultaneousParental` urlop rodzicielski ojca startuje razem z matki.
 */
export function schedule(s: GuideState, segs: Segment[]): ScheduledSegment[] {
  const event = parseDate(s.eventDate);
  const sorted = [...segs].sort((a, b) => idx(a.id) - idx(b.id));
  if (!event) return sorted;
  let cursor = addDays(event, -7 * s.preBirthWeeks);
  let motherParentalStart: Date | null = null;
  const out: ScheduledSegment[] = [];
  for (const seg of sorted) {
    if (seg.benefit === "paternity_leave") {
      out.push({ ...seg, start: event, end: addDays(event, seg.calendarDays - 1) });
      continue;
    }
    let start = cursor;
    if (seg.benefit === "parental_leave" && seg.person === "mother" && !motherParentalStart) motherParentalStart = cursor;
    if (s.simultaneousParental && seg.id === "father-parental-exclusive" && motherParentalStart) start = motherParentalStart;
    const end = addDays(start, seg.calendarDays - 1);
    out.push({ ...seg, start, end });
    const next = addDays(end, 1);
    if (next > cursor) cursor = next;
  }
  return out;
}

function idx(id: string) {
  const i = ORDER.indexOf(id);
  return i === -1 ? 99 : i;
}

export function ResultView({ s, result, error, loading }: { s: GuideState; result: SimulationResult | null; error: ApiError | null; loading: boolean }) {
  if (error) return <div className="alert error"><strong>Nie da się policzyć tego wariantu.</strong> {error.message}</div>;
  if (!result) return <div className="card muted">{loading ? "Liczę…" : "Uzupełnij dane w poprzednich krokach."}</div>;

  const segs = schedule(s, result.segments.filter((x) => x.benefit !== "paternity_leave"));
  const paternity = schedule(s, result.segments.filter((x) => x.benefit === "paternity_leave"));
  const totalCal = segs.reduce((a, x) => a + x.calendarDays, 0) || 1;
  const all = [...segs, ...paternity];
  const anyZeroBasis = all.some((x) => x.basis.grosze === 0);

  return (
    <>
      <div className="card">
        <h2>Wynik</h2>
        {result.segments.length === 0 ? (
          <div className="alert warn">W tym wariancie nie przysługuje zasiłek macierzyński.</div>
        ) : (
          <>
            <div className="split">
              <div>
                <div className="muted">Razem dla rodziny (brutto)</div>
                <div className="big">{zl(result.grandTotal)}</div>
              </div>
              <div>
                <div className="row">
                  <span>
                    <span className="dot mother" />
                    Matka
                  </span>
                  <strong>{zl(result.motherTotal)}</strong>
                </div>
                <div className="row">
                  <span>
                    <span className="dot father" />
                    Ojciec
                  </span>
                  <strong>{zl(result.fatherTotal)}</strong>
                </div>
              </div>
            </div>
            {anyZeroBasis && <div className="alert warn" style={{ marginTop: 12 }}>Przy części odcinków podstawa wynosi 0 zł — uzupełnij wynagrodzenie w kroku „Ubezpieczenie i dochód”.</div>}
            {result.combinedRateApplied && <div className="alert info" style={{ marginTop: 12 }}>Zastosowano stawkę z wniosku złożonego w 21 dni po porodzie.</div>}

            <h3 style={{ marginTop: 16 }}>Oś czasu</h3>
            <div className="timeline" role="img" aria-label="Kolejne odcinki urlopu">
              {segs.map((x, i) => (
                <div
                  key={x.id}
                  className={`${x.person} ${i % 2 ? "alt" : ""}`}
                  style={{ flexBasis: `${(x.calendarDays / totalCal) * 100}%` }}
                  title={`${PERSON[x.person]}: ${segmentLabel(x.id, x.benefit)}, ${weeksDays(x.calendarDays)}`}
                >
                  {x.calendarDays / totalCal > 0.08 ? weeksDays(x.calendarDays) : ""}
                </div>
              ))}
            </div>
            <div className="legend">
              <span>
                <span className="dot mother" />
                matka
              </span>
              <span>
                <span className="dot father" />
                ojciec
              </span>
              <span>Łącznie {weeksDays(totalCal)} kalendarzowo{s.simultaneousParental ? " (część równolegle)" : ""}</span>
            </div>
          </>
        )}
      </div>

      {all.length > 0 && (
        <div className="card">
          <h3>Odcinki i kwoty</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kto i co</th>
                  {s.eventDate && <th>Okres (przykładowy)</th>}
                  <th className="num">Dni</th>
                  <th className="num">Stawka · dziennie</th>
                  <th className="num">Razem</th>
                  <th>Wypłaca</th>
                </tr>
              </thead>
              <tbody>
                {all.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <span className={`dot ${x.person}`} />
                      <strong>{PERSON[x.person]}</strong>
                      <br />
                      {segmentLabel(x.id, x.benefit)}
                      {x.workDenominator > 1 && x.workNumerator > 0 && (
                        <div className="hint">
                          praca {x.workNumerator}/{x.workDenominator} etatu, wydłużenie o {x.extensionDays} dni
                        </div>
                      )}
                    </td>
                    {s.eventDate && <td>{x.start && x.end ? `${fmtDate(x.start)} – ${fmtDate(x.end)}` : "—"}</td>}
                    <td className="num">
                      {x.calendarDays}
                      {x.calendarDays !== x.poolDays && <div className="hint">z puli {x.poolDays}</div>}
                    </td>
                    <td className="num">
                      {pct(x.rateBps)} · {zl(x.daily)}
                      <div className="hint">{zl(x.monthly)} / mies.</div>
                    </td>
                    <td className="num">
                      <strong>{zl(x.total)}</strong>
                    </td>
                    <td>{PAYER[x.payer]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>
            Kwoty brutto, przed zaliczką na podatek dochodowy. Wersja parametrów: {result.parametersVersion}. Harmonogram dat jest przykładowy — urlopy
            rodzicielskie można dzielić na części i brać w innej kolejności.
          </p>
        </div>
      )}

      <EntitlementCard r={result} />

      {result.warnings.length > 0 && (
        <div className="card">
          <h3>Na co uważać</h3>
          {result.warnings.map((w) => (
            <div key={w.code} className="alert warn">
              {w.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function EntitlementCard({ r }: { r: SimulationResult }) {
  const e = r.entitlement;
  return (
    <details className="card">
      <summary>Co przysługuje rodzinie (wymiar)</summary>
      <div style={{ marginTop: 10 }}>
        <div className="row"><span>Urlop macierzyński</span><strong>{weeksDays(e.maternityDays)}</strong></div>
        <div className="row"><span>Pula urlopu rodzicielskiego</span><strong>{e.parentalPoolWeeks} tyg.</strong></div>
        <div className="row"><span>Niezbywalne dla każdego rodzica</span><span>{e.exclusiveWeeksPerParent} tyg.</span></div>
        <div className="row"><span>Część wspólna</span><span>{e.sharedWeeks} tyg.</span></div>
        <div className="row"><span>Maks. dla jednego rodzica</span><span>{e.maxWeeksForOneParent} tyg.</span></div>
        <div className="row"><span>Limit kalendarzowy przy pracy na część etatu</span><span>{e.parentalCalendarCapWeeks} tyg.</span></div>
        {e.supplementaryWeeks > 0 && <div className="row"><span>Uzupełniający urlop macierzyński</span><span>{e.supplementaryWeeks} tyg.</span></div>}
        <div className="row"><span>Urlop ojcowski</span><span>{e.paternityWeeks} tyg.</span></div>
      </div>
    </details>
  );
}
