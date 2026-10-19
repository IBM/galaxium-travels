"""Multi-leg route search for itineraries.

Pure functions only (no database or HTTP) so the routing rules can be
unit-tested with plain Flight objects.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from itertools import pairwise

from models import Flight

MAX_LEGS = 3
MIN_LAYOVER = timedelta(hours=2)
MAX_LAYOVER = timedelta(hours=72)
MAX_RESULTS = 10


def parse_time(value: str) -> datetime:
    """Parse a flight timestamp into a naive UTC datetime.

    Seed data uses ISO 8601 with a Z suffix ("2099-01-01T09:00:00Z"), while
    tests and older rows use "2099-01-01 09:00". Both must compare correctly.
    """
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _minutes(delta: timedelta) -> int:
    return int(delta.total_seconds() // 60)


def is_valid_connection(arriving: Flight, departing: Flight) -> bool:
    """Return True if a passenger can transfer from `arriving` to `departing`."""
    if arriving.destination.casefold() != departing.origin.casefold():
        return False
    layover = parse_time(departing.departure_time) - parse_time(arriving.arrival_time)
    return MIN_LAYOVER <= layover <= MAX_LAYOVER


@dataclass(frozen=True)
class Route:
    legs: tuple[Flight, ...]

    @property
    def total_minutes(self) -> int:
        return _minutes(parse_time(self.legs[-1].arrival_time) - parse_time(self.legs[0].departure_time))

    @property
    def total_price(self) -> int:
        return sum(f.base_price for f in self.legs)

    @property
    def layover_minutes(self) -> list[int]:
        return [
            _minutes(parse_time(b.departure_time) - parse_time(a.arrival_time))
            for a, b in pairwise(self.legs)
        ]


def find_routes(
    flights: Iterable[Flight], origin: str, destination: str, travel_date: date
) -> list[Route]:
    """Find routes of 1 to MAX_LEGS flights whose first leg departs on travel_date."""
    target = destination.casefold()
    by_origin: dict[str, list[Flight]] = {}
    for f in flights:
        if f.economy_seats_available > 0:
            by_origin.setdefault(f.origin.casefold(), []).append(f)

    routes: list[Route] = []

    def extend(path: list[Flight], visited: set[str]) -> None:
        last = path[-1]
        if last.destination.casefold() == target:
            routes.append(Route(tuple(path)))
            return
        if len(path) == MAX_LEGS:
            return
        for nxt in by_origin.get(last.destination.casefold(), []):
            stop = nxt.destination.casefold()
            if stop not in visited and is_valid_connection(last, nxt):
                extend([*path, nxt], visited | {stop})

    start = origin.casefold()
    for first in by_origin.get(start, []):
        stop = first.destination.casefold()
        if parse_time(first.departure_time).date() == travel_date and stop != start:
            extend([first], {start, stop})

    routes.sort(key=lambda r: (r.total_minutes, r.total_price))
    return routes[:MAX_RESULTS]
