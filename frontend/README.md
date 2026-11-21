# Frontend (Next.js) — legion-540

Przewodnik „Zasiłkowy Przewodnik Przyszłego Rodzica”. Właściciel tej części: laptop **legion-540**. Backend w Go robi **thinkpad-t14** (`backend/`).

## Uruchomienie

```bash
# terminal 1 — backend
cd backend && go run ./cmd/api

# terminal 2 — frontend
cd frontend
npm install
cp .env.example .env.local   # opcjonalnie, domyślnie http://localhost:8080
npm run dev                  # http://localhost:3000
```

`npm run build` i `npm run typecheck` sprawdzają typy i budują wersję produkcyjną.

## Struktura

- `src/lib/api.ts` — typy i wywołania API (kontrakt: `agent/03-kontrakt-api.md`, `backend/api/openapi.yaml`)
- `src/lib/state.ts` — stan przewodnika i mapowanie na żądania
- `src/lib/presets.ts` — zmyślone scenariusze demo i symulowane dane „z ZUS”
- `src/components/` — kroki przewodnika, wynik, dokumenty
- `src/app/admin` — edycja parametrów prawnych

Zasady: frontend nie liczy zasiłków i nie wpisuje na sztywno stawek ani tygodni — bierze je z `GET /api/v1/catalog` i z odpowiedzi symulacji. mObywatel, e-ZLA, PUE/eZUS i wysyłka wniosku są oznaczone w UI jako symulacja.

Opis ekranów i prośby do backendu: `agent/06-frontend-legion-540-2026-11-21.md`.

## Windows — automatyczne uruchamianie i pobieranie zmian

Z katalogu repozytorium (np. `C:\Zus\ZUS`) w PowerShellu:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\dev-windows.ps1 -Branch claude/magical-pascal-brns04
```

Skrypt uruchamia backend (`:8080`) i frontend (`:3000`), otwiera przeglądarkę i co 30 s pobiera nowe commity z wybranej gałęzi
(bez `-Branch` — z aktualnie wybranej). Zmiany w `backend/` restartują serwer Go, zmiany w `frontend/package*.json` robią `npm ci`,
resztę frontendu `next dev` przeładowuje sam. Logi: `.dev-logs/`. Ctrl+C zatrzymuje oba serwery.
