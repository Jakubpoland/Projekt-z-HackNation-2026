// Typy i wywołania API backendu Go (thinkpad-t14).
// Kontrakt: agent/03-kontrakt-api.md oraz backend/api/openapi.yaml.
// Frontend NIE liczy zasiłków — tylko zbiera dane i pokazuje wynik.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

export interface Amount {
  grosze: number;
  zloty: string;
}

export interface Catalog {
  parametersVersion: string;
  maternityWeeks: { children: number; weeks: number }[];
  parental: {
    oneChildWeeks: number;
    multiChildWeeks: number;
    oneChildZaZyciemWeeks: number;
    multiChildZaZyciemWeeks: number;
    exclusiveWeeksPerParent: number;
    maxParts: number;
    useUntilEndOfYearChildTurns: number;
    calendarCapOne: number;
    calendarCapMulti: number;
    calendarCapOneZaZyciem: number;
    calendarCapMultiZaZyciem: number;
    shortWeeks: number;
    shortZaZyciemWeeks: number;
  };
  paternity: { weeks: number; maxParts: number; minPartWeeks: number; untilMonths: number };
  ratesBps: {
    maternity: number;
    parental: number;
    combinedRequest: number;
    secondParentExclusive: number;
    paternity: number;
    supplementary: number;
    sickPregnancy: number;
    sickDefault: number;
  };
  basis: {
    socialContributionNumerator: number;
    socialContributionDenominator: number;
    minWage: Amount;
    maxVoluntaryContributionBase: Amount;
    maxNonEmployeeBenefitBasis: Amount;
    dailyDivisor: number;
  };
  sickness: {
    sickPayDaysUnder50: number;
    sickPayDaysAge50: number;
    benefitPeriodDays: number;
    benefitPeriodGapDays: number;
    waitingDaysCompulsory: number;
    waitingDaysVoluntary: number;
    payerInsuredThreshold: number;
  };
  notes: string[];
}

export type Situation = "birth" | "foster" | "adoption";
export type Title = "employee" | "mandate" | "business" | "other";
export type TakeoverReason =
  | "none"
  | "resignation_after_14"
  | "incapacity"
  | "hospital"
  | "death"
  | "abandonment"
  | "mother_uninsured";

export interface Fraction {
  numerator: number;
  denominator: number;
}

export interface ParentInput {
  hasRight: boolean;
  title: Title;
  basisGrosze: number;
  maternityWeeks?: number | null;
  maternityDays?: number | null;
  parentalWeeks: number;
  paternityWeeks: number;
  work?: Fraction | null;
  payerInsuredCount?: number | null;
  basisChangedDuringPregnancy: boolean;
  possibleShamEngagement: boolean;
}

export interface SupplementaryInput {
  pregnancyWeekAtBirth: number;
  lowestBirthWeightGrams: number;
  hospitalDays: number;
  hospitalDaysFromDay5: number;
  termHospitalQualifies: boolean;
  assignedTo: "mother" | "father";
}

export interface ChildState {
  stillbirth: boolean;
  alive: boolean;
  deathDay?: number | null;
}

export interface SimulationInput {
  situation: Situation;
  childCount: number;
  zaZyciem: boolean;
  insuredOnEvent: boolean;
  combinedRateRequest: boolean;
  daysAfterEventForCombinedRequest?: number | null;
  preBirthWeeks: number;
  takeoverReason: TakeoverReason;
  simultaneousParental: boolean;
  supplementary?: SupplementaryInput | null;
  children?: ChildState[];
  mother: ParentInput;
  father: ParentInput;
  acceptance?: { daysUntilAgeLimit: number } | null;
}

export interface Warning {
  code: string;
  message: string;
}

export interface DocumentItem {
  code: string;
  person: string;
  message: string;
}

export interface Segment {
  id: string;
  person: "mother" | "father";
  benefit: string;
  rateBps: number;
  basis: Amount;
  monthly: Amount;
  daily: Amount;
  poolDays: number;
  calendarDays: number;
  extensionDays: number;
  workNumerator: number;
  workDenominator: number;
  total: Amount;
  payer: "platnik" | "zus" | "unknown";
}

export interface Entitlement {
  maternityDays: number;
  maternityWeeks: number;
  parentalPoolWeeks: number;
  exclusiveWeeksPerParent: number;
  sharedWeeks: number;
  maxWeeksForOneParent: number;
  parentalCalendarCapWeeks: number;
  supplementaryWeeks: number;
  paternityWeeks: number;
  shortParental: boolean;
}

export interface SimulationResult {
  entitlement: Entitlement;
  segments: Segment[];
  motherTotal: Amount;
  fatherTotal: Amount;
  grandTotal: Amount;
  combinedRateApplied: boolean;
  warnings: Warning[];
  documents: DocumentItem[];
  parametersVersion: string;
}

export interface BasisMonth {
  workedTimeBps: number;
  fixedGrosze: number;
  variableActualGrosze?: number;
  variableDaysWorked?: number;
  variableWorkingDays?: number;
  nonCompletedGrosze?: number;
}

export interface BasisInput {
  kind: "employee" | "non_employee";
  mode: "average" | "first_month" | "second_month" | "carry_over";
  months?: BasisMonth[];
  contractMonthlyGrosze?: number;
  revenuesGrosze?: number[];
  quarterlyTotalGrosze?: number;
  annualGrosze?: number;
  applyEmployeeMinimum?: boolean;
}

export interface BasisResult {
  basis: Amount;
  grossAverage: Amount;
  contribution: Amount;
  monthsIncluded: number;
  monthsSkipped: number;
  carriedOver: boolean;
  minimumApplied: boolean;
  capApplied: boolean;
  parametersVersion: string;
  notes: string[];
}

export interface SicknessInput {
  isEmployee: boolean;
  insurance: "compulsory" | "voluntary" | "none";
  coveredDaysBefore: number;
  waitingPeriodAlreadyMet: boolean;
  age50Rule: boolean;
  codeB: boolean;
  inPregnancy: boolean;
  incapacityDays: number;
  sickPayDaysUsed: number;
  previousPeriodDays: number;
  gapDays: number;
  basisGrosze: number;
}

export interface SicknessResult {
  eligible: boolean;
  sickPayDays: number;
  benefitDays: number;
  unpaidDays: number;
  periodLimitDays: number;
  sickPayRateBps: number;
  benefitRateBps: number;
  sickPayDaily: Amount;
  benefitDaily: Amount;
  sickPayTotal: Amount;
  benefitTotal: Amount;
  warnings: Warning[];
  parametersVersion: string;
}

/** Błąd z API: 422 (reguła) albo 400 (JSON). `message` jest po polsku. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "NETWORK", `Brak połączenia z serwerem obliczeń (${API_URL}). Uruchom backend: cd backend && go run ./cmd/api`);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.code || "HTTP", err?.message || `Błąd serwera (${res.status}).`);
  }
  return body as T;
}

export const api = {
  catalog: () => request<Catalog>("/api/v1/catalog"),
  parameters: () => request<Record<string, unknown>>("/api/v1/parameters"),
  putParameters: (p: Record<string, unknown>) =>
    request<Record<string, unknown>>("/api/v1/admin/parameters", { method: "PUT", body: JSON.stringify(p) }),
  simulate: (input: SimulationInput) =>
    request<SimulationResult>("/api/v1/calculations/simulate", { method: "POST", body: JSON.stringify(input) }),
  basis: (input: BasisInput) =>
    request<BasisResult>("/api/v1/calculations/basis", { method: "POST", body: JSON.stringify(input) }),
  sickness: (input: SicknessInput) =>
    request<SicknessResult>("/api/v1/calculations/sickness", { method: "POST", body: JSON.stringify(input) }),
};
