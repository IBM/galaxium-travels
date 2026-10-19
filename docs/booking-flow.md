<!-- STAND-IN: replace with the diagram from the module 2 authoring run. -->
# Booking flow

## Booking through the hold service

This diagram shows how a traveler's seat goes from a quote to a hold to a confirmed booking across the front end, the Python back end, and the Java hold service.

```mermaid
sequenceDiagram
    participant FE as Front end (api.ts)
    participant PY as Python back end (server.py)
    participant JV as Java hold service
    participant DB as SQLite

    FE->>PY: POST /quotes
    PY->>JV: POST /api/v1/quotes
    JV-->>PY: quoteId
    PY-->>FE: quote
    FE->>PY: POST /quotes/{quote_id}/holds
    PY->>JV: POST /api/v1/quotes/{quoteId}/holds
    JV-->>PY: holdId, status HELD
    PY-->>FE: hold
    FE->>PY: POST /holds/{hold_id}/confirm
    PY->>JV: POST /api/v1/holds/{holdId}/confirm
    JV->>PY: POST /internal/bookings/from-hold
    PY->>DB: booking.book_flight() inserts booking, decrements seats
    PY-->>JV: booking
    JV-->>PY: status CONFIRMED, externalBookingReference
    PY-->>FE: confirmed hold
```
