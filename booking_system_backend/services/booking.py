from datetime import datetime, timezone

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


# Supported departure_time string formats (seed data uses ISO-Z, test fixtures use "YYYY-MM-DD HH:MM")
_DEPARTURE_TIME_FORMATS = [
    "%Y-%m-%d %H:%M",
    "%Y-%m-%dT%H:%M:%SZ",
    "%Y-%m-%dT%H:%M:%S",
]


def compute_cancellation_preview(price_paid: int, departure_time: str) -> CancellationPreview:
    """Compute the cancellation-policy breakdown for a booking.

    Days-to-departure is calculated as timedelta.days (integer floor), matching the
    policy tier table exactly.  Current time reference is datetime.utcnow() — a future
    cleanup should switch to datetime.now(timezone.utc) once Python 3.12+ is required.

    Policy tiers:
      7+   days  → 100% cash refund, 0% fee, 0% credit
      3–6  days  → 75% refund, 10% fee, 15% credit
      1–2  days  → 0% refund, 25% fee, 25% credit
      0    days  → 0% refund, 0% fee, 0% credit (total forfeit)

    Raises ValueError for unrecognised departure_time formats.
    """
    parsed: datetime | None = None
    for fmt in _DEPARTURE_TIME_FORMATS:
        try:
            parsed = datetime.strptime(departure_time, fmt)
            break
        except ValueError:
            continue
    if parsed is None:
        raise ValueError(
            f"Unrecognised departure_time format: {departure_time!r}. "
            f"Expected one of: {_DEPARTURE_TIME_FORMATS}"
        )

    days_to_departure = (parsed - datetime.utcnow()).days  # integer floor via timedelta.days

    if days_to_departure >= 7:
        tier_label = "Full Refund"
        refund_pct, fee_pct, credit_pct = 1.0, 0.0, 0.0
    elif days_to_departure >= 3:
        tier_label = "Partial Refund"
        refund_pct, fee_pct, credit_pct = 0.75, 0.10, 0.15
    elif days_to_departure >= 1:
        tier_label = "Non-refundable"
        refund_pct, fee_pct, credit_pct = 0.0, 0.25, 0.25
    else:
        tier_label = "Forfeit"
        refund_pct, fee_pct, credit_pct = 0.0, 0.0, 0.0

    refund_amount = int(price_paid * refund_pct)
    fee_amount = int(price_paid * fee_pct)
    credit_amount = int(price_paid * credit_pct)
    total_forfeited = price_paid - refund_amount - credit_amount

    return CancellationPreview(
        tier_label=tier_label,
        refund_amount=refund_amount,
        fee_amount=fee_amount,
        credit_amount=credit_amount,
        total_forfeited=total_forfeited,
        price_paid=price_paid,
    )


def get_cancellation_preview(db: Session, booking_id: int) -> CancellationPreview | ErrorResponse:
    """Return a cancellation-policy preview for an existing booking."""
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found.",
        )
    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"Flight for booking {booking_id} could not be found.",
        )
    return compute_cancellation_preview(int(booking.price_paid), str(flight.departure_time))
