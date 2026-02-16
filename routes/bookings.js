const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Barber = require('../models/Barber');
const User = require('../models/User');
const { sendCustomEmail } = require('../utils/emailService');
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

// Get user bookings
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    if (req.params.userId !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const bookings = await Booking.find({ customerId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('barberId', 'shopName location services haircutPrice')
      .populate('paymentId');
    
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get barber bookings
router.get('/barber/:barberId', authenticateToken, async (req, res) => {
  try {
    const barber = await Barber.findById(req.params.barberId);
    if (!barber || barber.userId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { status } = req.query;
    let query = { barberId: req.params.barberId };
    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .sort({ bookingDate: 1, bookingTime: 1 })
      .populate('customerId', 'name email phoneNumber')
      .populate('paymentId');
    
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create booking
router.post('/', authenticateToken, [
  body('barberId').notEmpty().withMessage('Barber ID is required'),
  body('serviceName').notEmpty().withMessage('Service name is required'),
  body('bookingDate').notEmpty().withMessage('Booking date is required'),
  body('bookingTime').notEmpty().withMessage('Booking time is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { barberId, serviceName, price, bookingDate, bookingTime } = req.body;

    // Get barber details
    const barber = await Barber.findById(barberId).populate('userId', 'name email phoneNumber');
    if (!barber) {
      return res.status(404).json({ success: false, message: 'Barber not found' });
    }

    // Ensure barber has userId populated
    if (!barber.userId || !barber.userId.email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Barber email not found. Please complete your profile.' 
      });
    }

    // Get customer details
    const customer = await User.findById(req.userId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Calculate queue position
    const pendingBookings = await Booking.countDocuments({
      barberId,
      status: { $in: ['pending', 'approved', 'confirmed', 'inProgress'] },
      bookingDate: new Date(bookingDate),
    });
    const queuePosition = pendingBookings + 1;

    // Calculate estimated wait time (15 minutes per customer)
    const estimatedWaitTime = pendingBookings * 15;

    // Create booking
    const booking = new Booking({
      customerId: req.userId,
      barberId,
      barberName: barber.shopName,
      serviceName,
      bookingDate: new Date(bookingDate),
      bookingTime: new Date(bookingTime),
      price: price || barber.haircutPrice,
      status: 'pending',
      queuePosition,
    });
    await booking.save();

    // Update barber queue
    await Barber.findByIdAndUpdate(barberId, {
      $inc: { currentQueueLength: 1 },
      estimatedWaitTime: estimatedWaitTime + 15,
    });

    // Send email to barber (use email from populated userId)
    const barberEmail = barber.userId.email;
    if (barberEmail && typeof barberEmail === 'string') {
      try {
        const bookingEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1E88E5; color: white; padding: 20px; text-align: center;">
              <h1>New Booking Request</h1>
            </div>
            <div style="padding: 30px; background-color: #f5f5f5;">
              <h2 style="color: #212121;">You have a new booking request!</h2>
              <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <p><strong>Customer:</strong> ${customer.name}</p>
                <p><strong>Service:</strong> ${serviceName}</p>
                <p><strong>Date:</strong> ${new Date(bookingDate).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date(bookingTime).toLocaleTimeString()}</p>
                <p><strong>Price:</strong> $${barber.haircutPrice}</p>
                <p><strong>Queue Position:</strong> ${queuePosition}</p>
              </div>
              <p style="color: #757575; font-size: 14px;">
                Please log in to your dashboard to approve or reject this booking.
              </p>
            </div>
          </div>
        `;
        await sendCustomEmail(barberEmail, 'New Booking Request - Barber App', bookingEmailHtml);
        console.log(`✅ Booking notification email sent to barber: ${barberEmail}`);
      } catch (emailError) {
        console.error('❌ Error sending email to barber:', emailError);
        // Continue - booking is still created
      }
    } else {
      console.warn('⚠️  Barber email not available. Booking created but email not sent.');
    }

    // Send email to customer
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1E88E5; color: white; padding: 20px; text-align: center;">
          <h1>Booking Request Submitted</h1>
        </div>
        <div style="padding: 30px; background-color: #f5f5f5;">
          <h2 style="color: #212121;">Your booking request has been submitted!</h2>
          <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <p><strong>Barber:</strong> ${barber.shopName}</p>
            <p><strong>Service:</strong> ${serviceName}</p>
            <p><strong>Date:</strong> ${new Date(bookingDate).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${new Date(bookingTime).toLocaleTimeString()}</p>
            <p><strong>Price:</strong> $${barber.haircutPrice}</p>
            <p><strong>Your Queue Position:</strong> ${queuePosition}</p>
            <p><strong>Estimated Wait Time:</strong> ${estimatedWaitTime} minutes</p>
          </div>
          <p style="color: #757575; font-size: 14px;">
            The barber will review your request and you'll be notified once it's approved.
          </p>
        </div>
      </div>
    `;
    await sendCustomEmail(customer.email, 'Booking Request Submitted - Barber App', customerEmailHtml);

    const populatedBooking = await Booking.findById(booking._id)
      .populate('barberId', 'shopName location')
      .populate('customerId', 'name email');

    res.status(201).json({ 
      success: true, 
      booking: populatedBooking,
      message: 'Booking request submitted. You will be notified once the barber approves it.',
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update booking status (approve, reject, etc.)
router.patch('/:id/status', authenticateToken, [
  body('status').isIn(['pending', 'approved', 'rejected', 'confirmed', 'inProgress', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { status } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'barberId',
        populate: { path: 'userId', select: 'name email' }
      })
      .populate('customerId', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check authorization
    // Get barberId - handle both populated and non-populated cases
    const barberId = booking.barberId._id || booking.barberId;
    const barber = await Barber.findById(barberId);
    
    if (!barber) {
      return res.status(404).json({ success: false, message: 'Barber not found' });
    }

    // Compare userId - convert both to strings for comparison
    // barber.userId is an ObjectId, req.userId is a string from JWT
    const barberUserId = barber.userId.toString();
    const isBarber = barberUserId === req.userId;
    
    // Get customerId - handle both populated and non-populated cases
    const customerId = (booking.customerId._id || booking.customerId).toString();
    const isCustomer = customerId === req.userId;

    // Only barber can approve/reject, both can complete/cancel
    if (['approved', 'rejected'].includes(status) && !isBarber) {
      return res.status(403).json({ success: false, message: 'Only barber can approve/reject bookings' });
    }

    const oldStatus = booking.status;
    booking.status = status;

    // If completing, set completedAt
    if (status === 'completed') {
      booking.completedAt = new Date();
      // Update barber queue
      const barberIdForUpdate = booking.barberId._id || booking.barberId;
      await Barber.findByIdAndUpdate(barberIdForUpdate, {
        $inc: { currentQueueLength: -1 },
      });
    }

    // If rejecting, update queue
    if (status === 'rejected' && oldStatus === 'pending') {
      const barberIdForUpdate = booking.barberId._id || booking.barberId;
      await Barber.findByIdAndUpdate(barberIdForUpdate, {
        $inc: { currentQueueLength: -1 },
      });
    }

    await booking.save();

    // Send email notifications
    if (status === 'approved') {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
            <h1>Booking Approved!</h1>
          </div>
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #212121;">Your booking has been approved</h2>
            <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p><strong>Barber:</strong> ${booking.barberName}</p>
              <p><strong>Service:</strong> ${booking.serviceName}</p>
              <p><strong>Date:</strong> ${booking.bookingDate.toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${booking.bookingTime.toLocaleTimeString()}</p>
              <p><strong>Queue Position:</strong> ${booking.queuePosition}</p>
            </div>
            <p style="color: #757575; font-size: 14px;">
              Please arrive on time for your appointment.
            </p>
          </div>
        </div>
      `;
      await sendCustomEmail(booking.customerId.email, 'Booking Approved - Barber App', emailHtml);
    } else if (status === 'rejected') {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f44336; color: white; padding: 20px; text-align: center;">
            <h1>Booking Rejected</h1>
          </div>
          <div style="padding: 30px; background-color: #f5f5f5;">
            <h2 style="color: #212121;">Your booking request was rejected</h2>
            <div style="background-color: white; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <p><strong>Barber:</strong> ${booking.barberName}</p>
              <p><strong>Service:</strong> ${booking.serviceName}</p>
              <p><strong>Date:</strong> ${booking.bookingDate.toLocaleDateString()}</p>
            </div>
            <p style="color: #757575; font-size: 14px;">
              Please try booking with another barber or a different time.
            </p>
          </div>
        </div>
      `;
      await sendCustomEmail(booking.customerId.email, 'Booking Rejected - Barber App', emailHtml);
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate('barberId', 'shopName location')
      .populate('customerId', 'name email');

    res.json({ success: true, booking: populatedBooking });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update booking (general) - for rescheduling
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Allow updating bookingDate and bookingTime for rescheduling
    if (req.body.bookingDate) {
      booking.bookingDate = new Date(req.body.bookingDate);
    }
    if (req.body.bookingTime) {
      booking.bookingTime = new Date(req.body.bookingTime);
    }
    // If status is provided and it's 'pending', reset queue position
    if (req.body.status === 'pending') {
      booking.status = 'pending';
      booking.queuePosition = 0; // Reset queue position
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('barberId', 'shopName location')
      .populate('customerId', 'name email');
    
    res.json({ success: true, booking: updatedBooking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

