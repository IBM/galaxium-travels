import { format, parseISO } from 'date-fns';

/**
 * Format a date string to a readable format
 * @param dateString ISO date string
 * @param formatString date-fns format string (default: 'MMM dd, yyyy HH:mm')
 */
export const formatDate = (
  dateString: string,
  formatString: string = 'MMM dd, yyyy HH:mm'
): string => {
  try {
    // The backend sometimes sends both an offset and a Z ("...+00:00Z"), which is not valid ISO.
    const date = parseISO(dateString.replace(/([+-]\d{2}:\d{2})Z$/, '$1'));
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Format date to short format (e.g., "Jan 1, 2099")
 */
export const formatDateShort = (dateString: string): string => {
  return formatDate(dateString, 'MMM dd, yyyy');
};

/**
 * Format time only (e.g., "09:00")
 */
export const formatTime = (dateString: string): string => {
  return formatDate(dateString, 'HH:mm');
};

/**
 * Format a price in credits, the one unit the app shows (e.g. "1,000,000 cr")
 */
export const formatCurrency = (amount: number): string => {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} cr`;
};

/**
 * Short price for dense lists (e.g. "1M", "950K", "2.5M"). The unit is shown next to it.
 */
export const formatCompactCredits = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(amount);
};

/**
 * Format large numbers with commas
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return formatDateShort(dateString);
  } catch {
    return dateString;
  }
};

/**
 * Calculate flight duration in hours
 */
export const calculateDuration = (
  departureTime: string,
  arrivalTime: string
): string => {
  try {
    const departure = parseISO(departureTime);
    const arrival = parseISO(arrivalTime);
    const diffInHours = (arrival.getTime() - departure.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return `${Math.round(diffInHours * 60)} min`;
    }
    
    const hours = Math.floor(diffInHours);
    const minutes = Math.round((diffInHours - hours) * 60);
    
    if (minutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${minutes}m`;
  } catch {
    return 'N/A';
  }
};

// Made with Bob
