"""Small helpers shared across the e2e tests.

All calls go through the Python backend's public REST API — the same surface the
React frontend talks to. The hold/quote endpoints there are thin proxies to the
Java service, so exercising them tests the full cross-service round trip.

Note on field casing: the Java service returns camelCase (quoteId, holdId,
externalBookingReference); the Python backend returns snake_case (flight_id,
booking_id, *_seats_available).
"""

import time

SEAT_FIELD = {
    "economy": "economy_seats_available",
    "business": "business_seats_available",
    "galaxium": "galaxium_seats_available",
}


def get_flights(client):
    r = client.get("/flights")
    r.raise_for_status()
    return r.json()


def seats_available(client, flight_id, seat_class):
    for f in get_flights(client):
        if f["flight_id"] == flight_id:
            return f[SEAT_FIELD[seat_class]]
    raise AssertionError(f"flight {flight_id} not found")


def find_flight_with_seats(client, seat_class, minimum=1):
    """Return a flight_id that currently has >= `minimum` seats in `seat_class`.

    Seed data randomizes initial availability, so we never assume exact counts —
    we pick a flight that has room and assert on *deltas* instead.
    """
    field = SEAT_FIELD[seat_class]
    for f in get_flights(client):
        if f[field] >= minimum:
            return f["flight_id"]
    raise AssertionError(f"no flight has >= {minimum} {seat_class} seats available")


def create_quote(client, flight_id, traveler, seat_class="business", quantity=1):
    body = {
        "flightId": flight_id,
        "seatClass": seat_class,
        "quantity": quantity,
        "travelerId": traveler["user_id"],
        "travelerName": traveler["name"],
    }
    r = client.post("/quotes", json=body)
    r.raise_for_status()
    quote = r.json()
    assert "quoteId" in quote, f"quote creation failed: {quote}"
    return quote


def create_hold(client, quote_id):
    r = client.post(f"/quotes/{quote_id}/holds")
    r.raise_for_status()
    hold = r.json()
    assert "holdId" in hold, f"hold creation failed: {hold}"
    return hold


def poll(fn, until, timeout, interval=3):
    """Call fn() until until(result) is truthy or timeout; return the last result."""
    deadline = time.time() + timeout
    result = fn()
    while time.time() < deadline:
        if until(result):
            return result
        time.sleep(interval)
        result = fn()
    return result
