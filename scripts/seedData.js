const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Barber = require('../models/Barber');
const Booking = require('../models/Booking');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://sabrinaibraahiimidow_db_user:baaAWQg9xNLOEZCx@cluster0.ebywtrx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// Sample barbershops data
const sampleBarbershops = [
  {
    shopName: 'Elite Cuts Barbershop',
    location: 'Hargeisa, Somaliland',
    latitude: 9.5616,
    longitude: 44.0649,
    services: ['Haircut', 'Beard Trim', 'Hair Wash', 'Hair Styling'],
    haircutPrice: 20,
    bio: 'Professional barbershop with over 10 years of experience. We provide top-quality haircuts and grooming services.',
    workingHours: ['Mon-Fri: 9AM-7PM', 'Sat: 9AM-5PM', 'Sun: Closed'],
    rating: 4.8,
    totalReviews: 45,
  },
  {
    shopName: 'Modern Style Barbers',
    location: 'Hargeisa, Somaliland',
    latitude: 9.5600,
    longitude: 44.0650,
    services: ['Haircut', 'Beard Trim', 'Hair Wash', 'Hair Coloring', 'Hair Styling'],
    haircutPrice: 25,
    bio: 'Modern barbershop offering the latest trends in men\'s grooming. Book your appointment today!',
    workingHours: ['Mon-Sat: 8AM-8PM', 'Sun: 10AM-4PM'],
    rating: 4.6,
    totalReviews: 32,
  },
  {
    shopName: 'Classic Gents Barbershop',
    location: 'Hargeisa, Somaliland',
    latitude: 9.5620,
    longitude: 44.0645,
    services: ['Haircut', 'Beard Trim', 'Hair Wash'],
    haircutPrice: 15,
    bio: 'Traditional barbershop with classic cuts and excellent service. Affordable prices for everyone.',
    workingHours: ['Mon-Fri: 8AM-6PM', 'Sat: 8AM-4PM', 'Sun: Closed'],
    rating: 4.5,
    totalReviews: 28,
  },
];

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await User.deleteMany({ role: 'barber' });
    // await Barber.deleteMany({});
    // console.log('🗑️  Cleared existing barber data');

    // Create barber users and shops
    const createdBarbers = [];
    
    for (let i = 0; i < sampleBarbershops.length; i++) {
      const shopData = sampleBarbershops[i];
      
      // Create barber user
      const barberEmail = `barber${i + 1}@barberapp.com`;
      let barberUser = await User.findOne({ email: barberEmail });
      
      if (!barberUser) {
        barberUser = new User({
          name: `Barber ${i + 1}`,
          email: barberEmail,
          role: 'barber',
          phoneNumber: `+252 61 ${1000 + i} ${1000 + i}`,
          isVerified: true,
        });
        await barberUser.save();
        console.log(`✅ Created barber user: ${barberUser.name}`);
      }

      // Create barber shop
      let barber = await Barber.findOne({ userId: barberUser._id });
      
      if (!barber) {
        barber = new Barber({
          userId: barberUser._id,
          shopName: shopData.shopName,
          location: shopData.location,
          latitude: shopData.latitude,
          longitude: shopData.longitude,
          services: shopData.services,
          haircutPrice: shopData.haircutPrice,
          bio: shopData.bio,
          workingHours: shopData.workingHours,
          rating: shopData.rating,
          totalReviews: shopData.totalReviews,
          currentQueueLength: 0,
          estimatedWaitTime: 0,
          isAvailable: true,
        });
        await barber.save();
        console.log(`✅ Created barbershop: ${barber.shopName}`);
      } else {
        console.log(`ℹ️  Barbershop already exists: ${barber.shopName}`);
      }
      
      createdBarbers.push(barber);
    }

    console.log('\n✅ Sample data seeding completed!');
    console.log(`📊 Created ${createdBarbers.length} barbershops`);
    console.log('\n📝 Sample barber login credentials:');
    createdBarbers.forEach((barber, index) => {
      console.log(`   Barber ${index + 1}: barber${index + 1}@barberapp.com`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seed function
seedData();

