import { useState } from 'react';
import type { FlightFilters as FlightFiltersType } from '../../services/api';
import { Filter, Close, ChevronDown, ChevronUp } from '@carbon/icons-react';
import { Select, SelectItem, NumberInput, Tag } from '@carbon/react';
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
    <div className="carbon-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-text-01 hover:text-interactive-01 transition-colors"
        >
          <Filter size={20} />
          <span className="font-semibold">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-interactive-01/20 text-interactive-01 text-xs rounded">
              {activeFilterCount}
            </span>
          )}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="text-sm text-text-02 hover:text-text-01 transition-colors"
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
            {/* Sort */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                id="sort-by"
                labelText="Sort By"
                value={filters.sort_by || 'departure_time'}
                onChange={(e) => updateFilter('sort_by', e.target.value)}
              >
                <SelectItem value="departure_time" text="Departure Time" />
                <SelectItem value="base_price" text="Price" />
                <SelectItem value="duration" text="Duration" />
                <SelectItem value="seats_available" text="Availability" />
              </Select>
              <Select
                id="sort-order"
                labelText="Order"
                value={filters.sort_order || 'asc'}
                onChange={(e) => updateFilter('sort_order', e.target.value)}
              >
                <SelectItem value="asc" text="Ascending" />
                <SelectItem value="desc" text="Descending" />
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-01">Departure Date</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={filters.departure_date_from || ''}
                    onChange={(e) => updateFilter('departure_date_from', e.target.value)}
                    className="input-carbon"
                  />
                  <span className="text-xs text-text-03 mt-1">From</span>
                </div>
                <div>
                  <input
                    type="date"
                    value={filters.departure_date_to || ''}
                    onChange={(e) => updateFilter('departure_date_to', e.target.value)}
                    className="input-carbon"
                  />
                  <span className="text-xs text-text-03 mt-1">To</span>
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-01">Price Range (Credits)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.min_price || ''}
                  onChange={(e) => updateFilter('min_price', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input-carbon"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.max_price || ''}
                  onChange={(e) => updateFilter('max_price', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input-carbon"
                />
              </div>
            </div>

            {/* Seat Class */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-01">Seat Class</label>
              <div className="flex gap-2">
                {['economy', 'business', 'galaxium'].map((seatClass) => (
                  <button
                    key={seatClass}
                    onClick={() => updateFilter('seat_class', filters.seat_class === seatClass ? undefined : seatClass)}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                      filters.seat_class === seatClass
                        ? 'bg-interactive-01 text-text-04'
                        : 'bg-ui-02 text-text-02 hover:bg-ui-03'
                    }`}
                  >
                    {seatClass.charAt(0).toUpperCase() + seatClass.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Time of Day */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-01">Time of Day</label>
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
                    className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                      filters.departure_time_period === period.value
                        ? 'bg-interactive-01 text-text-04'
                        : 'bg-ui-02 text-text-02 hover:bg-ui-03'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-01">Flight Duration (hours)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.min_duration || ''}
                  onChange={(e) => updateFilter('min_duration', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input-carbon"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.max_duration || ''}
                  onChange={(e) => updateFilter('max_duration', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="input-carbon"
                />
              </div>
            </div>

            {/* Minimum Seats */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-01">Minimum Seats Available</label>
              <input
                type="number"
                placeholder="e.g., 2"
                value={filters.min_seats_available || ''}
                onChange={(e) =>
                  updateFilter('min_seats_available', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="input-carbon w-full"
              />
            </div>

            {/* Route Categories */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-01">Route Category</label>
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
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                      filters.route_category === category.value
                        ? 'bg-interactive-01 text-text-04'
                        : 'bg-ui-02 text-text-02 hover:bg-ui-03'
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
        <div className="flex flex-wrap gap-2 pt-4 border-t border-ui-03">
          {Object.entries(filters).map(([key, value]) => (
            <Tag
              key={key}
              type="blue"
              filter
              onClose={() => removeFilter(key as keyof FlightFiltersType)}
            >
              {key.replace(/_/g, ' ')}: {String(value)}
            </Tag>
          ))}
        </div>
      )}
    </div>
  );
};

// Made with Bob