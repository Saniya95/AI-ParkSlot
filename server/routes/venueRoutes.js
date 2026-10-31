import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Venue from '../models/Venue.js';
import Slot from '../models/Slot.js';
import Booking from '../models/Booking.js';
import { requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. Get all venues (Public sees active only; Admin with ?all=true sees all)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const showAll = req.query.all === 'true' && req.user && req.user.role === 'admin';
    const query = showAll ? {} : { isActive: { $ne: false } };

    const venues = await Venue.find(query).sort({ createdAt: -1 });

    const results = await Promise.all(
      venues.map(async (venue) => {
        const slots = await Slot.find({ venueId: venue._id });
        const vacantCount = slots.filter(s => s.status === 'vacant').length;
        const occupiedCount = slots.filter(s => s.status === 'occupied').length;
        const reservedCount = slots.filter(s => s.status === 'reserved').length;
        const total = slots.length;

        return {
          ...venue.toObject(),
          totalSlots: total > 0 ? total : venue.totalSlots,
          vacantSlots: vacantCount,
          occupiedSlots: occupiedCount,
          reservedSlots: reservedCount,
          occupancyPercentage: total > 0 ? Math.round(((total - vacantCount) / total) * 100) : 0
        };
      })
    );

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get single venue by ID with full slot breakdown
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

    const isAdmin = req.user && req.user.role === 'admin';
    if (venue.isActive === false && !isAdmin) {
      return res.status(404).json({ success: false, message: 'Venue not available' });
    }

    const slots = await Slot.find({ venueId: venue._id }).sort({ slotNumber: 1 });
    const vacantCount = slots.filter(s => s.status === 'vacant').length;
    const occupiedCount = slots.filter(s => s.status === 'occupied').length;
    const reservedCount = slots.filter(s => s.status === 'reserved').length;

    res.json({
      success: true,
      data: {
        ...venue.toObject(),
        slots,
        totalSlots: slots.length > 0 ? slots.length : venue.totalSlots,
        vacantSlots: vacantCount,
        occupiedSlots: occupiedCount,
        reservedSlots: reservedCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Admin: Image upload endpoint
router.post('/upload', requireAdmin, async (req, res) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: 'No image data provided.' });
    }

    const matches = imageBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    let ext = 'jpg';
    let base64Data = imageBase64;

    if (matches && matches.length === 3) {
      ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      base64Data = matches[2];
    }

    const safeFilename = `venue-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const filePath = path.join(uploadsDir, safeFilename);

    await fs.promises.writeFile(filePath, Buffer.from(base64Data, 'base64'));

    const publicUrl = `/uploads/${safeFilename}`;
    res.json({ success: true, url: publicUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Admin: Create new parking location & automatically generate slots
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      name,
      category = 'mall',
      address,
      city = 'Vidisha',
      description = '',
      totalSlots = 16,
      hourlyPrice,
      ratesPerHour,
      imageUrl = '',
      isActive = true,
      hasEVCharging = true,
      hasValet = false
    } = req.body;

    if (!name?.trim() || !address?.trim()) {
      return res.status(400).json({ success: false, message: 'Location name and address are required.' });
    }

    const slotCount = Math.max(1, Math.min(100, parseInt(totalSlots, 10) || 16));
    const baseCarRate = hourlyPrice ? Number(hourlyPrice) : (ratesPerHour?.car || 40);

    const calculatedRates = {
      car: baseCarRate,
      bike: ratesPerHour?.bike || Math.max(10, Math.round(baseCarRate * 0.5)),
      ev: ratesPerHour?.ev || Math.max(20, Math.round(baseCarRate * 1.5)),
      handicap: ratesPerHour?.handicap || Math.max(10, Math.round(baseCarRate * 0.75))
    };

    const venue = await Venue.create({
      name: name.trim(),
      category,
      address: address.trim(),
      city,
      description: description.trim(),
      totalSlots: slotCount,
      ratesPerHour: calculatedRates,
      imageUrl: imageUrl.trim(),
      isActive: Boolean(isActive),
      hasEVCharging: Boolean(hasEVCharging),
      hasValet: Boolean(hasValet)
    });

    // Generate physical slots for this new venue
    const slotsToCreate = [];
    for (let i = 1; i <= slotCount; i++) {
      const section = i <= Math.ceil(slotCount / 2) ? 'Section A' : 'Section B';
      const slotType = i === 1 ? 'handicap' : (i <= 3 ? 'ev' : (i <= 6 ? 'bike' : 'car'));
      const numStr = i < 10 ? `0${i}` : `${i}`;

      slotsToCreate.push({
        venueId: venue._id,
        slotNumber: `${section.includes('A') ? 'A' : 'B'}-${numStr}`,
        floor: 'Floor 1',
        section,
        type: slotType,
        status: 'vacant',
        distanceToEntry: 10 + (i * 3),
        distanceToOPD: 15 + (i * 4),
        hasEVCharger: slotType === 'ev'
      });
    }

    await Slot.insertMany(slotsToCreate);

    res.status(201).json({
      success: true,
      message: `Parking location '${venue.name}' created with ${slotCount} slots.`,
      data: venue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Admin: Edit parking location
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

    const {
      name,
      category,
      address,
      description,
      totalSlots,
      hourlyPrice,
      ratesPerHour,
      imageUrl,
      isActive,
      hasEVCharging,
      hasValet
    } = req.body;

    if (name) venue.name = name.trim();
    if (category) venue.category = category;
    if (address) venue.address = address.trim();
    if (description !== undefined) venue.description = description.trim();
    if (imageUrl !== undefined) venue.imageUrl = imageUrl.trim();
    if (isActive !== undefined) venue.isActive = Boolean(isActive);
    if (hasEVCharging !== undefined) venue.hasEVCharging = Boolean(hasEVCharging);
    if (hasValet !== undefined) venue.hasValet = Boolean(hasValet);

    if (hourlyPrice !== undefined) {
      const price = Number(hourlyPrice);
      venue.ratesPerHour.car = price;
      venue.ratesPerHour.bike = Math.max(10, Math.round(price * 0.5));
      venue.ratesPerHour.ev = Math.max(20, Math.round(price * 1.5));
      venue.ratesPerHour.handicap = Math.max(10, Math.round(price * 0.75));
    } else if (ratesPerHour) {
      if (ratesPerHour.car) venue.ratesPerHour.car = Number(ratesPerHour.car);
      if (ratesPerHour.bike) venue.ratesPerHour.bike = Number(ratesPerHour.bike);
      if (ratesPerHour.ev) venue.ratesPerHour.ev = Number(ratesPerHour.ev);
      if (ratesPerHour.handicap) venue.ratesPerHour.handicap = Number(ratesPerHour.handicap);
    }

    // Safely update totalSlots if changed
    if (totalSlots && Number(totalSlots) !== venue.totalSlots) {
      const newCount = Math.max(1, Math.min(100, Number(totalSlots)));
      const existingSlots = await Slot.find({ venueId: venue._id }).sort({ slotNumber: 1 });
      const currentCount = existingSlots.length;

      if (newCount > currentCount) {
        const toAdd = [];
        for (let i = currentCount + 1; i <= newCount; i++) {
          const section = i <= Math.ceil(newCount / 2) ? 'Section A' : 'Section B';
          const numStr = i < 10 ? `0${i}` : `${i}`;
          toAdd.push({
            venueId: venue._id,
            slotNumber: `${section.includes('A') ? 'A' : 'B'}-${numStr}`,
            floor: 'Floor 1',
            section,
            type: 'car',
            status: 'vacant',
            distanceToEntry: 10 + (i * 3),
            distanceToOPD: 15 + (i * 4),
            hasEVCharger: false
          });
        }
        await Slot.insertMany(toAdd);
      } else if (newCount < currentCount) {
        // Only safely remove vacant slots that have no active or upcoming bookings
        const diff = currentCount - newCount;
        const vacantSlots = existingSlots.filter(s => s.status === 'vacant');
        const slotsToRemove = vacantSlots.slice(0, diff);
        if (slotsToRemove.length > 0) {
          const idsToRemove = slotsToRemove.map(s => s._id);
          await Slot.deleteMany({ _id: { $in: idsToRemove } });
        }
      }
      venue.totalSlots = newCount;
    }

    await venue.save();
    res.json({ success: true, message: 'Parking location updated successfully.', data: venue });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Admin: Toggle Location Active / Inactive Status
router.patch('/:id/toggle-active', requireAdmin, async (req, res) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

    venue.isActive = !venue.isActive;
    await venue.save();

    res.json({
      success: true,
      message: `Location is now ${venue.isActive ? 'ACTIVE' : 'INACTIVE'}`,
      data: venue
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Admin: Safely Delete Parking Location
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const venueId = req.params.id;
    const venue = await Venue.findById(venueId);
    if (!venue) return res.status(404).json({ success: false, message: 'Venue not found' });

    // Check for active or upcoming bookings
    const activeBooking = await Booking.findOne({
      venueId,
      status: { $in: ['active', 'booked'] }
    });

    if (activeBooking) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete '${venue.name}' because there are active vehicles parked or upcoming reservations (e.g. Pass ${activeBooking.bookingCode}). Please complete or cancel those bookings first.`
      });
    }

    // Safe to delete: remove associated slots and the venue
    await Slot.deleteMany({ venueId });
    await Venue.findByIdAndDelete(venueId);

    res.json({
      success: true,
      message: `Parking location '${venue.name}' and all associated slots have been safely deleted.`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
