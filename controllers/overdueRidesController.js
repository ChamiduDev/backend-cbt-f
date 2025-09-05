const Booking = require('../models/Booking');
const User = require('../models/User');
const moment = require('moment-timezone');

// @desc    Get all overdue rides
// @route   GET /api/overdue-rides
// @access  Private (Admin only)
exports.getOverdueRides = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get current time in Sri Lanka timezone
    const now = moment().tz('Asia/Colombo');

    // Find bookings that are overdue (past pickup time and still confirmed/in_progress)
    const overdueBookings = await Booking.find({
      status: { $in: ['confirmed', 'in_progress'] },
      pickupDate: { $lt: now.toDate() }, // Pickup date is in the past
    })
    .populate('user', 'fullName email phoneNumber role')
    .populate('rider', 'fullName email phoneNumber vehicles')
    .populate('pickupLocation.city_id', 'name')
    .populate('pickupLocation.sub_area_id', 'name')
    .populate('destinationLocation.city_id', 'name')
    .populate('destinationLocation.sub_area_id', 'name')
    .sort({ pickupDate: 1 }) // Sort by oldest overdue first
    .skip(skip)
    .limit(parseInt(limit));

    // Calculate overdue duration for each booking
    const overdueRides = overdueBookings.map(booking => {
      // Create pickup datetime by combining pickupDate and pickupTime in Sri Lanka timezone
      const pickupDate = moment(booking.pickupDate).format('YYYY-MM-DD');
      const pickupTime = booking.pickupTime;
      const pickupDateTime = moment.tz(`${pickupDate} ${pickupTime}`, 'Asia/Colombo');
      
      const overdueDuration = moment.duration(now.diff(pickupDateTime));
      const totalMinutes = Math.max(0, Math.floor(overdueDuration.asMinutes()));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      return {
        ...booking.toObject(),
        overdueDuration: {
          hours: hours,
          minutes: minutes,
          totalMinutes: totalMinutes
        },
        pickupDateTime: pickupDateTime.toISOString()
      };
    });

    // Get total count for pagination
    const totalOverdue = await Booking.countDocuments({
      status: { $in: ['confirmed', 'in_progress'] },
      pickupDate: { $lt: now.toDate() },
    });

    res.json({
      success: true,
      data: overdueRides,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOverdue / limit),
        totalItems: totalOverdue,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching overdue rides:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching overdue rides',
      error: error.message
    });
  }
};

// @desc    Get overdue rides statistics
// @route   GET /api/overdue-rides/stats
// @access  Private (Admin only)
exports.getOverdueStats = async (req, res) => {
  try {
    // Get current time in Sri Lanka timezone
    const now = moment().tz('Asia/Colombo');

    // Find overdue bookings
    const overdueBookings = await Booking.find({
      status: { $in: ['confirmed', 'in_progress'] },
      pickupDate: { $lt: now.toDate() }, // Pickup date is in the past
    });

    // Calculate statistics
    const totalOverdue = overdueBookings.length;
    
    const byStatus = overdueBookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate average overdue time
    let totalOverdueMinutes = 0;
    overdueBookings.forEach(booking => {
      // Create pickup datetime by combining pickupDate and pickupTime in Sri Lanka timezone
      const pickupDate = moment(booking.pickupDate).format('YYYY-MM-DD');
      const pickupTime = booking.pickupTime;
      const pickupDateTime = moment.tz(`${pickupDate} ${pickupTime}`, 'Asia/Colombo');
      
      const overdueDuration = moment.duration(now.diff(pickupDateTime));
      const overdueMinutes = Math.max(0, Math.floor(overdueDuration.asMinutes()));
      totalOverdueMinutes += overdueMinutes;
    });

    const averageOverdueMinutes = totalOverdue > 0 ? Math.round(totalOverdueMinutes / totalOverdue) : 0;

    res.json({
      success: true,
      stats: {
        totalOverdue,
        byStatus: {
          confirmed: byStatus.confirmed || 0,
          in_progress: byStatus.in_progress || 0
        },
        averageOverdueMinutes
      }
    });
  } catch (error) {
    console.error('Error fetching overdue stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching overdue statistics',
      error: error.message
    });
  }
};
