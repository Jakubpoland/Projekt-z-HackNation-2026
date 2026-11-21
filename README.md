# Zasiłkowy Przewodnik Przyszłego Rodzica

Rdzeń rozwiązania na HackNation 2026 / ZUS. Kalkulator uprawnień w ciąży i po urodzeniu albo przyjęciu dziecka.

Praca jest dzielona na dwa laptopy:

- **thinkpad-t14** — backend w Go, ten katalog `backend/`. Ten commit powstał na thinkpad-t14.
- **legion-540** — frontend w Next.js, katalog `frontend/`. Kolejne prompty frontendu przyjdą z legion-540.

Wspólne ustalenia dla obu agentów są w katalogu [`agent/`](agent/README.md).

## Co jest już w repozytorium

Backend liczy:

- wymiar i kwotę zasiłku macierzyńskiego dla obojga rodziców, w tym 81,5%, niezbywalne 9 tygodni, łączenie z pracą do połowy etatu, wcześniaka, urodzenie martwe, adopcję i rodzinę zastępczą;
- podstawę wymiaru po odjęciu 13,71%;
- zasiłek chorobowy w ciąży i wynagrodzenie chorobowe.

Parametry prawne (stawki, tygodnie, limity) można podmienić przez `PUT /api/v1/admin/parameters`.

## Uruchomienie API

```bash
cd backend
go test ./...
go run ./cmd/api
```

Szczegóły: [backend/README.md](backend/README.md).
