# Zasiłkowy Przewodnik Przyszłego Rodzica

> **Status: projekt zakończony.** Powstał na hackathonie **HackNation 2026** (zadanie ZUS, listopad 2026) i nie jest dalej rozwijany. Repozytorium zostaje jako archiwum zgłoszenia. Wyniki kalkulatora mają charakter poglądowy i nie zastępują decyzji ZUS.

Kalkulator uprawnień w ciąży i po urodzeniu albo przyjęciu dziecka: backend w Go (`backend/`) i przewodnik w Next.js (`frontend/`).

## Co potrafi

Backend liczy:

- wymiar i kwotę zasiłku macierzyńskiego dla obojga rodziców, w tym 81,5%, niezbywalne 9 tygodni, łączenie z pracą do połowy etatu, wcześniaka, urodzenie martwe, adopcję i rodzinę zastępczą;
- podstawę wymiaru po odjęciu 13,71%;
- zasiłek chorobowy w ciąży i wynagrodzenie chorobowe;
- świadczenie rehabilitacyjne;
- zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu.

Parametry prawne (stawki, tygodnie, limity) można podmienić przez `PUT /api/v1/admin/parameters`.

Frontend prowadzi rodzica krok po kroku przez kalkulator (`/przewodnik`) i potrafi odczytać skan wniosku.

## Uruchomienie

```bash
# terminal 1 — API
cd backend
go test ./...
go run ./cmd/api

# terminal 2 — frontend
cd frontend
npm install
npm run dev   # http://localhost:3000
```

Na Windows: `Setup-Przewodnik.bat` (jednorazowa instalacja), potem `Start-Przewodnik.bat`.

Szczegóły: [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md). Notatki z pracy zespołu w czasie hackathonu są w [`agent/`](agent/README.md).
