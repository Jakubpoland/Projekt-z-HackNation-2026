"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, type BasisResult, type Catalog, type SicknessResult, type SimulationResult } from "@/lib/api";
import { toGrosze, weeksDays, zl } from "@/lib/format";
import { basisRequest, initialState, sicknessRequest, simulationRequest, withParent, type GuideState } from "@/lib/state";
import type { Situation } from "@/lib/api";
import { DocumentsView } from "./Documents";
import { ResultView } from "./Result";
import { StepChild, StepInsurance, StepPregnancy, StepSplit, StepStart } from "./Steps";

type StepId = "start" | "insurance" | "pregnancy" | "child" | "split" | "result" | "docs";

const ALL_STEPS: { id: StepId; label: string }[] = [
  { id: "start", label: "Start" },
  { id: "insurance", label: "Ubezpieczenie i dochód" },
  { id: "pregnancy", label: "Ciąża" },
  { id: "child", label: "Dziecko" },
  { id: "split", label: "Podział urlopu" },
  { id: "result", label: "Wynik" },
  { id: "docs", label: "Dokumenty i pomoc" },
];

/** Przy adopcji nie ma kroku o ciąży. */
export function guideSteps(situation: Situation) {
  return ALL_STEPS.filter((step) => step.id !== "pregnancy" || situation !== "adoption");
}

const GAPS_ON_STEP: Record<StepId, string[]> = {
  start: ["situation", "insuredOnEvent", "eventDate"],
  insurance: ["motherTitle", "motherSalary", "payerCount", "fatherTitle", "fatherSalary"],
  pregnancy: ["pregnancyDays"],
  child: ["childCount", "zaZyciem", "pregnancyWeek", "birthWeight", "hospitalDays", "childBirthDate"],
  split: ["whoWorks"],
  result: [],
  docs: [],
};

/** Odracza wywołanie API, żeby nie wysyłać żądania przy każdym znaku. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Guide() {
  const [s, setS] = useState<GuideState>(initialState);
  const [stepId, setStepId] = useState<StepId>("start");
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<ApiError | null>(null);
  const [basis, setBasis] = useState<Record<string, BasisResult | ApiError | undefined>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [simError, setSimError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(false);
  const [sickness, setSickness] = useState<SicknessResult | ApiError | null>(null);
  const lastEntitled = useRef<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Katalog: wymiary i stawki do formularza.
  useEffect(() => {
    api.catalog().then(setCatalog, (e: ApiError) => setCatalogError(e));
  }, []);

  // Podstawa wymiaru — liczy backend.
  const basisKeys = useMemo(
    () =>
      (["mother", "father"] as const).map((who) => {
        const p = s[who];
        return { who, req: p.hasRight ? basisRequest(p) : null, direct: p.basisMode === "direct" ? toGrosze(p.direct) : null };
      }),
    [s],
  );
  const basisDebounced = useDebounced(JSON.stringify(basisKeys), 350);
  useEffect(() => {
    const items: typeof basisKeys = JSON.parse(basisDebounced);
    let cancelled = false;
    for (const { who, req, direct } of items) {
      if (direct != null) {
        setBasis((b) => ({ ...b, [who]: undefined }));
        setS((prev) => (prev[who].basisGrosze === direct ? prev : withParent(prev, who, { basisGrosze: direct })));
        continue;
      }
      if (!req) {
        setBasis((b) => ({ ...b, [who]: undefined }));
        setS((prev) => (prev[who].basisGrosze === 0 ? prev : withParent(prev, who, { basisGrosze: 0 })));
        continue;
      }
      api.basis(req).then(
        (r) => {
          if (cancelled) return;
          setBasis((b) => ({ ...b, [who]: r }));
          setS((prev) => (prev[who].basisGrosze === r.basis.grosze ? prev : withParent(prev, who, { basisGrosze: r.basis.grosze })));
        },
        (e: ApiError) => !cancelled && setBasis((b) => ({ ...b, [who]: e })),
      );
    }
    return () => {
      cancelled = true;
    };
  }, [basisDebounced]);

  // Symulacja zasiłku macierzyńskiego.
  const simReq = useDebounced(JSON.stringify(simulationRequest(s, lastEntitled.current)), 300);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .simulate(JSON.parse(simReq))
      .then(
        (r) => {
          if (cancelled) return;
          setResult(r);
          setSimError(null);
          if (lastEntitled.current !== r.entitlement.maternityDays) {
            lastEntitled.current = r.entitlement.maternityDays;
            // wymusza ponowne zbudowanie żądania z nowym wymiarem (ważne przy przejęciu urlopu)
            setS((prev) => ({ ...prev }));
          }
        },
        (e: ApiError) => {
          if (cancelled) return;
          setSimError(e);
        },
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [simReq]);

  // Zwolnienie w ciąży.
  const sickReq = useDebounced(s.pregnancy.enabled && s.mother.basisGrosze ? JSON.stringify(sicknessRequest(s)) : "", 300);
  useEffect(() => {
    if (!sickReq) {
      setSickness(null);
      return;
    }
    let cancelled = false;
    api.sickness(JSON.parse(sickReq)).then(
      (r) => !cancelled && setSickness(r),
      (e: ApiError) => !cancelled && setSickness(e),
    );
    return () => {
      cancelled = true;
    };
  }, [sickReq]);

  const steps = useMemo(() => guideSteps(s.situation), [s.situation]);
  const step = Math.max(0, steps.findIndex((item) => item.id === stepId));
  useEffect(() => {
    if (!steps.some((item) => item.id === stepId)) setStepId("child");
  }, [steps, stepId]);

  const go = (i: number) => {
    const next = steps[Math.max(0, Math.min(steps.length - 1, i))];
    if (!next) return;
    setStepId(next.id);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const props = { s, set: setS, catalog, result };
  const current = steps[step];
  const blocked = s.gaps.filter((key) => current && GAPS_ON_STEP[current.id].includes(key));

  return (
    <div ref={topRef}>
      {catalogError && (
        <div className="alert error">
          {catalogError.message}
        </div>
      )}
      <div className="layout">
        <nav className="stepper card" aria-label="Kroki przewodnika">
          <ol>
            {steps.map((item, i) => (
              <li key={item.id}>
                <button type="button" aria-current={i === step ? "step" : undefined} onClick={() => go(i)}>
                  <span className="num">{i + 1}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section aria-live="polite">
          {current?.id === "start" && <StepStart {...props} />}
          {current?.id === "insurance" && <StepInsurance {...props} basis={basis} />}
          {current?.id === "pregnancy" && <StepPregnancy {...props} sickness={sickness} />}
          {current?.id === "child" && <StepChild {...props} />}
          {current?.id === "split" && (
            <>
              {simError && <div className="alert error">{simError.message}</div>}
              <StepSplit {...props} />
            </>
          )}
          {current?.id === "result" && <ResultView s={s} result={simError ? null : result} error={simError} loading={loading} />}
          {current?.id === "docs" && <DocumentsView s={s} result={simError ? null : result} />}

          {blocked.length > 0 && (
            <div className="alert error">Zanim przejdziesz dalej, uzupełnij pola oznaczone na czerwono.</div>
          )}
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => go(step - 1)} disabled={step === 0}>
              Wstecz
            </button>
            {step < steps.length - 1 ? (
              <button type="button" className="btn primary" onClick={() => go(step + 1)} disabled={blocked.length > 0}>
                Dalej: {steps[step + 1].label}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => { setS(initialState()); setStepId("start"); }}>
                Zacznij od nowa
              </button>
            )}
          </div>
        </section>

        <aside className="summary card" aria-label="Podsumowanie na żywo">
          <h3>Podsumowanie</h3>
          {simError ? (
            <div className="alert error">{simError.message}</div>
          ) : result ? (
            <>
              <div className="muted">Razem (brutto)</div>
              <div className="big">{zl(result.grandTotal)}</div>
              <div className="row">
                <span>
                  <span className="dot mother" />
                  Matka
                </span>
                <span>{zl(result.motherTotal)}</span>
              </div>
              <div className="row">
                <span>
                  <span className="dot father" />
                  Ojciec
                </span>
                <span>{zl(result.fatherTotal)}</span>
              </div>
              <div className="row">
                <span>Macierzyński</span>
                <span>{weeksDays(result.entitlement.maternityDays)}</span>
              </div>
              <div className="row">
                <span>Pula rodzicielska</span>
                <span>{result.entitlement.parentalPoolWeeks} tyg.</span>
              </div>
              {result.warnings.length > 0 && (
                <button type="button" className="btn" style={{ marginTop: 10, width: "100%" }} onClick={() => setStepId("result")}>
                  Ostrzeżenia: {result.warnings.length}
                </button>
              )}
            </>
          ) : (
            <p className="muted">{loading ? "Liczę…" : "Brak wyniku."}</p>
          )}
          {catalog && <p className="hint" style={{ marginTop: 10 }}>Parametry: {catalog.parametersVersion}</p>}
        </aside>
      </div>
    </div>
  );
}
