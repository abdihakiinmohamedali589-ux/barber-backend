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
  category: {
    type: String,
    enum: ['Barber', 'Hair Salon', 'Skin Care', 'Massage', 'Nails', 'Makeup', 'Spa', 'Other'],
    default: 'Barber',
    required: true,
  },
  services: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, default: 30 }, // in minutes
    description: String,
    imageUrl: String,
  }],
  staff: [{
    name: { type: String, required: true },
    role: { type: String, default: 'Staff' },
    imageUrl: String,
    bio: String,
    workingDays: [String], // ['Mon', 'Tue', ...]
    shifts: [{
      day: String,
      start: String,
      end: String
    }]
  }],
  gallery: [String],
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
    day: String,
    start: String,
    end: String,
    isOpen: { type: Boolean, default: true }
  }],
}, {
  timestamps: true,
});

// Indexes (userId already has unique index, so only add geospatial index)
barberSchema.index({ latitude: 1, longitude: 1 });

module.exports = mongoose.model('Barber', barberSchema);

