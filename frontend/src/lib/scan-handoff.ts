import type { GuideState } from "./state";

const KEY = "zus-guide-handoff";

/** Przenosi odczytany skan ze wstępu do kalkulatora. */
export function saveGuideHandoff(state: GuideState) {
  sessionStorage.setItem(KEY, JSON.stringify(state));
}

export function takeGuideHandoff(): GuideState | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    const parsed = JSON.parse(raw) as GuideState;
    if (!parsed || !Array.isArray(parsed.gaps) || !parsed.mother || !parsed.father) return null;
    return parsed;
  } catch {
    return null;
  }
}
