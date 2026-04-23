import { useState, useEffect } from 'react';
import type { Flight, SeatClass, Quote, Hold } from '../../types';
import { ADDONS_CATALOG } from '../../data/addOns';
import { Modal, Button } from '../common';
import {
  Plane,
  DollarSign,
  Crown,
  Rocket,
  Check,
  ArrowLeft,
  Tag,
  Timer,
  Zap,
} from 'lucide-react';
import { formatCurrency, formatDate, calculateDuration } from '../../utils/formatters';
import { createQuote, createHold, confirmHold, releaseHold } from '../../services/api';
import { storeHold, removeHold } from '../../utils/holdStorage';
import { useUser } from '../../hooks/useUser';
import toast from 'react-hot-toast';

type Step = 'select' | 'quote' | 'hold';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight | null;
  onSuccess: () => void;
}

export const BookingModal = ({ isOpen, onClose, flight, onSuccess }: BookingModalProps) => {
  const { user } = useUser();
  const [step, setStep] = useState<Step>('select');
  const [selectedClass, setSelectedClass] = useState<SeatClass>('economy');
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedClass('economy');
      setQuote(null);
      setHold(null);
      setTimeLeft(0);
      setSelectedAddons(new Set());
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!hold || step !== 'hold') return;

    const update = () => {
      const remaining = new Date(hold.reservedUntil).getTime() - Date.now();
      setTimeLeft(isNaN(remaining) ? 0 : Math.max(0, remaining));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [hold, step]);

  if (!flight) return null;

  const seatClasses = [
    {
      name: 'Economy',
      class: 'economy' as SeatClass,
      price: flight.economy_price,
      seats: flight.economy_seats_available,
      icon: Plane,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      features: ['Standard seating', 'In-flight entertainment', 'Complimentary snacks'],
    },
    {
      name: 'Business',
      class: 'business' as SeatClass,
      price: flight.business_price,
      seats: flight.business_seats_available,
      icon: Crown,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      features: ['Premium seating', 'Priority boarding', 'Gourmet meals', 'Extra legroom'],
    },
    {
      name: 'Galaxium Class',
      class: 'galaxium' as SeatClass,
      price: flight.galaxium_price,
      seats: flight.galaxium_seats_available,
      icon: Rocket,
      color: 'text-alien-green',
      bgColor: 'bg-alien-green/10',
      borderColor: 'border-alien-green/30',
      features: ['Luxury pods', 'VIP lounge access', 'Personal concierge', 'Zero-G experience'],
    },
  ];

  const selectedClassData = seatClasses.find((sc) => sc.class === selectedClass);
  const addonsTotal = Array.from(selectedAddons).reduce((sum, id) => {
    const addon = ADDONS_CATALOG.find((item) => item.id === id);
    return sum + (addon?.price || 0);
  }, 0);
  const totalWithAddons = (quote?.totalPrice || 0) + addonsTotal;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const timerDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = hold !== null && timeLeft === 0;

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((previous) => {
      const next = new Set(previous);
      if (next.has(addonId)) {
        next.delete(addonId);
      } else {
        next.add(addonId);
      }
      return next;
    });
  };

  const flightSummary = (
    <div className="glass-card p-4 bg-white/5">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-lg bg-cosmic-gradient">
          <Plane className="text-white" size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-star-white">
            {flight.origin} → {flight.destination}
          </h3>
          <p className="text-xs text-star-white/60">Flight #{flight.flight_id}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-star-white/60 mb-1">Departure</p>
          <p className="text-star-white font-medium">
            {formatDate(flight.departure_time, 'MMM dd')}
          </p>
        </div>
        <div>
          <p className="text-xs text-star-white/60 mb-1">Arrival</p>
          <p className="text-star-white font-medium">
            {formatDate(flight.arrival_time, 'MMM dd')}
          </p>
        </div>
        <div>
          <p className="text-xs text-star-white/60 mb-1">Duration</p>
          <p className="text-star-white font-medium">
            {calculateDuration(flight.departure_time, flight.arrival_time)}
          </p>
        </div>
      </div>
    </div>
  );

  const handleGetQuote = async () => {
    if (!user) {
      toast.error('Please sign in to get a quote');
      return;
    }

    setIsLoading(true);
    try {
      const newQuote = await createQuote({
        flightId: flight.flight_id,
        seatClass: selectedClass,
        quantity: 1,
        travelerId: user.user_id,
        travelerName: user.name,
      });
      setQuote(newQuote);
      setStep('quote');
    } catch {
      toast.error('Failed to get quote. Make sure the inventory service is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaceHold = async () => {
    if (!quote) return;

    setIsLoading(true);
    try {
      const newHold = await createHold(quote.quoteId);
      setHold(newHold);
      setStep('hold');

      if (user) {
        storeHold(user.user_id, {
          holdId: newHold.holdId,
          quoteId: quote.quoteId,
          flightId: flight.flight_id,
          seatClass: selectedClass,
          pricePerSeat: quote.pricePerSeat,
          totalPrice: quote.totalPrice,
          reservedUntil: newHold.reservedUntil,
        });
      }

      toast.success('Seat held! You have 15 minutes to confirm.');
    } catch {
      toast.error('Failed to place hold');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmHold = async () => {
    if (!hold || !user) return;

    setIsLoading(true);
    try {
      const confirmed = await confirmHold(hold.holdId, Array.from(selectedAddons));
      removeHold(user.user_id, hold.holdId);
      toast.success(
        `Booking confirmed! Reference: #${confirmed.externalBookingReference}`
      );
      onSuccess();
      onClose();
    } catch {
      toast.error('Failed to confirm booking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleaseHold = async () => {
    if (!hold || !user) return;

    setIsLoading(true);
    try {
      await releaseHold(hold.holdId);
      removeHold(user.user_id, hold.holdId);
      toast.success('Hold released');
      onClose();
    } catch {
      toast.error('Failed to release hold');
    } finally {
      setIsLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (step) {
      case 'select':
        return 'Book Your Flight';
      case 'quote':
        return 'Your Price Quote';
      case 'hold':
        return 'Seat Reserved';
    }
  };

  // Step 1: Seat class selection
  const renderSelectStep = () => (
    <div className="space-y-6">
      {flightSummary}

      <div>
        <h4 className="text-sm font-semibold text-star-white mb-3">Select Seat Class</h4>
        <div className="space-y-3">
          {seatClasses.map((sc) => {
            const Icon = sc.icon;
            const isSelected = selectedClass === sc.class;
            const isSoldOut = sc.seats === 0;

            return (
              <button
                key={sc.class}
                onClick={() => !isSoldOut && setSelectedClass(sc.class)}
                disabled={isSoldOut}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? `${sc.borderColor} ${sc.bgColor}`
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                } ${isSoldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={20} className={sc.color} />
                    <span className="font-semibold text-star-white">{sc.name}</span>
                    {isSelected && <Check size={18} className={sc.color} />}
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${sc.color}`}>
                      {formatCurrency(sc.price)}
                    </div>
                    <div className="text-xs text-star-white/60">
                      {isSoldOut ? 'Sold Out' : `${sc.seats} left`}
                    </div>
                  </div>
                </div>
                <ul className="text-xs text-star-white/70 space-y-1">
                  {sc.features.map((f, i) => (
                    <li key={i}>• {f}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>

      {user && (
        <div className="glass-card p-4 bg-white/5">
          <h4 className="text-sm font-semibold text-star-white mb-2">Passenger</h4>
          <p className="text-star-white">{user.name}</p>
          <p className="text-star-white/60 text-sm">{user.email}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleGetQuote} isLoading={isLoading} className="flex-1">
          Get Quote →
        </Button>
      </div>
    </div>
  );

  // Step 2: Quote review
  const renderQuoteStep = () => {
    const Icon = selectedClassData?.icon || Plane;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-cosmic-purple/10 border border-cosmic-purple/30">
          <Tag size={16} className="text-cosmic-purple" />
          <span className="text-xs text-star-white/60">Quote ID</span>
          <span className="font-mono font-bold text-cosmic-purple ml-auto">{quote?.quoteId}</span>
        </div>

        {flightSummary}

        <div className="glass-card p-4 bg-white/5 space-y-3">
          <h4 className="text-sm font-semibold text-star-white">Price Breakdown</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon size={16} className={selectedClassData?.color} />
              <span className="text-sm text-star-white/70">{selectedClassData?.name} × 1</span>
            </div>
            <span className="text-star-white font-medium">
              {formatCurrency(quote?.pricePerSeat || 0)}
            </span>
          </div>
          <div className="border-t border-white/10 pt-3 flex items-center justify-between">
            <span className="font-semibold text-star-white">Total</span>
            <span className="text-xl font-bold text-alien-green">
              {formatCurrency(quote?.totalPrice || 0)}
            </span>
          </div>
          <p className="text-xs text-star-white/50">
            Quote valid for 24 hours · Price calculated by inventory service
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setStep('select')}
            disabled={isLoading}
            className="flex-1"
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <Button onClick={handlePlaceHold} isLoading={isLoading} className="flex-1">
            <Timer size={16} /> Place Hold →
          </Button>
        </div>
      </div>
    );
  };

  // Step 3: Hold active with countdown
  const renderHoldStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-alien-green/10 border border-alien-green/30">
        <Zap size={16} className="text-alien-green" />
        <span className="text-xs text-star-white/60">Hold ID</span>
        <span className="font-mono font-bold text-alien-green ml-auto">{hold?.holdId}</span>
      </div>

      {/* Countdown timer */}
      <div
        className={`p-6 text-center rounded-xl border-2 ${
          isExpired
            ? 'border-red-500/50 bg-red-500/5'
            : 'border-solar-orange/50 bg-solar-orange/5'
        }`}
      >
        <p className="text-xs text-star-white/60 mb-2 uppercase tracking-widest">
          {isExpired ? 'Hold Expired' : 'Time to Confirm'}
        </p>
        <div
          className={`text-5xl font-mono font-bold tabular-nums ${
            isExpired ? 'text-red-500' : 'text-solar-orange'
          }`}
        >
          {isExpired ? 'EXPIRED' : timerDisplay}
        </div>
        {!isExpired && (
          <p className="text-xs text-star-white/50 mt-2">
            Seat is reserved — confirm before time runs out
          </p>
        )}
      </div>

      {flightSummary}

      <div className="glass-card p-4 bg-white/5">
        <h4 className="text-sm font-semibold text-star-white mb-3">
          ✨ Enhance Your Journey
        </h4>
        <div className="space-y-2">
          {ADDONS_CATALOG.map((addon) => (
            <label
              key={addon.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-white/10 hover:border-alien-green/30 hover:bg-white/5 cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                checked={selectedAddons.has(addon.id)}
                onChange={() => toggleAddon(addon.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{addon.icon}</span>
                  <span className="text-sm font-medium text-star-white">
                    {addon.name}
                  </span>
                  <span className="text-sm font-bold text-alien-green ml-auto">
                    {formatCurrency(addon.price)}
                  </span>
                </div>
                <p className="text-xs text-star-white/60">{addon.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
          <span className="text-sm text-star-white/70">Base Fare</span>
          <span className="text-star-white font-medium">
            {formatCurrency(quote?.totalPrice || 0)}
          </span>
        </div>
        {addonsTotal > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <span className="text-sm text-star-white/70">Add-ons</span>
            <span className="text-alien-green font-medium">
              +{formatCurrency(addonsTotal)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between p-4 rounded-xl bg-cosmic-gradient">
          <div className="flex items-center gap-2">
            <DollarSign className="text-white" size={20} />
            <span className="text-white font-semibold">Total</span>
          </div>
          <span className="text-xl font-bold text-white">
            {formatCurrency(totalWithAddons)}
          </span>
        </div>
      </div>

      {isExpired ? (
        <Button variant="secondary" onClick={onClose} className="w-full">
          Close
        </Button>
      ) : (
        <>
          <div className="flex gap-3">
            <Button
              variant="danger"
              onClick={handleReleaseHold}
              isLoading={isLoading}
              className="flex-1"
            >
              Release Hold
            </Button>
            <Button onClick={handleConfirmHold} isLoading={isLoading} className="flex-1">
              Confirm Booking
            </Button>
          </div>
          <p className="text-xs text-star-white/50 text-center">
            Closing keeps your hold active — find it in My Bookings
          </p>
        </>
      )}
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} size="md">
      {step === 'select' && renderSelectStep()}
      {step === 'quote' && renderQuoteStep()}
      {step === 'hold' && renderHoldStep()}
    </Modal>
  );
};

// Made with Bob
