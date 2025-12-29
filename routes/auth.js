const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../utils/emailService');

// Helper function to generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to generate JWT token
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  });
}

// Send OTP via Email
router.post('/send-otp', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['customer', 'barber', 'admin']).withMessage('Valid role is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { email, role } = req.body;
    const emailLower = email.toLowerCase();
    
    // Check if email already exists with a different role
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser && existingUser.role && existingUser.role !== role) {
      return res.status(400).json({
        success: false,
        message: `This email is already registered as a ${existingUser.role}. Please use a different email or login as ${existingUser.role}.`,
      });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Find or create user
    let user = existingUser;
    if (!user) {
      user = new User({
        email: emailLower,
        role: role, // Set role during OTP request - REQUIRED
        otp: { code: otp, expiresAt },
      });
    } else {
      // If user exists, ensure role matches
      if (user.role && user.role !== role) {
        // This should have been caught earlier, but double-check
        return res.status(400).json({
          success: false,
          message: `This email is already registered as a ${user.role}. Please use a different email or login as ${user.role}.`,
        });
      }
      // Set role if not already set (shouldn't happen, but safety check)
      if (!user.role) {
        user.role = role;
      }
      user.otp = { code: otp, expiresAt };
    }
    await user.save();

    // Send OTP via Email
    try {
      await sendOTPEmail(email.toLowerCase(), otp);
      res.json({
        success: true,
        message: 'OTP sent successfully to your email',
      });
    } catch (emailError) {
      console.error('Email Error:', emailError);
      // In development, log the OTP
      if (process.env.NODE_ENV === 'development') {
        console.log(`📧 OTP for ${email}: ${otp}`);
      }
      res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again.',
      });
    }
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
    });
  }
});

// Verify OTP
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').notEmpty().withMessage('OTP is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found. Please request a new OTP.',
      });
    }

    // Check if OTP expired
    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired. Please request a new OTP.',
      });
    }

    // Verify OTP
    if (user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // OTP verified - clear OTP and mark as verified
    user.otp = undefined;
    user.isVerified = true;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
    });
  }
});

// Sign up (complete profile after OTP verification)
router.post('/signup', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['customer', 'barber', 'admin']).withMessage('Invalid role'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { name, email, role, phoneNumber } = req.body;
    const emailLower = email.toLowerCase();

    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first',
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified',
      });
    }

    // Validate role consistency - prevent changing role
    if (user.role && user.role !== role) {
      return res.status(400).json({
        success: false,
        message: `This email is already registered as a ${user.role}. Cannot change role. Please use a different email.`,
      });
    }

    // Update user profile
    user.name = name;
    // Role should already be set from OTP, but ensure it matches
    if (user.role !== role) {
      return res.status(400).json({
        success: false,
        message: `Role mismatch. Expected ${user.role} but got ${role}.`,
      });
    }
    if (phoneNumber) user.phoneNumber = phoneNumber;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Sign up successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Sign Up Error:', error);
    res.status(500).json({
      success: false,
      message: 'Sign up failed',
    });
  }
});

// Sign in
router.post('/signin', [
  body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please sign up first.',
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Sign in successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Sign In Error:', error);
    res.status(500).json({
      success: false,
      message: 'Sign in failed',
    });
  }
});

// Get current user (protected route)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get Current User Error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
});

// Update user profile (protected route)
router.patch('/me', [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('phoneNumber').optional(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update allowed fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
});

// Sign out
router.post('/signout', async (req, res) => {
  // Since we're using JWT, sign out is handled client-side by removing the token
  res.json({
    success: true,
    message: 'Signed out successfully',
  });
});

module.exports = router;
