"""Multi-leg itineraries: search, hold every leg, confirm into bookings."""

import logging
import os
from datetime import date, datetime, timedelta, timezone
from itertools import pairwise

from sqlalchemy.orm import Session

from models import Booking, Flight, Itinerary, ItineraryLeg, ItineraryStatus, User
from schemas import ErrorResponse, ItineraryLegOut, ItineraryOut, LegOut, RouteOut
from services.booking import cancel_booking
from services.hold_client import HoldClient, HoldError
from services.itinerary_search import MAX_LEGS, Route, find_routes, is_valid_connection

logger = logging.getLogger(__name__)

MAX_ACTIVE_HELD_ITINERARIES = 3
# Matches the Java hold service's HOLD_DURATION_MINUTES; older holds have expired there.
HOLD_DURATION = timedelta(minutes=int(os.getenv("HOLD_DURATION_MINUTES", "15")))


def _active_held_count(db: Session, user_id: int) -> int:
    cutoff = (datetime.now(tz=timezone.utc) - HOLD_DURATION).isoformat()
    return (
        db.query(Itinerary)
        .filter(
            Itinerary.user_id == user_id,
            Itinerary.status == ItineraryStatus.HELD.value,
            Itinerary.created_at >= cutoff,
        )
        .count()
    )


def _route_out(route: Route) -> RouteOut:
    return RouteOut(
        legs=[
            LegOut(
                flight_id=f.flight_id,
                origin=f.origin,
                destination=f.destination,
                departure_time=f.departure_time,
                arrival_time=f.arrival_time,
                price=f.base_price,
            )
            for f in route.legs
        ],
        total_minutes=route.total_minutes,
        total_price=route.total_price,
        layover_minutes=route.layover_minutes,
    )


def search(db: Session, origin: str, destination: str, travel_date: date) -> list[RouteOut] | ErrorResponse:
    """Find multi-leg routes whose first flight departs on travel_date."""
    origin, destination = origin.strip(), destination.strip()
    if origin.casefold() == destination.casefold():
        return ErrorResponse(
            error="Origin and destination are the same",
            error_code="SAME_ORIGIN_DESTINATION",
            details=f"Choose a destination other than '{origin}'.",
        )
    routes = find_routes(db.query(Flight).all(), origin, destination, travel_date)
    return [_route_out(r) for r in routes]


def to_out(db: Session, itinerary: Itinerary) -> ItineraryOut:
    legs = (
        db.query(ItineraryLeg, Flight)
        .join(Flight, Flight.flight_id == ItineraryLeg.flight_id)
        .filter(ItineraryLeg.itinerary_id == itinerary.itinerary_id)
        .order_by(ItineraryLeg.position)
        .all()
    )
    return ItineraryOut(
        itinerary_id=itinerary.itinerary_id,
        user_id=itinerary.user_id,
        status=itinerary.status,
        created_at=itinerary.created_at,
        total_price=itinerary.total_price,
        legs=[
            ItineraryLegOut(
                position=leg.position,
                flight_id=flight.flight_id,
                origin=flight.origin,
                destination=flight.destination,
                departure_time=flight.departure_time,
                arrival_time=flight.arrival_time,
                booking_id=leg.booking_id,
            )
            for leg, flight in legs
        ],
    )


def _release_all(holds: HoldClient, hold_ids: list[str]) -> None:
    for hold_id in hold_ids:
        try:
            holds.release(hold_id)
        except HoldError:
            # The hold service expires unreleased holds on its own.
            logger.warning("Could not release hold %s", hold_id)


def _validate_user(db: Session, user_id: int, name: str) -> User | ErrorResponse:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return ErrorResponse(
            error="User not found",
            error_code="USER_NOT_FOUND",
            details=f"User with ID {user_id} is not registered.",
        )
    if user.name != name:
        return ErrorResponse(
            error="Name mismatch",
            error_code="NAME_MISMATCH",
            details=f"The name '{name}' does not match user ID {user_id}.",
        )
    return user


def _validate_legs(db: Session, flight_ids: list[int]) -> list[Flight] | ErrorResponse:
    if not 1 <= len(flight_ids) <= MAX_LEGS:
        return ErrorResponse(
            error="Invalid number of legs",
            error_code="INVALID_LEG_COUNT",
            details=f"An itinerary has 1 to {MAX_LEGS} flights; got {len(flight_ids)}.",
        )
    found = {f.flight_id: f for f in db.query(Flight).filter(Flight.flight_id.in_(flight_ids))}
    missing = [i for i in flight_ids if i not in found]
    if missing:
        return ErrorResponse(
            error="Flight not found",
            error_code="FLIGHT_NOT_FOUND",
            details=f"Unknown flight IDs: {missing}.",
        )
    legs = [found[i] for i in flight_ids]
    for position, (a, b) in enumerate(pairwise(legs), start=1):
        if not is_valid_connection(a, b):
            return ErrorResponse(
                error="Flights do not connect",
                error_code="INVALID_CONNECTION",
                details=f"Leg {position} ({a.origin}→{a.destination}) does not connect to leg {position + 1} "
                        f"({b.origin}→{b.destination}). Layovers must be 2 to 72 hours at the same location.",
            )
    for f in legs:
        if f.economy_seats_available < 1:
            return ErrorResponse(
                error="No economy seats available",
                error_code="NO_SEATS_AVAILABLE",
                details=f"Flight {f.flight_id} ({f.origin}→{f.destination}) is sold out.",
            )
    return legs


def create_itinerary(
    db: Session,
    holds: HoldClient,
    user_id: int,
    name: str,
    flight_ids: list[int],
) -> ItineraryOut | ErrorResponse:
    """Hold every leg of a trip, all or nothing."""
    user = _validate_user(db, user_id, name)
    if isinstance(user, ErrorResponse):
        return user
    if _active_held_count(db, user.user_id) >= MAX_ACTIVE_HELD_ITINERARIES:
        return ErrorResponse(
            error="Too many held itineraries",
            error_code="TOO_MANY_HOLDS",
            details=f"Confirm or wait for your {MAX_ACTIVE_HELD_ITINERARIES} held itineraries to expire first.",
        )
    legs = _validate_legs(db, flight_ids)
    if isinstance(legs, ErrorResponse):
        return legs

    hold_ids: list[str] = []
    try:
        for f in legs:
            hold_ids.append(holds.create_hold(f.flight_id, user.user_id, user.name))
    except HoldError as e:
        _release_all(holds, hold_ids)
        return ErrorResponse(
            error="Could not hold every leg",
            error_code="HOLD_FAILED",
            details=str(e),
        )

    total_price = sum(f.base_price for f in legs)
    itinerary = Itinerary(
        user_id=user.user_id,
        status=ItineraryStatus.HELD.value,
        created_at=datetime.now(tz=timezone.utc).isoformat(),
        total_price=total_price,
    )
    db.add(itinerary)
    db.flush()
    for position, (f, hold_id) in enumerate(zip(legs, hold_ids, strict=True), start=1):
        db.add(ItineraryLeg(
            itinerary_id=itinerary.itinerary_id,
            position=position,
            flight_id=f.flight_id,
            hold_id=hold_id,
        ))
    db.commit()
    db.refresh(itinerary)
    return to_out(db, itinerary)


def confirm_itinerary(db: Session, holds: HoldClient, itinerary_id: int) -> ItineraryOut | ErrorResponse:
    """Confirm every held leg into a booking; undo all of them if any leg fails."""
    itinerary = db.query(Itinerary).filter(Itinerary.itinerary_id == itinerary_id).first()
    if not itinerary:
        return ErrorResponse(
            error="Itinerary not found",
            error_code="ITINERARY_NOT_FOUND",
            details=f"Itinerary {itinerary_id} does not exist.",
        )
    if itinerary.status != ItineraryStatus.HELD.value:
        return ErrorResponse(
            error="Itinerary cannot be confirmed",
            error_code="INVALID_STATUS",
            details=f"Itinerary {itinerary_id} is '{itinerary.status}'; only held itineraries can be confirmed.",
        )

    legs = (
        db.query(ItineraryLeg)
        .filter(ItineraryLeg.itinerary_id == itinerary_id)
        .order_by(ItineraryLeg.position)
        .all()
    )
    # Read every hold ID up front: the Java service writes bookings through a
    # separate session while we wait, so don't keep a write transaction open.
    hold_ids = [leg.hold_id for leg in legs]
    booking_ids: list[int] = []
    for index, hold_id in enumerate(hold_ids):
        try:
            booking_ids.append(holds.confirm(hold_id))
        except HoldError as e:
            _release_all(holds, hold_ids[index + 1:])
            for booking_id in booking_ids:
                cancel_booking(db, booking_id)
            itinerary.status = ItineraryStatus.FAILED.value
            db.commit()
            return ErrorResponse(
                error="Could not confirm every leg",
                error_code="CONFIRM_FAILED",
                details=f"Leg {index + 1}: {e}. Confirmed legs were cancelled.",
            )

    # Bookings were created in another session; drop cached state before linking them.
    db.expire_all()
    for leg, booking_id in zip(legs, booking_ids, strict=True):
        leg.booking_id = booking_id
        db.query(Booking).filter(Booking.booking_id == booking_id).update({"itinerary_id": itinerary_id})
    itinerary.status = ItineraryStatus.CONFIRMED.value
    db.commit()
    db.refresh(itinerary)
    return to_out(db, itinerary)


def list_itineraries(db: Session, user_id: int) -> list[ItineraryOut]:
    """Return a user's itineraries, newest first."""
    itineraries = (
        db.query(Itinerary)
        .filter(Itinerary.user_id == user_id)
        .order_by(Itinerary.itinerary_id.desc())
        .all()
    )
    return [to_out(db, i) for i in itineraries]
