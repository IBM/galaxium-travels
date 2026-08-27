"""
Tests for GET /booking/{booking_id} (booking_detail router).

Covers every compliance-checklist control:
  C1  booking_id <= 0 is rejected with 422
  C2  X-User-Email present and valid
  C3  Missing / malformed header → 401
  C4  Booking looked up by ORM (implicitly tested via the endpoint behaviour)
  C5  User looked up by ORM (implicitly tested)
  C6  Ownership check enforced
  C7  Missing booking → 404
  C8  Wrong owner → 403
  C9  Log entry emitted (patched logger checked)
  C10 Email absent from log record
  C11 Unexpected exceptions → 500 generic response
  C12 No internal details in any response body
"""

import sys
import logging
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import User, Flight, Booking


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_EMAIL = "traveller@example.com"
OTHER_EMAIL = "other@example.com"
ENDPOINT = "/booking/{}"


def _make_user(db, email=VALID_EMAIL, name="Alice"):
    u = User(name=name, email=email)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


def _make_flight(db):
    f = Flight(
        origin="Earth",
        destination="Mars",
        departure_time="2099-06-01T10:00:00Z",
        arrival_time="2099-06-01T20:00:00Z",
        price=999999,
        seats_available=10,
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return f


def _make_booking(db, user_id, flight_id):
    b = Booking(
        user_id=user_id,
        flight_id=flight_id,
        status="booked",
        booking_time="2099-06-01T11:00:00Z",
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


# ---------------------------------------------------------------------------
# C1 — booking_id must be a positive integer (>0 enforced by Path(gt=0))
# ---------------------------------------------------------------------------

class TestBookingIdValidation:
    """C1: booking_id <= 0 rejected with HTTP 422."""

    def test_zero_booking_id_returns_422(self, client, db_session):
        # Path(gt=0) only fires 422 when the rest of the request is valid;
        # supply a valid header so the dependency does not short-circuit first.
        _make_user(db_session)
        r = client.get(ENDPOINT.format(0),
                       headers={"X-User-Email": VALID_EMAIL})
        assert r.status_code == 422

    def test_negative_booking_id_returns_422(self, client, db_session):
        _make_user(db_session)
        r = client.get(ENDPOINT.format(-5),
                       headers={"X-User-Email": VALID_EMAIL})
        assert r.status_code == 422

    def test_positive_booking_id_is_accepted(self, client, db_session):
        # Non-existent but positive id → 404, not 422
        _make_user(db_session)
        r = client.get(ENDPOINT.format(999),
                       headers={"X-User-Email": VALID_EMAIL})
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# C2 / C3 — X-User-Email header validation
# ---------------------------------------------------------------------------

class TestEmailHeaderValidation:
    """C2 / C3: header must be present and a valid email address."""

    def test_missing_header_returns_401(self, client):
        r = client.get(ENDPOINT.format(1))
        assert r.status_code == 401

    def test_missing_header_generic_message(self, client):
        r = client.get(ENDPOINT.format(1))
        # C12: no internal details
        assert "stack" not in r.text.lower()
        assert "sql" not in r.text.lower()

    def test_malformed_email_returns_401(self, client):
        r = client.get(ENDPOINT.format(1),
                       headers={"X-User-Email": "not-an-email"})
        assert r.status_code == 401

    def test_empty_email_returns_401(self, client):
        r = client.get(ENDPOINT.format(1),
                       headers={"X-User-Email": ""})
        assert r.status_code == 401

    def test_valid_email_does_not_return_401(self, client, db_session):
        # Valid header but non-existent booking → 404, proving header passed
        r = client.get(ENDPOINT.format(99),
                       headers={"X-User-Email": VALID_EMAIL})
        assert r.status_code != 401


# ---------------------------------------------------------------------------
# C7 — HTTP 404 when booking does not exist
# ---------------------------------------------------------------------------

class TestBookingNotFound:
    """C7: non-existent booking_id returns 404."""

    def test_nonexistent_booking_returns_404(self, client, db_session):
        _make_user(db_session)
        r = client.get(ENDPOINT.format(9999),
                       headers={"X-User-Email": VALID_EMAIL})
        assert r.status_code == 404

    def test_404_body_is_generic(self, client, db_session):
        r = client.get(ENDPOINT.format(9999),
                       headers={"X-User-Email": VALID_EMAIL})
        body = r.text.lower()
        assert "stack" not in body
        assert "traceback" not in body
        assert "sqlite" not in body


# ---------------------------------------------------------------------------
# C6 / C8 — Ownership enforcement
# ---------------------------------------------------------------------------

class TestOwnershipEnforcement:
    """C6 / C8: booking returned only to its owner; otherwise HTTP 403."""

    def test_owner_can_read_their_booking(self, client, db_session):
        user = _make_user(db_session)
        flight = _make_flight(db_session)
        booking = _make_booking(db_session, user.user_id, flight.flight_id)

        r = client.get(ENDPOINT.format(booking.booking_id),
                       headers={"X-User-Email": VALID_EMAIL})
        assert r.status_code == 200
        data = r.json()
        assert data["booking_id"] == booking.booking_id
        assert data["user_id"] == user.user_id

    def test_non_owner_receives_403(self, client, db_session):
        owner = _make_user(db_session, email=VALID_EMAIL, name="Alice")
        other = _make_user(db_session, email=OTHER_EMAIL, name="Bob")
        flight = _make_flight(db_session)
        booking = _make_booking(db_session, owner.user_id, flight.flight_id)

        r = client.get(ENDPOINT.format(booking.booking_id),
                       headers={"X-User-Email": OTHER_EMAIL})
        assert r.status_code == 403

    def test_403_body_is_generic(self, client, db_session):
        owner = _make_user(db_session, email=VALID_EMAIL)
        other = _make_user(db_session, email=OTHER_EMAIL, name="Bob")
        flight = _make_flight(db_session)
        booking = _make_booking(db_session, owner.user_id, flight.flight_id)

        r = client.get(ENDPOINT.format(booking.booking_id),
                       headers={"X-User-Email": OTHER_EMAIL})
        body = r.text.lower()
        assert "stack" not in body
        assert "traceback" not in body
        assert "sqlite" not in body

    def test_unknown_email_receives_403(self, client, db_session):
        """Email valid in format but not registered → 403 (not 401/404)."""
        owner = _make_user(db_session, email=VALID_EMAIL)
        flight = _make_flight(db_session)
        booking = _make_booking(db_session, owner.user_id, flight.flight_id)

        r = client.get(ENDPOINT.format(booking.booking_id),
                       headers={"X-User-Email": "ghost@nowhere.example.com"})
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# C9 / C10 — Logging behaviour
# ---------------------------------------------------------------------------

class TestLogging:
    """C9 / C10: log entry emitted; email NOT present in log record."""

    def test_log_entry_emitted_on_access(self, client, db_session, caplog):
        _make_user(db_session)
        with caplog.at_level(logging.INFO, logger="routers.booking_detail"):
            client.get(ENDPOINT.format(1),
                       headers={"X-User-Email": VALID_EMAIL})
        assert len(caplog.records) >= 1

    def test_email_not_in_log_records(self, client, db_session, caplog):
        _make_user(db_session)
        with caplog.at_level(logging.DEBUG, logger="routers.booking_detail"):
            client.get(ENDPOINT.format(1),
                       headers={"X-User-Email": VALID_EMAIL})
        for record in caplog.records:
            # The raw email string must never appear in any log record
            assert VALID_EMAIL not in record.getMessage()
            assert VALID_EMAIL not in str(record.__dict__)

    def test_log_entry_on_auth_failure(self, client, caplog):
        with caplog.at_level(logging.WARNING, logger="routers.booking_detail"):
            client.get(ENDPOINT.format(1))
        assert any(r.levelno >= logging.WARNING for r in caplog.records)


# ---------------------------------------------------------------------------
# C11 / C12 — Unexpected server errors
# ---------------------------------------------------------------------------

class TestUnexpectedErrors:
    """C11 / C12: unexpected exceptions produce generic HTTP 500; no internals exposed."""

    def test_db_error_returns_500(self, client, db_session):
        """Simulate a DB error by making db.query raise an exception."""
        _make_user(db_session)

        with patch("routers.booking_detail.Booking") as mock_booking_cls:
            mock_booking_cls.booking_id = Booking.booking_id
            # Patch the session query to blow up unexpectedly
            original_query = db_session.query

            def exploding_query(model):
                if model is mock_booking_cls:
                    raise RuntimeError("simulated database failure")
                return original_query(model)

            db_session.query = exploding_query

            r = client.get(ENDPOINT.format(1),
                           headers={"X-User-Email": VALID_EMAIL})

        assert r.status_code == 500

    def test_500_body_contains_no_stack_trace(self, client, db_session):
        _make_user(db_session)

        with patch("routers.booking_detail.Booking") as mock_booking_cls:
            mock_booking_cls.booking_id = Booking.booking_id
            original_query = db_session.query

            def exploding_query(model):
                if model is mock_booking_cls:
                    raise RuntimeError("internal secret info")
                return original_query(model)

            db_session.query = exploding_query

            r = client.get(ENDPOINT.format(1),
                           headers={"X-User-Email": VALID_EMAIL})

        body = r.text
        assert "internal secret info" not in body
        assert "Traceback" not in body
        assert "RuntimeError" not in body


# ---------------------------------------------------------------------------
# Response schema — success path
# ---------------------------------------------------------------------------

class TestSuccessResponse:
    """Verify the BookingOut schema is returned correctly."""

    def test_response_schema_fields(self, client, db_session):
        user = _make_user(db_session)
        flight = _make_flight(db_session)
        booking = _make_booking(db_session, user.user_id, flight.flight_id)

        r = client.get(ENDPOINT.format(booking.booking_id),
                       headers={"X-User-Email": VALID_EMAIL})
        assert r.status_code == 200
        data = r.json()
        assert set(data.keys()) >= {"booking_id", "user_id", "flight_id", "status", "booking_time"}
        assert data["status"] == "booked"
        assert data["flight_id"] == flight.flight_id
