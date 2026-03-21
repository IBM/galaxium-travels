from sqlalchemy.orm import Session
from models import Flight, SEAT_CLASS_MULTIPLIERS
from schemas import FlightOut, SeatClassAvailability


def list_flights(db: Session) -> list[FlightOut]:
    """List all available flights with seat class information."""
    flights = db.query(Flight).all()
    result = []
    
    for flight in flights:
        # Build seat class availability dict
        seat_classes = {}
        for class_name, multiplier in SEAT_CLASS_MULTIPLIERS.items():
            seat_count = flight.get_seats_available(class_name)
            seat_classes[class_name] = SeatClassAvailability(
                price=flight.get_class_price(class_name),
                seats_available=seat_count,
                multiplier=multiplier
            )
        
        # Create FlightOut with both new and deprecated fields
        flight_data = FlightOut(
            flight_id=flight.flight_id,
            origin=flight.origin,
            destination=flight.destination,
            departure_time=flight.departure_time,
            arrival_time=flight.arrival_time,
            base_price=flight.base_price,
            seat_classes=seat_classes,
            total_seats_available=flight.total_seats_available,
            # Backward compatibility fields
            price=flight.price,
            seats_available=flight.seats_available
        )
        result.append(flight_data)
    
    return result
