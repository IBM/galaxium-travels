# Booking through the hold service

This diagram shows the full request path when a traveler quotes, holds, and confirms a seat — including the Java hold service's callback to `/internal/bookings/from-hold` that creates the final booking record in the Python database.

```mermaid
sequenceDiagram
    actor T as Traveler
    participant FE as Frontend<br/>api.ts
    participant PY as Python FastAPI<br/>server.py
    participant JAVA_QC as QuoteController<br/>(Java)
    participant JAVA_QS as QuoteService<br/>(Java)
    participant JAVA_HC as HoldController<br/>(Java)
    participant JAVA_HS as HoldService<br/>(Java)
    participant PY_CB as Python FastAPI<br/>/internal/bookings/from-hold
    participant PY_SVC as booking.book_flight<br/>(Python service)
    participant DB as SQLite<br/>(Python DB)

    %% ── PHASE 1: CREATE QUOTE ──────────────────────────────────────
    T->>FE: Select flight, seat class, click "Get Quote"
    FE->>PY: POST /quotes<br/>{ flightId, seatClass, quantity, travelerId, travelerName }
    Note over FE: createQuote() in api.ts:167<br/>assertNotProxyError() guards HTTP-200 errors
    PY->>JAVA_QC: POST /api/v1/quotes<br/>(httpx proxy, server.py:246)
    JAVA_QC->>JAVA_QS: createQuote(request)
    Note over JAVA_QS: Generates quoteId (Q-YYYY-NNNNNN)<br/>Calls PricingService.calculatePrice()<br/>Sets expiresAt = now + 24h<br/>Persists Quote { status: CREATED }
    JAVA_QS-->>JAVA_QC: Quote
    JAVA_QC-->>PY: 201 Quote { quoteId, totalPrice, expiresAt, … }
    PY-->>FE: 201 Quote (pass-through)
    FE-->>T: Show quoted price

    %% ── PHASE 2: CREATE HOLD ───────────────────────────────────────
    T->>FE: Click "Hold Seat"
    FE->>PY: POST /quotes/{quoteId}/holds
    Note over FE: createHold(quoteId) in api.ts:179<br/>assertNotProxyError() guards HTTP-200 errors
    PY->>JAVA_HC: POST /api/v1/quotes/{quoteId}/holds<br/>(httpx proxy, server.py:279)
    JAVA_HC->>JAVA_HS: createHold(quoteId)
    Note over JAVA_HS: Looks up Quote — throws 404 if missing<br/>Checks quote not expired<br/>Generates holdId (H-YYYY-NNNNNN)<br/>Sets reservedUntil = now + 15 min<br/>Persists Hold { status: HELD }<br/>Writes CREATED audit event
    JAVA_HS-->>JAVA_HC: Hold
    JAVA_HC-->>PY: 201 Hold { holdId, reservedUntil, status: HELD }
    PY-->>FE: 201 Hold (pass-through)
    FE-->>T: Show hold timer (15 min countdown)

    %% ── PHASE 3: CONFIRM HOLD ──────────────────────────────────────
    T->>FE: Click "Confirm Booking"
    FE->>PY: POST /holds/{holdId}/confirm
    Note over FE: confirmHold(holdId) in api.ts:191<br/>assertNotProxyError() guards HTTP-200 errors
    PY->>JAVA_HC: POST /api/v1/holds/{holdId}/confirm<br/>(httpx proxy, server.py:309)
    JAVA_HC->>JAVA_HS: confirmHold(holdId)
    Note over JAVA_HS: Looks up Hold — throws 404 if missing<br/>Guards: status must be HELD<br/>Guards: reservedUntil must be in future<br/>Fetches parent Quote for traveler/flight data

    %% ── PHASE 4: CALLBACK → PYTHON BOOKING ────────────────────────
    JAVA_HS->>PY_CB: POST /internal/bookings/from-hold<br/>{ travelerId, travelerName, flightId, seatClass }<br/>(PythonBackendClient.java:30)
    Note over PY_CB: create_booking_from_hold() in server.py:221<br/>Unpacks dict, calls booking.book_flight()
    PY_CB->>PY_SVC: book_flight(db, user_id, name, flight_id, seat_class)
    Note over PY_SVC: Validates seat class<br/>Checks flight exists (404 if not)<br/>Checks seats available (409 if none)<br/>Checks user exists + name matches (404/409)<br/>Computes price_paid = base_price × multiplier<br/>Decrements seat counter for class<br/>INSERTs Booking { status: "booked" }
    PY_SVC->>DB: INSERT booking<br/>UPDATE flight seats_available
    DB-->>PY_SVC: Booking row
    PY_SVC-->>PY_CB: BookingOut { booking_id, status: "booked", … }
    PY_CB-->>JAVA_HS: 200 BookingOut

    Note over JAVA_HS: Sets hold.status = CONFIRMED<br/>Sets hold.externalBookingReference = booking_id<br/>Writes CONFIRMED audit event
    JAVA_HS-->>JAVA_HC: Hold { status: CONFIRMED, externalBookingReference }
    JAVA_HC-->>PY: 200 Hold (pass-through)
    PY-->>FE: 200 Hold (pass-through)
    FE-->>T: Show booking confirmation + booking_id
```
