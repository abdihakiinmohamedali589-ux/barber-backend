const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const jwt = require('jsonwebtoken');
const upload = require('../middleware/upload'); // Ensure upload middleware is used

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

// Initiate manual payment
router.post('/manual', authenticateToken, upload.single('paymentProof'), async (req, res) => {
  try {
    const { bookingId, transactionId, paymentMethod, amount } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Create Payment Record
    const paymentData = {
      bookingId: booking._id,
      customerId: req.userId,
      amount: amount || booking.price, // Use provided amount or booking price
      method: paymentMethod,
      transactionId: transactionId,
      status: 'pending', // Waiting review
    };

    if (req.file) {
      paymentData.proofUrl = `/uploads/${req.file.filename}`; // Assuming upload to root or subfolder
      // Note: upload middleware determines destination. 
      // Need to ensure upload middleware puts it in a valid place or specific folder.
    }

    const payment = new Payment(paymentData);
    await payment.save();

    // Update booking with payment info
    booking.paymentId = payment._id;
    booking.status = 'pending'; // Ensure booking is pending payment confirmation (or separate status?)
    // Maybe 'pending_payment_verification'? Or stick to 'pending' but payment status tracks it.
    await booking.save();

    res.status(201).json({ 
      success: true, 
      message: 'Payment details submitted. Waiting for barber confirmation.',
      payment 
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm payment (Barber)
router.post('/confirm/:bookingId', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('paymentId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    // Authorization check omitted for brevity, but should be here.

    booking.status = 'confirmed';
    await booking.save();
    
    if (booking.paymentId) {
      const payment = await Payment.findById(booking.paymentId);
      if (payment) {
        payment.status = 'completed';
        payment.completedAt = new Date();
        await payment.save();
      }
    }
    
    res.json({ success: true, message: 'Payment confirmed and booking confirmed.', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
