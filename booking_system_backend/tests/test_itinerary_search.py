import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Flight
from services.itinerary_search import find_routes, is_valid_connection, parse_time

DAY = date(2099, 2, 1)


def make_flight(flight_id, origin, destination, departure, arrival, price=100, seats=5):
    return Flight(
        flight_id=flight_id,
        origin=origin,
        destination=destination,
        departure_time=departure,
        arrival_time=arrival,
        base_price=price,
        economy_seats_available=seats,
        business_seats_available=3,
        galaxium_seats_available=1,
    )


def ids(route):
    return [f.flight_id for f in route.legs]


def test_parse_time_accepts_both_formats():
    assert parse_time("2099-02-01T09:00:00Z") == datetime(2099, 2, 1, 9, 0)
    assert parse_time("2099-02-01 09:00") == datetime(2099, 2, 1, 9, 0)


def test_direct_route():
    flights = [make_flight(1, "Earth", "Mars", "2099-02-01 09:00", "2099-02-01 17:00")]
    routes = find_routes(flights, "Earth", "Mars", DAY)
    assert [ids(r) for r in routes] == [[1]]
    assert routes[0].total_minutes == 480
    assert routes[0].layover_minutes == []


def test_two_leg_route_with_exact_minimum_layover():
    flights = [
        make_flight(1, "Earth", "Moon", "2099-02-01 08:00", "2099-02-01 12:00"),
        make_flight(2, "Moon", "Mars", "2099-02-01 14:00", "2099-02-01 22:00"),
    ]
    routes = find_routes(flights, "Earth", "Mars", DAY)
    assert [ids(r) for r in routes] == [[1, 2]]
    assert routes[0].layover_minutes == [120]


def test_layover_just_under_minimum_is_rejected():
    arriving = make_flight(1, "Earth", "Moon", "2099-02-01 08:00", "2099-02-01 12:00")
    departing = make_flight(2, "Moon", "Mars", "2099-02-01 13:59", "2099-02-01 22:00")
    assert not is_valid_connection(arriving, departing)


def test_layover_of_exactly_72_hours_is_valid():
    arriving = make_flight(1, "Earth", "Moon", "2099-02-01 08:00", "2099-02-01 12:00")
    departing = make_flight(2, "Moon", "Mars", "2099-02-04 12:00", "2099-02-04 20:00")
    assert is_valid_connection(arriving, departing)


def test_layover_just_over_72_hours_is_rejected():
    arriving = make_flight(1, "Earth", "Moon", "2099-02-01 08:00", "2099-02-01 12:00")
    departing = make_flight(2, "Moon", "Mars", "2099-02-04 12:01", "2099-02-04 20:00")
    assert not is_valid_connection(arriving, departing)


def test_connection_requires_matching_location():
    arriving = make_flight(1, "Earth", "Moon", "2099-02-01 08:00", "2099-02-01 12:00")
    departing = make_flight(2, "Venus", "Mars", "2099-02-01 15:00", "2099-02-01 22:00")
    assert not is_valid_connection(arriving, departing)


def test_mixed_timestamp_formats_connect():
    flights = [
        make_flight(1, "Earth", "Moon", "2099-02-01T08:00:00Z", "2099-02-01T12:00:00Z"),
        make_flight(2, "Moon", "Mars", "2099-02-01 15:00", "2099-02-01 23:00"),
    ]
    routes = find_routes(flights, "Earth", "Mars", DAY)
    assert [ids(r) for r in routes] == [[1, 2]]
    assert routes[0].layover_minutes == [180]


def test_four_leg_route_is_excluded():
    flights = [
        make_flight(1, "Earth", "Moon", "2099-02-01 00:00", "2099-02-01 02:00"),
        make_flight(2, "Moon", "Mars", "2099-02-01 05:00", "2099-02-01 07:00"),
        make_flight(3, "Mars", "Jupiter", "2099-02-01 10:00", "2099-02-01 12:00"),
        make_flight(4, "Jupiter", "Europa", "2099-02-01 15:00", "2099-02-01 17:00"),
    ]
    assert find_routes(flights, "Earth", "Europa", DAY) == []
    assert [ids(r) for r in find_routes(flights, "Earth", "Jupiter", DAY)] == [[1, 2, 3]]


def test_route_never_revisits_a_location():
    flights = [
        make_flight(1, "Earth", "Moon", "2099-02-01 00:00", "2099-02-01 02:00"),
        make_flight(2, "Moon", "Earth", "2099-02-01 05:00", "2099-02-01 07:00"),
        make_flight(3, "Earth", "Mars", "2099-02-01 10:00", "2099-02-01 12:00"),
    ]
    assert [ids(r) for r in find_routes(flights, "Earth", "Mars", DAY)] == [[3]]


def test_first_leg_must_depart_on_travel_date():
    flights = [make_flight(1, "Earth", "Mars", "2099-02-02 09:00", "2099-02-02 17:00")]
    assert find_routes(flights, "Earth", "Mars", DAY) == []


def test_sold_out_leg_is_excluded():
    flights = [
        make_flight(1, "Earth", "Moon", "2099-02-01 08:00", "2099-02-01 12:00"),
        make_flight(2, "Moon", "Mars", "2099-02-01 15:00", "2099-02-01 23:00", seats=0),
    ]
    assert find_routes(flights, "Earth", "Mars", DAY) == []


def test_sorted_by_total_time_then_price():
    flights = [
        make_flight(1, "Earth", "Moon", "2099-02-01 08:00", "2099-02-01 12:00", price=50),
        make_flight(2, "Moon", "Mars", "2099-02-01 16:00", "2099-02-02 00:00", price=50),
        make_flight(3, "Earth", "Mars", "2099-02-01 09:00", "2099-02-01 17:00", price=900),
        make_flight(4, "Earth", "Mars", "2099-02-01 10:00", "2099-02-01 18:00", price=800),
    ]
    assert [ids(r) for r in find_routes(flights, "Earth", "Mars", DAY)] == [[4], [3], [1, 2]]


def test_origin_and_destination_are_case_insensitive():
    flights = [make_flight(1, "Earth", "Mars", "2099-02-01 09:00", "2099-02-01 17:00")]
    assert [ids(r) for r in find_routes(flights, "earth", "MARS", DAY)] == [[1]]


def test_results_are_capped_at_ten():
    flights = [
        make_flight(i, "Earth", "Mars", f"2099-02-01 {i:02d}:00", f"2099-02-01 {i:02d}:30")
        for i in range(12)
    ]
    assert len(find_routes(flights, "Earth", "Mars", DAY)) == 10
