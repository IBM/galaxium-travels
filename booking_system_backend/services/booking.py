from sqlalchemy.orm import Session
from datetime import datetime
from models import User, Flight, Booking
from schemas import BookingOut, ErrorResponse, SeatClass


# Price multipliers for each seat class
SEAT_CLASS_MULTIPLIERS = {
    'economy': 1.0,
    'business': 2.5,
    'galaxium': 5.0
}


def book_flight(db: Session, user_id: int, name: str, flight_id: int, seat_class: SeatClass = 'economy', infant_count: int = 0) -> BookingOut | ErrorResponse:
    """Book a seat on a specific flight for a user in the specified seat class with optional infants."""
    # Validate infant count
    if infant_count < 0:
        return ErrorResponse(
            error="Invalid infant count",
            error_code="INVALID_INFANT_COUNT",
            details="Infant count cannot be negative."
        )
    
    if infant_count > 2:
        return ErrorResponse(
            error="Too many infants",
            error_code="TOO_MANY_INFANTS",
            details="Maximum 2 infants allowed per adult passenger (lap children)."
        )
    
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
        booking_time=datetime.utcnow().isoformat(),
        seat_class=seat_class,
        price_paid=price_paid,
        infant_count=infant_count
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

def modify_booking(db: Session, booking_id: int, new_seat_class: SeatClass, new_infant_count: int = 0) -> BookingOut | ErrorResponse:
    """Modify an existing booking's seat class and/or infant count."""
    # Validate infant count
    if new_infant_count < 0:
        return ErrorResponse(
            error="Invalid infant count",
            error_code="INVALID_INFANT_COUNT",
            details="Infant count cannot be negative."
        )
    
    if new_infant_count > 2:
        return ErrorResponse(
            error="Too many infants",
            error_code="TOO_MANY_INFANTS",
            details="Maximum 2 infants allowed per adult passenger (lap children)."
        )
    
    # Validate seat class
    if new_seat_class not in SEAT_CLASS_MULTIPLIERS:
        return ErrorResponse(
            error="Invalid seat class",
            error_code="INVALID_SEAT_CLASS",
            details=f"Seat class '{new_seat_class}' is not valid. Valid options are: economy, business, galaxium."
        )
    
    # Get the booking
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found."
        )
    
    # Check if booking is cancelled
    if booking.status == "cancelled":
        return ErrorResponse(
            error="Cannot modify cancelled booking",
            error_code="BOOKING_CANCELLED",
            details="This booking has been cancelled and cannot be modified."
        )
    
    # Get the flight
    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"Associated flight not found."
        )
    
    old_seat_class = booking.seat_class
    
    # If seat class is changing, handle seat availability
    if old_seat_class != new_seat_class:
        # Check if new seat class has availability
        if new_seat_class == 'economy':
            if flight.economy_seats_available < 1:
                return ErrorResponse(
                    error=f"No {new_seat_class} seats available",
                    error_code="NO_SEATS_AVAILABLE",
                    details=f"Cannot change to {new_seat_class} class - no seats available."
                )
        elif new_seat_class == 'business':
            if flight.business_seats_available < 1:
                return ErrorResponse(
                    error=f"No {new_seat_class} seats available",
                    error_code="NO_SEATS_AVAILABLE",
                    details=f"Cannot change to {new_seat_class} class - no seats available."
                )
        else:  # galaxium
            if flight.galaxium_seats_available < 1:
                return ErrorResponse(
                    error=f"No {new_seat_class} seats available",
                    error_code="NO_SEATS_AVAILABLE",
                    details=f"Cannot change to {new_seat_class} class - no seats available."
                )
        
        # Restore old seat class
        if old_seat_class == 'economy':
            flight.economy_seats_available += 1
        elif old_seat_class == 'business':
            flight.business_seats_available += 1
        else:  # galaxium
            flight.galaxium_seats_available += 1
        
        # Take new seat class
        if new_seat_class == 'economy':
            flight.economy_seats_available -= 1
        elif new_seat_class == 'business':
            flight.business_seats_available -= 1
        else:  # galaxium
            flight.galaxium_seats_available -= 1
        
        # Update price based on new seat class
        new_price = int(flight.base_price * SEAT_CLASS_MULTIPLIERS[new_seat_class])
        booking.price_paid = new_price
        booking.seat_class = new_seat_class
    
    # Update infant count (no seat availability check needed)
    booking.infant_count = new_infant_count
    
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)
    return [BookingOut.model_validate(b) for b in bookings]
