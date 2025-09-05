require('dotenv').config();
const mongoose = require('mongoose');

console.log('🔍 Debugging MongoDB Connection...');
console.log('Environment:', process.env.NODE_ENV);
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 0);
console.log('MONGO_URI starts with:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + '...' : 'undefined');

const connectDB = async () => {
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Connection state:', mongoose.connection.readyState);
    console.log('🏷️  Database name:', mongoose.connection.name);
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB connection failed:');
    console.error('Error message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error name:', err.name);
    process.exit(1);
  }
};

connectDB();
