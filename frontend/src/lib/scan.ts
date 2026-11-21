// Odczyt treści skanu (tekst z OCR albo z nazwy pliku) na stan przewodnika.
// Pole, którego nie da się wyczytać, trafia do `gaps` i zostaje do ręcznego wpisania.

import { emptyParent, initialState, type GuideState } from "./state";

export interface ScanHit {
  key: string;
  label: string;
  value: string;
}

export interface ScanOutcome {
  state: GuideState;
  read: ScanHit[];
}

const GAP_LABEL: Record<string, string> = {
  situation: "Rodzaj sprawy (poród, adopcja, rodzina zastępcza)",
  insuredOnEvent: "Czy jest ubezpieczenie chorobowe w dniu zdarzenia",
  eventDate: "Data porodu albo przyjęcia dziecka",
  childCount: "Liczba dzieci",
  zaZyciem: "Czy jest zaświadczenie „Za życiem”",
  motherTitle: "Tytuł ubezpieczenia matki",
  motherSalary: "Wynagrodzenie albo podstawa matki",
  payerCount: "Liczba ubezpieczonych u płatnika",
  pregnancyDays: "Liczba dni zwolnienia w ciąży",
  pregnancyWeek: "Tydzień ciąży przy porodzie",
  birthWeight: "Masa urodzeniowa",
  hospitalDays: "Dni pobytu dziecka w szpitalu",
  childBirthDate: "Data urodzenia przyjętego dziecka",
  whoWorks: "Który rodzic łączy urlop rodzicielski z pracą",
};

export function gapLabel(key: string): string {
  return GAP_LABEL[key] ?? key;
}

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function iso(y: string, m: string, d: string): string | null {
  const yy = Number(y);
  const mm = Number(m);
  const dd = Number(d);
  if (yy < 1990 || yy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null;
  return `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function datesIn(text: string): string[] {
  const out: string[] = [];
  const re = /\b(?:(\d{4})-(\d{2})-(\d{2})|(\d{2})[.\-/](\d{2})[.\-/](\d{4}))\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const value = m[1] ? iso(m[1], m[2], m[3]) : iso(m[6], m[5], m[4]);
    if (value) out.push(value);
  }
  return out;
}

function windowAfter(text: string, re: RegExp, len = 180): string {
  const m = re.exec(text);
  if (!m || m.index == null) return "";
  return text.slice(m.index, m.index + len);
}

/** Zamienia tekst skanu i nazwę pliku na wypełniony stan oraz listę braków. */
export function applyScan(rawText: string, fileName = ""): ScanOutcome {
  const text = fold(`${fileName}\n${rawText}`);
  const s = initialState();
  const read: ScanHit[] = [];
  const gaps = new Set<string>();

  const mark = (key: string, value: string) => read.push({ key, label: GAP_LABEL[key] ?? key, value });

  const adoption = /przysposob|adopcj/.test(text);
  const foster = /rodzin\w* zastepcz|niezawodow/.test(text) || (/przyjec\w* dziecka na wychowanie/.test(text) && !adoption);
  const birthSignals = /porod|urodzen|ciaz|macierzyn|blizni|wczesni|martw/.test(text);
  if (adoption) {
    s.situation = "adoption";
    s.ageLimitYears = 14;
    mark("situation", "Adopcja");
  } else if (foster) {
    s.situation = "foster";
    s.ageLimitYears = 7;
    mark("situation", "Rodzina zastępcza");
  } else if (birthSignals) {
    s.situation = "birth";
    mark("situation", "Poród");
  } else {
    gaps.add("situation");
  }

  if (/nie podlega ubezpieczeniu|brak ubezpieczenia chorobowego|bez ubezpieczenia chorobowego/.test(text)) {
    s.insuredOnEvent = false;
    mark("insuredOnEvent", "Nie");
  } else if (/podlega ubezpieczeniu|ubezpieczeni\w* chorobow/.test(text)) {
    s.insuredOnEvent = true;
    mark("insuredOnEvent", "Tak");
  } else {
    gaps.add("insuredOnEvent");
  }

  if (/zlecen/.test(text)) {
    s.mother.title = "mandate";
    s.mother.basisMode = "non_employee";
    s.pregnancy.insurance = "voluntary";
    mark("motherTitle", "Umowa zlecenia");
  } else if (/dzialalnosc|pozarolnicz/.test(text)) {
    s.mother.title = "business";
    s.mother.basisMode = "non_employee";
    s.pregnancy.insurance = "voluntary";
    mark("motherTitle", "Działalność");
  } else if (/umow\w* o prace|\bz-3\b/.test(text) && !/\bz-3a\b/.test(text)) {
    s.mother.title = "employee";
    mark("motherTitle", "Umowa o pracę");
  } else if (/\bz-3a\b/.test(text)) {
    s.mother.title = "mandate";
    s.mother.basisMode = "non_employee";
    s.pregnancy.insurance = "voluntary";
    mark("motherTitle", "Umowa zlecenia (Z-3a)");
  } else {
    gaps.add("motherTitle");
  }

  const payer = text.match(/(\d{1,4})\s+ubezpieczonych/);
  if (payer && s.mother.title !== "business") {
    s.mother.payerInsuredCount = String(Number(payer[1]));
    mark("payerCount", s.mother.payerInsuredCount);
  } else if (s.mother.title !== "business") {
    gaps.add("payerCount");
  }

  const amounts = monthAmounts(text);
  if (amounts.length >= 3) {
    s.mother.basisMode = s.mother.title === "employee" ? "months" : "non_employee";
    s.mother.months = amounts.slice(0, 12).map((g) => ({ gross: g, workedPct: "100" }));
    s.mother.revenues = amounts.slice(0, 12).join("; ");
    s.mother.salary = amounts[amounts.length - 1];
    mark("motherSalary", `${amounts.length} mies. z tabeli`);
  } else {
    const one = text.match(/wynagrodzen\w*[^\d]{0,24}(\d{3,6}[.,]\d{2})/);
    if (one) {
      const value = one[1].replace(".", ",");
      s.mother.salary = value;
      s.mother.revenues = value;
      mark("motherSalary", `${value} zł`);
    } else {
      gaps.add("motherSalary");
    }
  }

  if (/blizni|dwoje dzieci|dwoch dzieci|2 dzieci/.test(text)) {
    s.childCount = 2;
    mark("childCount", "2");
  } else if (/troje dzieci|trzech dzieci|3 dzieci/.test(text)) {
    s.childCount = 3;
    mark("childCount", "3");
  } else if (/czworg\w* dzieci|4 dzieci/.test(text)) {
    s.childCount = 4;
    mark("childCount", "4");
  } else if (/piecior\w*|5 dzieci|piec dzieci/.test(text)) {
    s.childCount = 5;
    mark("childCount", "5");
  } else if (/jedn\w* dzieck|1 dziecko/.test(text)) {
    s.childCount = 1;
    mark("childCount", "1");
  } else {
    gaps.add("childCount");
  }

  if (/za zyciem/.test(text)) {
    s.zaZyciem = true;
    mark("zaZyciem", "Tak");
  } else {
    gaps.add("zaZyciem");
  }

  const matWindow = windowAfter(text, /urlop(?:u)? macierzyn/);
  const matDates = datesIn(matWindow);
  const anyDates = datesIn(text);
  const event = matDates[0] ?? anyDates[0] ?? "";
  if (event) {
    s.eventDate = event;
    mark("eventDate", event);
  } else {
    gaps.add("eventDate");
  }

  if (s.situation !== "birth") {
    const birth = datesIn(windowAfter(text, /data urodzenia|odpis skrocony/));
    if (birth[0]) {
      s.childBirthDate = birth[0];
      mark("childBirthDate", birth[0]);
    } else {
      gaps.add("childBirthDate");
    }
  }

  if (/martw|poronien/.test(text)) {
    s.loss = "stillbirth";
    mark("loss", "Urodzenie martwe");
  } else if (/zgon dziecka|dziecko zmarlo/.test(text)) {
    s.loss = "death";
    mark("loss", "Zgon dziecka");
  }

  const premature = /wczesni|przedwczes|ponizej 1000|masa urodzeniowa/.test(text);
  if (premature && s.situation === "birth") {
    s.premature = true;
    const week = text.match(/(\d{2})\s*\.?\s*tydzien/);
    const weight = text.match(/(\d{3,4})\s*g\b/) ?? text.match(/masa[^\d]{0,24}(\d{3,4})/);
    const hospital = text.match(/(\d{1,3})\s*dni[^\n]{0,30}szpital/) ?? text.match(/szpital[^\d]{0,30}(\d{1,3})\s*dni/);
    if (week) {
      s.pregnancyWeekAtBirth = week[1];
      mark("pregnancyWeek", week[1]);
    } else gaps.add("pregnancyWeek");
    if (weight) {
      s.birthWeight = weight[1];
      mark("birthWeight", `${weight[1]} g`);
    } else gaps.add("birthWeight");
    if (hospital) {
      s.hospitalDays = hospital[1];
      mark("hospitalDays", hospital[1]);
    } else gaps.add("hospitalDays");
  }

  const sick = /zasilek chorobowy|wynagrodzenie chorobowe|e-zla|niezdolnosci do pracy/.test(text) && /ciaz|kod[\s\w"]{0,12}\bb\b/.test(text);
  if (sick && s.situation === "birth") {
    s.pregnancy.enabled = true;
    s.pregnancy.codeB = /kod[\s\w"]{0,16}\bb\b/.test(text);
    const days = text.match(/(\d{1,3})\s*dni[^\n]{0,40}niezdol/) ?? text.match(/niezdolnos\w*[^\d]{0,40}(\d{1,3})/);
    if (days) {
      s.pregnancy.incapacityDays = days[1];
      mark("pregnancyDays", days[1]);
    } else {
      gaps.add("pregnancyDays");
    }
  }

  if (/ojcowsk/.test(text)) {
    s.father.hasRight = true;
    s.father.paternityWeeks = 2;
    s.father.title = s.mother.title;
    mark("paternity", "2 tygodnie");
  }

  if (/laczen\w* urlop\w* rodziciel\w* z praca|1\/2 etatu|pol etatu|polowy etatu/.test(text)) {
    const mother = /matk\w*[^\n]{0,40}prac/.test(text);
    const father = /ojc\w*[^\n]{0,40}prac|ojciec pracuje/.test(text);
    const fraction = /1\/3/.test(text) ? "1/3" : /1\/4/.test(text) ? "1/4" : /1\/5/.test(text) ? "1/5" : "1/2";
    if (mother) {
      s.mother.works = true;
      s.mother.workFraction = fraction;
      mark("whoWorks", "Matka");
    } else if (father) {
      s.father.works = true;
      s.father.workFraction = fraction;
      s.father.parentalWeeks = Math.max(s.father.parentalWeeks, 9);
      mark("whoWorks", "Ojciec");
    } else {
      gaps.add("whoWorks");
    }
  }

  if (/81[,.]5/.test(text)) {
    s.combinedRateRequest = true;
    s.combinedDaysAfter = "7";
    mark("combined", "81,5%");
  }

  s.mother = { ...emptyParent(s.mother.hasRight, s.mother.title), ...s.mother };
  s.father = { ...emptyParent(s.father.hasRight, s.father.title), ...s.father };
  s.gaps = [...gaps];
  return { state: s, read };
}

function monthAmounts(text: string): string[] {
  const re = /\b20\d{2}\s+(\d{1,2})\b(?:\s+\d+){0,6}\s+(\d{3,6}[.,]\d{2})/g;
  const rows: { month: number; gross: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const gross = Number(m[2].replace(",", "."));
    if (gross < 500 || gross > 100000) continue;
    rows.push({ month: Number(m[1]), gross: m[2].replace(".", ",") });
  }
  const seen = new Set<number>();
  return rows.filter((r) => (seen.has(r.month) ? false : (seen.add(r.month), true))).map((r) => r.gross);
}
