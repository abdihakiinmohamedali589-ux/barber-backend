const mongoose = require('mongoose');

const barberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  shopName: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
  },
  latitude: {
    type: Number,
    required: true,
  },
  longitude: {
    type: Number,
    required: true,
  },
  shopImageUrl: {
    type: String,
  },
  services: [{
    type: String,
  }],
  haircutPrice: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  currentQueueLength: {
    type: Number,
    default: 0,
  },
  estimatedWaitTime: {
    type: Number,
    default: 0,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  bio: {
    type: String,
  },
  workingHours: [{
    type: String,
  }],
}, {
  timestamps: true,
});

// Indexes (userId already has unique index, so only add geospatial index)
barberSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('Barber', barberSchema);

