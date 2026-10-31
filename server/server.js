import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import venueRoutes from './routes/venueRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import scanRoutes from './routes/scanRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { seedDatabase } from './seed/seedData.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Database Connection Status Tracker
let dbConnectionError = null;
let isSeeded = false;

// Health Check & Root Endpoints
app.get(['/', '/api'], (req, res) => {
  res.json({
    status: mongoose.connection.readyState === 1 ? 'ONLINE' : 'DEGRADED',
    message: 'AI ParkSlot API Server is active! Visit http://localhost:3000 for the Frontend UI.',
    mongoConnected: mongoose.connection.readyState === 1,
    endpoints: {
      health: '/api/health',
      venues: '/api/venues',
      slots: '/api/slots',
      bookings: '/api/bookings',
      ai: '/api/ai',
      admin: '/api/admin'
    }
  });
});

app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isConnected ? 'ONLINE' : 'DATABASE_OFFLINE',
    project: 'AI ParkSlot - AI-Integrated Parking Slot Booking Platform',
    timestamp: new Date(),
    mongoConnected: isConnected,
    database: isConnected ? mongoose.connection.name : 'aiparkingslot',
    host: isConnected ? mongoose.connection.host : null,
    dbError: isConnected ? null : dbConnectionError
  });
});

// Guard API routes: return clean JSON 503 if database is disconnected instead of unhandled timeouts
app.use('/api', (req, res, next) => {
  if (req.path === '/health' || req.path === '/ai/chat') return next();
  if (mongoose.connection.readyState !== 1) {
    console.error(`[AI Database Error] operation=api_guard path=${req.path} readyState=${mongoose.connection.readyState} message="Database connection unavailable"`);
    return res.status(503).json({
      success: false,
      message: 'Live parking information is temporarily unavailable. Please try again in a moment.',
      error: 'DATABASE_UNAVAILABLE'
    });
  }
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Process safety handlers
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// MongoDB Connection & Seeder
const connectDB = async () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return true;

  const mongoUri = process.env.MONGO_URI;

  if (mongoUri && process.env.USE_IN_MEMORY_DB !== 'true') {
    try {
      await mongoose.connect(mongoUri, { 
        dbName: 'aiparkingslot',
        serverSelectionTimeoutMS: 5000 
      });
      const isAtlas = mongoUri.includes('mongodb.net') || mongoUri.startsWith('mongodb+srv://');
      console.log(`✅ Connected securely to MongoDB ${isAtlas ? 'Atlas cluster' : 'database'} (${mongoose.connection.host}/${mongoose.connection.name})!`);
      dbConnectionError = null;

      if (!isSeeded) {
        await seedDatabase();
        isSeeded = true;
      }
      return true;
    } catch (err) {
      dbConnectionError = err.message;
      console.error('❌ ==============================================================================');
      console.error('❌ Failed to connect to MongoDB Atlas:');
      console.error(`❌ Error: ${err.message}`);
      if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
        console.error('❌ Reason: Authentication failed. The database username or password in server/.env is incorrect.');
        console.error('❌ Action: Check Database Access in MongoDB Atlas console, verify username/password, and update server/.env.');
      } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo') || err.message.includes('querySrv')) {
        console.error('❌ Reason: DNS or cluster hostname resolution failed. Check your internet connection or cluster host.');
      } else if (err.message.includes('whitelist') || err.message.includes('ETIMEDOUT') || err.message.includes('connection timed out')) {
        console.error('❌ Reason: IP address not allowed. In MongoDB Atlas Network Access, add 0.0.0.0/0 or your current IP.');
      }
      console.error('❌ Express server remains active on port 5000 to serve status and handle requests safely.');
      console.error('❌ Retrying database connection in the background...');
      console.error('❌ ==============================================================================');
      return false;
    }
  }

  // Check if developer explicitly opted in to temporary in-memory database
  if (process.env.USE_IN_MEMORY_DB === 'true') {
    console.warn('⚠️ ==============================================================================');
    console.warn('⚠️ WARNING: USE_IN_MEMORY_DB=true is enabled.');
    console.warn('⚠️ Running with an ephemeral, in-memory database (mongodb-memory-server).');
    console.warn('⚠️ ALL DATA WILL BE ERASED WHEN THE SERVER EXITS OR RESTARTS!');
    console.warn('⚠️ To persist data, set MONGO_URI in server/.env to your MongoDB Atlas cluster.');
    console.warn('⚠️ ==============================================================================');
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      await mongoose.connect(mongod.getUri(), { dbName: 'aiparkingslot' });
      console.log('✅ Connected to temporary in-memory database engine.');
      dbConnectionError = null;
      if (!isSeeded) {
        await seedDatabase();
        isSeeded = true;
      }
      return true;
    } catch (memErr) {
      dbConnectionError = memErr.message;
      console.error('❌ Failed to start in-memory database engine:', memErr.message);
      return false;
    }
  }

  // Check if local MongoDB is available
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/aiparkingslot', { serverSelectionTimeoutMS: 2000 });
    console.log('✅ Connected to local MongoDB on port 27017!');
    dbConnectionError = null;
    if (!isSeeded) {
      await seedDatabase();
      isSeeded = true;
    }
    return true;
  } catch (localErr) {
    // Local MongoDB not available
  }

  dbConnectionError = 'No MongoDB instance available. Set MONGO_URI in server/.env.';
  console.error('❌ ==============================================================================');
  console.error('❌ MongoDB Connection Error: No persistent database configured!');
  console.error('❌ MONGO_URI is missing or unauthenticated in server/.env.');
  console.error('❌ Express server remains active to serve error diagnostics.');
  console.error('❌ ==============================================================================');
  return false;
};

// Initial DB connection attempt
await connectDB();

// Periodic background DB reconnection retry every 15 seconds if disconnected
setInterval(async () => {
  if (mongoose.connection.readyState !== 1 && process.env.USE_IN_MEMORY_DB !== 'true') {
    await connectDB();
  }
}, 15000);

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 AI ParkSlot API Server running on port ${PORT}`);
  console.log(`📡 Base API endpoint: http://localhost:${PORT}/api`);
});

// Background Reservation Auto-Expiry & Slot Release Worker (Every 30 seconds)
import Booking from './models/Booking.js';
import Slot from './models/Slot.js';

setInterval(async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const now = new Date();

    // Check for bookings where scheduled window + grace period (30 mins) passed without checking in
    const expiredBookings = await Booking.find({
      status: 'booked',
      endTime: { $lt: now }
    });

    for (const b of expiredBookings) {
      b.status = 'no_show';
      await b.save();

      // Check slot status
      const slot = await Slot.findById(b.slotId);
      if (slot && slot.status === 'reserved' && String(slot.currentBookingId) === String(b._id)) {
        const nextBooking = await Booking.findOne({
          slotId: slot._id,
          status: 'booked',
          endTime: { $gt: now }
        }).sort({ startTime: 1 });

        if (nextBooking) {
          slot.status = 'reserved';
          slot.currentBookingId = nextBooking._id;
          slot.activeVehicleNumber = nextBooking.vehicleNumber;
        } else {
          slot.status = 'vacant';
          slot.currentBookingId = null;
          slot.activeVehicleNumber = '';
        }
        slot.lastUpdated = now;
        await slot.save();
        console.log(`⏱️ Auto-released expired no-show reservation ${b.bookingCode} on slot ${slot.slotNumber}`);
      }
    }
  } catch (err) {
    // Non-blocking log
  }
}, 30000);
