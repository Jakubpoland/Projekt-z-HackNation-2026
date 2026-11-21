// Daty zostają po stronie frontu (agent/02-model-i-zalozenia.md).
// Backend dostaje tylko liczby dni.

export function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("pl-PL", { timeZone: "UTC" });
}

/**
 * Liczba dni od przyjęcia dziecka do granicy wieku (7, 10 lub 14 lat).
 * Wynik trafia do `acceptance.daysUntilAgeLimit`.
 */
export function daysUntilAgeLimit(birth: string, accepted: string, limitYears: number): number | null {
  const b = parseDate(birth);
  const a = parseDate(accepted);
  if (!b || !a) return null;
  const limit = new Date(Date.UTC(b.getUTCFullYear() + limitYears, b.getUTCMonth(), b.getUTCDate()));
  return diffDays(a, limit);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
