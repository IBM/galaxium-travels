# Seat Classes Implementation Plan for Galaxium Travels

## Overview
This document outlines the plan to implement three distinct seat classes for Galaxium Travels: **Economy**, **Business**, and **Galaxium** class.

## Business Requirements

### Seat Classes
1. **Economy Class**
   - Base price (1x multiplier)
   - Standard seating
   - Entry-level space travel experience

2. **Business Class**
   - 1.5x price multiplier
   - Enhanced comfort and amenities
   - Priority boarding

3. **Galaxium Class**
   - 2.5x price multiplier
   - Premium luxury experience
   - Exclusive amenities and services

### Key Design Decisions
- **Pricing Model**: Each class uses a multiplier on the base flight price
  - Economy: 1.0x
  - Business: 1.5x
  - Galaxium: 2.5x

- **Seat Availability**: Separate seat counts per class
  - Each flight will have independent seat inventory for each class
  - Example: 10 Economy, 5 Business, 2 Galaxium seats

- **Frontend Strategy**: Dual frontend approach
  - Original frontend remains at port 5173 (without seat classes)
  - New frontend at port 5174 with seat class selection (booking_system_frontend_classes)

## System Architecture Impact

### Database Changes Required
The current schema needs modifications to support seat classes:

**Current Flight Model:**
```python
class Flight(Base):
    flight_id: int (PK)
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    price: int              # Base price
    seats_available: int    # Total seats
```

**Proposed Flight Model:**
```python
class Flight(Base):
    flight_id: int (PK)
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    base_price: int                    # Base price for Economy
    economy_seats_available: int       # Economy seat count
    business_seats_available: int      # Business seat count
    galaxium_seats_available: int      # Galaxium seat count
```

**Current Booking Model:**
```python
class Booking(Base):
    booking_id: int (PK)
    user_id: int (FK)
    flight_id: int (FK)
    status: str
    booking_time: str
```

**Proposed Booking Model:**
```python
class Booking(Base):
    booking_id: int (PK)
    user_id: int (FK)
    flight_id: int (FK)
    seat_class: str              # 'economy', 'business', 'galaxium'
    price_paid: int              # Actual price paid for this booking
    status: str
    booking_time: str
```

### API Changes Required

#### Modified Endpoints

**GET /flights**
- Response should include seat availability for all classes
- Calculate prices for each class using multipliers

**POST /book**
- Add `seat_class` parameter to booking request
- Validate seat availability for specific class
- Calculate and store actual price paid
- Decrement appropriate seat class counter

**GET /bookings/{user_id}**
- Include seat class information in response
- Include price paid for each booking

#### New Endpoints (Optional)
- **GET /seat-classes** - Return available seat classes with multipliers
- **GET /flights/{flight_id}/availability** - Detailed seat availability by class

### Frontend Changes (booking_system_frontend_classes)

#### New Components Needed
1. **SeatClassSelector** - UI component for selecting seat class
2. **SeatClassCard** - Display individual seat class options with pricing
3. **Enhanced FlightCard** - Show availability for all seat classes
4. **Enhanced BookingModal** - Include seat class selection

#### UI/UX Considerations
- Visual distinction between seat classes (colors, icons, badges)
- Clear pricing display for each class
- Real-time availability updates per class
- Responsive design for seat class selection
- Premium visual treatment for Galaxium class

## Implementation Phases

### Phase 1: Database & Backend Foundation
1. Update database models
2. Create migration strategy
3. Modify booking service logic
4. Update API schemas
5. Add seat class validation

### Phase 2: API Enhancement
1. Update existing endpoints
2. Add new endpoints if needed
3. Update error handling for seat class scenarios
4. Add comprehensive tests

### Phase 3: Frontend Development
1. Clone existing frontend to booking_system_frontend_classes
2. Configure new frontend for port 5174
3. Create seat class components
4. Update existing components for seat class support
5. Implement seat class selection flow

### Phase 4: Data Migration & Seeding
1. Update seed data with seat class information
2. Create realistic demo data for all classes
3. Test data integrity

### Phase 5: Integration & Testing
1. End-to-end testing
2. Update startup scripts
3. Update documentation
4. Performance testing

## Migration Strategy

### Backward Compatibility
- Keep original `price` and `seats_available` fields initially
- Populate them with Economy class values for backward compatibility
- Original frontend continues to work with Economy class only
- Deprecate old fields after transition period

### Data Migration Steps
1. Add new columns to Flight table
2. Populate new columns based on existing data
3. Add seat_class column to Booking table
4. Set existing bookings to 'economy' class
5. Update application code to use new fields
6. Test both frontends
7. Eventually remove deprecated fields

## Risk Assessment

### Technical Risks
- Database migration complexity
- Backward compatibility issues
- Race conditions in seat booking
- Price calculation errors

### Mitigation Strategies
- Comprehensive testing at each phase
- Database transaction management
- Atomic seat availability updates
- Price validation and audit logging

## Success Criteria
- ✅ Three distinct seat classes functional
- ✅ Separate seat inventory per class
- ✅ Correct price calculation with multipliers
- ✅ Both frontends operational simultaneously
- ✅ No data loss during migration
- ✅ Comprehensive test coverage
- ✅ Updated documentation

## Timeline Estimate
- Phase 1: 2-3 days
- Phase 2: 1-2 days
- Phase 3: 3-4 days
- Phase 4: 1 day
- Phase 5: 2-3 days

**Total: 9-13 days**

## Next Steps
1. Review and approve this plan
2. Begin Phase 1 implementation
3. Set up development environment for new frontend
4. Create detailed technical specifications for each component