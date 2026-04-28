import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plane, Calendar, Clock, MapPin, AlertCircle, Hash, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useUser } from '../hooks/useUser';
import { getUserBookings, getFlights } from '../services/api';
import { LoadingSpinner, Button } from '../components/common';
import { prepareQRData, getQRCodeOptions } from '../utils/qr';
import type { Booking, Flight } from '../types';

export const BoardingPass = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get booking reference from router state (only available immediately after confirmation)
  const bookingReference = location.state?.bookingReference as string | undefined;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/flights');
      return;
    }

    if (!bookingId) {
      setError('No booking ID provided');
      setIsLoading(false);
      return;
    }

    loadBoardingPassData();
  }, [user, bookingId, navigate]);

  const loadBoardingPassData = async () => {
    if (!user || !bookingId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Load user's bookings
      const bookings = await getUserBookings(user.user_id);
      
      // Find the matching booking
      const matchedBooking = bookings.find(
        (b) => b.booking_id === parseInt(bookingId, 10)
      );

      if (!matchedBooking) {
        setError('Booking not found');
        setIsLoading(false);
        return;
      }

      // Check if booking status is 'booked'
      if (matchedBooking.status !== 'booked') {
        setError('Boarding pass is only available for active bookings');
        setIsLoading(false);
        return;
      }

      setBooking(matchedBooking);

      // Load flights to get flight details
      const flights = await getFlights();
      const matchedFlight = flights.find(
        (f) => f.flight_id === matchedBooking.flight_id
      );

      if (!matchedFlight) {
        setError('Flight information not found');
        setIsLoading(false);
        return;
      }

      setFlight(matchedFlight);
    } catch (err: any) {
      console.error('Error loading boarding pass:', err);
      setError('Failed to load boarding pass. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getBoardingTime = (departureTime: string): string => {
    const departure = new Date(departureTime);
    const boarding = new Date(departure.getTime() - 45 * 60 * 1000); // 45 minutes before
    return formatTime(boarding.toISOString());
  };

  const getSeatClassDisplay = (seatClass: string): string => {
    return seatClass.charAt(0).toUpperCase() + seatClass.slice(1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading boarding pass..." />
      </div>
    );
  }

  // Error state
  if (error || !booking || !flight) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="glass-card p-12 text-center">
          <AlertCircle className="mx-auto mb-4 text-solar-orange" size={64} />
          <h2 className="text-2xl font-bold text-star-white mb-4">
            Boarding Pass Not Available
          </h2>
          <p className="text-star-white/70 mb-6">
            {error || 'Unable to load boarding pass'}
          </p>
          <Link to="/bookings">
            <Button>Return to My Bookings</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  // Main boarding pass display
  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          /* Hide navigation and non-essential elements */
          header, footer, nav, .no-print {
            display: none !important;
          }
          
          /* Optimize page layout for print */
          body {
            background: white !important;
          }
          
          /* Ensure boarding pass fits on one page */
          .boarding-pass-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Improve contrast for print */
          .glass-card {
            background: white !important;
            border: 2px solid #333 !important;
            box-shadow: none !important;
          }
          
          /* Make text darker for better print readability */
          .text-star-white {
            color: #000 !important;
          }
          
          .text-star-white\\/60,
          .text-star-white\\/70 {
            color: #666 !important;
          }
          
          .text-star-white\\/40,
          .text-star-white\\/50 {
            color: #999 !important;
          }
          
          /* Ensure QR code prints well */
          .qr-code-container {
            background: white !important;
            border: 1px solid #333 !important;
          }
          
          /* Hide action buttons in print */
          .print-hide {
            display: none !important;
          }
          
          /* Ensure proper page breaks */
          .boarding-pass-card {
            page-break-inside: avoid;
          }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto boarding-pass-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-star-white mb-2">
            <span className="bg-cosmic-gradient bg-clip-text text-transparent">
              Boarding Pass
            </span>
          </h1>
          <p className="text-star-white/70">
            Your journey to the stars awaits
          </p>
        </div>

        {/* Boarding Pass Card */}
        <div className="glass-card overflow-hidden boarding-pass-card">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-space-purple/20 to-space-blue/20 border-b border-star-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="text-alien-green" size={24} />
                  <h2 className="text-2xl font-bold text-star-white">
                    Galaxium Travels
                  </h2>
                </div>
                <p className="text-star-white/60 text-sm">Premium Space Transportation</p>
              </div>
              <div className="text-right">
                <Plane className="text-solar-orange mb-2" size={48} />
                <p className="text-xs text-star-white/40 font-mono">EST. 2099</p>
              </div>
            </div>
          </div>

          {/* Passenger Information */}
          <div className="p-6 border-b border-star-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-star-white/60 text-sm mb-1">Passenger Name</p>
                <p className="text-star-white text-xl font-semibold">{user?.name}</p>
              </div>
              <div>
                <p className="text-star-white/60 text-sm mb-1">Booking ID</p>
                <p className="text-star-white text-xl font-mono">#{String(booking.booking_id)}</p>
              </div>
            </div>
            
            {/* Show booking reference and QR code only when available from post-confirm flow */}
            {bookingReference && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-lg bg-alien-green/10 border border-alien-green/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash size={16} className="text-alien-green" />
                    <p className="text-star-white/60 text-sm">Booking Reference</p>
                  </div>
                  <p className="text-alien-green text-2xl font-bold font-mono">
                    {bookingReference}
                  </p>
                  <p className="text-star-white/40 text-xs mt-2">
                    Present this code at check-in
                  </p>
                </div>
                
                <div className="flex items-center justify-center p-4 rounded-lg bg-white/5 border border-star-white/10 qr-code-container">
                  <div className="bg-white p-3 rounded-lg qr-code-inner">
                    <QRCodeSVG
                      value={prepareQRData(bookingReference)}
                      {...getQRCodeOptions()}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Flight Information */}
          <div className="p-6 border-b border-star-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <p className="text-star-white/60 text-sm mb-1">From</p>
                <p className="text-star-white text-2xl font-bold">{flight.origin}</p>
              </div>
              <div className="px-4">
                <Plane className="text-space-blue rotate-90" size={32} />
              </div>
              <div className="flex-1 text-right">
                <p className="text-star-white/60 text-sm mb-1">To</p>
                <p className="text-star-white text-2xl font-bold">{flight.destination}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-star-white/60 text-sm mb-1 flex items-center gap-1">
                  <Calendar size={14} />
                  Date
                </p>
                <p className="text-star-white font-semibold">
                  {formatDate(flight.departure_time)}
                </p>
              </div>
              <div>
                <p className="text-star-white/60 text-sm mb-1 flex items-center gap-1">
                  <Clock size={14} />
                  Departure
                </p>
                <p className="text-star-white font-semibold">
                  {formatTime(flight.departure_time)}
                </p>
              </div>
              <div>
                <p className="text-star-white/60 text-sm mb-1 flex items-center gap-1">
                  <Clock size={14} />
                  Arrival
                </p>
                <p className="text-star-white font-semibold">
                  {formatTime(flight.arrival_time)}
                </p>
              </div>
              <div>
                <p className="text-star-white/60 text-sm mb-1">Flight</p>
                <p className="text-star-white font-semibold font-mono">
                  GT-{flight.flight_id}
                </p>
              </div>
            </div>
          </div>

          {/* Boarding & Seat Information */}
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-star-white/60 text-sm mb-1">Class</p>
                <p className="text-star-white text-lg font-semibold">
                  {getSeatClassDisplay(booking.seat_class)}
                </p>
              </div>
              <div>
                <p className="text-star-white/60 text-sm mb-1">Seat</p>
                <p className="text-star-white/50 text-sm italic">
                  Assigned at check-in
                </p>
              </div>
              <div>
                <p className="text-star-white/60 text-sm mb-1 flex items-center gap-1">
                  <Clock size={14} />
                  Boarding
                </p>
                <p className="text-star-white text-lg font-semibold">
                  {getBoardingTime(flight.departure_time)}
                </p>
              </div>
              <div>
                <p className="text-star-white/60 text-sm mb-1 flex items-center gap-1">
                  <MapPin size={14} />
                  Gate
                </p>
                <p className="text-star-white/50 text-sm italic">
                  Gate assignment pending
                </p>
              </div>
            </div>
          </div>

          {/* Decorative Barcode Strip */}
          <div className="border-t border-star-white/10 py-4 px-6">
            <div className="flex items-center justify-center gap-1 opacity-30">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-star-white"
                  style={{
                    width: '2px',
                    height: Math.random() > 0.5 ? '24px' : '16px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Footer Notice */}
          <div className="bg-space-purple/10 border-t border-star-white/10 p-4">
            <p className="text-star-white/60 text-xs text-center">
              Please arrive at the gate at least 30 minutes before boarding time.
              Valid government-issued ID required.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center print-hide">
          <Link to="/bookings">
            <Button variant="secondary">Back to My Bookings</Button>
          </Link>
          <Button onClick={() => window.print()}>Print Boarding Pass</Button>
        </div>
      </motion.div>
      </div>
    </>
  );
};

// Made with Bob