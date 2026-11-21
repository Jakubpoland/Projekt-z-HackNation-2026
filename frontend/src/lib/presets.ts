// Przykładowe, zmyślone sytuacje do demo. To NIE są sprawy ZUS z zestawu hackathonowego
// (tych nie commitujemy — agent/README.md).

import { emptyParent, initialState, type GuideState } from "./state";

export interface Preset {
  id: string;
  title: string;
  description: string;
  build: () => GuideState;
}

export const PRESETS: Preset[] = [
  {
    id: "etat-81",
    title: "Anna i Piotr — oboje na etacie",
    description: "Jedno dziecko, wniosek o 81,5% w 21 dni, ojciec bierze swoje 9 tygodni i urlop ojcowski.",
    build: () => {
      const s = initialState();
      s.combinedRateRequest = true;
      s.combinedDaysAfter = "7";
      s.mother = { ...emptyParent(true), salary: "9500", payerInsuredCount: "120", parentalWeeks: 32 };
      s.father = { ...emptyParent(true), salary: "8200", payerInsuredCount: "12", parentalWeeks: 9, paternityWeeks: 2 };
      return s;
    },
  },
  {
    id: "blizneta-wczesniak",
    title: "Bliźnięta, wcześniaki",
    description: "Poród w 30. tygodniu, 40 dni w szpitalu, „Za życiem” — dłuższy urlop rodzicielski i uzupełniający.",
    build: () => {
      const s = initialState();
      s.childCount = 2;
      s.zaZyciem = true;
      s.premature = true;
      s.pregnancyWeekAtBirth = "30";
      s.birthWeight = "1400";
      s.hospitalDays = "40";
      s.mother = { ...emptyParent(true), salary: "7200", payerInsuredCount: "30", parentalWeeks: 49 };
      s.father = { ...emptyParent(true), salary: "6800", payerInsuredCount: "30", parentalWeeks: 9, paternityWeeks: 2 };
      return s;
    },
  },
  {
    id: "zlecenie-dg",
    title: "Matka na zleceniu, ojciec z firmą",
    description: "Ochrona kodeksowa nie obejmuje zlecenia i działalności. Ojciec pracuje dalej, bierze tylko ojcowski.",
    build: () => {
      const s = initialState();
      s.mother = { ...emptyParent(true, "mandate"), basisMode: "non_employee", revenues: "5200; 5200; 5600; 5400; 5200; 5200" };
      s.father = { ...emptyParent(true, "business"), basisMode: "non_employee", revenues: "6500; 6500; 6500", paternityWeeks: 2 };
      s.mother.parentalWeeks = 32;
      return s;
    },
  },
  {
    id: "praca-pol-etatu",
    title: "Ojciec łączy urlop z pracą na 1/2 etatu",
    description: "Część urlopu rodzicielskiego wydłuża się, gdy rodzic pracuje do połowy etatu.",
    build: () => {
      const s = initialState();
      s.mother = { ...emptyParent(true), salary: "6000", payerInsuredCount: "50", parentalWeeks: 20 };
      s.father = {
        ...emptyParent(true),
        salary: "10000",
        payerInsuredCount: "50",
        parentalWeeks: 21,
        works: true,
        workFraction: "1/2",
      };
      return s;
    },
  },
  {
    id: "adopcja",
    title: "Adopcja 3-latka",
    description: "Urlop na warunkach urlopu macierzyńskiego przy przysposobieniu. Granicę wieku liczy przewodnik.",
    build: () => {
      const s = initialState();
      s.situation = "adoption";
      s.childBirthDate = "2023-05-10";
      s.eventDate = "2026-12-01";
      s.ageLimitYears = 14;
      s.mother = { ...emptyParent(true), salary: "8000", payerInsuredCount: "200", parentalWeeks: 32 };
      s.father = { ...emptyParent(true), salary: "8000", payerInsuredCount: "200", parentalWeeks: 9 };
      return s;
    },
  },
  {
    id: "brak-ubezpieczenia",
    title: "Brak ubezpieczenia w dniu porodu",
    description: "Umowa skończyła się przed porodem — przewodnik pokazuje brak prawa i co można zrobić.",
    build: () => {
      const s = initialState();
      s.insuredOnEvent = false;
      s.role = "mother";
      s.mother = { ...emptyParent(true), salary: "5000" };
      s.father = emptyParent(false);
      return s;
    },
  },
];

/** Symulowane dane „pobrane z ZUS po zalogowaniu mObywatel”. */
export function simulatedZusData(s: GuideState): GuideState {
  return {
    ...s,
    mObywatel: true,
    insuredOnEvent: true,
    mother: {
      ...s.mother,
      hasRight: true,
      title: "employee",
      payerInsuredCount: "85",
      basisMode: "months",
      months: [
        { gross: "7800", workedPct: "100" },
        { gross: "7800", workedPct: "100" },
        { gross: "7800", workedPct: "100" },
        { gross: "8100", workedPct: "100" },
        { gross: "8100", workedPct: "40" },
        { gross: "8100", workedPct: "100" },
        { gross: "8100", workedPct: "100" },
        { gross: "8100", workedPct: "100" },
        { gross: "8100", workedPct: "100" },
        { gross: "8100", workedPct: "100" },
        { gross: "8100", workedPct: "100" },
        { gross: "8100", workedPct: "100" },
      ],
    },
  };
}
