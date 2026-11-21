"use client";

import { useId, type ReactNode } from "react";

export function Field({ label, hint, children, htmlFor, missing }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string; missing?: boolean }) {
  return (
    <div className={missing ? "field need-manual" : "field"}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
      {missing && <span className="hint need-manual-text">Nie odczytano ze skanu. Wpisz ręcznie.</span>}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
  suffix,
  missing,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date" | "number";
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  suffix?: string;
  missing?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id} missing={missing}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input id={id} type={type} inputMode={inputMode} value={value} data-empty={value.trim() === "" ? "" : undefined} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="muted">{suffix}</span>}
      </div>
    </Field>
  );
}

export function Check({
  label,
  hint,
  checked,
  onChange,
  missing,
  onDismiss,
}: {
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  missing?: boolean;
  onDismiss?: () => void;
}) {
  return (
    <div className={missing ? "need-manual" : undefined}>
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>
          {label}
          {hint && (
            <>
              <br />
              <span className="hint">{hint}</span>
            </>
          )}
          {missing && (
            <>
              <br />
              <span className="hint need-manual-text">Nie odczytano ze skanu. Zaznacz, jeśli dotyczy, albo potwierdź, że nie.</span>
            </>
          )}
        </span>
      </label>
      {missing && onDismiss && (
        <button type="button" className="btn" onClick={onDismiss}>
          Nie dotyczy
        </button>
      )}
    </div>
  );
}

export function Choices<T extends string | number>({
  label,
  value,
  onChange,
  options,
  missing,
}: {
  label?: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; hint?: ReactNode; disabled?: boolean }[];
  missing?: boolean;
}) {
  return (
    <div className={missing ? "field need-manual" : "field"} role="group">
      {label && <span className="label">{label}</span>}
      {missing && <span className="hint need-manual-text">Nie odczytano ze skanu. Wybierz właściwą odpowiedź.</span>}
      <div className="choices">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            className="choice"
            aria-pressed={o.value === value}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
          >
            {o.label}
            {o.hint && <small>{o.hint}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Range({
  label,
  hint,
  value,
  min,
  max,
  onChange,
  unit = "tyg.",
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  const id = useId();
  const safeMax = Math.max(min, max);
  return (
    <Field
      htmlFor={id}
      label={
        <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>{label}</span>
          <span>
            {value} {unit}
          </span>
        </span>
      }
      hint={hint}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input id={id} type="range" min={min} max={safeMax} value={Math.min(value, safeMax)} onChange={(e) => onChange(Number(e.target.value))} />
        <input
          aria-label="Wartość liczbowa"
          type="number"
          min={min}
          max={safeMax}
          value={value}
          style={{ width: 80 }}
          onChange={(e) => onChange(Math.max(min, Math.min(safeMax, Number(e.target.value) || 0)))}
        />
      </div>
    </Field>
  );
}

export function Sim({ children = "symulacja" }: { children?: ReactNode }) {
  return (
    <span className="badge" title="Ta funkcja jest symulacją. Nie łączy się z prawdziwym systemem.">
      {children}
    </span>
  );
}
