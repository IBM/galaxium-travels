# Booking Flow Sequence Diagram

Shows the complete end-to-end flow for a user booking a flight, spanning four
participants: the React UI (`booking_system_frontend`), the `api.ts` service
layer, the FastAPI server (`server.py`), the `booking.py` service, and the
SQLite database. A fifth participant — the Inventory Hold Service
(`booking_system_inventory_hold_service`) — is included as a **planned but not
yet implemented** step, derived from the `pom.xml` description. Those steps are
annotated with `[PLANNED]` throughout.

The diagram covers three implemented phases (browse flights, identify user,
confirm booking) and one planned phase (seat hold / price quote via the Java
Spring Boot microservice).

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant UI as React UI<br/>(booking_system_frontend)
    participant API as api.ts<br/>(src/services/api.ts)
    participant BE as FastAPI server<br/>(server.py :8080)
    participant SVC as booking.py<br/>(services/booking.py)
    participant DB as SQLite<br/>(booking.db)
    participant IHS as Inventory Hold Service<br/>(Java / Spring Boot :TBD)<br/>⚠️ PLANNED — not implemented

    Note over UI,DB: ── STEP 1: Browse flights (implemented) ──

    User->>UI: Opens Flights page
    UI->>API: getFlights()
    API->>BE: GET /flights
    BE->>DB: SELECT * FROM flights
    DB-->>BE: rows[]
    BE-->>API: FlightOut[]
    API-->>UI: Flight[]
    UI-->>User: Renders flight cards with price & seats_available

    Note over UI,DB: ── STEP 2: Identify user (implemented) ──

    User->>UI: Clicks "Book Now", enters name + email
    UI->>API: registerUser(name, email)<br/>or getUserByCredentials(name, email)
    API->>BE: POST /register  or  GET /user?name=&email=
    BE->>DB: INSERT user  or  SELECT user WHERE name+email
    DB-->>BE: User row
    BE-->>API: UserOut | ErrorResponse
    API-->>UI: User | ErrorResponse

    alt isErrorResponse(response)
        UI-->>User: Shows error toast
    else success
        UI-->>User: Stores user in localStorage (key: galaxium_user)
    end

    Note over UI,IHS: ── STEP 3: Seat hold / quote [PLANNED — not implemented] ──

    Note right of IHS: pom.xml description: "Reserves seats<br/>for a configurable TTL window so<br/>booking can complete without a<br/>race condition on seats_available"

    UI-->>IHS: [PLANNED] POST /holds<br/>{ flight_id, user_id, ttl_seconds }
    IHS-->>DB: [PLANNED] Decrement seats_available<br/>and persist Hold { hold_id, expires_at }
    DB-->>IHS: [PLANNED] Hold record
    IHS-->>UI: [PLANNED] HoldResponse { hold_id, price_quote, expires_at }
    UI-->>User: [PLANNED] Shows price quote + hold countdown timer

    Note over UI,DB: ── STEP 4: Confirm booking (implemented) ──

    User->>UI: Confirms booking in BookingModal
    UI->>API: bookFlight({ user_id, name, flight_id })
    API->>BE: POST /book  { user_id, name, flight_id }

    BE->>SVC: booking.book_flight(db, user_id, name, flight_id)

    SVC->>DB: SELECT * FROM flights WHERE flight_id = ?
    DB-->>SVC: Flight row (or none)

    alt flight not found
        SVC-->>BE: ErrorResponse(FLIGHT_NOT_FOUND)
        BE-->>API: ErrorResponse
        API-->>UI: ErrorResponse (interceptor normalises)
        UI-->>User: Error toast
    end

    SVC->>DB: Check seats_available >= 1
    alt seats_available < 1
        SVC-->>BE: ErrorResponse(NO_SEATS_AVAILABLE)
        BE-->>API: ErrorResponse
        UI-->>User: Error toast
    end

    SVC->>DB: SELECT * FROM users WHERE user_id = ? AND name = ?
    DB-->>SVC: User row (or none)

    alt user_id exists but name does not match
        SVC-->>BE: ErrorResponse(NAME_MISMATCH)
        BE-->>API: ErrorResponse
        UI-->>User: Error toast
    else user_id not found
        SVC-->>BE: ErrorResponse(USER_NOT_FOUND)
        BE-->>API: ErrorResponse
        UI-->>User: Error toast
    end

    Note right of IHS: [PLANNED] Hold service would be<br/>released here (DELETE /holds/{hold_id})<br/>or expire via TTL

    SVC->>DB: UPDATE flights SET seats_available = seats_available - 1
    SVC->>DB: INSERT INTO bookings (user_id, flight_id, status="booked", booking_time)
    DB-->>SVC: Booking row
    SVC-->>BE: BookingOut.model_validate(booking)
    BE-->>API: BookingOut { booking_id, user_id, flight_id, status, booking_time }
    API-->>UI: Booking
    UI-->>User: Success toast + booking confirmation
```
