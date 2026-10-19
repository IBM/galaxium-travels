import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

import server
from tests.fakes import FakeHoldClient
from models import User
from seed import seed_connecting_flights
from services.hold_client import get_hold_client

EARTH_TO_EUROPA = [3, 4, 5]


@pytest.fixture
def traveler(db_session):
    seed_connecting_flights(db_session)
    user = User(name="Ada", email="ada@example.com")
    db_session.add(user)
    db_session.commit()
    return {"user_id": user.user_id, "name": "Ada"}


@pytest.fixture
def holds(client, db_session):
    fake = FakeHoldClient(db_session)
    server.app.dependency_overrides[get_hold_client] = lambda: fake
    return fake


def search(client, origin="Earth", destination="Europa", day="2099-02-01"):
    return client.get("/itineraries/search", params={"origin": origin, "destination": destination, "date": day})


def test_search_finds_three_leg_route(client, traveler):
    response = search(client)
    assert response.status_code == 200
    [route] = response.json()
    assert [leg["flight_id"] for leg in route["legs"]] == EARTH_TO_EUROPA
    assert route["total_price"] == 5_500_000
    assert route["layover_minutes"] == [780, 240]


def test_search_is_case_insensitive(client, traveler):
    response = search(client, "earth", "europa")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_search_with_no_route_returns_empty_list(client, traveler):
    response = search(client, "Earth", "Pluto")
    assert response.status_code == 200
    assert response.json() == []


def test_search_rejects_malformed_date(client, traveler):
    assert search(client, day="tomorrow").status_code == 422


def test_search_rejects_same_origin_and_destination(client, traveler):
    response = search(client, "Earth", "Earth")
    assert response.status_code == 422
    assert response.json()["detail"]["error_code"] == "SAME_ORIGIN_DESTINATION"


def test_book_and_confirm_links_bookings(client, traveler, holds):
    created = client.post("/itineraries", json={**traveler, "flight_ids": EARTH_TO_EUROPA})
    assert created.status_code == 200
    body = created.json()
    assert body["status"] == "held"
    assert "hold_id" not in body["legs"][0]

    confirmed = client.post(f"/itineraries/{body['itinerary_id']}/confirm")
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "confirmed"

    bookings = client.get(f"/bookings/{traveler['user_id']}").json()
    assert sorted(b["flight_id"] for b in bookings if b["itinerary_id"] == body["itinerary_id"]) == EARTH_TO_EUROPA


def test_hold_failure_returns_502(client, traveler, holds):
    holds.fail_hold_for = {5}
    response = client.post("/itineraries", json={**traveler, "flight_ids": EARTH_TO_EUROPA})
    assert response.status_code == 502
    assert response.json()["detail"]["error_code"] == "HOLD_FAILED"


def test_invalid_connection_returns_422(client, traveler, holds):
    response = client.post("/itineraries", json={**traveler, "flight_ids": [1, 4]})
    assert response.status_code == 422


def test_confirm_unknown_itinerary_returns_404(client, traveler, holds):
    response = client.post("/itineraries/999/confirm")
    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "ITINERARY_NOT_FOUND"


def test_list_user_itineraries(client, traveler, holds):
    client.post("/itineraries", json={**traveler, "flight_ids": EARTH_TO_EUROPA})
    response = client.get(f"/users/{traveler['user_id']}/itineraries")
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_single_flight_booking_still_works(client, traveler):
    response = client.post("/book", json={**traveler, "flight_id": 3})
    assert response.status_code == 200
    assert response.json()["itinerary_id"] is None
