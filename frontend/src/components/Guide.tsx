"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError, type BasisResult, type Catalog, type SicknessResult, type SimulationResult } from "@/lib/api";
import { toGrosze, weeksDays, zl } from "@/lib/format";
import { basisRequest, initialState, sicknessRequest, simulationRequest, withParent, type GuideState } from "@/lib/state";
import { DocumentsView } from "./Documents";
import { ResultView } from "./Result";
import { StepChild, StepInsurance, StepPregnancy, StepSplit, StepStart } from "./Steps";

const STEPS = ["Start", "Ubezpieczenie i dochód", "Ciąża", "Dziecko", "Podział urlopu", "Wynik", "Dokumenty i pomoc"] as const;

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
  const [step, setStep] = useState(0);
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

  const go = (i: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, i)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const props = { s, set: setS, catalog, result };

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
            {STEPS.map((label, i) => (
              <li key={label}>
                <button type="button" aria-current={i === step ? "step" : undefined} onClick={() => go(i)}>
                  <span className="num">{i + 1}</span>
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section aria-live="polite">
          {step === 0 && <StepStart {...props} />}
          {step === 1 && <StepInsurance {...props} basis={basis} />}
          {step === 2 && <StepPregnancy {...props} sickness={sickness} />}
          {step === 3 && <StepChild {...props} />}
          {step === 4 && (
            <>
              {simError && <div className="alert error">{simError.message}</div>}
              <StepSplit {...props} />
            </>
          )}
          {step === 5 && <ResultView s={s} result={simError ? null : result} error={simError} loading={loading} />}
          {step === 6 && <DocumentsView s={s} result={simError ? null : result} />}

          <div className="btn-row">
            <button type="button" className="btn" onClick={() => go(step - 1)} disabled={step === 0}>
              Wstecz
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn primary" onClick={() => go(step + 1)}>
                Dalej: {STEPS[step + 1]}
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => { setS(initialState()); go(0); }}>
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
                <button type="button" className="btn" style={{ marginTop: 10, width: "100%" }} onClick={() => go(5)}>
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
