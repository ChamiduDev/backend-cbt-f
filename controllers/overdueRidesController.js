const Booking = require('../models/Booking');
const User = require('../models/User');

// @desc    Get all overdue rides
// @route   GET /api/overdue-rides
// @access  Private (Admin only)
exports.getOverdueRides = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get current time in Sri Lanka timezone (UTC+5:30)
    const now = new Date();
    const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

    // Find bookings that are overdue (past pickup time and still confirmed/in_progress)
    const overdueBookings = await Booking.find({
      status: { $in: ['confirmed', 'in_progress'] },
      pickupDate: { $lte: sriLankaTime.toISOString().split('T')[0] },
      $or: [
        {
          pickupDate: { $lt: sriLankaTime.toISOString().split('T')[0] }
        },
        {
          pickupDate: sriLankaTime.toISOString().split('T')[0],
          pickupTime: { $lt: sriLankaTime.toTimeString().split(' ')[0] }
        }
      ]
    })
    .populate('user', 'fullName email phoneNumber role')
    .populate('rider', 'fullName email phoneNumber vehicles')
    .populate('pickupLocation.city_id', 'name')
    .populate('pickupLocation.sub_area_id', 'name')
    .populate('destinationLocation.city_id', 'name')
    .populate('destinationLocation.sub_area_id', 'name')
    .sort({ pickupDate: -1, pickupTime: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    // Calculate overdue duration for each booking
    const overdueRides = overdueBookings.map(booking => {
      const pickupDateTime = new Date(`${booking.pickupDate}T${booking.pickupTime}`);
      const overdueMs = sriLankaTime - pickupDateTime;
      const overdueMinutes = Math.floor(overdueMs / (1000 * 60));
      const overdueHours = Math.floor(overdueMinutes / 60);
      const remainingMinutes = overdueMinutes % 60;

      return {
        ...booking.toObject(),
        overdueDuration: {
          hours: overdueHours,
          minutes: remainingMinutes,
          totalMinutes: overdueMinutes
        },
        pickupDateTime: pickupDateTime.toISOString()
      };
    });

    // Get total count for pagination
    const totalOverdue = await Booking.countDocuments({
      status: { $in: ['confirmed', 'in_progress'] },
      pickupDate: { $lte: sriLankaTime.toISOString().split('T')[0] },
      $or: [
        {
          pickupDate: { $lt: sriLankaTime.toISOString().split('T')[0] }
        },
        {
          pickupDate: sriLankaTime.toISOString().split('T')[0],
          pickupTime: { $lt: sriLankaTime.toTimeString().split(' ')[0] }
        }
      ]
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
      message: 'Server error while fetching overdue rides' 
    });
  }
};

// @desc    Get overdue rides statistics
// @route   GET /api/overdue-rides/stats
// @access  Private (Admin only)
exports.getOverdueStats = async (req, res) => {
  try {
    // Get current time in Sri Lanka timezone (UTC+5:30)
    const now = new Date();
    const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));

    // Find overdue bookings
    const overdueBookings = await Booking.find({
      status: { $in: ['confirmed', 'in_progress'] },
      pickupDate: { $lte: sriLankaTime.toISOString().split('T')[0] },
      $or: [
        {
          pickupDate: { $lt: sriLankaTime.toISOString().split('T')[0] }
        },
        {
          pickupDate: sriLankaTime.toISOString().split('T')[0],
          pickupTime: { $lt: sriLankaTime.toTimeString().split(' ')[0] }
        }
      ]
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
      const pickupDateTime = new Date(`${booking.pickupDate}T${booking.pickupTime}`);
      const overdueMs = sriLankaTime - pickupDateTime;
      const overdueMinutes = Math.floor(overdueMs / (1000 * 60));
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
      message: 'Server error while fetching overdue statistics' 
    });
  }
};
