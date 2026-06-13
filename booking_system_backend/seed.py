from dotenv import load_dotenv

# Load environment variables BEFORE importing db and models
load_dotenv()

from models import Base, User, Flight, Booking
from db import engine, SessionLocal
from datetime import datetime, timedelta
import random

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Only seed if the database is empty to avoid wiping registered users
    if db.query(User).count() > 0:
        print("Database already has data — skipping seed.")
        db.close()
        return
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
    # Add demo flights with seat class distribution (60% economy, 30% business, 10% galaxium)
    flight_data = [
        ("Earth", "Mars", "2099-01-01T09:00:00Z", "2099-01-01T17:00:00Z", 1000000, 10),
        ("Earth", "Moon", "2099-01-02T10:00:00Z", "2099-01-02T14:00:00Z", 500000, 10),
        ("Mars", "Earth", "2099-01-03T12:00:00Z", "2099-01-03T20:00:00Z", 950000, 10),
        ("Venus", "Earth", "2099-01-04T08:00:00Z", "2099-01-04T18:00:00Z", 1200000, 10),
        ("Jupiter", "Europa", "2099-01-05T15:00:00Z", "2099-01-05T19:00:00Z", 2000000, 10),
        ("Earth", "Venus", "2099-01-06T07:00:00Z", "2099-01-06T15:00:00Z", 1100000, 10),
        ("Moon", "Mars", "2099-01-07T11:00:00Z", "2099-01-07T19:00:00Z", 800000, 10),
        ("Mars", "Jupiter", "2099-01-08T13:00:00Z", "2099-01-08T23:00:00Z", 2500000, 10),
        ("Europa", "Earth", "2099-01-09T09:00:00Z", "2099-01-09T21:00:00Z", 3000000, 10),
        ("Earth", "Pluto", "2099-01-10T06:00:00Z", "2099-01-11T06:00:00Z", 5000000, 10),
    ]
    
    flights = []
    for origin, destination, departure, arrival, base_price, total_seats in flight_data:
        # Calculate seat distribution: 60% economy, 30% business, 10% galaxium
        economy_seats = int(total_seats * 0.6)
        business_seats = int(total_seats * 0.3)
        galaxium_seats = int(total_seats * 0.1)
        
        # Ensure at least 1 seat in each class if total_seats >= 3
        if total_seats >= 3:
            if economy_seats == 0:
                economy_seats = 1
            if business_seats == 0:
                business_seats = 1
            if galaxium_seats == 0:
                galaxium_seats = 1
        
        flights.append(Flight(
            origin=origin,
            destination=destination,
            departure_time=departure,
            arrival_time=arrival,
            base_price=base_price,
            economy_seats_available=economy_seats,
            business_seats_available=business_seats,
            galaxium_seats_available=galaxium_seats
        ))
    db.add_all(flights)
    db.commit()
    # Add demo bookings with seat classes
    user_ids = [user.user_id for user in db.query(User).all()]
    flight_ids = [flight.flight_id for flight in db.query(Flight).all()]
    statuses = ["booked", "cancelled", "completed"]
    seat_classes = ["economy", "business", "galaxium"]
    seat_class_weights = [0.6, 0.3, 0.1]  # 60% economy, 30% business, 10% galaxium
    
    bookings = []
    now = datetime.utcnow()
    for i in range(20):
        user_id = random.choice(user_ids)
        flight_id = random.choice(flight_ids)
        status = random.choice(statuses)
        seat_class = random.choices(seat_classes, weights=seat_class_weights)[0]
        booking_time = (now - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))).isoformat() + "Z"
        
        # Get flight to calculate price_paid
        flight = db.query(Flight).filter(Flight.flight_id == flight_id).first()
        if seat_class == 'economy':
            price_paid = flight.base_price
        elif seat_class == 'business':
            price_paid = int(flight.base_price * 2.5)
        else:  # galaxium
            price_paid = flight.base_price * 5
        
        bookings.append(Booking(
            user_id=user_id,
            flight_id=flight_id,
            status=status,
            booking_time=booking_time,
            seat_class=seat_class,
            price_paid=price_paid
        ))
    db.add_all(bookings)
    db.commit()
    db.close()
    print("Database seeded with elaborate demo data!")

if __name__ == "__main__":
    seed() 