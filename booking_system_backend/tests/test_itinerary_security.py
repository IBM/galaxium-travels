import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

import server
from tests.fakes import FakeHoldClient
from models import Itinerary, User
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


def book(client, traveler, **extra):
    return client.post("/itineraries", json={**traveler, "flight_ids": EARTH_TO_EUROPA, **extra})


def test_more_than_three_flights_is_rejected(client, traveler, holds):
    assert book(client, traveler, flight_ids=[3, 4, 5, 6]).status_code == 422
    assert holds.holds == {}


def test_empty_flight_list_is_rejected(client, traveler, holds):
    assert book(client, traveler, flight_ids=[]).status_code == 422


def test_price_is_always_computed_by_the_server(client, traveler, holds):
    response = book(client, traveler)
    assert response.status_code == 200
    assert response.json()["total_price"] == 5_500_000


def test_fourth_active_hold_is_rejected(client, traveler, holds):
    for _ in range(3):
        assert book(client, traveler).status_code == 200
    response = book(client, traveler)
    assert response.status_code == 429
    assert response.json()["detail"]["error_code"] == "TOO_MANY_HOLDS"


def test_expired_holds_do_not_count(client, traveler, holds, db_session):
    long_ago = (datetime.now(tz=timezone.utc) - timedelta(hours=1)).isoformat()
    for _ in range(3):
        db_session.add(Itinerary(user_id=traveler["user_id"], status="held", created_at=long_ago, total_price=1))
    db_session.commit()
    assert book(client, traveler).status_code == 200
