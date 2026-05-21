# 🚀 How to Run Galaxium Travels

## Quick Start Guide

### Step 1: Backend is Already Running ✅

Your backend server is already running on **http://localhost:8080**

You can verify it by opening: http://localhost:8080/docs in your browser to see the API documentation.

### Step 2: Start the Frontend

You have **two options** to start the frontend:

#### Option A: Using Command Prompt (Recommended)

1. Open a **NEW Command Prompt** (not PowerShell)
   - Press `Win + R`
   - Type `cmd` and press Enter

2. Navigate to the frontend directory:
   ```cmd
   cd C:\Users\EzzatBeshai\Desktop\galaxium-travels\booking_system_frontend
   ```

3. Install dependencies (first time only):
   ```cmd
   npm install
   ```

4. Start the development server:
   ```cmd
   npm run dev
   ```

#### Option B: Using PowerShell with Execution Policy

1. Open a **NEW PowerShell as Administrator**
   - Right-click PowerShell
   - Select "Run as Administrator"

2. Enable script execution (one-time setup):
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. Navigate to the frontend directory:
   ```powershell
   cd C:\Users\EzzatBeshai\Desktop\galaxium-travels\booking_system_frontend
   ```

4. Install dependencies (first time only):
   ```powershell
   npm install
   ```

5. Start the development server:
   ```powershell
   npm run dev
   ```

### Step 3: Access the Application

Once the frontend starts, you'll see output like:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser and go to: **http://localhost:5173**

---

## 🧪 Testing the New Features

### Test 1: Infant Booking 🍼

1. Go to **Flights** page
2. Click **Book Now** on any flight
3. Enter your name and email (or use existing user)
4. In the booking modal, you'll see:
   - **Number of Adults** input (default: 1)
   - **Number of Infants** input (default: 0)
   - **Passenger Names** field (optional)
5. Try booking with:
   - 2 adults, 1 infant
   - Add passenger names like: "John Doe, Jane Doe, Baby Doe"
6. Click **Confirm Booking**
7. Check that the price is calculated for adults only

### Test 2: Modify Booking ✏️

1. Go to **My Bookings** page
2. Find an active booking (status: "booked")
3. Click the **Edit** button
4. In the edit modal, you can:
   - Change number of adults
   - Change number of infants
   - Update passenger names
5. Notice the seat difference indicator:
   - Green text if releasing seats
   - Warning if adding seats
6. Click **Update Booking**
7. Verify the booking is updated

### Test 3: View Passenger Details 👥

1. Go to **My Bookings** page
2. Look at any booking card
3. You'll see:
   - Adult count with 👥 icon
   - Infant count with 👶 icon (if any)
   - "Show Details" button
4. Click **Show Details** to see passenger names

---

## 🔍 Verify Backend Features

### Check API Documentation

Open: http://localhost:8080/docs

You should see new endpoints:
- `PUT /bookings/{booking_id}` - Update booking
- Updated `POST /book` - Now accepts num_adults, num_infants, passenger_names

### Test API Directly

#### Book with Infants:
```bash
curl -X POST http://localhost:8080/book \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": 1, \"name\": \"Alice\", \"flight_id\": 1, \"num_adults\": 2, \"num_infants\": 1, \"passenger_names\": \"Alice, Bob, Baby\"}"
```

#### Update Booking:
```bash
curl -X PUT http://localhost:8080/bookings/1 \
  -H "Content-Type: application/json" \
  -d "{\"num_adults\": 3, \"num_infants\": 2}"
```

---

## 🐛 Troubleshooting

### Frontend won't start?

**Check Node.js version:**
```cmd
node --version
```
Should be 18.x or higher.

**Clear cache and reinstall:**
```cmd
cd booking_system_frontend
rmdir /s /q node_modules
del package-lock.json
npm install
npm run dev
```

### Port already in use?

If port 5173 is busy:
```cmd
npm run dev -- --port 3000
```

### Backend not responding?

Check if it's running:
- Open http://localhost:8080 in browser
- Should show: `{"status":"OK"}`

If not running, restart it:
```cmd
cd booking_system_backend
.venv\Scripts\python.exe server.py
```

---

## 📱 What You Should See

### Home Page
- Space-themed UI with animated starfield
- "Browse Flights" and "My Bookings" buttons

### Flights Page
- List of available flights
- Search functionality
- "Book Now" buttons

### Booking Modal (NEW FEATURES!)
- Number of Adults input ⭐
- Number of Infants input ⭐
- Passenger Names field ⭐
- Real-time price calculation
- Seat availability check

### My Bookings Page
- Active bookings section
- Past bookings section
- **Edit button** on active bookings ⭐
- Passenger count display ⭐
- Expandable passenger details ⭐

### Edit Modal (NEW!)
- Current booking summary
- Update passenger counts
- Update passenger names
- Seat difference indicator
- Real-time validation

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Backend shows: `INFO: Uvicorn running on http://0.0.0.0:8080`
2. ✅ Frontend shows: `Local: http://localhost:5173/`
3. ✅ Browser opens to a space-themed booking system
4. ✅ You can book flights with infants
5. ✅ You can edit existing bookings
6. ✅ Passenger information displays correctly

---

## 🎉 Enjoy Testing!

All features are implemented and ready to test. Have fun exploring the new infant booking and modify booking features!

**Need help?** Check the main README.md or FEATURES_ADDED.md for more details.