import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import type { Flight, SeatClass, Quote, Hold } from '../../types';
import { Modal, Button, PlanetOrb } from '../common';
import { HoldRing } from './HoldRing';
import { formatCurrency, formatDate, calculateDuration } from '../../utils/formatters';
import { classSeatText, seatColor, seatOffers } from '../../utils/seatClasses';
import { createQuote, createHold, confirmHold, releaseHold } from '../../services/api';
import { storeHold, removeHold } from '../../utils/holdStorage';
import { useCountdown } from '../../hooks/useCountdown';
import { useUser } from '../../hooks/useUserContext';
import toast from 'react-hot-toast';

type Step = 'select' | 'quote' | 'hold';

const STEPS: { id: Step; label: string; title: string }[] = [
  { id: 'select', label: 'Class', title: 'Choose a cabin class' },
  { id: 'quote', label: 'Quote', title: 'Your quote' },
  { id: 'hold', label: 'Hold · 15 min', title: 'Seat held' },
];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  flight: Flight | null;
  /** Class preselected when the modal opens, e.g. the one picked on the departure board. */
  initialClass?: SeatClass;
  onSuccess: () => void;
}

export const BookingModal = ({ isOpen, onClose, flight, initialClass = 'economy', onSuccess }: BookingModalProps) => {
  const { user } = useUser();
  const [step, setStep] = useState<Step>('select');
  const [selectedClass, setSelectedClass] = useState<SeatClass>(initialClass);
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const timeLeft = useCountdown(hold?.reservedUntil);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedClass(initialClass);
      setQuote(null);
      setHold(null);
    }
  }, [isOpen, initialClass]);

  if (!flight) return null;

  const offers = seatOffers(flight);
  const selected = offers.find((offer) => offer.id === selectedClass) ?? offers[0];
  const isExpired = hold !== null && timeLeft === 0;
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  // The quote from the hold service is the price of record once it exists.
  const total = quote?.totalPrice ?? selected.price;

  const stepper = (
    <ol className="flex items-center gap-3">
      {STEPS.map((s, index) => (
        <li key={s.id} className={clsx('flex items-center gap-3', index > 0 && 'flex-1')} aria-current={index === stepIndex ? 'step' : undefined}>
          {index > 0 && <span className={clsx('h-px flex-1', index <= stepIndex ? 'bg-white/40' : 'bg-white/10')} aria-hidden />}
          <span className={clsx('flex items-center gap-2 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.22em]', index <= stepIndex ? 'text-star-white' : 'text-star-white/35')}>
            {index === stepIndex && <span className="h-1.5 w-1.5 rounded-full bg-star-white shadow-[0_0_10px_#fff]" aria-hidden />}
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );

  const flightSummary = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <PlanetOrb name={flight.destination} size={44} />
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-star-white">
            {flight.origin} <span className="text-star-white/40">→</span> {flight.destination}
          </h3>
          <p className="font-mono text-xs text-star-white/55">
            {formatDate(flight.departure_time, 'dd MMM yyyy · HH:mm')} · {calculateDuration(flight.departure_time, flight.arrival_time)} transit
          </p>
        </div>
      </div>
      {user && <p className="eyebrow">Passenger · {user.name}</p>}
    </div>
  );

  /** Total on the left, this step's actions on the right. Shown on every step. */
  const footer = (label: string, actions: ReactNode) => (
    <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-5">
      <div>
        <p className="eyebrow mb-1.5">{label}</p>
        <p className="font-mono text-3xl font-medium leading-none tabular-nums">{formatCurrency(total)}</p>
      </div>
      <div className="flex items-center gap-4">{actions}</div>
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
      const confirmed = await confirmHold(hold.holdId);
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

  // Step 1: Seat class selection
  const renderSelectStep = () => (
    <>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Cabin class">
        {offers.map((offer) => {
          const isSelected = selectedClass === offer.id;
          return (
            <button
              key={offer.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedClass(offer.id)}
              disabled={offer.seats === 0}
              className={clsx(
                'flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                isSelected ? 'border-star-white bg-white/[0.07] ring-1 ring-inset ring-star-white' : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              )}
            >
              <span className="eyebrow">{offer.label}</span>
              <span className="font-mono text-lg font-medium">{formatCurrency(offer.price)}</span>
              <ul className="flex-1 space-y-0.5 text-xs text-star-white/55">
                {offer.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <span className="mt-1 flex items-center gap-2 text-xs text-star-white/55">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: seatColor(offer.seats, 1), boxShadow: `0 0 8px ${seatColor(offer.seats, 1)}` }} />
                {classSeatText(offer.seats)}
              </span>
            </button>
          );
        })}
      </div>

      {footer(
        'Total · 1 seat',
        <>
          <Button variant="link" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGetQuote} isLoading={isLoading} disabled={selected.seats === 0}>
            Get quote
          </Button>
        </>
      )}
    </>
  );

  // Step 2: Quote review
  const renderQuoteStep = () => (
    <>
      <dl className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/[0.03] text-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-star-white/55">{selected.label} × 1</dt>
          <dd className="font-mono">{formatCurrency(quote?.pricePerSeat || 0)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-star-white/55">Quote ID</dt>
          <dd className="truncate font-mono text-xs text-star-white/70">{quote?.quoteId}</dd>
        </div>
      </dl>
      <p className="text-xs text-star-white/40">Quote valid for 24 hours · Price calculated by inventory service</p>

      {footer(
        'Quoted total',
        <>
          <Button variant="link" onClick={() => setStep('select')} disabled={isLoading}>
            <ArrowLeft size={13} /> Back
          </Button>
          <Button onClick={handlePlaceHold} isLoading={isLoading}>
            Place hold
          </Button>
        </>
      )}
    </>
  );

  // Step 3: Hold active with countdown
  const renderHoldStep = () => (
    <>
      <div className="flex items-center gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <HoldRing msLeft={timeLeft} size={104} />
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">{isExpired ? 'Hold expired' : 'Time to confirm'}</p>
          <p className="text-sm text-star-white/70">
            {isExpired
              ? 'The seat has gone back on sale. Start again to get a new quote.'
              : `Your ${selected.label} seat is reserved. Confirm before the ring runs out.`}
          </p>
          <p className="mt-2 truncate font-mono text-[11px] text-star-white/40">Hold {hold?.holdId}</p>
        </div>
      </div>

      {footer(
        'Total',
        isExpired ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="link" onClick={handleReleaseHold} disabled={isLoading}>
              Release hold
            </Button>
            <Button onClick={handleConfirmHold} isLoading={isLoading}>
              Confirm booking
            </Button>
          </>
        )
      )}
      {!isExpired && <p className="text-right text-xs text-star-white/40">Closing keeps your hold active. Find it in My Bookings.</p>}
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={STEPS[stepIndex].title} size="md">
      <div className="space-y-6">
        {stepper}
        {flightSummary}
        {step === 'select' && renderSelectStep()}
        {step === 'quote' && renderQuoteStep()}
        {step === 'hold' && renderHoldStep()}
      </div>
    </Modal>
  );
};

// Made with Bob
