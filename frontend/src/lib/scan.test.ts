import assert from "node:assert/strict";
import { applyScan } from "./scan";

const alicja = `
ZAM Wniosek o zasiłek macierzyński
Wnioskuję o zasiłek macierzyński za okres urlopu macierzyńskiego OD: 2025-11-13 DO: 2026-04-01
urlopu rodzicielskiego OD: 2026-04-02 DO: 2026-11-11
urodzeniem dziecka
podlega ubezpieczeniu chorobowemu
Z-3 zaświadczenie płatnika składek
`;
const birthOnly = applyScan("urodzeniem dziecka\npodlega ubezpieczeniu chorobowemu\nZ-3\njednego dziecka\nOD: 2025-11-13", "wniosek-test.pdf");
assert.equal(birthOnly.state.situation, "birth");
assert.ok(!birthOnly.state.gaps.includes("situation"));

const a = applyScan(alicja, "Alicja.pdf");
assert.equal(a.state.situation, "birth");
assert.equal(a.state.eventDate, "2025-11-13");
assert.equal(a.state.insuredOnEvent, true);
assert.equal(a.state.mother.title, "employee");
assert.ok(a.state.gaps.includes("childCount"));
assert.ok(a.state.gaps.includes("zaZyciem"));
assert.ok(a.state.gaps.includes("motherSalary"));
assert.ok(!a.read.some((h) => h.key === "zaZyciem"));

const war = applyScan("wypłata zasiłku macierzyńskiego", "Anna_War_01_zas. macierzyński, martwe urodzenie.pdf");
assert.equal(war.state.loss, "stillbirth");
assert.equal(war.state.situation, "birth");

const adop = applyScan("urlop na warunkach urlopu macierzyńskiego", "Agnieszka_zas_przyjecie_dziecka_przysposobienie.pdf");
assert.equal(adop.state.situation, "adoption");
assert.ok(!adop.state.gaps.includes("pregnancyDays"));

const table = `
Z-3 umowa o pracę podlega ubezpieczeniu chorobowemu
jednego dziecka
2024 1 21 21 4872,00 441,00
2024 2 21 21 4872,00 464,00
2024 3 21 21 4872,00 733,53
2024 4 21 21 5376,00 98,02
`;
const t = applyScan(table, "Zuzanna_Ko.pdf");
assert.equal(t.state.mother.basisMode, "months");
assert.equal(t.state.mother.months.length, 4);
assert.ok(!t.state.gaps.includes("motherSalary"));
assert.equal(t.state.childCount, 1);

const early = applyScan("zasiłek macierzyński bliźnięta urodzone przedwcześnie 28 tydzień zaświadczenie za życiem masa 980 g szpital 40 dni", "Justyna.pdf");
assert.equal(early.state.childCount, 2);
assert.equal(early.state.zaZyciem, true);
assert.equal(early.state.premature, true);
assert.equal(early.state.pregnancyWeekAtBirth, "28");
assert.equal(early.state.birthWeight, "980");
assert.equal(early.state.hospitalDays, "40");
assert.ok(!early.state.gaps.includes("zaZyciem"));

console.log("scan tests ok", a.state.gaps.join(","));
