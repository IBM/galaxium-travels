from pydantic import BaseModel, EmailStr
from typing import Optional, Literal, List

# Seat class type definition
SeatClass = Literal['economy', 'business', 'galaxium']


class FlightQueryParams(BaseModel):
    """Query parameters for filtering and sorting flights."""
    # Location filters (case-insensitive partial match)
    origin: Optional[str] = None
    destination: Optional[str] = None
    
    # Date range filters (format: YYYY-MM-DD)
    departure_date_from: Optional[str] = None
    departure_date_to: Optional[str] = None
    
    # Price range filters
    min_price: Optional[int] = None
    max_price: Optional[int] = None
    
    # Seat availability filters (at least 1 seat available)
    has_economy: Optional[bool] = None
    has_business: Optional[bool] = None
    has_galaxium: Optional[bool] = None
    
    # Sorting
    sort: Optional[Literal['price', 'departure_time', 'duration']] = None
    order: Optional[Literal['asc', 'desc']] = 'asc'


class FlightOut(BaseModel):
    flight_id: int
    origin: str
    destination: str
    departure_time: str  # Format: YYYY-MM-DD HH:MM
    arrival_time: str    # Format: YYYY-MM-DD HH:MM
    base_price: int  # Economy price (1x)
    economy_seats_available: int
    business_seats_available: int
    galaxium_seats_available: int
    # Computed prices for all classes
    economy_price: int
    business_price: int
    galaxium_price: int

    class Config:
        from_attributes = True


class AddOn(BaseModel):
    id: str
    name: str
    price: int
    selected: bool = False
    description: Optional[str] = None
    icon: Optional[str] = None


class BookingRequest(BaseModel):
    user_id: int
    name: str
    flight_id: int
    seat_class: SeatClass = 'economy'  # Default to economy
    addons: Optional[List[AddOn]] = None


class BookingOut(BaseModel):
    booking_id: int
    user_id: int
    flight_id: int
    status: str
    booking_time: str
    seat_class: str
    price_paid: int
    addons: Optional[List[AddOn]] = None

    class Config:
        from_attributes = True


class UserRegistration(BaseModel):
    name: str
    email: str


class UserOut(BaseModel):
    user_id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    error_code: str
    details: Optional[str] = None
