# Issue #44 — Calendar Export (.ics) for Bookings

> **Tier 3 · ~1 hour · Full-stack (backend + frontend)**

## Goal

Add a `GET /bookings/{id}/export.ics` endpoint and an "Add to Calendar" button on the
`BookingCard` so users can save a flight event to Apple Calendar or Google Calendar
directly from the My Bookings page.

---

## What to build

### 1. Service function — `booking_system_backend/services/booking.py`

Add a new function `export_booking_ics(db, booking_id) -> str | ErrorResponse`.

- Query the `Booking` by `booking_id`; return an `ErrorResponse` (`BOOKING_NOT_FOUND`) if
  it doesn't exist.
- Join on the `Flight` to get `origin`, `destination`, `departure_time`, `arrival_time`.
- Build a plain-text iCalendar string (RFC 5545) — no third-party library needed.

Required VEVENT fields:

| Field         | Value                                                             |
|---------------|-------------------------------------------------------------------|
| `UID`         | `booking-{booking_id}@galaxium.travels`                          |
| `SUMMARY`     | `Galaxium Flight: {origin} → {destination}`                      |
| `LOCATION`    | `{origin} → {destination}`                                       |
| `DTSTART`     | `departure_time` converted to `YYYYMMDDTHHmmssZ` format          |
| `DTEND`       | `arrival_time` converted to `YYYYMMDDTHHmmssZ` format            |
| `DESCRIPTION` | `Booking #{booking_id} · {seat_class} class · {price_paid} GXC`  |

Minimal iCal skeleton:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Galaxium Travels//EN
BEGIN:VEVENT
UID:...
DTSTAMP:...
DTSTART:...
DTEND:...
SUMMARY:...
LOCATION:...
DESCRIPTION:...
END:VEVENT
END:VCALENDAR
```

`departure_time` and `arrival_time` are stored as `"YYYY-MM-DD HH:MM"` in the DB — parse
with `datetime.strptime(val, "%Y-%m-%d %H:%M")` and format with `strftime("%Y%m%dT%H%M%SZ")`.

---

### 2. REST endpoint — `booking_system_backend/server.py`

```python
@app.get("/bookings/{booking_id}/export.ics", tags=["Bookings"])
def export_booking_ics(booking_id: int, db: Session = Depends(get_db)):
    result = booking.export_booking_ics(db, booking_id)
    if isinstance(result, ErrorResponse):
        raise HTTPException(status_code=404, detail=result.error)
    return Response(
        content=result,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename=booking-{booking_id}.ics"}
    )
```

Import `Response` from `fastapi` at the top of the file.

---

### 3. MCP tool — `booking_system_backend/server.py`

Per project convention, every REST endpoint needs a matching MCP tool. Add it **before**
the `mcp_app = mcp.http_app()` line:

```python
@mcp.tool()
def export_booking_ics(booking_id: int) -> str:
    """Export a booking as an iCalendar (.ics) string.
    Returns a valid VCALENDAR document for the given booking_id,
    or raises an error if the booking does not exist."""
    db = SessionLocal()
    try:
        result = booking.export_booking_ics(db, booking_id)
        if isinstance(result, ErrorResponse):
            raise Exception(result.details or result.error)
        return result
    finally:
        db.close()
```

---

### 4. Tests — `booking_system_backend/tests/`

Add to **`test_services.py`** (service-level, uses `db_session`):

| Test | Asserts |
|------|---------|
| `test_export_ics_valid_booking` | Returns a `str`; contains `BEGIN:VCALENDAR`, `BEGIN:VEVENT`, correct `UID`, `SUMMARY`, `LOCATION` |
| `test_export_ics_booking_not_found` | Returns `ErrorResponse` with `error_code == "BOOKING_NOT_FOUND"` |

Add to **`test_rest.py`** (REST-level, uses `client`):

| Test | Asserts |
|------|---------|
| `test_export_ics_endpoint_200` | `GET /bookings/{id}/export.ics` → HTTP 200, `Content-Type: text/calendar`, body contains `BEGIN:VCALENDAR` |
| `test_export_ics_endpoint_404` | Non-existent ID → HTTP 404 |

Both test files already have the seed fixtures and patterns to follow — create a `Flight`
and a `Booking` inline, then call the endpoint or service function.

---

### 5. Frontend — `booking_system_frontend/src/components/bookings/BookingCard.tsx`

Add a calendar download handler and an "Add to Calendar" button alongside the
existing Cancel button, gated on `booking.status === 'booked'`:

```tsx
const handleAddToCalendar = () => {
  const a = document.createElement('a');
  a.href = `/api/bookings/${booking.booking_id}/export.ics`;
  a.download = `booking-${booking.booking_id}.ics`;
  a.click();
};
```

Render the button inside the `canCancel` block (or unconditionally for `'booked'` status):

```tsx
{booking.status === 'booked' && (
  <Button
    variant="secondary"
    size="sm"
    onClick={handleAddToCalendar}
    className="w-full"
  >
    Add to Calendar
  </Button>
)}
```

Place it **above** the Cancel button so it reads logically (calendar → cancel).

> The download is triggered via a temporary `<a download>` element — **not** Axios —
> because the browser must handle the file download natively.

---

## Files touched

| File | Change |
|------|--------|
| `booking_system_backend/services/booking.py` | + `export_booking_ics()` |
| `booking_system_backend/server.py` | + `export_booking_ics` MCP tool + REST endpoint |
| `booking_system_backend/tests/test_services.py` | + 2 service tests |
| `booking_system_backend/tests/test_rest.py` | + 2 REST tests |
| `booking_system_frontend/src/components/bookings/BookingCard.tsx` | + "Add to Calendar" button |

---

## Acceptance criteria (from issue)

- [ ] `GET /bookings/{id}/export.ics` → HTTP 200 with `Content-Type: text/calendar` and a valid iCalendar body
- [ ] `GET /bookings/{id}/export.ics` → HTTP 404 when booking ID does not exist
- [ ] VEVENT contains `SUMMARY`, `LOCATION`, `DTSTART`, `DTEND`, `DESCRIPTION`, `UID`
- [ ] Matching MCP tool added alongside the REST endpoint
- [ ] "Add to Calendar" button on active booking cards triggers a browser file download
- [ ] File opens correctly in Apple Calendar and Google Calendar
- [ ] `cd booking_system_backend && pytest` passes with new tests included

---

## Validation

```bash
# Run the full backend test suite
cd booking_system_backend && pytest

# Lint the frontend
cd booking_system_frontend && npm run lint
```
