The cancel dialog shows what the traveller gets back before they confirm: refund, fee and travel credit, with real cancellation-policy wording.

Standard travel-site tiers:
- 7+ days out → full refund
- 3–6 days → 75% refund + 10% fee + 15% travel credit
- 1–2 days → no refund + 25% fee + 25% travel credit
- same-day → no refund, no fee, no credit (total forfeit)

### Gap
Today's cancel dialog just says "are you sure?" Real travel sites always show you what you'll get back before you confirm.

### Scope
- Backend-owned policy logic via a new `GET /bookings/{id}/cancellation-preview` endpoint; the frontend fetches and displays the breakdown.
- Amounts are shown in credits, like every other price in the app.
- **Out of scope:** actual refund processing (there is no payment system).

### Touches
- `booking_system_backend/services/booking.py`
- `booking_system_backend/server.py`
- `booking_system_backend/schemas.py`
- `booking_system_backend/tests/test_services.py`
- `booking_system_frontend/src/pages/MyBookings.tsx`
- `booking_system_frontend/src/services/api.ts`

### Size
M · frontend and Python backend · about 6 files, around 200 lines. No schema change.

### Acceptance criteria
- [ ] Cancel dialog shows the refund / fee / credit breakdown before confirm
- [ ] Breakdown varies by days-to-departure per the documented policy
- [ ] Wording is clear and product-appropriate
- [ ] Policy helper is unit-tested in the backend

### Design notes
The breakdown block should feel like a real travel site, not a debug dump. A few things that help:
- A **policy tier badge** (e.g. "Full Refund ✓" or "Non-refundable") at the top of the block so the user knows their situation at a glance before reading the numbers
- A **segmented proportion bar** showing refund / fee / credit as colour-coded bands across the full price — makes the split visually immediate without arithmetic
- A **"You'll receive back" summary row** at the bottom, separated by a divider, showing the net refund so the user doesn't have to add it up themselves
- **Per-row icons** (e.g. arrow-return for refund, x-circle for fee, ticket for credit) to make each line scannable

### Implementation notes
- Departure time format varies by data source — test fixtures use `"YYYY-MM-DD HH:MM"` but the seeded database stores ISO 8601 with a UTC suffix (`"YYYY-MM-DDTHH:MM:SSZ"`). The preview service must handle both. Write at least one test using the exact format from `seed.py`.
- All seeded flights depart in 2099, so the running app only ever shows the "full refund" tier. Tests have to inject "now" to cover the others.
- Place the new route above the `FastApiMCP(app)` call in `server.py`. The MCP tool is generated from it.

### Verify
```bash
cd booking_system_backend && .venv/bin/python -m pytest
cd booking_system_frontend && npm run lint && npm run build
```
