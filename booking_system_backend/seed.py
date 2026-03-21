from models import Base, User, Flight, Booking, SEAT_CLASS_MULTIPLIERS
from db import engine, SessionLocal
from datetime import datetime, timedelta
import random


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
            # Backward compatibility fields
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
    print("\nFlight Summary:")
    for flight in flights:
        print(f"\n{flight.origin} → {flight.destination}:")
        print(f"  Economy: {flight.economy_seats_available} seats @ {flight.base_price:,} credits")
        print(f"  Business: {flight.business_seats_available} seats @ {int(flight.base_price * 1.5):,} credits")
        print(f"  Galaxium: {flight.galaxium_seats_available} seats @ {int(flight.base_price * 2.5):,} credits")
    
    db.close()


if __name__ == "__main__":
    seed()

# Made with Bob
