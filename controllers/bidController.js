const mongoose = require('mongoose');
const Bid = require('../models/Bid');
const Booking = require('../models/Booking');
const AppCommission = require('../models/AppCommission');
const RideLimit = require('../models/RideLimit');
const PushNotificationService = require('../services/pushNotificationService');

exports.createBid = async (req, res) => {
  const { bookingId, bidAmount, selectedVehicle } = req.body;
  const riderId = req.user.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ msg: 'Invalid booking ID' });
    }

    // Check ride limit before allowing bid
    const globalLimit = await RideLimit.getGlobalRideLimit();
    console.log(`[CREATE BID] Before canTakeRideAction - Rider ${riderId} remaining rides: ${globalLimit.getRemainingRides(riderId)}`);
    
    const eligibility = globalLimit.canTakeRideAction(riderId);
    console.log(`[CREATE BID] After canTakeRideAction - Rider ${riderId} remaining rides: ${globalLimit.getRemainingRides(riderId)}`);
    
    if (!eligibility.canTakeAction) {
      return res.status(400).json({ 
        msg: eligibility.reason,
        remainingRides: eligibility.remainingRides,
        dailyLimit: globalLimit.dailyLimit
      });
    }
    const appCommission = await AppCommission.findOne();
    if (!appCommission) {
      return res.status(404).json({ msg: 'App commission not found' });
    }

    let commissionRate = 0;
    if (appCommission.type === 'percentage') {
      commissionRate = appCommission.value / 100;
    }

    const riderIncome = bidAmount * (1 - commissionRate);
    
    // Check if the rider already has a bid for this booking
    let bid = await Bid.findOne({
      booking: bookingId,
      rider: riderId
    });

    if (bid) {
      // Update existing bid
      bid.bidAmount = bidAmount;
      bid.commissionRate = appCommission.value;
      bid.riderIncome = riderIncome;
      bid.selectedVehicle = selectedVehicle;
      bid = await bid.save();
    } else {
      // Create new bid
      bid = await new Bid({
        booking: bookingId,
        rider: riderId,
        bidAmount,
        commissionRate: appCommission.value,
        riderIncome,
        selectedVehicle,
      }).save();
    }

    // Update booking status
    await Booking.findByIdAndUpdate(bookingId, { status: 'bid_placed' });

    // Increment ride count when bid is created
    await globalLimit.incrementRideCount(riderId);
    console.log(`[CREATE BID] After increment - Rider ${riderId} remaining rides: ${globalLimit.getRemainingRides(riderId)}`);

    req.io.emit('newBid', bid);

    // Send notification to the booking creator (hotel/broker)
    try {
      const pushNotificationService = new PushNotificationService(req.io);
      
      // Get booking details for the notification
      const bookingWithDetails = await Booking.findById(bookingId)
        .populate('pickupLocation.city_id', 'name')
        .populate('destinationLocation.city_id', 'name')
        .populate('user', 'fullName email');

      if (bookingWithDetails && bookingWithDetails.user) {
        const pickupCity = bookingWithDetails.pickupLocation.city_id?.name || 'Unknown City';
        const destinationCity = bookingWithDetails.destinationLocation.city_id?.name || 'Unknown City';
        const customerName = bookingWithDetails.user?.fullName || 'Customer';
        
        const notificationTitle = 'New Bid Received! 💰';
        const notificationBody = `A rider has placed a bid of Rs. ${bidAmount.toFixed(2)} for your booking from ${pickupCity} to ${destinationCity}. Check your bookings to review!`;
        
        const notificationData = {
          bookingId: bookingId,
          bidId: bid._id,
          bidAmount: bidAmount,
          pickupCity: pickupCity,
          destinationCity: destinationCity,
          riderName: 'Rider', // We could populate rider details if needed
          type: 'new_bid'
        };

        // Send notification to the hotel/broker who created the booking
        await pushNotificationService.sendNotificationToUsers(
          [bookingWithDetails.user._id.toString()],
          notificationTitle,
          notificationBody,
          notificationData
        );

        console.log(`📱 New bid notification sent to hotel/broker: ${bookingWithDetails.user._id}`);
      }
    } catch (notificationError) {
      console.error('❌ Error sending new bid notification:', notificationError);
      // Don't fail the bid creation if notification fails
    }
    
    // Get the updated remaining rides after increment
    const updatedGlobalLimit = await RideLimit.getGlobalRideLimit();
    const finalRemainingRides = updatedGlobalLimit.getRemainingRides(riderId);
    console.log(`[CREATE BID] Final response - Rider ${riderId} remaining rides: ${finalRemainingRides}`);

    res.json({
      ...bid.toObject(),
      remainingRides: finalRemainingRides,
      dailyLimit: updatedGlobalLimit.dailyLimit
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.acceptBid = async (req, res) => {
  const { bidId } = req.params;
  const { bookingId } = req.body;

  try {
    console.log(`[ACCEPT BID] Starting bid acceptance for bid ${bidId}, booking ${bookingId}`);
    
    // 1. Find the accepted bid and update its status
    const acceptedBid = await Bid.findByIdAndUpdate(
      bidId,
      { status: 'accepted' },
      { new: true }
    );

    if (!acceptedBid) {
      return res.status(404).json({ msg: 'Bid not found' });
    }
    
    console.log(`[ACCEPT BID] Found bid for rider: ${acceptedBid.rider}`);
    
    // Check ride count before and after
    const globalLimit = await RideLimit.getGlobalRideLimit();
    console.log(`[ACCEPT BID] Before acceptance - Rider ${acceptedBid.rider} remaining rides: ${globalLimit.getRemainingRides(acceptedBid.rider.toString())}`);
    

    // 2. Find the booking and update its status to 'confirmed'
    // and set the selected rider and confirmed bid.
    const updatedBooking = await Booking.findByIdAndUpdate(bookingId, {
      status: 'confirmed',
      rider: acceptedBid.rider,
      confirmedBid: acceptedBid._id,
    }, { new: true });

    if (!updatedBooking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // 3. Reject all other bids for the same booking
    await Bid.updateMany(
      { booking: bookingId, _id: { $ne: bidId } },
      { status: 'rejected' }
    );

    // 4. Emit a socket event to notify clients
    req.io.emit('bidAccepted', { bookingId, bidId });

    // 5. Send push notification to the confirmed rider
    try {
      const pushNotificationService = new PushNotificationService(req.io);
      
      // Get booking details for the notification
      const bookingWithDetails = await Booking.findById(bookingId)
        .populate('pickupLocation.city_id', 'name')
        .populate('destinationLocation.city_id', 'name')
        .populate('user', 'fullName');

      if (bookingWithDetails) {
        const pickupCity = bookingWithDetails.pickupLocation.city_id?.name || 'Unknown City';
        const destinationCity = bookingWithDetails.destinationLocation.city_id?.name || 'Unknown City';
        const customerName = bookingWithDetails.user?.fullName || 'Customer';
        
        const notificationTitle = 'Ride Confirmed! 🎉';
        const notificationBody = `Your ride from ${pickupCity} to ${destinationCity} has been confirmed by ${customerName}. Check your confirmed rides!`;
        
        const notificationData = {
          bookingId: bookingId,
          bidId: bidId,
          pickupCity: pickupCity,
          destinationCity: destinationCity,
          customerName: customerName,
          type: 'ride_confirmation'
        };

        await pushNotificationService.sendNotificationToUsers(
          [acceptedBid.rider.toString()],
          notificationTitle,
          notificationBody,
          notificationData
        );

        console.log(`📱 Ride confirmation notification sent to rider: ${acceptedBid.rider}`);
      }
    } catch (notificationError) {
      console.error('❌ Error sending ride confirmation notification:', notificationError);
      // Don't fail the bid acceptance if notification fails
    }

    // Check ride count after acceptance
    const finalGlobalLimit = await RideLimit.getGlobalRideLimit();
    console.log(`[ACCEPT BID] After acceptance - Rider ${acceptedBid.rider} remaining rides: ${finalGlobalLimit.getRemainingRides(acceptedBid.rider.toString())}`);

    res.json({ 
      msg: 'Bid accepted successfully'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
