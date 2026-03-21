from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Seat class multipliers
SEAT_CLASS_MULTIPLIERS = {
    'economy': 1.0,
    'business': 1.5,
    'galaxium': 2.5
}

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
    
    # NEW FIELDS (for seat classes)
    base_price = Column(Integer, nullable=False)
    economy_seats_available = Column(Integer, nullable=False, default=0)
    business_seats_available = Column(Integer, nullable=False, default=0)
    galaxium_seats_available = Column(Integer, nullable=False, default=0)
    
    # DEPRECATED FIELDS (for backward compatibility)
    price = Column(Integer, nullable=False)  # Always equals base_price
    seats_available = Column(Integer, nullable=False)  # Always equals economy_seats_available
    
    @property
    def total_seats_available(self):
        """Calculate total available seats across all classes"""
        return (self.economy_seats_available +
                self.business_seats_available +
                self.galaxium_seats_available)
    
    def get_class_price(self, seat_class: str) -> int:
        """Calculate price for a specific seat class"""
        return int(self.base_price * SEAT_CLASS_MULTIPLIERS.get(seat_class, 1.0))
    
    def has_seats_available(self, seat_class: str) -> bool:
        """Check if seats are available for a specific class"""
        seat_counts = {
            'economy': self.economy_seats_available,
            'business': self.business_seats_available,
            'galaxium': self.galaxium_seats_available
        }
        return seat_counts.get(seat_class, 0) > 0
    
    def get_seats_available(self, seat_class: str) -> int:
        """Get available seats for a specific class"""
        seat_counts = {
            'economy': self.economy_seats_available,
            'business': self.business_seats_available,
            'galaxium': self.galaxium_seats_available
        }
        return seat_counts.get(seat_class, 0)
    
    def decrement_seats(self, seat_class: str) -> bool:
        """Decrement seat count for a specific class. Returns True if successful."""
        if not self.has_seats_available(seat_class):
            return False
        
        if seat_class == 'economy':
            self.economy_seats_available -= 1
            self.seats_available = self.economy_seats_available  # Keep old field in sync
        elif seat_class == 'business':
            self.business_seats_available -= 1
        elif seat_class == 'galaxium':
            self.galaxium_seats_available -= 1
        else:
            return False
        
        return True
    
    def increment_seats(self, seat_class: str) -> bool:
        """Increment seat count for a specific class (for cancellations). Returns True if successful."""
        if seat_class == 'economy':
            self.economy_seats_available += 1
            self.seats_available = self.economy_seats_available  # Keep old field in sync
        elif seat_class == 'business':
            self.business_seats_available += 1
        elif seat_class == 'galaxium':
            self.galaxium_seats_available += 1
        else:
            return False
        
        return True

class Booking(Base):
    __tablename__ = 'bookings'
    booking_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    flight_id = Column(Integer, ForeignKey('flights.flight_id'), nullable=False)
    
    # NEW FIELDS (for seat classes)
    seat_class = Column(String, nullable=False, default='economy')
    price_paid = Column(Integer, nullable=False)
    
    status = Column(String, nullable=False)
    booking_time = Column(String, nullable=False)