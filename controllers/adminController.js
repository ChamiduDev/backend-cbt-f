const User = require('../models/User');
const VehicleStatus = require('../models/VehicleStatus');
const City = require('../models/City');
const EarningsService = require('../services/earningsService');
const HotelBrokerCommissionService = require('../services/hotelBrokerCommissionService');
const Booking = require('../models/Booking');
const Bid = require('../models/Bid');
const AppCommission = require('../models/AppCommission');
const RiderPayment = require('../models/RiderPayment');
const HotelBrokerPayment = require('../models/HotelBrokerPayment');
const RiderEarningsSummary = require('../models/RiderEarningsSummary');
const HotelBrokerCommissionSummary = require('../models/HotelBrokerCommissionSummary');
const mongoose = require('mongoose');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }); // Exclude admin user
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    user.approved = true;
    await user.save();
    res.json({ msg: 'User approved' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    user.approved = false;
    await user.save();
    res.json({ msg: 'User blocked' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    user.userStatus = 'rejected';
    await user.save();
    res.json({ msg: 'User rejected and suspended', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getVehicleStatusCounts = async (req, res) => {
  try {
    const waitingCount = await VehicleStatus.countDocuments({ status: 'waiting' });
    const onTheWayCount = await VehicleStatus.countDocuments({ status: 'on_the_way' });
    const notAvailableCount = await VehicleStatus.countDocuments({ status: 'not_available' });

    res.json({
      waiting: waitingCount,
      onTheWay: onTheWayCount,
      notAvailable: notAvailableCount,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getAllVehicleStatuses = async (req, res) => {
  try {
    const vehicleStatuses = await VehicleStatus.find()
      .populate({
        path: 'user',
        select: 'name email vehicles',
      })
      .populate('city_id', 'name')
      .populate('sub_area_id', 'name');

    // Process vehicle statuses to handle fromLocation and toLocation conversion
    const processedStatuses = [];
    
    for (let status of vehicleStatuses) {
      if (status.user && status.user.vehicles && status.user.vehicles[status.vehicleIndex]) {
        const vehicle = status.user.vehicles[status.vehicleIndex];
        
        let processedStatus = {
          _id: status._id,
          status: status.status,
          fromLocation: status.fromLocation,
          toLocation: status.toLocation,
          city_id: status.city_id,
          sub_area_id: status.sub_area_id,
          user: {
            _id: status.user._id,
            name: status.user.fullName,
          },
          vehicle: {
            vehicleNumber: vehicle.number,
            vehicleName: vehicle.model,
          },
        };

        // Handle fromLocation and toLocation conversion for on_the_way status
        if (status.status === 'on_the_way') {
          // Handle fromLocation
          if (status.fromLocation && typeof status.fromLocation === 'string') {
            try {
              const fromCity = await City.findById(status.fromLocation);
              if (fromCity) {
                processedStatus.fromLocation = { _id: fromCity._id, name: fromCity.name };
              } else {
                // If city not found, keep the original ID but add a note
                processedStatus.fromLocation = { _id: status.fromLocation, name: 'Unknown City' };
              }
            } catch (err) {
              console.error('Error fetching fromLocation city:', err);
              // Keep the original ID if there's an error
              processedStatus.fromLocation = { _id: status.fromLocation, name: 'Error Loading City' };
            }
          }

          // Handle toLocation
          if (status.toLocation && typeof status.toLocation === 'string') {
            try {
              const toCity = await City.findById(status.toLocation);
              if (toCity) {
                processedStatus.toLocation = { _id: toCity._id, name: toCity.name };
              } else {
                // If city not found, keep the original ID but add a note
                processedStatus.toLocation = { _id: status.toLocation, name: 'Unknown City' };
              }
            } catch (err) {
              console.error('Error fetching toLocation city:', err);
              // Keep the original ID if there's an error
              processedStatus.toLocation = { _id: status.toLocation, name: 'Error Loading City' };
            }
          }
        }

        processedStatuses.push(processedStatus);
      }
    }

    res.json(processedStatuses);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getRiderCommissionSummary = async (req, res) => {
  try {
    const { riderId } = req.params;
    
    // Verify the rider exists and has the correct role
    const rider = await User.findById(riderId);
    if (!rider) {
      return res.status(404).json({ message: 'Rider not found' });
    }
    
    if (rider.role !== 'ride') {
      return res.status(400).json({ message: 'User is not a rider' });
    }
    
    // Get pre-calculated earnings summary
    const earningsSummary = await EarningsService.getRiderEarningsSummary(riderId);
    
    res.json({
      totalEarnings: earningsSummary.totalEarnings,
      totalCommission: earningsSummary.totalCommission,
      totalHotelCommission: earningsSummary.totalHotelCommission,
      totalAppCommission: earningsSummary.totalAppCommission,
      paidAmount: earningsSummary.totalPaidCommission,
      pendingAmount: earningsSummary.pendingCommission,
      completedRides: earningsSummary.totalRides,
      lastUpdated: earningsSummary.lastUpdated
    });
  } catch (error) {
    console.error('Error fetching rider commission summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getCommissionAnalytics = async (req, res) => {
  try {
    const { dateFrom, dateTo, riderId, pendingOnly } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.completedAt = {};
      if (dateFrom) {
        dateFilter.completedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.completedAt.$lte = endDate;
      }
    }

    // Build rider filter
    const riderFilter = {};
    if (riderId && riderId !== 'all') {
      riderFilter.rider = new mongoose.Types.ObjectId(riderId);
    }

    // Get completed bookings with confirmed bids
    const completedBookings = await Booking.find({
      status: 'completed',
      confirmedBid: { $exists: true, $ne: null },
      ...dateFilter,
      ...riderFilter
    })
    .populate('rider', 'fullName email phone')
    .populate('confirmedBid')
    .sort({ completedAt: -1 });

    // Get app commission settings
    const appCommissionSettings = await AppCommission.findOne();
    const appCommissionType = appCommissionSettings?.type || 'percentage';
    const appCommissionValue = appCommissionSettings?.value || 10;

    // Calculate totals
    let totalRideValue = 0;
    let totalHotelCommission = 0;
    let totalAppCommission = 0;
    let totalRiderEarnings = 0;
    let totalRides = completedBookings.length;

    // Group by date for daily breakdown
    const dailyMap = new Map();
    const riderMap = new Map();

    for (const booking of completedBookings) {
      const confirmedBid = booking.confirmedBid;
      if (!confirmedBid) continue;

      const bidAmount = confirmedBid.bidAmount || 0;
      const hotelCommission = booking.commission || 0;
      
      // Calculate app commission based on bid amount
      let appCommission = 0;
      if (appCommissionType === 'percentage') {
        appCommission = bidAmount * (appCommissionValue / 100);
      } else {
        appCommission = appCommissionValue;
      }
      
      // Calculate rider earnings
      const riderEarnings = bidAmount - hotelCommission - appCommission;

      // Add to totals
      totalRideValue += bidAmount;
      totalHotelCommission += hotelCommission;
      totalAppCommission += appCommission;
      totalRiderEarnings += riderEarnings;

      // Group by date
      const dateKey = booking.completedAt.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalRideValue: 0,
          totalHotelCommission: 0,
          totalAppCommission: 0,
          totalRiderEarnings: 0,
          rideCount: 0
        });
      }
      const dailyData = dailyMap.get(dateKey);
      dailyData.totalRideValue += bidAmount;
      dailyData.totalHotelCommission += hotelCommission;
      dailyData.totalAppCommission += appCommission;
      dailyData.totalRiderEarnings += riderEarnings;
      dailyData.rideCount += 1;

      // Group by rider
      const riderId = booking.rider._id.toString();
      if (!riderMap.has(riderId)) {
        riderMap.set(riderId, {
          rider: booking.rider,
          totalRideValue: 0,
          totalHotelCommission: 0,
          totalAppCommission: 0,
          totalRiderEarnings: 0,
          rideCount: 0,
          pendingAmount: 0
        });
      }
      const riderData = riderMap.get(riderId);
      riderData.totalRideValue += bidAmount;
      riderData.totalHotelCommission += hotelCommission;
      riderData.totalAppCommission += appCommission;
      riderData.totalRiderEarnings += riderEarnings;
      riderData.rideCount += 1;
    }

    // Calculate pending amounts for each rider
    for (const [riderId, riderData] of riderMap) {
      try {
        const earningsSummary = await EarningsService.getRiderEarningsSummary(riderId);
        riderData.pendingAmount = earningsSummary.pendingCommission || 0;
      } catch (error) {
        console.error(`Error fetching pending amount for rider ${riderId}:`, error);
        riderData.pendingAmount = 0;
      }
    }

    // Convert maps to arrays and sort
    const dailyBreakdown = Array.from(dailyMap.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const riderBreakdown = Array.from(riderMap.values())
      .sort((a, b) => b.totalRiderEarnings - a.totalRiderEarnings);

    // Filter riders with pending commissions if requested
    let filteredRiderBreakdown = riderBreakdown;
    if (pendingOnly === 'true') {
      filteredRiderBreakdown = riderBreakdown.filter(rider => rider.pendingAmount > 0);
    }

    // Calculate pending commission statistics
    const ridersWithPendingCommissions = riderBreakdown.filter(rider => rider.pendingAmount > 0).length;
    const totalPendingCommissions = riderBreakdown.reduce((sum, rider) => sum + rider.pendingAmount, 0);

    // Create pending riders list
    const pendingRiders = riderBreakdown
      .filter(rider => rider.pendingAmount > 0)
      .map(rider => ({
        riderId: rider.rider._id,
        riderName: rider.rider.fullName,
        riderEmail: rider.rider.email,
        pendingAmount: rider.pendingAmount,
        completedRides: rider.rideCount,
        lastRideDate: new Date().toISOString() // This would need to be calculated from actual data
      }))
      .sort((a, b) => b.pendingAmount - a.pendingAmount);

    const totalCommissions = totalHotelCommission + totalAppCommission;

    res.json({
      totalRideValue,
      totalHotelCommission,
      totalAppCommission,
      totalCommissions,
      totalRiderEarnings,
      totalRides,
      ridersWithPendingCommissions,
      totalPendingCommissions,
      dailyBreakdown,
      riderBreakdown: filteredRiderBreakdown,
      pendingRiders
    });
  } catch (error) {
    console.error('Error fetching commission analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getHotelCommissionAnalytics = async (req, res) => {
  try {
    const { dateFrom, dateTo, hotelId } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.completedAt = {};
      if (dateFrom) {
        dateFilter.completedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.completedAt.$lte = endDate;
      }
    }

    // Build hotel filter
    const hotelFilter = {};
    if (hotelId && hotelId !== 'all') {
      hotelFilter.user = new mongoose.Types.ObjectId(hotelId);
    }

    // Get completed bookings with confirmed bids
    const completedBookings = await Booking.find({
      status: 'completed',
      confirmedBid: { $exists: true, $ne: null },
      ...dateFilter,
      ...hotelFilter
    })
    .populate('user', 'fullName email phone businessName')
    .populate('confirmedBid')
    .sort({ completedAt: -1 });

    // Get all hotels for total count
    const totalHotels = await User.countDocuments({ role: 'hotel' });

    // Calculate totals
    let totalPaidCommissions = 0;
    let totalPendingCommissions = 0;
    let hotelsWithPendingCommissions = 0;

    // Group by hotel
    const hotelMap = new Map();

    for (const booking of completedBookings) {
      const confirmedBid = booking.confirmedBid;
      if (!confirmedBid || !booking.user) continue;

      const hotelCommission = booking.commission || 0;
      const hotelId = booking.user._id.toString();

      if (!hotelMap.has(hotelId)) {
        hotelMap.set(hotelId, {
          hotel: booking.user,
          totalCommission: 0,
          completedRides: 0,
          lastRideDate: booking.completedAt
        });
      }

      const hotelData = hotelMap.get(hotelId);
      hotelData.totalCommission += hotelCommission;
      hotelData.completedRides += 1;
      hotelData.lastRideDate = new Date(Math.max(
        new Date(hotelData.lastRideDate).getTime(),
        new Date(booking.completedAt).getTime()
      ));
    }

    // Calculate pending amounts for each hotel
    const pendingHotels = [];
    for (const [hotelId, hotelData] of hotelMap) {
      try {
        const commissionSummary = await HotelBrokerCommissionService.getCommissionSummary(hotelId);
        const pendingAmount = commissionSummary.pendingAmount || 0;
        
        if (pendingAmount > 0) {
          hotelsWithPendingCommissions++;
          totalPendingCommissions += pendingAmount;
          
          pendingHotels.push({
            hotelId: hotelId,
            hotelName: hotelData.hotel.fullName,
            businessName: hotelData.hotel.businessName || hotelData.hotel.fullName,
            hotelEmail: hotelData.hotel.email,
            pendingAmount: pendingAmount,
            completedRides: hotelData.completedRides,
            lastRideDate: hotelData.lastRideDate.toISOString()
          });
        }

        // Calculate total paid commissions
        const paidAmount = commissionSummary.totalPaidAmount || 0;
        totalPaidCommissions += paidAmount;
      } catch (error) {
        console.error(`Error fetching commission summary for hotel ${hotelId}:`, error);
      }
    }

    // Sort pending hotels by pending amount (highest first)
    pendingHotels.sort((a, b) => b.pendingAmount - a.pendingAmount);

    const averagePendingPerHotel = hotelsWithPendingCommissions > 0 
      ? totalPendingCommissions / hotelsWithPendingCommissions 
      : 0;

    res.json({
      totalHotels,
      hotelsWithPendingCommissions,
      totalPaidCommissions,
      totalPendingCommissions,
      averagePendingPerHotel,
      pendingHotels
    });
  } catch (error) {
    console.error('Error fetching hotel commission analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.completedAt = {};
      if (dateFrom) {
        dateFilter.completedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.completedAt.$lte = endDate;
      }
    }

    // Get completed bookings with confirmed bids
    const completedBookings = await Booking.find({
      status: 'completed',
      confirmedBid: { $exists: true, $ne: null },
      ...dateFilter
    })
    .populate('rider', 'fullName email')
    .populate('user', 'fullName email businessName')
    .populate('confirmedBid')
    .sort({ completedAt: -1 });

    // Get app commission settings
    const appCommissionSettings = await AppCommission.findOne();
    const appCommissionType = appCommissionSettings?.type || 'percentage';
    const appCommissionValue = appCommissionSettings?.value || 10;

    // Calculate totals
    let totalRideValue = 0;
    let totalHotelCommission = 0;
    let totalAppCommission = 0;
    let totalRiderEarnings = 0;
    let totalRides = completedBookings.length;

    // Group by date for daily breakdown
    const dailyMap = new Map();
    const monthlyMap = new Map();

    for (const booking of completedBookings) {
      const confirmedBid = booking.confirmedBid;
      if (!confirmedBid) continue;

      const bidAmount = confirmedBid.bidAmount || 0;
      const hotelCommission = booking.commission || 0;
      
      // Calculate app commission based on bid amount
      let appCommission = 0;
      if (appCommissionType === 'percentage') {
        appCommission = bidAmount * (appCommissionValue / 100);
      } else {
        appCommission = appCommissionValue;
      }
      
      // Calculate rider earnings
      const riderEarnings = bidAmount - hotelCommission - appCommission;

      // Add to totals
      totalRideValue += bidAmount;
      totalHotelCommission += hotelCommission;
      totalAppCommission += appCommission;
      totalRiderEarnings += riderEarnings;

      // Group by date
      const dateKey = booking.completedAt.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalRideValue: 0,
          totalHotelCommission: 0,
          totalAppCommission: 0,
          totalRiderEarnings: 0,
          rideCount: 0
        });
      }
      const dailyData = dailyMap.get(dateKey);
      dailyData.totalRideValue += bidAmount;
      dailyData.totalHotelCommission += hotelCommission;
      dailyData.totalAppCommission += appCommission;
      dailyData.totalRiderEarnings += riderEarnings;
      dailyData.rideCount += 1;

      // Group by month
      const monthKey = booking.completedAt.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          totalRideValue: 0,
          totalHotelCommission: 0,
          totalAppCommission: 0,
          totalRiderEarnings: 0,
          rideCount: 0
        });
      }
      const monthlyData = monthlyMap.get(monthKey);
      monthlyData.totalRideValue += bidAmount;
      monthlyData.totalHotelCommission += hotelCommission;
      monthlyData.totalAppCommission += appCommission;
      monthlyData.totalRiderEarnings += riderEarnings;
      monthlyData.rideCount += 1;
    }

    // Get payment summaries
    const totalRiderPayments = await RiderPayment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalHotelPayments = await HotelBrokerPayment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalRiderPaymentsAmount = totalRiderPayments.length > 0 ? totalRiderPayments[0].total : 0;
    const totalHotelPaymentsAmount = totalHotelPayments.length > 0 ? totalHotelPayments[0].total : 0;

    // Convert maps to arrays and sort
    const dailyBreakdown = Array.from(dailyMap.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const monthlyBreakdown = Array.from(monthlyMap.values())
      .sort((a, b) => new Date(b.month) - new Date(a.month));

    // Calculate platform revenue (app commission)
    const platformRevenue = totalAppCommission;
    const totalCommissions = totalHotelCommission + totalAppCommission;
    const netRevenue = totalRideValue - totalRiderEarnings - totalHotelCommission;

    res.json({
      // Overall totals
      totalRideValue,
      totalHotelCommission,
      totalAppCommission,
      totalRiderEarnings,
      totalRides,
      platformRevenue,
      netRevenue,
      
      // Payment summaries
      totalRiderPayments: totalRiderPaymentsAmount,
      totalHotelPayments: totalHotelPaymentsAmount,
      totalPayments: totalRiderPaymentsAmount + totalHotelPaymentsAmount,
      
      // Breakdowns
      dailyBreakdown: dailyBreakdown.slice(0, 30), // Last 30 days
      monthlyBreakdown: monthlyBreakdown.slice(0, 12), // Last 12 months
      
      // Statistics
      averageRideValue: totalRides > 0 ? totalRideValue / totalRides : 0,
      averageDailyRevenue: dailyBreakdown.length > 0 ? 
        dailyBreakdown.reduce((sum, day) => sum + day.totalRideValue, 0) / Math.min(dailyBreakdown.length, 30) : 0,
      averageMonthlyRevenue: monthlyBreakdown.length > 0 ? 
        monthlyBreakdown.reduce((sum, month) => sum + month.totalRideValue, 0) / Math.min(monthlyBreakdown.length, 12) : 0
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Dashboard Analytics
exports.getDashboardAnalytics = async (req, res) => {
  try {
    // Get user counts by role
    const userCounts = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const userStats = userCounts.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get booking statistics
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$rideValue' }
        }
      }
    ]);

    const bookingData = bookingStats.reduce((acc, item) => {
      acc[item._id] = {
        count: item.count,
        totalValue: item.totalValue || 0
      };
      return acc;
    }, {});

    // Get recent bookings (last 10)
    const recentBookings = await Booking.find()
      .populate('rider', 'fullName email')
      .populate('user', 'fullName businessName')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('rider user rideValue status createdAt pickupLocation destinationLocation');

    // Get today's statistics
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayBookings = await Booking.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const todayStats = {
      totalBookings: todayBookings.length,
      completedBookings: todayBookings.filter(b => b.status === 'completed').length,
      pendingBookings: todayBookings.filter(b => b.status === 'pending').length,
      totalValue: todayBookings.reduce((sum, b) => sum + (b.rideValue || 0), 0)
    };

    // Get weekly revenue trend (last 7 days)
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      const dayBookings = await Booking.find({
        status: 'completed',
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      
      const dayRevenue = dayBookings.reduce((sum, booking) => sum + (booking.rideValue || 0), 0);
      
      weeklyTrend.push({
        date: startOfDay.toISOString().split('T')[0],
        revenue: dayRevenue,
        bookings: dayBookings.length
      });
    }

    // Get pending commissions
    const pendingRiderCommissions = await RiderEarningsSummary.aggregate([
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$pendingCommission' },
          count: { $sum: 1 }
        }
      }
    ]);

    const pendingHotelCommissions = await HotelBrokerCommissionSummary.aggregate([
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$pendingAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      // User statistics
      totalUsers: Object.values(userStats).reduce((sum, count) => sum + count, 0),
      riders: userStats.ride || 0,
      hotels: userStats.hotel || 0,
      brokers: userStats.broker || 0,
      admins: userStats.admin || 0,

      // Booking statistics
      totalBookings: Object.values(bookingData).reduce((sum, data) => sum + data.count, 0),
      completedBookings: bookingData.completed?.count || 0,
      pendingBookings: bookingData.pending?.count || 0,
      cancelledBookings: bookingData.cancelled?.count || 0,

      // Revenue statistics
      totalRevenue: Object.values(bookingData).reduce((sum, data) => sum + data.totalValue, 0),
      completedRevenue: bookingData.completed?.totalValue || 0,

      // Today's statistics
      today: todayStats,

      // Pending commissions
      pendingRiderCommissions: pendingRiderCommissions[0]?.totalPending || 0,
      pendingHotelCommissions: pendingHotelCommissions[0]?.totalPending || 0,
      totalPendingCommissions: (pendingRiderCommissions[0]?.totalPending || 0) + (pendingHotelCommissions[0]?.totalPending || 0),

      // Recent activity
      recentBookings: recentBookings.map(booking => ({
        id: booking._id,
        riderName: booking.rider?.fullName || 'Unknown',
        hotelName: booking.user?.businessName || booking.user?.fullName || 'Unknown',
        value: booking.rideValue || 0,
        status: booking.status,
        createdAt: booking.createdAt,
        pickupLocation: booking.pickupLocation,
        destinationLocation: booking.destinationLocation
      })),

      // Weekly trend
      weeklyTrend
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};