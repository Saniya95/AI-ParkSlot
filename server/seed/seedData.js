import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Slot from '../models/Slot.js';
import Booking from '../models/Booking.js';
import { generateQrCodes } from '../services/qrService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aiparkslot';

export const seedDatabase = async () => {
  try {
    const dbName = mongoose.connection.name || 'default';
    console.log(`🌱 Checking seed status in database '${dbName}'...`);

    // If venues already exist, skip seeding to preserve existing database records
    const venueCount = await Venue.countDocuments();
    if (venueCount > 0) {
      console.log(`ℹ️ Database '${dbName}' already contains ${venueCount} venues. Preserving all existing records.`);
      return;
    }

    console.log(`Seeding initial data for AI ParkSlot platform in '${dbName}'...`);

    // 1. Create Default Users (Admin & Driver) safely if they do not already exist
    const adminEmail = (process.env.ADMIN_EMAIL || 'aiparkingslotadmin@gmail.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'aiparkingslotadmin123';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      const hashedAdminPass = await bcrypt.hash(adminPassword, 10);
      admin = await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: hashedAdminPass,
        phone: '+91 98260 12345',
        role: 'admin',
        vehicleNumber: 'MP 04 AB 0001',
        vehicleType: 'car'
      });
    }

    let driver = await User.findOne({ email: 'user@aiparkslot.com' });
    if (!driver) {
      const userPassword = await bcrypt.hash('user123', 10);
      driver = await User.create({
        name: 'Rahul Sharma',
        email: 'user@aiparkslot.com',
        password: userPassword,
        phone: '+91 94250 98765',
        role: 'user',
        vehicleNumber: 'MP 04 CB 4521',
        vehicleType: 'car'
      });
    }

    // 2. Create Venues
    const venuesData = [
      {
        name: 'District Super-Specialty Hospital',
        category: 'hospital',
        address: 'Station Road, Near Civil Lines, Vidisha',
        city: 'Vidisha',
        totalSlots: 16,
        ratesPerHour: { car: 30, bike: 15, ev: 45, handicap: 20 },
        peakHours: ['09:00 - 13:00', '16:00 - 19:00'],
        operatingHours: '24/7 (Emergency Priority)',
        hasEVCharging: true,
        hasValet: true,
        description: 'Priority medical zone with direct ramp access to emergency ward and OPD consult suites.',
        imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=60'
      },
      {
        name: 'Metropolis Grand Galleria Mall',
        category: 'mall',
        address: 'Bhopal Bypass Highway, Commercial Zone',
        city: 'Vidisha',
        totalSlots: 20,
        ratesPerHour: { car: 50, bike: 20, ev: 70, handicap: 35 },
        peakHours: ['13:00 - 16:00', '18:00 - 22:00'],
        operatingHours: '10:00 AM - 11:30 PM',
        hasEVCharging: true,
        hasValet: true,
        description: 'Multi-level smart retail hub with dedicated ultra-fast 60kW EV charging bays and automated boom barriers.',
        imageUrl: 'https://images.unsplash.com/photo-1567449303078-57ad995bd301?w=800&auto=format&fit=crop&q=60'
      },
      {
        name: 'SATI Engineering Campus',
        category: 'campus',
        address: 'Samrat Ashok Technological Institute Campus',
        city: 'Vidisha',
        totalSlots: 16,
        ratesPerHour: { car: 20, bike: 10, ev: 30, handicap: 10 },
        peakHours: ['08:30 - 11:00', '13:00 - 14:00'],
        operatingHours: '07:00 AM - 08:00 PM',
        hasEVCharging: true,
        hasValet: false,
        description: 'Smart campus parking with ANPR automated gate verification for faculty and student vehicles.',
        imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=60'
      },
      {
        name: 'Apex Cyber City Tech Park',
        category: 'commercial',
        address: 'Sector 5, IT Corridor',
        city: 'Vidisha',
        totalSlots: 16,
        ratesPerHour: { car: 40, bike: 20, ev: 60, handicap: 25 },
        peakHours: ['09:00 - 11:00', '17:00 - 20:00'],
        operatingHours: '24/7',
        hasEVCharging: true,
        hasValet: false,
        description: 'Automated corporate commercial parking with reserved slots, sensor feedback, and digital QR permits.',
        imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60'
      }
    ];

    const venues = await Venue.insertMany(venuesData);
    console.log(`Created ${venues.length} venues.`);

    // 3. Create Slots for each venue
    for (const v of venues) {
      const slotDocs = [];
      const prefix = v.category === 'hospital' ? 'H' : v.category === 'mall' ? 'M' : v.category === 'campus' ? 'C' : 'T';

      for (let i = 1; i <= v.totalSlots; i++) {
        let type = 'car';
        let section = 'Zone A';
        let floor = 'Ground Floor';
        let distance = 10 + i * 5;

        if (i <= 2) {
          type = 'handicap';
          section = 'Priority Bay (Closest to Entrance)';
          distance = 5 + i * 3;
        } else if (i <= 5) {
          type = 'ev';
          section = 'EV Fast Charge Bay';
          distance = 15 + i * 4;
        } else if (i <= 8) {
          type = 'bike';
          section = 'Two-Wheeler Section';
          distance = 25 + i * 2;
        } else if (i > 12) {
          floor = 'Basement Level 1';
          section = 'Zone B';
          distance = 35 + i * 3;
        }

        slotDocs.push({
          slotNumber: `${prefix}-${i.toString().padStart(2, '0')}`,
          venueId: v._id,
          floor,
          section,
          type,
          distanceFromEntrance: distance,
          status: 'vacant',
          currentBookingId: null,
          activeVehicleNumber: ''
        });
      }

      const createdSlots = await Slot.insertMany(slotDocs);

      // Make demo bookings for the first venue for testing
      if (v === venues[0] && createdSlots.length > 4) {
        // Active occupied vehicle
        const occSlot = createdSlots[2];
        const occBookingCode = 'APS-' + Math.floor(100000 + Math.random() * 900000);
        const now = new Date();
        const checkInTime = new Date(now.getTime() - 45 * 60000); // checked in 45 mins ago

        const occQrs = await generateQrCodes({
          bookingCode: occBookingCode,
          slotNumber: occSlot.slotNumber,
          vehicleNumber: 'MP 04 ZB 8899',
          startTime: checkInTime.toISOString(),
          endTime: new Date(now.getTime() + 75 * 60000).toISOString(),
          venueId: v._id.toString()
        });

        const activeBooking = await Booking.create({
          bookingCode: occBookingCode,
          userId: driver._id,
          userName: 'Vikram Verma',
          userPhone: '+91 98930 11223',
          venueId: v._id,
          slotId: occSlot._id,
          slotNumber: occSlot.slotNumber,
          vehicleNumber: 'MP 04 ZB 8899',
          vehicleType: occSlot.type,
          startTime: checkInTime,
          endTime: new Date(now.getTime() + 75 * 60000),
          checkInTime: checkInTime,
          estimatedHours: 2,
          actualHours: 0.8,
          ratePerHour: v.ratesPerHour[occSlot.type] || 40,
          totalAmount: 80,
          finalAmount: 80,
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          status: 'active',
          entryQrData: occQrs.entryQrData,
          exitQrData: occQrs.exitQrData,
          entryQrImage: occQrs.entryQrImage,
          exitQrImage: occQrs.exitQrImage,
          checkedInBy: 'Auto Gate Scanner 1'
        });

        occSlot.status = 'occupied';
        occSlot.currentBookingId = activeBooking._id;
        occSlot.activeVehicleNumber = 'MP 04 ZB 8899';
        await occSlot.save();

        // Also add an upcoming booking scheduled right after for this slot!
        // This is to test the exact requirement: "the area will be marked as vacant only if there is no upcoming booking on that place."
        const upcomingBookingCode = 'APS-' + Math.floor(100000 + Math.random() * 900000);
        const upQrs = await generateQrCodes({
          bookingCode: upcomingBookingCode,
          slotNumber: occSlot.slotNumber,
          vehicleNumber: 'MP 04 CD 3344',
          startTime: new Date(now.getTime() + 90 * 60000).toISOString(),
          endTime: new Date(now.getTime() + 210 * 60000).toISOString(),
          venueId: v._id.toString()
        });

        await Booking.create({
          bookingCode: upcomingBookingCode,
          userId: driver._id,
          userName: 'Dr. Palak Rajput',
          userPhone: '+91 97550 44332',
          venueId: v._id,
          slotId: occSlot._id,
          slotNumber: occSlot.slotNumber,
          vehicleNumber: 'MP 04 CD 3344',
          vehicleType: occSlot.type,
          startTime: new Date(now.getTime() + 90 * 60000),
          endTime: new Date(now.getTime() + 210 * 60000),
          estimatedHours: 2,
          ratePerHour: v.ratesPerHour[occSlot.type] || 40,
          totalAmount: 80,
          finalAmount: 80,
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          status: 'booked',
          entryQrData: upQrs.entryQrData,
          exitQrData: upQrs.exitQrData,
          entryQrImage: upQrs.entryQrImage,
          exitQrImage: upQrs.exitQrImage
        });

        // Reserved slot (upcoming user arriving in 15 mins)
        const resSlot = createdSlots[4];
        const resBookingCode = 'APS-' + Math.floor(100000 + Math.random() * 900000);
        const resQrs = await generateQrCodes({
          bookingCode: resBookingCode,
          slotNumber: resSlot.slotNumber,
          vehicleNumber: 'MP 04 CB 4521',
          startTime: new Date(now.getTime() + 15 * 60000).toISOString(),
          endTime: new Date(now.getTime() + 135 * 60000).toISOString(),
          venueId: v._id.toString()
        });

        const reservedBooking = await Booking.create({
          bookingCode: resBookingCode,
          userId: driver._id,
          userName: 'Rahul Sharma',
          userPhone: '+91 94250 98765',
          venueId: v._id,
          slotId: resSlot._id,
          slotNumber: resSlot.slotNumber,
          vehicleNumber: 'MP 04 CB 4521',
          vehicleType: resSlot.type,
          startTime: new Date(now.getTime() + 15 * 60000),
          endTime: new Date(now.getTime() + 135 * 60000),
          estimatedHours: 2,
          ratePerHour: v.ratesPerHour[resSlot.type] || 40,
          totalAmount: 80,
          finalAmount: 80,
          paymentStatus: 'paid',
          paymentMethod: 'FastTag',
          status: 'booked',
          entryQrData: resQrs.entryQrData,
          exitQrData: resQrs.exitQrData,
          entryQrImage: resQrs.entryQrImage,
          exitQrImage: resQrs.exitQrImage
        });

        resSlot.status = 'reserved';
        resSlot.currentBookingId = reservedBooking._id;
        resSlot.activeVehicleNumber = 'MP 04 CB 4521';
        await resSlot.save();
      }
    }

    console.log('🎉 Seed database completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  }
};
