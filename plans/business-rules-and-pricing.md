# Business Rules and Pricing for Seat Classes

## Seat Class Definitions

### Economy Class
**Target Market:** Budget-conscious travelers, families, students

**Features:**
- Standard seating with basic comfort
- In-flight meal service
- Entertainment system access
- 20kg luggage allowance
- Standard boarding process

**Pricing:**
- **Multiplier:** 1.0x (base price)
- **Example:** If base price is 1,000,000 credits, Economy costs 1,000,000 credits

**Typical Allocation:**
- Short routes: 60% of total seats
- Medium routes: 50% of total seats
- Long routes: 40% of total seats

---

### Business Class
**Target Market:** Business travelers, professionals, comfort seekers

**Features:**
- Spacious seating with extra legroom
- Premium meal and beverage service
- Priority boarding
- Enhanced entertainment options
- 40kg luggage allowance
- Access to business lounge (where available)
- Complimentary amenity kit

**Pricing:**
- **Multiplier:** 1.5x base price
- **Example:** If base price is 1,000,000 credits, Business costs 1,500,000 credits

**Typical Allocation:**
- Short routes: 30% of total seats
- Medium routes: 35% of total seats
- Long routes: 40% of total seats

---

### Galaxium Class
**Target Market:** Luxury travelers, VIPs, special occasions

**Features:**
- Luxury pod with full recline capability
- Gourmet dining experience with chef-prepared meals
- VIP lounge access at all spaceports
- Personal concierge service
- Unlimited luggage allowance
- Exclusive amenity kit with premium items
- Priority everything (boarding, baggage, customs)
- Private cabin on select routes
- Complimentary ground transportation

**Pricing:**
- **Multiplier:** 2.5x base price
- **Example:** If base price is 1,000,000 credits, Galaxium costs 2,500,000 credits

**Typical Allocation:**
- Short routes: 10% of total seats
- Medium routes: 15% of total seats
- Long routes: 20% of total seats

---

## Pricing Strategy

### Base Price Calculation
The base price for each route is determined by:
1. **Distance:** Longer routes have higher base prices
2. **Demand:** Popular routes may have premium pricing
3. **Operating Costs:** Fuel, crew, maintenance
4. **Market Competition:** Competitive pricing analysis

### Dynamic Pricing (Future Enhancement)
While not in the initial implementation, the system is designed to support:
- Peak/off-peak pricing
- Early bird discounts
- Last-minute pricing
- Seasonal adjustments
- Demand-based pricing

### Price Examples by Route Type

#### Short Routes (e.g., Earth-Moon)
**Base Price:** 500,000 credits
- Economy: 500,000 credits (1.0x)
- Business: 750,000 credits (1.5x)
- Galaxium: 1,250,000 credits (2.5x)

#### Medium Routes (e.g., Earth-Mars)
**Base Price:** 1,000,000 credits
- Economy: 1,000,000 credits (1.0x)
- Business: 1,500,000 credits (1.5x)
- Galaxium: 2,500,000 credits (2.5x)

#### Long Routes (e.g., Earth-Pluto)
**Base Price:** 5,000,000 credits
- Economy: 5,000,000 credits (1.0x)
- Business: 7,500,000 credits (1.5x)
- Galaxium: 12,500,000 credits (2.5x)

---

## Booking Rules

### General Rules
1. **One Seat Per Booking:** Each booking is for exactly one seat
2. **Seat Class Selection:** Must be made at time of booking
3. **No Class Changes:** Once booked, seat class cannot be changed (must cancel and rebook)
4. **Availability:** Bookings only allowed if seats available in selected class
5. **Payment:** Full payment required at time of booking

### Cancellation Rules
1. **Refund Policy:**
   - Cancel >48 hours before departure: 90% refund
   - Cancel 24-48 hours before: 50% refund
   - Cancel <24 hours before: No refund
   - (Note: Refund logic not implemented in initial version)

2. **Seat Restoration:** Cancelled seats are returned to the correct class inventory

### Upgrade Rules (Future Enhancement)
1. Upgrades allowed based on availability
2. Pay difference in price
3. Downgrades not allowed (must cancel and rebook)

---

## Inventory Management

### Seat Allocation Strategy
Each flight maintains separate inventory for each class:
- Economy seats counter
- Business seats counter
- Galaxium seats counter

### Overbooking Policy
**Initial Implementation:** No overbooking
- Strict seat availability enforcement
- Bookings rejected when class is full

**Future Enhancement:** Controlled overbooking
- Small percentage overbooking allowed
- Waitlist management
- Automatic upgrades for overbooked passengers

### Seat Availability Display
- Real-time availability shown for each class
- Low seat warnings (≤2 seats remaining)
- Sold out indicators
- Total seats available across all classes

---

## Revenue Management

### Revenue Optimization
The seat class system enables:
1. **Price Discrimination:** Different prices for different customer segments
2. **Revenue Maximization:** Higher revenue per flight through premium classes
3. **Load Factor Optimization:** Better capacity utilization
4. **Customer Segmentation:** Targeted offerings for different markets

### Expected Revenue Impact
Based on typical airline industry patterns:

**Example Flight: Earth-Mars (20 seats, base price 1,000,000)**

**Without Seat Classes (All Economy):**
- 20 seats × 1,000,000 = 20,000,000 credits

**With Seat Classes:**
- 10 Economy × 1,000,000 = 10,000,000
- 7 Business × 1,500,000 = 10,500,000
- 3 Galaxium × 2,500,000 = 7,500,000
- **Total: 28,000,000 credits (+40% revenue)**

---

## Customer Experience Rules

### Transparency
1. **Clear Pricing:** All prices displayed upfront
2. **Feature Comparison:** Easy comparison of class features
3. **No Hidden Fees:** All-inclusive pricing
4. **Availability Visibility:** Real-time seat availability

### Fairness
1. **Equal Access:** All classes available to all customers
2. **No Discrimination:** Booking based on availability only
3. **Consistent Pricing:** Same price for same class on same flight
4. **Clear Policies:** Transparent cancellation and change policies

### User Interface Guidelines
1. **Default Selection:** Economy class pre-selected
2. **Visual Hierarchy:** Clear distinction between classes
3. **Feature Highlights:** Key benefits of each class visible
4. **Price Comparison:** Easy to compare prices
5. **Availability Indicators:** Clear sold-out/low-seat warnings

---

## Validation Rules

### Booking Validation
```python
def validate_booking(flight, seat_class, user):
    """Validate booking request"""
    
    # Check seat class is valid
    if seat_class not in ['economy', 'business', 'galaxium']:
        return False, "Invalid seat class"
    
    # Check seats available
    seat_attr = f"{seat_class}_seats_available"
    if getattr(flight, seat_attr) < 1:
        return False, f"No {seat_class} seats available"
    
    # Check user is registered
    if not user:
        return False, "User not registered"
    
    # Check flight hasn't departed
    if flight.departure_time < datetime.now():
        return False, "Flight has already departed"
    
    return True, "Validation passed"
```

### Price Validation
```python
def validate_price(flight, seat_class, price_paid):
    """Validate price paid matches seat class"""
    
    multipliers = {
        'economy': 1.0,
        'business': 1.5,
        'galaxium': 2.5
    }
    
    expected_price = int(flight.base_price * multipliers[seat_class])
    
    if price_paid != expected_price:
        return False, f"Price mismatch: expected {expected_price}, got {price_paid}"
    
    return True, "Price valid"
```

---

## Reporting and Analytics

### Key Metrics to Track
1. **Booking Distribution:**
   - Percentage of bookings per class
   - Revenue per class
   - Average booking value

2. **Seat Utilization:**
   - Load factor per class
   - Unsold seats per class
   - Upgrade patterns

3. **Revenue Metrics:**
   - Revenue per available seat mile (RASM)
   - Yield per passenger
   - Total revenue per flight

4. **Customer Behavior:**
   - Class preference by route
   - Booking lead time by class
   - Cancellation rates by class

### Sample Report Structure
```
Flight Performance Report
========================
Flight: Earth → Mars (Flight #1)
Date: 2099-01-01

Seat Class Performance:
-----------------------
Economy (10 seats):
  - Booked: 8 (80%)
  - Revenue: 8,000,000 credits
  - Avg Price: 1,000,000 credits

Business (7 seats):
  - Booked: 6 (86%)
  - Revenue: 9,000,000 credits
  - Avg Price: 1,500,000 credits

Galaxium (3 seats):
  - Booked: 2 (67%)
  - Revenue: 5,000,000 credits
  - Avg Price: 2,500,000 credits

Total:
  - Seats: 20
  - Booked: 16 (80% load factor)
  - Revenue: 22,000,000 credits
  - Avg Revenue per Seat: 1,375,000 credits
```

---

## Compliance and Legal

### Terms and Conditions
1. Seat class features subject to availability
2. Amenities may vary by route
3. Prices subject to change before booking
4. Cancellation policies apply
5. Luggage allowances strictly enforced

### Data Privacy
1. Booking information confidential
2. Seat class preference not shared
3. Payment information secured
4. GDPR/privacy law compliance

### Accessibility
1. All classes accessible to passengers with disabilities
2. Special assistance available in all classes
3. No discrimination based on seat class
4. Equal treatment for all passengers

---

## Future Enhancements

### Planned Features
1. **Dynamic Pricing:** Real-time price adjustments
2. **Loyalty Program:** Points and tier benefits
3. **Upgrade Bidding:** Bid for upgrades
4. **Group Bookings:** Multiple seats in one booking
5. **Seat Selection:** Choose specific seat within class
6. **Meal Preferences:** Pre-order meals
7. **Special Requests:** Dietary, accessibility needs

### Advanced Revenue Management
1. **Yield Management:** Optimize pricing by demand
2. **Forecasting:** Predict booking patterns
3. **Competitive Analysis:** Monitor competitor pricing
4. **A/B Testing:** Test pricing strategies
5. **Personalized Pricing:** Targeted offers

---

## Configuration Constants

### System Constants
```python
# Seat class multipliers
SEAT_CLASS_MULTIPLIERS = {
    'economy': 1.0,
    'business': 1.5,
    'galaxium': 2.5
}

# Seat class names
SEAT_CLASS_NAMES = {
    'economy': 'Economy Class',
    'business': 'Business Class',
    'galaxium': 'Galaxium Class'
}

# Default seat allocation percentages
SEAT_ALLOCATION = {
    'short': {'economy': 0.60, 'business': 0.30, 'galaxium': 0.10},
    'medium': {'economy': 0.50, 'business': 0.35, 'galaxium': 0.15},
    'long': {'economy': 0.40, 'business': 0.40, 'galaxium': 0.20}
}

# Low seat threshold
LOW_SEAT_THRESHOLD = 2

# Minimum seats per class
MIN_SEATS_PER_CLASS = {
    'economy': 1,
    'business': 0,  # Optional on small flights
    'galaxium': 0   # Optional on small flights
}
```

---

## Summary

The seat class system for Galaxium Travels provides:
1. **Three distinct classes** with clear value propositions
2. **Simple pricing model** based on multipliers
3. **Flexible inventory management** with separate counters
4. **Revenue optimization** through price discrimination
5. **Enhanced customer experience** with choice and transparency
6. **Scalable architecture** for future enhancements

The system balances business objectives (revenue maximization) with customer needs (choice, transparency, fairness) while maintaining operational simplicity.