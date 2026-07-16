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
    # Add demo flights — each flight has per-class pricing and seat counts:
    #   Economy:  base price × 1,  50 seats
    #   Business: base price × 2,  20 seats
    #   Galaxium: base price × 5,   5 seats
    flights = [
        Flight(origin="Earth", destination="Mars", departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z", economy_price=1000000, economy_seats=50, business_price=2000000, business_seats=20, galaxium_price=5000000, galaxium_seats=5),
        Flight(origin="Earth", destination="Moon", departure_time="2099-01-02T10:00:00Z", arrival_time="2099-01-02T14:00:00Z", economy_price=500000, economy_seats=50, business_price=1000000, business_seats=20, galaxium_price=2500000, galaxium_seats=5),
        Flight(origin="Mars", destination="Earth", departure_time="2099-01-03T12:00:00Z", arrival_time="2099-01-03T20:00:00Z", economy_price=950000, economy_seats=50, business_price=1900000, business_seats=20, galaxium_price=4750000, galaxium_seats=5),
        Flight(origin="Venus", destination="Earth", departure_time="2099-01-04T08:00:00Z", arrival_time="2099-01-04T18:00:00Z", economy_price=1200000, economy_seats=50, business_price=2400000, business_seats=20, galaxium_price=6000000, galaxium_seats=5),
        Flight(origin="Jupiter", destination="Europa", departure_time="2099-01-05T15:00:00Z", arrival_time="2099-01-05T19:00:00Z", economy_price=2000000, economy_seats=50, business_price=4000000, business_seats=20, galaxium_price=10000000, galaxium_seats=5),
        Flight(origin="Earth", destination="Venus", departure_time="2099-01-06T07:00:00Z", arrival_time="2099-01-06T15:00:00Z", economy_price=1100000, economy_seats=50, business_price=2200000, business_seats=20, galaxium_price=5500000, galaxium_seats=5),
        Flight(origin="Moon", destination="Mars", departure_time="2099-01-07T11:00:00Z", arrival_time="2099-01-07T19:00:00Z", economy_price=800000, economy_seats=50, business_price=1600000, business_seats=20, galaxium_price=4000000, galaxium_seats=5),
        Flight(origin="Mars", destination="Jupiter", departure_time="2099-01-08T13:00:00Z", arrival_time="2099-01-08T23:00:00Z", economy_price=2500000, economy_seats=50, business_price=5000000, business_seats=20, galaxium_price=12500000, galaxium_seats=5),
        Flight(origin="Europa", destination="Earth", departure_time="2099-01-09T09:00:00Z", arrival_time="2099-01-09T21:00:00Z", economy_price=3000000, economy_seats=50, business_price=6000000, business_seats=20, galaxium_price=15000000, galaxium_seats=5),
        Flight(origin="Earth", destination="Pluto", departure_time="2099-01-10T06:00:00Z", arrival_time="2099-01-11T06:00:00Z", economy_price=5000000, economy_seats=50, business_price=10000000, business_seats=20, galaxium_price=25000000, galaxium_seats=5),
    ]
    db.add_all(flights)
    db.commit()
    # Add demo bookings
    user_ids = [user.user_id for user in db.query(User).all()]
    flight_ids = [flight.flight_id for flight in db.query(Flight).all()]
    statuses = ["booked", "cancelled", "completed"]
    seat_classes = ["economy", "business", "galaxium"]
    bookings = []
    now = datetime.utcnow()
    for i in range(20):
        user_id = random.choice(user_ids)
        flight_id = random.choice(flight_ids)
        status = random.choice(statuses)
        seat_class = random.choice(seat_classes)
        booking_time = (now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))).isoformat() + "Z"
        bookings.append(Booking(user_id=user_id, flight_id=flight_id, status=status, seat_class=seat_class, booking_time=booking_time))
    db.add_all(bookings)
    db.commit()
    db.close()
    print("Database seeded with elaborate demo data!")

if __name__ == "__main__":
    seed() 