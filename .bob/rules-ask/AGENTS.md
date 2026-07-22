# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-obvious documentation context

- **`server.py` is the single entry point for both REST and MCP** — it wires FastAPI + FastMCP together; REST and MCP tool docs are co-located there, not split.
- **Service layer has no I/O except DB** — `services/{booking,flight,user}.py` are pure business logic; all HTTP and MCP plumbing lives in `server.py`.
- **Error codes are documented in return values, not exceptions** — consult `ErrorResponse` in [`schemas.py`](../../booking_system_backend/schemas.py) for the full set of `error_code` strings.
- **Tailwind color names are space-themed aliases** — `cosmic-purple`, `nebula-pink`, `alien-green`, etc. are defined in [`tailwind.config.js`](../../booking_system_frontend/tailwind.config.js); standard Tailwind color names are not used.
- **Hold flow spans two services** — the quote→hold→confirm lifecycle involves both Python (`server.py` proxy endpoints) and Java (`HoldService`, `QuoteService`); neither service alone documents the full flow. See `e2e/test_holds.py` for the authoritative end-to-end sequence.
- **Java `application.properties`** — `hold.duration.minutes=15` and the expiry scheduler interval (60 s) are the key tuning knobs; changing them requires updating `e2e/test_holds.py` timeouts.
- **`holds.db` and `booking.db` are committed seed artefacts** — do not treat them as generated files; they bootstrap local dev.
