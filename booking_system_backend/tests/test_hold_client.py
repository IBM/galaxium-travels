import json
import sys
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.hold_client import HoldError, HttpHoldClient


def make_client(handler):
    transport = httpx.MockTransport(handler)
    return HttpHoldClient("http://hold", http=httpx.Client(base_url="http://hold", transport=transport))


def test_create_hold_creates_quote_then_hold():
    calls = []

    def handler(request):
        calls.append((request.url.path, request.content))
        if request.url.path == "/api/v1/quotes":
            return httpx.Response(200, json={"quoteId": "Q-1"})
        return httpx.Response(200, json={"holdId": "H-1", "status": "HELD"})

    assert make_client(handler).create_hold(7, 1, "Ada") == "H-1"
    assert [path for path, _ in calls] == ["/api/v1/quotes", "/api/v1/quotes/Q-1/holds"]
    assert json.loads(calls[0][1]) == {
        "flightId": 7, "seatClass": "economy", "quantity": 1, "travelerId": 1, "travelerName": "Ada",
    }


def test_create_hold_http_error_raises():
    client = make_client(lambda request: httpx.Response(500, json={"message": "boom"}))
    with pytest.raises(HoldError):
        client.create_hold(7, 1, "Ada")


def test_create_hold_missing_quote_id_raises():
    client = make_client(lambda request: httpx.Response(200, json={"error": "Failed to create quote"}))
    with pytest.raises(HoldError):
        client.create_hold(7, 1, "Ada")


def test_connection_error_raises():
    def handler(request):
        raise httpx.ConnectError("hold service down", request=request)

    with pytest.raises(HoldError):
        make_client(handler).create_hold(7, 1, "Ada")


def test_confirm_returns_booking_id():
    client = make_client(lambda request: httpx.Response(
        200, json={"holdId": "H-1", "status": "CONFIRMED", "externalBookingReference": "42"}
    ))
    assert client.confirm("H-1") == 42


def test_confirm_failure_status_raises():
    client = make_client(lambda request: httpx.Response(200, json={"holdId": "H-1", "status": "CONFIRMATION_FAILED"}))
    with pytest.raises(HoldError):
        client.confirm("H-1")


def test_release_posts_to_release_endpoint():
    paths = []

    def handler(request):
        paths.append(request.url.path)
        return httpx.Response(200, json={"holdId": "H-1", "status": "RELEASED"})

    make_client(handler).release("H-1")
    assert paths == ["/api/v1/holds/H-1/release"]
