# Podział pracy

> Prompt: ten podział zapisał agent na laptopie **thinkpad-t14**. Kolejne prompty frontendu przyjdą z **legion-540**.

## thinkpad-t14 — backend Go

Katalog: `backend/`.

Już jest: model dziedziny, trzy kalkulatory, parametr administracyjny w pamięci, OpenAPI, testy. Dalsze prace na tej maszynie: odczyt spraw testowych (poza gitem), doprecyzowanie podstawy wymiaru pod prawdziwe zaświadczenia, symulowane źródła ZUS po stronie API, panel administracyjny jeśli nie zostanie w całości we froncie.

Nie zakładaj aplikacji Next.js na tej maszynie. Nie zmieniaj kontraktu bez wpisu w `agent/03-kontrakt-api.md`.

## legion-540 — frontend Next.js

Katalog: `frontend/` (na razie tylko README).

Aplikacja ma być jednym przewodnikiem z jednym kalkulatorem i wyborem opcji, nie zestawem luźnych stron-kalkulatorów. Ma być responsywna. Logowanie mObywatel, pobranie danych z ZUS, e-ZLA, zadłużenie składkowe, PUE/eZUS i wysyłka wniosków są symulacją.

Zacznij od `agent/04-prompt-legion-540.md`.

## Wspólne zasady

- Język interfejsu i komunikatów API: polski.
- Kwoty w API: grosze na wejściu, `grosze` + `zloty` na wyjściu.
- Stawek i tygodni nie wpisuj na sztywno w komponentach. Bierz je z `GET /api/v1/catalog`.
- Gałąź robocza tego rdzenia: `cursor/benefit-guide-core-17c9`. Dalsze branche nadal z prefiksem `cursor/` i sufiksem wymaganym przez środowisko.
