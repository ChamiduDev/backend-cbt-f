const DeletedBooking = require('../models/DeletedBooking');

// @route    GET api/deleted-bookings
// @desc     Get all deleted bookings (Admin only)
// @access   Private (Admin)
exports.getDeletedBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count
    const totalCount = await DeletedBooking.countDocuments();

    // Get deleted bookings with pagination
    const deletedBookings = await DeletedBooking.find()
      .sort({ deletedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: deletedBookings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('getDeletedBookings error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @route    GET api/deleted-bookings/:id
// @desc     Get a specific deleted booking (Admin only)
// @access   Private (Admin)
exports.getDeletedBooking = async (req, res) => {
  try {
    const deletedBooking = await DeletedBooking.findById(req.params.id);

    if (!deletedBooking) {
      return res.status(404).json({ msg: 'Deleted booking not found' });
    }

    res.json({
      success: true,
      data: deletedBooking
    });
  } catch (err) {
    console.error('getDeletedBooking error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// @route    GET api/deleted-bookings/stats
// @desc     Get deleted bookings statistics (Admin only)
// @access   Private (Admin)
exports.getDeletedBookingsStats = async (req, res) => {
  try {
    const totalDeleted = await DeletedBooking.countDocuments();
    
    // Get deleted bookings by role
    const deletedByRole = await DeletedBooking.aggregate([
      {
        $group: {
          _id: '$deletedBy.role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get deleted bookings by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const deletedLast30Days = await DeletedBooking.countDocuments({
      deletedAt: { $gte: thirtyDaysAgo }
    });

    // Get most common deletion reasons
    const commonReasons = await DeletedBooking.aggregate([
      {
        $group: {
          _id: '$deletionReason',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        totalDeleted,
        deletedByRole,
        deletedLast30Days,
        commonReasons
      }
    });
  } catch (err) {
    console.error('getDeletedBookingsStats error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};
