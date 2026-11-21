# Kontrakt API

> Prompt: kontrakt ustalił agent na laptopie **thinkpad-t14**. Agent na **legion-540** konsumuje go z Next.js i nie zmienia ścieżek po cichu.

Pełny opis: `backend/api/openapi.yaml`. Serwer deweloperski: `http://localhost:8080`. Nagłówek CORS pozwala wołać API z innej origin.

Każde żądanie to jeden obiekt JSON. Dodatkowe pole daje 400. Błąd reguły daje 422:

```json
{ "error": { "code": "PARENTAL_POOL", "message": "..." } }
```

## Katalog do formularza

`GET /api/v1/catalog` zwraca tygodnie, stawki w bps (10000 = 100%, 8150 = 81,5%) i progi. Po zmianie parametrów katalog się zmienia. Nie duplikuj tabeli 20/31/33/35/37 w kodzie Reacta.

## Symulacja

`POST /api/v1/calculations/simulate`

Pola, których frontend nie powinien zgadywać inaczej niż poniżej:

- `situation`: `birth`, `foster`, `adoption`.
- `insuredOnEvent`: false i jednoczesne podanie tygodni kończy się 422. Samo false bez roszczenia zwraca ostrzeżenie i puste segmenty.
- `mother` / `father`: `hasRight`, `title` (`employee`, `mandate`, `business`, `other`), `basisGrosze`.
- Pominięte `maternityWeeks` i `maternityDays` u obojga: cały wymiar dostaje matka, a gdy nie ma prawa — ojciec.
- `takeoverReason`: `none`, `resignation_after_14`, `incapacity`, `hospital`, `death`, `abandonment`, `mother_uninsured`.
- `work`: `{ "numerator": 1, "denominator": 2 }` oznacza pół etatu. Tylko przy `title: "employee"`.
- `children`: pusta tablica albo brak oznacza, że wszystkie dzieci żyją. Przy zgonie `deathDay` liczy dzień porodu jako 0.
- `supplementary.assignedTo`: `mother` albo `father`.

Odpowiedź: `entitlement` (co wolno), `segments` (co wybrano), `motherTotal`, `fatherTotal`, `grandTotal`, `warnings`, `documents`, `combinedRateApplied`, `parametersVersion`.

`entitlement.maternityDays` jest wiążące. `maternityWeeks` to część całkowita.

## Podstawa

`POST /api/v1/calculations/basis`

`kind`: `employee` albo `non_employee`. `mode`: `average`, `first_month`, `second_month`, `carry_over`. Miesiąc z `workedTimeBps` poniżej 5000 wypada ze średniej. Wynik wstaw jako `basisGrosze` rodzica w symulacji. Frontend może policzyć podgląd, ale kwotę do symulacji bierze z tego endpointu.

## Choroba w ciąży

`POST /api/v1/calculations/sickness`

`insurance`: `compulsory`, `voluntary`, `none`. `age50Rule` ustawia 14 dni wynagrodzenia chorobowego. `codeB` ustawia 100% zasiłku.

## Parametry

`PUT /api/v1/admin/parameters` przyjmuje cały obiekt z `GET /api/v1/parameters`. W tej wersji trzyma go w pamięci procesu. Restart wraca do zestawu `2026.1`.
