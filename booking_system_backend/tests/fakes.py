"""Test doubles shared by itinerary tests."""

from schemas import ErrorResponse
from services.booking import book_flight
from services.hold_client import HoldError


class FakeHoldClient:
    """In-memory stand-in for the Java hold service.

    confirm() books through book_flight(), the same way the Java service's
    callback to /internal/bookings/from-hold does.
    """

    def __init__(self, db, fail_hold_for=(), fail_confirm_for=()):
        self.db = db
        self.fail_hold_for = set(fail_hold_for)
        self.fail_confirm_for = set(fail_confirm_for)
        self.holds: dict[str, tuple[int, int, str]] = {}
        self.released: list[str] = []
        self.confirmed: list[str] = []

    def create_hold(self, flight_id, traveler_id, traveler_name):
        if flight_id in self.fail_hold_for:
            raise HoldError(f"hold refused for flight {flight_id}")
        hold_id = f"H-{len(self.holds) + 1}"
        self.holds[hold_id] = (flight_id, traveler_id, traveler_name)
        return hold_id

    def confirm(self, hold_id):
        flight_id, traveler_id, traveler_name = self.holds[hold_id]
        if flight_id in self.fail_confirm_for:
            raise HoldError(f"confirm refused for flight {flight_id}")
        result = book_flight(self.db, traveler_id, traveler_name, flight_id, "economy")
        if isinstance(result, ErrorResponse):
            raise HoldError(result.error)
        self.confirmed.append(hold_id)
        return result.booking_id

    def release(self, hold_id):
        self.released.append(hold_id)
