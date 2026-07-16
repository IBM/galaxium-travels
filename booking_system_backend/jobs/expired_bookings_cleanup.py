"""
Job: expired_bookings_cleanup
------------------------------
Scans the bookings table for any booking with status='pending' that was
created more than 24 hours ago and marks it as 'cancelled'.

Run manually:
    python jobs/expired_bookings_cleanup.py

Or schedule via cron / Task Scheduler:
    0 * * * * python /path/to/jobs/expired_bookings_cleanup.py
"""

import sys
import os
import logging
from datetime import datetime, timedelta

# Allow imports from the parent backend directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import SessionLocal, init_db
from models import Booking

# ---------------------------------------------------------------------------
# Logging setup — writes to both console and a timestamped log file
# ---------------------------------------------------------------------------
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

_run_ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
_log_file = os.path.join(LOG_DIR, f"expired_bookings_cleanup_{_run_ts}.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(_log_file),
    ],
)
logger = logging.getLogger("expired_bookings_cleanup")

# ---------------------------------------------------------------------------
# Job logic
# ---------------------------------------------------------------------------
EXPIRY_HOURS = 24


def run():
    logger.info("=" * 60)
    logger.info("Job started: expired_bookings_cleanup")
    logger.info(f"Cancelling pending bookings older than {EXPIRY_HOURS} hour(s)")

    init_db()
    db = SessionLocal()

    try:
        cutoff = datetime.utcnow() - timedelta(hours=EXPIRY_HOURS)
        cutoff_str = cutoff.strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"Cutoff timestamp (UTC): {cutoff_str}")

        # Fetch all pending bookings
        pending = (
            db.query(Booking)
            .filter(Booking.status == "pending")
            .all()
        )
        logger.info(f"Total pending bookings found: {len(pending)}")

        expired = []
        for booking in pending:
            try:
                booked_at = datetime.strptime(booking.booking_time, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                logger.warning(
                    f"Booking ID {booking.booking_id} has unrecognised "
                    f"booking_time format: '{booking.booking_time}' — skipping"
                )
                continue

            if booked_at < cutoff:
                expired.append(booking)

        logger.info(f"Expired pending bookings to cancel: {len(expired)}")

        for booking in expired:
            logger.info(
                f"Cancelling Booking ID={booking.booking_id} | "
                f"User ID={booking.user_id} | Flight ID={booking.flight_id} | "
                f"Booked at={booking.booking_time}"
            )
            booking.status = "cancelled"

        db.commit()
        logger.info(f"Successfully cancelled {len(expired)} booking(s).")

    except Exception as exc:
        db.rollback()
        logger.exception(f"Job failed with error: {exc}")
        sys.exit(1)

    finally:
        db.close()
        logger.info("Job finished: expired_bookings_cleanup")
        logger.info("=" * 60)


if __name__ == "__main__":
    run()
