const mongoose = require('mongoose');
const connectDB = require('../config/db');
const City = require('../models/City');
const SubArea = require('../models/SubArea');
const VehicleCategory = require('../models/VehicleCategory');
const TermsAndConditions = require('../models/TermsAndConditions');
const User = require('../models/User');
const Booking = require('../models/Booking');
const bcrypt = require('bcrypt');

const cities = [
  { name: 'Colombo' },
  { name: 'Kandy' },
  { name: 'Galle' },
];

const subAreas = [
  { name: 'Fort', city: 'Colombo' },
  { name: 'Pettah', city: 'Colombo' },
  { name: 'Peradeniya', city: 'Kandy' },
  { name: 'Galle Fort', city: 'Galle' },
];

const vehicleCategories = [
  { name: 'Car' },
  { name: 'Van' },
  { name: 'Tuk Tuk' },
];

const defaultTermsAndConditions = {
  content: "These are the default terms and conditions. Please update them from the admin panel."
};

const seedDB = async () => {
  await connectDB();

  // Clear existing data
  await City.deleteMany({});
  await SubArea.deleteMany({});
  await VehicleCategory.deleteMany({});
  await TermsAndConditions.deleteMany({});
  await User.deleteMany({});
  await Booking.deleteMany({});

  // Create cities and sub-areas
  const createdCities = await City.insertMany(cities);

  const subAreasWithCityIds = subAreas.map(subArea => {
    const city = createdCities.find(city => city.name === subArea.city);
    return { name: subArea.name, city_id: city._id };
  });

  await SubArea.insertMany(subAreasWithCityIds);
  await VehicleCategory.insertMany(vehicleCategories);
  await TermsAndConditions.create(defaultTermsAndConditions);

  // Create sample users
  const plainPassword = 'password123';

  // Create an admin user
  const adminUser = await User.create({
    role: 'admin',
    fullName: 'System Administrator',
    address: 'Admin Office, Colombo',
    city_id: createdCities[0]._id, // Colombo
    sub_area_id: (await SubArea.findOne({ name: 'Fort' }))._id,
    phone: '+94 11 000 0000',
    username: 'admin',
    email: 'admin@ceylonblacktaxi.com',
    password: plainPassword,
    isAdmin: true,
    userStatus: 'approved'
  });

  // Create a hotel user
  const hotelUser = await User.create({
    role: 'hotel',
    fullName: 'Hotel Paradise',
    hotelName: 'Paradise Hotel',
    address: '123 Beach Road, Colombo',
    city_id: createdCities[0]._id, // Colombo
    sub_area_id: (await SubArea.findOne({ name: 'Fort' }))._id,
    phone: '+94 11 234 5678',
    username: 'hotel_paradise',
    email: 'hotel@paradise.com',
    password: plainPassword,
    userStatus: 'approved'
  });

  // Create a rider user
  const riderUser = await User.create({
    role: 'ride',
    fullName: 'John Driver',
    address: '456 Driver Street, Colombo',
    city_id: createdCities[0]._id, // Colombo
    sub_area_id: (await SubArea.findOne({ name: 'Pettah' }))._id,
    phone: '+94 77 123 4567',
    username: 'john_driver',
    email: 'john@driver.com',
    password: plainPassword,
    userStatus: 'approved',
    vehicles: [{
      model: 'Toyota Corolla',
      number: 'ABC-1234',
      year: 2020,
      totalPassengers: 4,
      category: 'Car',
      location: {
        city_id: createdCities[0]._id,
        sub_area_id: (await SubArea.findOne({ name: 'Pettah' }))._id
      }
    }]
  });

  // Create sample bookings
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  // Create a completed booking from 2 days ago
  const completedBooking = await Booking.create({
    user: hotelUser._id,
    pickupLocation: {
      city_id: createdCities[0]._id, // Colombo
      sub_area_id: (await SubArea.findOne({ name: 'Fort' }))._id,
      address: 'Paradise Hotel, Fort, Colombo'
    },
    destinationLocation: {
      city_id: createdCities[1]._id, // Kandy
      sub_area_id: (await SubArea.findOne({ name: 'Peradeniya' }))._id,
      address: 'University of Peradeniya, Kandy'
    },
    pickupDate: twoDaysAgo,
    pickupTime: '09:00',
    riderAmount: 5000,
    commission: 500,
    totalAmount: 5500,
    phoneNumber: '+94 11 234 5678',
    numberOfGuests: 2,
    vehicleType: 'Car',
    status: 'completed',
    rider: riderUser._id,
    startedAt: new Date(twoDaysAgo.getTime() + 2 * 60 * 60 * 1000), // 2 hours after pickup
    completedAt: new Date(twoDaysAgo.getTime() + 4 * 60 * 60 * 1000), // 4 hours after pickup
    createdAt: twoDaysAgo
  });

  // Create a completed booking from yesterday
  const completedBooking2 = await Booking.create({
    user: hotelUser._id,
    pickupLocation: {
      city_id: createdCities[0]._id, // Colombo
      sub_area_id: (await SubArea.findOne({ name: 'Fort' }))._id,
      address: 'Paradise Hotel, Fort, Colombo'
    },
    destinationLocation: {
      city_id: createdCities[2]._id, // Galle
      sub_area_id: (await SubArea.findOne({ name: 'Galle Fort' }))._id,
      address: 'Galle Fort, Galle'
    },
    pickupDate: yesterday,
    pickupTime: '14:00',
    riderAmount: 8000,
    commission: 800,
    totalAmount: 8800,
    phoneNumber: '+94 11 234 5678',
    numberOfGuests: 3,
    vehicleType: 'Van',
    status: 'completed',
    rider: riderUser._id,
    startedAt: new Date(yesterday.getTime() + 2 * 60 * 60 * 1000), // 2 hours after pickup
    completedAt: new Date(yesterday.getTime() + 5 * 60 * 60 * 1000), // 5 hours after pickup
    createdAt: yesterday
  });

  // Create a pending booking for today
  const pendingBooking = await Booking.create({
    user: hotelUser._id,
    pickupLocation: {
      city_id: createdCities[0]._id, // Colombo
      sub_area_id: (await SubArea.findOne({ name: 'Fort' }))._id,
      address: 'Paradise Hotel, Fort, Colombo'
    },
    destinationLocation: {
      city_id: createdCities[1]._id, // Kandy
      sub_area_id: (await SubArea.findOne({ name: 'Peradeniya' }))._id,
      address: 'University of Peradeniya, Kandy'
    },
    pickupDate: now,
    pickupTime: '16:00',
    riderAmount: 5000,
    commission: 500,
    totalAmount: 5500,
    phoneNumber: '+94 11 234 5678',
    numberOfGuests: 2,
    vehicleType: 'Car',
    status: 'pending',
    createdAt: now
  });

  console.log('Database seeded with:');
  console.log('- Cities:', cities.length);
  console.log('- Sub-areas:', subAreas.length);
  console.log('- Vehicle categories:', vehicleCategories.length);
  console.log('- Users: Admin, Hotel and Rider');
  console.log('- Bookings: 2 completed, 1 pending');
  console.log('- Admin email: admin@ceylonblacktaxi.com, password: password123');
  console.log('- Test rider email: john@driver.com, password: password123');
  console.log('- Test hotel email: hotel@paradise.com, password: password123');

  mongoose.connection.close();
};

seedDB();
