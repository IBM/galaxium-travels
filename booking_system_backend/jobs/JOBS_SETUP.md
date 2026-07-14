# Python Background Jobs — Setup & Run Guide

This document covers the two background jobs created for the **Galaxium Travels**
booking system backend, including setup, usage, and terminal output examples.

---

## Prerequisites

| Requirement | Detail |
|---|---|
| Python | Installed via `.venv` in `booking_system_backend/` |
| Working directory | `booking_system_backend/` |
| Database | `booking.db` must exist (created by `seed.py`) |

---

## Job 1 — `expired_bookings_cleanup.py`

### What it does
Scans the `bookings` table for any booking with `status = 'pending'` that was
created more than **24 hours ago** and marks it as `cancelled`.

### When to run
Run hourly via Task Scheduler or cron to keep stale bookings cleared.

### Run command
```powershell
# From booking_system_backend directory
.\.venv\Scripts\python.exe jobs/expired_bookings_cleanup.py
```

### Schedule (cron)
```
0 * * * * python /path/to/jobs/expired_bookings_cleanup.py
```

### Log file
```
jobs/logs/expired_bookings_cleanup.log
```

### Sample terminal output
```
2026-07-13 19:14:01  [INFO]  expired_bookings_cleanup - ============================================================
2026-07-13 19:14:01  [INFO]  expired_bookings_cleanup - Job started: expired_bookings_cleanup
2026-07-13 19:14:01  [INFO]  expired_bookings_cleanup - Cancelling pending bookings older than 24 hour(s)
2026-07-13 19:14:01  [INFO]  expired_bookings_cleanup - Cutoff timestamp (UTC): 2026-07-12 13:44:01
2026-07-13 19:14:01  [INFO]  expired_bookings_cleanup - Total pending bookings found: 0
2026-07-13 19:14:01  [INFO]  expired_bookings_cleanup - Expired pending bookings to cancel: 0
2026-07-13 19:14:01  [INFO]  expired_bookings_cleanup - Successfully cancelled 0 booking(s).
2026-07-13 19:14:01  [INFO]  expired_bookings_cleanup - Job finished: expired_bookings_cleanup
2026-07-13 19:14:01  [INFO]  expired_bookings_cleanup - ============================================================
```

### Configurable constant
| Constant | Default | Description |
|---|---|---|
| `EXPIRY_HOURS` | `24` | Hours after which a pending booking is considered expired |

---

## Job 2 — `low_seats_alert.py`

### What it does
Scans the `flights` table and logs a `WARNING` for every flight whose
`seats_available` count is below the configured threshold (default: **10**).

### When to run
Run daily (e.g. every morning) to monitor seat availability.

### Run command
```powershell
# From booking_system_backend directory
.\.venv\Scripts\python.exe jobs/low_seats_alert.py
```

### Schedule (cron)
```
0 6 * * * python /path/to/jobs/low_seats_alert.py
```

### Log file
```
jobs/logs/low_seats_alert.log
```

### Sample terminal output
```
2026-07-13 19:14:01  [INFO]  low_seats_alert - ============================================================
2026-07-13 19:14:01  [INFO]  low_seats_alert - Job started: low_seats_alert
2026-07-13 19:14:01  [INFO]  low_seats_alert - Checking flights with seats_available < 10
2026-07-13 19:14:01  [INFO]  low_seats_alert - Total flights in database: 10
2026-07-13 19:14:01  [WARNING]  low_seats_alert - ALERT: 10 flight(s) have fewer than 10 seats available.
2026-07-13 19:14:01  [WARNING]  low_seats_alert -   [LOW] Flight ID=1 | Earth -> Mars | Departure=2099-01-01T09:00:00Z | Seats left=5 | Price=1000000
2026-07-13 19:14:01  [WARNING]  low_seats_alert -   [LOW] Flight ID=2 | Earth -> Moon | Departure=2099-01-02T10:00:00Z | Seats left=3 | Price=500000
2026-07-13 19:14:01  [INFO]  low_seats_alert - Summary - Total: 10 | Low seats: 10 | OK: 0
2026-07-13 19:14:01  [INFO]  low_seats_alert - Job finished: low_seats_alert
2026-07-13 19:14:01  [INFO]  low_seats_alert - ============================================================
```

### Configurable constant
| Constant | Default | Description |
|---|---|---|
| `LOW_SEAT_THRESHOLD` | `10` | Flights with seats below this value are flagged |

---

## Run Both Jobs Together

```powershell
# From booking_system_backend directory
.\.venv\Scripts\python.exe jobs/expired_bookings_cleanup.py; .\.venv\Scripts\python.exe jobs/low_seats_alert.py
```

---

## Logging Details

Both jobs write logs to **two destinations simultaneously**:

| Destination | Location |
|---|---|
| Console (stdout) | Printed live in the terminal |
| Log file | `jobs/logs/<job_name>.log` |

Log format:
```
YYYY-MM-DD HH:MM:SS  [LEVEL]  job_name - message
```

Log levels used:
| Level | When used |
|---|---|
| `INFO` | Normal progress, start/finish, counts |
| `WARNING` | Low seat alerts, unrecognised data formats |
| `ERROR` / `EXCEPTION` | Unexpected failures (job exits with code 1) |

---

## File Structure

```
booking_system_backend/
  jobs/
    expired_bookings_cleanup.py   # Job 1
    low_seats_alert.py            # Job 2
    logs/
      expired_bookings_cleanup.log
      low_seats_alert.log
    JOBS_SETUP.md                 # This document
```

---

## npm PATH Fix (Windows)

If running in a terminal where `npm` is not recognised, refresh the PATH first:

```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","User") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","Machine")
```

This is a session-only fix. Opening a new terminal after the permanent PATH update
(done via `SetEnvironmentVariable` to `"User"` scope) will work automatically.
