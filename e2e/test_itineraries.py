"""
Multi-leg itineraries across the Python backend and Java hold service.

Holds don't reserve seats; seats move only when the Java service confirms a
hold by calling back into Python. So a confirm fails when a leg sells out
between hold and confirm, and that's how the rollback test forces a failure.
"""

from helpers import seats_available


def search(client, origin, destination, day):
    r = client.get("/itineraries/search", params={"origin": origin, "destination": destination, "date": day})
    r.raise_for_status()
    return r.json()


def create(client, traveler, flight_ids):
    r = client.post("/itineraries", json={
        "user_id": traveler["user_id"], "name": traveler["name"], "flight_ids": flight_ids,
    })
    assert r.status_code == 200, r.text
    return r.json()


def test_book_three_leg_itinerary(client, traveler):
    [route] = search(client, "Earth", "Europa", "2099-02-01")
    flight_ids = [leg["flight_id"] for leg in route["legs"]]
    assert len(flight_ids) == 3

    held = create(client, traveler, flight_ids)
    assert held["status"] == "held"

    r = client.post(f"/itineraries/{held['itinerary_id']}/confirm")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "confirmed"

    bookings = client.get(f"/bookings/{traveler['user_id']}").json()
    linked = [b["flight_id"] for b in bookings if b["itinerary_id"] == held["itinerary_id"]]
    assert sorted(linked) == sorted(flight_ids)


def test_failed_leg_rolls_back_confirmed_legs(client, traveler):
    [route] = search(client, "Earth", "Mars", "2099-03-01")
    first, second = (leg["flight_id"] for leg in route["legs"])
    held = create(client, traveler, [first, second])

    # Sell out the second leg so the Java service's confirm callback fails on it.
    while seats_available(client, second, "economy") > 0:
        client.post("/book", json={
            "user_id": traveler["user_id"], "name": traveler["name"],
            "flight_id": second, "seat_class": "economy",
        }).raise_for_status()
    before = seats_available(client, first, "economy")

    r = client.post(f"/itineraries/{held['itinerary_id']}/confirm")

    assert r.status_code == 502, r.text
    assert r.json()["detail"]["error_code"] == "CONFIRM_FAILED"
    assert seats_available(client, first, "economy") == before
    itineraries = client.get(f"/users/{traveler['user_id']}/itineraries").json()
    assert next(i for i in itineraries if i["itinerary_id"] == held["itinerary_id"])["status"] == "failed"
