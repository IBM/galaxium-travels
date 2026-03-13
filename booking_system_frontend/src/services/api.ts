import axios from 'axios';
import type {
  Flight,
  Booking,
  User,
  BookingRequest,
  UserRegistration,
  ErrorResponse,
} from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data) {
      // Backend returned an error response
      return Promise.reject(error.response.data);
    }
    // Network or other error
    return Promise.reject({
      success: false,
      error: 'Network error',
      error_code: 'NETWORK_ERROR',
      details: error.message,
    } as ErrorResponse);
  }
);

// ==================== Flight Endpoints ====================

/**
 * Flight filter parameters
 * Supports both main branch and feature branch filter styles
 */
export interface FlightFilters {
  // Basic filters from main branch
  origin?: string;
  destination?: string;
  departure_date_from?: string;
  departure_date_to?: string;
  min_price?: number;
  max_price?: number;
  has_economy?: boolean;
  has_business?: boolean;
  has_galaxium?: boolean;
  sort?: 'price' | 'departure_time' | 'duration';
  order?: 'asc' | 'desc';
  // Phase 1: Core Filters from feature branch
  sort_by?: 'departure_time' | 'base_price' | 'duration' | 'seats_available';
  sort_order?: 'asc' | 'desc';
  seat_class?: 'economy' | 'business' | 'galaxium';
  // Phase 2: Additional Filters from feature branch
  departure_time_period?: 'morning' | 'afternoon' | 'evening' | 'night';
  min_duration?: number;
  max_duration?: number;
  min_seats_available?: number;
  // Phase 3: Popular Routes from feature branch
  route_category?: 'inner_planets' | 'outer_planets' | 'moons';
}

/**
 * Get all available flights with optional filtering and sorting
 */
export const getFlights = async (filters?: FlightFilters): Promise<Flight[]> => {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
  }
  
  const queryString = params.toString();
  const url = queryString ? `/flights?${queryString}` : '/flights';
  
  const response = await api.get<Flight[]>(url);
  return response.data;
};

// ==================== User Endpoints ====================

/**
 * Register a new user
 */
export const registerUser = async (
  data: UserRegistration
): Promise<User | ErrorResponse> => {
  const response = await api.post<User | ErrorResponse>('/register', data);
  return response.data;
};

/**
 * Get user by name and email
 */
export const getUserByCredentials = async (
  name: string,
  email: string
): Promise<User | ErrorResponse> => {
  const response = await api.get<User | ErrorResponse>('/user', {
    params: { name, email },
  });
  return response.data;
};

// ==================== Booking Endpoints ====================

/**
 * Book a flight
 */
export const bookFlight = async (
  data: BookingRequest
): Promise<Booking | ErrorResponse> => {
  const response = await api.post<Booking | ErrorResponse>('/book', data);
  return response.data;
};

/**
 * Get all bookings for a user
 */
export const getUserBookings = async (userId: number): Promise<Booking[]> => {
  const response = await api.get<Booking[]>(`/bookings/${userId}`);
  return response.data;
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (
  bookingId: number
): Promise<Booking | ErrorResponse> => {
  const response = await api.post<Booking | ErrorResponse>(
    `/cancel/${bookingId}`
  );
  return response.data;
};

// ==================== Helper Functions ====================

/**
 * Check if response is an error
 */
export const isErrorResponse = (
  response: any
): response is ErrorResponse => {
  return response && response.success === false;
};

/**
 * Health check
 */
export const healthCheck = async (): Promise<{ status: string }> => {
  const response = await api.get<{ status: string }>('/');
  return response.data;
};

export default api;

// Made with Bob
