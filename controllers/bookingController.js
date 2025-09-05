const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const User = require('../models/User');
const AppCommission = require('../models/AppCommission');
const Bid = require('../models/Bid');
const RideLimit = require('../models/RideLimit');
const VehicleStatus = require('../models/VehicleStatus');
const PushNotificationService = require('../services/pushNotificationService');
const EarningsService = require('../services/earningsService');
const HotelBrokerCommissionService = require('../services/hotelBrokerCommissionService');

// @route    POST api/bookings
// @desc     Create a new booking
// @access   Private (Hotel/Broker/Admin)
exports.createBooking = async (req, res) => {
  const { pickupLocation, destinationLocation, pickupDate, pickupTime, riderAmount, commission, phoneNumber, numberOfGuests, vehicleType } = req.body;

  try {
    // Ensure the user making the request is authenticated
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const totalAmount = riderAmount + commission;

    const newBooking = new Booking({
      user: req.user.id,
      pickupLocation,
      destinationLocation,
      pickupDate,
      pickupTime,
      riderAmount,
      commission,
      totalAmount,
      phoneNumber: phoneNumber || user.phone,
      numberOfGuests,
      vehicleType,
    });

    const booking = await newBooking.save();
    req.io.emit('newBooking', booking);
    
    // Notify waiting riders in the same location
    console.log('🔔 [CREATE BOOKING] About to call notifyWaitingRiders...');
    try {
      await notifyWaitingRiders(booking, req.io);
      console.log('🔔 [CREATE BOOKING] notifyWaitingRiders completed successfully');
    } catch (notificationError) {
      console.error('❌ [CREATE BOOKING] Error notifying waiting riders:', notificationError);
      // Don't fail the booking creation if notification fails
    }
    
    res.status(201).json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    GET api/bookings
// @desc     Get all bookings (Admin only) or user's bookings (Hotel/Broker/Rider)
// @access   Private
exports.getBookings = async (req, res) => {
  try {
    const appCommission = await AppCommission.findOne();

    let bookings;
    console.log('getBookings: User role:', req.user.role);
    console.log('getBookings: User isAdmin:', req.user.isAdmin);

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (req.user.isAdmin || req.user.role === 'ride') {
      // Admin and Rider can see all bookings
      bookings = await Booking.find({ pickupDate: { $gte: now } })
        .populate('user', 'fullName email role')
        .populate('pickupLocation.city_id', 'name')
        .populate('pickupLocation.sub_area_id', 'name')
        .populate('destinationLocation.city_id', 'name')
        .populate('destinationLocation.sub_area_id', 'name')
        .populate('rider', 'fullName')
        .sort({ createdAt: -1 });
    } else {
      // Other regular users (hotel, broker) can only see their own bookings
      bookings = await Booking.find({ user: req.user.id, pickupDate: { $gte: now } })
        .populate('user', 'fullName email role')
        .populate('pickupLocation.city_id', 'name')
        .populate('pickupLocation.sub_area_id', 'name')
        .populate('destinationLocation.city_id', 'name')
        .populate('destinationLocation.sub_area_id', 'name')
        .populate('rider', 'fullName')
        .sort({ createdAt: -1 });
    }

    const bookingsWithRideCost = await Promise.all(bookings.map(async booking => {
      let totalIncome = booking.totalAmount;
      let appCommissionValue = 0;
      let appCommissionType = 'fixed';
      if (appCommission) {
        appCommissionValue = appCommission.value;
        appCommissionType = appCommission.type;
        if (appCommission.type === 'percentage') {
          totalIncome = booking.totalAmount * (1 - appCommission.value / 100);
        } else {
          totalIncome = booking.totalAmount - appCommission.value;
        }
      }
      totalIncome = totalIncome - booking.commission;

      // Fetch bids for this booking
      let bids = [];
      if (req.user.role === 'ride') {
        bids = await Bid.find({ booking: booking._id, rider: req.user.id }).populate('rider', 'fullName email');
      } else {
        bids = await Bid.find({ booking: booking._id }).populate('rider', 'fullName email');
      }

      return {
        ...booking.toObject(),
        totalIncome,
        appCommissionValue,
        appCommissionType,
        bids, // Add bids to the booking object
      };
    }));

    console.log('getBookings: Found bookings:', bookings.length);
    res.json(bookingsWithRideCost);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/bookings/:id/status
// @desc     Update booking status (Admin only)
// @access   Private (Admin)
exports.updateBookingStatus = async (req, res) => {
  const { status } = req.body;

  try {
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    if (req.user.isAdmin) {
      booking.status = status;
      await booking.save();
      res.json(booking);
    } else {
      return res.status(403).json({ msg: 'Not authorized to update booking status' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/bookings/:id/accept
// @desc     Accept a booking (Rider)
// @access   Private (Rider)
exports.acceptBooking = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid booking ID' });
    }
    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Check if rider already has a bid for this booking
    const existingBid = await Bid.findOne({
      booking: booking._id,
      rider: req.user.id
    });

    if (existingBid) {
      return res.status(400).json({ msg: 'You already have a bid for this booking' });
    }

    const appCommission = await AppCommission.findOne();
    if (!appCommission) {
      return res.status(404).json({ msg: 'App commission not found' });
    }

    // Calculate rider income based on total amount and commission
    let riderIncome = booking.totalAmount;
    if (appCommission.type === 'percentage') {
      riderIncome = booking.totalAmount * (1 - appCommission.value / 100);
    } else {
      riderIncome = booking.totalAmount - appCommission.value;
    }
    riderIncome = riderIncome - booking.commission;

    // Get the rider's first vehicle as default (or require vehicle selection)
    const rider = await User.findById(req.user.id).populate('vehicles');
    if (!rider || !rider.vehicles || rider.vehicles.length === 0) {
      return res.status(400).json({ msg: 'No vehicles found for rider' });
    }

    // Create a bid with the original booking amount and selected vehicle
    const newBid = new Bid({
      booking: booking._id,
      rider: req.user.id,
      bidAmount: booking.totalAmount,
      commissionRate: appCommission.value,
      riderIncome,
      selectedVehicle: rider.vehicles[0], // Use first vehicle as default
      status: 'pending_confirmation' // Mark as pending confirmation so hotel can confirm
    });

    await newBid.save();
    
    // Update booking status based on current status
    if (booking.status === 'pending') {
      booking.status = 'pending_confirmation';
    } else if (booking.status === 'bid_placed') {
      // If there are already bids, keep status as bid_placed
      // The pending_confirmation bid will be handled by the hotel
    }
    
    await booking.save();

    req.io.emit('newBid', newBid);

    // Send notification to the booking creator (hotel/broker) about direct acceptance
    try {
      const pushNotificationService = new PushNotificationService(req.io);
      
      // Get booking details for the notification
      const bookingWithDetails = await Booking.findById(req.params.id)
        .populate('pickupLocation.city_id', 'name')
        .populate('destinationLocation.city_id', 'name')
        .populate('user', 'fullName email');

      if (bookingWithDetails && bookingWithDetails.user) {
        const pickupCity = bookingWithDetails.pickupLocation.city_id?.name || 'Unknown City';
        const destinationCity = bookingWithDetails.destinationLocation.city_id?.name || 'Unknown City';
        const customerName = bookingWithDetails.user?.fullName || 'Customer';
        
        const notificationTitle = 'Booking Accepted! ✅';
        const notificationBody = `A rider has accepted your booking from ${pickupCity} to ${destinationCity} for Rs. ${booking.totalAmount.toFixed(2)}. Check your confirmed rides!`;
        
        const notificationData = {
          bookingId: req.params.id,
          bidId: newBid._id,
          bidAmount: booking.totalAmount,
          pickupCity: pickupCity,
          destinationCity: destinationCity,
          riderName: 'Rider', // We could populate rider details if needed
          type: 'booking_accepted'
        };

        // Send notification to the hotel/broker who created the booking
        await pushNotificationService.sendNotificationToUsers(
          [bookingWithDetails.user._id.toString()],
          notificationTitle,
          notificationBody,
          notificationData
        );

        console.log(`📱 Booking acceptance notification sent to hotel/broker: ${bookingWithDetails.user._id}`);
      }
    } catch (notificationError) {
      console.error('❌ Error sending booking acceptance notification:', notificationError);
      // Don't fail the booking acceptance if notification fails
    }

    res.json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    DELETE api/bookings/:id
// @desc     Delete a booking (Admin only)
// @access   Private (Admin)
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    if (req.user.isAdmin) {
      await Booking.findByIdAndDelete(req.params.id);
      res.json({ msg: 'Booking removed' });
    } else {
      return res.status(403).json({ msg: 'Not authorized to delete booking' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/bookings/:id/cancel
// @desc     Cancel a booking
// @access   Private
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Check if the user is authorized to cancel the booking
    if (booking.user.toString() !== req.user.id && booking.rider.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    booking.status = 'cancelled';
    await booking.save();

    req.io.emit('bookingCancelled', { bookingId: req.params.id });

    res.json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/bookings/:id/reject
// @desc     Reject a ride (Rider)
// @access   Private (Rider)
exports.rejectRide = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ msg: 'Rejection reason is required' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Check if the user is the assigned rider for this booking
    if (booking.rider.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Only the assigned rider can reject this ride' });
    }

    // Check if the booking is in a state that can be rejected
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ msg: 'Only confirmed rides can be rejected' });
    }

    // Update booking status to bid_placed (so hotels can select another rider) and add rejection details
    booking.status = 'bid_placed';
    booking.rejectionReason = reason;
    booking.rejectedAt = new Date();
    booking.rejectedBy = req.user.id;

    // Also update the bid status from 'accepted' to 'rejected'
    if (booking.confirmedBid) {
      const bid = await Bid.findById(booking.confirmedBid);
      if (bid) {
        bid.status = 'rejected';
        bid.rejectionReason = reason;
        await bid.save();
      }
    }

    // Clear the confirmed rider and bid so another rider can be selected
    booking.rider = undefined;
    booking.confirmedBid = undefined;

    await booking.save();

    // Emit socket event for real-time updates
    req.io.emit('rideRejected', { 
      bookingId: req.params.id, 
      reason: reason,
      riderId: req.user.id 
    });

    // Notify hotel/broker about ride rejection
    try {
      await notifyHotelBrokerRideRejection(booking, reason, req.io);
    } catch (notificationError) {
      console.error('❌ Error notifying hotel/broker about ride rejection:', notificationError);
      // Don't fail the ride rejection if notification fails
    }

    res.json(booking);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/bookings/:id/start
// @desc     Start a ride (Rider)
// @access   Private (Rider)
exports.startRide = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('pickupLocation.city_id', 'name _id')
      .populate('destinationLocation.city_id', 'name _id');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Check if the user is the assigned rider for this booking
    if (booking.rider.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Only the assigned rider can start this ride' });
    }

    // Check if the booking is in a state that can be started
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ msg: 'Only confirmed rides can be started' });
    }

    // Update booking status to 'in_progress'
    booking.status = 'in_progress';
    booking.startedAt = new Date();
    booking.startedBy = req.user.id;

    await booking.save();

    // Emit socket event for real-time updates
    req.io.emit('rideStarted', {
      bookingId: req.params.id,
      riderId: req.user.id,
      startedAt: booking.startedAt
    });

    // Notify hotel/broker about ride start
    try {
      await notifyHotelBrokerRideStart(booking, req.io);
    } catch (notificationError) {
      console.error('❌ Error notifying hotel/broker about ride start:', notificationError);
      // Don't fail the ride start if notification fails
    }

    res.json({
      msg: 'Ride started successfully',
      booking: booking,
      vehicleUpdateRequired: true,
      fromLocation: booking.pickupLocation.city_id,
      toLocation: booking.destinationLocation.city_id
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    PUT api/bookings/:id/finish
// @desc     Finish a ride (Rider)
// @access   Private (Rider)
exports.finishRide = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('pickupLocation.city_id', 'name _id')
      .populate('destinationLocation.city_id', 'name _id');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Check if the user is the assigned rider for this booking
    if (booking.rider.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Only the assigned rider can finish this ride' });
    }

    // Check if the booking is in a state that can be finished
    if (booking.status !== 'in_progress') {
      return res.status(400).json({ msg: 'Only in-progress rides can be finished' });
    }

    // Update booking status to 'completed'
    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.completedBy = req.user.id;

    await booking.save();

    // Update rider earnings summary
    try {
      await EarningsService.updateRiderEarningsSummary(req.user.id);
      console.log(`Updated earnings summary for rider ${req.user.id} after completing booking ${req.params.id}`);
    } catch (earningsError) {
      console.error('Error updating earnings summary:', earningsError);
      // Don't fail the ride completion if earnings update fails
    }

    // Update hotel/broker commission summary
    try {
      await HotelBrokerCommissionService.updateCommissionOnBookingCompletion(booking.user, req.params.id);
      console.log(`Updated commission summary for hotel/broker ${booking.user} after completing booking ${req.params.id}`);
    } catch (commissionError) {
      console.error('Error updating commission summary:', commissionError);
      // Don't fail the ride completion if commission update fails
    }

    // Emit socket event for real-time updates
    req.io.emit('rideCompleted', {
      bookingId: req.params.id,
      riderId: req.user.id,
      completedAt: booking.completedAt
    });

    res.json({
      msg: 'Ride completed successfully',
      booking: booking
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// @route    GET api/bookings/history
// @desc     Get ride history for riders (completed rides)
// @access   Private (Rider only)
exports.getRideHistory = async (req, res) => {
  try {
    // Check if user is a rider
    if (req.user.role !== 'ride') {
      return res.status(403).json({ msg: 'Access denied. Only riders can view ride history.' });
    }

    // Get all completed rides for the current rider
    const completedRides = await Booking.find({
      status: 'completed',
      rider: req.user.id
    })
      .populate('user', 'fullName email role')
      .populate('pickupLocation.city_id', 'name')
      .populate('pickupLocation.sub_area_id', 'name')
      .populate('destinationLocation.city_id', 'name')
      .populate('destinationLocation.sub_area_id', 'name')
      .populate('rider', 'fullName')
      .sort({ completedAt: -1 }); // Sort by completion date, most recent first

    console.log(`getRideHistory: Found ${completedRides.length} completed rides for rider ${req.user.id}`);

    // Add additional computed fields for the frontend
    const ridesWithDetails = completedRides.map(ride => ({
      ...ride.toObject(),
      rideDuration: ride.completedAt && ride.startedAt 
        ? Math.round((ride.completedAt - ride.startedAt) / (1000 * 60)) // Duration in minutes
        : null,
      daysAgo: ride.completedAt 
        ? Math.floor((Date.now() - ride.completedAt) / (1000 * 60 * 60 * 24)) // Days since completion
        : null
    }));

    res.json(ridesWithDetails);
  } catch (err) {
    console.error('getRideHistory error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route    GET api/bookings/finished
// @desc     Get all finished rides (Admin only)
// @access   Private (Admin only)
exports.getFinishedRides = async (req, res) => {
  try {
    // Get all completed and cancelled rides
    const finishedRides = await Booking.find({
      status: { $in: ['completed', 'cancelled'] }
    })
      .populate('user', 'fullName email phone')
      .populate('pickupLocation.city_id', 'name')
      .populate('pickupLocation.sub_area_id', 'name')
      .populate('destinationLocation.city_id', 'name')
      .populate('destinationLocation.sub_area_id', 'name')
      .populate('rider', 'fullName email phone')
      .sort({ completedAt: -1, createdAt: -1 });

    console.log(`getFinishedRides: Found ${finishedRides.length} finished rides`);

    // Add computed fields
    const ridesWithDetails = finishedRides.map(ride => ({
      ...ride.toObject(),
      rideDuration: ride.completedAt && ride.startedAt 
        ? Math.round((ride.completedAt - ride.startedAt) / (1000 * 60))
        : null,
      daysAgo: ride.completedAt 
        ? Math.floor((Date.now() - ride.completedAt) / (1000 * 60 * 60 * 24))
        : ride.createdAt 
          ? Math.floor((Date.now() - ride.createdAt) / (1000 * 60 * 60 * 24))
          : null
    }));

    res.json(ridesWithDetails);
  } catch (err) {
    console.error('getFinishedRides error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route    GET api/bookings/on-the-way
// @desc     Get all on-the-way rides (Admin only)
// @access   Private (Admin only)
exports.getOnTheWayRides = async (req, res) => {
  try {
    // Get all active rides (accepted, on_the_way, arrived, in_progress)
    const onTheWayRides = await Booking.find({
      status: { $in: ['accepted', 'on_the_way', 'arrived', 'in_progress'] }
    })
      .populate('user', 'fullName email phone')
      .populate('pickupLocation.city_id', 'name')
      .populate('pickupLocation.sub_area_id', 'name')
      .populate('destinationLocation.city_id', 'name')
      .populate('destinationLocation.sub_area_id', 'name')
      .populate('rider', 'fullName email phone')
      .sort({ createdAt: -1 });

    console.log(`getOnTheWayRides: Found ${onTheWayRides.length} active rides`);

    // Add computed fields
    const ridesWithDetails = onTheWayRides.map(ride => ({
      ...ride.toObject(),
      timeSinceStarted: ride.startedAt 
        ? Math.floor((Date.now() - ride.startedAt) / (1000 * 60)) // Minutes since started
        : null
    }));

    res.json(ridesWithDetails);
  } catch (err) {
    console.error('getOnTheWayRides error:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route    DELETE api/bookings/:id
// @desc     Delete a booking with reason tracking and cleanup
// @access   Private (Hotel/Broker/Admin)
exports.deleteBooking = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ msg: 'Deletion reason is required' });
    }

    // Find the booking with all related data
    const booking = await Booking.findById(id)
      .populate('user', 'fullName email role')
      .populate('rider', 'fullName email')
      .populate('confirmedBid');

    if (!booking) {
      return res.status(404).json({ msg: 'Booking not found' });
    }

    // Check if user has permission to delete this booking
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Only allow deletion if user is admin, or the booking creator, or the confirmed rider
    const canDelete = currentUser.role === 'admin' || 
                     booking.user._id.toString() === req.user.id ||
                     (booking.rider && booking.rider._id.toString() === req.user.id);

    if (!canDelete) {
      return res.status(403).json({ msg: 'Not authorized to delete this booking' });
    }

    // Find all bids for this booking
    const bids = await Bid.find({ booking: id }).populate('rider', 'fullName email');
    
    console.log(`[DELETE BOOKING] Found ${bids.length} bids for booking ${id}`);

    // Restore bid limits for riders who placed bids
    const globalLimit = await RideLimit.getGlobalRideLimit();
    const restoredRiders = [];

    for (const bid of bids) {
      const riderId = bid.rider._id.toString();
      console.log(`[DELETE BOOKING] Restoring bid limit for rider: ${riderId}`);
      
      // Get current usage
      const currentUsage = globalLimit.dailyUsage.get(riderId);
      if (currentUsage && currentUsage.ridesUsed > 0) {
        // Decrement the ride count by 1
        const newRidesUsed = Math.max(0, currentUsage.ridesUsed - 1);
        globalLimit.dailyUsage.set(riderId, {
          ...currentUsage,
          ridesUsed: newRidesUsed
        });
        
        restoredRiders.push({
          riderId,
          riderName: bid.rider.fullName,
          previousCount: currentUsage.ridesUsed,
          newCount: newRidesUsed
        });
        
        console.log(`[DELETE BOOKING] Restored rider ${riderId}: ${currentUsage.ridesUsed} -> ${newRidesUsed}`);
      }
    }

    // Save the updated ride limits
    if (restoredRiders.length > 0) {
      await globalLimit.save();
      console.log(`[DELETE BOOKING] Saved updated ride limits for ${restoredRiders.length} riders`);
    }

    // Create deleted booking record for admin dashboard
    const deletedBookingData = {
      originalBookingId: booking._id,
      bookingData: booking.toObject(),
      deletedBy: {
        id: req.user.id,
        name: currentUser.fullName,
        email: currentUser.email,
        role: currentUser.role
      },
      deletionReason: reason.trim(),
      deletedAt: new Date(),
      relatedBids: bids.map(bid => ({
        bidId: bid._id,
        riderId: bid.rider._id,
        riderName: bid.rider.fullName,
        bidAmount: bid.bidAmount,
        status: bid.status
      })),
      restoredRiders: restoredRiders
    };

    // Store in a separate collection for admin tracking
    // We'll create a DeletedBooking model for this
    const DeletedBooking = require('../models/DeletedBooking');
    const deletedBooking = new DeletedBooking(deletedBookingData);
    await deletedBooking.save();

    // Delete all related bids
    await Bid.deleteMany({ booking: id });
    console.log(`[DELETE BOOKING] Deleted ${bids.length} related bids`);

    // Delete the booking
    await Booking.findByIdAndDelete(id);
    console.log(`[DELETE BOOKING] Deleted booking ${id}`);

    // Emit socket event to notify clients
    if (req.io) {
      req.io.emit('bookingDeleted', { 
        bookingId: id, 
        deletedBy: req.user.id,
        reason: reason.trim()
      });
    }

    res.json({
      msg: 'Booking deleted successfully',
      deletedBookingId: id,
      restoredRiders: restoredRiders,
      deletedBidsCount: bids.length
    });

  } catch (err) {
    console.error('deleteBooking error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * Notify waiting riders when a new booking is created in their location
 * @param {Object} booking - The newly created booking
 * @param {Object} io - Socket.io instance
 */
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

/**
 * Notify hotel/broker when a ride is started
 * @param {Object} booking - The booking object
 * @param {Object} io - Socket.io instance
 */
async function notifyHotelBrokerRideStart(booking, io) {
  try {
    console.log('🚗 [NOTIFY HOTEL/BROKER RIDE START] Starting notification process...');
    console.log(`🚗 Booking ID: ${booking._id}, Hotel/Broker ID: ${booking.user}`);
    
    // Get booking details with populated data
    const bookingWithDetails = await Booking.findById(booking._id)
      .populate('user', 'fullName email role')
      .populate('rider', 'fullName')
      .populate('pickupLocation.city_id', 'name')
      .populate('pickupLocation.sub_area_id', 'name')
      .populate('destinationLocation.city_id', 'name')
      .populate('destinationLocation.sub_area_id', 'name');

    if (!bookingWithDetails) {
      console.log('❌ Could not fetch booking details for notification');
      return;
    }

    const hotelBroker = bookingWithDetails.user;
    const rider = bookingWithDetails.rider;
    const pickupCity = bookingWithDetails.pickupLocation.city_id?.name || 'Unknown City';
    const pickupSubArea = bookingWithDetails.pickupLocation.sub_area_id?.name || 'Unknown Area';
    const destinationCity = bookingWithDetails.destinationLocation?.city_id?.name || 'Unknown Destination';
    
    // Create notification content
    const notificationTitle = 'Ride Started! 🚗';
    const notificationBody = `Your ride from ${pickupCity} - ${pickupSubArea} to ${destinationCity} has been started by ${rider?.fullName || 'the rider'}.`;
    
    const notificationData = {
      bookingId: booking._id,
      pickupCity: pickupCity,
      pickupSubArea: pickupSubArea,
      destinationCity: destinationCity,
      riderName: rider?.fullName || 'Unknown Rider',
      totalAmount: booking.totalAmount,
      pickupDate: booking.pickupDate,
      pickupTime: booking.pickupTime,
      startedAt: booking.startedAt,
      type: 'ride_started'
    };

    // Send notification to hotel/broker
    const pushNotificationService = new PushNotificationService(io);
    const result = await pushNotificationService.sendNotificationToUsers(
      [hotelBroker._id.toString()],
      notificationTitle,
      notificationBody,
      notificationData
    );

    console.log(`🚗 [NOTIFY HOTEL/BROKER RIDE START] Notification sent to hotel/broker: ${hotelBroker.fullName}`);
    console.log(`🚗 [NOTIFY HOTEL/BROKER RIDE START] Result: ${result.sentCount} notifications sent`);

  } catch (error) {
    console.error('❌ [NOTIFY HOTEL/BROKER RIDE START] Error:', error);
    throw error;
  }
}

/**
 * Notify hotel/broker when a ride is rejected
 * @param {Object} booking - The booking object
 * @param {String} reason - The rejection reason
 * @param {Object} io - Socket.io instance
 */
async function notifyHotelBrokerRideRejection(booking, reason, io) {
  try {
    console.log('❌ [NOTIFY HOTEL/BROKER RIDE REJECTION] Starting notification process...');
    console.log(`❌ Booking ID: ${booking._id}, Hotel/Broker ID: ${booking.user}, Reason: ${reason}`);
    
    // Get booking details with populated data
    const bookingWithDetails = await Booking.findById(booking._id)
      .populate('user', 'fullName email role')
      .populate('rider', 'fullName')
      .populate('pickupLocation.city_id', 'name')
      .populate('pickupLocation.sub_area_id', 'name')
      .populate('destinationLocation.city_id', 'name')
      .populate('destinationLocation.sub_area_id', 'name');

    if (!bookingWithDetails) {
      console.log('❌ Could not fetch booking details for notification');
      return;
    }

    const hotelBroker = bookingWithDetails.user;
    const rider = bookingWithDetails.rider;
    const pickupCity = bookingWithDetails.pickupLocation.city_id?.name || 'Unknown City';
    const pickupSubArea = bookingWithDetails.pickupLocation.sub_area_id?.name || 'Unknown Area';
    const destinationCity = bookingWithDetails.destinationLocation?.city_id?.name || 'Unknown Destination';
    
    // Create notification content
    const notificationTitle = 'Ride Rejected ❌';
    const notificationBody = `Your ride from ${pickupCity} - ${pickupSubArea} to ${destinationCity} has been rejected by ${rider?.fullName || 'the rider'}. Reason: ${reason}`;
    
    const notificationData = {
      bookingId: booking._id,
      pickupCity: pickupCity,
      pickupSubArea: pickupSubArea,
      destinationCity: destinationCity,
      riderName: rider?.fullName || 'Unknown Rider',
      totalAmount: booking.totalAmount,
      pickupDate: booking.pickupDate,
      pickupTime: booking.pickupTime,
      rejectionReason: reason,
      rejectedAt: booking.rejectedAt,
      type: 'ride_rejected'
    };

    // Send notification to hotel/broker
    const pushNotificationService = new PushNotificationService(io);
    const result = await pushNotificationService.sendNotificationToUsers(
      [hotelBroker._id.toString()],
      notificationTitle,
      notificationBody,
      notificationData
    );

    console.log(`❌ [NOTIFY HOTEL/BROKER RIDE REJECTION] Notification sent to hotel/broker: ${hotelBroker.fullName}`);
    console.log(`❌ [NOTIFY HOTEL/BROKER RIDE REJECTION] Result: ${result.sentCount} notifications sent`);

  } catch (error) {
    console.error('❌ [NOTIFY HOTEL/BROKER RIDE REJECTION] Error:', error);
    throw error;
  }
}
