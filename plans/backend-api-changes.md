# Backend API Changes for Seat Classes

## API Endpoint Modifications

### 1. GET /flights
**Current Implementation:**
```python
@app.get("/flights", response_model=list[FlightOut])
def list_flights(db: Session = Depends(get_db)):
    flights = flight_service.get_all_flights(db)
    return flights
```

**Updated Implementation:**
```python
@app.get("/flights", response_model=list[FlightOutWithClasses])
def list_flights(db: Session = Depends(get_db)):
    flights = flight_service.get_all_flights(db)
    return flights
```

**Response Changes:**
```json
// Current Response
{
  "flight_id": 1,
  "origin": "Earth",
  "destination": "Mars",
  "departure_time": "2099-01-01T09:00:00Z",
  "arrival_time": "2099-01-01T17:00:00Z",
  "price": 1000000,
  "seats_available": 5
}

// New Response
{
  "flight_id": 1,
  "origin": "Earth",
  "destination": "Mars",
  "departure_time": "2099-01-01T09:00:00Z",
  "arrival_time": "2099-01-01T17:00:00Z",
  "base_price": 1000000,
  "seat_classes": {
    "economy": {
      "price": 1000000,
      "seats_available": 10,
      "multiplier": 1.0
    },
    "business": {
      "price": 1500000,
      "seats_available": 5,
      "multiplier": 1.5
    },
    "galaxium": {
      "price": 2500000,
      "seats_available": 2,
      "multiplier": 2.5
    }
  },
  "total_seats_available": 17,
  // Deprecated fields (for backward compatibility)
  "price": 1000000,
  "seats_available": 10
}
```

### 2. POST /book
**Current Implementation:**
```python
@app.post("/book", response_model=BookingOut | ErrorResponse)
def book_flight(
    booking: BookingRequest,
    db: Session = Depends(get_db)
):
    result = booking_service.book_flight(
        db, 
        booking.user_id, 
        booking.name, 
        booking.flight_id
    )
    return result
```

**Updated Implementation:**
```python
@app.post("/book", response_model=BookingOutWithClass | ErrorResponse)
def book_flight(
    booking: BookingRequestWithClass,
    db: Session = Depends(get_db)
):
    result = booking_service.book_flight(
        db, 
        booking.user_id, 
        booking.name, 
        booking.flight_id,
        booking.seat_class  # New parameter
    )
    return result
```

**Request Changes:**
```json
// Current Request
{
  "user_id": 1,
  "name": "Alice",
  "flight_id": 1
}

// New Request
{
  "user_id": 1,
  "name": "Alice",
  "flight_id": 1,
  "seat_class": "business"  // New field: 'economy', 'business', 'galaxium'
}
```

**Response Changes:**
```json
// Current Response
{
  "booking_id": 1,
  "user_id": 1,
  "flight_id": 1,
  "status": "booked",
  "booking_time": "2099-01-01T08:00:00Z"
}

// New Response
{
  "booking_id": 1,
  "user_id": 1,
  "flight_id": 1,
  "seat_class": "business",
  "price_paid": 1500000,
  "status": "booked",
  "booking_time": "2099-01-01T08:00:00Z"
}
```

### 3. GET /bookings/{user_id}
**Current Implementation:**
```python
@app.get("/bookings/{user_id}", response_model=list[BookingOut])
def get_user_bookings(user_id: int, db: Session = Depends(get_db)):
    bookings = booking_service.get_bookings(db, user_id)
    return bookings
```

**Updated Implementation:**
```python
@app.get("/bookings/{user_id}", response_model=list[BookingOutWithClass])
def get_user_bookings(user_id: int, db: Session = Depends(get_db)):
    bookings = booking_service.get_bookings(db, user_id)
    return bookings
```

**Response includes seat_class and price_paid for each booking**

### 4. POST /cancel/{booking_id}
**No changes required** - cancellation logic will automatically restore seats to the correct class

### 5. New Endpoint: GET /seat-classes
**Purpose:** Return available seat classes with their configurations

```python
@app.get("/seat-classes", response_model=list[SeatClassInfo])
def get_seat_classes():
    return [
        {
            "class_name": "economy",
            "display_name": "Economy Class",
            "price_multiplier": 1.0,
            "description": "Standard seating for space travel",
            "features": [
                "Standard seat",
                "In-flight meal",
                "Entertainment system"
            ]
        },
        {
            "class_name": "business",
            "display_name": "Business Class",
            "price_multiplier": 1.5,
            "description": "Enhanced comfort and amenities",
            "features": [
                "Spacious seat",
                "Premium meals",
                "Priority boarding",
                "Extra luggage"
            ]
        },
        {
            "class_name": "galaxium",
            "display_name": "Galaxium Class",
            "price_multiplier": 2.5,
            "description": "Premium luxury experience",
            "features": [
                "Luxury pod",
                "Gourmet dining",
                "VIP lounge access",
                "Personal concierge",
                "Unlimited luggage"
            ]
        }
    ]
```

## Pydantic Schema Updates

### schemas.py Changes

```python
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from enum import Enum

# Seat class enum
class SeatClass(str, Enum):
    ECONOMY = "economy"
    BUSINESS = "business"
    GALAXIUM = "galaxium"

# Seat class information for a flight
class SeatClassAvailability(BaseModel):
    price: int
    seats_available: int
    multiplier: float

# Updated Flight schema
class FlightOutWithClasses(BaseModel):
    flight_id: int
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    base_price: int
    seat_classes: dict[str, SeatClassAvailability]
    total_seats_available: int
    
    # Deprecated fields (for backward compatibility)
    price: int
    seats_available: int
    
    class Config:
        from_attributes = True

# Backward compatible flight schema (for old frontend)
class FlightOut(BaseModel):
    flight_id: int
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    price: int
    seats_available: int
    
    class Config:
        from_attributes = True

# Updated booking request
class BookingRequestWithClass(BaseModel):
    user_id: int
    name: str
    flight_id: int
    seat_class: SeatClass = SeatClass.ECONOMY  # Default to economy

# Backward compatible booking request
class BookingRequest(BaseModel):
    user_id: int
    name: str
    flight_id: int

# Updated booking response
class BookingOutWithClass(BaseModel):
    booking_id: int
    user_id: int
    flight_id: int
    seat_class: str
    price_paid: int
    status: str
    booking_time: str
    
    class Config:
        from_attributes = True

# Backward compatible booking response
class BookingOut(BaseModel):
    booking_id: int
    user_id: int
    flight_id: int
    status: str
    booking_time: str
    
    class Config:
        from_attributes = True

# Seat class information
class SeatClassInfo(BaseModel):
    class_name: str
    display_name: str
    price_multiplier: float
    description: str
    features: list[str]
```

## Service Layer Updates

### services/flight.py

```python
from sqlalchemy.orm import Session
from models import Flight
from schemas import FlightOutWithClasses, SeatClassAvailability

SEAT_CLASS_MULTIPLIERS = {
    'economy': 1.0,
    'business': 1.5,
    'galaxium': 2.5
}

def get_all_flights(db: Session) -> list[FlightOutWithClasses]:
    """Get all flights with seat class information"""
    flights = db.query(Flight).all()
    result = []
    
    for flight in flights:
        seat_classes = {}
        for class_name, multiplier in SEAT_CLASS_MULTIPLIERS.items():
            seat_count = getattr(flight, f"{class_name}_seats_available", 0)
            seat_classes[class_name] = SeatClassAvailability(
                price=int(flight.base_price * multiplier),
                seats_available=seat_count,
                multiplier=multiplier
            )
        
        flight_data = FlightOutWithClasses(
            flight_id=flight.flight_id,
            origin=flight.origin,
            destination=flight.destination,
            departure_time=flight.departure_time,
            arrival_time=flight.arrival_time,
            base_price=flight.base_price,
            seat_classes=seat_classes,
            total_seats_available=flight.total_seats_available,
            # Backward compatibility
            price=flight.base_price,
            seats_available=flight.economy_seats_available
        )
        result.append(flight_data)
    
    return result
```

### services/booking.py

```python
from sqlalchemy.orm import Session
from datetime import datetime
from models import User, Flight, Booking
from schemas import BookingOutWithClass, ErrorResponse

SEAT_CLASS_MULTIPLIERS = {
    'economy': 1.0,
    'business': 1.5,
    'galaxium': 2.5
}

def book_flight(
    db: Session, 
    user_id: int, 
    name: str, 
    flight_id: int,
    seat_class: str = 'economy'
) -> BookingOutWithClass | ErrorResponse:
    """Book a seat on a specific flight for a user with seat class selection."""
    
    # Validate seat class
    if seat_class not in SEAT_CLASS_MULTIPLIERS:
        return ErrorResponse(
            error="Invalid seat class",
            error_code="INVALID_SEAT_CLASS",
            details=f"Seat class '{seat_class}' is not valid. Must be one of: economy, business, galaxium"
        )
    
    # Check flight exists
    flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
    if not flight:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"The specified flight_id {flight_id} does not exist"
        )
    
    # Check seats available for the specific class
    seat_attr = f"{seat_class}_seats_available"
    seats_available = getattr(flight, seat_attr, 0)
    
    if seats_available < 1:
        return ErrorResponse(
            error=f"No {seat_class} seats available",
            error_code="NO_SEATS_AVAILABLE",
            details=f"The flight has no available seats in {seat_class} class. Please choose a different class or flight."
        )
    
    # Check user exists and name matches
    user = db.query(User).filter(User.user_id == user_id, User.name == name).first()
    if not user:
        existing_user = db.query(User).filter(User.user_id == user_id).first()
        if existing_user:
            return ErrorResponse(
                error="Name mismatch",
                error_code="NAME_MISMATCH",
                details=f"User ID {user_id} exists but the name does not match"
            )
        else:
            return ErrorResponse(
                error="User not found",
                error_code="USER_NOT_FOUND",
                details=f"User with ID {user_id} is not registered"
            )
    
    # Calculate price for the seat class
    price_paid = int(flight.base_price * SEAT_CLASS_MULTIPLIERS[seat_class])
    
    # Create booking
    setattr(flight, seat_attr, seats_available - 1)
    
    # Update deprecated fields for backward compatibility
    if seat_class == 'economy':
        flight.seats_available = flight.economy_seats_available
    
    new_booking = Booking(
        user_id=user_id,
        flight_id=flight_id,
        seat_class=seat_class,
        price_paid=price_paid,
        status="booked",
        booking_time=datetime.utcnow().isoformat()
    )
    
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    
    return BookingOutWithClass.model_validate(new_booking)


def cancel_booking(db: Session, booking_id: int) -> BookingOutWithClass | ErrorResponse:
    """Cancel an existing booking and restore seat to the correct class."""
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    if not booking:
        return ErrorResponse(
            error="Booking not found",
            error_code="BOOKING_NOT_FOUND",
            details=f"Booking with ID {booking_id} not found"
        )
    
    if booking.status == "cancelled":
        return ErrorResponse(
            error="Booking already cancelled",
            error_code="ALREADY_CANCELLED",
            details=f"Booking {booking_id} is already cancelled"
        )
    
    # Restore seat to the correct class
    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    if flight:
        seat_attr = f"{booking.seat_class}_seats_available"
        current_seats = getattr(flight, seat_attr, 0)
        setattr(flight, seat_attr, current_seats + 1)
        
        # Update deprecated fields for backward compatibility
        if booking.seat_class == 'economy':
            flight.seats_available = flight.economy_seats_available
    
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    
    return BookingOutWithClass.model_validate(booking)


def get_bookings(db: Session, user_id: int) -> list[BookingOutWithClass]:
    """Retrieve all bookings for a specific user."""
    bookings = db.query(Booking).filter(Booking.user_id == user_id).all()
    return [BookingOutWithClass.model_validate(b) for b in bookings]
```

## Error Handling

### New Error Codes
- `INVALID_SEAT_CLASS` - Invalid seat class specified
- `NO_SEATS_AVAILABLE` - No seats available in requested class
- `SEAT_CLASS_MISMATCH` - Seat class doesn't match flight configuration

### Error Response Examples
```json
{
  "success": false,
  "error": "No business seats available",
  "error_code": "NO_SEATS_AVAILABLE",
  "details": "The flight has no available seats in business class. Please choose a different class or flight."
}
```

## Backward Compatibility Strategy

### For Old Frontend (Port 5173)
1. Keep original `/book` endpoint accepting requests without `seat_class`
2. Default to `economy` class when `seat_class` is not provided
3. Return simplified response without seat class details
4. Maintain `price` and `seats_available` fields in flight responses

### For New Frontend (Port 5174)
1. Use new endpoints with full seat class support
2. Display all seat classes with pricing
3. Allow user to select seat class during booking
4. Show seat class information in booking history

## Testing Requirements

### Unit Tests
- [ ] Test booking with each seat class
- [ ] Test booking with invalid seat class
- [ ] Test booking when specific class is sold out
- [ ] Test price calculation for each class
- [ ] Test seat availability decrement for correct class
- [ ] Test cancellation restores correct class seats
- [ ] Test backward compatibility with old request format
- [ ] Test concurrent bookings for same seat class

### Integration Tests
- [ ] Test complete booking flow for each class
- [ ] Test flight listing with seat class information
- [ ] Test booking history with seat class details
- [ ] Test error scenarios for each endpoint
- [ ] Test database transaction rollback on errors

## API Documentation Updates

Update API_REFERENCE.md with:
- New request/response schemas
- Seat class parameter documentation
- Price calculation examples
- Error code documentation
- Migration guide for API consumers

## Next Steps

1. Review and approve API changes
2. Update schemas.py with new models
3. Update service layer with seat class logic
4. Update server.py with new endpoints
5. Create comprehensive tests
6. Update API documentation