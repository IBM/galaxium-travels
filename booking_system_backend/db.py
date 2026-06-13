import os
from sqlalchemy import create_engine
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

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()