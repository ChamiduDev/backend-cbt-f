const mongoose = require('mongoose');
const SystemSettings = require('../models/SystemSettings');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/taxi-app')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const defaultSettings = [
  {
    key: 'help_support_message',
    value: 'For assistance with your account, please contact our support team at support@ceylonblacktaxi.com or call +94 11 234 5678.',
    description: 'Help & Support message displayed in the app settings',
    isActive: true
  }
];

async function initializeSystemSettings() {
  try {
    console.log('Initializing system settings...');
    
    for (const setting of defaultSettings) {
      const existingSetting = await SystemSettings.findOne({ key: setting.key });
      
      if (existingSetting) {
        console.log(`Setting "${setting.key}" already exists, skipping...`);
      } else {
        // Create a dummy user ID for the initial setting
        // In production, this should be an actual admin user ID
        const dummyUserId = new mongoose.Types.ObjectId();
        
        const newSetting = new SystemSettings({
          ...setting,
          updatedBy: dummyUserId
        });
        
        await newSetting.save();
        console.log(`Created setting "${setting.key}"`);
      }
    }
    
    console.log('System settings initialization completed!');
  } catch (error) {
    console.error('Error initializing system settings:', error);
  } finally {
    mongoose.connection.close();
  }
}

initializeSystemSettings();
