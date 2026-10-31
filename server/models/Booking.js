import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingCode: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userPhone: { type: String, default: '' },
  venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  slotNumber: { type: String, required: true },
  vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
  vehicleType: { 
    type: String, 
    enum: ['car', 'bike', 'ev', 'handicap'], 
    default: 'car' 
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  checkInTime: { type: Date, default: null },
  checkOutTime: { type: Date, default: null },
  estimatedHours: { type: Number, default: 2 },
  actualHours: { type: Number, default: 0 },
  ratePerHour: { type: Number, default: 40 },
  totalAmount: { type: Number, required: true },
  overtimeFee: { type: Number, default: 0 },
  finalAmount: { type: Number, default: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['paid', 'pending', 'settled', 'refunded'], 
    default: 'paid' 
  },
  paymentMethod: { type: String, default: 'UPI' },
  status: { 
    type: String, 
    enum: ['booked', 'active', 'completed', 'cancelled', 'expired', 'no_show'], 
    default: 'booked' 
  },
  gracePeriodMinutes: { type: Number, default: 30 },
  entryQrData: { type: String, required: true },
  exitQrData: { type: String, required: true },
  entryQrImage: { type: String, default: '' },
  exitQrImage: { type: String, default: '' },
  checkedInBy: { type: String, default: '' },
  checkedOutBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

bookingSchema.index({ venueId: 1, slotId: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ vehicleNumber: 1, status: 1 });

export default mongoose.model('Booking', bookingSchema);
