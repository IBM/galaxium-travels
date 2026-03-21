# Backward Compatibility Strategy

## Overview
This document outlines the strategy to ensure the backend remains fully compatible with the original frontend (port 5173) while supporting the new seat classes frontend (port 5174).

## Core Principle
**The backend must support both frontends simultaneously without breaking changes to existing API contracts.**

---

## Database Backward Compatibility

### Flight Table Strategy

#### Approach: Dual Field System
Maintain both old and new fields during transition period:

```python
class Flight(Base):
    __tablename__ = 'flights'
    
    # ... existing fields ...
    
    # NEW FIELDS (for seat classes)
    base_price = Column(Integer, nullable=False)
    economy_seats_available = Column(Integer, nullable=False, default=0)
    business_seats_available = Column(Integer, nullable=False, default=0)
    galaxium_seats_available = Column(Integer, nullable=False, default=0)
    
    # DEPRECATED FIELDS (for backward compatibility)
    price = Column(Integer, nullable=False)  # Always equals base_price
    seats_available = Column(Integer, nullable=False)  # Always equals economy_seats_available
```

#### Synchronization Rules
1. When `base_price` is updated → automatically update `price`
2. When `economy_seats_available` is updated → automatically update `seats_available`
3. When booking Economy class → decrement both `economy_seats_available` AND `seats_available`
4. When canceling Economy booking → increment both counters

#### Implementation
```python
class Flight(Base):
    # ... fields ...
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure backward compatibility fields are set
        if self.base_price and not self.price:
            self.price = self.base_price
        if self.economy_seats_available is not None and not self.seats_available:
            self.seats_available = self.economy_seats_available
    
    @property
    def total_seats_available(self):
        """Total seats across all classes"""
        return (self.economy_seats_available + 
                self.business_seats_available + 
                self.galaxium_seats_available)
```

---

### Booking Table Strategy

#### Approach: Optional Fields with Defaults
```python
class Booking(Base):
    __tablename__ = 'bookings'
    
    # ... existing fields ...
    
    # NEW FIELDS (optional for backward compatibility)
    seat_class = Column(String, nullable=False, default='economy')
    price_paid = Column(Integer, nullable=False)  # Required but can be calculated
```

#### Default Behavior
- If `seat_class` not provided → default to 'economy'
- If `price_paid` not provided → calculate from flight base_price

---

## API Backward Compatibility

### Strategy: Dual Response Schemas

#### 1. GET /flights Endpoint

**Old Frontend Expectation:**
```json
{
  "flight_id": 1,
  "origin": "Earth",
  "destination": "Mars",
  "departure_time": "2099-01-01T09:00:00Z",
  "arrival_time": "2099-01-01T17:00:00Z",
  "price": 1000000,
  "seats_available": 10
}
```

**New Frontend Expectation:**
```json
{
  "flight_id": 1,
  "origin": "Earth",
  "destination": "Mars",
  "departure_time": "2099-01-01T09:00:00Z",
  "arrival_time": "2099-01-01T17:00:00Z",
  "base_price": 1000000,
  "seat_classes": {
    "economy": {"price": 1000000, "seats_available": 10, "multiplier": 1.0},
    "business": {"price": 1500000, "seats_available": 5, "multiplier": 1.5},
    "galaxium": {"price": 2500000, "seats_available": 2, "multiplier": 2.5}
  },
  "total_seats_available": 17,
  "price": 1000000,
  "seats_available": 10
}
```

**Solution: Include Both Formats**
```python
class FlightOut(BaseModel):
    """Response schema that includes both old and new fields"""
    flight_id: int
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    
    # New fields
    base_price: int
    seat_classes: dict[str, SeatClassAvailability]
    total_seats_available: int
    
    # Deprecated fields (for backward compatibility)
    price: int  # = base_price
    seats_available: int  # = economy_seats_available
    
    class Config:
        from_attributes = True

@app.get("/flights", response_model=list[FlightOut])
def list_flights(db: Session = Depends(get_db)):
    """Returns flights with both old and new format fields"""
    flights = db.query(Flight).all()
    result = []
    
    for flight in flights:
        flight_data = FlightOut(
            flight_id=flight.flight_id,
            origin=flight.origin,
            destination=flight.destination,
            departure_time=flight.departure_time,
            arrival_time=flight.arrival_time,
            base_price=flight.base_price,
            seat_classes={
                'economy': SeatClassAvailability(
                    price=flight.base_price,
                    seats_available=flight.economy_seats_available,
                    multiplier=1.0
                ),
                'business': SeatClassAvailability(
                    price=int(flight.base_price * 1.5),
                    seats_available=flight.business_seats_available,
                    multiplier=1.5
                ),
                'galaxium': SeatClassAvailability(
                    price=int(flight.base_price * 2.5),
                    seats_available=flight.galaxium_seats_available,
                    multiplier=2.5
                )
            },
            total_seats_available=flight.total_seats_available,
            # Backward compatibility
            price=flight.price,
            seats_available=flight.seats_available
        )
        result.append(flight_data)
    
    return result
```

---

#### 2. POST /book Endpoint

**Old Frontend Request:**
```json
{
  "user_id": 1,
  "name": "Alice",
  "flight_id": 1
}
```

**New Frontend Request:**
```json
{
  "user_id": 1,
  "name": "Alice",
  "flight_id": 1,
  "seat_class": "business"
}
```

**Solution: Optional seat_class Parameter**
```python
class BookingRequest(BaseModel):
    """Backward compatible booking request"""
    user_id: int
    name: str
    flight_id: int
    seat_class: Optional[str] = 'economy'  # Default to economy if not provided

@app.post("/book", response_model=BookingOut | ErrorResponse)
def book_flight(
    booking: BookingRequest,
    db: Session = Depends(get_db)
):
    """
    Accepts bookings with or without seat_class.
    If seat_class not provided, defaults to 'economy'.
    """
    result = booking_service.book_flight(
        db,
        booking.user_id,
        booking.name,
        booking.flight_id,
        booking.seat_class  # Will be 'economy' if not provided
    )
    return result
```

**Old Frontend Response:**
```json
{
  "booking_id": 1,
  "user_id": 1,
  "flight_id": 1,
  "status": "booked",
  "booking_time": "2099-01-01T08:00:00Z"
}
```

**New Frontend Response:**
```json
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

**Solution: Include All Fields**
```python
class BookingOut(BaseModel):
    """Response includes all fields, old frontend ignores new ones"""
    booking_id: int
    user_id: int
    flight_id: int
    seat_class: str  # Old frontend will ignore this
    price_paid: int  # Old frontend will ignore this
    status: str
    booking_time: str
    
    class Config:
        from_attributes = True
```

---

#### 3. GET /bookings/{user_id} Endpoint

**Solution: Same as POST /book response**
- Include all fields in response
- Old frontend ignores new fields
- New frontend uses all fields

---

## Service Layer Backward Compatibility

### booking.py Updates

```python
def book_flight(
    db: Session,
    user_id: int,
    name: str,
    flight_id: int,
    seat_class: str = 'economy'  # Default parameter
) -> BookingOut | ErrorResponse:
    """
    Book a flight with optional seat class.
    Defaults to economy for backward compatibility.
    """
    
    # Validate seat class
    if seat_class not in ['economy', 'business', 'galaxium']:
        seat_class = 'economy'  # Fallback to economy for invalid values
    
    # ... rest of booking logic ...
    
    # Update both new and old seat counters
    if seat_class == 'economy':
        flight.economy_seats_available -= 1
        flight.seats_available -= 1  # Keep old field in sync
    elif seat_class == 'business':
        flight.business_seats_available -= 1
    elif seat_class == 'galaxium':
        flight.galaxium_seats_available -= 1
    
    # Calculate price
    multipliers = {'economy': 1.0, 'business': 1.5, 'galaxium': 2.5}
    price_paid = int(flight.base_price * multipliers[seat_class])
    
    # Create booking
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
    
    return BookingOut.model_validate(new_booking)


def cancel_booking(db: Session, booking_id: int) -> BookingOut | ErrorResponse:
    """
    Cancel booking and restore seats to correct class.
    Maintains backward compatibility by updating old fields.
    """
    booking = db.query(Booking).filter(Booking.booking_id == booking_id).first()
    
    if not booking:
        return ErrorResponse(...)
    
    if booking.status == "cancelled":
        return ErrorResponse(...)
    
    # Restore seat to correct class
    flight = db.query(Flight).filter(Flight.flight_id == booking.flight_id).first()
    if flight:
        seat_class = booking.seat_class or 'economy'  # Handle old bookings without seat_class
        
        if seat_class == 'economy':
            flight.economy_seats_available += 1
            flight.seats_available += 1  # Keep old field in sync
        elif seat_class == 'business':
            flight.business_seats_available += 1
        elif seat_class == 'galaxium':
            flight.galaxium_seats_available += 1
    
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    
    return BookingOut.model_validate(booking)
```

---

## Migration Strategy for Existing Data

### Step 1: Add New Columns (Non-Breaking)
```python
def migrate_add_columns(db: Session):
    """Add new columns without breaking existing functionality"""
    
    # Add new columns to flights
    # These are added as nullable first, then populated
    
    # Populate new columns from existing data
    flights = db.query(Flight).all()
    for flight in flights:
        flight.base_price = flight.price
        flight.economy_seats_available = flight.seats_available
        flight.business_seats_available = 0  # No business seats initially
        flight.galaxium_seats_available = 0  # No galaxium seats initially
    
    db.commit()
```

### Step 2: Update Existing Bookings
```python
def migrate_bookings(db: Session):
    """Set seat_class for existing bookings"""
    
    bookings = db.query(Booking).all()
    for booking in bookings:
        if not booking.seat_class:
            booking.seat_class = 'economy'  # Default old bookings to economy
        
        if not booking.price_paid:
            # Calculate price from flight
            flight = db.query(Flight).filter(
                Flight.flight_id == booking.flight_id
            ).first()
            if flight:
                booking.price_paid = flight.base_price
    
    db.commit()
```

---

## Testing Backward Compatibility

### Test Cases

#### 1. Old Frontend Can Still Book Flights
```python
def test_old_frontend_booking():
    """Test booking without seat_class parameter"""
    response = client.post("/book", json={
        "user_id": 1,
        "name": "Alice",
        "flight_id": 1
        # No seat_class provided
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["seat_class"] == "economy"  # Should default to economy
    assert "price_paid" in data  # Should include new fields
```

#### 2. Old Frontend Can List Flights
```python
def test_old_frontend_list_flights():
    """Test that old frontend gets expected fields"""
    response = client.get("/flights")
    
    assert response.status_code == 200
    flights = response.json()
    
    for flight in flights:
        # Old fields must be present
        assert "price" in flight
        assert "seats_available" in flight
        
        # New fields also present (old frontend ignores them)
        assert "base_price" in flight
        assert "seat_classes" in flight
```

#### 3. New Frontend Gets Full Data
```python
def test_new_frontend_booking():
    """Test booking with seat_class parameter"""
    response = client.post("/book", json={
        "user_id": 1,
        "name": "Alice",
        "flight_id": 1,
        "seat_class": "business"
    })
    
    assert response.status_code == 200
    data = response.json()
    assert data["seat_class"] == "business"
    assert data["price_paid"] == 1500000  # 1.5x base price
```

#### 4. Both Frontends Work Simultaneously
```python
def test_concurrent_bookings():
    """Test that both frontends can book simultaneously"""
    
    # Old frontend books economy
    response1 = client.post("/book", json={
        "user_id": 1,
        "name": "Alice",
        "flight_id": 1
    })
    assert response1.status_code == 200
    
    # New frontend books business
    response2 = client.post("/book", json={
        "user_id": 2,
        "name": "Bob",
        "flight_id": 1,
        "seat_class": "business"
    })
    assert response2.status_code == 200
    
    # Check flight availability updated correctly
    response3 = client.get("/flights")
    flights = response3.json()
    flight = next(f for f in flights if f["flight_id"] == 1)
    
    assert flight["seat_classes"]["economy"]["seats_available"] == 9  # One less
    assert flight["seat_classes"]["business"]["seats_available"] == 4  # One less
    assert flight["seats_available"] == 9  # Old field updated
```

---

## Deprecation Timeline

### Phase 1: Dual Support (Months 1-6)
- Both old and new fields maintained
- Both frontends fully supported
- Monitor usage of old frontend

### Phase 2: Deprecation Notice (Months 7-9)
- Add deprecation warnings in API docs
- Notify users to migrate to new frontend
- Continue full support

### Phase 3: Sunset (Month 10+)
- Remove old frontend
- Keep old API fields for external integrations
- Eventually remove deprecated fields in major version update

---

## Documentation Updates

### API Documentation
Add clear notes about backward compatibility:

```markdown
## Backward Compatibility

### Flight Response
The `/flights` endpoint returns both old and new format fields:

**Legacy Fields (deprecated):**
- `price`: Base price (same as `base_price`)
- `seats_available`: Economy seats only (same as `seat_classes.economy.seats_available`)

**New Fields:**
- `base_price`: Base price for Economy class
- `seat_classes`: Object with availability and pricing for all classes
- `total_seats_available`: Total seats across all classes

Old clients can continue using `price` and `seats_available` fields.
New clients should use `base_price` and `seat_classes`.

### Booking Request
The `/book` endpoint accepts an optional `seat_class` parameter:

**Without seat_class (legacy):**
```json
{"user_id": 1, "name": "Alice", "flight_id": 1}
```
Defaults to Economy class.

**With seat_class (new):**
```json
{"user_id": 1, "name": "Alice", "flight_id": 1, "seat_class": "business"}
```
Books specified class.
```

---

## Rollback Plan

If issues arise with backward compatibility:

### Immediate Rollback
1. Revert to using only old fields
2. Disable seat class features
3. Keep new frontend offline

### Partial Rollback
1. Keep database changes
2. Make seat_class features optional
3. Default everything to economy

### Data Recovery
1. All old bookings remain valid
2. New bookings can be converted to economy
3. No data loss occurs

---

## Summary

### Key Principles
1. **Never break existing API contracts**
2. **Always include old fields in responses**
3. **Make new parameters optional with sensible defaults**
4. **Keep old and new data in sync**
5. **Test both frontends continuously**

### Success Criteria
- ✅ Old frontend works without any changes
- ✅ New frontend gets full seat class functionality
- ✅ Both frontends can operate simultaneously
- ✅ No data corruption or loss
- ✅ Seamless user experience on both frontends

This strategy ensures a smooth transition while maintaining full backward compatibility.