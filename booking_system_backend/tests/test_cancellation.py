"""Unit tests for compute_cancellation_preview and get_cancellation_preview."""
import sys
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from models import Booking, Flight, User
from schemas import CancellationPreview, ErrorResponse
from services.booking import compute_cancellation_preview, get_cancellation_preview


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _future_datetime_str(days: int, fmt: str = "%Y-%m-%d %H:%M") -> str:
    """Return a departure_time string that is exactly *days* days from 'now'."""
    # We freeze 'now' inside the call via mock, so the exact base doesn't matter —
    # tests use a fixed reference.
    dt = datetime(2099, 6, 15, 12, 0, 0) + timedelta(days=days)
    return dt.strftime(fmt)


# Fixed "now" used in all tier tests so results are deterministic.
_NOW = datetime(2099, 6, 15, 0, 0, 0)


# ---------------------------------------------------------------------------
# Tier tests — pure helper (no DB)
# ---------------------------------------------------------------------------

class TestComputeCancellationPreviewTiers:
    """Test all four policy tiers using a mocked utcnow."""

    def _call(self, days: int, price_paid: int = 1000, fmt: str = "%Y-%m-%d %H:%M") -> CancellationPreview:
        departure = (_NOW + timedelta(days=days)).strftime(fmt)
        with patch("services.booking.datetime") as mock_dt:
            mock_dt.strptime = datetime.strptime  # keep real strptime
            mock_dt.utcnow.return_value = _NOW
            return compute_cancellation_preview(price_paid, departure)

    def test_tier_full_refund_exactly_7_days(self):
        preview = self._call(days=7, price_paid=1000)
        assert preview.tier_label == "Full Refund"
        assert preview.refund_amount == 1000
        assert preview.fee_amount == 0
        assert preview.credit_amount == 0
        assert preview.total_forfeited == 0
        assert preview.price_paid == 1000

    def test_tier_full_refund_more_than_7_days(self):
        preview = self._call(days=30, price_paid=2000)
        assert preview.tier_label == "Full Refund"
        assert preview.refund_amount == 2000
        assert preview.fee_amount == 0
        assert preview.total_forfeited == 0

    def test_tier_partial_refund_exactly_3_days(self):
        preview = self._call(days=3, price_paid=1000)
        assert preview.tier_label == "Partial Refund"
        assert preview.refund_amount == 750  # 75%
        assert preview.fee_amount == 100    # 10%
        assert preview.credit_amount == 150  # 15%
        assert preview.total_forfeited == 100  # price_paid - refund - credit
        assert preview.price_paid == 1000

    def test_tier_partial_refund_exactly_6_days(self):
        preview = self._call(days=6, price_paid=1000)
        assert preview.tier_label == "Partial Refund"
        assert preview.refund_amount == 750

    def test_tier_non_refundable_exactly_1_day(self):
        preview = self._call(days=1, price_paid=1000)
        assert preview.tier_label == "Non-refundable"
        assert preview.refund_amount == 0
        assert preview.fee_amount == 250   # 25%
        assert preview.credit_amount == 250  # 25%
        assert preview.total_forfeited == 750  # price_paid - refund(0) - credit(250) = 750
        assert preview.price_paid == 1000

    def test_tier_non_refundable_exactly_2_days(self):
        preview = self._call(days=2, price_paid=1000)
        assert preview.tier_label == "Non-refundable"
        assert preview.refund_amount == 0

    def test_tier_forfeit_same_day(self):
        preview = self._call(days=0, price_paid=1000)
        assert preview.tier_label == "Forfeit"
        assert preview.refund_amount == 0
        assert preview.fee_amount == 0
        assert preview.credit_amount == 0
        assert preview.total_forfeited == 1000
        assert preview.price_paid == 1000

    def test_tier_forfeit_past_departure(self):
        # Negative days (already departed) → same-day or past → forfeit
        preview = self._call(days=-3, price_paid=500)
        assert preview.tier_label == "Forfeit"
        assert preview.total_forfeited == 500


# ---------------------------------------------------------------------------
# Date format tests
# ---------------------------------------------------------------------------

class TestComputeCancellationPreviewDateFormats:
    """Test that all three supported departure_time string formats are parsed."""

    def _call_with_raw(self, departure_time: str, price_paid: int = 1000) -> CancellationPreview:
        with patch("services.booking.datetime") as mock_dt:
            mock_dt.strptime = datetime.strptime
            mock_dt.utcnow.return_value = datetime(2099, 1, 1, 0, 0, 0)
            return compute_cancellation_preview(price_paid, departure_time)

    def test_format_space_separated(self):
        """Test fixture format: "YYYY-MM-DD HH:MM" (from conftest.py sample_flight_data)."""
        # 2099-01-15 is 14 days after 2099-01-01 → Full Refund
        preview = self._call_with_raw("2099-01-15 09:00")
        assert preview.tier_label == "Full Refund"

    def test_format_iso_z(self):
        """Seed data format: "YYYY-MM-DDTHH:MM:SSZ" (from seed.py)."""
        # Taken verbatim from seed.py style
        preview = self._call_with_raw("2099-01-15T09:00:00Z")
        assert preview.tier_label == "Full Refund"

    def test_format_iso_no_z(self):
        """ISO format without Z suffix: "YYYY-MM-DDTHH:MM:SS"."""
        preview = self._call_with_raw("2099-01-15T09:00:00")
        assert preview.tier_label == "Full Refund"

    def test_invalid_format_raises_value_error(self):
        with pytest.raises(ValueError, match="Unrecognised departure_time format"):
            compute_cancellation_preview(1000, "01/15/2099 09:00")


# ---------------------------------------------------------------------------
# get_cancellation_preview — service wrapper (uses DB fixture)
# ---------------------------------------------------------------------------

class TestGetCancellationPreview:
    def test_returns_preview_for_existing_booking(self, db_session):
        user = User(name="Traveler", email="traveler@galaxium.test")
        flight = Flight(
            origin="Earth", destination="Mars",
            departure_time="2099-06-22 10:00",
            arrival_time="2099-06-22 18:00",
            base_price=500000,
            economy_seats_available=5,
            business_seats_available=3,
            galaxium_seats_available=1,
        )
        db_session.add_all([user, flight])
        db_session.flush()
        b = Booking(
            user_id=user.user_id, flight_id=flight.flight_id,
            status="booked", booking_time="2099-06-01T10:00:00Z",
            seat_class="economy", price_paid=500000,
        )
        db_session.add(b)
        db_session.commit()

        result = get_cancellation_preview(db_session, b.booking_id)
        assert isinstance(result, CancellationPreview)
        assert result.price_paid == 500000

    def test_returns_error_for_missing_booking(self, db_session):
        result = get_cancellation_preview(db_session, 99999)
        assert isinstance(result, ErrorResponse)
        assert result.error_code == "BOOKING_NOT_FOUND"
