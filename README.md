# AI ParkSlot – AI-Integrated Parking Slot Booking Platform
**Minor Project (Session 2026-27)**  
*Samrat Ashok Technological Institute (SATI), Vidisha (M.P.)*  
*Department of Electronics & Communication Engineering*  
*Developed by: Saniya Ahmed (0108EI221003) & Palak Rajput (0108EC221039)*  
*Guides: Dr. Neelesh Mehra, Dr. Abhishek Jain, Dr. Ashutosh Datar, Dr. Y.K. Jain*

---

## 🌟 Project Purpose & Problem Solved
People resting at home planning to visit hospitals, shopping malls, educational campuses, or commercial tech hubs often face heavy congestion, wasted fuel, and high anxiety finding vacant parking. 

**AI ParkSlot** is a full-stack **MERN + AI** platform where users can:
1. Search destinations and check live slot availability while sitting comfortably at home.
2. Receive **AI-driven slot recommendations** based on vehicle type, EV charging needs, and shortest distance to destination/emergency OPD gates.
3. Pre-book and receive **Dedicated Dual QR Passes** (Entry QR + Exit QR).
4. Automated barrier gate checking:
   - **Entry QR**: Scanned upon arrival to open the barrier and mark the slot as **Occupied**.
   - **Exit QR**: Scanned on departure to settle parking payment according to time occupied.
   - **Smart Reservation Handover**: When the Exit QR is scanned, the space is **marked as Vacant ONLY if there is no upcoming booking on that slot**. If an upcoming booking exists, it automatically transitions to **Reserved** for the next incoming driver!
5. **Central Admin Management Dashboard**: Full authority to appoint slots as vacant/occupied/reserved, monitor parked vehicle timers with live running costs, and adjust dynamic tariffs.
6. **AI Features**: 24-hour demand prediction histogram, automatic license plate recognition (ALPR), and interactive AI virtual assistant.

---

## 🎨 Theme & Visual Design
- **Dark Theme with Greyish Contrast & Content**:
  - Deep dark background (`#0a0d14` / `#111622`)
  - Greyish card containers (`#161c2b` / `#1e2638`) with subtle slate borders (`#242c3e`)
  - Greyish muted typography (`#94a3b8` / `#cbd5e1`) with crisp white highlights
  - Soft glowing status badges:
    - 🟢 **Vacant**: Soft Emerald Green
    - 🟡 **Reserved**: Amber / Warm Gold
    - 🔴 **Occupied**: Crimson Rose
    - 🔵 **AI Recommender & Forecast**: Cyan / Electric Blue

---

## 🚀 Technology Stack
- **Database**: MongoDB Atlas (`aiparkingslot` cloud cluster via Mongoose)
- **Backend API**: Node.js & Express.js (RESTful APIs, JWT, CORS, QRCode engine)
- **Frontend**: React.js 19 + Vite (Lucide Icons, responsive CSS design tokens)
- **AI Microservices**: 
  - Demand Forecasting Engine (24-hour occupancy regression curve & peak window detection)
  - Intelligent Slot Scoring & Recommendation Algorithm
  - Automatic License Plate Recognition (ALPR/OCR) matcher
  - AI Context-Aware Virtual Assistant Chatbot

---

## 📁 Repository Structure
```
d:\aiparkingslot\
├── client/                     # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Brand, navigation tabs, system status
│   │   │   ├── VenueList.jsx            # Destination cards with live vacancy bars
│   │   │   ├── SlotGrid.jsx             # 2D interactive floor plan & AI Recommender
│   │   │   ├── BookingModal.jsx         # Booking form & Dual QR generator
│   │   │   ├── MyBookings.jsx           # Digital passes with one-click test scan
│   │   │   ├── GateKiosk.jsx            # Entry, Exit, and ALPR Gate Barrier Terminals
│   │   │   ├── AdminDashboard.jsx       # Slot state appointer & live vehicle timer
│   │   │   ├── AiChatbotModal.jsx       # Real-time intelligent parking chatbot
│   │   │   └── DemandForecastModal.jsx  # 24-Hour AI demand prediction histogram
│   │   ├── App.jsx                      # Main app controller
│   │   └── index.css                    # Dark theme CSS design system
│   └── vite.config.js                   # Vite configuration with API proxy
├── server/                     # Express Backend
│   ├── models/
│   │   ├── Venue.js                     # Hospitals, Malls, Campuses, Tech Parks
│   │   ├── Slot.js                      # Slot details, floor, type, status, active vehicle
│   │   ├── Booking.js                   # Booking records, dual QR payloads, payment status
│   │   ├── User.js                      # Driver & Admin profiles
│   │   └── AnalyticsLog.js              # Historical records for AI forecasting
│   ├── routes/
│   │   ├── authRoutes.js                # Register, login, profile
│   │   ├── venueRoutes.js               # Destinations with live vacancy stats
│   │   ├── slotRoutes.js                # Slot data & admin status overrides
│   │   ├── bookingRoutes.js             # Booking creation & dual QR issuance
│   │   ├── scanRoutes.js                # Entry & Exit scanner with upcoming booking check
│   │   ├── aiRoutes.js                  # Demand forecast, AI recommender, ALPR, chatbot
│   │   └── adminRoutes.js               # Admin KPI stats, active vehicle timers, tariffs
│   ├── services/
│   │   ├── aiService.js                 # Prediction, recommendation, and ALPR engines
│   │   └── qrService.js                 # Cryptographic barcode generation
│   ├── seed/
│   │   └── seedData.js                  # Initial venues, slots, and demo bookings
│   ├── server.js                        # Express server entry point
│   └── .env                             # MongoDB Atlas connection string & secrets
└── README.md
```

---

## 💻 How to Run Locally

### 1. Backend Server
```bash
cd d:\aiparkingslot\server
npm install
node server.js
```
- Server runs on: `http://localhost:5000`
- API Root: `http://localhost:5000/api`

### 2. Frontend Client
```bash
cd d:\aiparkingslot\client
npm install
npm run dev
```
- Client runs on: `http://localhost:3000`

---

## 🧪 Testing the Live System

1. **Book Parking from Home**:
   - Open `http://localhost:3000`.
   - Click on **District Super-Specialty Hospital** or **Metropolis Grand Galleria Mall**.
   - Click **"⚡ Find Best Slot"** to test the AI Recommendation engine.
   - Click any vacant slot, type your vehicle plate (e.g. `MP 04 CB 9999`), and confirm booking.
   - Observe the **Dual QR Codes** displayed (Green Entry QR & Red Exit QR).

2. **Simulate Gate Entry**:
   - Go to **Gate Kiosk** tab or click **"Simulate Entry"** on your pass.
   - The boom barrier opens, welcoming the driver, and marks the slot as **Occupied**.

3. **Simulate Gate Exit & Upcoming Booking Logic**:
   - Click **"Simulate Exit"**.
   - The exit terminal calculates parked duration and settles payment.
   - If no upcoming booking is scheduled on that slot, it turns **Vacant**.
   - If an upcoming booking is scheduled, it automatically turns **Reserved** for the next guest!

4. **Admin Dashboard**:
   - Open **Admin Command** tab.
   - View real-time active parkings with live minute timers and running fees.
   - Click any slot to manually appoint its state (`Vacant`, `Occupied`, `Reserved`, `Maintenance`).
   - Adjust hourly tariff rates dynamically.

5. **AI Assistant & Demand Forecast**:
   - Click **"Ask AI Assistant"** floating button at the bottom right.
   - Ask questions like: *"Are there vacant spots right now?"* or *"How does the Entry and Exit QR work?"*
   - Click **"AI Forecast"** on any venue card to view the 24-hour occupancy prediction curve.
