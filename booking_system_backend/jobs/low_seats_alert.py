"""
Job: low_seats_alert
---------------------
Scans the flights table and logs a WARNING for every flight whose
seat count in any class (economy, business, galaxium) is below the
configured threshold (default: 10).

Run manually:
    python jobs/low_seats_alert.py

Or schedule via cron / Task Scheduler:
    0 6 * * * python /path/to/jobs/low_seats_alert.py
"""

import sys
import os
import logging
from datetime import datetime

# Allow imports from the parent backend directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import SessionLocal, init_db
from models import Flight

# ---------------------------------------------------------------------------
# Logging setup — writes to both console and a timestamped log file
# ---------------------------------------------------------------------------
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

_run_ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
_log_file = os.path.join(LOG_DIR, f"low_seats_alert_{_run_ts}.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(_log_file),
    ],
)
logger = logging.getLogger("low_seats_alert")

# ---------------------------------------------------------------------------
# Job logic
# ---------------------------------------------------------------------------
LOW_SEAT_THRESHOLD = 10


def run():
    logger.info("=" * 60)
    logger.info("Job started: low_seats_alert")
    logger.info(f"Checking flights with any class seats < {LOW_SEAT_THRESHOLD}")

    init_db()
    db = SessionLocal()

    CLASSES = ["economy", "business", "galaxium"]

    try:
        all_flights = db.query(Flight).all()
        logger.info(f"Total flights in database: {len(all_flights)}")

        # A flight is flagged if ANY seat class is below the threshold
        low_seat_flights = [
            f for f in all_flights
            if any(getattr(f, f"{cls}_seats") < LOW_SEAT_THRESHOLD for cls in CLASSES)
        ]

        if not low_seat_flights:
            logger.info("No flights with low seat availability — all good!")
        else:
            logger.warning(
                f"ALERT: {len(low_seat_flights)} flight(s) have a class with fewer than "
                f"{LOW_SEAT_THRESHOLD} seats available."
            )
            for flight in low_seat_flights:
                class_summary = " | ".join(
                    f"{cls.capitalize()}={getattr(flight, f'{cls}_seats')} seats @ {getattr(flight, f'{cls}_price')}"
                    for cls in CLASSES
                    if getattr(flight, f"{cls}_seats") < LOW_SEAT_THRESHOLD
                )
                logger.warning(
                    f"  [LOW] Flight ID={flight.flight_id} | "
                    f"{flight.origin} -> {flight.destination} | "
                    f"Departure={flight.departure_time} | "
                    f"{class_summary}"
                )

        # Summary INFO line for monitoring dashboards / log aggregators
        logger.info(
            f"Summary — Total: {len(all_flights)} | "
            f"Low seats: {len(low_seat_flights)} | "
            f"OK: {len(all_flights) - len(low_seat_flights)}"
        )

    except Exception as exc:
        logger.exception(f"Job failed with error: {exc}")
        sys.exit(1)

    finally:
        db.close()
        logger.info("Job finished: low_seats_alert")
        logger.info("=" * 60)


if __name__ == "__main__":
    run()
