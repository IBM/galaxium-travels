"""
Database Configuration Module
WARNING: Contains hardcoded credentials - SECURITY VULNERABILITY
This is intentional for demonstration purposes
"""

import sqlite3

# SECURITY RISK: Hardcoded database credentials
# In a real application, these should be in environment variables
DB_HOST = "localhost"
DB_PORT = 5432
DB_NAME = "inventory_db"
DB_USER = "admin"
DB_PASSWORD = "SuperSecret123!"  # NEVER hardcode passwords!

# SQLite configuration for demo purposes
SQLITE_DB_PATH = "inventory.db"

def get_db_connection():
    """
    Establishes a connection to the SQLite database
    
    Returns:
        sqlite3.Connection: Database connection object
    """
    # Using SQLite for simplicity in this demo
    # In production, this would connect to PostgreSQL/MySQL with the credentials above
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_postgres_connection():
    """
    Legacy function for PostgreSQL connection
    DEPRECATED: Not used in current implementation
    Contains hardcoded credentials - SECURITY RISK
    """
    import psycopg2
    
    # SECURITY VULNERABILITY: Hardcoded credentials
    connection_string = f"host={DB_HOST} port={DB_PORT} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"
    
    try:
        conn = psycopg2.connect(connection_string)
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        return None

# Additional configuration
DEBUG_MODE = True  # Should be False in production
LOG_QUERIES = True  # Logs all SQL queries - potential security risk

# Made with Bob
