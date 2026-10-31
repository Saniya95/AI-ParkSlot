import express from 'express';
import {
  predictVenueDemand,
  recommendBestSlot,
  verifyLicensePlate,
  processChatQuery
} from '../services/aiService.js';
import { requireAdmin, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Simple in-memory sliding window rate limiter for chatbot endpoint
// Max 25 chat requests per minute per IP / authenticated user
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 25;

const chatRateLimiter = (req, res, next) => {
  const clientIdentifier = req.user?._id?.toString() || req.ip || req.headers['x-forwarded-for'] || 'anonymous';
  const now = Date.now();

  const userRecord = rateLimitMap.get(clientIdentifier) || [];
  // Keep timestamps within the last window
  const activeTimestamps = userRecord.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (activeTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'You have sent too many messages in a short time. Please wait a moment before sending another query.'
    });
  }

  activeTimestamps.push(now);
  rateLimitMap.set(clientIdentifier, activeTimestamps);

  // Periodically clean stale entries to prevent memory leak
  if (rateLimitMap.size > 1000) {
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const valid = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) rateLimitMap.delete(key);
      else rateLimitMap.set(key, valid);
    }
  }

  next();
};

// AI Demand Prediction for a venue
router.get('/demand/:venueId', async (req, res) => {
  try {
    const prediction = await predictVenueDemand(req.params.venueId);
    res.json({ success: true, data: prediction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI Intelligent Slot Recommendation
router.post('/recommend', async (req, res) => {
  try {
    const { venueId, vehicleType, needEV, needHandicap } = req.body;
    if (!venueId) return res.status(400).json({ success: false, message: 'Venue ID is required' });

    const recommendation = await recommendBestSlot({ venueId, vehicleType, needEV, needHandicap });
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Automatic License Plate Recognition (ALPR/OCR) verification
router.post('/verify-plate', requireAdmin, async (req, res) => {
  try {
    const { plateNumber, venueId } = req.body;
    if (!plateNumber || !venueId) {
      return res.status(400).json({ success: false, message: 'plateNumber and venueId are required' });
    }

    const result = await verifyLicensePlate(plateNumber, venueId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// AI Assistant Chatbot (Website-Aware, Real AI, Role-bounded)
router.post('/chat', optionalAuth, chatRateLimiter, async (req, res) => {
  try {
    const { message, venueId, conversationHistory } = req.body;

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'A non-empty text message is required.'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'MESSAGE_TOO_LONG',
        message: 'Message is too long. Please keep your question under 1,000 characters.'
      });
    }

    // Sanitize conversationHistory if provided
    let sanitizedHistory = [];
    if (Array.isArray(conversationHistory)) {
      sanitizedHistory = conversationHistory
        .slice(-8)
        .filter(item => item && typeof item.text === 'string' && item.text.trim())
        .map(item => ({
          sender: item.sender === 'ai' || item.sender === 'model' || item.sender === 'assistant' ? 'ai' : 'user',
          text: String(item.text).slice(0, 1000)
        }));
    }

    // Process query with live database context and verified req.user
    const response = await processChatQuery({
      message: message.trim(),
      venueId: venueId || null,
      user: req.user || null,
      conversationHistory: sanitizedHistory
    });

    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    const statusCode = error.status || (error.code === 'MISSING_API_KEY' ? 503 : 500);
    console.error(`[AI Chat Route Error] code=${error.code || 'UNKNOWN'} status=${statusCode}: ${error.message}`);

    res.status(statusCode).json({
      success: false,
      error: error.code || 'AI_ERROR',
      message: error.message || 'An error occurred while generating the AI response. Please try again.'
    });
  }
});

export default router;
