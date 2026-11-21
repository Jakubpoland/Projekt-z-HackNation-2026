"use client";

import { useState } from "react";
import type { SimulationResult } from "@/lib/api";
import { addDays, fmtDate, parseDate } from "@/lib/dates";
import { PERSON, segmentLabel } from "@/lib/format";
import type { GuideState } from "@/lib/state";
import { schedule } from "./Result";
import { Sim, TextInput } from "./ui";

const LINKS = [
  { href: "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski", label: "ZUS — zasiłek macierzyński" },
  { href: "https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy", label: "ZUS — zasiłek chorobowy" },
  { href: "https://www.gov.pl/web/rodzina/urlop-rodzicielski", label: "gov.pl/rodzina — urlop rodzicielski" },
  { href: "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo", label: "Państwowa Inspekcja Pracy — rodzicielstwo" },
];

// Lista orientacyjna — do weryfikacji przed wdrożeniem.
const HELP = [
  {
    when: "Poronienie, urodzenie martwe, zgon dziecka",
    items: [
      "Psycholog szpitalny — prawo do opieki psychologicznej po stracie dziecka na oddziale.",
      "Rzecznik Praw Pacjenta — infolinia 800 190 590, gdy prawa pacjentki nie są przestrzegane.",
      "Fundacja Rodzić po Ludzku — informacje i wsparcie po stracie dziecka.",
      "Urząd stanu cywilnego — zgłoszenie urodzenia martwego i akt urodzenia (potrzebny do zasiłku i pogrzebowego).",
    ],
  },
  {
    when: "Wcześniak",
    items: [
      "Oddział neonatologiczny — zaświadczenie o pobycie dziecka do uzupełniającego urlopu macierzyńskiego.",
      "Fundacja Koalicja dla wcześniaka — poradniki dla rodziców wcześniaków.",
    ],
  },
  {
    when: "Ciężka choroba, „Za życiem”",
    items: [
      "Program „Za życiem” (gov.pl/rodzina) — asystent rodziny, jednorazowe świadczenie 4000 zł, hospicjum perinatalne.",
      "Ośrodek pomocy społecznej w gminie — koordynacja wsparcia i asystent rodziny.",
      "Lekarz prowadzący — zaświadczenie o ciężkim i nieodwracalnym upośledzeniu albo nieuleczalnej chorobie.",
    ],
  },
];

export function DocumentsView({ s, result }: { s: GuideState; result: SimulationResult | null }) {
  const docs = result?.documents ?? [];
  return (
    <>
      <div className="card">
        <h2>Dokumenty</h2>
        {docs.length === 0 && <p className="muted">Brak dokumentów dla tego wariantu.</p>}
        {groupBy(docs, (d) => d.person).map(([person, list]) => (
          <div key={person} style={{ marginBottom: 12 }}>
            <h3>
              {person !== "child" && <span className={`dot ${person}`} />}
              {person === "child" ? "Dokumenty dotyczące dziecka" : PERSON[person]}
            </h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {list.map((d, i) => (
                <li key={d.code + i}>
                  <strong>{d.code}</strong> — {d.message}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="hint">Formularze ZUR, ZAO i Z-3b zostały zlikwidowane — wniosek o zasiłek to ZAM.</p>
      </div>

      <Deadlines s={s} />

      <LeaveRequests s={s} result={result} />

      <SendSimulation result={result} />

      <div className="card">
        <h2>Gdzie szukać informacji i pomocy</h2>
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        {HELP.map((h) => (
          <details key={h.when} open={(h.when.startsWith("Poronienie") && s.loss !== "none") || (h.when === "Wcześniak" && s.premature) || (h.when.startsWith("Ciężka") && s.zaZyciem)}>
            <summary>{h.when}</summary>
            <ul>
              {h.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </>
  );
}

function groupBy<T>(xs: T[], key: (x: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) || []), x]);
  return [...m.entries()];
}

function Deadlines({ s }: { s: GuideState }) {
  const event = parseDate(s.eventDate);
  const rows: [string, string][] = [];
  if (s.combinedRateRequest) rows.push(["Wniosek o zasiłek za cały okres urlopu (stawka 81,5%)", event ? `do ${fmtDate(addDays(event, 21))}` : "do 21 dni po porodzie"]);
  rows.push(["Wniosek o urlop rodzicielski (albo jego część) do pracodawcy", "co najmniej 21 dni przed rozpoczęciem"]);
  rows.push(["Wniosek o łączenie urlopu rodzicielskiego z pracą", "co najmniej 21 dni przed rozpoczęciem pracy"]);
  if (s.father.hasRight && s.situation !== "foster") rows.push(["Wniosek o urlop ojcowski", "co najmniej 7 dni przed rozpoczęciem; urlop do 12. miesiąca życia dziecka"]);
  if (s.premature) rows.push(["Wniosek o uzupełniający urlop macierzyński", "co najmniej 21 dni przed końcem urlopu macierzyńskiego"]);
  if (s.situation === "birth") rows.push(["Wcześniejszy urlop macierzyński (przed porodem)", "wniosek do pracodawcy przed planowanym rozpoczęciem"]);
  return (
    <div className="card">
      <h2>Terminy</h2>
      {rows.map(([a, b]) => (
        <div className="row" key={a}>
          <span>{a}</span>
          <strong style={{ textAlign: "right" }}>{b}</strong>
        </div>
      ))}
      <p className="hint" style={{ marginTop: 8 }}>
        Terminy wniosków urlopowych wynikają z Kodeksu pracy. Sprawdź je z pracodawcą lub w PIP przed złożeniem.
      </p>
    </div>
  );
}

function LeaveRequests({ s, result }: { s: GuideState; result: SimulationResult | null }) {
  const [names, setNames] = useState({ mother: "", father: "", child: "", employerMother: "", employerFather: "" });
  const segs = result ? schedule(s, result.segments) : [];
  const requests = (["mother", "father"] as const)
    .map((who) => ({ who, list: segs.filter((x) => x.person === who && !(who === "mother" && x.benefit === "maternity_leave")) }))
    .filter((r) => r.list.length > 0 && s[r.who].title === "employee");
  if (!requests.length) return null;
  return (
    <div className="card">
      <h2>Projekt wniosku urlopowego</h2>
      <p className="muted">
        Przygotowaliśmy treść wniosku do pracodawcy na podstawie wybranego podziału. To projekt — nie oficjalny formularz. Wydrukuj albo skopiuj i
        uzupełnij.
      </p>
      <div className="grid-3 no-print">
        <TextInput label="Imię i nazwisko matki" value={names.mother} onChange={(mother) => setNames({ ...names, mother })} />
        <TextInput label="Imię i nazwisko ojca" value={names.father} onChange={(father) => setNames({ ...names, father })} />
        <TextInput label="Imię i nazwisko dziecka" value={names.child} onChange={(child) => setNames({ ...names, child })} />
      </div>
      {requests.map(({ who, list }) => {
        const me = who === "mother" ? names.mother : names.father;
        const other = who === "mother" ? names.father : names.mother;
        return (
          <div key={who} className="print-doc" style={{ marginTop: 12 }}>
            <p style={{ textAlign: "right" }}>…………………, dnia {fmtDate(new Date())}</p>
            <p>
              {me || "………………………………"}
              <br />
              <small>(imię i nazwisko pracownika)</small>
            </p>
            <p style={{ textAlign: "right" }}>
              Pracodawca
              <br />
              ………………………………
            </p>
            <h3>Wniosek o udzielenie urlopu związanego z rodzicielstwem</h3>
            <p>
              Na podstawie przepisów Kodeksu pracy wnoszę o udzielenie mi urlopu w związku z{" "}
              {s.situation === "birth" ? "urodzeniem" : s.situation === "adoption" ? "przyjęciem na wychowanie i wystąpieniem o przysposobienie" : "przyjęciem na wychowanie w ramach rodziny zastępczej"}{" "}
              dziecka {names.child || "………………………"}
              {s.situation === "birth" && s.eventDate ? `, urodzonego dnia ${fmtDate(parseDate(s.eventDate)!)}` : ""}
              {s.childCount > 1 ? ` (liczba dzieci: ${s.childCount})` : ""}:
            </p>
            <ul>
              {list.map((x) => (
                <li key={x.id}>
                  {segmentLabel(x.id, x.benefit).toLowerCase()} — {x.poolDays} dni
                  {x.start && x.end ? `, w okresie od ${fmtDate(x.start)} do ${fmtDate(x.end)}` : ", w okresie od …………… do ……………"}
                  {x.workNumerator > 0 && x.workDenominator > 1 ? `, łącząc urlop z pracą w wymiarze ${x.workNumerator}/${x.workDenominator} etatu` : ""}
                </li>
              ))}
            </ul>
            {list.some((x) => x.benefit === "parental_leave") && (
              <p>
                Do wniosku dołączam oświadczenie drugiego rodzica dziecka ({other || "………………………"}) o niekorzystaniu z urlopu rodzicielskiego w tym okresie
                {s.simultaneousParental ? " albo o korzystaniu z niego jednocześnie" : ""} oraz o częściach urlopu już wykorzystanych.
              </p>
            )}
            <p style={{ textAlign: "right", marginTop: 32 }}>
              ………………………………
              <br />
              <small>(podpis pracownika)</small>
            </p>
          </div>
        );
      })}
      <div className="btn-row no-print" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="btn" onClick={() => window.print()}>
          Drukuj / zapisz PDF
        </button>
      </div>
    </div>
  );
}

function SendSimulation({ result }: { result: SimulationResult | null }) {
  const [sent, setSent] = useState<string | null>(null);
  if (!result || result.segments.length === 0) return null;
  return (
    <div className="card">
      <h2>
        Złóż wniosek ZAM przez PUE/eZUS <Sim />
      </h2>
      <p className="muted">
        W docelowej wersji przewodnik przekaże dane do wniosku w PUE/eZUS i dołączy odpis aktu urodzenia pobrany z rejestru. Teraz to tylko symulacja —
        nic nie jest wysyłane.
      </p>
      {sent ? (
        <div className="alert sim">
          Wniosek przyjęty (symulacja). Numer: <strong>{sent}</strong>. Odpis aktu urodzenia pobrany z rejestru stanu cywilnego (symulacja).
        </div>
      ) : (
        <button type="button" className="btn sim" onClick={() => setSent(`SIM-${Date.now().toString(36).toUpperCase()}`)}>
          Wyślij wniosek (symulacja)
        </button>
      )}
    </div>
  );
}
