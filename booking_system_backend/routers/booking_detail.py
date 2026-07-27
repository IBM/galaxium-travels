"""
Router: GET /bookings/{booking_id}

Returns a single booking record to the authenticated caller.

Security contract
-----------------
* Caller identity is established via the X-User-Email request header.
* The header must be a well-formed email address (RFC 5322 / Pydantic EmailStr).
* Missing or malformed header  -> HTTP 401  (generic message)
* Booking not found            -> HTTP 404
* Booking owned by other user  -> HTTP 403
* Any unexpected server error  -> HTTP 500  (generic body; detail logged server-side only)

Logging
-------
Structured JSON log entries are emitted for every access attempt.
The caller's email address is NEVER written to logs; a 12-character
SHA-256 hex prefix is used as a pseudonymous correlation token instead.
"""

import hashlib
import logging
import sys
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Path
from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy.orm import Session

from db import get_db
from models import Booking, User
from schemas import BookingOut

# ---------------------------------------------------------------------------
# Structured JSON logging
# ---------------------------------------------------------------------------

class _JsonFormatter(logging.Formatter):
    """Emit each log record as a single-line JSON object."""

    def format(self, record: logging.LogRecord) -> str:
        import json as _json

        payload: dict = {
            "level": record.levelname,
            "logger": record.name,
            "message": self.formatMessage(record),
        }
        # Promote any extra= keys to top-level fields
        for key, value in record.__dict__.items():
            if key not in (
                "name", "msg", "args", "levelname", "levelno", "pathname",
                "filename", "module", "exc_info", "exc_text", "stack_info",
                "lineno", "funcName", "created", "msecs", "relativeCreated",
                "thread", "threadName", "processName", "process", "message",
                "taskName",
            ):
                payload[key] = value

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)

        return _json.dumps(payload, default=str)


def _build_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(_JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        logger.propagate = False
    return logger


log = _build_logger("routers.booking_detail")

# ---------------------------------------------------------------------------
# Email masking (for logs — never log raw PII)
# ---------------------------------------------------------------------------

def _mask_email(email: str) -> str:
    """Return a 12-character SHA-256 hex prefix of the email.

    Deterministic and pseudonymous: callers can correlate log entries for the
    same address, but the raw email cannot be reconstructed from the token.
    """
    return hashlib.sha256(email.encode("utf-8")).hexdigest()[:12]


# ---------------------------------------------------------------------------
# Caller-identity dependency
# ---------------------------------------------------------------------------

_email_adapter: TypeAdapter = TypeAdapter(EmailStr)


def _require_caller_email(
    x_user_email: Optional[str] = Header(default=None, alias="X-User-Email"),
) -> str:
    """Validate the X-User-Email header and return the normalised email string.

    Raises HTTP 401 (generic message) when the header is absent or not a
    well-formed email address.  The raw header value is never logged.
    """
    if not x_user_email:
        log.warning(
            "Authentication required — missing X-User-Email header",
            extra={"event": "auth_missing_header"},
        )
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    try:
        validated: str = _email_adapter.validate_python(x_user_email)
    except ValidationError:
        log.warning(
            "Authentication required — malformed X-User-Email header",
            extra={"event": "auth_invalid_header"},
        )
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    return validated


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(tags=["Bookings"])


@router.get(
    "/bookings/{booking_id}",
    response_model=BookingOut,
    summary="Get a single booking by ID",
    description=(
        "Returns the booking record identified by booking_id. "
        "The caller must supply a valid X-User-Email header that matches "
        "the email address of the user who owns the booking."
    ),
)
def get_booking_detail(
    booking_id: int = Path(..., gt=0, description="Positive integer booking identifier"),
    caller_email: str = Depends(_require_caller_email),
    db: Session = Depends(get_db),
) -> BookingOut:
    """Return a single booking, enforcing caller ownership."""

    caller_token = _mask_email(caller_email)

    log.info(
        "Booking detail access attempt",
        extra={
            "event": "booking_detail_request",
            "booking_id": booking_id,
            "caller_token": caller_token,
        },
    )

    try:
        # --- Fetch booking (parameterized ORM query — no raw SQL) -----------
        booking: Optional[Booking] = (
            db.query(Booking).filter(Booking.booking_id == booking_id).first()
        )

        if booking is None:
            log.info(
                "Booking not found",
                extra={
                    "event": "booking_not_found",
                    "booking_id": booking_id,
                    "caller_token": caller_token,
                },
            )
            raise HTTPException(status_code=404, detail="Booking not found.")

        # --- Resolve caller identity (parameterized ORM query) --------------
        caller_user: Optional[User] = (
            db.query(User).filter(User.email == caller_email).first()
        )

        # Unknown email: treat as forbidden (do not reveal booking existence
        # to a caller who cannot be identified in the system)
        if caller_user is None:
            log.warning(
                "Access denied — caller email not registered",
                extra={
                    "event": "booking_access_denied",
                    "reason": "unknown_caller",
                    "booking_id": booking_id,
                    "caller_token": caller_token,
                },
            )
            raise HTTPException(status_code=403, detail="Access denied.")

        # --- Ownership check ------------------------------------------------
        if booking.user_id != caller_user.user_id:
            log.warning(
                "Access denied — booking belongs to a different user",
                extra={
                    "event": "booking_access_denied",
                    "reason": "ownership_mismatch",
                    "booking_id": booking_id,
                    "caller_token": caller_token,
                },
            )
            raise HTTPException(status_code=403, detail="Access denied.")

        log.info(
            "Booking detail returned successfully",
            extra={
                "event": "booking_detail_success",
                "booking_id": booking_id,
                "caller_token": caller_token,
            },
        )
        return BookingOut.model_validate(booking)

    except HTTPException:
        # Re-raise FastAPI exceptions untouched — they already carry safe messages
        raise

    except Exception:
        # Catch-all: log full traceback server-side, return generic body
        log.exception(
            "Unexpected error in get_booking_detail",
            extra={
                "event": "booking_detail_error",
                "booking_id": booking_id,
                "caller_token": caller_token,
            },
        )
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred. Please try again later.",
        )
