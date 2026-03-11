import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Use environment variable for database URL
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./booking.db')

# SQLite requires check_same_thread=False, but PostgreSQL doesn't support it
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith('sqlite') else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()