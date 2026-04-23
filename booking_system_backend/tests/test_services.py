import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import User, Flight, Booking
from schemas import ErrorResponse
from services import flight, user, booking


class TestFlightService:
    """Test flight service functions."""

    def test_list_flights_empty(self, db_session):
        """Test listing flights when database is empty."""
        result = flight.list_flights(db_session)
        assert result == []

    def test_list_flights_with_data(self, db_session):
        """Test listing flights with data in database."""
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session)
        assert len(result) == 1
        assert result[0].origin == "Earth"
        assert result[0].destination == "Mars"

    def test_list_flights_sort_by_price_asc(self, db_session):
        """Test sorting flights by price ascending."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=2000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02T09:00:00Z", arrival_time="2099-01-02T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, sort_by="base_price", sort_order="asc")
        assert len(result) == 2
        assert result[0].base_price == 1000
        assert result[1].base_price == 2000

    def test_list_flights_sort_by_price_desc(self, db_session):
        """Test sorting flights by price descending."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02T09:00:00Z", arrival_time="2099-01-02T17:00:00Z",
            base_price=2000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, sort_by="base_price", sort_order="desc")
        assert len(result) == 2
        assert result[0].base_price == 2000
        assert result[1].base_price == 1000

    def test_list_flights_filter_by_date_range(self, db_session):
        """Test filtering flights by date range."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-15T09:00:00Z", arrival_time="2099-01-15T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, departure_date_from="2099-01-10", departure_date_to="2099-01-20")
        assert len(result) == 1
        assert result[0].destination == "Venus"

    def test_list_flights_filter_by_price_range(self, db_session):
        """Test filtering flights by price range."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=500, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02T09:00:00Z", arrival_time="2099-01-02T17:00:00Z",
            base_price=1500, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-03T09:00:00Z", arrival_time="2099-01-03T17:00:00Z",
            base_price=2500, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, min_price=1000, max_price=2000)
        assert len(result) == 1
        assert result[0].base_price == 1500

    def test_list_flights_filter_by_seat_class(self, db_session):
        """Test filtering flights by seat class availability."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=1000, economy_seats_available=0, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02T09:00:00Z", arrival_time="2099-01-02T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=0, galaxium_seats_available=0
        ))
        db_session.commit()

        result = flight.list_flights(db_session, seat_class="economy")
        assert len(result) == 1
        assert result[0].destination == "Venus"

    def test_list_flights_filter_by_time_period(self, db_session):
        """Test filtering flights by time of day."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T08:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-01T14:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, departure_time_period="morning")
        assert len(result) == 1
        assert result[0].destination == "Mars"

    def test_list_flights_filter_by_duration(self, db_session):
        """Test filtering flights by duration."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T13:00:00Z",  # 4 hours
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T21:00:00Z",  # 12 hours
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, min_duration=5, max_duration=15)
        assert len(result) == 1
        assert result[0].destination == "Jupiter"

    def test_list_flights_filter_by_min_seats(self, db_session):
        """Test filtering flights by minimum seats available."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=1000, economy_seats_available=1, business_seats_available=1, galaxium_seats_available=0
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02T09:00:00Z", arrival_time="2099-01-02T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=2
        ))
        db_session.commit()

        result = flight.list_flights(db_session, min_seats_available=5)
        assert len(result) == 1
        assert result[0].destination == "Venus"

    def test_list_flights_filter_by_route_category(self, db_session):
        """Test filtering flights by route category."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-02T09:00:00Z", arrival_time="2099-01-02T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(db_session, route_category="inner_planets")
        assert len(result) == 1
        assert result[0].destination == "Mars"

    def test_list_flights_combined_filters(self, db_session):
        """Test combining multiple filters."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T17:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02T09:00:00Z", arrival_time="2099-01-02T17:00:00Z",
            base_price=2000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        result = flight.list_flights(
            db_session,
            sort_by="base_price",
            sort_order="asc",
            min_price=500,
            max_price=1500,
            seat_class="economy"
        )
        assert len(result) == 1
        assert result[0].destination == "Mars"


class TestUserService:
    """Test user service functions."""

    def test_register_user_success(self, db_session):
        """Test successful user registration."""
        result = user.register_user(db_session, "Test User", "test@example.com")
        assert result.name == "Test User"
        assert result.email == "test@example.com"
        assert result.user_id > 0

    def test_register_user_duplicate_email(self, db_session):
        """Test registration with duplicate email."""
        user.register_user(db_session, "User 1", "test@example.com")
        result = user.register_user(db_session, "User 2", "test@example.com")

        assert isinstance(result, ErrorResponse)
        assert result.error_code == "EMAIL_EXISTS"

    def test_get_user_success(self, db_session):
        """Test successful user retrieval."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.commit()

        result = user.get_user(db_session, "Test User", "test@example.com")
        assert result.name == "Test User"
        assert result.email == "test@example.com"

    def test_get_user_not_found(self, db_session):
        """Test user retrieval when not found."""
        result = user.get_user(db_session, "NonExistent", "none@example.com")
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "USER_NOT_FOUND"


class TestBookingService:
    """Test booking service functions."""

    def test_book_flight_success(self, db_session):
        """Test successful flight booking."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(db_session, user_obj.user_id, "Test User", flight_obj.flight_id)
        assert result.status == "booked"
        assert result.user_id == user_obj.user_id
        assert result.flight_id == flight_obj.flight_id
        assert result.seat_class == "economy"
        assert result.price_paid == 1000
        assert result.addons is None

        db_session.refresh(flight_obj)
        assert flight_obj.economy_seats_available == 4

    def test_book_flight_with_valid_addons(self, db_session):
        """Test booking with valid selected add-ons."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        addons = [
            {"id": "wifi", "name": "Interstellar Wi-Fi", "price": 45, "selected": True},
            {"id": "insurance", "name": "Cosmic Travel Insurance", "price": 200, "selected": True},
            {"id": "window_seat", "name": "Window Seat Upgrade", "price": 120, "selected": False}
        ]

        result = booking.book_flight(
            db_session,
            user_obj.user_id,
            "Test User",
            flight_obj.flight_id,
            addons=addons
        )

        assert result.status == "booked"
        assert result.price_paid == 1245
        assert result.addons is not None
        assert len(result.addons) == 2
        assert {addon.id for addon in result.addons} == {"wifi", "insurance"}

        persisted_booking = db_session.query(Booking).filter(Booking.booking_id == result.booking_id).first()
        assert persisted_booking.addons is not None
        assert len(persisted_booking.addons) == 2

    def test_book_flight_invalid_addon_fails(self, db_session):
        """Test booking fails for unknown add-on ID."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(
            db_session,
            user_obj.user_id,
            "Test User",
            flight_obj.flight_id,
            addons=[{"id": "fake_addon", "price": 999, "selected": True}]
        )

        assert isinstance(result, ErrorResponse)
        assert result.error_code == "INVALID_ADDON"

    def test_book_flight_price_tampering_fails(self, db_session):
        """Test booking fails when add-on price is tampered with."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(
            db_session,
            user_obj.user_id,
            "Test User",
            flight_obj.flight_id,
            addons=[{"id": "wifi", "price": 999, "selected": True}]
        )

        assert isinstance(result, ErrorResponse)
        assert result.error_code == "PRICE_TAMPERING"

    def test_book_flight_not_found(self, db_session):
        """Test booking non-existent flight."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.commit()
        user_obj = db_session.query(User).first()

        result = booking.book_flight(db_session, user_obj.user_id, "Test User", 999)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "FLIGHT_NOT_FOUND"

    def test_book_flight_no_seats(self, db_session):
        """Test booking when no seats available."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=0,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(db_session, user_obj.user_id, "Test User", flight_obj.flight_id)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "NO_SEATS_AVAILABLE"

    def test_book_flight_user_not_found(self, db_session):
        """Test booking with non-existent user."""
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(db_session, 999, "Fake User", flight_obj.flight_id)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "USER_NOT_FOUND"

    def test_book_flight_name_mismatch(self, db_session):
        """Test booking with wrong name for user ID."""
        db_session.add(User(name="Real Name", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        result = booking.book_flight(db_session, user_obj.user_id, "Wrong Name", flight_obj.flight_id)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "NAME_MISMATCH"

    def test_cancel_booking_success(self, db_session):
        """Test successful booking cancellation."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=4,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        db_session.add(Booking(
            user_id=user_obj.user_id,
            flight_id=flight_obj.flight_id,
            status="booked",
            booking_time="2099-01-01T10:00:00Z",
            seat_class="economy",
            price_paid=1000
        ))
        db_session.commit()

        booking_obj = db_session.query(Booking).first()
        result = booking.cancel_booking(db_session, booking_obj.booking_id)

        assert result.status == "cancelled"

        db_session.refresh(flight_obj)
        assert flight_obj.economy_seats_available == 5

    def test_cancel_booking_not_found(self, db_session):
        """Test cancelling non-existent booking."""
        result = booking.cancel_booking(db_session, 999)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "BOOKING_NOT_FOUND"

    def test_cancel_booking_already_cancelled(self, db_session):
        """Test cancelling already cancelled booking."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        db_session.add(Booking(
            user_id=user_obj.user_id,
            flight_id=flight_obj.flight_id,
            status="cancelled",
            booking_time="2099-01-01T10:00:00Z",
            seat_class="economy",
            price_paid=1000
        ))
        db_session.commit()

        booking_obj = db_session.query(Booking).first()
        result = booking.cancel_booking(db_session, booking_obj.booking_id)

        assert isinstance(result, ErrorResponse)
        assert result.error_code == "ALREADY_CANCELLED"

    def test_get_bookings_success(self, db_session):
        """Test getting user bookings."""
        db_session.add(User(name="Test User", email="test@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            base_price=1000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()

        db_session.add(Booking(
            user_id=user_obj.user_id,
            flight_id=flight_obj.flight_id,
            status="booked",
            booking_time="2099-01-01T10:00:00Z",
            seat_class="economy",
            price_paid=1000,
            addons=[{"id": "wifi", "name": "Interstellar Wi-Fi", "price": 45, "icon": "📡"}]
        ))
        db_session.commit()

        result = booking.get_bookings(db_session, user_obj.user_id)
        assert len(result) == 1
        assert result[0].status == "booked"
        assert result[0].addons is not None
        assert result[0].addons[0].id == "wifi"

    def test_get_bookings_empty(self, db_session):
        """Test getting bookings when user has none."""
        result = booking.get_bookings(db_session, 999)
        assert result == []



class TestFlightFiltering:
    """Test flight filtering and sorting functionality."""

    def setup_method(self):
        """Setup test flights with various attributes."""
        pass

    def test_filter_by_origin(self, db_session):
        """Test filtering flights by origin (case-insensitive partial match)."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Moon",
                destination="Mars",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=800000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Venus",
                destination="Earth",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-03 19:00",
                base_price=1200000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test exact match
        results = flight.list_flights(db_session, origin="Earth")
        assert len(results) == 1
        assert results[0].origin == "Earth"

        # Test case-insensitive
        results = flight.list_flights(db_session, origin="earth")
        assert len(results) == 1
        assert results[0].origin == "Earth"

        # Test partial match
        results = flight.list_flights(db_session, origin="ar")
        assert len(results) == 1
        assert "ar" in results[0].origin.lower()

    def test_filter_by_destination(self, db_session):
        """Test filtering flights by destination."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        results = flight.list_flights(db_session, destination="Mars")
        assert len(results) == 1
        assert results[0].destination == "Mars"

    def test_filter_by_date_range(self, db_session):
        """Test filtering flights by departure date range."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-15 10:00",
                arrival_time="2026-03-15 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-04-01 11:00",
                arrival_time="2026-04-01 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test from date
        results = flight.list_flights(db_session, departure_date_from="2026-03-15")
        assert len(results) == 2
        assert all(r.departure_time >= "2026-03-15" for r in results)

        # Test to date
        results = flight.list_flights(db_session, departure_date_to="2026-03-15")
        assert len(results) == 2
        assert all(r.departure_time <= "2026-03-15 23:59" for r in results)

        # Test date range
        results = flight.list_flights(
            db_session,
            departure_date_from="2026-03-10",
            departure_date_to="2026-03-20"
        )
        assert len(results) == 1
        assert results[0].departure_time.startswith("2026-03-15")

    def test_filter_by_price_range(self, db_session):
        """Test filtering flights by price range."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Moon",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=500000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-03 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test min price
        results = flight.list_flights(db_session, min_price=1000000)
        assert len(results) == 2
        assert all(r.base_price >= 1000000 for r in results)

        # Test max price
        results = flight.list_flights(db_session, max_price=1000000)
        assert len(results) == 2
        assert all(r.base_price <= 1000000 for r in results)

        # Test price range
        results = flight.list_flights(db_session, min_price=800000, max_price=1500000)
        assert len(results) == 1
        assert results[0].base_price == 1000000

    def test_filter_by_seat_availability(self, db_session):
        """Test filtering flights by seat class availability."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=5,
                business_seats_available=0,
                galaxium_seats_available=0
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=1100000,
                economy_seats_available=0,
                business_seats_available=3,
                galaxium_seats_available=0
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-03 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test economy seats
        results = flight.list_flights(db_session, has_economy=True)
        assert len(results) == 2
        assert all(r.economy_seats_available > 0 for r in results)

        # Test business seats
        results = flight.list_flights(db_session, has_business=True)
        assert len(results) == 2
        assert all(r.business_seats_available > 0 for r in results)

        # Test galaxium seats
        results = flight.list_flights(db_session, has_galaxium=True)
        assert len(results) == 1
        assert all(r.galaxium_seats_available > 0 for r in results)

        # Test multiple seat classes
        results = flight.list_flights(db_session, has_economy=True, has_business=True)
        assert len(results) == 1
        assert results[0].economy_seats_available > 0
        assert results[0].business_seats_available > 0

    def test_sort_by_price(self, db_session):
        """Test sorting flights by price."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Moon",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=500000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-03 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test ascending
        results = flight.list_flights(db_session, sort="price", order="asc")
        prices = [r.base_price for r in results]
        assert prices == sorted(prices)
        assert prices[0] == 500000

        # Test descending
        results = flight.list_flights(db_session, sort="price", order="desc")
        prices = [r.base_price for r in results]
        assert prices == sorted(prices, reverse=True)
        assert prices[0] == 2000000

    def test_sort_by_departure_time(self, db_session):
        """Test sorting flights by departure time."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-15 09:00",
                arrival_time="2026-03-15 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-01 10:00",
                arrival_time="2026-03-01 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-30 11:00",
                arrival_time="2026-03-30 19:00",
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test ascending
        results = flight.list_flights(db_session, sort="departure_time", order="asc")
        times = [r.departure_time for r in results]
        assert times == sorted(times)

        # Test descending
        results = flight.list_flights(db_session, sort="departure_time", order="desc")
        times = [r.departure_time for r in results]
        assert times == sorted(times, reverse=True)

    def test_sort_by_duration(self, db_session):
        """Test sorting flights by duration."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",  # 8 hours
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Moon",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 14:00",  # 4 hours
                base_price=500000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Jupiter",
                departure_time="2026-03-03 11:00",
                arrival_time="2026-03-04 11:00",  # 24 hours
                base_price=2000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Test ascending
        results = flight.list_flights(db_session, sort="duration", order="asc")
        assert results[0].destination == "Moon"  # Shortest
        assert results[2].destination == "Jupiter"  # Longest

        # Test descending
        results = flight.list_flights(db_session, sort="duration", order="desc")
        assert results[0].destination == "Jupiter"  # Longest
        assert results[2].destination == "Moon"  # Shortest

    def test_combined_filters(self, db_session):
        """Test combining multiple filters."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Earth",
                destination="Venus",
                departure_time="2026-03-15 10:00",
                arrival_time="2026-03-15 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=0,
                galaxium_seats_available=0
            ),
            Flight(
                origin="Moon",
                destination="Mars",
                departure_time="2026-03-20 11:00",
                arrival_time="2026-03-20 19:00",
                base_price=800000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        # Combine origin, destination, date range, and seat availability
        results = flight.list_flights(
            db_session,
            origin="Earth",
            destination="Mars",
            departure_date_from="2026-03-01",
            departure_date_to="2026-03-10",
            has_business=True
        )
        assert len(results) == 1
        assert results[0].origin == "Earth"
        assert results[0].destination == "Mars"
        assert results[0].business_seats_available > 0

    def test_no_filters_returns_all(self, db_session):
        """Test that no filters returns all flights."""
        db_session.add_all([
            Flight(
                origin="Earth",
                destination="Mars",
                departure_time="2026-03-01 09:00",
                arrival_time="2026-03-01 17:00",
                base_price=1000000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            ),
            Flight(
                origin="Moon",
                destination="Venus",
                departure_time="2026-03-02 10:00",
                arrival_time="2026-03-02 18:00",
                base_price=1100000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
            )
        ])
        db_session.commit()

        results = flight.list_flights(db_session)
        assert len(results) == 2

    def test_filters_return_empty_when_no_match(self, db_session):
        """Test that filters return empty list when no flights match."""
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2026-03-01 09:00",
            arrival_time="2026-03-01 17:00",
            base_price=1000000,
            economy_seats_available=6,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        results = flight.list_flights(db_session, origin="Pluto")
        assert len(results) == 0

        results = flight.list_flights(db_session, min_price=10000000)
        assert len(results) == 0
