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

// Helper to parse JSON fields safely
const parseJSON = (data) => {
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    return [];
  }
};

const upload = require('../middleware/upload');

// Create/Register barber profile (Protected)
router.post('/register', authenticateToken, upload.fields([
  { name: 'shopImage', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
  { name: 'servicesImages', maxCount: 20 }, // Flexible handling
  { name: 'staffImages', maxCount: 20 }
]), async (req, res) => {
  try {
    // Note: Validation with express-validator on multipart/form-data is tricky.
    // We'll do manual validation here for critical fields.
    
    if (!req.body.shopName || !req.body.location) {
      return res.status(400).json({ success: false, message: 'Shop name and location are required' });
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

    // Process Services
    let services = parseJSON(req.body.services);
    // Map uploaded service images to services if needed
    // Assuming frontend sends services with identifiers or strictly ordered
    // For MVP, simplistic mapping or expecting URLs directly if handling uploads separately.
    // BETTER APPROACH: Frontend sends 'services' as JSON. If images are uploaded, 
    // they are referenced.
    // Simpler for now: We assume services have an 'imageIndex' or similar if we want to link specific files.
    // OR: specific fields like services[0][image].
    
    // Let's rely on basic logic: 
    // If services is a JSON string, we just save it.
    // If shopImage is uploaded, we save the path.
    
    const shopImageUrl = req.files['shopImage'] ? `/uploads/shops/${req.files['shopImage'][0].filename}` : '';
    
    const gallery = req.files['gallery'] ? req.files['gallery'].map(f => `/uploads/shops/${f.filename}`) : [];

    // For services and staff, handling images in a single request with array indices is complex in multer.
    // Alternative: Two-step process or Base64 (not recommended).
    // Compromise: We will save the parsed arrays. If the user wants to add images to services/staff,
    // they might need to use a separate endpoint or we just map them if they are sent in order.
    // For this MVP, let's assume the frontend sends JSON bodies and we handle the main shop image mainly.
    // Supporting service/staff images requires mapping logic we can add if the frontend supports it.
    // We will save valid paths if we can.
    
    const barberData = {
      userId: req.userId,
      shopName: req.body.shopName,
      location: req.body.location,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      category: req.body.category || 'Barber',
      services: services,
      staff: parseJSON(req.body.staff),
      haircutPrice: req.body.haircutPrice || 0, // Fallback
      bio: req.body.bio,
      workingHours: parseJSON(req.body.workingHours),
      shopImageUrl: shopImageUrl,
      gallery: gallery
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
router.put('/:id', authenticateToken, upload.fields([
  { name: 'shopImage', maxCount: 1 },
  { name: 'gallery', maxCount: 10 }
]), async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.id);
    if (!barber) {
      return res.status(404).json({ success: false, message: 'Barber not found' });
    }

    // Check if user owns this barber profile
    if (barber.userId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Update fields
    if (req.body.shopName) barber.shopName = req.body.shopName;
    if (req.body.location) barber.location = req.body.location;
    if (req.body.latitude) barber.latitude = req.body.latitude;
    if (req.body.longitude) barber.longitude = req.body.longitude;
    if (req.body.category) barber.category = req.body.category;
    if (req.body.haircutPrice) barber.haircutPrice = req.body.haircutPrice;
    if (req.body.bio) barber.bio = req.body.bio;
    
    if (req.body.services) barber.services = parseJSON(req.body.services);
    if (req.body.staff) barber.staff = parseJSON(req.body.staff);
    if (req.body.workingHours) barber.workingHours = parseJSON(req.body.workingHours);

    // Update images if provided
    if (req.files['shopImage']) {
      barber.shopImageUrl = `/uploads/shops/${req.files['shopImage'][0].filename}`;
    }
    
    if (req.files['gallery']) {
      const newImages = req.files['gallery'].map(f => `/uploads/shops/${f.filename}`);
      barber.gallery = [...barber.gallery, ...newImages];
    }

    await barber.save();

    const populatedBarber = await Barber.findById(barber._id)
      .populate('userId', 'name email phoneNumber');

    res.json({ success: true, barber: populatedBarber });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

