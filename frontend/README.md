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
npm run dev                  # http://localhost:3000 — wstęp; kalkulator jest pod /przewodnik
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

## Windows — uruchamianie dwuklikiem

Pliki w katalogu głównym repozytorium (np. `C:\Zus\ZUS`):

| Plik | Kiedy | Co robi |
| --- | --- | --- |
| `Setup-Przewodnik.bat` | raz, na początku | Instaluje Git, Go i Node.js LTS przez `winget` (jeśli brak), robi `go mod download` i `npm ci`, tworzy skrót „Przewodnik ZUS” na pulpicie. Z `/autostart` dodaje też skrót do Autostartu. |
| `Start-Przewodnik.bat` (skrót „Przewodnik ZUS”) | za każdym razem | Uruchamia `scripts/dev-windows.ps1`: backend `:8080`, frontend `:3000` w trybie `next dev`, otwiera przeglądarkę, co 15 s robi `git pull --ff-only` na gałęzi tego checkoutu. Kopia pobrana z `main` śledzi `main`. Kopia na gałęzi Claude śledzi tę gałąź. |

Zachowanie po pobraniu zmian: `backend/*` → restart Go; `frontend/package*.json` → `npm ci` + restart Next.js; pozostałe pliki frontendu → hot reload w przeglądarce; `scripts/dev-windows.ps1` lub `*.bat` → skrypt kończy się kodem 3, a `.bat` uruchamia go ponownie. Lokalne zmiany nie są nadpisywane (tylko fast-forward). Logi: `.dev-logs/`.

Skrypty `.ps1` i `.bat` muszą zostać w ASCII z końcami linii CRLF (pilnuje tego `.gitattributes`) — Windows PowerShell 5.1 czyta UTF-8 bez BOM jako ANSI.
