# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-obvious architectural constraints

- **MCP and FastAPI share a lifespan** — `FastMCP` must be instantiated first; the combined lifespan is assembled via `mcp.http_app(lifespan=...)`. This ordering is load-bearing.
- **SQLite is intentionally ephemeral on ECS** — `DATABASE_URL` is deliberately unset in production; each container task starts with a fresh DB seeded by `seed.py`. Do not design features that assume persistent state across deployments.
- **Python proxies Java with HTTP 200 on error** — the proxy endpoints in `server.py` catch `httpx.HTTPError` and return `{"error": "..."}` with status 200. Any feature relying on HTTP error codes from proxy routes will silently fail.
- **Cross-service booking confirmation is synchronous** — on hold confirm, Java calls Python `/internal/bookings/from-hold` synchronously via `RestTemplate`. There is no queue or retry; a Python downtime during confirm loses the booking.
- **Hold expiry runs on Java scheduler, not Python** — `HoldExpirationScheduler` fires every 60 s; expired holds are never communicated back to Python. The two DBs can diverge.
- **Frontend hold state is client-side only** — `holdStorage.ts` uses `localStorage`; clearing the browser storage orphans holds in the Java service with no UI recovery path.
- **`SEED_DEMO_DATA=true` is destructive on restart** — re-seeding on every start means any data created in a previous run is wiped. Features that depend on persistent demo data must disable seeding.
- **Java hold service is opt-in via Docker profile** — `profiles: [hold-service]` in `docker-compose.yml`; the hold/quote UI features are silently broken when the profile is not active.
- **`docker-compose.e2e.yml` uses non-standard ports** — the e2e compose file remaps ports to avoid clashing with local dev; do not assume default port numbers in e2e test assertions.
