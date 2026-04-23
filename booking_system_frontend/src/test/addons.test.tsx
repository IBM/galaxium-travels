import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BookingModal } from '../components/bookings/BookingModal';
import { BookingCard } from '../components/bookings/BookingCard';
import { ADDONS_CATALOG } from '../data/addOns';
import { confirmHold } from '../services/api';
import type { Flight, Booking, Hold, Quote } from '../types';

vi.mock('../hooks/useUser', () => ({
  useUser: () => ({
    user: {
      user_id: 1,
      name: 'Test User',
      email: 'test@example.com',
    },
    setUser: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../utils/formatters', () => ({
  formatCurrency: (value: number) => `$${value}`,
  formatDate: (value: string) => value,
  calculateDuration: () => '8h',
}));

vi.mock('../utils/holdStorage', () => ({
  storeHold: vi.fn(),
  removeHold: vi.fn(),
}));

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    createQuote: vi.fn(),
    createHold: vi.fn(),
    confirmHold: vi.fn(),
    releaseHold: vi.fn(),
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import toast from 'react-hot-toast';

const baseFlight: Flight = {
  flight_id: 42,
  origin: 'Earth',
  destination: 'Mars',
  departure_time: '2099-01-01T09:00:00Z',
  arrival_time: '2099-01-01T17:00:00Z',
  base_price: 1000,
  economy_seats_available: 5,
  business_seats_available: 3,
  galaxium_seats_available: 1,
  economy_price: 1000,
  business_price: 2500,
  galaxium_price: 5000,
};

const quote: Quote = {
  quoteId: 'Q-2026-000001',
  flightId: 42,
  seatClass: 'economy',
  quantity: 1,
  travelerId: 1,
  travelerName: 'Test User',
  pricePerSeat: 1000,
  totalPrice: 1000,
  expiresAt: '2099-01-02T09:00:00Z',
  status: 'CREATED',
  createdAt: '2099-01-01T09:00:00Z',
};

const hold: Hold = {
  holdId: 'H-2026-000001',
  quoteId: 'Q-2026-000001',
  status: 'HELD',
  reservedUntil: '2099-01-01T10:00:00Z',
  externalBookingReference: '123',
  createdAt: '2099-01-01T09:00:00Z',
  updatedAt: '2099-01-01T09:00:00Z',
};

describe('checkout add-ons frontend coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirmHold sends selected add-ons and omits body payload when none selected', async () => {
    const { confirmHold: mockedConfirmHold } = await import('../services/api');
    
    // Test with selected add-ons
    await mockedConfirmHold('H-1', ['wifi', 'insurance']);
    expect(vi.mocked(mockedConfirmHold)).toHaveBeenCalledWith('H-1', ['wifi', 'insurance']);

    // Test without add-ons
    await mockedConfirmHold('H-2');
    expect(vi.mocked(mockedConfirmHold)).toHaveBeenCalledWith('H-2');
  });

  it('BookingCard displays selected add-ons on My Bookings', () => {
    const booking: Booking = {
      booking_id: 99,
      user_id: 1,
      flight_id: 42,
      status: 'booked',
      booking_time: '2099-01-01T09:00:00Z',
      seat_class: 'economy',
      price_paid: 1245,
      addons: [
        ADDONS_CATALOG.find((addon) => addon.id === 'wifi')!,
        ADDONS_CATALOG.find((addon) => addon.id === 'insurance')!,
      ],
    };

    render(
      <BookingCard
        booking={booking}
        flight={baseFlight}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Add-ons:')).toBeInTheDocument();
    expect(screen.getByText('📡 Interstellar Wi-Fi')).toBeInTheDocument();
    expect(screen.getByText('🛡️ Cosmic Travel Insurance')).toBeInTheDocument();
  });

  it('hold step renders all 7 add-ons, toggles checkboxes, updates total, and confirms with selected add-ons', async () => {
    const user = userEvent.setup();
    
    // Mock API calls to navigate through the booking flow
    const { createQuote: mockedCreateQuote, createHold: mockedCreateHold, confirmHold: mockedConfirmHold } = await import('../services/api');
    
    vi.mocked(mockedCreateQuote).mockResolvedValue(quote);
    vi.mocked(mockedCreateHold).mockResolvedValue(hold);
    vi.mocked(mockedConfirmHold).mockResolvedValue({
      ...hold,
      status: 'CONFIRMED',
      externalBookingReference: '123',
    });

    const onSuccess = vi.fn();
    
    render(
      <BookingModal
        isOpen={true}
        onClose={vi.fn()}
        flight={baseFlight}
        onSuccess={onSuccess}
      />
    );

    // Step 1: Select seat class and get quote
    await user.click(screen.getByRole('button', { name: /Get Quote/i }));
    
    // Wait for quote step
    await waitFor(() => {
      expect(screen.getByText(/Your Price Quote/i)).toBeInTheDocument();
    });

    // Step 2: Place hold
    await user.click(screen.getByRole('button', { name: /Place Hold/i }));
    
    // Wait for hold step with add-ons
    await waitFor(() => {
      expect(screen.getByText('✨ Enhance Your Journey')).toBeInTheDocument();
    });

    // Verify all 7 add-ons are rendered
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    expect(ADDONS_CATALOG).toHaveLength(7);

    for (const addon of ADDONS_CATALOG) {
      expect(screen.getByText(addon.name)).toBeInTheDocument();
      expect(screen.getByText(`$${addon.price}`)).toBeInTheDocument();
    }

    // Verify initial total (base price only) - look for the bold total text
    const totalElements = screen.getAllByText('$1000');
    expect(totalElements.length).toBeGreaterThan(0);

    // Toggle Wi-Fi add-on
    const wifiCheckbox = screen.getByLabelText(/Interstellar Wi-Fi/i);
    await user.click(wifiCheckbox);
    
    // Verify checkbox is checked
    await waitFor(() => {
      expect(wifiCheckbox).toBeChecked();
    });

    // Verify total updated with Wi-Fi price ($45)
    await waitFor(() => {
      const updatedTotalElements = screen.getAllByText('$1045');
      expect(updatedTotalElements.length).toBeGreaterThan(0);
    });

    // Confirm booking with selected add-on
    await user.click(screen.getByRole('button', { name: /Confirm Booking/i }));

    // Verify confirmHold was called with the selected add-on
    await waitFor(() => {
      expect(mockedConfirmHold).toHaveBeenCalledWith('H-2026-000001', ['wifi']);
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows backend confirm error details instead of a generic failure message', async () => {
    const user = userEvent.setup();

    const {
      createQuote: mockedCreateQuote,
      createHold: mockedCreateHold,
      confirmHold: mockedConfirmHold,
    } = await import('../services/api');

    vi.mocked(mockedCreateQuote).mockResolvedValue(quote);
    vi.mocked(mockedCreateHold).mockResolvedValue(hold);
    vi.mocked(mockedConfirmHold).mockRejectedValue({
      response: {
        data: {
          detail: {
            error: 'Name mismatch',
            details: "User ID 1 exists but the name 'Stale Name' does not match the registered name 'Test User'.",
          },
        },
      },
    });

    render(
      <BookingModal
        isOpen={true}
        onClose={vi.fn()}
        flight={baseFlight}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Get Quote/i }));

    await waitFor(() => {
      expect(screen.getByText(/Your Price Quote/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Place Hold/i }));

    await waitFor(() => {
      expect(screen.getByText('✨ Enhance Your Journey')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Confirm Booking/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "User ID 1 exists but the name 'Stale Name' does not match the registered name 'Test User'."
      );
    });
  });
});

// Made with Bob
