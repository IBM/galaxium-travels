Finish the boarding pass: show it as the last step of booking, give it a QR code that scans, and make it print cleanly.

Make sure to use jspdf@3.0.1

### Gap
The cards on My Bookings already look like boarding passes, but booking a flight still ends in a toast and a closed dialog. The barcode on the pass is decoration, there is no boarding time, and printing the page prints the whole site.

### Scope
- After a hold is confirmed, the booking dialog ends on the boarding pass instead of closing.
- A real QR code that encodes the booking reference, replacing the decorative barcode.
- Boarding time on the pass, two hours before departure.
- Print styles: one pass per page, no navigation or background.
- **Out of scope:** PDF export, Apple Wallet / Google Wallet passes, seat numbers (they come with #30).

### Touches
- `booking_system_frontend/src/components/bookings/BookingModal.tsx`
- `booking_system_frontend/src/components/bookings/BookingCard.tsx`
- `booking_system_frontend/src/utils/qr.ts` (new)
- `booking_system_frontend/src/index.css`

### Size
M · frontend only · about 4 files, around 200 lines.

### Acceptance criteria
- [ ] Boarding pass shown as the final step after a successful booking
- [ ] The same pass is shown on My Bookings
- [ ] Passenger name, flight, class, departure time and boarding time are all visible
- [ ] The QR code scans with a phone and yields the booking reference
- [ ] Printing produces a clean one-page pass

### Verify
```bash
cd booking_system_frontend && npm run lint && npm test && npm run build
```
