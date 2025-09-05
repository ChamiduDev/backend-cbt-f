const User = require('../models/User');
const Notification = require('../models/Notification');

class PushNotificationService {
  constructor(io) {
    this.io = io;
  }

  /**
   * Save notification to database for offline delivery
   * @param {string} recipientId - User ID to receive notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data payload
   * @param {string} type - Notification type
   * @returns {Promise<Object>} - Saved notification
   */
  async saveNotificationToDatabase(recipientId, title, body, data = {}, type = 'general') {
    try {
      const notification = new Notification({
        recipient: recipientId,
        title,
        body,
        data,
        type,
        status: 'pending'
      });

      await notification.save();
      console.log(`💾 Notification saved to database for user: ${recipientId}`);
      return notification;
    } catch (error) {
      console.error('❌ Error saving notification to database:', error);
      throw error;
    }
  }

  /**
   * Send push notification to users by role
   * @param {string} role - User role (hotel, broker, ride, admin)
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of the notification send
   */
  async sendNotificationToRole(role, title, body, data = {}) {
    try {
      // Get all users with the specified role and approved status
      const users = await User.find({ 
        role: role, 
        userStatus: 'approved' 
      }).select('_id fullName email');

      if (users.length === 0) {
        return {
          success: false,
          message: `No approved users found with role: ${role}`,
          sentCount: 0
        };
      }

      // Create notification payload
      const notificationPayload = {
        id: Date.now().toString(),
        type: 'admin_push_notification',
        title: title,
        body: body,
        data: {
          ...data,
          role: role,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        source: 'admin_panel'
      };

      // Save notifications to database for offline delivery
      const savedNotifications = [];
      for (const user of users) {
        try {
          const savedNotification = await this.saveNotificationToDatabase(
            user._id,
            title,
            body,
            { ...data, role: role, timestamp: new Date().toISOString() },
            'admin_notification'
          );
          savedNotifications.push(savedNotification);
        } catch (error) {
          console.error(`❌ Failed to save notification for user ${user._id}:`, error);
        }
      }

      // Send to all connected clients with the specified role
      this.io.to(`role_${role}`).emit('pushNotification', notificationPayload);
      
      // Also send to admin dashboard for logging
      this.io.to('admin').emit('notificationSent', {
        ...notificationPayload,
        targetRole: role,
        sentCount: users.length
      });
      
      console.log(`📱 Push notification sent to ${users.length} users with role: ${role}`);
      console.log(`📱 Notification: ${title} - ${body}`);
      console.log(`💾 ${savedNotifications.length} notifications saved to database for offline delivery`);

      return {
        success: true,
        message: `Notification sent successfully to ${users.length} users`,
        sentCount: users.length,
        targetRole: role,
        notificationId: notificationPayload.id,
        savedToDatabase: savedNotifications.length
      };

    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
        sentCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Send push notification to specific users by IDs
   * @param {Array<string>} userIds - Array of user IDs
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of the notification send
   */
  async sendNotificationToUsers(userIds, title, body, data = {}) {
    try {
      // Get users by IDs
      const users = await User.find({ 
        _id: { $in: userIds },
        userStatus: 'approved' 
      }).select('_id fullName email role');

      if (users.length === 0) {
        return {
          success: false,
          message: 'No approved users found with the provided IDs',
          sentCount: 0
        };
      }

      // Create notification payload
      const notificationPayload = {
        id: Date.now().toString(),
        type: 'admin_push_notification',
        title: title,
        body: body,
        data: {
          ...data,
          userIds: userIds,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        source: 'admin_panel'
      };

      // Save notifications to database for offline delivery
      const savedNotifications = [];
      for (const user of users) {
        try {
          const savedNotification = await this.saveNotificationToDatabase(
            user._id,
            title,
            body,
            { ...data, userIds: userIds, timestamp: new Date().toISOString() },
            data.type || 'general'
          );
          savedNotifications.push(savedNotification);
        } catch (error) {
          console.error(`❌ Failed to save notification for user ${user._id}:`, error);
        }
      }

      // Send to specific users by their user IDs
      userIds.forEach(userId => {
        this.io.to(`user_${userId}`).emit('pushNotification', notificationPayload);
      });
      
      // Also send to admin dashboard for logging
      this.io.to('admin').emit('notificationSent', {
        ...notificationPayload,
        targetUsers: users.map(u => ({ id: u._id, name: u.fullName, role: u.role })),
        sentCount: users.length
      });
      
      console.log(`📱 Push notification sent to ${users.length} specific users`);
      console.log(`📱 Notification: ${title} - ${body}`);
      console.log(`💾 ${savedNotifications.length} notifications saved to database for offline delivery`);

      return {
        success: true,
        message: `Notification sent successfully to ${users.length} users`,
        sentCount: users.length,
        notificationId: notificationPayload.id,
        targetUsers: users.map(u => ({ id: u._id, name: u.fullName, role: u.role })),
        savedToDatabase: savedNotifications.length
      };

    } catch (error) {
      console.error('❌ Error sending push notification to specific users:', error);
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
        sentCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Send push notification to all users
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data payload
   * @returns {Promise<Object>} - Result of the notification send
   */
  async sendNotificationToAll(title, body, data = {}) {
    try {
      // Get all approved users
      const users = await User.find({ 
        userStatus: 'approved',
        role: { $ne: 'admin' } // Exclude admin users
      }).select('_id fullName email role');

      if (users.length === 0) {
        return {
          success: false,
          message: 'No approved users found',
          sentCount: 0
        };
      }

      // Create notification payload
      const notificationPayload = {
        id: Date.now().toString(),
        type: 'admin_push_notification',
        title: title,
        body: body,
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        source: 'admin_panel'
      };

      // Send to all connected mobile app clients
      this.io.to('mobile_app').emit('pushNotification', notificationPayload);
      
      // Also send to admin dashboard for logging
      this.io.to('admin').emit('notificationSent', {
        ...notificationPayload,
        targetUsers: users.map(u => ({ id: u._id, name: u.fullName, role: u.role })),
        sentCount: users.length
      });
      
      console.log(`📱 Push notification sent to all ${users.length} users`);
      console.log(`📱 Notification: ${title} - ${body}`);

      return {
        success: true,
        message: `Notification sent successfully to all ${users.length} users`,
        sentCount: users.length,
        notificationId: notificationPayload.id,
        targetUsers: users.map(u => ({ id: u._id, name: u.fullName, role: u.role }))
      };

    } catch (error) {
      console.error('❌ Error sending push notification to all users:', error);
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`,
        sentCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Check if user is online (connected to socket)
   * @param {string} userId - User ID to check
   * @returns {boolean} - True if user is online
   */
  isUserOnline(userId) {
    const userRoom = `user_${userId}`;
    const room = this.io.sockets.adapter.rooms.get(userRoom);
    return room && room.size > 0;
  }

  /**
   * Deliver pending notifications to a user when they come online
   * @param {string} userId - User ID to deliver notifications to
   * @returns {Promise<Object>} - Result of offline notification delivery
   */
  async deliverOfflineNotifications(userId) {
    try {
      console.log(`📱 Checking for offline notifications for user: ${userId}`);
      
      // Get all pending notifications for this user
      const pendingNotifications = await Notification.find({
        recipient: userId,
        status: 'pending',
        expiresAt: { $gt: new Date() } // Only non-expired notifications
      }).sort({ createdAt: -1 }).limit(50); // Limit to 50 most recent notifications

      if (pendingNotifications.length === 0) {
        console.log(`📱 No pending notifications found for user: ${userId}`);
        return {
          success: true,
          message: 'No pending notifications found',
          deliveredCount: 0
        };
      }

      console.log(`📱 Found ${pendingNotifications.length} pending notifications for user: ${userId}`);

      let deliveredCount = 0;
      const deliveryResults = [];

      for (const notification of pendingNotifications) {
        try {
          // Create notification payload
          const notificationPayload = {
            id: notification._id.toString(),
            type: notification.type,
            title: notification.title,
            body: notification.body,
            data: {
              ...notification.data,
              notificationId: notification._id,
              timestamp: notification.createdAt.toISOString(),
            },
            timestamp: notification.createdAt.toISOString(),
            source: 'offline_delivery'
          };

          // Send notification to user
          this.io.to(`user_${userId}`).emit('pushNotification', notificationPayload);

          // Mark notification as delivered
          notification.status = 'delivered';
          notification.deliveredAt = new Date();
          await notification.save();

          deliveredCount++;
          deliveryResults.push({
            notificationId: notification._id,
            title: notification.title,
            delivered: true
          });

          console.log(`📱 Delivered offline notification: ${notification.title}`);

        } catch (error) {
          console.error(`❌ Failed to deliver notification ${notification._id}:`, error);
          
          // Increment delivery attempts
          notification.deliveryAttempts += 1;
          if (notification.deliveryAttempts >= notification.maxDeliveryAttempts) {
            notification.status = 'failed';
          }
          await notification.save();

          deliveryResults.push({
            notificationId: notification._id,
            title: notification.title,
            delivered: false,
            error: error.message
          });
        }
      }

      console.log(`📱 Delivered ${deliveredCount} offline notifications to user: ${userId}`);

      return {
        success: true,
        message: `Delivered ${deliveredCount} offline notifications`,
        deliveredCount,
        totalFound: pendingNotifications.length,
        results: deliveryResults
      };

    } catch (error) {
      console.error('❌ Error delivering offline notifications:', error);
      return {
        success: false,
        message: `Failed to deliver offline notifications: ${error.message}`,
        deliveredCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Get user statistics for notification targeting
   * @returns {Promise<Object>} - User statistics by role
   */
  async getUserStats() {
    try {
      const stats = await User.aggregate([
        {
          $match: {
            userStatus: 'approved',
            role: { $ne: 'admin' }
          }
        },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            users: {
              $push: {
                id: '$_id',
                name: '$fullName',
                email: '$email',
                role: '$role'
              }
            }
          }
        }
      ]);

      const totalUsers = stats.reduce((sum, stat) => sum + stat.count, 0);

      return {
        success: true,
        totalUsers,
        byRole: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            users: stat.users
          };
          return acc;
        }, {})
      };

    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      return {
        success: false,
        message: `Failed to get user stats: ${error.message}`,
        error: error.message
      };
    }
  }
}

module.exports = PushNotificationService;
