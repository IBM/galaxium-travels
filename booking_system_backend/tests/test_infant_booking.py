"""Test infant booking feature"""
import pytest
from sqlalchemy.orm import Session
from models import User, Flight, Booking
from services.booking import book_flight
from schemas import ErrorResponse


def test_book_flight_with_infants(db_session: Session):
    """Test booking a flight with infants"""
    # Create test user
    user = User(name="Test User", email="test@example.com")
    db_session.add(user)
    db_session.commit()
    
    # Create test flight
    flight = Flight(
        origin="Earth",
        destination="Mars",
        departure_time="2099-01-01T09:00:00Z",
        arrival_time="2099-01-01T17:00:00Z",
        base_price=1000,
        economy_seats_available=5,
        business_seats_available=3,
        galaxium_seats_available=1
    )
    db_session.add(flight)
    db_session.commit()
    
    # Book flight with 2 infants
    result = book_flight(
        db=db_session,
        user_id=user.user_id,
        name=user.name,
        flight_id=flight.flight_id,
        seat_class='economy',
        infant_count=2
    )
    
    # Verify booking was successful
    assert not isinstance(result, ErrorResponse)
    assert result.infant_count == 2
    
    # Verify pricing: adult (1000) + 2 infants (100 each) = 1200
    assert result.price_paid == 1200
    
    # Verify seat was decremented
    db_session.refresh(flight)
    assert flight.economy_seats_available == 4


def test_book_flight_with_one_infant(db_session: Session):
    """Test booking a flight with one infant"""
    user = User(name="Test User", email="test@example.com")
    db_session.add(user)
    db_session.commit()
    
    flight = Flight(
        origin="Earth",
        destination="Mars",
        departure_time="2099-01-01T09:00:00Z",
        arrival_time="2099-01-01T17:00:00Z",
        base_price=2000,
        economy_seats_available=5,
        business_seats_available=3,
        galaxium_seats_available=1
    )
    db_session.add(flight)
    db_session.commit()
    
    result = book_flight(
        db=db_session,
        user_id=user.user_id,
        name=user.name,
        flight_id=flight.flight_id,
        seat_class='business',
        infant_count=1
    )
    
    assert not isinstance(result, ErrorResponse)
    assert result.infant_count == 1
    
    # Business class: adult (2000 * 2.5 = 5000) + 1 infant (500) = 5500
    assert result.price_paid == 5500


def test_book_flight_no_infants(db_session: Session):
    """Test booking a flight without infants (default behavior)"""
    user = User(name="Test User", email="test@example.com")
    db_session.add(user)
    db_session.commit()
    
    flight = Flight(
        origin="Earth",
        destination="Mars",
        departure_time="2099-01-01T09:00:00Z",
        arrival_time="2099-01-01T17:00:00Z",
        base_price=1000,
        economy_seats_available=5,
        business_seats_available=3,
        galaxium_seats_available=1
    )
    db_session.add(flight)
    db_session.commit()
    
    result = book_flight(
        db=db_session,
        user_id=user.user_id,
        name=user.name,
        flight_id=flight.flight_id,
        seat_class='economy'
    )
    
    assert not isinstance(result, ErrorResponse)
    assert result.infant_count == 0
    assert result.price_paid == 1000


def test_book_flight_too_many_infants(db_session: Session):
    """Test that booking with more than 2 infants fails"""
    user = User(name="Test User", email="test@example.com")
    db_session.add(user)
    db_session.commit()
    
    flight = Flight(
        origin="Earth",
        destination="Mars",
        departure_time="2099-01-01T09:00:00Z",
        arrival_time="2099-01-01T17:00:00Z",
        base_price=1000,
        economy_seats_available=5,
        business_seats_available=3,
        galaxium_seats_available=1
    )
    db_session.add(flight)
    db_session.commit()
    
    result = book_flight(
        db=db_session,
        user_id=user.user_id,
        name=user.name,
        flight_id=flight.flight_id,
        seat_class='economy',
        infant_count=3
    )
    
    assert isinstance(result, ErrorResponse)
    assert result.error_code == "TOO_MANY_INFANTS"


def test_book_flight_negative_infants(db_session: Session):
    """Test that booking with negative infant count fails"""
    user = User(name="Test User", email="test@example.com")
    db_session.add(user)
    db_session.commit()
    
    flight = Flight(
        origin="Earth",
        destination="Mars",
        departure_time="2099-01-01T09:00:00Z",
        arrival_time="2099-01-01T17:00:00Z",
        base_price=1000,
        economy_seats_available=5,
        business_seats_available=3,
        galaxium_seats_available=1
    )
    db_session.add(flight)
    db_session.commit()
    
    result = book_flight(
        db=db_session,
        user_id=user.user_id,
        name=user.name,
        flight_id=flight.flight_id,
        seat_class='economy',
        infant_count=-1
    )
    
    assert isinstance(result, ErrorResponse)
    assert result.error_code == "INVALID_INFANT_COUNT"

# Made with Bob
