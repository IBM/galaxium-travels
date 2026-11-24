import type { Flight, SeatClass } from '../types';
import { AVAILABILITY_COLOR } from '../solar/bodyStyle';
import { FEW_SEATS_THRESHOLD } from '../solar/flights';

interface SeatClassInfo {
  id: SeatClass;
  label: string;
  features: string[];
}

export const SEAT_CLASSES: readonly SeatClassInfo[] = [
  { id: 'economy', label: 'Economy', features: ['Standard seating', 'In-flight entertainment', 'Complimentary snacks'] },
  { id: 'business', label: 'Business', features: ['Premium seating', 'Priority boarding', 'Gourmet meals', 'Extra legroom'] },
  { id: 'galaxium', label: 'Galaxium', features: ['Luxury pods', 'VIP lounge access', 'Personal concierge', 'Zero-G experience'] },
];

export const seatClassLabel = (id: string): string => SEAT_CLASSES.find((c) => c.id === id)?.label ?? id;

export interface SeatOffer extends SeatClassInfo {
  price: number;
  seats: number;
}

/** The three cabin classes of a flight with their price and seats left. */
export const seatOffers = (flight: Flight): SeatOffer[] =>
  SEAT_CLASSES.map((c) => ({ ...c, price: flight[`${c.id}_price`], seats: flight[`${c.id}_seats_available`] }));

/**
 * Status colour for a seat count, the same three colours the solar map uses.
 * A whole flight is "few" at the map's threshold; a single cabin class only on its last seat,
 * because the smaller cabins start with three seats or fewer.
 */
export const seatColor = (seats: number, few: number = FEW_SEATS_THRESHOLD): string =>
  seats === 0 ? AVAILABILITY_COLOR.soldOut : seats <= few ? AVAILABILITY_COLOR.few : AVAILABILITY_COLOR.plenty;

export const classSeatText = (seats: number): string =>
  seats === 0 ? 'Sold out' : seats === 1 ? 'Last seat' : `${seats} seats`;
