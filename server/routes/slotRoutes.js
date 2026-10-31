import express from 'express';
import Slot from '../models/Slot.js';
import Booking from '../models/Booking.js';

const router = express.Router();

// Get all slots for a venue
router.get('/venue/:venueId', async (req, res) => {
  try {
    const slots = await Slot.find({ venueId: req.params.venueId })
      .populate('currentBookingId')
      .sort({ slotNumber: 1 });

    // Attach upcoming booking information for each slot
    const now = new Date();
    const enrichedSlots = await Promise.all(
      slots.map(async (slot) => {
        const upcoming = await Booking.find({
          slotId: slot._id,
          status: 'booked',
          startTime: { $gte: new Date(now.getTime() - 15 * 60000) }
        }).sort({ startTime: 1 }).limit(3);

        return {
          ...slot.toObject(),
          upcomingBookings: upcoming
        };
      })
    );

    res.json({ success: true, count: enrichedSlots.length, data: enrichedSlots });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Appoint slot status (vacant, occupied, reserved, maintenance)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, activeVehicleNumber } = req.body;
    if (!['vacant', 'occupied', 'reserved', 'maintenance'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid slot status' });
    }

    const slot = await Slot.findById(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });

    slot.status = status;
    slot.lastUpdated = new Date();

    if (status === 'vacant') {
      slot.activeVehicleNumber = '';
      slot.currentBookingId = null;
    } else if (activeVehicleNumber) {
      slot.activeVehicleNumber = activeVehicleNumber.toUpperCase();
    }

    await slot.save();

    res.json({
      success: true,
      message: `Slot ${slot.slotNumber} status manually updated to ${status}.`,
      data: slot
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get upcoming bookings for a specific slot
router.get('/:id/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const upcoming = await Booking.find({
      slotId: req.params.id,
      status: 'booked',
      startTime: { $gte: new Date(now.getTime() - 30 * 60000) }
    }).sort({ startTime: 1 });

    res.json({ success: true, count: upcoming.length, data: upcoming });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
