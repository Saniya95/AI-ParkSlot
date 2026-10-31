import express from 'express';
import Booking from '../models/Booking.js';
import Slot from '../models/Slot.js';
import Venue from '../models/Venue.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce admin authorization for gate barrier scanner kiosks
router.use(requireAdmin);

/**
 * Entry QR Scanner Endpoint
 * Scanned on entering the parking facility
 */
router.post('/entry', async (req, res) => {
  try {
    const { qrData, bookingCode, vehicleNumber } = req.body;

    let targetCode = bookingCode;
    let targetPlate = vehicleNumber;

    if (qrData) {
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.type === 'EXIT') {
          return res.status(400).json({
            success: false,
            message: 'QR TYPE MISMATCH: This is an EXIT QR Pass. Please scan your dedicated ENTRY QR at this entrance terminal.'
          });
        }
        if (parsed.type === 'ENTRY') {
          targetCode = parsed.bookingCode;
          targetPlate = parsed.vehicleNumber;
        }
      } catch (e) {
        // Raw string format
        targetCode = qrData;
      }
    }

    if (!targetCode && !targetPlate) {
      return res.status(400).json({ success: false, message: 'Please provide QR data, Booking Code, or Vehicle Number.' });
    }

    // Find the booking
    const query = { status: { $in: ['booked', 'active'] } };
    if (targetCode) query.bookingCode = targetCode.trim();
    else if (targetPlate) query.vehicleNumber = targetPlate.trim().toUpperCase();

    const booking = await Booking.findOne(query).populate('venueId').populate('slotId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'No active or upcoming reservation found matching this Entry QR / Vehicle Plate.'
      });
    }

    const now = new Date();

    // Check if reservation has completely expired (past end time + grace period)
    const graceMs = (booking.gracePeriodMinutes || 30) * 60000;
    if (booking.status === 'booked' && now.getTime() > new Date(booking.endTime).getTime() + graceMs) {
      booking.status = 'expired';
      await booking.save();
      return res.status(400).json({
        success: false,
        message: `Reservation Expired: Your booked slot window ended at ${new Date(booking.endTime).toLocaleTimeString()}. Please create a new reservation.`
      });
    }

    if (booking.status === 'active') {
      return res.status(200).json({
        success: true,
        alreadyActive: true,
        message: `Vehicle ${booking.vehicleNumber} is already checked in to Slot ${booking.slotNumber}.`,
        booking,
        slot: booking.slotId
      });
    }

    // Check in the vehicle
    booking.status = 'active';
    booking.checkInTime = now;
    booking.checkedInBy = req.body.operator || 'Kiosk Automated Scanner';
    await booking.save();

    // Mark slot as occupied
    const slot = await Slot.findById(booking.slotId._id || booking.slotId);
    if (slot) {
      slot.status = 'occupied';
      slot.currentBookingId = booking._id;
      slot.activeVehicleNumber = booking.vehicleNumber;
      slot.lastUpdated = now;
      await slot.save();
    }

    return res.status(200).json({
      success: true,
      message: `ENTRY VERIFIED: Barrier Open! Welcome ${booking.userName}. Proceed to Slot ${booking.slotNumber} (${slot?.floor || 'Ground'}, ${slot?.section || 'Zone A'}).`,
      booking,
      slot
    });
  } catch (error) {
    console.error('Scan Entry Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Exit QR Scanner Endpoint
 * Scanned on exiting the parking facility
 * RULE: The area will be marked as VACANT only if there is no upcoming booking on that place!
 */
router.post('/exit', async (req, res) => {
  try {
    const { qrData, bookingCode, vehicleNumber } = req.body;

    let targetCode = bookingCode;
    let targetPlate = vehicleNumber;

    if (qrData) {
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.type === 'ENTRY') {
          return res.status(400).json({
            success: false,
            message: 'QR TYPE MISMATCH: This is an ENTRY QR Pass. Please scan your dedicated EXIT QR at this exit terminal.'
          });
        }
        if (parsed.type === 'EXIT') {
          targetCode = parsed.bookingCode;
          targetPlate = parsed.vehicleNumber;
        }
      } catch (e) {
        targetCode = qrData;
      }
    }

    if (!targetCode && !targetPlate) {
      return res.status(400).json({ success: false, message: 'Please provide QR data, Booking Code, or Vehicle Number.' });
    }

    const query = { status: 'active' };
    if (targetCode) query.bookingCode = targetCode.trim();
    else if (targetPlate) query.vehicleNumber = targetPlate.trim().toUpperCase();

    const booking = await Booking.findOne(query).populate('venueId').populate('slotId');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'No currently ACTIVE check-in found matching this Exit QR / Vehicle Plate.'
      });
    }

    const now = new Date();
    booking.status = 'completed';
    booking.checkOutTime = now;
    booking.checkedOutBy = req.body.operator || 'Exit Gate Automated Scanner';

    // Calculate actual hours & payment according to time occupied
    const checkIn = new Date(booking.checkInTime || booking.startTime);
    const durationMs = Math.max(0, now.getTime() - checkIn.getTime());
    const durationHours = Math.max(0.5, Math.ceil(durationMs / (1000 * 60 * 60) * 10) / 10);
    booking.actualHours = durationHours;

    // Overtime calculation if actual occupied time exceeds booked estimated hours
    let overtimeFee = 0;
    if (durationHours > booking.estimatedHours) {
      const extraHours = Math.ceil(durationHours - booking.estimatedHours);
      overtimeFee = extraHours * (booking.ratePerHour || 40);
    }
    booking.overtimeFee = overtimeFee;
    booking.finalAmount = booking.totalAmount + overtimeFee;
    booking.paymentStatus = 'settled';
    await booking.save();

    // Check Slot & Check if there is an upcoming booking on this slot
    const slot = await Slot.findById(booking.slotId._id || booking.slotId);
    let nextSlotStatus = 'vacant';
    let upcomingBooking = null;

    if (slot) {
      // Find upcoming bookings on this slot scheduled for today / near future
      upcomingBooking = await Booking.findOne({
        slotId: slot._id,
        status: 'booked',
        startTime: { $gte: new Date(now.getTime() - 30 * 60000) } // within reasonable window
      }).sort({ startTime: 1 });

      if (upcomingBooking) {
        // Mark as RESERVED for upcoming user
        slot.status = 'reserved';
        slot.currentBookingId = upcomingBooking._id;
        slot.activeVehicleNumber = upcomingBooking.vehicleNumber;
        slot.lastUpdated = now;
        nextSlotStatus = 'reserved';
        await slot.save();
      } else {
        // Mark as VACANT because no upcoming booking exists
        slot.status = 'vacant';
        slot.currentBookingId = null;
        slot.activeVehicleNumber = '';
        slot.lastUpdated = now;
        nextSlotStatus = 'vacant';
        await slot.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `EXIT VERIFIED: Thank you for visiting! Slot ${booking.slotNumber} is now marked as ${nextSlotStatus.toUpperCase()}${upcomingBooking ? ` (reserved for upcoming booking ${upcomingBooking.bookingCode})` : ' (ready for new visitors)'}.`,
      booking: {
        bookingCode: booking.bookingCode,
        vehicleNumber: booking.vehicleNumber,
        slotNumber: booking.slotNumber,
        checkInTime: booking.checkInTime,
        checkOutTime: booking.checkOutTime,
        actualHours: booking.actualHours,
        totalAmount: booking.totalAmount,
        overtimeFee: booking.overtimeFee,
        finalAmount: booking.finalAmount,
        paymentStatus: booking.paymentStatus
      },
      slotStatusAfterExit: nextSlotStatus,
      upcomingBookingSummary: upcomingBooking ? {
        bookingCode: upcomingBooking.bookingCode,
        userName: upcomingBooking.userName,
        startTime: upcomingBooking.startTime
      } : null
    });
  } catch (error) {
    console.error('Scan Exit Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
