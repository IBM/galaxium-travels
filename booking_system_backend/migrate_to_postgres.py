"""
Script to migrate data from SQLite to PostgreSQL
Run this once during migration
"""
import sqlite3
import psycopg2
from psycopg2.extras import execute_values
import os

def migrate_data():
    # Connect to SQLite
    sqlite_conn = sqlite3.connect('booking.db')
    sqlite_cursor = sqlite_conn.cursor()
    
    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    pg_cursor = pg_conn.cursor()
    
    # Migrate users
    sqlite_cursor.execute("SELECT * FROM users")
    users = sqlite_cursor.fetchall()
    if users:
        execute_values(
            pg_cursor,
            "INSERT INTO users (id, name, email) VALUES %s ON CONFLICT DO NOTHING",
            users
        )
    
    # Migrate flights
    sqlite_cursor.execute("SELECT * FROM flights")
    flights = sqlite_cursor.fetchall()
    if flights:
        execute_values(
            pg_cursor,
            "INSERT INTO flights (id, origin, destination, departure_time, arrival_time, price, seats_available) VALUES %s ON CONFLICT DO NOTHING",
            flights
        )
    
    # Migrate bookings
    sqlite_cursor.execute("SELECT * FROM bookings")
    bookings = sqlite_cursor.fetchall()
    if bookings:
        execute_values(
            pg_cursor,
            "INSERT INTO bookings (id, user_id, flight_id, status, created_at) VALUES %s ON CONFLICT DO NOTHING",
            bookings
        )
    
    pg_conn.commit()
    print("Migration completed successfully!")
    
    sqlite_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    migrate_data()

# Made with Bob
