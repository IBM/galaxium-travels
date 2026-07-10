# Issue #44 — Calendar Export (.ics) for Bookings

**Labels:** area/fullstack · enhancement · roadmap · tier-3  
**Est.:** ~1 hour  
**Branch:** `feature/44-ics-export`

## Overview

Add `GET /bookings/{id}/export.ics` to the Python backend and an **"Add to Calendar"** download button inside `BookingCard.tsx`, gated on `status === 'booked'`. No third-party libraries needed on either side.

## Files Touched

| File | Change |
|------|--------|
| `booking_system_backend/services/booking.py` | New `get_booking_ics()` service function |
| `booking_system_backend/server.py` | New REST endpoint + matching MCP tool |
| `booking_system_backend/tests/test_services.py` | Unit tests for the service function |
| `booking_system_backend/tests/test_rest.py` | REST tests for 200/404 responses |
| `booking_system_frontend/src/components/bookings/BookingCard.tsx` | "Add to Calendar" button + download handler |

## Implementation Steps

### Step 1 — Backend: Add `get_booking_ics()` service function
**File:** `booking_system_backend/services/booking.py`

Add a new function that takes `db` and `booking_id`. It queries `Booking` joined with `Flight` (same pattern as `cancel_booking()` which already does `db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()`), and returns either an `ErrorResponse` (booking not found) or a `str` containing the iCalendar payload.

The iCalendar text is built via plain string formatting — no library needed (RFC 5545):

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Galaxium Travels//Booking System//EN
BEGIN:VEVENT
UID:booking-{booking_id}@galaxium-travels
DTSTAMP:{now_utc formatted as YYYYMMDDTHHmmssZ}
DTSTART:{flight.departure_time formatted as YYYYMMDDTHHmmssZ}
DTEND:{flight.arrival_time formatted as YYYYMMDDTHHmmssZ}
SUMMARY:Galaxium Flight {flight.flight_id} – {origin} to {destination}
LOCATION:{origin} → {destination}
DESCRIPTION:Booking #{booking_id}\nSeat class: {seat_class}\nPrice: {price_paid} credits
END:VEVENT
END:VCALENDAR
```

> **Date parsing:** Flight times are stored as `"2099-01-01 09:00"` strings (`models.py`). Parse with `datetime.strptime(t, "%Y-%m-%d %H:%M")` and format to iCal with `strftime("%Y%m%dT%H%M%SZ")`. Treat all times as UTC (consistent with the ISO 8601 seed data note in the issue).

Return type: `str | ErrorResponse` — consistent with the existing pattern in this module.

---

### Step 2 — Backend: Add REST endpoint in `server.py`
**File:** `booking_system_backend/server.py` (after the existing bookings endpoints, ~line 260)

```python
from fastapi.responses import Response

@app.get("/bookings/{booking_id}/export.ics", tags=["Bookings"])
def export_booking_ics(booking_id: int, db: Session = Depends(get_db)):
    """Export a booking as an iCalendar (.ics) file."""
    result = booking.get_booking_ics(db, booking_id)
    if isinstance(result, ErrorResponse):
        raise HTTPException(status_code=404, detail=result.model_dump())
    return Response(
        content=result,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=booking-{booking_id}.ics"}
    )
```

> **Import note:** `Response` must be imported from `fastapi.responses`. Add it alongside the existing `FastAPI, Depends, HTTPException` import at line 2.

---

### Step 3 — MCP: Add matching MCP tool in `server.py`
**File:** `booking_system_backend/server.py` (in the MCP section, before `mcp_app = mcp.http_app()` ~line 107)

```python
@mcp.tool()
def export_booking_ics(booking_id: int) -> str:
    """Export a booking as an iCalendar (.ics) string.
    Returns the iCalendar text for the booking, suitable for saving as a .ics file.
    Raises an error if the booking is not found."""
    db = SessionLocal()
    try:
        result = booking.get_booking_ics(db, booking_id)
        if isinstance(result, ErrorResponse):
            raise Exception(result.details or result.error)
        return result
    finally:
        db.close()
```

---

### Step 4 — Frontend: Add "Add to Calendar" button to `BookingCard.tsx`
**File:** `booking_system_frontend/src/components/bookings/BookingCard.tsx`

Add a handler using a temporary `<a download>` element (per issue spec — not Axios):

```tsx
const handleAddToCalendar = () => {
  const url = `${import.meta.env.VITE_API_URL || '/api'}/bookings/${booking.booking_id}/export.ics`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `booking-${booking.booking_id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

Render alongside the existing Cancel button, gated on `canCancel`. Import `CalendarPlus` from `lucide-react` (already a dependency):

```tsx
{canCancel && (
  <div className="flex gap-2">
    <Button variant="secondary" size="sm" onClick={handleAddToCalendar} className="flex-1">
      <CalendarPlus size={14} className="mr-1" /> Add to Calendar
    </Button>
    <Button variant="danger" size="sm" onClick={() => onCancel(booking.booking_id)}
      isLoading={isCancelling} className="flex-1">
      Cancel Booking
    </Button>
  </div>
)}
```

> Check what variants the `Button` component supports before using `"secondary"` — read `src/components/common/Button.tsx` first.

---

### Step 5 — Tests: Service unit tests in `test_services.py`
**File:** `booking_system_backend/tests/test_services.py`

Add a `TestBookingIcsService` class with three cases (following existing fixture/class pattern):

- `test_get_booking_ics_returns_string` — valid booking returns a `str` starting with `BEGIN:VCALENDAR`
- `test_get_booking_ics_contains_required_fields` — checks for `SUMMARY`, `LOCATION`, `DTSTART`, `DTEND`, `DESCRIPTION`, `UID`
- `test_get_booking_ics_not_found` — missing booking returns `ErrorResponse`

---

### Step 6 — Tests: REST tests in `test_rest.py`
**File:** `booking_system_backend/tests/test_rest.py`

Add a `TestBookingIcsEndpoint` class with two tests:

- `test_export_ics_returns_200_with_content_type` — creates user + flight + booking, calls `GET /bookings/{id}/export.ics`, asserts HTTP 200, `Content-Type: text/calendar`, and `Content-Disposition` header present
- `test_export_ics_returns_404_when_not_found` — calls with a nonexistent booking ID, asserts HTTP 404

## Data Shape Notes

| Field | Source | ICS Field |
|-------|--------|-----------|
| `flight.departure_time` | `"2099-01-01 09:00"` string (`models.py`) | `DTSTART` |
| `flight.arrival_time` | `"2099-01-01 17:00"` string | `DTEND` |
| `flight.origin` / `flight.destination` | `Flight` model | `SUMMARY`, `LOCATION` |
| `booking.booking_id` | `Booking` model | `UID`, `DESCRIPTION` |
| `booking.seat_class` + `booking.price_paid` | `Booking` model | `DESCRIPTION` |

## Acceptance Criteria

- [ ] `GET /bookings/{id}/export.ics` returns HTTP 200 with `Content-Type: text/calendar` and a valid iCalendar body
- [ ] `GET /bookings/{id}/export.ics` returns HTTP 404 when booking ID does not exist
- [ ] Event contains `SUMMARY`, `LOCATION`, `DTSTART`, `DTEND`, `DESCRIPTION`, `UID`
- [ ] Matching MCP tool added alongside the REST endpoint
- [ ] "Add to Calendar" button on active booking cards triggers a browser file download
- [ ] File opens correctly in Apple Calendar and Google Calendar
- [ ] `cd booking_system_backend && pytest` passes with new tests included

## Validation

```bash
cd booking_system_backend && pytest
cd booking_system_frontend && npm run lint
```
