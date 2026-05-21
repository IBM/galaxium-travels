from models import Base, User, Flight, Booking
from db import engine, SessionLocal
from datetime import datetime, timedelta
import random

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
    # Add demo flights
    flights = [
        Flight(origin="Earth", destination="Mars", departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z", price=1000000, seats_available=5),
        Flight(origin="Earth", destination="Moon", departure_time="2099-01-02T10:00:00Z", arrival_time="2099-01-02T14:00:00Z", price=500000, seats_available=3),
        Flight(origin="Mars", destination="Earth", departure_time="2099-01-03T12:00:00Z", arrival_time="2099-01-03T20:00:00Z", price=950000, seats_available=7),
        Flight(origin="Venus", destination="Earth", departure_time="2099-01-04T08:00:00Z", arrival_time="2099-01-04T18:00:00Z", price=1200000, seats_available=2),
        Flight(origin="Jupiter", destination="Europa", departure_time="2099-01-05T15:00:00Z", arrival_time="2099-01-05T19:00:00Z", price=2000000, seats_available=1),
        Flight(origin="Earth", destination="Venus", departure_time="2099-01-06T07:00:00Z", arrival_time="2099-01-06T15:00:00Z", price=1100000, seats_available=4),
        Flight(origin="Moon", destination="Mars", departure_time="2099-01-07T11:00:00Z", arrival_time="2099-01-07T19:00:00Z", price=800000, seats_available=6),
        Flight(origin="Mars", destination="Jupiter", departure_time="2099-01-08T13:00:00Z", arrival_time="2099-01-08T23:00:00Z", price=2500000, seats_available=2),
        Flight(origin="Europa", destination="Earth", departure_time="2099-01-09T09:00:00Z", arrival_time="2099-01-09T21:00:00Z", price=3000000, seats_available=3),
        Flight(origin="Earth", destination="Pluto", departure_time="2099-01-10T06:00:00Z", arrival_time="2099-01-11T06:00:00Z", price=5000000, seats_available=1),
    ]
    db.add_all(flights)
    db.commit()
    # Add demo bookings with infant support
    user_ids = [user.user_id for user in db.query(User).all()]
    flight_ids = [flight.flight_id for flight in db.query(Flight).all()]
    statuses = ["booked", "cancelled", "completed"]
    bookings = []
    now = datetime.utcnow()
    passenger_name_examples = [
        "John Doe",
        "Jane Smith, Baby Smith",
        "Alice Johnson",
        "Bob Williams, Emma Williams",
        "Charlie Brown, Lucy Brown, Baby Brown"
    ]
    for i in range(20):
        user_id = random.choice(user_ids)
        flight_id = random.choice(flight_ids)
        status = random.choice(statuses)
        booking_time = (now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))).isoformat() + "Z"
        num_adults = random.randint(1, 3)
        num_infants = random.randint(0, 2)
        passenger_names = random.choice(passenger_name_examples) if random.random() > 0.5 else None
        bookings.append(Booking(
            user_id=user_id, 
            flight_id=flight_id, 
            status=status, 
            booking_time=booking_time,
            num_adults=num_adults,
            num_infants=num_infants,
            passenger_names=passenger_names
        ))
    db.add_all(bookings)
    db.commit()
    db.close()
    print("Database seeded with elaborate demo data including infant bookings!")

if __name__ == "__main__":
    seed()

# Made with Bob
