import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Booking, Flight, User
from schemas import ErrorResponse
from services import booking, flight, user


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
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
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
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=2000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
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
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
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
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-15 09:00", arrival_time="2099-01-15 17:00",
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
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=500, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
            base_price=1500, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-03 09:00", arrival_time="2099-01-03 17:00",
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
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=0, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
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
            departure_time="2099-01-01 08:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-01 14:00", arrival_time="2099-01-01 17:00",
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
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 13:00",  # 4 hours
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 21:00",  # 12 hours
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
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=1, business_seats_available=1, galaxium_seats_available=0
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
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
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
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
            departure_time="2099-01-01 09:00", arrival_time="2099-01-01 17:00",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Venus",
            departure_time="2099-01-02 09:00", arrival_time="2099-01-02 17:00",
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
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
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

        # Verify seat was decremented
        db_session.refresh(flight_obj)
        assert flight_obj.economy_seats_available == 4

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
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
            economy_seats_available=0,
            business_seats_available=0,
            galaxium_seats_available=0
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
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
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
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
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
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
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
            booking_time="2099-01-01 10:00",
            seat_class="economy",
            price_paid=1000000
        ))
        db_session.commit()

        booking_obj = db_session.query(Booking).first()
        result = booking.cancel_booking(db_session, booking_obj.booking_id)

        assert result.status == "cancelled"

        # Verify seat was restored
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
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
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
            booking_time="2099-01-01 10:00",
            seat_class="economy",
            price_paid=1000000
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
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=1000000,
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
            booking_time="2099-01-01 10:00",
            seat_class="economy",
            price_paid=1000000
        ))
        db_session.commit()

        result = booking.get_bookings(db_session, user_obj.user_id)
        assert len(result) == 1
        assert result[0].status == "booked"

    def test_get_bookings_empty(self, db_session):
        """Test getting bookings when user has none."""
        result = booking.get_bookings(db_session, 999)
        assert result == []



class TestFlightFiltering:
    """Test flight filtering and sorting functionality."""

    def setup_method(self):
        """Setup test flights with various attributes."""

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


# ==================== Cancellation Policy Tests ====================

class TestCancellationPolicy:
    """Unit tests for _parse_departure_time and _cancellation_policy helpers."""

    def test_parse_legacy_format(self):
        """Legacy seed format 'YYYY-MM-DD HH:MM' is parsed correctly."""
        from services.booking import _parse_departure_time
        dt = _parse_departure_time("2099-01-01 09:00")
        assert dt is not None
        assert dt.year == 2099

    def test_parse_iso_utc_format(self):
        """ISO-8601 UTC format 'YYYY-MM-DDTHH:MM:SSZ' is parsed correctly."""
        from services.booking import _parse_departure_time
        dt = _parse_departure_time("2099-06-15T14:30:00Z")
        assert dt is not None
        assert dt.month == 6

    def test_parse_iso_no_tz_format(self):
        """ISO-8601 no-tz format 'YYYY-MM-DDTHH:MM:SS' is parsed correctly."""
        from services.booking import _parse_departure_time
        dt = _parse_departure_time("2099-03-20T08:00:00")
        assert dt is not None
        assert dt.day == 20

    def test_parse_unknown_format_returns_none(self):
        """An unrecognised format returns None without raising."""
        from services.booking import _parse_departure_time
        assert _parse_departure_time("01/01/2099") is None

    def test_policy_full_refund(self):
        """30+ days returns full_refund tier."""
        from services.booking import _cancellation_policy
        p = _cancellation_policy(30)
        assert p["tier"] == "full_refund"
        assert p["refund_pct"] == 1.0
        assert p["fee_pct"] == 0.0
        assert p["credit_pct"] == 0.0

    def test_policy_partial_refund_boundary(self):
        """29 days returns partial_refund tier."""
        from services.booking import _cancellation_policy
        p = _cancellation_policy(29)
        assert p["tier"] == "partial_refund"
        assert p["refund_pct"] == 0.5

    def test_policy_partial_refund_7_days(self):
        """7 days still returns partial_refund tier."""
        from services.booking import _cancellation_policy
        p = _cancellation_policy(7)
        assert p["tier"] == "partial_refund"

    def test_policy_fee_only_6_days(self):
        """6 days returns fee_only tier."""
        from services.booking import _cancellation_policy
        p = _cancellation_policy(6)
        assert p["tier"] == "fee_only"
        assert p["refund_pct"] == 0.0
        assert p["fee_pct"] == 0.25
        assert p["credit_pct"] == 0.75

    def test_policy_fee_only_1_day(self):
        """1 day returns fee_only tier."""
        from services.booking import _cancellation_policy
        p = _cancellation_policy(1)
        assert p["tier"] == "fee_only"

    def test_policy_forfeit_same_day(self):
        """0 days (same-day) returns forfeit tier with all zeroes."""
        from services.booking import _cancellation_policy
        p = _cancellation_policy(0)
        assert p["tier"] == "forfeit"
        assert p["refund_pct"] == 0.0
        assert p["fee_pct"] == 0.0
        assert p["credit_pct"] == 0.0


class TestGetCancellationPreview:
    """Service-layer tests for get_cancellation_preview."""

    def _create_booking(self, db_session, departure_time="2099-01-01 09:00", price=1000000):
        db_session.add(User(name="Test User", email="preview@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time=departure_time,
            arrival_time="2099-01-01 17:00",
            base_price=price,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1,
        ))
        db_session.commit()
        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()
        db_session.add(Booking(
            user_id=user_obj.user_id,
            flight_id=flight_obj.flight_id,
            status="booked",
            booking_time="2024-01-01 10:00",
            seat_class="economy",
            price_paid=price,
        ))
        db_session.commit()
        return db_session.query(Booking).first()

    def test_preview_full_refund_far_future(self, db_session):
        """Departure in 2099 → full_refund tier."""
        b = self._create_booking(db_session)
        result = booking.get_cancellation_preview(db_session, b.booking_id)
        assert result.cancellation_tier == "full_refund"
        assert result.refund_amount == b.price_paid
        assert result.cancellation_fee == 0
        assert result.travel_credit == 0
        assert result.days_until_departure > 30

    def test_preview_amounts_sum_to_price(self, db_session):
        """refund_amount + fee + credit should account for the full price_paid (modulo int rounding)."""
        b = self._create_booking(db_session, price=100000)
        result = booking.get_cancellation_preview(db_session, b.booking_id)
        # For full_refund the sum is exactly price_paid
        assert result.refund_amount + result.cancellation_fee + result.travel_credit == result.price_paid

    def test_preview_not_found(self, db_session):
        """Non-existent booking_id returns BOOKING_NOT_FOUND error."""
        result = booking.get_cancellation_preview(db_session, 9999)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "BOOKING_NOT_FOUND"

    def test_preview_already_cancelled(self, db_session):
        """Cancelled booking returns ALREADY_CANCELLED error."""
        db_session.add(User(name="Test User", email="preview2@example.com"))
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01 09:00",
            arrival_time="2099-01-01 17:00",
            base_price=500000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1,
        ))
        db_session.commit()
        user_obj = db_session.query(User).first()
        flight_obj = db_session.query(Flight).first()
        db_session.add(Booking(
            user_id=user_obj.user_id,
            flight_id=flight_obj.flight_id,
            status="cancelled",
            booking_time="2024-01-01 10:00",
            seat_class="economy",
            price_paid=500000,
        ))
        db_session.commit()
        b = db_session.query(Booking).first()
        result = booking.get_cancellation_preview(db_session, b.booking_id)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "ALREADY_CANCELLED"

    def test_preview_iso_utc_departure_format(self, db_session):
        """ISO-8601 UTC departure_time is parsed and preview succeeds."""
        b = self._create_booking(db_session, departure_time="2099-07-04T12:00:00Z")
        result = booking.get_cancellation_preview(db_session, b.booking_id)
        assert result.cancellation_tier == "full_refund"
        assert result.days_until_departure is not None

