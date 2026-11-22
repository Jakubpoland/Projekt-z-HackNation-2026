"use client";

import { useState } from "react";
import { applyScan, gapLabel, type ScanHit } from "@/lib/scan";
import { readScanFiles } from "@/lib/read-scan";
import type { GuideState } from "@/lib/state";

export function ScanCard({ onApply }: { onApply: (state: GuideState) => void }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [read, setRead] = useState<ScanHit[] | null>(null);
  const [gaps, setGaps] = useState<string[] | null>(null);

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError("");
    setRead(null);
    setGaps(null);
    try {
      const text = await readScanFiles([...list], setStatus);
      const outcome = applyScan(text, [...list].map((f) => f.name).join(" "));
      setRead(outcome.read);
      setGaps(outcome.state.gaps);
      onApply(outcome.state);
      setStatus(outcome.state.gaps.length === 0 ? "Odczytano cały wniosek." : "Część pól jest pusta. Uzupełnij te oznaczone na czerwono.");
    } catch (e) {
      const names = [...list].map((f) => f.name).join(" ");
      const outcome = applyScan("", names);
      setRead(outcome.read);
      setGaps(outcome.state.gaps);
      onApply(outcome.state);
      setError(e instanceof Error ? e.message : "Nie udało się odczytać pliku.");
      setStatus("Z nazwy pliku wzięłam tylko to, co da się rozpoznać. Resztę wpisz ręcznie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" id="skan">
      <h2>Wczytaj skan wniosku</h2>
      <p className="muted">
        PDF albo zdjęcie. Przewodnik odczytuje pierwsze strony i uzupełnia formularz. Pole, którego nie widać na skanie, zostaje na czerwono i trzeba je wpisać ręcznie.
      </p>
      <label className="btn primary" style={{ display: "inline-block" }}>
        {busy ? "Czytam…" : "Wybierz skan"}
        <input
          className="sr-only"
          type="file"
          accept="application/pdf,image/*"
          multiple
          disabled={busy}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {status && <p className="hint" style={{ marginTop: 10 }}>{status}</p>}
      {error && <div className="alert error">{error}</div>}
      {read && read.length > 0 && (
        <ul className="scan-list">
          {read.map((hit) => (
            <li key={hit.key}>
              <span className="badge ok">odczytano</span> {hit.label}: <strong>{hit.value}</strong>
            </li>
          ))}
        </ul>
      )}
      {gaps && gaps.length > 0 && (
        <ul className="scan-list">
          {gaps.map((key) => (
            <li key={key} className="need-manual-text">
              <span className="badge miss">do wpisania</span> {gapLabel(key)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
