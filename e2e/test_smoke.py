"""Smoke tests: the basics work before we trust the cross-service flow."""

from helpers import SEAT_FIELD, find_flight_with_seats, seats_available


def test_backend_healthy(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json().get("status") == "OK"


def test_flights_listed(client):
    flights = client.get("/flights").json()
    assert isinstance(flights, list) and len(flights) > 0
    sample = flights[0]
    for key in ("flight_id", "origin", "destination", *SEAT_FIELD.values()):
        assert key in sample, f"missing {key} in flight payload"


def test_booking_happy_path(client, traveler):
    flight_id = find_flight_with_seats(client, "economy")
    before = seats_available(client, flight_id, "economy")

    r = client.post("/book", json={
        "user_id": traveler["user_id"],
        "name": traveler["name"],
        "flight_id": flight_id,
        "seat_class": "economy",
    })
    assert r.status_code == 200, r.text
    booking = r.json()
    assert booking.get("booking_id"), f"expected a booking, got {booking}"

    after = seats_available(client, flight_id, "economy")
    assert after == before - 1, "booking should decrement economy availability by 1"


def test_booking_name_mismatch_rejected(client, traveler):
    flight_id = find_flight_with_seats(client, "economy")
    r = client.post("/book", json={
        "user_id": traveler["user_id"],
        "name": "Definitely Not The Right Name",
        "flight_id": flight_id,
        "seat_class": "economy",
    })
    body = r.json()
    assert body.get("success") is False
    assert body.get("error_code") == "NAME_MISMATCH", body


def test_booking_unknown_flight_rejected(client, traveler):
    r = client.post("/book", json={
        "user_id": traveler["user_id"],
        "name": traveler["name"],
        "flight_id": 999999,
        "seat_class": "economy",
    })
    body = r.json()
    assert body.get("success") is False
    assert body.get("error_code") == "FLIGHT_NOT_FOUND", body
