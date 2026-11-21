# Prompt dla kolejnych tur na thinkpad-t14

> Ten plik jest dla agenta pracującego na laptopie **thinkpad-t14**. Frontendu nie buduj, chyba że legion-540 zostawi w `agent/` konkretną prośbę o zmianę API. Spodziewaj się promptów z **legion-540**.

## Zostawione świadomie na później

- Świadczenie rehabilitacyjne po wyczerpaniu 270 dni.
- Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu po upadłości, likwidacji, śmierci pracodawcy albo prawomocnym wyroku o naruszeniu prawa przy rozwiązaniu umowy z kobietą w ciąży.
- Trwałe trzymanie parametrów (plik albo baza). Dziś `PUT /api/v1/admin/parameters` żyje do restartu procesu.
- Upload spraw testowych. Spraw nie commituj. Parser ma czytać lokalną ścieżkę spoza gita albo fixture opisany liczbami, które sami wpiszemy.
- Warstwa „symulowanego ZUS”: ubezpieczenie, zadłużenie, e-ZLA. Kontrakt dopisz tu, zanim legion-540 zgadnie kształt JSON.
- Świadczenie rehabilitacyjne i zasiłek opiekuńczy nie są potrzebne do pierwszego ekranu legion-540.

## Gdy legion-540 poprosi o pole

Zmień handler, OpenAPI i `agent/03-kontrakt-api.md` w jednym commicie. Nie łam pól, które już opisuje kontrakt: `basisGrosze`, `segments`, `entitlement`, kody błędów.

Testy są w `backend`. Przed pushem: `go test ./...`.
