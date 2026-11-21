// Stan przewodnika i przekształcenie go w żądanie do backendu.
// Tu nie ma żadnych stawek ani tygodni — tylko mapowanie pól formularza.

import type {
  BasisInput,
  ChildState,
  SicknessInput,
  SimulationInput,
  Situation,
  TakeoverReason,
  Title,
} from "./api";
import { toGrosze } from "./format";
import { daysUntilAgeLimit } from "./dates";

export type BasisMode = "salary" | "months" | "direct" | "non_employee";

export interface MonthRow {
  gross: string;
  workedPct: string; // 0–100, poniżej 50 miesiąc wypada
}

export interface ParentForm {
  hasRight: boolean;
  title: Title;
  payerInsuredCount: string;
  basisMode: BasisMode;
  salary: string; // miesięczne brutto
  months: MonthRow[];
  direct: string; // podstawa wpisana ręcznie (z decyzji / zaświadczenia)
  revenues: string; // przychody osoby niebędącej pracownikiem, rozdzielone średnikiem
  basisGrosze: number; // wynik z POST /basis
  parentalWeeks: number;
  paternityWeeks: number;
  works: boolean;
  workFraction: "1/2" | "1/3" | "1/4" | "1/5";
  basisChangedDuringPregnancy: boolean;
  possibleShamEngagement: boolean;
}

export interface PregnancyForm {
  enabled: boolean;
  insurance: "compulsory" | "voluntary" | "none";
  coveredDaysBefore: string;
  waitingPeriodAlreadyMet: boolean;
  age50Rule: boolean;
  codeB: boolean;
  incapacityDays: string;
  sickPayDaysUsed: string;
}

export interface GuideState {
  role: "mother" | "father" | "both";
  situation: Situation;
  insuredOnEvent: boolean;
  eventDate: string; // data porodu (planowana) albo przyjęcia dziecka
  childBirthDate: string; // tylko adopcja / piecza
  ageLimitYears: 7 | 10 | 14;
  childCount: number;
  zaZyciem: boolean;
  premature: boolean;
  pregnancyWeekAtBirth: string;
  birthWeight: string;
  hospitalDays: string;
  supplementaryTo: "mother" | "father";
  loss: "none" | "stillbirth" | "death";
  deathDay: string;
  aliveCount: string;
  preBirthWeeks: number;
  takeover: boolean;
  takeoverReason: TakeoverReason;
  motherMaternityWeeks: number | null; // null = cały wymiar matki
  combinedRateRequest: boolean;
  combinedDaysAfter: string;
  simultaneousParental: boolean;
  pregnancy: PregnancyForm;
  mother: ParentForm;
  father: ParentForm;
  mObywatel: boolean; // symulowane logowanie
  /** Klucze pól, których skaner nie odczytał. Znikają, gdy użytkownik je uzupełni. */
  gaps: string[];
}

export function emptyParent(hasRight: boolean, title: Title = "employee"): ParentForm {
  return {
    hasRight,
    title,
    payerInsuredCount: "",
    basisMode: "salary",
    salary: "",
    months: [],
    direct: "",
    revenues: "",
    basisGrosze: 0,
    parentalWeeks: 0,
    paternityWeeks: 0,
    works: false,
    workFraction: "1/2",
    basisChangedDuringPregnancy: false,
    possibleShamEngagement: false,
  };
}

export function initialState(): GuideState {
  return {
    role: "both",
    situation: "birth",
    insuredOnEvent: true,
    eventDate: "",
    childBirthDate: "",
    ageLimitYears: 14,
    childCount: 1,
    zaZyciem: false,
    premature: false,
    pregnancyWeekAtBirth: "",
    birthWeight: "",
    hospitalDays: "",
    supplementaryTo: "mother",
    loss: "none",
    deathDay: "",
    aliveCount: "0",
    preBirthWeeks: 0,
    takeover: false,
    takeoverReason: "none",
    motherMaternityWeeks: null,
    combinedRateRequest: false,
    combinedDaysAfter: "",
    simultaneousParental: false,
    pregnancy: {
      enabled: false,
      insurance: "compulsory",
      coveredDaysBefore: "365",
      waitingPeriodAlreadyMet: false,
      age50Rule: false,
      codeB: true,
      incapacityDays: "30",
      sickPayDaysUsed: "0",
    },
    mother: emptyParent(true),
    father: emptyParent(true),
    mObywatel: false,
    gaps: [],
  };
}

/** Usuwa klucze pól, które użytkownik właśnie uzupełnił ręcznie. */
export function dropGaps(s: GuideState, keys: string[]): GuideState {
  if (keys.length === 0 || !s.gaps.some((g) => keys.includes(g))) return s;
  return { ...s, gaps: s.gaps.filter((g) => !keys.includes(g)) };
}

function intOrNull(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const FRACTIONS: Record<ParentForm["workFraction"], { numerator: number; denominator: number }> = {
  "1/2": { numerator: 1, denominator: 2 },
  "1/3": { numerator: 1, denominator: 3 },
  "1/4": { numerator: 1, denominator: 4 },
  "1/5": { numerator: 1, denominator: 5 },
};

/** Żądanie do POST /calculations/basis dla jednego rodzica, albo null gdy brak danych. */
export function basisRequest(p: ParentForm): BasisInput | null {
  switch (p.basisMode) {
    case "salary": {
      const g = toGrosze(p.salary);
      if (!g) return null;
      return { kind: "employee", mode: "average", months: [{ workedTimeBps: 10000, fixedGrosze: g }] };
    }
    case "months": {
      const months = p.months
        .map((m) => ({ fixedGrosze: toGrosze(m.gross), workedTimeBps: Math.round(Number(m.workedPct || 100) * 100) }))
        .filter((m) => m.fixedGrosze > 0);
      if (!months.length) return null;
      return { kind: "employee", mode: "average", months };
    }
    case "non_employee": {
      const revenues = p.revenues
        .split(/[;\n]/)
        .map((s) => toGrosze(s))
        .filter((g) => g > 0);
      if (!revenues.length) return null;
      return { kind: "non_employee", mode: "average", revenuesGrosze: revenues };
    }
    case "direct":
      return null;
  }
}

function parentInput(p: ParentForm, extra: { maternityDays?: number | null }) {
  return {
    hasRight: p.hasRight,
    title: p.title,
    basisGrosze: p.basisGrosze,
    maternityDays: extra.maternityDays ?? null,
    parentalWeeks: p.hasRight ? p.parentalWeeks : 0,
    paternityWeeks: p.hasRight ? p.paternityWeeks : 0,
    work: p.hasRight && p.works && p.title === "employee" && p.parentalWeeks > 0 ? FRACTIONS[p.workFraction] : null,
    payerInsuredCount: intOrNull(p.payerInsuredCount),
    basisChangedDuringPregnancy: p.basisChangedDuringPregnancy,
    possibleShamEngagement: p.possibleShamEngagement,
  };
}

/**
 * Buduje SimulationInput. `maternityDaysEntitled` to wiążący wymiar z ostatniej
 * odpowiedzi API (entitlement.maternityDays) — potrzebny tylko przy przejęciu przez ojca.
 */
export function simulationRequest(s: GuideState, maternityDaysEntitled: number | null): SimulationInput {
  let motherDays: number | null = null;
  let fatherDays: number | null = null;
  if (s.takeover && s.father.hasRight && maternityDaysEntitled != null) {
    const m = s.takeoverReason === "mother_uninsured" || !s.mother.hasRight ? 0 : (s.motherMaternityWeeks ?? 0) * 7;
    motherDays = Math.min(m, maternityDaysEntitled);
    fatherDays = Math.max(0, maternityDaysEntitled - motherDays);
  }

  let children: ChildState[] | undefined;
  if (s.situation === "birth" && s.loss !== "none") {
    const alive = Math.max(0, Math.min(s.childCount - 1, Number(s.aliveCount) || 0));
    children = [];
    for (let i = 0; i < s.childCount - alive; i++) {
      children.push(
        s.loss === "stillbirth"
          ? { stillbirth: true, alive: false, deathDay: null }
          : { stillbirth: false, alive: false, deathDay: intOrNull(s.deathDay) ?? 0 },
      );
    }
    for (let i = 0; i < alive; i++) children.push({ stillbirth: false, alive: true, deathDay: null });
  }

  let acceptance: SimulationInput["acceptance"] = null;
  if (s.situation !== "birth") {
    const d = daysUntilAgeLimit(s.childBirthDate, s.eventDate, s.ageLimitYears);
    acceptance = { daysUntilAgeLimit: d ?? 0 };
  }

  const hospital = intOrNull(s.hospitalDays) ?? 0;
  const supplementary =
    s.situation === "birth" && s.premature && hospital > 0
      ? {
          pregnancyWeekAtBirth: intOrNull(s.pregnancyWeekAtBirth) ?? 0,
          lowestBirthWeightGrams: intOrNull(s.birthWeight) ?? 0,
          hospitalDays: hospital,
          hospitalDaysFromDay5: 0,
          termHospitalQualifies: false,
          assignedTo: s.supplementaryTo,
        }
      : null;

  return {
    situation: s.situation,
    childCount: s.childCount,
    zaZyciem: s.zaZyciem,
    insuredOnEvent: s.insuredOnEvent,
    combinedRateRequest: s.combinedRateRequest && s.mother.hasRight,
    daysAfterEventForCombinedRequest: s.combinedRateRequest ? intOrNull(s.combinedDaysAfter) : null,
    preBirthWeeks: s.situation === "birth" ? s.preBirthWeeks : 0,
    takeoverReason: s.takeover ? s.takeoverReason : "none",
    simultaneousParental: s.simultaneousParental,
    supplementary,
    children,
    mother: parentInput(s.mother, { maternityDays: motherDays }),
    father: parentInput(s.father, { maternityDays: fatherDays }),
    acceptance,
  };
}

export function sicknessRequest(s: GuideState): SicknessInput {
  const p = s.pregnancy;
  return {
    isEmployee: s.mother.title === "employee",
    insurance: p.insurance,
    coveredDaysBefore: intOrNull(p.coveredDaysBefore) ?? 0,
    waitingPeriodAlreadyMet: p.waitingPeriodAlreadyMet,
    age50Rule: p.age50Rule,
    codeB: p.codeB,
    inPregnancy: true,
    incapacityDays: intOrNull(p.incapacityDays) ?? 0,
    sickPayDaysUsed: intOrNull(p.sickPayDaysUsed) ?? 0,
    previousPeriodDays: 0,
    gapDays: 0,
    basisGrosze: s.mother.basisGrosze,
  };
}

/** Wygodny niezmienniczy update zagnieżdżonego rodzica. */
export function withParent(s: GuideState, who: "mother" | "father", patch: Partial<ParentForm>): GuideState {
  return { ...s, [who]: { ...s[who], ...patch } };
}
