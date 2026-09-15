from typing import Literal

from pydantic import BaseModel, ConfigDict

# Seat class type definition
SeatClass = Literal['economy', 'business', 'galaxium']


class FlightQueryParams(BaseModel):
    """Query parameters for filtering and sorting flights."""
    # Location filters (case-insensitive partial match)
    origin: str | None = None
    destination: str | None = None
    
    # Date range filters (format: YYYY-MM-DD)
    departure_date_from: str | None = None
    departure_date_to: str | None = None
    
    # Price range filters
    min_price: int | None = None
    max_price: int | None = None
    
    # Seat availability filters (at least 1 seat available)
    has_economy: bool | None = None
    has_business: bool | None = None
    has_galaxium: bool | None = None
    
    # Sorting
    sort: Literal['price', 'departure_time', 'duration'] | None = None
    order: Literal['asc', 'desc'] | None = 'asc'


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

    model_config = ConfigDict(from_attributes=True)


class BookingRequest(BaseModel):
    user_id: int
    name: str
    flight_id: int
    seat_class: SeatClass = 'economy'  # Default to economy


class BookingOut(BaseModel):
    booking_id: int
    user_id: int
    flight_id: int
    status: str
    booking_time: str
    seat_class: str
    price_paid: int

    model_config = ConfigDict(from_attributes=True)


class UserRegistration(BaseModel):
    name: str
    email: str


class UserOut(BaseModel):
    user_id: int
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    error_code: str
    details: str | None = None


class CancellationPreview(BaseModel):
    booking_id: int
    price_paid: int
    tier_label: str        # e.g. "Full Refund", "Partial Refund", "Travel Credit Only", "No Refund"
    refund_amount: int     # cash refund in same currency units as price_paid
    fee_amount: int        # cancellation fee retained by airline
    credit_amount: int     # travel-credit issued (non-cash)
    refund_pct: float      # 0.0–1.0 fraction of price_paid returned as cash
    fee_pct: float
    credit_pct: float
