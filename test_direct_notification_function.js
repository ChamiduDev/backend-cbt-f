const mongoose = require('mongoose');
const VehicleStatus = require('./models/VehicleStatus');
const Booking = require('./models/Booking');
const PushNotificationService = require('./services/pushNotificationService');

// Mock Socket.io for testing
const mockIO = {
  emit: (event, data) => {
    console.log(`📡 Mock Socket.io emit: ${event}`, data);
  },
  to: (room) => ({
    emit: (event, data) => {
      console.log(`📡 Mock Socket.io to ${room}: ${event}`, data);
    }
  })
};

// Copy the notifyWaitingRiders function for direct testing
async function notifyWaitingRiders(booking, io) {
  try {
    console.log('🔔 [NOTIFY WAITING RIDERS] Starting notification process...');
    console.log(`🔔 Booking pickup location: City ${booking.pickupLocation.city_id}, Sub-area ${booking.pickupLocation.sub_area_id}`);
    
    // Find all riders with 'waiting' status in the same city and sub-area
    const waitingRiders = await VehicleStatus.find({
      status: 'waiting',
      city_id: booking.pickupLocation.city_id,
      sub_area_id: booking.pickupLocation.sub_area_id
    }).populate('user', 'fullName email role');

    console.log(`🔔 Found ${waitingRiders.length} waiting riders in the same location`);

    if (waitingRiders.length === 0) {
      console.log('🔔 No waiting riders found in the same location');
      return;
    }

    // Get booking details for the notification
    const bookingWithDetails = await Booking.findById(booking._id)
      .populate('pickupLocation.city_id', 'name')
      .populate('pickupLocation.sub_area_id', 'name')
      .populate('destinationLocation.city_id', 'name')
      .populate('destinationLocation.sub_area_id', 'name')
      .populate('user', 'fullName');

    if (!bookingWithDetails) {
      console.log('❌ Could not fetch booking details for notification');
      return;
    }

    const pickupCity = bookingWithDetails.pickupLocation.city_id?.name || 'Unknown City';
    const pickupSubArea = bookingWithDetails.pickupLocation.sub_area_id?.name || 'Unknown Area';
    const destinationCity = bookingWithDetails.destinationLocation?.city_id?.name || 'Unknown Destination';
    const customerName = bookingWithDetails.user?.fullName || 'Customer';
    
    // Create notification content
    const notificationTitle = 'New Booking Available! 🚗';
    const notificationBody = `A new booking from ${pickupCity} - ${pickupSubArea} to ${destinationCity} has been added. Amount: Rs. ${booking.totalAmount}`;
    
    const notificationData = {
      bookingId: booking._id,
      pickupCity: pickupCity,
      pickupSubArea: pickupSubArea,
      destinationCity: destinationCity,
      customerName: customerName,
      totalAmount: booking.totalAmount,
      pickupDate: booking.pickupDate,
      pickupTime: booking.pickupTime,
      type: 'new_booking_available'
    };

    // Get rider IDs
    const riderIds = waitingRiders.map(status => status.user._id.toString());
    
    // Send notifications to waiting riders
    const pushNotificationService = new PushNotificationService(io);
    const result = await pushNotificationService.sendNotificationToUsers(
      riderIds,
      notificationTitle,
      notificationBody,
      notificationData
    );

    console.log(`🔔 [NOTIFY WAITING RIDERS] Notification sent to ${result.sentCount} waiting riders`);
    console.log(`🔔 [NOTIFY WAITING RIDERS] Riders notified: ${waitingRiders.map(r => r.user.fullName).join(', ')}`);

  } catch (error) {
    console.error('❌ [NOTIFY WAITING RIDERS] Error:', error);
    throw error;
  }
}

async function testDirectNotificationFunction() {
  try {
    console.log('🔍 Testing Direct Notification Function...\n');

    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/ceylon_black_taxi', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find a recent booking
    const recentBooking = await Booking.findOne()
      .populate('pickupLocation.city_id', 'name')
      .populate('pickupLocation.sub_area_id', 'name')
      .populate('destinationLocation.city_id', 'name')
      .populate('destinationLocation.sub_area_id', 'name')
      .populate('user', 'fullName')
      .sort({ createdAt: -1 });

    if (!recentBooking) {
      console.log('❌ No bookings found in database');
      return;
    }

    console.log('📋 Found recent booking:');
    console.log(`   - ID: ${recentBooking._id}`);
    console.log(`   - Pickup: ${recentBooking.pickupLocation.city_id?.name} - ${recentBooking.pickupLocation.sub_area_id?.name}`);
    console.log(`   - Destination: ${recentBooking.destinationLocation?.city_id?.name} - ${recentBooking.destinationLocation?.sub_area_id?.name}`);
    console.log(`   - Amount: Rs. ${recentBooking.totalAmount}`);
    console.log('');

    // Test the notification function directly
    console.log('🔔 Testing notifyWaitingRiders function directly...');
    await notifyWaitingRiders(recentBooking, mockIO);

    console.log('\n✅ Direct notification function test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testDirectNotificationFunction();
