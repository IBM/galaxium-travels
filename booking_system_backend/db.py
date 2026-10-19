import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from models import Base

# Get database URL from environment, fallback to SQLite for local dev
SQLALCHEMY_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'sqlite:///./booking.db'
)

# PostgreSQL doesn't need check_same_thread
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith('sqlite'):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    add_missing_columns(engine)

def add_missing_columns(target_engine):
    """Add columns introduced after a database was first created.

    create_all() creates missing tables but never alters existing ones.
    """
    columns = {c["name"] for c in inspect(target_engine).get_columns("bookings")}
    if "itinerary_id" not in columns:
        with target_engine.begin() as conn:
            conn.execute(text("ALTER TABLE bookings ADD COLUMN itinerary_id INTEGER"))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()