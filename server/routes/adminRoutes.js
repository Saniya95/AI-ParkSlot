import express from 'express';
import Venue from '../models/Venue.js';
import Slot from '../models/Slot.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Enforce administrator role authorization for all admin endpoints
router.use(requireAdmin);

// Admin Dashboard Summary Statistics
router.get('/stats', async (req, res) => {
  try {
    const totalVenues = await Venue.countDocuments();
    const totalSlots = await Slot.countDocuments();
    const vacantSlots = await Slot.countDocuments({ status: 'vacant' });
    const occupiedSlots = await Slot.countDocuments({ status: 'occupied' });
    const reservedSlots = await Slot.countDocuments({ status: 'reserved' });
    const maintenanceSlots = await Slot.countDocuments({ status: 'maintenance' });

    const totalUsers = await User.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: 'active' });
    const upcomingBookings = await Booking.countDocuments({ status: 'booked' });
    const completedBookings = await Booking.countDocuments({ status: 'completed' });

    // Calculate total revenue
    const revenueAggregation = await Booking.aggregate([
      { $match: { paymentStatus: { $in: ['paid', 'settled'] } } },
      { $group: { _id: null, totalRevenue: { $sum: '$finalAmount' } } }
    ]);
    const totalRevenue = revenueAggregation[0]?.totalRevenue || 0;

    // Active vehicles currently inside parking with live calculated timer & bill
    const activeVehicles = await Booking.find({ status: 'active' })
      .populate('venueId', 'name category')
      .populate('slotId', 'slotNumber floor section');

    const now = new Date();
    const enrichedActive = activeVehicles.map(b => {
      const checkIn = new Date(b.checkInTime || b.startTime);
      const minutesParked = Math.max(1, Math.round((now.getTime() - checkIn.getTime()) / 60000));
      const hoursDecimal = Math.max(0.5, Math.ceil(minutesParked / 6) / 10);
      const liveEstimatedCost = Math.round(hoursDecimal * (b.ratePerHour || 40));

      return {
        ...b.toObject(),
        minutesParked,
        liveEstimatedCost
      };
    });

    res.json({
      success: true,
      stats: {
        totalVenues,
        totalSlots,
        vacantSlots,
        occupiedSlots,
        reservedSlots,
        maintenanceSlots,
        occupancyRate: totalSlots > 0 ? Math.round(((occupiedSlots + reservedSlots) / totalSlots) * 100) : 0,
        totalUsers,
        activeBookings,
        upcomingBookings,
        completedBookings,
        totalRevenue
      },
      activeVehicles: enrichedActive
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update venue pricing rates dynamically
router.patch('/venues/:id/rates', async (req, res) => {
  try {
    const { car, bike, ev, handicap } = req.body;
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

    if (car !== undefined) venue.ratesPerHour.car = Number(car);
    if (bike !== undefined) venue.ratesPerHour.bike = Number(bike);
    if (ev !== undefined) venue.ratesPerHour.ev = Number(ev);
    if (handicap !== undefined) venue.ratesPerHour.handicap = Number(handicap);

    await venue.save();
    res.json({ success: true, message: 'Parking tariffs updated successfully', venue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get registered users (Excludes passwords, hashes, and secrets)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password -__v')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
