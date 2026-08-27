# Class Diagram

Covers the three SQLAlchemy ORM models (`User`, `Flight`, `Booking`) defined in
`booking_system_backend/models.py`, the five Pydantic schemas (`UserOut`,
`UserRegistration`, `FlightOut`, `BookingOut`, `BookingRequest`, `ErrorResponse`)
defined in `booking_system_backend/schemas.py`, and a `BookingStatus`
pseudo-enumeration derived from the string literals used across the codebase.
Relationships show FK associations between ORM models and the serialisation
dependency from each ORM model to its corresponding `*Out` schema.

> **Note:** `BookingStatus` does not exist as a Python `enum` class. It is
> represented here to document the three known string values used for
> `Booking.status`; there is no DB-level constraint enforcing them.

```mermaid
classDiagram

    %% ── Pseudo-enum (string literals only; no Python enum exists) ──
    class BookingStatus {
        <<enumeration>>
        booked
        cancelled
        completed
    }

    %% ── ORM Models (SQLAlchemy / SQLite) ────────────────────────────
    class User {
        <<ORM>>
        +int user_id PK
        +str name
        +str email UNIQUE
    }

    class Flight {
        <<ORM>>
        +int flight_id PK
        +str origin
        +str destination
        +str departure_time
        +str arrival_time
        +int price
        +int seats_available
    }

    class Booking {
        <<ORM>>
        +int booking_id PK
        +int user_id FK
        +int flight_id FK
        +str status
        +str booking_time
    }

    %% ── Pydantic Schemas ─────────────────────────────────────────────
    class UserOut {
        <<Schema>>
        +int user_id
        +str name
        +str email
        +model_validate(orm_obj) UserOut$
    }

    class UserRegistration {
        <<Schema>>
        +str name
        +EmailStr email
    }

    class FlightOut {
        <<Schema>>
        +int flight_id
        +str origin
        +str destination
        +str departure_time
        +str arrival_time
        +int price
        +int seats_available
        +model_validate(orm_obj) FlightOut$
    }

    class BookingOut {
        <<Schema>>
        +int booking_id
        +int user_id
        +int flight_id
        +str status
        +str booking_time
        +model_validate(orm_obj) BookingOut$
    }

    class BookingRequest {
        <<Schema>>
        +int user_id
        +str name
        +int flight_id
    }

    class ErrorResponse {
        <<Schema>>
        +bool success = False
        +str error
        +str error_code
        +str details
    }

    %% ── ORM relationships ────────────────────────────────────────────
    User "1" --> "0..*" Booking : "places"
    Flight "1" --> "0..*" Booking : "fulfilled by"

    %% ── Schema mirrors ORM (from_attributes = True) ─────────────────
    User ..> UserOut : "serialises to"
    Flight ..> FlightOut : "serialises to"
    Booking ..> BookingOut : "serialises to"

    %% ── status field uses BookingStatus literals ─────────────────────
    Booking ..> BookingStatus : "status value"
    BookingOut ..> BookingStatus : "status value"
```
