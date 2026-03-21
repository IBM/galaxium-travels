# Database Schema Changes for Seat Classes

## Current Schema Analysis

### Current Flight Table
```sql
CREATE TABLE flights (
    flight_id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin VARCHAR NOT NULL,
    destination VARCHAR NOT NULL,
    departure_time VARCHAR NOT NULL,
    arrival_time VARCHAR NOT NULL,
    price INTEGER NOT NULL,
    seats_available INTEGER NOT NULL
);
```

### Current Booking Table
```sql
CREATE TABLE bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    flight_id INTEGER NOT NULL,
    status VARCHAR NOT NULL,
    booking_time VARCHAR NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id)
);
```

## Proposed Schema Changes

### Updated Flight Table
```sql
CREATE TABLE flights (
    flight_id INTEGER PRIMARY KEY AUTOINCREMENT,
    origin VARCHAR NOT NULL,
    destination VARCHAR NOT NULL,
    departure_time VARCHAR NOT NULL,
    arrival_time VARCHAR NOT NULL,
    
    -- Pricing
    base_price INTEGER NOT NULL,  -- Base price for Economy class
    
    -- Seat Availability by Class
    economy_seats_available INTEGER NOT NULL DEFAULT 0,
    business_seats_available INTEGER NOT NULL DEFAULT 0,
    galaxium_seats_available INTEGER NOT NULL DEFAULT 0,
    
    -- Deprecated fields (keep for backward compatibility)
    price INTEGER,  -- Will be set to base_price
    seats_available INTEGER  -- Will be set to economy_seats_available
);
```

### Updated Booking Table
```sql
CREATE TABLE bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    flight_id INTEGER NOT NULL,
    
    -- New fields for seat classes
    seat_class VARCHAR NOT NULL DEFAULT 'economy',  -- 'economy', 'business', 'galaxium'
    price_paid INTEGER NOT NULL,  -- Actual price paid for this booking
    
    status VARCHAR NOT NULL,
    booking_time VARCHAR NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (flight_id) REFERENCES flights(flight_id)
);
```

### New Seat Class Configuration Table (Optional)
```sql
CREATE TABLE seat_class_config (
    class_name VARCHAR PRIMARY KEY,
    display_name VARCHAR NOT NULL,
    price_multiplier REAL NOT NULL,
    description TEXT,
    features TEXT,  -- JSON string of features
    display_order INTEGER NOT NULL
);

-- Initial data
INSERT INTO seat_class_config VALUES
    ('economy', 'Economy Class', 1.0, 'Standard seating for space travel', 
     '["Standard seat", "In-flight meal", "Entertainment system"]', 1),
    ('business', 'Business Class', 1.5, 'Enhanced comfort and amenities',
     '["Spacious seat", "Premium meals", "Priority boarding", "Extra luggage"]', 2),
    ('galaxium', 'Galaxium Class', 2.5, 'Premium luxury experience',
     '["Luxury pod", "Gourmet dining", "VIP lounge access", "Personal concierge", "Unlimited luggage"]', 3);
```

## SQLAlchemy Model Changes

### Updated Flight Model
```python
from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Flight(Base):
    __tablename__ = 'flights'
    
    flight_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    departure_time = Column(String, nullable=False)
    arrival_time = Column(String, nullable=False)
    
    # New pricing model
    base_price = Column(Integer, nullable=False)
    
    # Seat availability by class
    economy_seats_available = Column(Integer, nullable=False, default=0)
    business_seats_available = Column(Integer, nullable=False, default=0)
    galaxium_seats_available = Column(Integer, nullable=False, default=0)
    
    # Deprecated fields (for backward compatibility)
    price = Column(Integer, nullable=True)
    seats_available = Column(Integer, nullable=True)
    
    @property
    def total_seats_available(self):
        """Calculate total available seats across all classes"""
        return (self.economy_seats_available + 
                self.business_seats_available + 
                self.galaxium_seats_available)
    
    def get_class_price(self, seat_class: str) -> int:
        """Calculate price for a specific seat class"""
        multipliers = {
            'economy': 1.0,
            'business': 1.5,
            'galaxium': 2.5
        }
        return int(self.base_price * multipliers.get(seat_class, 1.0))
    
    def has_seats_available(self, seat_class: str) -> bool:
        """Check if seats are available for a specific class"""
        seat_counts = {
            'economy': self.economy_seats_available,
            'business': self.business_seats_available,
            'galaxium': self.galaxium_seats_available
        }
        return seat_counts.get(seat_class, 0) > 0
```

### Updated Booking Model
```python
class Booking(Base):
    __tablename__ = 'bookings'
    
    booking_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    flight_id = Column(Integer, ForeignKey('flights.flight_id'), nullable=False)
    
    # New fields
    seat_class = Column(String, nullable=False, default='economy')
    price_paid = Column(Integer, nullable=False)
    
    status = Column(String, nullable=False)
    booking_time = Column(String, nullable=False)
```

### Optional: SeatClassConfig Model
```python
class SeatClassConfig(Base):
    __tablename__ = 'seat_class_config'
    
    class_name = Column(String, primary_key=True)
    display_name = Column(String, nullable=False)
    price_multiplier = Column(Float, nullable=False)
    description = Column(String)
    features = Column(String)  # JSON string
    display_order = Column(Integer, nullable=False)
```

## Migration Strategy

### Step 1: Add New Columns (Non-Breaking)
```python
# Migration script
from sqlalchemy import text

def upgrade_database(engine):
    with engine.connect() as conn:
        # Add new columns to flights table
        conn.execute(text("""
            ALTER TABLE flights 
            ADD COLUMN base_price INTEGER
        """))
        
        conn.execute(text("""
            ALTER TABLE flights 
            ADD COLUMN economy_seats_available INTEGER DEFAULT 0
        """))
        
        conn.execute(text("""
            ALTER TABLE flights 
            ADD COLUMN business_seats_available INTEGER DEFAULT 0
        """))
        
        conn.execute(text("""
            ALTER TABLE flights 
            ADD COLUMN galaxium_seats_available INTEGER DEFAULT 0
        """))
        
        # Populate new columns from existing data
        conn.execute(text("""
            UPDATE flights 
            SET base_price = price,
                economy_seats_available = seats_available
        """))
        
        conn.commit()
```

### Step 2: Add Booking Columns
```python
def upgrade_bookings(engine):
    with engine.connect() as conn:
        # Add new columns to bookings table
        conn.execute(text("""
            ALTER TABLE bookings 
            ADD COLUMN seat_class VARCHAR DEFAULT 'economy'
        """))
        
        conn.execute(text("""
            ALTER TABLE bookings 
            ADD COLUMN price_paid INTEGER
        """))
        
        # Populate price_paid for existing bookings
        conn.execute(text("""
            UPDATE bookings 
            SET price_paid = (
                SELECT price FROM flights 
                WHERE flights.flight_id = bookings.flight_id
            )
        """))
        
        conn.commit()
```

### Step 3: Create Indexes
```python
def create_indexes(engine):
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE INDEX idx_bookings_seat_class 
            ON bookings(seat_class)
        """))
        
        conn.execute(text("""
            CREATE INDEX idx_bookings_flight_class 
            ON bookings(flight_id, seat_class)
        """))
        
        conn.commit()
```

## Data Validation Rules

### Flight Validation
- `base_price` must be > 0
- All seat availability counts must be >= 0
- At least one seat class should have available seats for a valid flight
- `economy_seats_available + business_seats_available + galaxium_seats_available > 0`

### Booking Validation
- `seat_class` must be one of: 'economy', 'business', 'galaxium'
- `price_paid` must match calculated price for the seat class at booking time
- Flight must have available seats in the requested class
- `price_paid = flight.base_price * class_multiplier`

## Rollback Strategy

If migration fails or issues arise:

1. **Immediate Rollback**: Keep old columns, revert application code
2. **Data Preservation**: All original data remains in `price` and `seats_available`
3. **Gradual Rollback**: Remove new columns if needed

```python
def rollback_migration(engine):
    with engine.connect() as conn:
        # Remove new columns from flights
        conn.execute(text("ALTER TABLE flights DROP COLUMN base_price"))
        conn.execute(text("ALTER TABLE flights DROP COLUMN economy_seats_available"))
        conn.execute(text("ALTER TABLE flights DROP COLUMN business_seats_available"))
        conn.execute(text("ALTER TABLE flights DROP COLUMN galaxium_seats_available"))
        
        # Remove new columns from bookings
        conn.execute(text("ALTER TABLE bookings DROP COLUMN seat_class"))
        conn.execute(text("ALTER TABLE bookings DROP COLUMN price_paid"))
        
        conn.commit()
```

## Testing Checklist

- [ ] Verify all existing flights have correct base_price
- [ ] Verify economy_seats_available matches old seats_available
- [ ] Verify all existing bookings have seat_class='economy'
- [ ] Verify price_paid matches original flight price
- [ ] Test booking with each seat class
- [ ] Test seat availability decrements correctly
- [ ] Test cancellation restores correct seat count
- [ ] Test price calculations for all classes
- [ ] Verify backward compatibility with old frontend
- [ ] Test concurrent bookings for same seat class

## Performance Considerations

### Indexes Needed
```sql
CREATE INDEX idx_flights_availability ON flights(
    economy_seats_available, 
    business_seats_available, 
    galaxium_seats_available
);

CREATE INDEX idx_bookings_seat_class ON bookings(seat_class);
CREATE INDEX idx_bookings_flight_class ON bookings(flight_id, seat_class);
```

### Query Optimization
- Use database transactions for booking operations
- Implement row-level locking for seat availability updates
- Cache seat class configuration
- Consider materialized views for reporting

## Next Steps

1. Review and approve schema changes
2. Create migration scripts
3. Test migration on development database
4. Update models.py with new schema
5. Update database initialization in db.py
6. Create comprehensive unit tests