# Backend (Go)

Rdzeń kalkulatora. Właściciel tej części: laptop **thinkpad-t14**. Frontend Next.js jest po stronie **legion-540** i nie powstaje na tej maszynie.

## Uruchomienie

```bash
cd backend
go test ./...
PORT=8080 go run ./cmd/api
```

API słucha na `http://localhost:8080`. Kontrakt: `api/openapi.yaml`. CORS jest otwarty, żeby aplikacja z drugiego laptopa mogła wołać lokalny serwer.

## Endpointy

- `GET /api/v1/health`
- `GET /api/v1/catalog` — wymiary i stawki do formularza
- `GET /api/v1/parameters` i `PUT /api/v1/admin/parameters`
- `POST /api/v1/calculations/simulate`
- `POST /api/v1/calculations/basis`
- `POST /api/v1/calculations/sickness`

Kwoty w żądaniach są w groszach (`1000000` = 10 000,00 zł). Odpowiedź podaje `grosze` i `zloty`.

Nieznane pole JSON kończy się kodem 400. Błąd reguły kończy się kodem 422 i `{ "error": { "code", "message" } }`.
