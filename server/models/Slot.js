import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  slotNumber: { type: String, required: true },
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  floor: { type: String, default: 'Ground Floor' },
  section: { type: String, default: 'Zone A' },
  type: { 
    type: String, 
    enum: ['car', 'bike', 'ev', 'handicap'], 
    default: 'car' 
  },
  distanceFromEntrance: { type: Number, default: 20 }, // meters
  status: { 
    type: String, 
    enum: ['vacant', 'reserved', 'occupied', 'maintenance'], 
    default: 'vacant' 
  },
  currentBookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  activeVehicleNumber: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
});

// Compound unique index for slotNumber per venue
slotSchema.index({ venueId: 1, slotNumber: 1 }, { unique: true });

export default mongoose.model('Slot', slotSchema);
