from datetime import datetime, timezone, date
from typing import Optional

from sqlalchemy.orm import Session

from models import Booking, Flight, User
from schemas import BookingOut, CancellationPreview, ErrorResponse, SeatClass

# Price multipliers for each seat class
SEAT_CLASS_MULTIPLIERS = {
    'economy': 1.0,
    'business': 2.5,
    'galaxium': 5.0
}


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


# ==================== Cancellation Policy ====================

# Accepted departure_time formats stored in the DB
_DEPARTURE_FORMATS = [
    "%Y-%m-%d %H:%M",      # legacy seed format: "2099-01-01 09:00"
    "%Y-%m-%dT%H:%M:%SZ",  # ISO-8601 UTC:        "2099-01-01T09:00:00Z"
    "%Y-%m-%dT%H:%M:%S",   # ISO-8601 no-tz:      "2099-01-01T09:00:00"
]


def _parse_departure_time(departure_time: str) -> Optional[datetime]:
    """Parse a departure_time string into a datetime, trying multiple formats.

    Returns None if no format matches, allowing callers to handle unparseable
    departure times gracefully (e.g. show 'unknown' days_until_departure).
    """
    for fmt in _DEPARTURE_FORMATS:
        try:
            return datetime.strptime(departure_time, fmt)
        except ValueError:
            continue
    return None


def _cancellation_policy(days_until_departure: int) -> dict:
    """Return refund/fee/credit percentages for the given days-until-departure.

    Tiers (plan spec):
      >= 30 days : full_refund    — 100% refund, 0% fee, 0% credit
      7–29 days  : partial_refund — 50% refund,  25% fee, 25% credit
      1–6 days   : fee_only       — 0% refund,   25% fee, 75% credit
      0 days     : forfeit        — 0% refund,   0% fee,  0% credit  (same-day total forfeit)
    """
    if days_until_departure >= 30:
        return {"tier": "full_refund", "refund_pct": 1.0, "fee_pct": 0.0, "credit_pct": 0.0}
    elif days_until_departure >= 7:
        return {"tier": "partial_refund", "refund_pct": 0.5, "fee_pct": 0.25, "credit_pct": 0.25}
    elif days_until_departure >= 1:
        return {"tier": "fee_only", "refund_pct": 0.0, "fee_pct": 0.25, "credit_pct": 0.75}
    else:
        return {"tier": "forfeit", "refund_pct": 0.0, "fee_pct": 0.0, "credit_pct": 0.0}


def get_cancellation_preview(db: Session, booking_id: int) -> CancellationPreview | ErrorResponse:
    """Return a refund/fee/credit preview for cancelling a booking.

    Looks up the booking and its flight, computes days_until_departure,
    applies the cancellation policy, and returns a CancellationPreview.
    Returns ErrorResponse when the booking is not found or already cancelled.
    """
    booking_obj = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking_obj:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found.",
        )
    if booking_obj.status == "cancelled":
        return ErrorResponse(
            error="Booking already cancelled",
            error_code="ALREADY_CANCELLED",
            details=f"Booking {booking_id} is already cancelled.",
        )

    # Determine days until departure
    flight = db.query(Flight).filter(Flight.flight_id == booking_obj.flight_id).first()
    days_until_departure: Optional[int] = None
    if flight:
        parsed = _parse_departure_time(flight.departure_time)
        if parsed is not None:
            today = date.today()
            departure_date = parsed.date()
            days_until_departure = (departure_date - today).days

    # Apply policy (fall back to forfeit when departure cannot be determined)
    if days_until_departure is not None:
        policy = _cancellation_policy(days_until_departure)
    else:
        policy = {"tier": "forfeit", "refund_pct": 0.0, "fee_pct": 0.0, "credit_pct": 0.0}

    price = booking_obj.price_paid
    refund_amount = int(price * policy["refund_pct"])
    cancellation_fee = int(price * policy["fee_pct"])
    travel_credit = int(price * policy["credit_pct"])

    return CancellationPreview(
        booking_id=booking_id,
        price_paid=price,
        cancellation_tier=policy["tier"],
        refund_amount=refund_amount,
        cancellation_fee=cancellation_fee,
        travel_credit=travel_credit,
        refund_pct=policy["refund_pct"],
        fee_pct=policy["fee_pct"],
        credit_pct=policy["credit_pct"],
        days_until_departure=days_until_departure,
    )
