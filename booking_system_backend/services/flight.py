from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, cast, Integer
from models import Flight
from schemas import FlightOut, ErrorResponse
from datetime import datetime, timedelta
from typing import Optional


# Popular route categories (hardcoded for demo)
ROUTE_CATEGORIES = {
    'inner_planets': ['Earth', 'Mars', 'Venus', 'Mercury'],
    'outer_planets': ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
    'moons': ['Titan', 'Europa', 'Ganymede', 'Callisto', 'Io', 'Enceladus']
}


def list_flights(
    db: Session,
    # Basic filters from main branch
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    departure_date_from: Optional[str] = None,
    departure_date_to: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    has_economy: Optional[bool] = None,
    has_business: Optional[bool] = None,
    has_galaxium: Optional[bool] = None,
    sort: Optional[str] = None,
    order: Optional[str] = 'asc',
    # Phase 1: Core Filters from feature branch
    sort_by: Optional[str] = None,
    sort_order: Optional[str] = None,
    seat_class: Optional[str] = None,
    # Phase 2: Additional Filters from feature branch
    departure_time_period: Optional[str] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    min_seats_available: Optional[int] = None,
    # Phase 3: Popular Routes from feature branch
    route_category: Optional[str] = None
) -> list[FlightOut] | ErrorResponse:
    """List flights with optional filtering and sorting.
    
    Supports both main branch filters and feature branch filters for backward compatibility.
    
    Args:
        db: Database session
        origin: Filter by origin (case-insensitive partial match)
        destination: Filter by destination (case-insensitive partial match)
        departure_date_from: Minimum departure date (ISO format or YYYY-MM-DD)
        departure_date_to: Maximum departure date (ISO format or YYYY-MM-DD)
        min_price: Minimum economy price
        max_price: Maximum economy price
        has_economy: Only flights with economy seats available
        has_business: Only flights with business seats available
        has_galaxium: Only flights with galaxium seats available
        sort: Sort by 'price', 'departure_time', or 'duration' (main branch style)
        order: Sort order 'asc' or 'desc' (main branch style)
        sort_by: Field to sort by (feature branch style)
        sort_order: Sort direction (feature branch style)
        seat_class: Filter by seat class availability (economy, business, galaxium)
        departure_time_period: Time of day (morning, afternoon, evening, night)
        min_duration: Minimum flight duration in hours
        max_duration: Maximum flight duration in hours
        min_seats_available: Minimum total seats available
        route_category: Route category (inner_planets, outer_planets, moons)
    
    Returns:
        List of FlightOut objects with computed prices for all seat classes
    """
    query = db.query(Flight)
    
    # Basic filters from main branch
    if origin:
        query = query.filter(Flight.origin.ilike(f'%{origin}%'))
    
    if destination:
        query = query.filter(Flight.destination.ilike(f'%{destination}%'))
    
    # Date range filter (supports both ISO format and YYYY-MM-DD)
    if departure_date_from:
        try:
            # Try ISO format first
            date_from = datetime.fromisoformat(departure_date_from.replace('Z', '+00:00'))
            query = query.filter(Flight.departure_time >= date_from.isoformat())
        except ValueError:
            # Fall back to simple string comparison for YYYY-MM-DD format
            query = query.filter(Flight.departure_time >= departure_date_from)
    
    if departure_date_to:
        try:
            # Try ISO format first
            date_to = datetime.fromisoformat(departure_date_to.replace('Z', '+00:00'))
            # Add one day to include the entire end date
            date_to = date_to + timedelta(days=1)
            query = query.filter(Flight.departure_time < date_to.isoformat())
        except ValueError:
            # Fall back to simple string comparison for YYYY-MM-DD format
            query = query.filter(Flight.departure_time <= f'{departure_date_to} 23:59')
    
    # Price range filter
    if min_price is not None:
        query = query.filter(Flight.base_price >= min_price)
    
    if max_price is not None:
        query = query.filter(Flight.base_price <= max_price)
    
    # Seat availability filters (main branch style)
    if has_economy:
        query = query.filter(Flight.economy_seats_available > 0)
    
    if has_business:
        query = query.filter(Flight.business_seats_available > 0)
    
    if has_galaxium:
        query = query.filter(Flight.galaxium_seats_available > 0)
    
    # Seat class availability filter (feature branch style)
    if seat_class:
        if seat_class == 'economy':
            query = query.filter(Flight.economy_seats_available > 0)
        elif seat_class == 'business':
            query = query.filter(Flight.business_seats_available > 0)
        elif seat_class == 'galaxium':
            query = query.filter(Flight.galaxium_seats_available > 0)
    
    # Phase 2: Departure time period filter
    if departure_time_period:
        # Extract hour from departure_time string (format: "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DD HH:MM")
        # Morning: 6-11, Afternoon: 12-17, Evening: 18-21, Night: 22-5
        if departure_time_period == 'morning':
            query = query.filter(
                and_(
                    func.cast(func.substr(Flight.departure_time, 12, 2), Integer) >= 6,
                    func.cast(func.substr(Flight.departure_time, 12, 2), Integer) < 12
                )
            )
        elif departure_time_period == 'afternoon':
            query = query.filter(
                and_(
                    func.cast(func.substr(Flight.departure_time, 12, 2), Integer) >= 12,
                    func.cast(func.substr(Flight.departure_time, 12, 2), Integer) < 18
                )
            )
        elif departure_time_period == 'evening':
            query = query.filter(
                and_(
                    func.cast(func.substr(Flight.departure_time, 12, 2), Integer) >= 18,
                    func.cast(func.substr(Flight.departure_time, 12, 2), Integer) < 22
                )
            )
        elif departure_time_period == 'night':
            query = query.filter(
                or_(
                    func.cast(func.substr(Flight.departure_time, 12, 2), Integer) >= 22,
                    func.cast(func.substr(Flight.departure_time, 12, 2), Integer) < 6
                )
            )
    
    # Phase 2: Minimum seats available filter
    if min_seats_available is not None:
        total_seats = (
            Flight.economy_seats_available +
            Flight.business_seats_available +
            Flight.galaxium_seats_available
        )
        query = query.filter(total_seats >= min_seats_available)
    
    # Phase 3: Route category filter
    if route_category and route_category in ROUTE_CATEGORIES:
        destinations = ROUTE_CATEGORIES[route_category]
        query = query.filter(
            or_(
                Flight.origin.in_(destinations),
                Flight.destination.in_(destinations)
            )
        )
    
    # Get all flights before sorting (needed for duration calculation)
    flights = query.all()
    
    # Convert to result list with computed prices and duration
    result = []
    for f in flights:
        # Calculate duration in hours
        try:
            # Try both ISO format and simple format
            dep_str = f.departure_time.replace('Z', '+00:00')
            arr_str = f.arrival_time.replace('Z', '+00:00')
            
            try:
                dep = datetime.fromisoformat(dep_str)
                arr = datetime.fromisoformat(arr_str)
            except ValueError:
                # Fall back to simple format
                dep = datetime.strptime(f.departure_time, "%Y-%m-%d %H:%M")
                arr = datetime.strptime(f.arrival_time, "%Y-%m-%d %H:%M")
            
            duration_hours = (arr - dep).total_seconds() / 3600
        except (ValueError, AttributeError):
            duration_hours = 0
        
        # Phase 2: Duration filter
        if min_duration is not None and duration_hours < min_duration:
            continue
        if max_duration is not None and duration_hours > max_duration:
            continue
        
        # Compute prices for all seat classes
        flight_dict = {
            'flight_id': f.flight_id,
            'origin': f.origin,
            'destination': f.destination,
            'departure_time': f.departure_time,
            'arrival_time': f.arrival_time,
            'base_price': f.base_price,
            'economy_seats_available': f.economy_seats_available,
            'business_seats_available': f.business_seats_available,
            'galaxium_seats_available': f.galaxium_seats_available,
            'economy_price': f.base_price,  # 1x
            'business_price': int(f.base_price * 2.5),  # 2.5x
            'galaxium_price': f.base_price * 5  # 5x
        }
        result.append((FlightOut(**flight_dict), duration_hours, f))
    
    # Apply sorting
    # Prefer feature branch style (sort_by/sort_order) over main branch style (sort/order)
    if sort_by or sort:
        actual_sort_by = sort_by or sort
        actual_sort_order = sort_order or order
        
        valid_sort_fields = ['departure_time', 'base_price', 'duration', 'seats_available', 'price']
        if actual_sort_by not in valid_sort_fields:
            actual_sort_by = 'departure_time'
        
        reverse = (actual_sort_order == 'desc')
        
        if actual_sort_by in ['departure_time']:
            result.sort(key=lambda x: x[0].departure_time, reverse=reverse)
        elif actual_sort_by in ['base_price', 'price']:
            result.sort(key=lambda x: x[0].base_price, reverse=reverse)
        elif actual_sort_by == 'duration':
            result.sort(key=lambda x: x[1], reverse=reverse)
        elif actual_sort_by == 'seats_available':
            result.sort(
                key=lambda x: (
                    x[2].economy_seats_available +
                    x[2].business_seats_available +
                    x[2].galaxium_seats_available
                ),
                reverse=reverse
            )
    
    # Return only FlightOut objects
    return [flight_out for flight_out, _, _ in result]

# Made with Bob
