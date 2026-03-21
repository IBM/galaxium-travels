// API Data Models matching backend schemas

// Seat class types
export type SeatClassName = 'economy' | 'business' | 'galaxium';

export interface SeatClassAvailability {
  price: number;
  seats_available: number;
  multiplier: number;
}

export interface SeatClassInfo {
  class_name: SeatClassName;
  display_name: string;
  price_multiplier: number;
  description: string;
  features: string[];
}

// Updated Flight interface with seat classes
export interface Flight {
  flight_id: number;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  base_price: number;
  seat_classes: {
    economy: SeatClassAvailability;
    business: SeatClassAvailability;
    galaxium: SeatClassAvailability;
  };
  total_seats_available: number;
  // Deprecated fields (for backward compatibility)
  price: number;
  seats_available: number;
}

// Updated Booking interface with seat class
export interface Booking {
  booking_id: number;
  user_id: number;
  flight_id: number;
  seat_class: SeatClassName;
  price_paid: number;
  status: 'booked' | 'cancelled' | 'completed';
  booking_time: string;
}

export interface User {
  user_id: number;
  name: string;
  email: string;
}

// Request/Response types
export interface BookingRequest {
  user_id: number;
  name: string;
  flight_id: number;
  seat_class: SeatClassName;
}

export interface UserRegistration {
  name: string;
  email: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  error_code: string;
  details?: string;
}

// Extended types for UI
export interface BookingWithFlight extends Booking {
  flight?: Flight;
}

export interface FlightFilters {
  origin?: string;
  destination?: string;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
}

// UI State types
export interface SelectedSeatClass {
  className: SeatClassName;
  price: number;
  seatsAvailable: number;
}

// User context type
export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

// Made with Bob
