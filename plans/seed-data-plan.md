# Seed Data Plan for Seat Classes

## Overview
This document outlines the strategy for updating seed data to include seat class information for all flights in the Galaxium Travels booking system.

## Current Seed Data Structure

### Existing Flight Data (seed.py)
```python
flights = [
    Flight(
        origin="Earth", 
        destination="Mars", 
        departure_time="2099-01-01T09:00:00Z", 
        arrival_time="2099-01-01T17:00:00Z", 
        price=1000000,  # Base price
        seats_available=5  # Total seats
    ),
    # ... more flights
]
```

## Updated Seed Data Structure

### New Flight Data with Seat Classes
```python
flights = [
    Flight(
        origin="Earth",
        destination="Mars",
        departure_time="2099-01-01T09:00:00Z",
        arrival_time="2099-01-01T17:00:00Z",
        base_price=1000000,  # Base price for Economy
        economy_seats_available=10,
        business_seats_available=5,
        galaxium_seats_available=2,
        # Deprecated fields for backward compatibility
        price=1000000,
        seats_available=10
    ),
    # ... more flights
]
```

## Seat Allocation Strategy

### Route-Based Allocation
Different routes will have different seat class distributions based on:
- Route popularity
- Distance
- Target market

#### Short Routes (Earth-Moon, Mars-Phobos)
- **Economy**: 60% of total seats
- **Business**: 30% of total seats
- **Galaxium**: 10% of total seats

Example: 20 total seats
- Economy: 12 seats
- Business: 6 seats
- Galaxium: 2 seats

#### Medium Routes (Earth-Mars, Earth-Venus)
- **Economy**: 50% of total seats
- **Business**: 35% of total seats
- **Galaxium**: 15% of total seats

Example: 20 total seats
- Economy: 10 seats
- Business: 7 seats
- Galaxium: 3 seats

#### Long Routes (Earth-Jupiter, Earth-Saturn, Earth-Pluto)
- **Economy**: 40% of total seats
- **Business**: 40% of total seats
- **Galaxium**: 20% of total seats

Example: 20 total seats
- Economy: 8 seats
- Business: 8 seats
- Galaxium: 4 seats

## Updated seed.py Implementation

```python
from models import Base, User, Flight, Booking
from db import engine, SessionLocal
from datetime import datetime, timedelta
import random

def calculate_seat_distribution(total_seats: int, route_type: str) -> dict:
    """Calculate seat distribution based on route type"""
    distributions = {
        'short': {'economy': 0.60, 'business': 0.30, 'galaxium': 0.10},
        'medium': {'economy': 0.50, 'business': 0.35, 'galaxium': 0.15},
        'long': {'economy': 0.40, 'business': 0.40, 'galaxium': 0.20}
    }
    
    dist = distributions.get(route_type, distributions['medium'])
    
    economy = int(total_seats * dist['economy'])
    business = int(total_seats * dist['business'])
    galaxium = total_seats - economy - business  # Remaining seats
    
    return {
        'economy': economy,
        'business': business,
        'galaxium': galaxium
    }

def get_route_type(origin: str, destination: str) -> str:
    """Determine route type based on origin and destination"""
    short_routes = [
        ('Earth', 'Moon'), ('Moon', 'Earth'),
        ('Mars', 'Phobos'), ('Phobos', 'Mars')
    ]
    
    long_routes = [
        ('Earth', 'Jupiter'), ('Jupiter', 'Earth'),
        ('Earth', 'Saturn'), ('Saturn', 'Earth'),
        ('Earth', 'Pluto'), ('Pluto', 'Earth'),
        ('Mars', 'Jupiter'), ('Jupiter', 'Mars')
    ]
    
    route = (origin, destination)
    
    if route in short_routes:
        return 'short'
    elif route in long_routes:
        return 'long'
    else:
        return 'medium'

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Clear existing data
    db.query(Booking).delete()
    db.query(User).delete()
    db.query(Flight).delete()
    db.commit()
    
    # Add demo users
    users = [
        User(name="Alice", email="alice@example.com"),
        User(name="Bob", email="bob@example.com"),
        User(name="Charlie", email="charlie@galaxium.com"),
        User(name="Diana", email="diana@moonmail.com"),
        User(name="Eve", email="eve@marsmail.com"),
        User(name="Frank", email="frank@venusmail.com"),
        User(name="Grace", email="grace@jupiter.com"),
        User(name="Heidi", email="heidi@europa.com"),
        User(name="Ivan", email="ivan@asteroidbelt.com"),
        User(name="Judy", email="judy@pluto.com"),
    ]
    db.add_all(users)
    db.commit()
    
    # Add demo flights with seat classes
    flight_data = [
        {
            'origin': 'Earth',
            'destination': 'Mars',
            'departure_time': '2099-01-01T09:00:00Z',
            'arrival_time': '2099-01-01T17:00:00Z',
            'base_price': 1000000,
            'total_seats': 20
        },
        {
            'origin': 'Earth',
            'destination': 'Moon',
            'departure_time': '2099-01-02T10:00:00Z',
            'arrival_time': '2099-01-02T14:00:00Z',
            'base_price': 500000,
            'total_seats': 25
        },
        {
            'origin': 'Mars',
            'destination': 'Earth',
            'departure_time': '2099-01-03T12:00:00Z',
            'arrival_time': '2099-01-03T20:00:00Z',
            'base_price': 950000,
            'total_seats': 18
        },
        {
            'origin': 'Venus',
            'destination': 'Earth',
            'departure_time': '2099-01-04T08:00:00Z',
            'arrival_time': '2099-01-04T18:00:00Z',
            'base_price': 1200000,
            'total_seats': 15
        },
        {
            'origin': 'Jupiter',
            'destination': 'Europa',
            'departure_time': '2099-01-05T15:00:00Z',
            'arrival_time': '2099-01-05T19:00:00Z',
            'base_price': 2000000,
            'total_seats': 12
        },
        {
            'origin': 'Earth',
            'destination': 'Venus',
            'departure_time': '2099-01-06T07:00:00Z',
            'arrival_time': '2099-01-06T15:00:00Z',
            'base_price': 1100000,
            'total_seats': 20
        },
        {
            'origin': 'Moon',
            'destination': 'Mars',
            'departure_time': '2099-01-07T11:00:00Z',
            'arrival_time': '2099-01-07T19:00:00Z',
            'base_price': 800000,
            'total_seats': 22
        },
        {
            'origin': 'Mars',
            'destination': 'Jupiter',
            'departure_time': '2099-01-08T13:00:00Z',
            'arrival_time': '2099-01-08T23:00:00Z',
            'base_price': 2500000,
            'total_seats': 16
        },
        {
            'origin': 'Europa',
            'destination': 'Earth',
            'departure_time': '2099-01-09T09:00:00Z',
            'arrival_time': '2099-01-09T21:00:00Z',
            'base_price': 3000000,
            'total_seats': 14
        },
        {
            'origin': 'Earth',
            'destination': 'Pluto',
            'departure_time': '2099-01-10T06:00:00Z',
            'arrival_time': '2099-01-11T06:00:00Z',
            'base_price': 5000000,
            'total_seats': 10
        },
        {
            'origin': 'Moon',
            'destination': 'Earth',
            'departure_time': '2099-01-11T14:00:00Z',
            'arrival_time': '2099-01-11T18:00:00Z',
            'base_price': 450000,
            'total_seats': 30
        },
        {
            'origin': 'Earth',
            'destination': 'Saturn',
            'departure_time': '2099-01-12T08:00:00Z',
            'arrival_time': '2099-01-13T08:00:00Z',
            'base_price': 4500000,
            'total_seats': 12
        }
    ]
    
    flights = []
    for data in flight_data:
        route_type = get_route_type(data['origin'], data['destination'])
        seat_dist = calculate_seat_distribution(data['total_seats'], route_type)
        
        flight = Flight(
            origin=data['origin'],
            destination=data['destination'],
            departure_time=data['departure_time'],
            arrival_time=data['arrival_time'],
            base_price=data['base_price'],
            economy_seats_available=seat_dist['economy'],
            business_seats_available=seat_dist['business'],
            galaxium_seats_available=seat_dist['galaxium'],
            # Backward compatibility
            price=data['base_price'],
            seats_available=seat_dist['economy']
        )
        flights.append(flight)
    
    db.add_all(flights)
    db.commit()
    
    # Add demo bookings with seat classes
    user_ids = [user.user_id for user in db.query(User).all()]
    flight_ids = [flight.flight_id for flight in db.query(Flight).all()]
    seat_classes = ['economy', 'business', 'galaxium']
    statuses = ['booked', 'cancelled', 'completed']
    
    bookings = []
    now = datetime.utcnow()
    
    # Create 30 demo bookings
    for i in range(30):
        user_id = random.choice(user_ids)
        flight_id = random.choice(flight_ids)
        seat_class = random.choices(
            seat_classes,
            weights=[0.6, 0.3, 0.1],  # More economy bookings
            k=1
        )[0]
        status = random.choice(statuses)
        
        # Get flight to calculate price
        flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
        multipliers = {'economy': 1.0, 'business': 1.5, 'galaxium': 2.5}
        price_paid = int(flight.base_price * multipliers[seat_class])
        
        booking_time = now - timedelta(days=random.randint(0, 30))
        
        booking = Booking(
            user_id=user_id,
            flight_id=flight_id,
            seat_class=seat_class,
            price_paid=price_paid,
            status=status,
            booking_time=booking_time.isoformat()
        )
        bookings.append(booking)
    
    db.add_all(bookings)
    db.commit()
    
    print("Database seeded with seat class data!")
    print(f"Created {len(users)} users")
    print(f"Created {len(flights)} flights with seat classes")
    print(f"Created {len(bookings)} bookings")
    
    # Print summary
    for flight in flights:
        print(f"\n{flight.origin} → {flight.destination}:")
        print(f"  Economy: {flight.economy_seats_available} seats @ {flight.base_price:,}")
        print(f"  Business: {flight.business_seats_available} seats @ {int(flight.base_price * 1.5):,}")
        print(f"  Galaxium: {flight.galaxium_seats_available} seats @ {int(flight.base_price * 2.5):,}")

if __name__ == "__main__":
    seed()
```

## Sample Data Output

### Example Flight: Earth → Mars (Medium Route)
- **Base Price**: 1,000,000 credits
- **Total Seats**: 20
- **Seat Distribution**:
  - Economy: 10 seats @ 1,000,000 credits
  - Business: 7 seats @ 1,500,000 credits
  - Galaxium: 3 seats @ 2,500,000 credits

### Example Flight: Earth → Moon (Short Route)
- **Base Price**: 500,000 credits
- **Total Seats**: 25
- **Seat Distribution**:
  - Economy: 15 seats @ 500,000 credits
  - Business: 8 seats @ 750,000 credits
  - Galaxium: 2 seats @ 1,250,000 credits

### Example Flight: Earth → Pluto (Long Route)
- **Base Price**: 5,000,000 credits
- **Total Seats**: 10
- **Seat Distribution**:
  - Economy: 4 seats @ 5,000,000 credits
  - Business: 4 seats @ 7,500,000 credits
  - Galaxium: 2 seats @ 12,500,000 credits

## Booking Distribution Strategy

### Realistic Booking Patterns
- 60% of bookings in Economy class
- 30% of bookings in Business class
- 10% of bookings in Galaxium class

This reflects typical airline booking patterns where most passengers book economy.

## Data Validation

### Pre-Seed Checks
- [ ] All flights have positive base_price
- [ ] All seat counts are non-negative
- [ ] Total seats = economy + business + galaxium
- [ ] Seat class multipliers are correct (1.0, 1.5, 2.5)

### Post-Seed Validation
- [ ] All flights created successfully
- [ ] Seat distributions match route types
- [ ] Booking prices match seat class multipliers
- [ ] No negative seat availability
- [ ] Backward compatibility fields populated

## Migration from Old Seed Data

### Step 1: Backup Current Data
```python
def backup_current_data(db: Session):
    """Backup existing data before migration"""
    flights = db.query(Flight).all()
    bookings = db.query(Booking).all()
    
    # Save to JSON or CSV for backup
    import json
    
    flight_backup = [
        {
            'flight_id': f.flight_id,
            'origin': f.origin,
            'destination': f.destination,
            'price': f.price,
            'seats_available': f.seats_available
        }
        for f in flights
    ]
    
    with open('flight_backup.json', 'w') as f:
        json.dump(flight_backup, f, indent=2)
```

### Step 2: Transform Old Data
```python
def transform_old_flights(db: Session):
    """Transform existing flights to include seat classes"""
    flights = db.query(Flight).all()
    
    for flight in flights:
        route_type = get_route_type(flight.origin, flight.destination)
        total_seats = flight.seats_available
        seat_dist = calculate_seat_distribution(total_seats, route_type)
        
        flight.base_price = flight.price
        flight.economy_seats_available = seat_dist['economy']
        flight.business_seats_available = seat_dist['business']
        flight.galaxium_seats_available = seat_dist['galaxium']
    
    db.commit()
```

### Step 3: Update Existing Bookings
```python
def update_existing_bookings(db: Session):
    """Set seat_class for existing bookings"""
    bookings = db.query(Booking).all()
    
    for booking in bookings:
        # Default to economy for existing bookings
        booking.seat_class = 'economy'
        
        # Get flight price at time of booking
        flight = db.query(Flight).filter(
            Flight.flight_id == booking.flight_id
        ).first()
        
        if flight:
            booking.price_paid = flight.base_price
    
    db.commit()
```

## Testing Seed Data

### Test Cases
1. **Verify Seat Distribution**
   - Check that seat counts match route type percentages
   - Verify total seats = sum of all classes

2. **Verify Pricing**
   - Economy price = base_price
   - Business price = base_price * 1.5
   - Galaxium price = base_price * 2.5

3. **Verify Bookings**
   - All bookings have valid seat_class
   - All bookings have price_paid set
   - Booking distribution matches expected ratios

4. **Verify Backward Compatibility**
   - price field equals base_price
   - seats_available equals economy_seats_available

## Next Steps

1. Review and approve seed data strategy
2. Update seed.py with new implementation
3. Test seed script on development database
4. Verify data integrity
5. Create backup of production data (if applicable)
6. Run migration on production database
7. Validate migrated data