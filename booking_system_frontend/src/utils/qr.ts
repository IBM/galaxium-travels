/**
 * QR Code utility for boarding pass
 * Generates QR code data for booking references
 */

/**
 * Prepare booking reference data for QR code encoding
 * @param bookingReference - The external booking reference from the hold confirmation
 * @returns The string to encode in the QR code
 */
export const prepareQRData = (bookingReference: string): string => {
  // For v1, we simply encode the booking reference
  // In a real system, this might include additional data like:
  // - Passenger name
  // - Flight number
  // - Departure date
  // - Seat number
  // Format: JSON or custom format that can be scanned at gates
  
  return `GALAXIUM-${bookingReference}`;
};

/**
 * Get QR code configuration options
 */
export const getQRCodeOptions = () => ({
  size: 200,
  level: 'M' as const, // Error correction level: L, M, Q, H
  includeMargin: true,
  fgColor: '#ffffff', // White foreground for dark theme
  bgColor: '#1a1a2e', // Dark background matching app theme
});

// Made with Bob