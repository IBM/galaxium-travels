from datetime import datetime

from sqlalchemy import Integer, and_, func, or_
from sqlalchemy.orm import Session

from models import Flight
from schemas import ErrorResponse, FlightOut


def _flight_to_out(f: Flight) -> FlightOut:
    return FlightOut(
        flight_id=f.flight_id,
        origin=f.origin,
        destination=f.destination,
        departure_time=f.departure_time,
        arrival_time=f.arrival_time,
        base_price=f.base_price,
        economy_seats_available=f.economy_seats_available,
        business_seats_available=f.business_seats_available,
        galaxium_seats_available=f.galaxium_seats_available,
        economy_price=f.base_price,
        business_price=int(f.base_price * 2.5),
        galaxium_price=f.base_price * 5,
    )


# Popular route categories (hardcoded for demo)
ROUTE_CATEGORIES = {
    'inner_planets': ['Earth', 'Mars', 'Venus', 'Mercury'],
    'outer_planets': ['Jupiter', 'Saturn', 'Uranus', 'Neptune'],
    'moons': ['Titan', 'Europa', 'Ganymede', 'Callisto', 'Io', 'Enceladus']
}


def list_flights(
    db: Session,
    # Basic filters from main branch
    origin: str | None = None,
    destination: str | None = None,
    departure_date_from: str | None = None,
    departure_date_to: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    has_economy: bool | None = None,
    has_business: bool | None = None,
    has_galaxium: bool | None = None,
    sort: str | None = None,
    order: str | None = 'asc',
    # Phase 1: Core Filters from feature branch
    sort_by: str | None = None,
    sort_order: str | None = None,
    seat_class: str | None = None,
    # Phase 2: Additional Filters from feature branch
    departure_time_period: str | None = None,
    min_duration: int | None = None,
    max_duration: int | None = None,
    min_seats_available: int | None = None,
    # Phase 3: Popular Routes from feature branch
    route_category: str | None = None
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
    
    # Date range filter — normalise to "YYYY-MM-DD HH:MM" for consistent SQLite comparison
    if departure_date_from:
        query = query.filter(Flight.departure_time >= f'{departure_date_from[:10]} 00:00')

    if departure_date_to:
        query = query.filter(Flight.departure_time <= f'{departure_date_to[:10]} 23:59')
    
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
        query = query.filter(Flight.destination.in_(destinations))
    
    # Get all flights before sorting (needed for duration calculation)
    flights = query.all()
    
    # Convert to result list with computed prices and duration
    result = []
    for f in flights:
        # Calculate duration in hours
        try:
            dep = datetime.strptime(f.departure_time, "%Y-%m-%d %H:%M")  # noqa: DTZ007
            arr = datetime.strptime(f.arrival_time, "%Y-%m-%d %H:%M")  # noqa: DTZ007
            duration_hours = (arr - dep).total_seconds() / 3600
        except (ValueError, AttributeError):
            duration_hours = 0

        # Phase 2: Duration filter
        if min_duration is not None and duration_hours < min_duration:
            continue
        if max_duration is not None and duration_hours > max_duration:
            continue

        result.append((_flight_to_out(f), duration_hours, f))
    
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
