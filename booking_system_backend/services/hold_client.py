"""Client for the Java inventory hold service.

Itinerary booking calls the Java service directly instead of the /quotes and
/holds proxy endpoints, because those proxies return HTTP 200 with
{"error": ...} on failure and the itinerary flow must detect every failure.
"""

import os
from typing import Protocol

import httpx


class HoldError(Exception):
    """The hold service rejected a request or could not be reached."""


class HoldClient(Protocol):
    def create_hold(self, flight_id: int, traveler_id: int, traveler_name: str) -> str: ...
    def confirm(self, hold_id: str) -> int: ...
    def release(self, hold_id: str) -> None: ...


class HttpHoldClient:
    def __init__(self, base_url: str, http: httpx.Client | None = None):
        self._http = http or httpx.Client(base_url=base_url, timeout=30.0)

    def _post(self, path: str, body: dict | None = None) -> dict:
        try:
            response = self._http.post(path, json=body)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as e:
            raise HoldError(f"{path}: {e}") from e

    def create_hold(self, flight_id: int, traveler_id: int, traveler_name: str) -> str:
        quote = self._post("/api/v1/quotes", {
            "flightId": flight_id,
            "seatClass": "economy",
            "quantity": 1,
            "travelerId": traveler_id,
            "travelerName": traveler_name,
        })
        quote_id = quote.get("quoteId")
        if not quote_id:
            raise HoldError(f"quote response has no quoteId: {quote}")
        hold = self._post(f"/api/v1/quotes/{quote_id}/holds")
        hold_id = hold.get("holdId")
        if not hold_id:
            raise HoldError(f"hold response has no holdId: {hold}")
        return hold_id

    def confirm(self, hold_id: str) -> int:
        hold = self._post(f"/api/v1/holds/{hold_id}/confirm")
        if hold.get("status") != "CONFIRMED":
            raise HoldError(f"hold {hold_id} was not confirmed: {hold}")
        try:
            return int(hold["externalBookingReference"])
        except (KeyError, TypeError, ValueError) as e:
            raise HoldError(f"hold {hold_id} has no booking reference: {hold}") from e

    def release(self, hold_id: str) -> None:
        self._post(f"/api/v1/holds/{hold_id}/release")


def get_hold_client() -> HoldClient:
    """FastAPI dependency; tests override it with tests.fakes.FakeHoldClient."""
    return HttpHoldClient(os.getenv("JAVA_SERVICE_URL", "http://localhost:8080"))
