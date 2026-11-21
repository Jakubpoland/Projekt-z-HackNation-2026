import type { Amount } from "./api";

const plnFmt = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Formatuje kwotę z API (pole `zloty`, np. "38033.80") jako "38 033,80 zł". */
export function zl(a: Amount | undefined | null): string {
  if (!a) return "—";
  return `${plnFmt.format(Number(a.zloty))} zł`;
}

/** Zamienia wpis użytkownika "8 000,50" na grosze. Zwraca 0 przy pustym/niepoprawnym polu. */
export function toGrosze(input: string): number {
  const clean = input.replace(/\s/g, "").replace(",", ".");
  if (!clean) return 0;
  const v = Number(clean);
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.round(v * 100);
}

export function pct(bps: number): string {
  return `${(bps / 100).toLocaleString("pl-PL", { maximumFractionDigits: 2 })}%`;
}

export function weeksDays(days: number): string {
  const w = Math.floor(days / 7);
  const d = days % 7;
  if (d === 0) return `${w} tyg.`;
  if (w === 0) return `${d} dni`;
  return `${w} tyg. ${d} dni`;
}

export const PERSON: Record<string, string> = {
  mother: "Matka",
  father: "Ojciec",
  child: "Dziecko",
};

export const BENEFIT: Record<string, string> = {
  maternity_leave: "Urlop macierzyński",
  parental_leave: "Urlop rodzicielski",
  paternity_leave: "Urlop ojcowski",
  supplementary_maternity_leave: "Uzupełniający urlop macierzyński",
};

export const PAYER: Record<string, string> = {
  platnik: "Pracodawca (płatnik)",
  zus: "ZUS",
  unknown: "Płatnik albo ZUS",
};

export const TITLE: Record<string, string> = {
  employee: "Umowa o pracę",
  mandate: "Umowa zlecenia",
  business: "Działalność gospodarcza",
  other: "Inny tytuł",
};

/** Etykieta segmentu na podstawie id z backendu. */
export function segmentLabel(id: string, benefit: string): string {
  const base = BENEFIT[benefit] || benefit;
  if (id.endsWith("-exclusive")) return `${base} — 9 tyg. niezbywalne`;
  if (id.endsWith("-shared")) return `${base} — część wspólna`;
  if (id === "father-maternity") return `${base} — część przejęta`;
  return base;
}
