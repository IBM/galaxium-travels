# Issue #44 — Calendar Export (.ics) for Bookings

**Status:** Ready to implement  
**Scope:** ~1 hour · 4 files touched · no new dependencies  
**Label:** `tier-3` · `area/fullstack`

---

## Overview

Add a `GET /bookings/{id}/export.ics` endpoint that returns a valid iCalendar file (RFC 5545), and an "Add to Calendar" button on active booking cards that triggers a browser download.

---

## Files to Touch

| File | Change |
|---|---|
| `booking_system_backend/services/booking.py` | Add `get_booking_ics()` service function |
| `booking_system_backend/server.py` | Add REST endpoint + MCP tool |
| `booking_system_backend/tests/test_services.py` | Add `TestBookingIcsService` class (2 tests) |
| `booking_system_backend/tests/test_rest.py` | Add `TestIcsEndpoint` class (2 tests) |
| `booking_system_frontend/src/components/bookings/BookingCard.tsx` | Add "Add to Calendar" button |

---

## Step 1 — Service function (`booking.py`)

Add `get_booking_ics(db: Session, booking_id: int) -> str | ErrorResponse` at the bottom of [`booking_system_backend/services/booking.py`](../../booking_system_backend/services/booking.py).

**Logic:**

1. Query `db.query(Booking).filter(Booking.booking_id == booking_id).first()`.
2. If not found, return `ErrorResponse(error="BOOKING_NOT_FOUND", message="Booking not found")`.
3. Query the related `Flight` record via `booking.flight_id`.
4. Parse both `departure_time` and `arrival_time` using `datetime.fromisoformat()` after normalising the string:
   ```python
   def _parse_dt(s: str) -> datetime:
       return datetime.fromisoformat(s.replace("Z", "").replace("+00:00", "").replace(" ", "T"))
   ```
   Seed data stores times as `"2099-01-01 09:00"` (space-separated, no timezone); this handles both that and ISO 8601 `Z` variants.
5. Format timestamps as `YYYYMMDDTHHMMSSZ` by calling `.strftime("%Y%m%dT%H%M%SZ")`.
5. Make `_parse_dt` a module-level private helper (not nested inside `get_booking_ics`) so it's reusable and independently testable.
6. Format timestamps as `YYYYMMDDTHHMMSSZ` by calling `.strftime("%Y%m%dT%H%M%SZ")`. The `Z` suffix asserts UTC — acceptable for demo data with no real timezone context and ensures the `.ics` passes strict validator tools.
7. Build the iCalendar string manually (no third-party library). Use `\r\n` line endings (RFC 5545 §3.1).
8. Return the string.

**iCalendar template:**

```
BEGIN:VCALENDAR\r\n
VERSION:2.0\r\n
PRODID:-//Galaxium Travels//EN\r\n
BEGIN:VEVENT\r\n
UID:booking-{booking_id}@galaxium-travels\r\n
SUMMARY:Galaxium Travels: {origin} → {destination}\r\n
LOCATION:{origin} → {destination}\r\n
DTSTART:{dtstart}\r\n
DTEND:{dtend}\r\n
DESCRIPTION:Booking #{booking_id} | Flight #{flight_id} | {seat_class} class | {price_paid} credits\r\n
END:VEVENT\r\n
END:VCALENDAR\r\n
```

> **Note:** Long `DESCRIPTION` lines may exceed the RFC 5545 75-octet folding limit. For this demo codebase this is acceptable — add an inline comment noting it.

---

## Step 2 — REST endpoint + MCP tool (`server.py`)

Two changes to [`booking_system_backend/server.py`](../../booking_system_backend/server.py):

### 2a — Add `Response` to the FastAPI import (line 2)

```python
# Before
from fastapi import FastAPI, Depends, HTTPException, Query

# After
from fastapi import FastAPI, Depends, HTTPException, Query, Response
```

### 2b — Add the MCP tool (before line 108, where `mcp_app = mcp.http_app()`)

```python
@mcp.tool()
def get_booking_ics(booking_id: int) -> str:
    """Export a booking as an iCalendar (.ics) string."""
    db = SessionLocal()
    try:
        result = booking.get_booking_ics(db, booking_id)
        if isinstance(result, ErrorResponse):
            return f"Error: {result.message}"
        return result
    finally:
        db.close()
```

### 2c — Add the REST endpoint (after the existing booking endpoints, before the Java proxy section)

```python
@app.get("/bookings/{booking_id}/export.ics")
def export_booking_ics(booking_id: int, db: Session = Depends(get_db)):
    result = booking.get_booking_ics(db, booking_id)
    if isinstance(result, ErrorResponse):
        raise HTTPException(status_code=404, detail=result.message)
    return Response(
        content=result,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=booking-{booking_id}.ics"},
    )
```

---

## Step 3 — Frontend button (`BookingCard.tsx`)

Changes to [`booking_system_frontend/src/components/bookings/BookingCard.tsx`](../../booking_system_frontend/src/components/bookings/BookingCard.tsx):

### 3a — Update imports

```tsx
// Add CalendarPlus to the lucide-react import (CalendarPlus confirmed present in pinned version)
import { Plane, Calendar, CheckCircle, XCircle, Clock, Crown, Rocket, CalendarPlus } from 'lucide-react';
```

### 3b — Add the download handler (inside the component, after `canCancel`)

```tsx
const handleAddToCalendar = () => {
  const base = import.meta.env.VITE_API_URL || '/api';
  const url = `${base}/bookings/${booking.booking_id}/export.ics`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `booking-${booking.booking_id}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
```

The URL base reuses the same resolution logic as [`api.ts`](../../booking_system_frontend/src/services/api.ts) — the Vite dev proxy forwards `/api/*` to the backend, and production uses `VITE_API_URL` directly.

### 3c — Replace the action buttons section (lines 156–167)

Replace the current single Cancel button with a `flex` row:

```tsx
{/* Action Buttons */}
<div className="flex gap-2">
  <Button
    variant="secondary"
    size="sm"
    onClick={handleAddToCalendar}
    disabled={booking.status !== 'booked'}
    className="flex-1"
  >
    <CalendarPlus size={14} className="mr-1" />
    Add to Calendar
  </Button>
  {canCancel && (
    <Button
      variant="danger"
      size="sm"
      onClick={() => onCancel(booking.booking_id)}
      isLoading={isCancelling}
      className="flex-1"
    >
      Cancel Booking
    </Button>
  )}
</div>
```

The "Add to Calendar" button is always visible but disabled for non-`booked` statuses (i.e. `cancelled` and `completed`), preserving card layout consistency. The Cancel button continues to be gated on `canCancel`.

---

## Step 4 — Service tests (`test_services.py`)

Add `TestBookingIcsService` at the bottom of [`booking_system_backend/tests/test_services.py`](../../booking_system_backend/tests/test_services.py). Follow the existing pattern — create model instances directly via `db_session.add()`, commit, then call the service.

```python
class TestBookingIcsService:
    def _seed(self, db_session):
        """Seed one user, one flight, one booking and return the booking."""
        from models import User, Flight, Booking
        user = User(name="Test User", email="test@example.com")
        db_session.add(user)
        db_session.flush()
        flight_obj = Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000000, economy_seats_available=5,
            business_seats_available=3, galaxium_seats_available=1,
        )
        db_session.add(flight_obj)
        db_session.flush()
        b = Booking(
            user_id=user.user_id, flight_id=flight_obj.flight_id,
            seat_class="economy", price_paid=1000000, status="booked",
        )
        db_session.add(b)
        db_session.commit()
        return b

    def test_get_booking_ics_returns_valid_icalendar(self, db_session):
        b = self._seed(db_session)
        result = booking.get_booking_ics(db_session, b.booking_id)
        assert isinstance(result, str)
        assert "BEGIN:VCALENDAR" in result
        assert "BEGIN:VEVENT" in result
        assert "SUMMARY:" in result
        assert "DTSTART:" in result
        assert "DTEND:" in result
        assert "LOCATION:" in result
        assert "DESCRIPTION:" in result
        assert "UID:" in result
        assert "\r\n" in result  # RFC 5545 line endings

    def test_get_booking_ics_returns_error_for_unknown_id(self, db_session):
        from schemas import ErrorResponse
        result = booking.get_booking_ics(db_session, 999999)
        assert isinstance(result, ErrorResponse)
        assert result.error == "BOOKING_NOT_FOUND"
```

---

## Step 5 — REST tests (`test_rest.py`)

Add `TestIcsEndpoint` at the bottom of [`booking_system_backend/tests/test_rest.py`](../../booking_system_backend/tests/test_rest.py). The `client` fixture from [`conftest.py`](../../booking_system_backend/tests/conftest.py) is available — add seed data inline using `db_session.add()`.

```python
class TestIcsEndpoint:
    def _seed_booking(self, db_session):
        from models import User, Flight, Booking
        user = User(name="Test User", email="test@example.com")
        db_session.add(user)
        db_session.flush()
        f = Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000000, economy_seats_available=5,
            business_seats_available=3, galaxium_seats_available=1,
        )
        db_session.add(f)
        db_session.flush()
        b = Booking(
            user_id=user.user_id, flight_id=f.flight_id,
            seat_class="economy", price_paid=1000000, status="booked",
        )
        db_session.add(b)
        db_session.commit()
        return b

    def test_export_ics_returns_200_with_calendar_content(self, client, db_session):
        b = self._seed_booking(db_session)
        response = client.get(f"/bookings/{b.booking_id}/export.ics")
        assert response.status_code == 200
        assert "text/calendar" in response.headers["content-type"]
        assert "BEGIN:VCALENDAR" in response.text

    def test_export_ics_returns_404_for_unknown_id(self, client, db_session):
        response = client.get("/bookings/999999/export.ics")
        assert response.status_code == 404
```

---

## Step 6 — Validate

```bash
cd booking_system_backend && pytest
```

All existing tests plus the 4 new tests must pass. Then do a manual smoke test: start the backend with seed data, visit a booking card in the UI, click "Add to Calendar", and open the downloaded `.ics` in Apple Calendar or Google Calendar.

---

## Acceptance Criteria Checklist

- [ ] `GET /bookings/{id}/export.ics` returns HTTP 200 with `Content-Type: text/calendar` and a valid iCalendar body
- [ ] `GET /bookings/{id}/export.ics` returns HTTP 404 when booking ID does not exist
- [ ] Event contains `SUMMARY`, `LOCATION`, `DTSTART`, `DTEND`, `DESCRIPTION`, `UID`
- [ ] Matching MCP tool added alongside the REST endpoint
- [ ] "Add to Calendar" button on active booking cards triggers a browser file download
- [ ] Button is visible on all booking cards; disabled for non-`booked` statuses
- [ ] `cd booking_system_backend && pytest` passes with all new tests included
- [ ] Manual smoke test: `.ics` opens correctly in Apple Calendar or Google Calendar
