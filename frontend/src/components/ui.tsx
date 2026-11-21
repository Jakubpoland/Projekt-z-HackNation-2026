"use client";

import { useId, type ReactNode } from "react";

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
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
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "date" | "number";
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  suffix?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input id={id} type={type} inputMode={inputMode} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="muted">{suffix}</span>}
      </div>
    </Field>
  );
}

export function Check({ label, hint, checked, onChange }: { label: ReactNode; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
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
      </span>
    </label>
  );
}

export function Choices<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label?: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; hint?: ReactNode; disabled?: boolean }[];
}) {
  return (
    <div className="field" role="group">
      {label && <span className="label">{label}</span>}
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
