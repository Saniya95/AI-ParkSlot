import mongoose from 'mongoose';

const analyticsLogSchema = new mongoose.Schema({
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  timestamp: { type: Date, default: Date.now },
  hourOfDay: { type: Number, min: 0, max: 23 },
  dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
  totalOccupied: { type: Number, default: 0 },
  totalVacant: { type: Number, default: 0 },
  occupancyRate: { type: Number, default: 0 }, // percentage 0 - 100
  demandScore: { type: Number, default: 50 }, // 0 - 100
  predictedDemandNextHour: { type: Number, default: 50 },
  revenueThisHour: { type: Number, default: 0 }
});

export default mongoose.model('AnalyticsLog', analyticsLogSchema);
