# Prompt dla agenta na legion-540

> Ten plik napisał agent na laptopie **thinkpad-t14**. Jesteś agentem na **legion-540** i robisz frontend w Next.js. Backendu w Go nie przepisuj. Jeśli brakuje pola w API, dopisz prośbę w tym katalogu `agent/`, zamiast liczyć zasiłek po stronie przeglądarki.

## Cel ekranu

Jeden przewodnik, po polsku, responsywny. Użytkownik przechodzi swoją sytuację (ciąża, poród, adopcja, rodzina zastępcza) i dostaje: czy ma prawo, na jak długo, ile to jest złotych, kto wypłaca, jakie dokumenty, jakie ryzyka.

Dane wymiarów pobieraj z `GET /api/v1/catalog`. Wyliczenie wysyłaj na `POST /api/v1/calculations/simulate`. Podstawę, jeśli użytkownik poda wynagrodzenie, przelicz przez `POST /api/v1/calculations/basis` i wstaw `basis.grosze` do symulacji. Ciążę i L4 obsługuj przez `POST /api/v1/calculations/sickness`.

Pokazuj `warnings` i `documents` z odpowiedzi. Nie chowaj kodu 422: `error.message` jest po polsku i nadaje się na komunikat przy formularzu.

## Układ, który ma pokryć kryteria

- Start: kim jestem (matka, ojciec, oboje), jaki tytuł ubezpieczenia, czy ubezpieczenie jest w dniu porodu.
- Ciąża: kod B, dni zwolnienia, wiek 50+, rodzaj ubezpieczenia.
- Dziecko: liczba, „Za życiem”, wcześniak (tydzień, masa, dni szpitala), zgon albo urodzenie martwe.
- Decyzja: ile tygodni bierze matka, ile ojciec, czy wniosek o 81,5% wszedł w 21 dni, czy ojciec bierze swoje 9 tygodni i urlop ojcowski, czy któreś z nich pracuje do połowy etatu.
- Adopcja / piecza: klient liczy dni do 7., 10. albo 14. urodzin i wysyła `acceptance.daysUntilAgeLimit`.
- Wynik: odcinki z osoby, stawki, kwoty `zloty`, płatnik (`platnik`, `zus`, `unknown`).
- Ryzyka z briefu pokazuj, gdy użytkownik zaznaczy zmianę podstawy w ciąży albo wątpliwą umowę (`basisChangedDuringPregnancy`, `possibleShamEngagement`). Ochrona kodeksowa nie dotyczy umowy zlecenia i działalności — to wraca jako ostrzeżenie API.
- Symulacje bez prawdziwych integracji: mObywatel, konto ZUS, e-ZLA, zadłużenie składek, PUE/eZUS, wysyłka wniosku, odpis aktu urodzenia. Oznacz je w UI jako symulację.
- Linki: zus.pl, https://www.gov.pl/web/rodzina/urlop-rodzicielski , https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo .
- Wnioski urlopowe trzeba zaprojektować (treść z rozporządzenia o wnioskach rodzicielskich). Wniosków ZUS nie odtwarzaj jako oficjalnych formularzy; wskaż ZAM, Z-3, Z-3a. Nie proponuj ZUR, ZAO ani Z-3b.

## Technicznie

- Next.js, App Router, TypeScript. Katalog `frontend/`.
- Adres API bierz ze zmiennej `NEXT_PUBLIC_API_URL`, domyślnie `http://localhost:8080`.
- Interfejs ma działać na szerokim oknie i na telefonie.
- Nie wgrywaj do repozytorium przykładowych spraw PDF od ZUS.

Gdy skończysz pierwszy przebieg, dopisz w `agent/` plik z datą i listą ekranów, też z informacją, że powstał na legion-540.
