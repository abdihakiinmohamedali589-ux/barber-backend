const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Barber = require('../models/Barber');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Get all barbers
router.get('/', async (req, res) => {
  try {
    const { latitude, longitude, radius = 10, search } = req.query;
    
    let query = { isAvailable: true };
    
    // Search by name or location
    if (search) {
      query.$or = [
        { shopName: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    
    const barbers = await Barber.find(query)
      .populate('userId', 'name email phoneNumber')
      .sort({ rating: -1, totalReviews: -1 });
    
    res.json({ success: true, barbers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get popular barbers
router.get('/popular', async (req, res) => {
  try {
    const barbers = await Barber.find({ isAvailable: true })
      .populate('userId', 'name email phoneNumber')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(10);
    
    res.json({ success: true, barbers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get barber by user ID (for authenticated barber)
router.get('/my-shop', authenticateToken, async (req, res) => {
  try {
    const barber = await Barber.findOne({ userId: req.userId })
      .populate('userId', 'name email phoneNumber');
    
    if (!barber) {
      return res.status(404).json({ 
        success: false, 
        message: 'Barber shop not found. Please complete your registration.' 
      });
    }
    
    res.json({ success: true, barber });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get barber by ID
router.get('/:id', async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id)
      .populate('userId', 'name email phoneNumber');
    
    if (!barber) {
      return res.status(404).json({ success: false, message: 'Barber not found' });
    }
    
    res.json({ success: true, barber });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create/Register barber profile (Protected)
router.post('/register', authenticateToken, [
  body('shopName').notEmpty().withMessage('Shop name is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('latitude').isNumeric().withMessage('Valid latitude is required'),
  body('longitude').isNumeric().withMessage('Valid longitude is required'),
  body('services').isArray({ min: 1 }).withMessage('At least one service is required'),
  body('haircutPrice').isNumeric().withMessage('Valid price is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    // Check if user is a barber
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'barber') {
      return res.status(403).json({
        success: false,
        message: 'Only barbers can register a shop',
      });
    }

    // Check if barber profile already exists
    const existingBarber = await Barber.findOne({ userId: req.userId });
    if (existingBarber) {
      return res.status(400).json({
        success: false,
        message: 'Barber profile already exists',
      });
    }

    const barberData = {
      userId: req.userId,
      shopName: req.body.shopName,
      location: req.body.location,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      services: req.body.services,
      haircutPrice: req.body.haircutPrice,
      bio: req.body.bio,
      workingHours: req.body.workingHours || ['Mon-Fri: 9AM-6PM', 'Sat: 9AM-4PM'],
      shopImageUrl: req.body.shopImageUrl,
    };

    const barber = new Barber(barberData);
    await barber.save();
    
    const populatedBarber = await Barber.findById(barber._id)
      .populate('userId', 'name email phoneNumber');

    res.status(201).json({ success: true, barber: populatedBarber });
  } catch (error) {
    console.error('Barber registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update barber profile (Protected)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id);
    if (!barber) {
      return res.status(404).json({ success: false, message: 'Barber not found' });
    }

    // Check if user owns this barber profile
    if (barber.userId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    Object.assign(barber, req.body);
    await barber.save();

    const populatedBarber = await Barber.findById(barber._id)
      .populate('userId', 'name email phoneNumber');

    res.json({ success: true, barber: populatedBarber });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

