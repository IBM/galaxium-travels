import { useState } from 'react';
import type { FlightFilters as FlightFiltersType } from '../../services/api';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlightFiltersProps {
  filters: FlightFiltersType;
  onFiltersChange: (filters: FlightFiltersType) => void;
  onReset: () => void;
}

export const FlightFilters = ({ filters, onFiltersChange, onReset }: FlightFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FlightFiltersType, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const removeFilter = (key: keyof FlightFiltersType) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <div className="glass-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-star-white hover:text-cosmic-purple transition-colors"
        >
          <Filter size={20} />
          <span className="font-semibold">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-cosmic-purple/20 text-cosmic-purple text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="text-sm text-star-white/70 hover:text-star-white transition-colors"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Filter Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 overflow-hidden"
          >
            {/* Phase 1: Sort */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-star-white">Sort By</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filters.sort_by || 'departure_time'}
                  onChange={(e) => updateFilter('sort_by', e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-star-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
                >
                  <option value="departure_time">Departure Time</option>
                  <option value="base_price">Price</option>
                  <option value="duration">Duration</option>
                  <option value="seats_available">Availability</option>
                </select>
                <select
                  value={filters.sort_order || 'asc'}
                  onChange={(e) => updateFilter('sort_order', e.target.value)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-star-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            {/* Phase 1: Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-star-white">Departure Date</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={filters.departure_date_from || ''}
                    onChange={(e) => updateFilter('departure_date_from', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-star-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
                  />
                  <span className="text-xs text-star-white/50 mt-1">From</span>
                </div>
                <div>
                  <input
                    type="date"
                    value={filters.departure_date_to || ''}
                    onChange={(e) => updateFilter('departure_date_to', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-star-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
                  />
                  <span className="text-xs text-star-white/50 mt-1">To</span>
                </div>
              </div>
            </div>

            {/* Phase 1: Price Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-star-white">Price Range (Credits)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.min_price || ''}
                  onChange={(e) => updateFilter('min_price', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-star-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.max_price || ''}
                  onChange={(e) => updateFilter('max_price', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-star-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
                />
              </div>
            </div>

            {/* Phase 1: Seat Class */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-star-white">Seat Class</label>
              <div className="flex gap-2">
                {['economy', 'business', 'galaxium'].map((seatClass) => (
                  <button
                    key={seatClass}
                    onClick={() => updateFilter('seat_class', filters.seat_class === seatClass ? undefined : seatClass)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.seat_class === seatClass
                        ? 'bg-cosmic-purple text-white'
                        : 'bg-white/5 text-star-white/70 hover:bg-white/10'
                    }`}
                  >
                    {seatClass.charAt(0).toUpperCase() + seatClass.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Phase 2: Time of Day */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-star-white">Time of Day</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'morning', label: 'Morning (6-12)' },
                  { value: 'afternoon', label: 'Afternoon (12-18)' },
                  { value: 'evening', label: 'Evening (18-22)' },
                  { value: 'night', label: 'Night (22-6)' },
                ].map((period) => (
                  <button
                    key={period.value}
                    onClick={() =>
                      updateFilter(
                        'departure_time_period',
                        filters.departure_time_period === period.value ? undefined : period.value
                      )
                    }
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.departure_time_period === period.value
                        ? 'bg-cosmic-purple text-white'
                        : 'bg-white/5 text-star-white/70 hover:bg-white/10'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Phase 2: Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-star-white">Flight Duration (hours)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.min_duration || ''}
                  onChange={(e) => updateFilter('min_duration', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-star-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.max_duration || ''}
                  onChange={(e) => updateFilter('max_duration', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-star-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
                />
              </div>
            </div>

            {/* Phase 2: Minimum Seats */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-star-white">Minimum Seats Available</label>
              <input
                type="number"
                placeholder="e.g., 2"
                value={filters.min_seats_available || ''}
                onChange={(e) =>
                  updateFilter('min_seats_available', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-star-white text-sm focus:outline-none focus:ring-2 focus:ring-cosmic-purple"
              />
            </div>

            {/* Phase 3: Route Categories */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-star-white">Route Category</label>
              <div className="flex gap-2">
                {[
                  { value: 'inner_planets', label: 'Inner Planets' },
                  { value: 'outer_planets', label: 'Outer Planets' },
                  { value: 'moons', label: 'Moons' },
                ].map((category) => (
                  <button
                    key={category.value}
                    onClick={() =>
                      updateFilter('route_category', filters.route_category === category.value ? undefined : category.value)
                    }
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.route_category === category.value
                        ? 'bg-cosmic-purple text-white'
                        : 'bg-white/5 text-star-white/70 hover:bg-white/10'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
          {Object.entries(filters).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-1 px-3 py-1 bg-cosmic-purple/20 text-cosmic-purple text-sm rounded-full"
            >
              <span>
                {key.replace(/_/g, ' ')}: {String(value)}
              </span>
              <button
                onClick={() => removeFilter(key as keyof FlightFiltersType)}
                className="hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Made with Bob