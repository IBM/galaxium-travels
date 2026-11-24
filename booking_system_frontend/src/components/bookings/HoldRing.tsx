import { AVAILABILITY_COLOR } from '../../solar/bodyStyle';
import { formatCountdown } from '../../hooks/useCountdown';

/** Length of a seat hold. Mirrors hold.duration.minutes in the hold service's application.properties. */
export const HOLD_DURATION_MS = 15 * 60 * 1000;

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface HoldRingProps {
  msLeft: number;
  /** Diameter in CSS pixels. */
  size?: number;
}

/** Countdown for a held seat: a ring that drains as the hold runs out, with the time in the middle. */
export const HoldRing = ({ msLeft, size = 96 }: HoldRingProps) => {
  const expired = msLeft === 0;
  const fraction = Math.min(1, msLeft / HOLD_DURATION_MS);
  const color = expired ? AVAILABILITY_COLOR.soldOut : AVAILABILITY_COLOR.few;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="timer" aria-label={expired ? 'Hold expired' : `${formatCountdown(msLeft)} left to confirm`}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle cx="40" cy="40" r={RADIUS} fill="none" strokeWidth="3" className="stroke-white/10" />
        {!expired && (
          <circle
            cx="40"
            cy="40"
            r={RADIUS}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - fraction)}
            style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dashoffset 1s linear' }}
          />
        )}
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono font-medium tabular-nums"
        style={{ color: expired ? color : undefined, fontSize: size * (expired ? 0.13 : 0.2) }}
      >
        {expired ? 'EXPIRED' : formatCountdown(msLeft)}
      </span>
    </div>
  );
};
