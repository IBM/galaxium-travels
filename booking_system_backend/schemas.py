from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from enum import Enum


# Seat class enum
class SeatClass(str, Enum):
    ECONOMY = "economy"
    BUSINESS = "business"
    GALAXIUM = "galaxium"


# Seat class availability for a flight
class SeatClassAvailability(BaseModel):
    price: int
    seats_available: int
    multiplier: float


# Updated Flight schema with seat classes
class FlightOut(BaseModel):
    flight_id: int
    origin: str
    destination: str
    departure_time: str
    arrival_time: str
    base_price: int
    seat_classes: dict[str, SeatClassAvailability]
    total_seats_available: int
    
    # Deprecated fields (for backward compatibility)
    price: int
    seats_available: int
    
    class Config:
        from_attributes = True


# Updated booking request with optional seat class
class BookingRequest(BaseModel):
    user_id: int
    name: str
    flight_id: int
    seat_class: str = Field(default='economy', pattern='^(economy|business|galaxium)$')


# Updated booking response with seat class info
class BookingOut(BaseModel):
    booking_id: int
    user_id: int
    flight_id: int
    seat_class: str
    price_paid: int
    status: str
    booking_time: str
    
    class Config:
        from_attributes = True


class UserRegistration(BaseModel):
    name: str
    email: EmailStr


class UserOut(BaseModel):
    user_id: int
    name: str
    email: str

    class Config:
        from_attributes = True


# Seat class information schema
class SeatClassInfo(BaseModel):
    class_name: str
    display_name: str
    price_multiplier: float
    description: str
    features: list[str]


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    error_code: str
    details: Optional[str] = None
