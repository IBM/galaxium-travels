# Frontend Developer Onboarding — Galaxium Travels

Welcome to the team. This guide is written specifically for experienced **Angular developers** joining as a frontend contributor. It walks through the codebase structure, how it maps to the actual webpage, and the React patterns you'll encounter day-to-day.

---

## What the app is

Galaxium Travels is a **demo interplanetary flight-booking system**. Its primary purpose is to showcase enterprise-level patterns in a multi-service architecture. Users can:

- Browse flights between planets (Earth, Mars, Europa, Jupiter, etc.) departing in 2099
- Filter by seat class (Economy, Business, Galaxium), price, departure time, and route category
- Hold a seat for 15 minutes via a separate Java microservice, then confirm or release it
- Register, log in, and view or cancel their bookings

The demo data is auto-seeded: 10 users, 10 flights, 20 bookings. It resets every time the backend starts unless `SEED_DEMO_DATA=false` is set.

---

## The three services

| Service | Tech | Port | What it owns |
|---------|------|------|-------------|
| Frontend | React 19 + Vite + TypeScript | 5173 | UI |
| Backend | Python / FastAPI | 8001 | Flights, bookings, users, MCP tools |
| Hold service | Java 17 / Spring Boot | 8080 | Quote creation, 15-min seat holds |

The frontend never talks to Java directly. It always goes through the Python backend, which proxies calls to Java. More on that in the API section.

---

## Running the frontend

```bash
cd booking_system_frontend
npm install
npm run dev       # starts http://localhost:5173
```

The Vite dev server proxies `/api/*` → `http://localhost:8001/*`, so all API calls are made as `/api/flights`, `/api/book`, etc. The backend must be running for pages that fetch data.

---

## Directory structure

```
booking_system_frontend/
├── src/
│   ├── main.tsx              # React DOM entry point
│   ├── App.tsx               # Router + provider tree
│   ├── index.css             # Tailwind directives + base styles
│   │
│   ├── pages/                # One file per route
│   │   ├── Home.tsx          # Landing page
│   │   ├── Flights.tsx       # Search, filter, and book
│   │   ├── MyBookings.tsx    # Booking history + live holds
│   │   └── DestinationDetail.tsx  # /destinations/:slug
│   │
│   ├── components/
│   │   ├── common/           # Button, Modal, Card, Input, LoadingSpinner, Starfield
│   │   ├── layout/           # Layout, Header, Footer
│   │   ├── flights/          # FlightCard, FlightFilters
│   │   ├── bookings/         # BookingModal, BookingCard, HoldCard
│   │   └── user/             # UserIdentification (sign-in / register)
│   │
│   ├── hooks/
│   │   ├── useUser.tsx       # UserProvider component
│   │   └── useUserContext.ts # UserContext + useUser() hook
│   │
│   ├── services/
│   │   └── api.ts            # All API calls (Axios)
│   │
│   ├── types/
│   │   └── index.ts          # All shared TypeScript types
│   │
│   ├── utils/
│   │   ├── formatters.ts     # Date, currency, duration helpers
│   │   └── holdStorage.ts    # localStorage helpers for seat holds
│   │
│   └── data/
│       └── destinations.ts   # Static destination data (copy, facts, colors)
│
├── tailwind.config.js        # Custom space-themed tokens
└── vite.config.ts            # Dev proxy + build config
```

---

## Pages and what they render

### `/` — Home (`pages/Home.tsx`)

The marketing landing page. It has no API calls. Content is static:

- Hero section with animated text and a CTA button linking to `/flights`
- Feature grid explaining seat classes
- Destination gallery pulling from `data/destinations.ts`

The animated starfield background is a canvas element rendered by `components/common/Starfield.tsx`. It runs in every page via `components/layout/Layout.tsx`.

### `/flights` — Flights (`pages/Flights.tsx`)

The core booking page. On mount, it calls `getFlights()` and renders the results. Key interactions:

1. **Filter panel** (`FlightFilters`) — collapses/expands, sends updated params back to `Flights.tsx` via an `onFiltersChange` callback
2. **Flight grid** — each flight renders as a `FlightCard`
3. **Book button** — opens `BookingModal`. If the user is not logged in, `UserIdentification` appears first
4. **Booking flow inside `BookingModal`**:
   - Step 1 `select` — pick a seat class
   - Step 2 `quote` — creates a quote via the Java hold service, shows price breakdown
   - Step 3 `hold` — creates a 15-minute hold, shows countdown. User can confirm (books the seat) or release

### `/bookings` — My Bookings (`pages/MyBookings.tsx`)

Requires the user to be logged in. Shows:

- **Active holds** (from `localStorage`) rendered as `HoldCard`. Each card has a live countdown timer and Confirm / Release buttons.
- **Booking history** fetched from the backend via `getUserBookings(userId)`, rendered as `BookingCard`

Holds are stored in `localStorage` keyed by `galaxium_holds_${userId}`. The backend is the source of truth for confirmed bookings.

### `/destinations/:slug` — Destination Detail (`pages/DestinationDetail.tsx`)

Uses the `slug` URL param to look up data in `data/destinations.ts`. No backend calls. Shows facts, hazards, a gallery, and a "View Departing Flights" link that navigates to `/flights?destination=<slug>`.

---

## The component tree

```
<App>
  <BrowserRouter>
    <UserProvider>          ← global user state lives here
      <Layout>
        <Header />          ← sticky nav, login button
        <Starfield />       ← animated canvas bg
        <Toaster />         ← toast notifications (react-hot-toast)
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/flights" element={<Flights />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/destinations/:slug" element={<DestinationDetail />} />
        </Routes>
        <Footer />
      </Layout>
    </UserProvider>
  </BrowserRouter>
</App>
```

---

## Routing

Routing uses **React Router v7**. Routes are declared explicitly in [`App.tsx`](booking_system_frontend/src/App.tsx) — there is no file-based routing.

```tsx
// App.tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/flights" element={<Flights />} />
  <Route path="/bookings" element={<MyBookings />} />
  <Route path="/destinations/:slug" element={<DestinationDetail />} />
  <Route path="*" element={<Home />} />
</Routes>
```

**Angular equivalent:**

| Angular | React Router v7 |
|---------|-----------------|
| `RouterModule.forRoot(routes)` | `<Routes>` in `App.tsx` |
| `routerLink="/flights"` | `<Link to="/flights">` |
| `ActivatedRoute` | `useParams()`, `useSearchParams()` |
| `Router.navigate(['/bookings'])` | `useNavigate()` hook |

---

## State management

There is no Redux, Zustand, or Signal-based store. State lives in two places:

### 1. Local component state

`useState` for anything scoped to one component (loading flags, form values, modal open/close).

### 2. User context (global)

[`hooks/useUser.tsx`](booking_system_frontend/src/hooks/useUser.tsx) provides a `UserProvider` that wraps the whole app. The current user is stored in both React state and `localStorage` (`galaxium_user`), so it survives page refreshes.

```tsx
// Any component that needs the user:
import { useUser } from '../hooks/useUserContext';

const { user, setUser, logout } = useUser();
```

**Angular equivalent:** This is the closest thing to an Angular `@Injectable({ providedIn: 'root' })` service. Instead of injecting it via the DI container, you call `useUser()` directly.

---

## API layer

All backend calls live in [`services/api.ts`](booking_system_frontend/src/services/api.ts). There is one Axios instance:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});
```

### Error handling — important

The backend returns `ErrorResponse` objects (with `success: false`) instead of always throwing HTTP 4xx/5xx. **Do not rely on HTTP status codes alone.** Check the body:

```ts
const result = await bookFlight(data);

if (isErrorResponse(result)) {
  toast.error(result.details ?? result.error);
} else {
  // result is a Booking
  toast.success('Booking confirmed!');
}
```

The Java proxy endpoints have an extra wrinkle: they return HTTP 200 with `{ error: "..." }` when the Java service is unavailable. The API layer handles this with `assertNotProxyError()`:

```ts
// In api.ts — called after every Java-proxied request
const assertNotProxyError = (data: unknown): void => {
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error((data as { error: string }).error);
  }
};
```

### Key API functions

| Function | Backend endpoint | Purpose |
|----------|-----------------|---------|
| `getFlights(filters?)` | `GET /flights` | Fetch flights (accepts all filter params) |
| `registerUser(data)` | `POST /register` | Create a user account |
| `getUserByCredentials(name, email)` | `GET /user` | Log in |
| `bookFlight(data)` | `POST /book` | Direct booking (no hold) |
| `getUserBookings(userId)` | `GET /bookings/:id` | User's booking history |
| `cancelBooking(bookingId)` | `POST /cancel/:id` | Cancel a booking |
| `createQuote(data)` | `POST /quotes` → Java | Step 1 of hold flow |
| `createHold(quoteId)` | `POST /quotes/:id/holds` → Java | Step 2: reserve seat |
| `confirmHold(holdId)` | `POST /holds/:id/confirm` → Java | Finalize hold into booking |
| `releaseHold(holdId)` | `POST /holds/:id/release` → Java | Cancel hold early |

**Angular equivalent:** The entire `api.ts` file is your `HttpClient` service. No class, no `@Injectable`, just exported async functions.

---

## TypeScript types

All shared types are in [`types/index.ts`](booking_system_frontend/src/types/index.ts). The ones you'll interact with most:

```ts
type SeatClass = 'economy' | 'business' | 'galaxium';

interface Flight {
  flight_id: number;
  origin: string; destination: string;
  departure_time: string; arrival_time: string; // ISO 8601
  economy_seats_available: number;
  business_seats_available: number;
  galaxium_seats_available: number;
  economy_price: number; business_price: number; galaxium_price: number;
}

interface Booking {
  booking_id: number;
  user_id: number; flight_id: number;
  status: 'booked' | 'cancelled' | 'completed';
  seat_class: SeatClass;
  price_paid: number;
  booking_time: string;
}

interface User { user_id: number; name: string; email: string; }

// Hold flow types (from Java service)
interface Quote { quoteId: string; flightId: number; totalPrice: number; expiresAt: string; ... }
interface Hold  { holdId: string; status: HoldStatus; reservedUntil: string; ... }

interface ErrorResponse { success: false; error: string; error_code: string; details?: string; }
```

---

## Styling — Tailwind with custom tokens

Tailwind is configured in [`tailwind.config.js`](booking_system_frontend/tailwind.config.js) with a space-themed palette. **Do not use default Tailwind color names** like `text-indigo-500` or `bg-gray-900` — use the project tokens:

| Token | Hex | Used for |
|-------|-----|---------|
| `space-dark` | `#030712` | Main page background |
| `space-blue` | `#0A1929` | Card/surface backgrounds |
| `cosmic-purple` | `#6366F1` | Primary accent, CTAs |
| `nebula-pink` | `#EC4899` | Secondary accent, highlights |
| `alien-green` | `#10B981` | Success states, available seats |
| `solar-orange` | `#F59E0B` | Warnings, Mars theme |
| `star-white` | `#F9FAFB` | Primary text |

Custom gradients: `bg-space-gradient`, `bg-cosmic-gradient`

Custom animations: `animate-float` (vertical drift), `animate-twinkle` (opacity pulse)

**Angular equivalent:** Think of these tokens as your design system variables. There are no Angular-style component-scoped styles or `:host` — everything uses Tailwind utility classes directly in JSX.

---

## Angular → React mental model map

This table covers the patterns you'll encounter most often:

| Angular concept | React equivalent in this codebase |
|-----------------|----------------------------------|
| `NgModule` | None. Components are just functions. |
| `@Injectable` service | Custom hook (`useUser`) or exported function (`api.ts`) |
| `@Input()` | Props — typed with a TypeScript interface |
| `@Output() EventEmitter` | Callback prop: `onClose: () => void` |
| `@ViewChild` | `useRef<HTMLElement>()` |
| `*ngIf="condition"` | `{condition && <Component />}` |
| `*ngFor="let item of items"` | `{items.map(item => <Card key={item.id} />)}` |
| `{{ value \| date }}` | `formatDate(value)` from `utils/formatters.ts` |
| `ngOnInit()` | `useEffect(() => { ... }, [])` (empty deps = run once on mount) |
| `ngOnDestroy()` | Return function from `useEffect`: `return () => clearInterval(timer)` |
| Two-way `[(ngModel)]` | `value={state}` + `onChange={e => setState(e.target.value)}` |
| `ReactiveFormsModule` | Controlled component state with `useState` |
| `HttpClient` + interceptors | Axios instance in `api.ts` with `interceptors.response` |
| `RouterModule` config | `<Routes>` in `App.tsx` |
| `routerLink` | `<Link to="...">` |
| `ActivatedRoute.params` | `useParams()` |
| `ActivatedRoute.queryParams` | `useSearchParams()` |
| `Router.navigate()` | `const navigate = useNavigate()` → `navigate('/path')` |
| `ChangeDetectionStrategy.OnPush` | React is always "OnPush" by default — re-renders only on state/prop change |
| `@angular/animations` | Framer Motion (`motion.div`, `AnimatePresence`) |

---

## Common patterns in this codebase

### Fetching data on page load

```tsx
const [flights, setFlights] = useState<Flight[]>([]);
const [isLoading, setIsLoading] = useState(true);

const loadFlights = useCallback(async () => {
  setIsLoading(true);
  try {
    const data = await getFlights(filters);
    setFlights(data);
  } catch (err) {
    toast.error('Failed to load flights');
  } finally {
    setIsLoading(false);
  }
}, [filters]);  // re-runs when filters change

useEffect(() => {
  loadFlights();
}, [loadFlights]);
```

`useCallback` prevents the effect from re-running on every render — similar to `OnPush` + `distinctUntilChanged`.

### Multi-step modal (`BookingModal`)

```tsx
type Step = 'select' | 'quote' | 'hold';
const [step, setStep] = useState<Step>('select');

// Reset when modal opens
useEffect(() => {
  if (isOpen) setStep('select');
}, [isOpen]);

return (
  <Modal isOpen={isOpen} onClose={onClose}>
    {step === 'select' && <SelectStep onNext={() => setStep('quote')} />}
    {step === 'quote'  && <QuoteStep  onNext={() => setStep('hold')}  />}
    {step === 'hold'   && <HoldStep   onConfirm={onSuccess} />}
  </Modal>
);
```

### Countdown timer with cleanup

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    const remaining = new Date(hold.reservedUntil).getTime() - Date.now();
    setTimeLeft(Math.max(0, remaining));
  }, 1000);
  
  return () => clearInterval(interval);  // Angular equivalent: ngOnDestroy
}, [hold.reservedUntil]);
```

### Reading from localStorage

```tsx
// utils/holdStorage.ts — accessed in MyBookings.tsx
const holds = getStoredHolds(user.user_id);   // returns StoredHold[]
storeHold(user.user_id, newHold);
removeHold(user.user_id, holdId);
```

---

## Toast notifications

Notifications use `react-hot-toast`. Import and call directly — no service needed:

```tsx
import toast from 'react-hot-toast';

toast.success('Booking confirmed!');
toast.error('Seat no longer available');
toast.loading('Placing hold...');
```

The `<Toaster>` component is mounted once in `Layout.tsx`.

---

## Animations

Animations use `framer-motion`. The most common patterns:

```tsx
// Fade + slide in
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>

// Animated mount/unmount
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>

// Hover / tap
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
```

---

## Key gotchas

- **Check the response body, not just the HTTP status.** Several endpoints (especially the Java proxies) return HTTP 200 with `{ error: "..." }` on failure. Always use `isErrorResponse()` or `assertNotProxyError()`.
- **`user.name` must match when booking.** The `bookFlight()` call sends both `user_id` and `name`. The backend validates both — a mismatch returns an error. This is an intentional (non-standard) security pattern.
- **Holds are client-side only until confirmed.** `StoredHold` objects live in `localStorage`. The backend doesn't know about a hold until the user clicks Confirm and `confirmHold()` succeeds.
- **The Java service must be running for quotes and holds.** If it's down, the Python proxy returns `{ error: "..." }` with HTTP 200. The booking flow will surface a toast error — this is expected behaviour in local dev without the Java service running.
- **Custom Tailwind tokens only.** Do not use default Tailwind color names. Use `space-dark`, `cosmic-purple`, etc.

---

## Suggested reading order

1. [`src/main.tsx`](booking_system_frontend/src/main.tsx) — 10 lines, the entry point
2. [`src/App.tsx`](booking_system_frontend/src/App.tsx) — routing tree
3. [`src/hooks/useUser.tsx`](booking_system_frontend/src/hooks/useUser.tsx) + [`useUserContext.ts`](booking_system_frontend/src/hooks/useUserContext.ts) — global state
4. [`src/services/api.ts`](booking_system_frontend/src/services/api.ts) — all API calls and error handling
5. [`src/types/index.ts`](booking_system_frontend/src/types/index.ts) — data shapes
6. [`src/pages/Flights.tsx`](booking_system_frontend/src/pages/Flights.tsx) — the most complex page
7. [`src/components/bookings/BookingModal.tsx`](booking_system_frontend/src/components/bookings/BookingModal.tsx) — multi-step flow

After that, everything else is building on the same patterns.

---

*Part of the Galaxium Travels demo codebase — see the root `AGENTS.md` for full architecture notes and project-wide footguns.*
