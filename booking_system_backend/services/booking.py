from datetime import datetime, timezone
from typing import TypedDict

from sqlalchemy.orm import Session

from models import Booking, Flight, User
from schemas import BookingOut, CancellationPreview, ErrorResponse, SeatClass

# Price multipliers for each seat class
SEAT_CLASS_MULTIPLIERS = {
    'economy': 1.0,
    'business': 2.5,
    'galaxium': 5.0
}

# Cancellation policy tiers — single source of truth for runtime and tests.
# Each tier applies when hours_until_departure >= min_hours (checked in order; first match wins).
# refund_pct  — fraction of price_paid returned as cash
# fee_pct     — fraction kept as cancellation fee
# credit_pct  — fraction issued as travel credit (non-cash)


class _PolicyTier(TypedDict):
    min_hours: int
    label: str
    refund_pct: float
    fee_pct: float
    credit_pct: float


CANCELLATION_POLICY_TIERS: list[_PolicyTier] = [
    {
        "min_hours": 72,
        "label": "Full Refund",
        "refund_pct": 1.0,
        "fee_pct": 0.0,
        "credit_pct": 0.0,
    },
    {
        "min_hours": 24,
        "label": "Partial Refund",
        "refund_pct": 0.5,
        "fee_pct": 0.25,
        "credit_pct": 0.25,
    },
    {
        "min_hours": 2,
        "label": "Travel Credit Only",
        "refund_pct": 0.0,
        "fee_pct": 0.5,
        "credit_pct": 0.5,
    },
    {
        "min_hours": 0,
        "label": "No Refund",
        "refund_pct": 0.0,
        "fee_pct": 1.0,
        "credit_pct": 0.0,
    },
]


def book_flight(db: Session, user_id: int, name: str, flight_id: int, seat_class: SeatClass = 'economy') -> BookingOut | ErrorResponse:
    """Book a seat on a specific flight for a user in the specified seat class."""
    # Validate seat class
    if seat_class not in SEAT_CLASS_MULTIPLIERS:
        return ErrorResponse(
            error="Invalid seat class",
            error_code="INVALID_SEAT_CLASS",
            details=f"Seat class '{seat_class}' is not valid. Valid options are: economy, business, galaxium."
        )
    
    # Check flight exists
    flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"The specified flight_id {flight_id} does not exist in our system. Please check the flight_id or use list_flights to see available flights."
        )

    # Check seats available for the specific class
    if seat_class == 'economy':
        seats_available = flight.economy_seats_available
    elif seat_class == 'business':
        seats_available = flight.business_seats_available
    else:  # galaxium
        seats_available = flight.galaxium_seats_available
    
    if seats_available < 1:
        return ErrorResponse(
            error=f"No {seat_class} seats available",
            error_code="NO_SEATS_AVAILABLE",
            details=f"The flight has no available seats in {seat_class} class. Please try a different class or check other flights."
        )

    # Check user exists and name matches
    user = db.query(User).filter(User.user_id == user_id, User.name == name).first()
    if not user:
        existing_user = db.query(User).filter(User.user_id == user_id).first()
        if existing_user:
            return ErrorResponse(
                error="Name mismatch",
                error_code="NAME_MISMATCH",
                details=f"User ID {user_id} exists but the name '{name}' does not match the registered name '{existing_user.name}'. Please verify the user's name or use the correct name for this user ID."
            )
        else:
            return ErrorResponse(
                error="User not found",
                error_code="USER_NOT_FOUND",
                details=f"User with ID {user_id} is not registered in our system. The user might need to register first, or you may need to check if the user_id is correct."
            )

    # Calculate price based on seat class
    price_paid = int(flight.base_price * SEAT_CLASS_MULTIPLIERS[seat_class])

    # Decrement the correct seat class counter
    if seat_class == 'economy':
        flight.economy_seats_available -= 1
    elif seat_class == 'business':
        flight.business_seats_available -= 1
    else:  # galaxium
        flight.galaxium_seats_available -= 1

    # Create booking
    new_booking = Booking(
        user_id=user_id,
        flight_id=flight_id,
        status="booked",
        booking_time=datetime.now(tz=timezone.utc).isoformat(),
        seat_class=seat_class,
        price_paid=price_paid
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return BookingOut.model_validate(new_booking)


def cancel_booking(db: Session, booking_id: int) -> BookingOut | ErrorResponse:
    """Cancel an existing booking by its booking_id and restore seat to correct class."""
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found. The booking may have been deleted or the booking_id may be incorrect. Please verify the booking_id or check if the booking exists."
        )

    if booking.status == "cancelled":
        return ErrorResponse(
            error="Booking already cancelled",
            error_code="ALREADY_CANCELLED",
            details=f"Booking {booking_id} is already cancelled and cannot be cancelled again. The booking status is currently '{booking.status}'. If you need to make changes, please contact support."
        )

    # Restore seat to the correct class
    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    if flight:
        if booking.seat_class == 'economy':
            flight.economy_seats_available += 1
        elif booking.seat_class == 'business':
            flight.business_seats_available += 1
        elif booking.seat_class == 'galaxium':
            flight.galaxium_seats_available += 1

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


def get_bookings(db: Session, user_id: int) -> list[BookingOut]:
    """Retrieve all bookings for a specific user."""
    bookings = db.query(Booking).filter(Booking.user_id == user_id).all()
    return [BookingOut.model_validate(b) for b in bookings]


# ---------------------------------------------------------------------------
# Cancellation helpers
# ---------------------------------------------------------------------------

# Date formats observed in seed data and test fixtures.
_DEPARTURE_FORMATS = [
    "%Y-%m-%dT%H:%M:%SZ",   # ISO 8601 UTC with Z  (seed data uses this)
    "%Y-%m-%dT%H:%M:%S",    # ISO 8601 no timezone
    "%Y-%m-%d %H:%M",       # legacy format stored by older fixtures
]


def _parse_departure(departure_time_str: str) -> datetime:
    """Parse a departure time string into a naive UTC datetime.

    Tries each format in _DEPARTURE_FORMATS; raises ValueError if none match.
    """
    for fmt in _DEPARTURE_FORMATS:
        try:
            return datetime.strptime(departure_time_str, fmt)
        except ValueError:
            continue
    raise ValueError(
        f"Unrecognised departure_time format: '{departure_time_str}'. "
        f"Expected one of: {_DEPARTURE_FORMATS}"
    )


def compute_cancellation_policy(price: int, departure_time_str: str) -> CancellationPreview:
    """Compute refund/fee/credit breakdown for a given price and departure time.

    Selects the first tier whose min_hours threshold is satisfied.  All
    amounts are rounded to the nearest integer and guaranteed to sum to price.
    """
    departure_dt = _parse_departure(departure_time_str)
    now_naive = datetime.now(tz=timezone.utc).replace(tzinfo=None)
    hours_until = (departure_dt - now_naive).total_seconds() / 3600.0

    matched = CANCELLATION_POLICY_TIERS[-1]  # fallback: "No Refund"
    for tier in CANCELLATION_POLICY_TIERS:
        if hours_until >= tier["min_hours"]:
            matched = tier
            break

    refund_amount = round(price * matched["refund_pct"])
    fee_amount = round(price * matched["fee_pct"])
    credit_amount = price - refund_amount - fee_amount  # absorbs rounding remainder

    return CancellationPreview(
        booking_id=0,          # caller fills this in
        price_paid=price,
        tier_label=matched["label"],
        refund_amount=refund_amount,
        fee_amount=fee_amount,
        credit_amount=credit_amount,
        refund_pct=matched["refund_pct"],
        fee_pct=matched["fee_pct"],
        credit_pct=matched["credit_pct"],
    )


def get_cancellation_preview(db: Session, booking_id: int) -> CancellationPreview | ErrorResponse:
    """Return a cancellation cost breakdown for an existing booking without mutating state."""
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found.",
        )

    if booking.status == "cancelled":
        return ErrorResponse(
            error="Booking already cancelled",
            error_code="ALREADY_CANCELLED",
            details=f"Booking {booking_id} is already cancelled; no refund preview available.",
        )

    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Associated flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"Flight {booking.flight_id} referenced by booking {booking_id} was not found.",
        )

    preview = compute_cancellation_policy(int(booking.price_paid), str(flight.departure_time))
    preview.booking_id = booking_id
    return preview
