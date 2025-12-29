const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['customer', 'barber', 'admin'],
    // No default - role must be explicitly set
  },
  profileImageUrl: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    code: String,
    expiresAt: Date,
  },
}, {
  timestamps: true,
});

// Index for faster queries (email already has unique index, so only add role index)
userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);

