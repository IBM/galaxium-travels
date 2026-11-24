import { useState } from 'react';
import type { Flight, StoredHold } from '../../types';
import { Button } from '../common';
import { HoldRing } from './HoldRing';
import { AVAILABILITY_COLOR } from '../../solar/bodyStyle';
import { formatCurrency } from '../../utils/formatters';
import { seatClassLabel } from '../../utils/seatClasses';
import { confirmHold, releaseHold } from '../../services/api';
import { removeHold } from '../../utils/holdStorage';
import { useCountdown } from '../../hooks/useCountdown';
import { useUser } from '../../hooks/useUserContext';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface HoldCardProps {
  storedHold: StoredHold;
  flight?: Flight;
  onAction: () => void; // called after confirm or release to refresh parent
}

export const HoldCard = ({ storedHold, flight, onAction }: HoldCardProps) => {
  const { user } = useUser();
  const timeLeft = useCountdown(storedHold.reservedUntil);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const isExpired = timeLeft === 0;
  const isLoading = isConfirming || isReleasing;
  const color = isExpired ? AVAILABILITY_COLOR.soldOut : AVAILABILITY_COLOR.few;

  const handleConfirm = async () => {
    if (!user) return;
    setIsConfirming(true);
    try {
      const confirmed = await confirmHold(storedHold.holdId);
      removeHold(user.user_id, storedHold.holdId);
      toast.success(`Booking confirmed! Reference: #${confirmed.externalBookingReference}`);
      onAction();
    } catch {
      toast.error('Failed to confirm booking');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRelease = async () => {
    if (!user) return;
    setIsReleasing(true);
    try {
      await releaseHold(storedHold.holdId);
      removeHold(user.user_id, storedHold.holdId);
      toast.success('Hold released');
      onAction();
    } catch {
      toast.error('Failed to release hold');
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="panel grid gap-5 p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Pending hold</span>
        <span
          className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]"
          style={{ color, borderColor: `${color}66`, backgroundColor: `${color}1a` }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
          {isExpired ? 'Expired' : 'Held'}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <HoldRing msLeft={timeLeft} />
        <div className="min-w-0">
          <h3 className="text-lg font-semibold tracking-tight text-star-white">
            {flight ? (
              <>
                {flight.origin} <span className="text-star-white/40">→</span> {flight.destination}
              </>
            ) : (
              `Flight #${storedHold.flightId}`
            )}
          </h3>
          <p className="mt-1 text-xs text-star-white/55">
            {seatClassLabel(storedHold.seatClass)} · {isExpired ? 'The seat is back on sale.' : 'Seat reserved for you.'}
          </p>
          <p className="mt-2 truncate font-mono text-[11px] text-star-white/40">Hold {storedHold.holdId}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
        <span className="font-mono text-base tabular-nums">
          {storedHold.totalPrice != null && !isNaN(storedHold.totalPrice) ? formatCurrency(storedHold.totalPrice) : '—'}
        </span>
        {isExpired ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (user) removeHold(user.user_id, storedHold.holdId);
              onAction();
            }}
          >
            Dismiss
          </Button>
        ) : (
          <div className="flex items-center gap-4">
            <Button variant="link" onClick={handleRelease} isLoading={isReleasing} disabled={isLoading}>
              Release
            </Button>
            <Button size="sm" onClick={handleConfirm} isLoading={isConfirming} disabled={isLoading}>
              Confirm
            </Button>
          </div>
        )}
      </div>
    </motion.article>
  );
};

// Made with Bob
