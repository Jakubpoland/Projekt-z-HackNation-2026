# Frontend — pierwszy przebieg (2026-11-21)

> Ten plik napisał agent na laptopie **legion-540** (frontend Next.js). Agent na **thinkpad-t14**: przeczytaj sekcję „Prośby do backendu”. Kontraktu API nie zmieniałem. Backendu w Go nie ruszałem.

## Gdzie jest kod

- `frontend/` — Next.js 16, App Router, TypeScript, czysty CSS (bez Tailwinda).
- Uruchomienie: `cd frontend && npm install && npm run dev` → http://localhost:3000. Adres API: `NEXT_PUBLIC_API_URL`, domyślnie `http://localhost:8080`.
- Wszystkie wywołania API i typy odpowiedzi są w `frontend/src/lib/api.ts`. Jeśli zmienisz kształt JSON, to jest jedyny plik, który trzeba zaktualizować po stronie frontu.
- Mapowanie formularza na `SimulationInput` jest w `frontend/src/lib/state.ts` (`simulationRequest`, `basisRequest`, `sicknessRequest`).
- Frontend nie liczy zasiłków. Liczy tylko daty: dni do granicy wieku (`acceptance.daysUntilAgeLimit`) i przykładowy harmonogram odcinków od daty porodu.

## Ekrany

Jedna strona `/` z przewodnikiem w 7 krokach, a obok podsumowanie aktualizowane na żywo (symulacja jest wysyłana z debounce przy każdej zmianie).

1. **Start**: zdarzenie (poród, adopcja, piecza), kto ma prawo, ubezpieczenie w dniu zdarzenia, data. Logowanie mObywatel jest symulacją i wypełnia przykładowe dane z ZUS. Jest też 6 przykładowych scenariuszy do demo. Są zmyślone, to nie są sprawy ZUS.
2. **Ubezpieczenie i dochód**: dla każdego rodzica tytuł, liczba ubezpieczonych u płatnika i podstawa liczona przez `POST /calculations/basis` (stała pensja, 12 miesięcy albo podstawa składek osoby niebędącej pracownikiem). Do tego ryzyka `basisChangedDuringPregnancy` i `possibleShamEngagement`.
3. **Ciąża**: L4 w ciąży przez `POST /calculations/sickness` (kod B, 50+, okres wyczekiwania, wyjątki). e-ZLA jest oznaczone jako symulacja.
4. **Dziecko**: liczba dzieci, „Za życiem”, wcześniak (tydzień, masa, dni szpitala, komu przypada urlop uzupełniający), urodzenie martwe albo zgon. Przy adopcji i pieczy: daty i granica wieku 7, 10 albo 14 lat.
5. **Podział urlopu**: tygodnie przed porodem, przejęcie urlopu macierzyńskiego przez ojca (z powodem), suwaki urlopu rodzicielskiego ograniczone przez `entitlement`, gotowe podziały, jednoczesne korzystanie, wniosek o 81,5% z liczbą dni, praca na 1/2 do 1/5 etatu, urlop ojcowski.
6. **Wynik**: suma, kwota matki i ojca, oś czasu, tabela odcinków (stawka, dziennie, miesięcznie, razem, płatnik), wymiar, `warnings`.
7. **Dokumenty i pomoc**: `documents` z API, terminy wniosków, projekt wniosku urlopowego do druku (to nie jest oficjalny formularz), wysyłka ZAM przez PUE/eZUS jako symulacja, linki zus.pl, gov.pl/rodzina i PIP, a także miejsca, gdzie szukać pomocy przy stracie dziecka, wcześniaku i przy „Za życiem”.

Do tego `/admin`: edytor parametrów (`GET /parameters` i `PUT /admin/parameters`).

## Prośby do backendu (thinkpad-t14)

Nic z tego nie blokuje pracy. Dziś obchodzę te braki po stronie frontu, a w kilku miejscach tekst w UI jest wpisany na sztywno.

1. **Terminy w katalogu.** Proszę dodać do `GET /catalog` termin wniosku o 81,5% (`combinedRequestDeadlineDays`, dziś 21) oraz terminy wniosków urlopowych (rodzicielski i łączenie z pracą: 21 dni, ojcowski: 7 dni, uzupełniający: 21 dni przed końcem). Teraz są wpisane w `frontend/src/components/Documents.tsx` i w podpowiedzi w `Steps.tsx`.
2. **Maksymalna liczba tygodni przed porodem** (`EarlyMaternityMaxWeeks`, dziś 6) w katalogu. Front ma ją wpisaną na sztywno w suwaku.
3. **Maksymalny ułamek etatu** przy łączeniu z pracą (1/2) w katalogu. Front daje do wyboru 1/2, 1/3, 1/4 i 1/5.
4. **Etykiety parametrów.** `GET /parameters` zwraca same klucze. Pole `labels: { [klucz]: "opis po polsku" }`, choćby w osobnym endpoincie, ułatwiłoby panel `/admin`.
5. **Kolejność odcinków / daty.** Harmonogram dat liczy front i przyjmuje kolejność: macierzyński, uzupełniający, rodzicielski matki, rodzicielski ojca. Jeśli backend kiedyś zwróci `startDay` i `endDay` względem porodu, front przejdzie na nie.
6. **Podział `maternityDays` przy przejęciu.** Front wysyła matce `maternityDays = tygodnie × 7`, a ojcu resztę `entitlement.maternityDays`. Wystarczy potwierdzić w `03-kontrakt-api.md`, że tak ma być.

## Sprawdzone ręcznie

Wszystkie 6 scenariuszy demo i przejęcie urlopu przez ojca dają wynik bez błędu 422. Na 390 px i 1366 px nie ma poziomego przewijania, a w konsoli przeglądarki nie ma błędów.
