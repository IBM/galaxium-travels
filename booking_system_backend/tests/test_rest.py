import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import User, Flight, Booking


def _add_flight(db_session, **overrides):
    """Helper: add a Flight row using the new seat-class schema."""
    defaults = dict(
        origin="Earth",
        destination="Mars",
        departure_time="2099-01-01T09:00:00Z",
        arrival_time="2099-01-01T17:00:00Z",
        price=1000000,
        economy_seats=5,
        business_seats=3,
        galaxium_seats=1,
    )
    defaults.update(overrides)
    flight = Flight(**defaults)
    db_session.add(flight)
    db_session.commit()
    return db_session.query(Flight).order_by(Flight.flight_id.desc()).first()


class TestFlightsEndpoint:
    """Test /flights endpoint."""

    def test_get_flights_empty(self, client, db_session):
        """Test getting flights when database is empty."""
        response = client.get("/flights")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_flights_with_data(self, client, db_session):
        """Test getting flights with data."""
        _add_flight(db_session)

        response = client.get("/flights")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["origin"] == "Earth"
        assert data[0]["destination"] == "Mars"
        # New seat-class fields should be present in the response
        assert data[0]["economy_seats"] == 5
        assert data[0]["business_seats"] == 3
        assert data[0]["galaxium_seats"] == 1


class TestRegisterEndpoint:
    """Test /register endpoint."""

    def test_register_success(self, client, db_session, sample_user_data):
        """Test successful user registration."""
        response = client.post("/register", json=sample_user_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_user_data["name"]
        assert data["email"] == sample_user_data["email"]
        assert "user_id" in data

    def test_register_duplicate_email(self, client, db_session, sample_user_data):
        """Test registration with duplicate email."""
        client.post("/register", json=sample_user_data)
        response = client.post("/register", json=sample_user_data)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["error_code"] == "EMAIL_EXISTS"


class TestUserEndpoint:
    """Test /user endpoint."""

    def test_get_user_success(self, client, db_session, sample_user_data):
        """Test successful user retrieval."""
        client.post("/register", json=sample_user_data)

        response = client.get(
            "/user",
            params={"name": sample_user_data["name"], "email": sample_user_data["email"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_user_data["name"]

    def test_get_user_not_found(self, client, db_session):
        """Test user retrieval when not found."""
        response = client.get(
            "/user",
            params={"name": "NonExistent", "email": "none@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["error_code"] == "USER_NOT_FOUND"


class TestBookEndpoint:
    """Test /book endpoint."""

    def test_book_flight_success(self, client, db_session, sample_user_data):
        """Test successful economy flight booking via REST."""
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        flight = _add_flight(db_session)

        response = client.post("/book", json={
            "user_id": user_id,
            "name": sample_user_data["name"],
            "flight_id": flight.flight_id,
            "seat_class": "economy",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "booked"
        assert data["user_id"] == user_id
        assert data["seat_class"] == "economy"

    def test_book_flight_business_success(self, client, db_session, sample_user_data):
        """Test successful business class booking via REST."""
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        flight = _add_flight(db_session, business_seats=3)

        response = client.post("/book", json={
            "user_id": user_id,
            "name": sample_user_data["name"],
            "flight_id": flight.flight_id,
            "seat_class": "business",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "booked"
        assert data["seat_class"] == "business"

        # Verify business_seats decremented
        db_session.refresh(flight)
        assert flight.business_seats == 2
        assert flight.economy_seats == 5    # unchanged
        assert flight.galaxium_seats == 1   # unchanged

    def test_book_flight_not_found(self, client, db_session, sample_user_data):
        """Test booking non-existent flight."""
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        response = client.post("/book", json={
            "user_id": user_id,
            "name": sample_user_data["name"],
            "flight_id": 999,
            "seat_class": "economy",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["error_code"] == "FLIGHT_NOT_FOUND"

    def test_book_flight_economy_sold_out(self, client, db_session, sample_user_data):
        """Test that booking economy when economy is sold out returns NO_SEATS_AVAILABLE."""
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        flight = _add_flight(db_session, economy_seats=0, business_seats=3, galaxium_seats=1)

        response = client.post("/book", json={
            "user_id": user_id,
            "name": sample_user_data["name"],
            "flight_id": flight.flight_id,
            "seat_class": "economy",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["error_code"] == "NO_SEATS_AVAILABLE"

    def test_book_flight_business_sold_out(self, client, db_session, sample_user_data):
        """Test that booking business when business is sold out returns NO_SEATS_AVAILABLE."""
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        flight = _add_flight(db_session, economy_seats=5, business_seats=0, galaxium_seats=1)

        response = client.post("/book", json={
            "user_id": user_id,
            "name": sample_user_data["name"],
            "flight_id": flight.flight_id,
            "seat_class": "business",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["error_code"] == "NO_SEATS_AVAILABLE"

    def test_book_flight_galaxium_sold_out(self, client, db_session, sample_user_data):
        """Test that booking galaxium when galaxium is sold out returns NO_SEATS_AVAILABLE."""
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        flight = _add_flight(db_session, economy_seats=5, business_seats=3, galaxium_seats=0)

        response = client.post("/book", json={
            "user_id": user_id,
            "name": sample_user_data["name"],
            "flight_id": flight.flight_id,
            "seat_class": "galaxium",
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["error_code"] == "NO_SEATS_AVAILABLE"


class TestBookingsEndpoint:
    """Test /bookings/{user_id} endpoint."""

    def test_get_bookings_success(self, client, db_session, sample_user_data):
        """Test getting user bookings."""
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        flight = _add_flight(db_session)

        db_session.add(Booking(
            user_id=user_id,
            flight_id=flight.flight_id,
            status="booked",
            seat_class="economy",
            booking_time="2099-01-01T10:00:00Z"
        ))
        db_session.commit()

        response = client.get(f"/bookings/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "booked"
        assert data[0]["seat_class"] == "economy"

    def test_get_bookings_empty(self, client, db_session):
        """Test getting bookings when user has none."""
        response = client.get("/bookings/999")
        assert response.status_code == 200
        assert response.json() == []


class TestCancelEndpoint:
    """Test /cancel/{booking_id} endpoint."""

    def test_cancel_booking_success(self, client, db_session, sample_user_data):
        """Test successful booking cancellation."""
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        flight = _add_flight(db_session, economy_seats=4)

        db_session.add(Booking(
            user_id=user_id,
            flight_id=flight.flight_id,
            status="booked",
            seat_class="economy",
            booking_time="2099-01-01T10:00:00Z"
        ))
        db_session.commit()
        booking = db_session.query(Booking).first()

        response = client.post(f"/cancel/{booking.booking_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "cancelled"

    def test_cancel_booking_not_found(self, client, db_session):
        """Test cancelling non-existent booking."""
        response = client.post("/cancel/999")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["error_code"] == "BOOKING_NOT_FOUND"


class TestHealthEndpoint:
    """Test health check endpoint."""

    def test_health_check(self, client, db_session):
        """Test health check returns OK."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"status": "OK"}
