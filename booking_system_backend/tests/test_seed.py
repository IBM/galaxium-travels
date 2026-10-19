import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Flight
from seed import seed_connecting_flights
from services.itinerary_search import find_routes


def route_ids(db_session, origin, destination, day):
    return [[f.flight_id for f in r.legs] for r in find_routes(db_session.query(Flight).all(), origin, destination, day)]


def test_seed_connecting_flights_is_idempotent(db_session):
    seed_connecting_flights(db_session)
    seed_connecting_flights(db_session)
    assert db_session.query(Flight).count() == 7


def test_earth_to_europa_has_one_three_leg_route(db_session):
    seed_connecting_flights(db_session)
    assert route_ids(db_session, "Earth", "Europa", date(2099, 2, 1)) == [[3, 4, 5]]


def test_earth_to_mars_in_february_has_direct_and_moon_routes(db_session):
    seed_connecting_flights(db_session)
    assert route_ids(db_session, "Earth", "Mars", date(2099, 2, 1)) == [[3], [1, 2]]


def test_earth_to_mars_in_march_has_one_moon_route(db_session):
    seed_connecting_flights(db_session)
    assert route_ids(db_session, "Earth", "Mars", date(2099, 3, 1)) == [[6, 7]]
