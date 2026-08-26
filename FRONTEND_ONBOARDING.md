# Frontend Developer Onboarding — Galaxium Travels

Welcome to the team! This document is written specifically for developers coming from an **Angular background**. It maps familiar Angular concepts to the React equivalents used here, walks through the codebase structure, and explains how every part of the UI connects to the actual page you see in the browser.

---

## Table of Contents

1. [Tech Stack at a Glance](#1-tech-stack-at-a-glance)
2. [Angular → React Mental Model](#2-angular--react-mental-model)
3. [Project Structure](#3-project-structure)
4. [Entry Point & Bootstrapping](#4-entry-point--bootstrapping)
5. [Routing](#5-routing)
6. [Pages](#6-pages)
7. [Components](#7-components)
8. [State Management & Context](#8-state-management--context)
9. [API Layer](#9-api-layer)
10. [TypeScript Types](#10-typescript-types)
11. [Styling & Design System](#11-styling--design-system)
12. [The Full Booking Flow — End to End](#12-the-full-booking-flow--end-to-end)
13. [Local Development](#13-local-development)
14. [Key Conventions to Follow](#14-key-conventions-to-follow)

---

## 1. Tech Stack at a Glance

| Concern | Angular equivalent | What we use |
|---|---|---|
| Framework | Angular | React 19 |
| Language | TypeScript | TypeScript 5.9 |
| Build tool | Angular CLI / Webpack | Vite 7 |
| Routing | `@angular/router` | React Router v7 |
| HTTP client | `HttpClient` | Axios (via `services/api.ts`) |
| Styling | Component SCSS | Tailwind CSS 3 + custom tokens |
| Animations | Angular Animations | Framer Motion |
| Notifications | Custom service | react-hot-toast |
| Icons | N/A | Lucide React |
| Date helpers | date-pipe | date-fns |

---

## 2. Angular → React Mental Model

Before diving into code, here are the most important conceptual shifts.

### Components

Angular components are a class with a decorator. React components are just **functions that return JSX**.

```tsx
// Angular
@Component({ selector: 'app-flight-card', template: '...' })
export class FlightCardComponent {
  @Input() flight: Flight;
}

// React equivalent (booking_system_frontend/src/components/flights/FlightCard.tsx)
export function FlightCard({ flight }: { flight: Flight }) {
  return <div>...</div>;
}
```

There are no lifecycle hooks like `ngOnInit`. Use `useEffect` instead:

```tsx
// Angular
ngOnInit() { this.loadFlights(); }

// React
useEffect(() => { loadFlights(); }, []); // empty array = run once on mount
```

### Data Binding

```tsx
// Angular two-way binding
<input [(ngModel)]="searchTerm" />

// React — explicit controlled input
const [searchTerm, setSearchTerm] = useState('');
<input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
```

### Services & Dependency Injection

Angular injects services via the constructor. In React, shared logic lives in:

- **Plain functions** in `services/api.ts` (like HTTP calls)
- **Context** (`hooks/useUser.tsx`) for app-wide shared state
- **Custom hooks** for reusable stateful logic

There is no DI container. You import functions directly.

### Modules

Angular organises code into `NgModules`. React has no equivalent — it uses ES module imports. Everything is a file you import directly.

### Templates vs JSX

Angular uses a separate HTML template. React embeds the markup directly in the component function as JSX. It looks like HTML but it is JavaScript — `class` becomes `className`, `*ngIf` becomes `{condition && <element />}`, `*ngFor` becomes `.map()`.

---

## 3. Project Structure

```
booking_system_frontend/
├── src/
│   ├── App.tsx                 ← Router setup (like app-routing.module.ts)
│   ├── main.tsx                ← Bootstrap (like main.ts)
│   ├── index.css               ← Global styles + Tailwind layer directives
│   │
│   ├── pages/                  ← Full-page route components (like route components)
│   │   ├── Home.tsx            ← / (landing page)
│   │   ├── Flights.tsx         ← /flights (search + browse)
│   │   ├── MyBookings.tsx      ← /bookings (requires auth)
│   │   └── DestinationDetail.tsx ← /destinations/:slug
│   │
│   ├── components/             ← Reusable UI pieces (like shared components)
│   │   ├── layout/             ← Shell: Header, Footer, Layout wrapper
│   │   ├── common/             ← Button, Modal, Input, Card, LoadingSpinner
│   │   ├── flights/            ← FlightCard, FlightFilters
│   │   ├── bookings/           ← BookingCard, BookingModal, HoldCard
│   │   └── user/               ← UserIdentification modal
│   │
│   ├── services/
│   │   └── api.ts              ← All HTTP calls (like Angular services)
│   │
│   ├── types/
│   │   └── index.ts            ← TypeScript interfaces for all data models
│   │
│   ├── hooks/
│   │   ├── useUser.tsx         ← UserProvider context component
│   │   └── useUserContext.ts   ← useUser() hook to consume the context
│   │
│   ├── utils/
│   │   ├── formatters.ts       ← Date, time, currency helpers
│   │   └── holdStorage.ts      ← localStorage read/write for seat holds
│   │
│   └── data/
│       └── destinations.ts     ← Static destination catalog (not from API)
│
├── public/                     ← Static assets (favicon, etc.)
├── vite.config.ts              ← Vite + dev proxy config
├── tailwind.config.js          ← Tailwind theme + custom tokens
└── package.json
```

---

## 4. Entry Point & Bootstrapping

### `main.tsx`

The equivalent of Angular's `main.ts`. Mounts the React app into `<div id="root">` in `index.html`.

```tsx
// booking_system_frontend/src/main.tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### `App.tsx`

This is where routing is configured and the global `UserProvider` wraps the whole app. Think of it like `AppModule` + `app-routing.module.ts` combined.

```tsx
// booking_system_frontend/src/App.tsx
<UserProvider>            {/* ← global state, like a root-level service */}
  <BrowserRouter>
    <Layout>              {/* ← persistent Header + Footer shell */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/flights" element={<Flights />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/destinations/:slug" element={<DestinationDetail />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  </BrowserRouter>
</UserProvider>
```

---

## 5. Routing

React Router v7 replaces Angular's `RouterModule`. The concepts map closely:

| Angular | React Router v7 |
|---|---|
| `RouterModule.forRoot(routes)` | `<BrowserRouter> + <Routes>` |
| `{ path: 'flights', component: FlightsComponent }` | `<Route path="/flights" element={<Flights />} />` |
| `routerLink="/flights"` | `<Link to="/flights">` |
| `ActivatedRoute.params` | `useParams()` hook |
| `Router.navigate(['/flights'])` | `useNavigate()` hook |
| Route guards | Inline checks + redirect inside component |

**Reading a URL param** (used in `DestinationDetail.tsx`):
```tsx
const { slug } = useParams<{ slug: string }>();
const destination = getDestinationBySlug(slug);
```

**Redirecting programmatically** (used in `MyBookings.tsx` for auth guard):
```tsx
const navigate = useNavigate();
if (!user) navigate('/flights');
```

---

## 6. Pages

Pages live in `src/pages/` and map 1:1 to routes. They own page-level state, fetch data on mount, and compose smaller components.

### `Home.tsx` → renders at `/`

The landing page. It is **entirely static** — no API calls. It renders:
- A hero section with a cosmic animated headline
- A 4-feature highlight grid
- A destination grid built from `data/destinations.ts`
- A call-to-action section

The destination cards are `<Link>` elements pointing to `/destinations/:slug`.

### `Flights.tsx` → renders at `/flights`

The main product page. On mount it calls `getFlights()` from `api.ts` and displays results.

Key behaviour to understand:
- **Client-side search**: the origin/destination text box filters the *already-fetched* list in memory.
- **Server-side filters**: expanding the filter panel and applying (date, price, seat class, etc.) re-calls the API with query params.
- **Retry logic**: if the initial fetch fails, it retries up to 3 times with backoff.
- **Booking flow trigger**: clicking "Book Flight" on a `FlightCard` opens the booking modal. If the user has not identified themselves yet, it first opens `UserIdentification`.

### `MyBookings.tsx` → renders at `/bookings`

Shows the logged-in user's activity in three sections:
1. **Pending Holds** — seats reserved but not yet confirmed, with a live countdown timer
2. **Active Bookings** — confirmed bookings
3. **Past Bookings** — cancelled or completed

On mount it:
1. Reads stored holds from localStorage via `holdStorage.ts`
2. Re-validates each hold against the API (`getHold(holdId)`) to catch expired ones
3. Fetches bookings from the API (`getBookings(userId)`)
4. Fetches full flight details for each booking

**Auth guard**: if `user` is null it immediately navigates away to `/flights`.

### `DestinationDetail.tsx` → renders at `/destinations/:slug`

Displays rich content for a single destination (Mars, Europa, etc.). The data comes from `data/destinations.ts` — it is **static, not from the API**. It also calls `getFlights()` filtered to that destination to show live departures at the bottom of the page.

---

## 7. Components

### Layout Shell — `components/layout/`

Wraps every page. Renders a fixed `<Header>` with the nav links + user profile button, a `<Starfield>` canvas background (200 twinkling stars), and a `<Footer>`.

### Common — `components/common/`

Generic building blocks. The most important ones:
- **`Modal`** — a portal-based overlay. Accepts `isOpen`, `onClose`, and `title` props.
- **`Button`** — wraps Framer Motion for scale animations on hover/tap. Accepts `variant` ('primary' | 'secondary' | 'danger').
- **`LoadingSpinner`** — a rotating ring, shown during API calls.
- **`Starfield`** — a `<canvas>` element that draws and animates the space background. Lives in `layout/` but conceptually a visual effect.

### Flights — `components/flights/`

**`FlightCard.tsx`** is the core content unit. It receives a `Flight` object and displays:
- Route (origin → destination) with links to destination detail pages
- Departure / arrival times and flight duration
- Three seat class tiers (Economy, Business, Galaxium) each showing price and availability
- A "Book" button per tier that initiates the booking workflow

**`FlightFilters.tsx`** is the collapsible filter panel above the flight list. It manages 13+ filter parameters and emits an `onFilterChange` callback to the parent `Flights.tsx`, which then re-fetches from the API.

### Bookings — `components/bookings/`

**`BookingModal.tsx`** is the most complex component in the codebase. It implements a 3-step state machine:

```
'select' → user picks seat class → calls createQuote() → ...
'quote'  → displays price breakdown → user clicks "Place Hold" → calls createHold() → ...
'hold'   → live countdown timer, Confirm / Release buttons
```

Each step is rendered conditionally based on a `step` state variable. On reaching the 'hold' step, the hold is written to localStorage so it survives page refreshes and appears in `MyBookings`.

**`HoldCard.tsx`** is used in `MyBookings` for the "Pending Holds" section. It shows the hold status, a countdown to expiry, and Confirm/Release buttons.

**`BookingCard.tsx`** is used in `MyBookings` for the confirmed bookings list. Shows flight route, seat class, price paid, and a Cancel button (only for 'booked' status).

### User — `components/user/`

**`UserIdentification.tsx`** is a modal that handles authentication. It has two modes toggled by the user:
- **Sign In**: looks up an existing user by name + email via `getUserByCredentials()`
- **Create Account**: registers a new user via `registerUser()`

On success it stores the user in context (which also writes to localStorage). It is shown automatically when a user clicks "Book Flight" without being logged in.

---

## 8. State Management & Context

There is no NgRx, Redux, or Zustand here. State is managed at two levels:

### User State — React Context

Angular equivalent: a root-level `@Injectable({ providedIn: 'root' })` service.

- **Provider**: `UserProvider` in `hooks/useUser.tsx` wraps the entire app. It reads/writes `localStorage` key `galaxium_user`.
- **Consumer**: any component calls `const { user, setUser, logout } = useUser()` from `hooks/useUserContext.ts`.

```tsx
// Reading user state anywhere in the tree
const { user } = useUser();
if (!user) return <p>Please sign in</p>;
```

### Hold State — localStorage

Seat holds are stored in localStorage under `galaxium_holds_{userId}`. The `utils/holdStorage.ts` module provides typed helpers:

```ts
getStoredHolds(userId: string): StoredHold[]
storeHold(userId: string, hold: StoredHold): void
removeHold(userId: string, holdId: string): void
```

This means holds survive page refresh without a server-side session.

### Local Component State — useState

Everything else (modal open/closed, flight list, filter values, loading flags) lives as `useState` inside the component that owns it. There is no global state for these.

---

## 9. API Layer

All HTTP calls go through `services/api.ts`. This is the Angular `HttpService` equivalent — a single module that owns every endpoint.

### Base Setup

```ts
// booking_system_frontend/src/services/api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});
```

In development, Vite proxies `/api/*` to `http://localhost:8001` (the Python backend). In production Docker, nginx handles the same proxy. You never hard-code `localhost:8001` in component code.

### Error Handling — Critical Pattern

**This is the most important thing to understand about the API layer.**

Errors come in two shapes:
1. HTTP 4xx/5xx — caught by the Axios response interceptor and re-thrown as `ErrorResponse`
2. HTTP 200 with `{ error: "..." }` body — returned by the Python proxy when the Java service fails

Because of shape #2, **you cannot rely on HTTP status codes alone**. Every API call result must be checked:

```ts
// Pattern used throughout the codebase
const result = await createQuote({ ... });

// Check for proxy-wrapped errors (Java service failures that came back as HTTP 200)
assertNotProxyError(result);     // throws if result.error exists

// Check for backend-returned ErrorResponse
if (isErrorResponse(result)) {
  toast.error(result.error);
  return;
}

// Now result is the real typed value
console.log(result.quoteId);
```

The helpers `isErrorResponse()` and `assertNotProxyError()` are defined at the bottom of `api.ts`.

### Endpoints Summary

| Function | Method | Path | Returns |
|---|---|---|---|
| `getFlights(filters?)` | GET | `/flights` | `Flight[]` |
| `getUserByCredentials(name, email)` | GET | `/user?name=&email=` | `User \| ErrorResponse` |
| `registerUser(name, email)` | POST | `/register` | `User \| ErrorResponse` |
| `getBookings(userId)` | GET | `/bookings/:id` | `Booking[]` |
| `cancelBooking(bookingId)` | POST | `/cancel/:id` | `Booking \| ErrorResponse` |
| `createQuote(params)` | POST | `/quotes` | `Quote` |
| `createHold(quoteId)` | POST | `/quotes/:id/holds` | `Hold` |
| `getHold(holdId)` | GET | `/holds/:id` | `Hold` |
| `confirmHold(holdId)` | POST | `/holds/:id/confirm` | `Hold` |
| `releaseHold(holdId)` | POST | `/holds/:id/release` | `Hold` |

---

## 10. TypeScript Types

All shared types live in `src/types/index.ts`. The most important ones:

```ts
type SeatClass = 'economy' | 'business' | 'galaxium';

interface Flight {
  flight_id: string;
  origin: string;
  destination: string;
  departure_time: string;     // ISO 8601
  arrival_time: string;
  base_price: number;
  economy_seats_available: number;
  business_seats_available: number;
  galaxium_seats_available: number;
  economy_price: number;
  business_price: number;
  galaxium_price: number;
}

interface Booking {
  booking_id: string;
  user_id: string;
  flight_id: string;
  status: 'booked' | 'cancelled' | 'completed';
  booking_time: string;
  seat_class: SeatClass;
  price_paid: number;
}

interface User { user_id: string; name: string; email: string; }

interface Quote {
  quoteId: string; flightId: string; seatClass: SeatClass;
  pricePerSeat: number; totalPrice: number; expiresAt: string; status: 'CREATED';
}

type HoldStatus = 'HELD' | 'EXPIRED' | 'CONFIRMED' | 'RELEASED' | 'CONFIRMATION_FAILED';

interface Hold {
  holdId: string; quoteId: string; status: HoldStatus;
  reservedUntil: string; externalBookingReference?: string;
}

interface ErrorResponse { success: false; error: string; error_code: string; details?: string; }
```

---

## 11. Styling & Design System

The app uses **Tailwind CSS** — utility classes applied directly in JSX, no separate SCSS files. Think of it as inline styles with constraints.

### Custom Design Tokens

These are defined in `tailwind.config.js` and are the only color names you should use:

| Token | Hex | Use |
|---|---|---|
| `space-dark` | `#030712` | Page background |
| `space-blue` | `#0A1929` | Card backgrounds, accents |
| `cosmic-purple` | `#6366F1` | Primary accent, focus rings |
| `nebula-pink` | `#EC4899` | Secondary accent, gradients |
| `alien-green` | `#10B981` | Success states |
| `solar-orange` | `#F59E0B` | Warnings, attention |
| `star-white` | `#F9FAFB` | Primary text |

**Do not use standard Tailwind color names** (`blue-500`, `pink-400`, etc.) — use these tokens instead to stay consistent with the space theme.

### Reusable CSS Classes

Defined in `src/index.css` using Tailwind's `@layer components`:

- **`.glass-card`** — the main card style used throughout (frosted glass on dark background)
- **`.input-field`** — styled form inputs with `cosmic-purple` focus ring
- **`.btn-primary`** / **`.btn-secondary`** — base button styles

### Animations

Framer Motion handles all transition animations. The `<motion.div>` component replaces a plain `<div>`:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>
  Content
</motion.div>
```

`<AnimatePresence>` wraps conditional elements so exit animations play before unmount — important for modals.

---

## 12. The Full Booking Flow — End to End

This is how the frontend, backend, and Java service connect for the main user journey:

```
Browser                         Python Backend (:8001)       Java Hold Service (:8080)
  │                                     │                              │
  │  GET /api/flights                   │                              │
  │────────────────────────────────────►│                              │
  │◄──────────────── Flight[]  ─────────│                              │
  │                                     │                              │
  │  [User clicks "Book" on FlightCard] │                              │
  │  POST /api/quotes                   │                              │
  │────────────────────────────────────►│  POST /api/v1/quotes         │
  │                                     │─────────────────────────────►│
  │◄──────────── Quote (price, expiry) ─│◄──── Quote ─────────────────│
  │                                     │                              │
  │  POST /api/quotes/:id/holds         │                              │
  │────────────────────────────────────►│  POST /api/v1/quotes/:id/holds
  │                                     │─────────────────────────────►│
  │◄──────────── Hold (15min timer) ────│◄──── Hold ──────────────────│
  │  [Stored to localStorage]           │                              │
  │                                     │                              │
  │  POST /api/holds/:id/confirm        │                              │
  │────────────────────────────────────►│  POST /api/v1/holds/:id/confirm
  │                                     │─────────────────────────────►│
  │                                     │  Java → POST /internal/bookings/from-hold
  │                                     │◄─────────────────────────────│
  │◄──── Hold { status: CONFIRMED } ───│                              │
  │  [Booking now appears in /bookings] │                              │
```

**Key points for frontend developers:**
- The Python backend is a **proxy** for the Java service — you always call `/api/...`, never port 8080 directly.
- The 15-minute hold timer is enforced by the Java service, not the frontend. The frontend countdown is visual-only.
- The hold confirmation is what actually creates the `Booking` record in the database via the Java → Python internal call.

---

## 13. Local Development

### First-time setup

```bash
cd booking_system_frontend
npm install
npm run dev       # starts at http://localhost:5173
```

The frontend alone won't show any flights without the Python backend running. Start the backend in a separate terminal:

```bash
cd booking_system_backend
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
.venv/bin/python server.py    # starts at http://localhost:8001
```

Vite automatically proxies `/api` requests to `localhost:8001` — see `vite.config.ts`.

### Running the full stack with Docker

```bash
docker compose up             # frontend + Python backend
docker compose --profile hold-service up   # + Java hold service
```

### Useful dev commands

```bash
npm run build     # production build → dist/
npm run lint      # ESLint check
```

---

## 14. Key Conventions to Follow

1. **Check `success`/`error`, not HTTP status** — API calls can return `{ error: "..." }` with HTTP 200. Always use `isErrorResponse()` and `assertNotProxyError()`.

2. **Use custom Tailwind tokens** — `cosmic-purple`, `nebula-pink`, etc. Not standard Tailwind colors.

3. **Put API calls in `services/api.ts`** — not inside components. Components call the exported functions.

4. **Shared types go in `types/index.ts`** — do not define interfaces inline in component files.

5. **localStorage keys are namespaced** — `galaxium_user`, `galaxium_holds_{userId}`. Do not invent new keys without using the same pattern.

6. **Page-level data fetching in `useEffect`** — fetch on mount with an empty dependency array `[]`, or with specific deps if the fetch should re-run.

7. **Animations via Framer Motion** — use `motion.div` + `AnimatePresence` for anything that mounts/unmounts. Do not use CSS `transition` on conditionally rendered elements.

8. **No direct port 8080 calls** — never call the Java service directly from the frontend. Always go through the Python proxy at `/api/...`.

---

*Happy exploring the galaxy — and the codebase. If something breaks, check the Python backend logs first, then the Java service. The frontend rarely lies.*
