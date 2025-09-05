const PushNotificationService = require('../services/pushNotificationService');

// Initialize the push notification service with io instance
let pushNotificationService = null;

// Function to initialize the service with io instance
const initializePushNotificationService = (io) => {
  if (!pushNotificationService) {
    pushNotificationService = new PushNotificationService(io);
  }
  return pushNotificationService;
};

/**
 * Send push notification to users by role
 * POST /api/push-notifications/send-to-role
 */
exports.sendNotificationToRole = async (req, res) => {
  try {
    const { role, title, body, data } = req.body;

    // Validate required fields
    if (!role || !title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Role, title, and body are required'
      });
    }

    // Validate role
    const validRoles = ['hotel', 'broker', 'ride'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: hotel, broker, ride'
      });
    }

    // Initialize service with io instance
    const service = initializePushNotificationService(req.io);

    // Send notification
    const result = await service.sendNotificationToRole(
      role,
      title,
      body,
      data || {}
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error in sendNotificationToRole:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Send push notification to specific users
 * POST /api/push-notifications/send-to-users
 */
exports.sendNotificationToUsers = async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'UserIds array is required and must not be empty'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required'
      });
    }

    // Initialize service with io instance
    const service = initializePushNotificationService(req.io);

    // Send notification
    const result = await service.sendNotificationToUsers(
      userIds,
      title,
      body,
      data || {}
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error in sendNotificationToUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Send push notification to a specific user
 * POST /api/push-notifications/send-to-user
 */
exports.sendNotificationToUser = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'UserId is required'
      });
    }

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required'
      });
    }

    // Initialize service with io instance
    const service = initializePushNotificationService(req.io);

    // Send notification to single user
    const result = await service.sendNotificationToUsers(
      [userId],
      title,
      body,
      data || {}
    );

    if (result.success) {
      res.status(200).json({
        ...result,
        message: `Notification sent to user ${userId}`
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error in sendNotificationToUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Send push notification to all users
 * POST /api/push-notifications/send-to-all
 */
exports.sendNotificationToAll = async (req, res) => {
  try {
    const { title, body, data } = req.body;

    // Validate required fields
    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required'
      });
    }

    // Initialize service with io instance
    const service = initializePushNotificationService(req.io);

    // Send notification
    const result = await service.sendNotificationToAll(
      title,
      body,
      data || {}
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error in sendNotificationToAll:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get user statistics for notification targeting
 * GET /api/push-notifications/user-stats
 */
exports.getUserStats = async (req, res) => {
  try {
    // Initialize service with io instance
    const service = initializePushNotificationService(req.io);
    const result = await service.getUserStats();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error in getUserStats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Get list of users for notification targeting
 * GET /api/push-notifications/users?search=query&role=role
 */
exports.getUsers = async (req, res) => {
  try {
    const User = require('../models/User');
    const { search, role } = req.query;
    
    // Build search query
    let query = { userStatus: 'approved' }; // Only approved users
    
    // Add role filter if specified
    if (role && role !== 'all') {
      query.role = role;
    }
    
    // Add search filter if specified
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { username: searchRegex },
        { phoneNumber: searchRegex }
      ];
    }
    
    // Get users with extended info
    const users = await User.find(
      query,
      'id fullName email username phoneNumber role userStatus createdAt'
    ).sort({ createdAt: -1 });

    const formattedUsers = users.map(user => ({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      username: user.username || '',
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      userStatus: user.userStatus,
      createdAt: user.createdAt
    }));

    res.status(200).json({
      success: true,
      data: {
        users: formattedUsers,
        total: formattedUsers.length,
        searchQuery: search || '',
        roleFilter: role || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Error in getUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * Test push notification endpoint
 * POST /api/push-notifications/test
 */
exports.testNotification = async (req, res) => {
  try {
    const { title, body } = req.body;

    // Default test message if not provided
    const testTitle = title || 'Test Notification';
    const testBody = body || 'This is a test push notification from Ceylon Black Taxi admin panel.';

    // Initialize service with io instance
    const service = initializePushNotificationService(req.io);

    // Send test notification to all users
    const result = await service.sendNotificationToAll(
      testTitle,
      testBody,
      { type: 'test', source: 'admin_panel' }
    );

    if (result.success) {
      res.status(200).json({
        ...result,
        message: 'Test notification sent successfully'
      });
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ Error in testNotification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
