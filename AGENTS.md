# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Structure

Two independent sub-projects, each run from its own directory:

- `booking_system_backend/` — Python/FastAPI + SQLAlchemy, SQLite (`booking.db`)
- `booking_system_frontend/` — React 19 + TypeScript + Vite + Tailwind CSS

## Running the Project

```bash
# Both servers together (bash only)
./start.sh                      # backend :8080, frontend :5173

# Backend only (from booking_system_backend/)
python server.py                # requires .venv activated

# Frontend only (from booking_system_frontend/)
npm run dev
```

Swagger UI: `http://localhost:8080/docs`  
Frontend API base URL: controlled by `VITE_API_URL` env var (defaults to `http://localhost:8080`)

## Backend Commands (run from `booking_system_backend/`)

```bash
python -m pytest tests/                        # all tests
python -m pytest tests/test_services.py -k "test_book_flight_business"  # single test
python -m pytest tests/ --cov=. --cov-report=term-missing  # with coverage
python -m py_compile models.py schemas.py      # syntax check
```

> Tests use an **in-memory SQLite DB** (not `booking.db`). `seed()` is patched to a no-op in `conftest.py`.

## Frontend Commands (run from `booking_system_frontend/`)

```bash
npm run dev
npm run build          # tsc -b && vite build
npm run lint           # eslint
npx tsc --noEmit -p tsconfig.app.json   # type-check only
```

## Schema Reset

The DB schema is never migrated — it is **recreated from scratch**. To apply model changes:

```bash
rm booking_system_backend/booking.db   # delete DB
# restart server — init_db() + seed() run automatically on lifespan startup
```

## Backend Patterns

- **Services return `ModelOut | ErrorResponse`** — never raise HTTP exceptions. Routes return the value directly; FastAPI serialises it. Always check `isinstance(result, ErrorResponse)` before treating as success.
- **Error codes** in use: `FLIGHT_NOT_FOUND`, `NO_SEATS_AVAILABLE`, `USER_NOT_FOUND`, `NAME_MISMATCH`, `BOOKING_NOT_FOUND`, `ALREADY_CANCELLED`.
- **Seat class routing** uses `SEAT_CLASS_COLUMN` dict in `services/booking.py` with `getattr`/`setattr` on the ORM object — do not hardcode column names when modifying seat counts.
- Pydantic response schemas require `model_config = ConfigDict(from_attributes=True)` (or `class Config: from_attributes = True`) to serialise SQLAlchemy ORM objects.
- The server also exposes an **MCP endpoint at `/mcp`** (via `fastmcp`) — keep MCP tool definitions in `server.py` in sync with REST route changes.
- `booking_time` is stored as an ISO string (`datetime.utcnow().isoformat()`), not a native datetime column.

## Frontend Patterns

- **All shared types** live in `src/types/index.ts` and must stay in sync with backend schemas. `SeatClass = "economy" | "business" | "galaxium"`.
- **`isErrorResponse()`** in `src/services/api.ts` is the canonical way to narrow `T | ErrorResponse` union returns from API calls.
- **`formatCurrency(amount)`** in `src/utils/formatters.ts` formats raw integers as USD (no cents conversion — `price` is already in dollars, e.g. `1000000` → `$1,000,000`).
- **`formatDate` / `formatTime` / `calculateDuration`** in the same file use `date-fns` `parseISO` — always pass ISO strings, not `Date` objects.
- API errors are normalised by an **Axios response interceptor** in `api.ts` — catch blocks receive an `ErrorResponse` object directly, not an Axios error.

## Frontend Styling

Custom Tailwind colours (defined in `tailwind.config.js`):

| Token | Hex | Usage |
|---|---|---|
| `space-dark` | `#030712` | page background |
| `space-blue` | `#0A1929` | secondary bg |
| `cosmic-purple` | `#6366F1` | primary accent / Business class |
| `nebula-pink` | `#EC4899` | secondary accent |
| `alien-green` | `#10B981` | success states |
| `solar-orange` | `#F59E0B` | warnings / Galaxium class |
| `star-white` | `#F9FAFB` | primary text / Economy class |

Reusable CSS component classes (from `src/index.css`): `.glass-card`, `.btn-primary`, `.btn-secondary`, `.input-field`.  
Background gradients: `bg-space-gradient`, `bg-cosmic-gradient`.
