# Ask Mode Documentation Context

## Non-Obvious Structure

- **`booking_system_backend/` runs on port 8001 locally, but port 8080 inside Docker** — docker-compose maps 8001→8080. The `root_path="/api"` prefix is only active in Docker/behind the ALB.
- **MCP server is embedded in the Python backend** — `fastapi-mcp` auto-generates MCP tools at `/mcp` from all FastAPI routes. The Swagger UI is at `/docs` (or `/api/docs` in Docker).
- **Java service is a B2B feature (quotes/holds)** — it is in a Docker Compose `hold-service` profile and not started by default. Regular booking flow does not require it.
- **`e2e/` is a separate pytest project** with its own `.venv` and `requirements.txt`, distinct from the backend's venv.
- **Seat class "galaxium"** is the premium tier unique to this domain (not first-class/premium). Three tiers: economy, business, galaxium.
- **`base_price` is economy price**. Business = 2×, Galaxium = 3× (computed, not stored).
- **Datetimes are stored as strings** (`YYYY-MM-DD HH:MM`) in both SQLite models and Pydantic schemas — not Python `datetime` objects.
