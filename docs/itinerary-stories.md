<!-- STAND-IN: replace with the stories from the module 3 authoring run. -->
# Multi-leg itineraries: user stories

Travelers heading to the outer moons can book only one flight at a time today. These stories cover booking one trip that connects up to three flights.

Assumptions: economy seats only; travelers can't change a trip after they book it; travelers search by origin, destination, and departure date.

## 1. Search for connecting routes

As a traveler, I want to search for routes of up to three connecting flights, so that I can reach destinations with no direct flight.

Acceptance criteria:
- Given the seeded flight schedule, When a traveler searches Earth to Europa on 2099-02-01, Then the results include one route with three legs: Earth to Mars, Mars to Jupiter, and Jupiter to Europa.
- Given the seeded flight schedule, When a traveler searches Earth to Mars on 2099-02-01, Then the direct flight is listed first, followed by the two-leg route via Moon, because results are sorted by total travel time.
- Given the seeded flight schedule, When a traveler searches "earth" to "EUROPA", Then the results match a search for "Earth" to "Europa".
- Given any schedule, When a traveler searches Earth to Earth, Then the search returns an error that says origin and destination are the same.

## 2. Only offer connections I can make

As a traveler, I want every connection to leave enough time but not strand me, so that I don't miss a flight or wait for days.

Acceptance criteria:
- Given two flights with a layover of exactly 2 hours or exactly 72 hours, When a traveler searches across them, Then the connection is offered.
- Given two flights with a layover of 1 hour 59 minutes or 72 hours 1 minute, When a traveler searches across them, Then the connection is not offered.
- Given a schedule with loops and sold-out flights, When a traveler searches, Then no route visits the same place twice and no route includes a leg with no economy seats left.

## 3. Book the whole trip or nothing

As a traveler, I want to book every leg of a trip in one step, so that I never end up holding half a trip.

Acceptance criteria:
- Given the Earth to Europa route on 2099-02-01 has seats on every leg, When a traveler books it, Then all three legs are held and the trip's status is held.
- Given the third leg of a route can't be held, When a traveler books the route, Then the first two holds are released and no trip is saved.
- Given a held trip whose second leg fails to confirm, When the trip is confirmed, Then the confirmed first leg is cancelled, its seat is returned, and the trip's status is failed.

## 4. See my trips

As a traveler, I want to see the trips I booked, so that I can check my itinerary.

Acceptance criteria:
- Given a traveler booked the Earth to Europa route, When they open My trips, Then the trip is listed with status confirmed and all three legs in order.
- Given several travelers have booked trips, When a traveler opens My trips, Then they see only their own trips, newest first.

## Out of scope

- Changing or cancelling a booked trip
- Seat classes other than economy
- Round-trip search
