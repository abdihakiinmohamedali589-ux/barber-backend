const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Barber = require('../models/Barber');
const Booking = require('../models/Booking');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sabrinaibraahiimidow_db_user:baaAWQg9xNLOEZCx@cluster0.ebywtrx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function clearAllUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete all bookings first (they reference users)
    const bookingsDeleted = await Booking.deleteMany({});
    console.log(`🗑️  Deleted ${bookingsDeleted.deletedCount} bookings`);

    // Delete all barbers (they reference users)
    const barbersDeleted = await Barber.deleteMany({});
    console.log(`🗑️  Deleted ${barbersDeleted.deletedCount} barbers`);

    // Delete all users
    const usersDeleted = await User.deleteMany({});
    console.log(`🗑️  Deleted ${usersDeleted.deletedCount} users`);

    console.log('\n✅ All users, barbers, and bookings have been cleared!');
    console.log('📝 You can now start fresh with new registrations.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing users:', error);
    process.exit(1);
  }
}

// Run the clear function
clearAllUsers();

