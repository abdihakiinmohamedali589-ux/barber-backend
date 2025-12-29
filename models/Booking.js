const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  barberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Barber',
    required: true,
  },
  barberName: {
    type: String,
    required: true,
  },
  serviceName: {
    type: String,
    required: true,
  },
  bookingDate: {
    type: Date,
    required: true,
  },
  bookingTime: {
    type: Date,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'confirmed', 'inProgress', 'completed', 'cancelled'],
    default: 'pending',
  },
  queuePosition: {
    type: Number,
    default: 0,
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  cancellationReason: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ barberId: 1, bookingDate: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);

