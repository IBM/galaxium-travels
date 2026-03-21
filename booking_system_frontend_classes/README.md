# Galaxium Travels Frontend

A modern, space-themed frontend for the Galaxium Travels interplanetary booking system. Built with React, TypeScript, Tailwind CSS, and Framer Motion.

## 🚀 Features

- **Modern UI/UX**: Beautiful space-themed interface with animated starfield background
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Real-time Updates**: Live flight availability and booking status
- **User Management**: Simple name/email authentication
- **Flight Booking**: Browse, search, and book interplanetary flights
- **Booking Management**: View and cancel your bookings
- **Toast Notifications**: User-friendly feedback for all actions
- **Smooth Animations**: Framer Motion powered transitions

## 🛠️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animations
- **React Router v6** - Client-side routing
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications
- **Lucide React** - Icons
- **date-fns** - Date formatting

## 📋 Prerequisites

- Node.js 18+ and npm
- Backend server running on `http://localhost:8080` (or configure `VITE_API_URL`)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file (or use the existing one):

```env
VITE_API_URL=http://localhost:8080
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

### 5. Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── components/
│   ├── common/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── Starfield.tsx
│   ├── layout/          # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Layout.tsx
│   ├── flights/         # Flight-related components
│   │   └── FlightCard.tsx
│   ├── bookings/        # Booking-related components
│   │   ├── BookingCard.tsx
│   │   └── BookingModal.tsx
│   └── user/            # User-related components
│       └── UserIdentification.tsx
├── pages/               # Route pages
│   ├── Home.tsx
│   ├── Flights.tsx
│   └── MyBookings.tsx
├── services/            # API services
│   └── api.ts
├── types/               # TypeScript types
│   └── index.ts
├── hooks/               # Custom React hooks
│   └── useUser.tsx
├── utils/               # Utility functions
│   └── formatters.ts
├── App.tsx              # Main app component
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## 🎨 Design System

### Colors

- **Primary**: Cosmic Purple (`#6366F1`)
- **Secondary**: Nebula Pink (`#EC4899`)
- **Success**: Alien Green (`#10B981`)
- **Warning**: Solar Orange (`#F59E0B`)
- **Background**: Space Dark (`#030712`)
- **Text**: Star White (`#F9FAFB`)

### Components

All components follow a consistent design pattern with:
- Glass morphism effects
- Smooth hover transitions
- Responsive layouts
- Accessible markup

## 🔌 API Integration

The frontend connects to the backend API with the following endpoints:

- `GET /flights` - List all flights
- `POST /register` - Register new user
- `GET /user?name=...&email=...` - Get user by credentials
- `POST /book` - Book a flight
- `GET /bookings/{user_id}` - Get user's bookings
- `POST /cancel/{booking_id}` - Cancel a booking

## 🎯 User Flows

### Booking a Flight

1. Browse available flights on the Flights page
2. Click "Book Now" on desired flight
3. Sign in or register (if not already logged in)
4. Confirm booking details
5. Receive confirmation and view in My Bookings

### Managing Bookings

1. Navigate to My Bookings (requires login)
2. View active and past bookings
3. Cancel active bookings if needed
4. See real-time status updates

## 🎨 Customization

### Changing Colors

Edit `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      'space-dark': '#030712',
      'cosmic-purple': '#6366F1',
      // Add your colors here
    }
  }
}
```

### Modifying API URL

Update `.env`:

```env
VITE_API_URL=https://your-api-url.com
```

## 🧪 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks
- Keep components small and focused
- Use Tailwind utility classes

## 🚀 Deployment

### Vercel

```bash
npm run build
# Deploy the 'dist' folder
```

### Netlify

```bash
npm run build
# Deploy the 'dist' folder
```

### Docker

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🐛 Troubleshooting

### Backend Connection Issues

- Ensure backend is running on the correct port
- Check `VITE_API_URL` in `.env`
- Verify CORS is enabled on backend

### Build Errors

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## 📝 License

This project is part of the Galaxium Travels booking system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for space travelers** 🚀
