import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import StaticPool

from db import add_missing_columns
from models import Base


def memory_engine():
    return create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)


def test_adds_itinerary_id_to_a_pre_feature_bookings_table():
    engine = memory_engine()
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TABLE bookings (booking_id INTEGER PRIMARY KEY, user_id INTEGER, flight_id INTEGER, "
            "status VARCHAR, booking_time VARCHAR, seat_class VARCHAR, price_paid INTEGER)"
        ))
        conn.execute(text("INSERT INTO bookings VALUES (1, 1, 1, 'booked', '2099-01-01', 'economy', 100)"))

    add_missing_columns(engine)

    assert "itinerary_id" in {c["name"] for c in inspect(engine).get_columns("bookings")}
    with engine.connect() as conn:
        assert conn.execute(text("SELECT itinerary_id FROM bookings WHERE booking_id = 1")).scalar() is None


def test_is_a_no_op_on_a_current_schema():
    engine = memory_engine()
    Base.metadata.create_all(bind=engine)
    add_missing_columns(engine)
    add_missing_columns(engine)
    assert "itinerary_id" in {c["name"] for c in inspect(engine).get_columns("bookings")}


def test_creates_itinerary_tables():
    engine = memory_engine()
    Base.metadata.create_all(bind=engine)
    tables = set(inspect(engine).get_table_names())
    assert {"itineraries", "itinerary_legs"} <= tables
