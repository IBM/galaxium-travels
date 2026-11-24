import { useState } from 'react';
import type { ReactNode } from 'react';
import type { FlightFilters as FlightFiltersType } from '../../services/api';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { formatCurrency } from '../../utils/formatters';
import { SEAT_CLASSES, seatClassLabel } from '../../utils/seatClasses';

interface FlightFiltersProps {
  filters: FlightFiltersType;
  onFiltersChange: (filters: FlightFiltersType) => void;
  onReset: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const ROUTES = [
  { value: 'inner_planets', label: 'Inner planets' },
  { value: 'outer_planets', label: 'Outer planets' },
  { value: 'moons', label: 'Moons' },
] as const;

const PERIODS = [
  { value: 'morning', label: 'Morning', hours: '06–12' },
  { value: 'afternoon', label: 'Afternoon', hours: '12–18' },
  { value: 'evening', label: 'Evening', hours: '18–22' },
  { value: 'night', label: 'Night', hours: '22–06' },
] as const;

// Sort field and direction as one choice. The first entry is the backend default and sends nothing.
const SORTS = [
  { label: 'Earliest departure', sort_by: undefined, sort_order: undefined },
  { label: 'Latest departure', sort_by: 'departure_time', sort_order: 'desc' },
  { label: 'Lowest price', sort_by: 'base_price', sort_order: 'asc' },
  { label: 'Highest price', sort_by: 'base_price', sort_order: 'desc' },
  { label: 'Shortest transit', sort_by: 'duration', sort_order: 'asc' },
  { label: 'Most seats', sort_by: 'seats_available', sort_order: 'desc' },
] as const;

type FilterKey = keyof FlightFiltersType;

// Filters that show as removable pills, with the wording a traveller would use.
const PILL_LABEL: Partial<Record<FilterKey, (value: string | number | boolean) => string>> = {
  route_category: (v) => ROUTES.find((r) => r.value === v)?.label ?? String(v),
  seat_class: (v) => seatClassLabel(String(v)),
  departure_date_from: (v) => `From ${v}`,
  departure_date_to: (v) => `Until ${v}`,
  min_price: (v) => `Min ${formatCurrency(Number(v))}`,
  max_price: (v) => `Max ${formatCurrency(Number(v))}`,
  departure_time_period: (v) => PERIODS.find((p) => p.value === v)?.label ?? String(v),
  min_duration: (v) => `Transit ≥ ${v} h`,
  max_duration: (v) => `Transit ≤ ${v} h`,
  min_seats_available: (v) => `${v}+ seats`,
};

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={clsx(
      'whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] transition-colors',
      active ? 'border-star-white bg-star-white text-space-dark' : 'border-white/10 text-star-white/55 hover:border-white/30 hover:text-star-white'
    )}
  >
    {children}
  </button>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="eyebrow mb-2">{label}</p>
    <div className="grid grid-cols-2 gap-2">{children}</div>
  </div>
);

const SMALL_INPUT = 'input-field px-3 py-2';

export const FlightFilters = ({ filters, onFiltersChange, onReset, searchTerm, onSearchChange }: FlightFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  /** Applies a change; keys set to undefined or '' are removed rather than sent as empty values. */
  const set = (patch: Partial<FlightFiltersType>) => {
    const next: Record<string, unknown> = { ...filters, ...patch };
    for (const key of Object.keys(next)) {
      if (next[key] === undefined || next[key] === '') delete next[key];
    }
    onFiltersChange(next as FlightFiltersType);
  };

  const toggle = <K extends FilterKey>(key: K, value: FlightFiltersType[K]) =>
    set({ [key]: filters[key] === value ? undefined : value });

  const number = (value: string) => (value ? parseInt(value) : undefined);

  const pills = (Object.keys(PILL_LABEL) as FilterKey[]).filter((key) => filters[key] !== undefined);
  const moreCount = pills.filter((key) => key !== 'route_category' && key !== 'seat_class').length;
  const sortIndex = Math.max(
    0,
    SORTS.findIndex((s) => s.sort_by === filters.sort_by && s.sort_order === (filters.sort_by ? filters.sort_order ?? 'asc' : undefined))
  );
  const hasAny = pills.length > 0 || sortIndex > 0 || searchTerm !== '';

  return (
    <div className="space-y-4">
      {/* Toolbar: search, sort, and the toggle for the less common filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-star-white/40" size={15} />
          <input
            type="search"
            aria-label="Search by origin or destination"
            placeholder="Search by origin or destination"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="input-field rounded-full pl-10"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            aria-label="Sort flights"
            value={sortIndex}
            onChange={(e) => {
              const { sort_by, sort_order } = SORTS[Number(e.target.value)];
              set({ sort_by, sort_order });
            }}
            className="input-field w-auto rounded-full py-2.5 pl-4 pr-8 text-xs"
          >
            {SORTS.map((sort, index) => (
              <option key={sort.label} value={index}>
                {sort.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            className={clsx('btn-secondary', isExpanded && 'border-white/40 bg-white/10')}
          >
            <SlidersHorizontal size={13} />
            Filters
            {moreCount > 0 && <span className="font-mono text-star-white/60">{moreCount}</span>}
          </button>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={!filters.route_category} onClick={() => set({ route_category: undefined })}>
          All routes
        </Chip>
        {ROUTES.map((route) => (
          <Chip key={route.value} active={filters.route_category === route.value} onClick={() => toggle('route_category', route.value)}>
            {route.label}
          </Chip>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-white/15 sm:block" aria-hidden />
        {SEAT_CLASSES.map((seatClass) => (
          <Chip key={seatClass.id} active={filters.seat_class === seatClass.id} onClick={() => toggle('seat_class', seatClass.id)}>
            {seatClass.label}
          </Chip>
        ))}
      </div>

      {/* Less common filters */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="glass-card grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Departure date">
                <input type="date" aria-label="Departure from" value={filters.departure_date_from || ''} onChange={(e) => set({ departure_date_from: e.target.value })} className={SMALL_INPUT} />
                <input type="date" aria-label="Departure until" value={filters.departure_date_to || ''} onChange={(e) => set({ departure_date_to: e.target.value })} className={SMALL_INPUT} />
              </Field>
              <Field label="Price, credits">
                <input type="number" placeholder="Min" value={filters.min_price || ''} onChange={(e) => set({ min_price: number(e.target.value) })} className={SMALL_INPUT} />
                <input type="number" placeholder="Max" value={filters.max_price || ''} onChange={(e) => set({ max_price: number(e.target.value) })} className={SMALL_INPUT} />
              </Field>
              <Field label="Transit, hours">
                <input type="number" placeholder="Min" value={filters.min_duration || ''} onChange={(e) => set({ min_duration: number(e.target.value) })} className={SMALL_INPUT} />
                <input type="number" placeholder="Max" value={filters.max_duration || ''} onChange={(e) => set({ max_duration: number(e.target.value) })} className={SMALL_INPUT} />
              </Field>
              <div>
                <p className="eyebrow mb-2">Seats needed</p>
                <input type="number" placeholder="e.g. 2" value={filters.min_seats_available || ''} onChange={(e) => set({ min_seats_available: number(e.target.value) })} className={SMALL_INPUT} />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="eyebrow mb-2">Departure time</p>
                <div className="flex flex-wrap gap-2">
                  {PERIODS.map((period) => (
                    <Chip key={period.value} active={filters.departure_time_period === period.value} onClick={() => toggle('departure_time_period', period.value)}>
                      {period.label} <span className="font-mono opacity-60">{period.hours}</span>
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filters */}
      {hasAny && (
        <div className="flex flex-wrap items-center gap-2">
          {pills.map((key) => (
            <span key={key} className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-1 pl-3 pr-2 text-xs text-star-white/80">
              {PILL_LABEL[key]?.(filters[key] as string | number | boolean)}
              <button type="button" onClick={() => set({ [key]: undefined })} aria-label="Remove filter" className="text-star-white/50 transition-colors hover:text-star-white">
                <X size={12} />
              </button>
            </span>
          ))}
          <button type="button" onClick={onReset} className="text-link ml-1">
            Reset all
          </button>
        </div>
      )}
    </div>
  );
};

// Made with Bob
