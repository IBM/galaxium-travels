import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import User, Flight, Booking


class TestFlightsEndpoint:
    """Test /flights endpoint."""

    def test_get_flights_empty(self, client, db_session):
        """Test getting flights when database is empty."""
        response = client.get("/flights")
        assert response.status_code == 200
        assert response.json() == []

    def test_get_flights_with_data(self, client, db_session):
        """Test getting flights with data."""
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

        response = client.get("/flights")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["origin"] == "Earth"
        assert data[0]["destination"] == "Mars"

    def test_get_flights_with_sort_by_price(self, client, db_session):
        """Test getting flights sorted by price."""
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

        response = client.get("/flights?sort_by=base_price&sort_order=asc")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["base_price"] == 1000
        assert data[1]["base_price"] == 2000

    def test_get_flights_with_date_filter(self, client, db_session):
        """Test getting flights with date range filter."""
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

        response = client.get("/flights?departure_date_from=2099-01-10&departure_date_to=2099-01-20")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["destination"] == "Venus"

    def test_get_flights_with_price_filter(self, client, db_session):
        """Test getting flights with price range filter."""
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
        db_session.commit()

        response = client.get("/flights?min_price=1000&max_price=2000")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["base_price"] == 1500

    def test_get_flights_with_seat_class_filter(self, client, db_session):
        """Test getting flights with seat class filter."""
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

        response = client.get("/flights?seat_class=economy")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["destination"] == "Venus"

    def test_get_flights_with_time_period_filter(self, client, db_session):
        """Test getting flights with time of day filter."""
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

        response = client.get("/flights?departure_time_period=morning")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["destination"] == "Mars"

    def test_get_flights_with_duration_filter(self, client, db_session):
        """Test getting flights with duration filter."""
        db_session.add(Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T13:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.add(Flight(
            origin="Earth", destination="Jupiter",
            departure_time="2099-01-01T09:00:00Z", arrival_time="2099-01-01T21:00:00Z",
            base_price=1000, economy_seats_available=5, business_seats_available=3, galaxium_seats_available=1
        ))
        db_session.commit()

        response = client.get("/flights?min_duration=5&max_duration=15")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["destination"] == "Jupiter"

    def test_get_flights_with_min_seats_filter(self, client, db_session):
        """Test getting flights with minimum seats filter."""
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

        response = client.get("/flights?min_seats_available=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["destination"] == "Venus"

    def test_get_flights_with_route_category_filter(self, client, db_session):
        """Test getting flights with route category filter."""
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

        response = client.get("/flights?route_category=inner_planets")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["destination"] == "Mars"

    def test_get_flights_with_combined_filters(self, client, db_session):
        """Test getting flights with multiple filters combined."""
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

        response = client.get("/flights?sort_by=base_price&sort_order=asc&min_price=500&max_price=1500&seat_class=economy")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["destination"] == "Mars"


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
        """Test successful flight booking."""
        # Register user
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        # Create flight
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            price=1000000,
            seats_available=5
        ))
        db_session.commit()
        flight = db_session.query(Flight).first()

        # Book flight
        response = client.post("/book", json={
            "user_id": user_id,
            "name": sample_user_data["name"],
            "flight_id": flight.flight_id
        })

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "booked"
        assert data["user_id"] == user_id

    def test_book_flight_not_found(self, client, db_session, sample_user_data):
        """Test booking non-existent flight."""
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        response = client.post("/book", json={
            "user_id": user_id,
            "name": sample_user_data["name"],
            "flight_id": 999
        })

        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        assert data["error_code"] == "FLIGHT_NOT_FOUND"


class TestBookingsEndpoint:
    """Test /bookings/{user_id} endpoint."""

    def test_get_bookings_success(self, client, db_session, sample_user_data):
        """Test getting user bookings."""
        # Register user
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        # Create flight and booking
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            price=1000000,
            seats_available=5
        ))
        db_session.commit()
        flight = db_session.query(Flight).first()

        db_session.add(Booking(
            user_id=user_id,
            flight_id=flight.flight_id,
            status="booked",
            booking_time="2099-01-01T10:00:00Z"
        ))
        db_session.commit()

        response = client.get(f"/bookings/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "booked"

    def test_get_bookings_empty(self, client, db_session):
        """Test getting bookings when user has none."""
        response = client.get("/bookings/999")
        assert response.status_code == 200
        assert response.json() == []


class TestCancelEndpoint:
    """Test /cancel/{booking_id} endpoint."""

    def test_cancel_booking_success(self, client, db_session, sample_user_data):
        """Test successful booking cancellation."""
        # Register user
        user_response = client.post("/register", json=sample_user_data)
        user_id = user_response.json()["user_id"]

        # Create flight and booking
        db_session.add(Flight(
            origin="Earth",
            destination="Mars",
            departure_time="2099-01-01T09:00:00Z",
            arrival_time="2099-01-01T17:00:00Z",
            price=1000000,
            seats_available=4
        ))
        db_session.commit()
        flight = db_session.query(Flight).first()

        db_session.add(Booking(
            user_id=user_id,
            flight_id=flight.flight_id,
            status="booked",
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



class TestFlightsEndpointFiltering:
    """Test /flights endpoint with query parameters."""

    def test_filter_by_origin(self, client, db_session):
        """Test filtering flights by origin via REST API."""
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
            )
        ])
        db_session.commit()

        response = client.get("/flights?origin=Earth")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["origin"] == "Earth"

    def test_filter_by_destination(self, client, db_session):
        """Test filtering flights by destination via REST API."""
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

        response = client.get("/flights?destination=Venus")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["destination"] == "Venus"

    def test_filter_by_date_range(self, client, db_session):
        """Test filtering flights by date range via REST API."""
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

        response = client.get("/flights?departure_date_from=2026-03-10&departure_date_to=2026-03-20")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["departure_time"].startswith("2026-03-15")

    def test_filter_by_price_range(self, client, db_session):
        """Test filtering flights by price range via REST API."""
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

        response = client.get("/flights?min_price=800000&max_price=1500000")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["base_price"] == 1000000

    def test_filter_by_seat_availability(self, client, db_session):
        """Test filtering flights by seat availability via REST API."""
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

        # Test has_economy
        response = client.get("/flights?has_economy=true")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(f["economy_seats_available"] > 0 for f in data)

        # Test has_business
        response = client.get("/flights?has_business=true")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(f["business_seats_available"] > 0 for f in data)

        # Test has_galaxium
        response = client.get("/flights?has_galaxium=true")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert all(f["galaxium_seats_available"] > 0 for f in data)

    def test_sort_by_price(self, client, db_session):
        """Test sorting flights by price via REST API."""
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
        response = client.get("/flights?sort=price&order=asc")
        assert response.status_code == 200
        data = response.json()
        prices = [f["base_price"] for f in data]
        assert prices == sorted(prices)

        # Test descending
        response = client.get("/flights?sort=price&order=desc")
        assert response.status_code == 200
        data = response.json()
        prices = [f["base_price"] for f in data]
        assert prices == sorted(prices, reverse=True)

    def test_sort_by_departure_time(self, client, db_session):
        """Test sorting flights by departure time via REST API."""
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
            )
        ])
        db_session.commit()

        response = client.get("/flights?sort=departure_time&order=asc")
        assert response.status_code == 200
        data = response.json()
        times = [f["departure_time"] for f in data]
        assert times == sorted(times)

    def test_combined_filters_and_sorting(self, client, db_session):
        """Test combining multiple filters with sorting via REST API."""
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
                destination="Mars",
                departure_time="2026-03-15 10:00",
                arrival_time="2026-03-15 18:00",
                base_price=950000,
                economy_seats_available=6,
                business_seats_available=3,
                galaxium_seats_available=1
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

        response = client.get(
            "/flights?origin=Earth&destination=Mars&max_price=1000000&sort=price&order=asc"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert all(f["origin"] == "Earth" for f in data)
        assert all(f["destination"] == "Mars" for f in data)
        assert data[0]["base_price"] < data[1]["base_price"]

    def test_url_encoding(self, client, db_session):
        """Test that URL-encoded parameters work correctly."""
        db_session.add(Flight(
            origin="New Earth",
            destination="Mars",
            departure_time="2026-03-01 09:00",
            arrival_time="2026-03-01 17:00",
            base_price=1000000,
            economy_seats_available=6,
            business_seats_available=3,
            galaxium_seats_available=1
        ))
        db_session.commit()

        # Space should be encoded as %20 or +
        response = client.get("/flights?origin=New%20Earth")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1

    def test_case_insensitive_search(self, client, db_session):
        """Test that text search is case-insensitive."""
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

        response = client.get("/flights?origin=earth")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["origin"] == "Earth"

    def test_partial_match_search(self, client, db_session):
        """Test that text search supports partial matching."""
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

        response = client.get("/flights?origin=ar")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert "ar" in data[0]["origin"].lower()

    def test_no_results(self, client, db_session):
        """Test that empty results are returned when no flights match."""
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

        response = client.get("/flights?origin=Pluto")
        assert response.status_code == 200
        assert response.json() == []

    def test_no_parameters_returns_all(self, client, db_session):
        """Test that no parameters returns all flights (backward compatibility)."""
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

        response = client.get("/flights")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
