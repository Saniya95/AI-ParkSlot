import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getJwtSecret } from '../middleware/authMiddleware.js';

const router = express.Router();
const getSecret = () => getJwtSecret();

const getAdminEmail = () => (process.env.ADMIN_EMAIL || 'aiparkingslotadmin@gmail.com').toLowerCase().trim();
const getAdminPassword = () => process.env.ADMIN_PASSWORD || 'aiparkingslotadmin123';

// 1. Regular User Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, vehicleNumber, vehicleType } = req.body;

    // Validate required fields
    if (!name?.trim() || !email?.trim() || !password || !phone?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone number, and password are all required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    // Prevent registering with admin email or claiming admin role
    if (cleanEmail === getAdminEmail()) {
      return res.status(400).json({
        success: false,
        message: 'Account already exists. Please log in.'
      });
    }

    // Check duplicate email
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Account already exists. Please log in.'
      });
    }

    // Check duplicate phone (exact or normalized digits)
    const phoneDigits = cleanPhone.replace(/\D/g, '');
    const existingPhone = await User.findOne({
      $or: [
        { phone: cleanPhone },
        ...(phoneDigits.length >= 7 ? [
          { phone: { $regex: phoneDigits.slice(-10).split('').join('\\s*'), $options: 'i' } }
        ] : [])
      ]
    });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Account already exists. Please log in.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: cleanPhone,
      vehicleNumber: vehicleNumber ? vehicleNumber.toUpperCase().trim() : '',
      vehicleType: vehicleType || 'car',
      role: 'user' // Strictly forced to regular user
    });

    const token = jwt.sign(
      { id: user._id, role: 'user', email: user.email },
      getSecret(),
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: 'user',
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        vehicleType: user.vehicleType
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Account already exists. Please log in.'
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. User & Admin Login (Supports Email OR Phone Number)
router.post('/login', async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body;
    const loginId = (identifier || email || phone || '').trim();

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both your email or phone number and password.'
      });
    }

    const adminEmail = getAdminEmail();
    const adminPassword = getAdminPassword();

    // Check for Predefined Admin Login
    if (loginId.toLowerCase() === adminEmail) {
      if (password !== adminPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email, phone number, or password.'
        });
      }

      // Ensure Admin User document exists in DB
      let adminUser = await User.findOne({ email: adminEmail });
      const hashedAdminPass = await bcrypt.hash(adminPassword, 10);

      if (!adminUser) {
        // If an existing admin exists with an older email, update it
        const prevAdmin = await User.findOne({ role: 'admin' });
        if (prevAdmin) {
          prevAdmin.email = adminEmail;
          prevAdmin.password = hashedAdminPass;
          await prevAdmin.save();
          adminUser = prevAdmin;
        } else {
          adminUser = await User.create({
            name: 'System Administrator',
            email: adminEmail,
            password: hashedAdminPass,
            phone: '+91 98260 12345',
            role: 'admin'
          });
        }
      } else {
        adminUser.password = hashedAdminPass;
        if (adminUser.role !== 'admin') adminUser.role = 'admin';
        await adminUser.save();
      }

      const token = jwt.sign(
        { id: adminUser._id, role: 'admin', email: adminUser.email },
        getSecret(),
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        message: 'Admin authentication successful',
        token,
        user: {
          id: adminUser._id,
          name: adminUser.name || 'System Administrator',
          email: adminUser.email,
          role: 'admin',
          phone: adminUser.phone,
          vehicleNumber: adminUser.vehicleNumber || '',
          vehicleType: adminUser.vehicleType || 'car'
        }
      });
    }

    // Regular User Login (by Email OR Phone)
    const phoneDigits = loginId.replace(/\D/g, '');
    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { phone: loginId },
        ...(phoneDigits.length >= 7 ? [
          { phone: { $regex: phoneDigits.slice(-10).split('').join('\\s*'), $options: 'i' } }
        ] : [])
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email, phone number, or password.'
      });
    }

    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && user.email.toLowerCase() === adminEmail && password === adminPassword) {
      isMatch = true;
    }
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email, phone number, or password.'
      });
    }

    // Safety check: ensure regular user cannot inherit admin role without matching predefined admin credentials
    const assignedRole = (user.email.toLowerCase() === adminEmail) ? 'admin' : 'user';

    const token = jwt.sign(
      { id: user._id, role: assignedRole, email: user.email },
      getSecret(),
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: assignedRole,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        vehicleType: user.vehicleType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Get Current User Profile
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getSecret());
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        vehicleNumber: user.vehicleNumber,
        vehicleType: user.vehicleType
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

export default router;
