const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Barber = require('../models/Barber');
const Booking = require('../models/Booking');

// Admin dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBarbers = await Barber.countDocuments();
    const todayBookings = await Booking.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
    });
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalBarbers,
        todayBookings,
        totalRevenue: 0, // Calculate from payments
        commissionEarned: 0, // Calculate from payments
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

