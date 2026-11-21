"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

type Params = Record<string, unknown>;

/**
 * Panel parametrów prawnych. Zmienia stawki i wymiary bez przebudowy kodu
 * (PUT /api/v1/admin/parameters). Backend trzyma je w pamięci do restartu.
 */
export default function AdminPage() {
  const [params, setParams] = useState<Params | null>(null);
  const [draft, setDraft] = useState<Params | null>(null);
  const [msg, setMsg] = useState<{ kind: "info" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState("");

  const load = () =>
    api.parameters().then(
      (p) => {
        setParams(p);
        setDraft(p);
      },
      (e: ApiError) => setMsg({ kind: "error", text: e.message }),
    );

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!draft) return;
    try {
      const saved = await api.putParameters(draft);
      setParams(saved);
      setDraft(saved);
      setMsg({ kind: "info", text: "Zapisano. Przewodnik od razu liczy na nowych parametrach." });
    } catch (e) {
      setMsg({ kind: "error", text: (e as ApiError).message });
    }
  };

  const keys = draft ? Object.keys(draft).filter((k) => k.toLowerCase().includes(filter.toLowerCase())) : [];
  const changed = JSON.stringify(params) !== JSON.stringify(draft);

  return (
    <div className="card">
      <h1>Parametry prawne</h1>
      <p className="muted">
        Stawki (w punktach bazowych: 10000 = 100%), wymiary w tygodniach i limity kwotowe w groszach. Zmiana działa od razu, bez wdrażania nowej wersji. W tej
        wersji backend trzyma parametry w pamięci — restart wraca do zestawu domyślnego.
      </p>
      {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
      {draft && (
        <>
          <div className="field">
            <label htmlFor="flt">Szukaj parametru</label>
            <input id="flt" type="text" value={filter} onChange={(e) => setFilter(e.target.value)} data-empty={filter === "" ? "" : undefined} placeholder="np. Rate, Weeks, Grosze" />
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Parametr</th>
                  <th>Wartość</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => {
                  const v = draft[k];
                  return (
                    <tr key={k}>
                      <td>
                        <code>{k}</code>
                      </td>
                      <td>
                        {typeof v === "number" ? (
                          <input type="number" value={v} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
                        ) : typeof v === "string" ? (
                          <input type="text" value={v} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                        ) : (
                          <JsonInput value={v} onChange={(nv) => setDraft({ ...draft, [k]: nv })} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="btn-row">
            <button type="button" className="btn" disabled={!changed} onClick={() => setDraft(params)}>
              Cofnij zmiany
            </button>
            <button type="button" className="btn primary" disabled={!changed} onClick={save}>
              Zapisz parametry
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function JsonInput({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(JSON.stringify(value));
  const [bad, setBad] = useState(false);
  return (
    <input
      type="text"
      value={text}
      aria-invalid={bad}
      style={bad ? { borderColor: "var(--error-border)" } : undefined}
      onChange={(e) => {
        setText(e.target.value);
        try {
          onChange(JSON.parse(e.target.value));
          setBad(false);
        } catch {
          setBad(true);
        }
      }}
    />
  );
}
