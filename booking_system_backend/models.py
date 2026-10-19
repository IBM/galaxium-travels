from enum import Enum

from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class BookingStatus(str, Enum):
    BOOKED = "booked"
    CANCELLED = "cancelled"
    CANCELED = "cancelled"  # American spelling alias  # noqa: PIE796
    COMPLETED = "completed"

class User(Base):
    __tablename__ = 'users'
    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)

class Flight(Base):
    __tablename__ = 'flights'
    flight_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    departure_time = Column(String, nullable=False)
    arrival_time = Column(String, nullable=False)
    base_price = Column(Integer, nullable=False)  # Economy price (1x)
    economy_seats_available = Column(Integer, nullable=False)  # 60% of total
    business_seats_available = Column(Integer, nullable=False)  # 30% of total
    galaxium_seats_available = Column(Integer, nullable=False)  # 10% of total

class Booking(Base):
    __tablename__ = 'bookings'
    booking_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    flight_id = Column(Integer, ForeignKey('flights.flight_id'), nullable=False)
    status = Column(String, nullable=False)
    booking_time = Column(String, nullable=False)
    seat_class = Column(String, nullable=False, default='economy')  # economy/business/galaxium
    price_paid = Column(Integer, nullable=False)  # Actual price at booking time
    itinerary_id = Column(Integer, ForeignKey('itineraries.itinerary_id'), nullable=True)

class ItineraryStatus(str, Enum):
    HELD = "held"
    CONFIRMED = "confirmed"
    FAILED = "failed"

class Itinerary(Base):
    __tablename__ = 'itineraries'
    itinerary_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    status = Column(String, nullable=False)
    created_at = Column(String, nullable=False)  # ISO 8601, UTC
    total_price = Column(Integer, nullable=False)

class ItineraryLeg(Base):
    __tablename__ = 'itinerary_legs'
    leg_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    itinerary_id = Column(Integer, ForeignKey('itineraries.itinerary_id'), nullable=False)
    position = Column(Integer, nullable=False)  # 1-based leg order
    flight_id = Column(Integer, ForeignKey('flights.flight_id'), nullable=False)
    hold_id = Column(String, nullable=False)  # Java hold ID; never returned to clients
    booking_id = Column(Integer, ForeignKey('bookings.booking_id'), nullable=True)
