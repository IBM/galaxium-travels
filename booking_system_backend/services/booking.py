from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models import Booking, Flight, User
from schemas import BookingOut, CancellationPreviewOut, ErrorResponse, SeatClass

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


def get_booking_by_id(db: Session, booking_id: int) -> Booking | None:
    """Return a single Booking ORM object by booking_id, or None if not found."""
    return db.query(Booking).filter(Booking.booking_id == booking_id).first()


def _parse_departure_time(raw: str) -> datetime:
    """Parse a departure_time string in either 'YYYY-MM-DD HH:MM' or ISO-8601 format."""
    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S.%fZ"):
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise ValueError(f"Unrecognised departure_time format: {raw!r}")


# Refund / fee / credit percentages by tier (refund_pct, fee_pct, credit_pct)
_CANCELLATION_TIERS = [
    (14, float('inf'), 100, 0,  0,   "full_refund"),
    (7,  13,           75,  10, 15,  "partial_refund"),
    (3,  6,            25,  25, 50,  "credit_heavy"),
    (0,  2,            0,   0,  0,   "no_refund"),
]


def compute_cancellation_preview(db: Session, booking_id: int) -> CancellationPreviewOut | ErrorResponse:
    """Compute a refund/fee/credit breakdown for cancelling booking_id without executing the cancellation."""
    booking_obj = get_booking_by_id(db, booking_id)
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

    flight_obj = db.query(Flight).filter(Flight.flight_id == booking_obj.flight_id).first()
    if not flight_obj:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"The flight for booking {booking_id} no longer exists.",
        )

    departure = _parse_departure_time(flight_obj.departure_time)
    now = datetime.now(tz=timezone.utc)
    days_to_departure = (departure - now).days  # integer floor via timedelta.days

    price = booking_obj.price_paid
    refund_pct = fee_pct = credit_pct = 0
    tier_name = "no_refund"
    for min_days, max_days, r_pct, f_pct, c_pct, name in _CANCELLATION_TIERS:
        if min_days <= days_to_departure <= max_days:
            refund_pct, fee_pct, credit_pct, tier_name = r_pct, f_pct, c_pct, name
            break

    refund_amount = int(price * refund_pct / 100)
    cancellation_fee = int(price * fee_pct / 100)
    travel_credit = int(price * credit_pct / 100)

    return CancellationPreviewOut(
        booking_id=booking_id,
        price_paid=price,
        refund_amount=refund_amount,
        cancellation_fee=cancellation_fee,
        travel_credit=travel_credit,
        days_to_departure=max(days_to_departure, 0),
        policy_tier=tier_name,
    )
