# Galaxium Travels - Developer Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Backend Development](#backend-development)
5. [Frontend Development](#frontend-development)
6. [Database Management](#database-management)
7. [Testing](#testing)
8. [API Development](#api-development)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)
12. [Contributing Guidelines](#contributing-guidelines)

---

## Getting Started

### Prerequisites

Ensure you have the following installed:

| Tool | Version | Download Link |
|------|---------|---------------|
| Python | 3.8+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| npm | 9+ | Comes with Node.js |
| Git | Latest | https://git-scm.com/ |
| VS Code | Latest (Recommended) | https://code.visualstudio.com/ |

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd galaxium-travels

# Start both backend and frontend
./start.sh  # macOS/Linux
# OR
start.bat   # Windows
```

---

## Development Environment Setup

### Backend Setup

```bash
# Navigate to backend directory
cd booking_system_backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print('FastAPI installed successfully')"

# Run the server
python server.py
```

**Backend will be available at:** http://localhost:8080

### Frontend Setup

```bash
# Navigate to frontend directory
cd booking_system_frontend

# Install dependencies
npm install

# Verify installation
npm list react

# Start development server
npm run dev
```

**Frontend will be available at:** http://localhost:5173

### Environment Variables

#### Backend (.env)
```bash
# Create .env file in booking_system_backend/
DATABASE_URL=sqlite:///./booking.db
# For production:
# DATABASE_URL=postgresql://user:password@localhost:5432/galaxium
```

#### Frontend (.env)
```bash
# Create .env file in booking_system_frontend/
VITE_API_URL=http://localhost:8080
```

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.vscode-pylance",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "usernamehw.errorlens",
    "eamodio.gitlens"
  ]
}
```

---

## Project Structure

### Backend Structure

```
booking_system_backend/
├── server.py              # Main application entry point
│   ├── FastAPI app initialization
│   ├── MCP server setup
│   ├── REST endpoints
│   └── Lifespan management
│
├── models.py              # SQLAlchemy ORM models
│   ├── User model
│   ├── Flight model
│   └── Booking model
│
├── schemas.py             # Pydantic schemas
│   ├── Request schemas
│   ├── Response schemas
│   └── Validation rules
│
├── db.py                  # Database configuration
│   ├── Engine setup
│   ├── Session management
│   └── Database initialization
│
├── seed.py                # Database seeding
│   └── Sample data generation
│
├── services/              # Business logic layer
│   ├── __init__.py
│   ├── user.py           # User operations
│   ├── flight.py         # Flight operations
│   └── booking.py        # Booking operations
│
├── tests/                 # Test suite
│   ├── conftest.py       # Test configuration
│   ├── test_services.py  # Service tests
│   └── test_rest.py      # API tests
│
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container configuration
└── README.md             # Backend documentation
```

### Frontend Structure

```
booking_system_frontend/
├── src/
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Root component
│   │
│   ├── components/           # Reusable components
│   │   ├── common/           # Generic UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── Starfield.tsx
│   │   │
│   │   ├── layout/           # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   │
│   │   ├── flights/          # Flight components
│   │   │   └── FlightCard.tsx
│   │   │
│   │   ├── bookings/         # Booking components
│   │   │   ├── BookingCard.tsx
│   │   │   └── BookingModal.tsx
│   │   │
│   │   └── user/             # User components
│   │       └── UserIdentification.tsx
│   │
│   ├── pages/                # Route pages
│   │   ├── Home.tsx
│   │   ├── Flights.tsx
│   │   └── MyBookings.tsx
│   │
│   ├── services/             # API integration
│   │   └── api.ts
│   │
│   ├── hooks/                # Custom React hooks
│   │   └── useUser.tsx
│   │
│   ├── types/                # TypeScript definitions
│   │   └── index.ts
│   │
│   ├── utils/                # Utility functions
│   │   └── formatters.ts
│   │
│   └── index.css             # Global styles
│
├── public/                   # Static assets
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
├── tailwind.config.js       # Tailwind config
└── README.md                # Frontend documentation
```

---

## Backend Development

### Adding a New Endpoint

#### 1. Define the Schema (schemas.py)

```python
from pydantic import BaseModel

class NewFeatureRequest(BaseModel):
    field1: str
    field2: int

class NewFeatureOut(BaseModel):
    id: int
    field1: str
    field2: int
    
    class Config:
        from_attributes = True
```

#### 2. Create the Service (services/new_feature.py)

```python
from sqlalchemy.orm import Session
from models import NewModel
from schemas import NewFeatureOut, ErrorResponse

def create_feature(db: Session, field1: str, field2: int) -> NewFeatureOut | ErrorResponse:
    """Create a new feature."""
    try:
        new_item = NewModel(field1=field1, field2=field2)
        db.add(new_item)
        db.commit()
        db.refresh(new_item)
        return NewFeatureOut.model_validate(new_item)
    except Exception as e:
        return ErrorResponse(
            error="Creation failed",
            error_code="CREATE_ERROR",
            details=str(e)
        )
```

#### 3. Add the Endpoint (server.py)

```python
from services import new_feature

@app.post("/feature", response_model=Union[NewFeatureOut, ErrorResponse], tags=["Features"])
def create_feature_endpoint(request: NewFeatureRequest, db: Session = Depends(get_db)):
    """Create a new feature."""
    return new_feature.create_feature(db, request.field1, request.field2)
```

#### 4. Add MCP Tool (Optional)

```python
@mcp.tool()
def create_feature_tool(field1: str, field2: int) -> NewFeatureOut:
    """Create a new feature via MCP."""
    db = SessionLocal()
    try:
        result = new_feature.create_feature(db, field1, field2)
        if isinstance(result, ErrorResponse):
            raise Exception(result.details or result.error)
        return result
    finally:
        db.close()
```

### Database Model Development

#### Creating a New Model

```python
# models.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class NewModel(Base):
    __tablename__ = 'new_table'
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    field1 = Column(String, nullable=False)
    field2 = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=False)
    
    # Foreign key example
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
```

#### Running Migrations

```python
# For SQLite (development)
from db import init_db
init_db()  # Creates all tables

# For production with Alembic
alembic init alembic
alembic revision --autogenerate -m "Add new table"
alembic upgrade head
```

### Error Handling

```python
# Always return structured errors
def some_operation(db: Session, param: str) -> Result | ErrorResponse:
    # Validation
    if not param:
        return ErrorResponse(
            error="Invalid parameter",
            error_code="INVALID_PARAM",
            details="Parameter cannot be empty"
        )
    
    # Database operation
    try:
        result = db.query(Model).filter(Model.field == param).first()
        if not result:
            return ErrorResponse(
                error="Not found",
                error_code="NOT_FOUND",
                details=f"No record found with {param}"
            )
        return ResultOut.model_validate(result)
    except Exception as e:
        return ErrorResponse(
            error="Database error",
            error_code="DB_ERROR",
            details=str(e)
        )
```

### Testing Backend Code

```python
# tests/test_new_feature.py
import pytest
from services import new_feature

def test_create_feature(db_session):
    """Test feature creation."""
    result = new_feature.create_feature(
        db_session,
        field1="test",
        field2=123
    )
    assert result.field1 == "test"
    assert result.field2 == 123

def test_create_feature_validation(db_session):
    """Test validation."""
    result = new_feature.create_feature(
        db_session,
        field1="",
        field2=-1
    )
    assert isinstance(result, ErrorResponse)
    assert result.error_code == "VALIDATION_ERROR"
```

---

## Frontend Development

### Creating a New Component

#### 1. Create Component File

```typescript
// src/components/feature/FeatureCard.tsx
import { Card, Button } from '../common';
import type { Feature } from '../../types';

interface FeatureCardProps {
  feature: Feature;
  onAction: (feature: Feature) => void;
}

export const FeatureCard = ({ feature, onAction }: FeatureCardProps) => {
  return (
    <Card>
      <h3 className="text-xl font-bold text-star-white">
        {feature.title}
      </h3>
      <p className="text-star-white/70">{feature.description}</p>
      <Button onClick={() => onAction(feature)}>
        Take Action
      </Button>
    </Card>
  );
};
```

#### 2. Add Type Definitions

```typescript
// src/types/index.ts
export interface Feature {
  id: number;
  title: string;
  description: string;
  created_at: string;
}
```

#### 3. Create API Service

```typescript
// src/services/api.ts
export const getFeatures = async (): Promise<Feature[]> => {
  const response = await api.get<Feature[]>('/features');
  return response.data;
};

export const createFeature = async (
  data: CreateFeatureRequest
): Promise<Feature | ErrorResponse> => {
  const response = await api.post<Feature | ErrorResponse>('/feature', data);
  return response.data;
};
```

#### 4. Create Page Component

```typescript
// src/pages/Features.tsx
import { useState, useEffect } from 'react';
import { getFeatures } from '../services/api';
import { FeatureCard } from '../components/feature/FeatureCard';
import type { Feature } from '../types';

export const Features = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      const data = await getFeatures();
      setFeatures(data);
    } catch (error) {
      console.error('Failed to load features:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature) => (
        <FeatureCard
          key={feature.id}
          feature={feature}
          onAction={handleAction}
        />
      ))}
    </div>
  );
};
```

### Styling Guidelines

#### Using Tailwind CSS

```typescript
// Component with Tailwind classes
export const StyledComponent = () => {
  return (
    <div className="
      glass-card           // Custom glass effect
      p-6                  // Padding
      rounded-lg           // Border radius
      hover:bg-white/10    // Hover effect
      transition-all       // Smooth transitions
      duration-300         // Animation duration
    ">
      <h2 className="
        text-2xl           // Font size
        font-bold          // Font weight
        text-star-white    // Custom color
        mb-4               // Margin bottom
      ">
        Title
      </h2>
    </div>
  );
};
```

#### Custom Theme Colors

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'cosmic-purple': '#6366F1',
        'nebula-pink': '#EC4899',
        'star-white': '#F8FAFC',
        'space-black': '#0F172A',
        'alien-green': '#10B981',
        'solar-orange': '#F59E0B',
      },
    },
  },
};
```

### State Management

#### Using Context API

```typescript
// src/contexts/FeatureContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface FeatureContextType {
  features: Feature[];
  addFeature: (feature: Feature) => void;
  removeFeature: (id: number) => void;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export const FeatureProvider = ({ children }: { children: ReactNode }) => {
  const [features, setFeatures] = useState<Feature[]>([]);

  const addFeature = (feature: Feature) => {
    setFeatures([...features, feature]);
  };

  const removeFeature = (id: number) => {
    setFeatures(features.filter(f => f.id !== id));
  };

  return (
    <FeatureContext.Provider value={{ features, addFeature, removeFeature }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = () => {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatures must be used within FeatureProvider');
  }
  return context;
};
```

### Custom Hooks

```typescript
// src/hooks/useFeatures.tsx
import { useState, useEffect } from 'react';
import { getFeatures } from '../services/api';
import type { Feature } from '../types';

export const useFeatures = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeatures();
  }, []);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const data = await getFeatures();
      setFeatures(data);
      setError(null);
    } catch (err) {
      setError('Failed to load features');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadFeatures();
  };

  return { features, loading, error, refresh };
};
```

---

## Database Management

### Seeding the Database

```python
# seed.py
from db import SessionLocal
from models import User, Flight, Booking
from datetime import datetime, timedelta

def seed():
    db = SessionLocal()
    
    # Clear existing data (development only)
    db.query(Booking).delete()
    db.query(Flight).delete()
    db.query(User).delete()
    
    # Create users
    users = [
        User(name="Alice", email="alice@example.com"),
        User(name="Bob", email="bob@example.com"),
    ]
    db.add_all(users)
    db.commit()
    
    # Create flights
    now = datetime.utcnow()
    flights = [
        Flight(
            origin="Earth",
            destination="Mars",
            departure_time=(now + timedelta(days=7)).isoformat(),
            arrival_time=(now + timedelta(days=37)).isoformat(),
            price=50000,
            seats_available=100
        ),
    ]
    db.add_all(flights)
    db.commit()
    
    db.close()
```

### Database Queries

```python
# Common query patterns

# Get all records
flights = db.query(Flight).all()

# Filter records
available_flights = db.query(Flight).filter(
    Flight.seats_available > 0
).all()

# Get single record
flight = db.query(Flight).filter(
    Flight.flight_id == 1
).first()

# Join tables
bookings_with_flights = db.query(Booking).join(
    Flight, Booking.flight_id == Flight.flight_id
).all()

# Count records
booking_count = db.query(Booking).filter(
    Booking.user_id == 1
).count()

# Update records
db.query(Flight).filter(
    Flight.flight_id == 1
).update({"seats_available": Flight.seats_available - 1})
db.commit()

# Delete records
db.query(Booking).filter(
    Booking.booking_id == 1
).delete()
db.commit()
```

---

## Testing

### Backend Testing

#### Running Tests

```bash
cd booking_system_backend

# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest tests/test_services.py

# Run specific test
pytest tests/test_services.py::test_book_flight

# Run with verbose output
pytest -v

# Run and stop on first failure
pytest -x
```

#### Writing Tests

```python
# tests/test_services.py
import pytest
from services import booking
from models import User, Flight

def test_book_flight_success(db_session):
    """Test successful flight booking."""
    # Setup
    user = User(name="Test User", email="test@example.com")
    flight = Flight(
        origin="Earth",
        destination="Mars",
        departure_time="2026-04-01T10:00:00",
        arrival_time="2026-05-01T10:00:00",
        price=50000,
        seats_available=10
    )
    db_session.add(user)
    db_session.add(flight)
    db_session.commit()
    
    # Execute
    result = booking.book_flight(
        db_session,
        user.user_id,
        user.name,
        flight.flight_id
    )
    
    # Assert
    assert result.user_id == user.user_id
    assert result.flight_id == flight.flight_id
    assert result.status == "booked"
    
    # Verify seats decremented
    db_session.refresh(flight)
    assert flight.seats_available == 9

def test_book_flight_no_seats(db_session):
    """Test booking when no seats available."""
    # Setup
    user = User(name="Test User", email="test@example.com")
    flight = Flight(
        origin="Earth",
        destination="Mars",
        departure_time="2026-04-01T10:00:00",
        arrival_time="2026-05-01T10:00:00",
        price=50000,
        seats_available=0  # No seats
    )
    db_session.add(user)
    db_session.add(flight)
    db_session.commit()
    
    # Execute
    result = booking.book_flight(
        db_session,
        user.user_id,
        user.name,
        flight.flight_id
    )
    
    # Assert
    assert isinstance(result, ErrorResponse)
    assert result.error_code == "NO_SEATS_AVAILABLE"
```

### Frontend Testing (Recommended)

```typescript
// Install testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom

// tests/FlightCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { FlightCard } from '../components/flights/FlightCard';

describe('FlightCard', () => {
  const mockFlight = {
    flight_id: 1,
    origin: 'Earth',
    destination: 'Mars',
    departure_time: '2026-04-01T10:00:00',
    arrival_time: '2026-05-01T10:00:00',
    price: 50000,
    seats_available: 10,
  };

  it('renders flight information', () => {
    render(<FlightCard flight={mockFlight} onBook={() => {}} />);
    
    expect(screen.getByText('Earth → Mars')).toBeInTheDocument();
    expect(screen.getByText('10 seats available')).toBeInTheDocument();
  });

  it('calls onBook when button clicked', () => {
    const onBook = vi.fn();
    render(<FlightCard flight={mockFlight} onBook={onBook} />);
    
    fireEvent.click(screen.getByText('Book Now'));
    expect(onBook).toHaveBeenCalledWith(mockFlight);
  });

  it('disables button when sold out', () => {
    const soldOutFlight = { ...mockFlight, seats_available: 0 };
    render(<FlightCard flight={soldOutFlight} onBook={() => {}} />);
    
    const button = screen.getByText('Sold Out');
    expect(button).toBeDisabled();
  });
});
```

---

## API Development

### API Documentation

FastAPI automatically generates interactive API documentation:

- **Swagger UI**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc

### Testing API Endpoints

#### Using cURL

```bash
# Health check
curl http://localhost:8080/

# Get all flights
curl http://localhost:8080/flights

# Register user
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'

# Book flight
curl -X POST http://localhost:8080/book \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"name":"John Doe","flight_id":1}'

# Get user bookings
curl http://localhost:8080/bookings/1

# Cancel booking
curl -X POST http://localhost:8080/cancel/1
```

#### Using Python Requests

```python
import requests

BASE_URL = "http://localhost:8080"

# Get flights
response = requests.get(f"{BASE_URL}/flights")
flights = response.json()

# Register user
response = requests.post(
    f"{BASE_URL}/register",
    json={"name": "John Doe", "email": "john@example.com"}
)
user = response.json()

# Book flight
response = requests.post(
    f"{BASE_URL}/book",
    json={
        "user_id": user["user_id"],
        "name": user["name"],
        "flight_id": flights[0]["flight_id"]
    }
)
booking = response.json()
```

#### Using Postman

1. Import the API collection
2. Set base URL: `http://localhost:8080`
3. Test endpoints with different payloads
4. Save responses for documentation

---

## Common Tasks

### Adding a New Route

```typescript
// src/App.tsx
import { NewPage } from './pages/NewPage';

function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/flights" element={<Flights />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/new-page" element={<NewPage />} />  {/* New route */}
            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </UserProvider>
    </BrowserRouter>
  );
}
```

### Adding Navigation Link

```typescript
// src/components/layout/Header.tsx
<nav>
  <Link to="/">Home</Link>
  <Link to="/flights">Flights</Link>
  <Link to="/bookings">My Bookings</Link>
  <Link to="/new-page">New Page</Link>  {/* New link */}
</nav>
```

### Updating Dependencies

```bash
# Backend
cd booking_system_backend
pip list --outdated
pip install --upgrade package-name
pip freeze > requirements.txt

# Frontend
cd booking_system_frontend
npm outdated
npm update
npm install package-name@latest
```

### Database Reset

```bash
# Development only - resets database
cd booking_system_backend
rm booking.db
python server.py  # Will recreate and seed database
```

---

## Troubleshooting

### Backend Issues

#### Port Already in Use

```bash
# Find process using port 8080
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

#### Database Locked

```python
# SQLite database locked error
# Solution: Close all database connections
db.close()

# Or use connection pooling
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30}
)
```

#### Import Errors

```bash
# Ensure virtual environment is activated
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate  # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

### Frontend Issues

#### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Build Errors

```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

#### TypeScript Errors

```bash
# Restart TypeScript server in VS Code
# Command Palette (Cmd/Ctrl + Shift + P)
# > TypeScript: Restart TS Server
```

### API Connection Issues

#### CORS Errors

```python
# Ensure CORS is properly configured in server.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Network Errors

```typescript
// Check API URL in .env
VITE_API_URL=http://localhost:8080

// Verify backend is running
// Open http://localhost:8080/docs in browser
```

---

## Best Practices

### Code Style

#### Python (Backend)

```python
# Follow PEP 8
# Use type hints
def book_flight(db: Session, user_id: int, name: str, flight_id: int) -> BookingOut | ErrorResponse:
    """Book a flight for a user.
    
    Args:
        db: Database session
        user_id: User's ID
        name: User's name
        flight_id: Flight's ID
        
    Returns:
        BookingOut on success, ErrorResponse on failure
    """
    pass

# Use descriptive variable names
seats_available = flight.seats_available
booking_time = datetime.utcnow().isoformat()

# Keep functions focused and small
# One function = one responsibility
```

#### TypeScript (Frontend)

```typescript
// Use explicit types
interface Props {
  flight: Flight;
  onBook: (flight: Flight) => void;
}

// Use functional components with hooks
export const FlightCard = ({ flight, onBook }: Props) => {
  // Component logic
};

// Destructure props
const { origin, destination, price } = flight;

// Use meaningful names
const handleBookingClick = () => {
  onBook(flight);
};
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create pull request
# After review and approval, merge to main
```

### Commit Messages

```
feat: add new booking feature
fix: resolve seat availability bug
docs: update API documentation
style: format code with prettier
refactor: simplify booking logic
test: add booking service tests
chore: update dependencies
```

### Security Best Practices

```python
# Never commit sensitive data
# Use environment variables
import os
DATABASE_URL = os.getenv("DATABASE_URL")

# Validate all inputs
from pydantic import EmailStr, validator

class UserRegistration(BaseModel):
    name: str
    email: EmailStr
    
    @validator('name')
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v

# Use parameterized queries (SQLAlchemy does this automatically)
# Never use string concatenation for SQL
```

---

## Contributing Guidelines

### Before Contributing

1. Check existing issues and pull requests
2. Discuss major changes in an issue first
3. Follow the code style guide
4. Write tests for new features
5. Update documentation

### Pull Request Process

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   # Backend
   pytest
   
   # Frontend
   npm run build
   ```
5. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
6. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No console.log or debug code
- [ ] Error handling implemented
- [ ] Type safety maintained
- [ ] Performance considered

---

## Additional Resources

### Documentation

- **FastAPI**: https://fastapi.tiangolo.com/
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **SQLAlchemy**: https://docs.sqlalchemy.org/

### Tools

- **Postman**: API testing
- **DB Browser for SQLite**: Database inspection
- **React DevTools**: Component debugging
- **VS Code REST Client**: API testing in VS Code

### Community

- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas

---

## Quick Reference

### Common Commands

```bash
# Backend
python server.py              # Start server
pytest                        # Run tests
pip install -r requirements.txt  # Install deps

# Frontend
npm run dev                   # Start dev server
npm run build                 # Build for production
npm install                   # Install deps

# Database
rm booking.db                 # Reset database (dev only)

# Git
git status                    # Check status
git add .                     # Stage changes
git commit -m "message"       # Commit
git push                      # Push to remote
```

### Keyboard Shortcuts (VS Code)

- `Cmd/Ctrl + P`: Quick file open
- `Cmd/Ctrl + Shift + P`: Command palette
- `Cmd/Ctrl + B`: Toggle sidebar
- `Cmd/Ctrl + J`: Toggle terminal
- `Cmd/Ctrl + /`: Toggle comment
- `F5`: Start debugging

---

**Happy Coding! 🚀**

For questions or issues, please open a GitHub issue or contact the development team.

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-03-21  
**Maintained By:** Galaxium Travels Development Team