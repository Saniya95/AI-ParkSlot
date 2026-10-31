import mongoose from 'mongoose';

const venueSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['hospital', 'mall', 'campus', 'commercial', 'transit'], 
    default: 'mall' 
  },
  address: { type: String, required: true },
  city: { type: String, default: 'Vidisha' },
  totalSlots: { type: Number, default: 24 },
  ratesPerHour: {
    car: { type: Number, default: 40 },
    bike: { type: Number, default: 20 },
    ev: { type: Number, default: 60 },
    handicap: { type: Number, default: 30 }
  },
  peakHours: [{ type: String }],
  operatingHours: { type: String, default: '24/7' },
  hasEVCharging: { type: Boolean, default: true },
  hasValet: { type: Boolean, default: false },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Venue', venueSchema);
