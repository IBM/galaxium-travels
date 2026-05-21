from sqlalchemy.orm import Session
from datetime import datetime
from models import User, Flight, Booking
from schemas import BookingOut, ErrorResponse, BookingUpdateRequest


def book_flight(db: Session, user_id: int, name: str, flight_id: int, 
                num_adults: int = 1, num_infants: int = 0, 
                passenger_names: str = None) -> BookingOut | ErrorResponse:
    """Book a seat on a specific flight for a user."""
    # Check flight exists
    flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"The specified flight_id {flight_id} does not exist in our system. Please check the flight_id or use list_flights to see available flights."
        )

    # Calculate total seats needed (adults only, infants don't need seats)
    seats_needed = num_adults
    
    # Check seats available
    if flight.seats_available < seats_needed:
        return ErrorResponse(
            error="Not enough seats available",
            error_code="NO_SEATS_AVAILABLE",
            details=f"The flight only has {flight.seats_available} seats available, but you requested {seats_needed} seats. Please check other flights or try again later."
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

    # Create booking
    flight.seats_available -= seats_needed
    new_booking = Booking(
        user_id=user_id,
        flight_id=flight_id,
        status="booked",
        booking_time=datetime.utcnow().isoformat(),
        num_adults=num_adults,
        num_infants=num_infants,
        passenger_names=passenger_names
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return BookingOut.model_validate(new_booking)


def update_booking(db: Session, booking_id: int, update_data: BookingUpdateRequest) -> BookingOut | ErrorResponse:
    """Update an existing booking."""
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found."
        )

    if booking.status == "cancelled":
        return ErrorResponse(
            error="Cannot modify cancelled booking",
            error_code="BOOKING_CANCELLED",
            details=f"Booking {booking_id} is cancelled and cannot be modified."
        )

    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    
    # Calculate seat changes
    old_seats = booking.num_adults
    new_adults = update_data.num_adults if update_data.num_adults is not None else booking.num_adults
    new_infants = update_data.num_infants if update_data.num_infants is not None else booking.num_infants
    
    seat_difference = new_adults - old_seats
    
    if seat_difference > 0:
        # Need more seats
        if flight.seats_available < seat_difference:
            return ErrorResponse(
                error="Not enough seats available",
                error_code="NO_SEATS_AVAILABLE",
                details=f"Cannot add {seat_difference} more seats. Only {flight.seats_available} seats available."
            )
        flight.seats_available -= seat_difference
    elif seat_difference < 0:
        # Releasing seats
        flight.seats_available += abs(seat_difference)
    
    # Update booking
    if update_data.num_adults is not None:
        booking.num_adults = update_data.num_adults
    if update_data.num_infants is not None:
        booking.num_infants = update_data.num_infants
    if update_data.passenger_names is not None:
        booking.passenger_names = update_data.passenger_names
    
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


def cancel_booking(db: Session, booking_id: int) -> BookingOut | ErrorResponse:
    """Cancel an existing booking by its booking_id."""
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

    # Restore seats (only adults need seats)
    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    if flight:
        flight.seats_available += booking.num_adults

    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return BookingOut.model_validate(booking)


def get_bookings(db: Session, user_id: int) -> list[BookingOut]:
    """Retrieve all bookings for a specific user."""
    bookings = db.query(Booking).filter(Booking.user_id == user_id).all()
    return [BookingOut.model_validate(b) for b in bookings]

# Made with Bob
