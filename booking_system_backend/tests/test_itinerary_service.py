import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from tests.fakes import FakeHoldClient
from models import Booking, Flight, Itinerary, User
from schemas import ErrorResponse
from seed import seed_connecting_flights
from services import itinerary

# Flight IDs from seed_connecting_flights() in a fresh database.
EARTH_TO_EUROPA = [3, 4, 5]
EARTH_TO_MARS_MARCH = [6, 7]


@pytest.fixture
def traveler(db_session):
    seed_connecting_flights(db_session)
    user = User(name="Ada", email="ada@example.com")
    db_session.add(user)
    db_session.commit()
    return user


def test_search_returns_route_out(traveler, db_session):
    [route] = itinerary.search(db_session, "Earth", "Europa", date(2099, 2, 1))
    assert [leg.flight_id for leg in route.legs] == EARTH_TO_EUROPA
    assert route.total_price == 5_500_000
    assert route.total_minutes == 2340
    assert route.layover_minutes == [780, 240]


def test_search_rejects_same_origin_and_destination(traveler, db_session):
    result = itinerary.search(db_session, "Earth", " earth ", date(2099, 2, 1))
    assert isinstance(result, ErrorResponse)
    assert result.error_code == "SAME_ORIGIN_DESTINATION"


def test_create_holds_every_leg(traveler, db_session):
    holds = FakeHoldClient(db_session)
    result = itinerary.create_itinerary(db_session, holds, traveler.user_id, "Ada", EARTH_TO_EUROPA)
    assert result.status == "held"
    assert result.total_price == 5_500_000
    assert [leg.flight_id for leg in result.legs] == EARTH_TO_EUROPA
    assert [leg.position for leg in result.legs] == [1, 2, 3]
    assert len(holds.holds) == 3
    assert db_session.query(Booking).count() == 0


def test_hold_failure_releases_earlier_holds(traveler, db_session):
    holds = FakeHoldClient(db_session, fail_hold_for={5})
    result = itinerary.create_itinerary(db_session, holds, traveler.user_id, "Ada", EARTH_TO_EUROPA)
    assert result.error_code == "HOLD_FAILED"
    assert holds.released == ["H-1", "H-2"]
    assert db_session.query(Itinerary).count() == 0


def test_rejects_legs_that_do_not_connect(traveler, db_session):
    holds = FakeHoldClient(db_session)
    result = itinerary.create_itinerary(db_session, holds, traveler.user_id, "Ada", [1, 4])
    assert result.error_code == "INVALID_CONNECTION"
    assert holds.holds == {}


@pytest.mark.parametrize("flight_ids", [[], [3, 4, 5, 5]])
def test_rejects_invalid_leg_count(traveler, db_session, flight_ids):
    result = itinerary.create_itinerary(db_session, FakeHoldClient(db_session), traveler.user_id, "Ada", flight_ids)
    assert result.error_code == "INVALID_LEG_COUNT"


def test_rejects_unknown_flight(traveler, db_session):
    result = itinerary.create_itinerary(db_session, FakeHoldClient(db_session), traveler.user_id, "Ada", [3, 999])
    assert result.error_code == "FLIGHT_NOT_FOUND"


def test_rejects_name_mismatch(traveler, db_session):
    result = itinerary.create_itinerary(db_session, FakeHoldClient(db_session), traveler.user_id, "Eve", EARTH_TO_EUROPA)
    assert result.error_code == "NAME_MISMATCH"


def test_rejects_unknown_user(traveler, db_session):
    result = itinerary.create_itinerary(db_session, FakeHoldClient(db_session), 999, "Ada", EARTH_TO_EUROPA)
    assert result.error_code == "USER_NOT_FOUND"


def test_rejects_sold_out_leg(traveler, db_session):
    db_session.get(Flight, 4).economy_seats_available = 0
    db_session.commit()
    result = itinerary.create_itinerary(db_session, FakeHoldClient(db_session), traveler.user_id, "Ada", EARTH_TO_EUROPA)
    assert result.error_code == "NO_SEATS_AVAILABLE"


def held_itinerary(db_session, traveler, holds, flight_ids=EARTH_TO_EUROPA):
    return itinerary.create_itinerary(db_session, holds, traveler.user_id, "Ada", flight_ids)


def test_confirm_books_every_leg(traveler, db_session):
    holds = FakeHoldClient(db_session)
    held = held_itinerary(db_session, traveler, holds)

    result = itinerary.confirm_itinerary(db_session, holds, held.itinerary_id)

    assert result.status == "confirmed"
    assert all(leg.booking_id is not None for leg in result.legs)
    bookings = db_session.query(Booking).filter(Booking.itinerary_id == held.itinerary_id).all()
    assert sorted(b.flight_id for b in bookings) == EARTH_TO_EUROPA
    assert db_session.get(Flight, 3).economy_seats_available == 5


def test_confirm_failure_cancels_confirmed_legs(traveler, db_session):
    holds = FakeHoldClient(db_session, fail_confirm_for={4})
    held = held_itinerary(db_session, traveler, holds)

    result = itinerary.confirm_itinerary(db_session, holds, held.itinerary_id)

    assert result.error_code == "CONFIRM_FAILED"
    first_leg = db_session.query(Booking).filter(Booking.flight_id == 3).one()
    assert first_leg.status == "cancelled"
    assert db_session.get(Flight, 3).economy_seats_available == 6
    assert holds.released == ["H-3"]
    assert db_session.get(Itinerary, held.itinerary_id).status == "failed"


def test_confirm_twice_is_rejected(traveler, db_session):
    holds = FakeHoldClient(db_session)
    held = held_itinerary(db_session, traveler, holds)
    itinerary.confirm_itinerary(db_session, holds, held.itinerary_id)

    result = itinerary.confirm_itinerary(db_session, holds, held.itinerary_id)

    assert result.error_code == "INVALID_STATUS"


def test_confirm_unknown_itinerary(traveler, db_session):
    result = itinerary.confirm_itinerary(db_session, FakeHoldClient(db_session), 999)
    assert result.error_code == "ITINERARY_NOT_FOUND"


def test_list_itineraries_returns_only_the_users_newest_first(traveler, db_session):
    other = User(name="Eve", email="eve@example.com")
    db_session.add(other)
    db_session.commit()
    holds = FakeHoldClient(db_session)
    first = held_itinerary(db_session, traveler, holds)
    second = held_itinerary(db_session, traveler, holds, EARTH_TO_MARS_MARCH)
    itinerary.create_itinerary(db_session, holds, other.user_id, "Eve", EARTH_TO_MARS_MARCH)

    result = itinerary.list_itineraries(db_session, traveler.user_id)

    assert [i.itinerary_id for i in result] == [second.itinerary_id, first.itinerary_id]
