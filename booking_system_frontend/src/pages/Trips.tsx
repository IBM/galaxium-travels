import { useCallback, useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Button, Card, Input } from '../components/common';
import { TripTimeline } from '../components/itineraries/TripTimeline';
import { useUser } from '../hooks/useUserContext';
import {
  confirmItinerary,
  createItinerary,
  getUserItineraries,
  searchItineraries,
} from '../services/api';
import type { Itinerary, Route } from '../types';
import { formatCurrency, formatMinutes } from '../utils/formatters';

// The seed data's connecting flights depart on this date; see seed_connecting_flights().
const DEFAULT_DATE = '2099-02-01';

const errorMessage = (err: unknown, fallback: string): string => {
  const detail = (err as { detail?: { details?: string; error?: string } } | null)?.detail;
  return detail?.details ?? detail?.error ?? fallback;
};

export const Trips = () => {
  const { user } = useUser();
  const [origin, setOrigin] = useState('Earth');
  const [destination, setDestination] = useState('Europa');
  const [date, setDate] = useState(DEFAULT_DATE);
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [bookingIndex, setBookingIndex] = useState<number | null>(null);
  const [trips, setTrips] = useState<Itinerary[]>([]);

  const loadTrips = useCallback(async () => {
    if (!user) {
      setTrips([]);
      return;
    }
    try {
      setTrips(await getUserItineraries(user.user_id));
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to load your trips'));
    }
  }, [user]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setIsSearching(true);
    try {
      setRoutes(await searchItineraries({ origin, destination, date }));
    } catch (err) {
      setRoutes(null);
      toast.error(errorMessage(err, 'Search failed'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleBook = async (route: Route, index: number) => {
    if (!user) return;
    setBookingIndex(index);
    try {
      const held = await createItinerary({
        user_id: user.user_id,
        name: user.name,
        flight_ids: route.legs.map((leg) => leg.flight_id),
      });
      await confirmItinerary(held.itinerary_id);
      toast.success('Trip booked!');
      await loadTrips();
    } catch (err) {
      toast.error(errorMessage(err, 'Booking failed'));
    } finally {
      setBookingIndex(null);
    }
  };

  return (
    <div className="container mx-auto space-y-10 px-4 py-24">
      <section>
        <h1 className="mb-6 text-4xl font-bold text-star-white">Plan a multi-leg trip</h1>
        <Card>
          <form onSubmit={handleSearch} className="grid items-end gap-4 md:grid-cols-4">
            <Input label="From" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
            <Input label="To" value={destination} onChange={(e) => setDestination(e.target.value)} required />
            <Input
              label="Departure date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Button type="submit" isLoading={isSearching}>
              Search
            </Button>
          </form>
        </Card>
      </section>

      {routes !== null && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-star-white">
            {routes.length === 0
              ? 'No routes found'
              : `${routes.length} route${routes.length === 1 ? '' : 's'} found`}
          </h2>
          {routes.map((route, index) => (
            <Card key={route.legs.map((leg) => leg.flight_id).join('-')}>
              <TripTimeline legs={route.legs} />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <p className="text-star-white/80">
                  {route.legs.length} leg{route.legs.length === 1 ? '' : 's'} ·{' '}
                  {formatMinutes(route.total_minutes)} ·{' '}
                  <span className="font-semibold text-star-white">{formatCurrency(route.total_price)}</span>
                </p>
                <Button
                  onClick={() => handleBook(route, index)}
                  isLoading={bookingIndex === index}
                  disabled={!user || bookingIndex !== null}
                >
                  {user ? 'Book trip' : 'Sign in to book'}
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      {user && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-star-white">My trips</h2>
          {trips.length === 0 && <p className="text-star-white/60">You have no trips yet.</p>}
          {trips.map((trip) => (
            <Card key={trip.itinerary_id}>
              <div className="mb-4 flex justify-between text-sm text-star-white/70">
                <span>
                  Trip #{trip.itinerary_id} · {trip.status}
                </span>
                <span>{formatCurrency(trip.total_price)}</span>
              </div>
              <TripTimeline legs={trip.legs} />
            </Card>
          ))}
        </section>
      )}
    </div>
  );
};

// Made with Bob
