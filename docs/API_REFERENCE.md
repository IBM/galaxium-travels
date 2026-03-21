# Galaxium Travels - API Reference

Complete API documentation for the Galaxium Travels booking system.

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL](#base-url)
4. [Response Format](#response-format)
5. [Error Codes](#error-codes)
6. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Flights](#flights)
   - [Users](#users)
   - [Bookings](#bookings)
7. [MCP Tools](#mcp-tools)
8. [Rate Limiting](#rate-limiting)
9. [Examples](#examples)

---

## Overview

The Galaxium Travels API provides programmatic access to the interplanetary flight booking system. The API follows REST principles and returns JSON responses.

**API Version:** 1.0.0  
**Protocol:** HTTP/HTTPS  
**Format:** JSON

---

## Authentication

**Current Version:** No authentication required (development)

**Production Recommendation:**
```http
Authorization: Bearer <jwt_token>
```

---

## Base URL

**Development:**
```
http://localhost:8080
```

**Production:**
```
https://api.galaxium-travels.com
```

---

## Response Format

### Success Response

```json
{
  "field1": "value1",
  "field2": "value2"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Human-readable error message",
  "error_code": "MACHINE_READABLE_CODE",
  "details": "Additional context about the error"
}
```

---

## Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `FLIGHT_NOT_FOUND` | Flight does not exist | 200 |
| `NO_SEATS_AVAILABLE` | Flight is fully booked | 200 |
| `USER_NOT_FOUND` | User does not exist | 200 |
| `NAME_MISMATCH` | User ID exists but name doesn't match | 200 |
| `BOOKING_NOT_FOUND` | Booking does not exist | 200 |
| `ALREADY_CANCELLED` | Booking already cancelled | 200 |
| `EMAIL_EXISTS` | Email already registered | 200 |
| `NETWORK_ERROR` | Network or connection error | 500 |
| `VALIDATION_ERROR` | Input validation failed | 422 |

---

## Endpoints

### Health Check

#### GET /

Check if the API is running.

**Request:**
```http
GET / HTTP/1.1
Host: localhost:8080
```

**Response:**
```json
{
  "status": "OK"
}
```

**Status Codes:**
- `200 OK`: API is running

---

### Flights

#### GET /flights

List all available flights.

**Request:**
```http
GET /flights HTTP/1.1
Host: localhost:8080
```

**Response:**
```json
[
  {
    "flight_id": 1,
    "origin": "Earth",
    "destination": "Mars",
    "departure_time": "2026-04-15T10:00:00Z",
    "arrival_time": "2026-05-15T10:00:00Z",
    "price": 50000,
    "seats_available": 100
  },
  {
    "flight_id": 2,
    "origin": "Mars",
    "destination": "Jupiter",
    "departure_time": "2026-06-01T14:00:00Z",
    "arrival_time": "2026-08-01T14:00:00Z",
    "price": 120000,
    "seats_available": 50
  }
]
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `flight_id` | integer | Unique flight identifier |
| `origin` | string | Departure location |
| `destination` | string | Arrival location |
| `departure_time` | string | ISO 8601 datetime |
| `arrival_time` | string | ISO 8601 datetime |
| `price` | integer | Ticket price in credits |
| `seats_available` | integer | Available seats |

**Status Codes:**
- `200 OK`: Success

**Example:**
```bash
curl http://localhost:8080/flights
```

---

### Users

#### POST /register

Register a new user.

**Request:**
```http
POST /register HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | User's full name |
| `email` | string | Yes | Valid email address (unique) |

**Success Response:**
```json
{
  "user_id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Email already registered",
  "error_code": "EMAIL_EXISTS",
  "details": "Email 'john.doe@example.com' is already registered..."
}
```

**Status Codes:**
- `200 OK`: User created successfully
- `422 Unprocessable Entity`: Validation error

**Example:**
```bash
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john.doe@example.com"}'
```

---

#### GET /user

Get user information by name and email.

**Request:**
```http
GET /user?name=John%20Doe&email=john.doe@example.com HTTP/1.1
Host: localhost:8080
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | User's name |
| `email` | string | Yes | User's email |

**Success Response:**
```json
{
  "user_id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "User not found",
  "error_code": "USER_NOT_FOUND",
  "details": "User not found with name 'John Doe' and email 'john.doe@example.com'..."
}
```

**Status Codes:**
- `200 OK`: User found
- `422 Unprocessable Entity`: Validation error

**Example:**
```bash
curl "http://localhost:8080/user?name=John%20Doe&email=john.doe@example.com"
```

---

### Bookings

#### POST /book

Book a flight for a user.

**Request:**
```http
POST /book HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{
  "user_id": 1,
  "name": "John Doe",
  "flight_id": 1
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | integer | Yes | User's ID |
| `name` | string | Yes | User's name (must match user_id) |
| `flight_id` | integer | Yes | Flight to book |

**Success Response:**
```json
{
  "booking_id": 1,
  "user_id": 1,
  "flight_id": 1,
  "status": "booked",
  "booking_time": "2026-03-21T07:00:00Z"
}
```

**Error Responses:**

**Flight Not Found:**
```json
{
  "success": false,
  "error": "Flight not found",
  "error_code": "FLIGHT_NOT_FOUND",
  "details": "The specified flight_id 999 does not exist..."
}
```

**No Seats Available:**
```json
{
  "success": false,
  "error": "No seats available",
  "error_code": "NO_SEATS_AVAILABLE",
  "details": "The flight is fully booked..."
}
```

**User Not Found:**
```json
{
  "success": false,
  "error": "User not found",
  "error_code": "USER_NOT_FOUND",
  "details": "User with ID 999 is not registered..."
}
```

**Name Mismatch:**
```json
{
  "success": false,
  "error": "Name mismatch",
  "error_code": "NAME_MISMATCH",
  "details": "User ID 1 exists but the name 'Wrong Name' does not match..."
}
```

**Status Codes:**
- `200 OK`: Booking created or error response
- `422 Unprocessable Entity`: Validation error

**Side Effects:**
- Decrements `seats_available` by 1 for the flight

**Example:**
```bash
curl -X POST http://localhost:8080/book \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"name":"John Doe","flight_id":1}'
```

---

#### GET /bookings/{user_id}

Get all bookings for a specific user.

**Request:**
```http
GET /bookings/1 HTTP/1.1
Host: localhost:8080
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | integer | User's ID |

**Response:**
```json
[
  {
    "booking_id": 1,
    "user_id": 1,
    "flight_id": 1,
    "status": "booked",
    "booking_time": "2026-03-21T07:00:00Z"
  },
  {
    "booking_id": 2,
    "user_id": 1,
    "flight_id": 3,
    "status": "cancelled",
    "booking_time": "2026-03-20T15:30:00Z"
  }
]
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `booking_id` | integer | Unique booking identifier |
| `user_id` | integer | User who made the booking |
| `flight_id` | integer | Booked flight |
| `status` | string | "booked", "cancelled", or "completed" |
| `booking_time` | string | ISO 8601 datetime when booking was made |

**Status Codes:**
- `200 OK`: Success (returns empty array if no bookings)

**Example:**
```bash
curl http://localhost:8080/bookings/1
```

---

#### POST /cancel/{booking_id}

Cancel an existing booking.

**Request:**
```http
POST /cancel/1 HTTP/1.1
Host: localhost:8080
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `booking_id` | integer | Booking ID to cancel |

**Success Response:**
```json
{
  "booking_id": 1,
  "user_id": 1,
  "flight_id": 1,
  "status": "cancelled",
  "booking_time": "2026-03-21T07:00:00Z"
}
```

**Error Responses:**

**Booking Not Found:**
```json
{
  "success": false,
  "error": "Booking not found",
  "error_code": "BOOKING_NOT_FOUND",
  "details": "Booking with ID 999 not found..."
}
```

**Already Cancelled:**
```json
{
  "success": false,
  "error": "Booking already cancelled",
  "error_code": "ALREADY_CANCELLED",
  "details": "Booking 1 is already cancelled..."
}
```

**Status Codes:**
- `200 OK`: Booking cancelled or error response

**Side Effects:**
- Updates booking status to "cancelled"
- Increments `seats_available` by 1 for the flight

**Example:**
```bash
curl -X POST http://localhost:8080/cancel/1
```

---

## MCP Tools

The API also exposes MCP (Model Context Protocol) tools for AI agent integration.

**MCP Endpoint:** `http://localhost:8080/mcp`

### Available Tools

#### list_flights

List all available flights.

**Parameters:** None

**Returns:** `list[FlightOut]`

**Example:**
```json
{
  "tool": "list_flights",
  "arguments": {}
}
```

---

#### book_flight

Book a seat on a specific flight.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | integer | Yes | User's ID |
| `name` | string | Yes | User's name |
| `flight_id` | integer | Yes | Flight to book |

**Returns:** `BookingOut`

**Raises:** Exception on error

**Example:**
```json
{
  "tool": "book_flight",
  "arguments": {
    "user_id": 1,
    "name": "John Doe",
    "flight_id": 1
  }
}
```

---

#### get_bookings

Get all bookings for a user.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | integer | Yes | User's ID |

**Returns:** `list[BookingOut]`

**Example:**
```json
{
  "tool": "get_bookings",
  "arguments": {
    "user_id": 1
  }
}
```

---

#### cancel_booking

Cancel an existing booking.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `booking_id` | integer | Yes | Booking ID to cancel |

**Returns:** `BookingOut`

**Raises:** Exception on error

**Example:**
```json
{
  "tool": "cancel_booking",
  "arguments": {
    "booking_id": 1
  }
}
```

---

#### register_user

Register a new user.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | User's name |
| `email` | string | Yes | User's email |

**Returns:** `UserOut`

**Raises:** Exception on error

**Example:**
```json
{
  "tool": "register_user",
  "arguments": {
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

---

#### get_user_id

Get user information by name and email.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Yes | User's name |
| `email` | string | Yes | User's email |

**Returns:** `UserOut`

**Raises:** Exception on error

**Example:**
```json
{
  "tool": "get_user_id",
  "arguments": {
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

---

## Rate Limiting

**Current:** No rate limiting (development)

**Production Recommendation:**
- 100 requests per minute per IP
- 1000 requests per hour per user
- Burst allowance: 20 requests

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1679385600
```

---

## Examples

### Complete Booking Flow

```python
import requests

BASE_URL = "http://localhost:8080"

# 1. Register user
response = requests.post(
    f"{BASE_URL}/register",
    json={"name": "Jane Smith", "email": "jane@example.com"}
)
user = response.json()
print(f"User registered: {user['user_id']}")

# 2. Get available flights
response = requests.get(f"{BASE_URL}/flights")
flights = response.json()
print(f"Found {len(flights)} flights")

# 3. Book first available flight
flight = flights[0]
response = requests.post(
    f"{BASE_URL}/book",
    json={
        "user_id": user["user_id"],
        "name": user["name"],
        "flight_id": flight["flight_id"]
    }
)
booking = response.json()
print(f"Booking created: {booking['booking_id']}")

# 4. Get user's bookings
response = requests.get(f"{BASE_URL}/bookings/{user['user_id']}")
bookings = response.json()
print(f"User has {len(bookings)} bookings")

# 5. Cancel booking
response = requests.post(f"{BASE_URL}/cancel/{booking['booking_id']}")
cancelled = response.json()
print(f"Booking cancelled: {cancelled['status']}")
```

### JavaScript/TypeScript Example

```typescript
const BASE_URL = 'http://localhost:8080';

// Register user
const registerUser = async (name: string, email: string) => {
  const response = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email })
  });
  return response.json();
};

// Get flights
const getFlights = async () => {
  const response = await fetch(`${BASE_URL}/flights`);
  return response.json();
};

// Book flight
const bookFlight = async (userId: number, name: string, flightId: number) => {
  const response = await fetch(`${BASE_URL}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, name, flight_id: flightId })
  });
  return response.json();
};

// Usage
const user = await registerUser('Jane Smith', 'jane@example.com');
const flights = await getFlights();
const booking = await bookFlight(user.user_id, user.name, flights[0].flight_id);
```

### Error Handling Example

```python
import requests

def book_flight_safe(user_id: int, name: str, flight_id: int):
    """Book a flight with proper error handling."""
    try:
        response = requests.post(
            "http://localhost:8080/book",
            json={"user_id": user_id, "name": name, "flight_id": flight_id},
            timeout=10
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Check if it's an error response
        if isinstance(data, dict) and data.get('success') == False:
            error_code = data.get('error_code')
            
            if error_code == 'NO_SEATS_AVAILABLE':
                print("Flight is fully booked. Try another flight.")
            elif error_code == 'USER_NOT_FOUND':
                print("User not found. Please register first.")
            elif error_code == 'NAME_MISMATCH':
                print("Name doesn't match user ID.")
            else:
                print(f"Error: {data.get('error')}")
            
            return None
        
        return data
        
    except requests.exceptions.Timeout:
        print("Request timed out")
        return None
    except requests.exceptions.ConnectionError:
        print("Could not connect to server")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None
```

---

## Interactive Documentation

Visit the interactive API documentation:

- **Swagger UI:** http://localhost:8080/docs
- **ReDoc:** http://localhost:8080/redoc

These interfaces allow you to:
- Explore all endpoints
- Test API calls directly
- View request/response schemas
- Download OpenAPI specification

---

## Changelog

### Version 1.0.0 (2026-03-21)
- Initial API release
- REST endpoints for flights, users, and bookings
- MCP protocol support
- Comprehensive error handling

---

## Support

For API issues or questions:
- Check the [Developer Guide](DEVELOPER_GUIDE.md)
- Review the [Architecture Documentation](ARCHITECTURE.md)
- Open an issue on GitHub

---

**API Version:** 1.0.0  
**Last Updated:** 2026-03-21  
**Maintained By:** Galaxium Travels Development Team