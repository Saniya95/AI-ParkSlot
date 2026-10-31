import express from 'express';
import Booking from '../models/Booking.js';
import Slot from '../models/Slot.js';
import Venue from '../models/Venue.js';
import { generateQrCodes } from '../services/qrService.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create a new booking (Protected: requires authenticated user)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      venueId,
      slotId,
      vehicleNumber,
      vehicleType = 'car',
      startTime,
      estimatedHours = 2,
      paymentMethod = 'UPI'
    } = req.body;

    const userId = req.user._id;
    const userName = req.body.userName || req.user.name;
    const userPhone = req.body.userPhone || req.user.phone;

    if (!venueId || !slotId || !vehicleNumber || !startTime) {
      return res.status(400).json({ success: false, message: 'Missing required booking fields.' });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found.' });

    const slot = await Slot.findById(slotId);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found.' });

    // Calculate rates
    const rate = venue.ratesPerHour[vehicleType] || venue.ratesPerHour.car || 40;
    const totalAmount = rate * Number(estimatedHours);

    const start = new Date(startTime);
    const end = new Date(start.getTime() + Number(estimatedHours) * 60 * 60 * 1000);

    // Fix: Accurate interval intersection check (S_old < E_new && E_old > S_new)
    const conflict = await Booking.findOne({
      slotId,
      status: { $in: ['booked', 'active'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Slot ${slot.slotNumber} already has an overlapping active or upcoming reservation during that window (${new Date(conflict.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(conflict.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}). Please select another slot or use AI Recommendations.`
      });
    }

    // Generate unique booking code
    const randomCode = 'APS-' + Math.floor(100000 + Math.random() * 900000);

    // Generate Dual QR Codes (Entry and Exit)
    const { entryQrData, exitQrData, entryQrImage, exitQrImage } = await generateQrCodes({
      bookingCode: randomCode,
      slotNumber: slot.slotNumber,
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      venueId: venue._id.toString()
    });

    const booking = await Booking.create({
      bookingCode: randomCode,
      userId: userId || '60d0fe4f5311236168a109ca', // fallback if guest
      userName: userName || 'Guest Driver',
      userPhone: userPhone || '',
      venueId,
      slotId,
      slotNumber: slot.slotNumber,
      vehicleNumber: vehicleNumber.toUpperCase().trim(),
      vehicleType,
      startTime: start,
      endTime: end,
      estimatedHours: Number(estimatedHours),
      ratePerHour: rate,
      totalAmount,
      finalAmount: totalAmount,
      paymentStatus: 'paid',
      paymentMethod,
      status: 'booked',
      gracePeriodMinutes: 30,
      entryQrData,
      exitQrData,
      entryQrImage,
      exitQrImage
    });

    // Fix: The slot is IMMEDIATELY marked as 'reserved' while the user is at home/driving!
    // This ensures no one else sees it as vacant or tries to take it before entry QR is scanned.
    const now = new Date();
    if (slot.status === 'vacant') {
      slot.status = 'reserved';
      slot.currentBookingId = booking._id;
      slot.activeVehicleNumber = booking.vehicleNumber;
      slot.lastUpdated = now;
      await slot.save();
    }

    res.status(201).json({
      success: true,
      message: `Reservation confirmed for Slot ${slot.slotNumber}! Slot is now securely RESERVED on hold. Dual QR passes generated.`,
      booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get bookings for a user (Protected: own bookings or admin)
router.get('/user/:userId', requireAuth, async (req, res) => {
  try {
    if (String(req.user._id) !== String(req.params.userId) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view your own bookings.' });
    }

    const bookings = await Booking.find({ userId: req.params.userId })
      .populate('venueId')
      .populate('slotId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get bookings (Admins see all; Regular users see only their own)
router.get('/', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      // Unauthenticated visitors do not have private bookings
      return res.json({ success: true, count: 0, data: [] });
    }

    const filter = {};
    if (req.user.role !== 'admin') {
      filter.userId = req.user._id;
    } else {
      const { status, venueId } = req.query;
      if (status) filter.status = status;
      if (venueId) filter.venueId = venueId;
    }

    const bookings = await Booking.find(filter)
      .populate('venueId')
      .populate('slotId')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single booking by bookingCode
router.get('/:code', async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingCode: req.params.code })
      .populate('venueId')
      .populate('slotId');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel a booking (Protected: owner or admin)
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (String(booking.userId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. You cannot cancel someone else\'s reservation.' });
    }

    if (booking.status === 'active' || booking.status === 'completed') {
      return res.status(400).json({ success: false, message: `Cannot cancel a booking that is ${booking.status}.` });
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    // Check if slot was reserved for this booking; if so, restore to vacant unless another upcoming booking exists
    const slot = await Slot.findById(booking.slotId);
    if (slot && slot.status === 'reserved' && String(slot.currentBookingId) === String(booking._id)) {
      const nextBooking = await Booking.findOne({
        slotId: slot._id,
        status: 'booked',
        _id: { $ne: booking._id },
        startTime: { $gte: new Date(Date.now() - 30 * 60000) }
      }).sort({ startTime: 1 });

      if (nextBooking) {
        slot.currentBookingId = nextBooking._id;
        slot.activeVehicleNumber = nextBooking.vehicleNumber;
        slot.status = 'reserved';
      } else {
        slot.status = 'vacant';
        slot.currentBookingId = null;
        slot.activeVehicleNumber = '';
      }
      await slot.save();
    }

    res.json({
      success: true,
      message: `Booking ${booking.bookingCode} has been cancelled and refunded.`,
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Reassign an upcoming booking to a different vacant slot
router.post('/:id/reassign', requireAdmin, async (req, res) => {
  try {
    const { newSlotId } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.status !== 'booked') {
      return res.status(400).json({ success: false, message: `Only upcoming 'booked' reservations can be reassigned. Current status is ${booking.status}.` });
    }

    const newSlot = await Slot.findById(newSlotId);
    if (!newSlot) return res.status(404).json({ success: false, message: 'New slot not found.' });

    // Check conflict on new slot
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      slotId: newSlot._id,
      status: { $in: ['booked', 'active'] },
      startTime: { $lt: booking.endTime },
      endTime: { $gt: booking.startTime }
    });

    if (conflict) {
      return res.status(409).json({ success: false, message: `Slot ${newSlot.slotNumber} has a conflicting booking during that time window.` });
    }

    const oldSlotId = booking.slotId;
    booking.slotId = newSlot._id;
    booking.slotNumber = newSlot.slotNumber;

    // Regenerate QR codes with new slot number
    const { entryQrData, exitQrData, entryQrImage, exitQrImage } = await generateQrCodes({
      bookingCode: booking.bookingCode,
      slotNumber: newSlot.slotNumber,
      vehicleNumber: booking.vehicleNumber,
      startTime: booking.startTime.toISOString(),
      endTime: booking.endTime.toISOString(),
      venueId: booking.venueId.toString()
    });

    booking.entryQrData = entryQrData;
    booking.exitQrData = exitQrData;
    booking.entryQrImage = entryQrImage;
    booking.exitQrImage = exitQrImage;
    await booking.save();

    // Mark new slot as reserved if vacant
    if (newSlot.status === 'vacant') {
      newSlot.status = 'reserved';
      newSlot.currentBookingId = booking._id;
      newSlot.activeVehicleNumber = booking.vehicleNumber;
      await newSlot.save();
    }

    // Restore old slot if it was reserved for this booking
    const oldSlot = await Slot.findById(oldSlotId);
    if (oldSlot && oldSlot.status === 'reserved' && String(oldSlot.currentBookingId) === String(booking._id)) {
      const nextBooking = await Booking.findOne({
        slotId: oldSlot._id,
        status: 'booked',
        _id: { $ne: booking._id },
        endTime: { $gt: new Date() }
      }).sort({ startTime: 1 });

      if (nextBooking) {
        oldSlot.currentBookingId = nextBooking._id;
        oldSlot.activeVehicleNumber = nextBooking.vehicleNumber;
        oldSlot.status = 'reserved';
      } else {
        oldSlot.status = 'vacant';
        oldSlot.currentBookingId = null;
        oldSlot.activeVehicleNumber = '';
      }
      await oldSlot.save();
    }

    res.json({
      success: true,
      message: `Booking ${booking.bookingCode} successfully reassigned to Slot ${newSlot.slotNumber}. Dual QR passes re-issued.`,
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
