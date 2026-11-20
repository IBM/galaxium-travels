import { Link } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { getDestinationByName } from '../../data/destinations';
import { AVAILABILITY_COLOR, BODY_STYLE } from '../../solar/bodyStyle';
import { availability, cheapestPrice } from '../../solar/flights';
import type { MapFlight } from '../../solar/flights';
import type { BodyId } from '../../solar/orbits';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface BodyPanelProps {
  bodyId: BodyId;
  mapFlights: MapFlight[];
  onClose: () => void;
  onBookFlight: (mapFlight: MapFlight) => void;
}

const FlightRow = ({ mapFlight, onBook }: { mapFlight: MapFlight; onBook: (f: MapFlight) => void }) => {
  const { flight } = mapFlight;
  const price = cheapestPrice(flight);
  return (
    <button
      type="button"
      onClick={() => onBook(mapFlight)}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/10"
    >
      <span>
        <span className="flex items-center gap-2 text-sm font-medium text-star-white">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: AVAILABILITY_COLOR[availability(flight)] }} />
          {flight.origin} → {flight.destination}
        </span>
        <span className="block text-xs text-star-white/60">{formatDate(flight.departure_time, 'MMM dd, HH:mm')}</span>
      </span>
      <span className="text-xs font-semibold text-star-white/80">{price === null ? 'Sold out' : formatCurrency(price)}</span>
    </button>
  );
};

export const BodyPanel = ({ bodyId, mapFlights, onClose, onBookFlight }: BodyPanelProps) => {
  const { label, color } = BODY_STYLE[bodyId];
  const destination = getDestinationByName(label);
  const departing = mapFlights.filter((f) => f.origin === bodyId);
  const arriving = mapFlights.filter((f) => f.destination === bodyId);

  const facts = destination
    ? [
        ['Gravity', destination.facts.gravity],
        ['From Earth', destination.facts.distanceFromEarth],
        ['Transit', destination.facts.typicalTransitTime],
        ['Surface', destination.facts.surfaceTemp],
      ]
    : [];

  return (
    <aside className="absolute bottom-24 right-3 top-3 z-30 flex w-72 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-space-blue/90 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-star-white">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </h2>
          {destination && <p className="mt-1 text-xs text-star-white/60">{destination.tagline}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close panel" className="text-star-white/60 transition-colors hover:text-star-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {facts.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
            {facts.map(([name, value]) => (
              <div key={name}>
                <dt className="text-[10px] uppercase tracking-wider text-star-white/50">{name}</dt>
                <dd className="text-xs text-star-white">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {[
          ['Departing', departing] as const,
          ['Arriving', arriving] as const,
        ].map(([title, list]) => (
          <section key={title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-star-white/60">
              {title} ({list.length})
            </h3>
            {list.length === 0 ? (
              <p className="text-xs text-star-white/40">No flights</p>
            ) : (
              <div className="space-y-2">
                {list.map((f) => (
                  <FlightRow key={f.flight.flight_id} mapFlight={f} onBook={onBookFlight} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {destination && (
        <Link
          to={`/destinations/${destination.slug}`}
          className="flex items-center justify-center gap-2 border-t border-white/10 p-3 text-sm font-medium text-cosmic-purple transition-colors hover:text-star-white"
        >
          About {label} <ArrowRight size={14} />
        </Link>
      )}
    </aside>
  );
};
