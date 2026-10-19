import { Rocket } from 'lucide-react';
import type { TimelineLeg } from '../../types';
import { formatDate, formatMinutes, minutesBetween } from '../../utils/formatters';

interface TripTimelineProps {
  legs: TimelineLeg[];
}

export const TripTimeline = ({ legs }: TripTimelineProps) => (
  <ol className="space-y-3">
    {legs.map((leg, index) => (
      <li key={leg.flight_id}>
        {index > 0 && (
          <p className="ml-8 mb-3 text-xs uppercase tracking-wide text-star-white/50">
            Layover in {leg.origin} ·{' '}
            {formatMinutes(minutesBetween(legs[index - 1].arrival_time, leg.departure_time))}
          </p>
        )}
        <div className="flex items-start gap-3">
          <Rocket className="mt-1 shrink-0 text-cosmic-purple" size={20} />
          <div>
            <p className="font-semibold text-star-white">
              {leg.origin} → {leg.destination}
            </p>
            <p className="text-sm text-star-white/70">
              {formatDate(leg.departure_time)} – {formatDate(leg.arrival_time)}
            </p>
          </div>
        </div>
      </li>
    ))}
  </ol>
);

// Made with Bob
