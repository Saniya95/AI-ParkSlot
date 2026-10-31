import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, unique: true, trim: true },
  role: { type: String, enum: ['user', 'admin', 'attendant'], default: 'user' },
  vehicleNumber: { type: String, default: '', trim: true },
  vehicleType: { type: String, enum: ['car', 'bike', 'ev', 'handicap'], default: 'car' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
