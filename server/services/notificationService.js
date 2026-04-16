/**
 * Notification Service
 * Handles scheduled, delayed, and event-based notifications
 * Uses node-cron for scheduling and Socket.io for real-time delivery
 */

const cron = require('node-cron');
const pool = require('../config/db');
const emailService = require('./emailService');

class NotificationService {
  constructor(io) {
    this.io = io;
    this.scheduler = null;
    this.isRunning = false;
    this.userSockets = new Map(); // Maps userId -> socket
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  
  initialize() {
    if (this.isRunning) {
      console.log('⚠️ Notification service already running');
      return;
    }

    // Run every minute to check for pending notifications
    this.scheduler = cron.schedule('* * * * *', () => {
      this.processPendingNotifications();
    });

    this.isRunning = true;
    console.log('✅ Notification scheduler initialized (runs every minute)');
    
    // Process any missed notifications immediately
    this.processPendingNotifications();
  }

  stop() {
    if (this.scheduler) {
      this.scheduler.stop();
      this.scheduler = null;
    }
    this.isRunning = false;
    console.log('🛑 Notification scheduler stopped');
  }

  // ============================================
  // USER SOCKET MANAGEMENT
  // ============================================

  registerUserSocket(userId, socket) {
    this.userSockets.set(userId, socket);
    console.log(`🔌 User ${userId} registered for real-time notifications`);
    
    // Send any pending notifications immediately
    this.sendPendingNotificationsToUser(userId);
  }

  unregisterUserSocket(userId) {
    this.userSockets.delete(userId);
    console.log(`🔌 User ${userId} unregistered from notifications`);
  }

  // ============================================
  // CREATE NOTIFICATIONS
  // ============================================

  /**
   * Create a scheduled notification
   * @param {number} userId - User ID
   * @param {string} title - Notification title
   * @param {string} content - Notification content
   * @param {Date} triggerTime - When to trigger
   * @param {Object} data - Additional data
   */
  async createScheduledNotification(userId, title, content, triggerTime, data = {}) {
    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, type, title, content, trigger_time, data, is_triggered)
         VALUES ($1, 'scheduled', $2, $3, $4, $5, FALSE)
         RETURNING *`,
        [userId, title, content, triggerTime, JSON.stringify(data)]
      );

      const notification = result.rows[0];
      
      await this.logNotificationAction(notification.id, userId, 'created', {
        triggerTime,
        type: 'scheduled'
      });

      console.log(`📅 Scheduled notification created for user ${userId} at ${triggerTime}`);
      
      // If the trigger time is in the past/immediate, process it now
      if (new Date(triggerTime) <= new Date()) {
        this.triggerNotification(notification);
      }

      return notification;
    } catch (err) {
      console.error('Error creating scheduled notification:', err);
      throw err;
    }
  }

  /**
   * Create a delayed notification
   * @param {number} userId - User ID
   * @param {string} title - Notification title
   * @param {string} content - Notification content
   * @param {number} delayMinutes - Delay in minutes
   * @param {Object} data - Additional data
   */
  async createDelayedNotification(userId, title, content, delayMinutes, data = {}) {
    const triggerTime = new Date(Date.now() + delayMinutes * 60 * 1000);
    
    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, type, title, content, trigger_time, data, is_triggered)
         VALUES ($1, 'delayed', $2, $3, $4, $5, FALSE)
         RETURNING *`,
        [userId, title, content, triggerTime, JSON.stringify(data)]
      );

      const notification = result.rows[0];
      
      await this.logNotificationAction(notification.id, userId, 'created', {
        delayMinutes,
        triggerTime,
        type: 'delayed'
      });

      console.log(`⏰ Delayed notification created for user ${userId} (in ${delayMinutes} minutes)`);
      
      return notification;
    } catch (err) {
      console.error('Error creating delayed notification:', err);
      throw err;
    }
  }

  /**
   * Create an event-based notification (triggered immediately)
   * @param {number} userId - User ID
   * @param {string} title - Notification title
   * @param {string} content - Notification content
   * @param {string} eventType - Type of event
   * @param {Object} data - Additional data
   */
  async createEventNotification(userId, title, content, eventType, data = {}) {
    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, type, title, content, data, is_triggered, triggered_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
         RETURNING *`,
        [userId, eventType, title, content, JSON.stringify(data)]
      );

      const notification = result.rows[0];
      
      await this.logNotificationAction(notification.id, userId, 'created', {
        eventType,
        immediate: true
      });

      console.log(`🔔 Event notification created for user ${userId}: ${eventType}`);
      
      // Trigger immediately
      this.triggerNotification(notification);

      return notification;
    } catch (err) {
      console.error('Error creating event notification:', err);
      throw err;
    }
  }

  /**
   * Create tile captured notification
   * @param {number} previousOwnerId - Previous tile owner
   * @param {number} newOwnerId - New tile owner
   * @param {string} newOwnerUsername - Username of new owner
   * @param {string} geohash - Tile geohash
   */
  async createTileCapturedNotification(previousOwnerId, newOwnerId, newOwnerUsername, geohash) {
    if (previousOwnerId === newOwnerId) return; // Don't notify if same user recaptures

    const title = 'Your tile was captured!';
    const content = `Your tile was captured by ${newOwnerUsername}`;
    
    return this.createEventNotification(
      previousOwnerId,
      title,
      content,
      'tile_captured',
      { 
        geohash, 
        capturedBy: newOwnerId, 
        capturedByUsername: newOwnerUsername,
        capturedAt: new Date().toISOString()
      }
    );
  }

  /**
   * Create training plan reminder notification
   */
  async createTrainingReminder(userId, trainingPlanName, scheduledTime) {
    const title = 'Training Reminder';
    const content = `Time for your scheduled training: ${trainingPlanName}`;
    
    return this.createScheduledNotification(userId, title, content, scheduledTime, {
      trainingPlanName,
      reminderType: 'training'
    });
  }

  // ============================================
  // PROCESS NOTIFICATIONS
  // ============================================

  /**
   * Process all pending notifications
   */
  async processPendingNotifications() {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications 
         WHERE is_triggered = FALSE 
         AND trigger_time IS NOT NULL 
         AND trigger_time <= CURRENT_TIMESTAMP
         ORDER BY trigger_time ASC`
      );

      if (result.rows.length > 0) {
        console.log(`📬 Processing ${result.rows.length} pending notifications`);
        
        for (const notification of result.rows) {
          await this.triggerNotification(notification);
        }
      }
    } catch (err) {
      console.error('Error processing pending notifications:', err);
    }
  }

  /**
   * Send pending notifications to a specific user (e.g., after login)
   */
  async sendPendingNotificationsToUser(userId) {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         AND is_triggered = TRUE 
         AND is_read = FALSE
         ORDER BY triggered_at DESC`,
        [userId]
      );

      if (result.rows.length > 0 && this.userSockets.has(userId)) {
        const socket = this.userSockets.get(userId);
        
        for (const notification of result.rows) {
          socket.emit('notification', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            data: notification.data,
            created_at: notification.created_at
          });
        }
        
        console.log(`📤 Sent ${result.rows.length} pending notifications to user ${userId}`);
      }
    } catch (err) {
      console.error('Error sending pending notifications:', err);
    }
  }

  /**
   * Trigger a notification (send via socket or email)
   */
  async triggerNotification(notification) {
    try {
      // Mark as triggered
      await pool.query(
        'UPDATE notifications SET is_triggered = TRUE WHERE id = $1',
        [notification.id]
      );

      await this.logNotificationAction(notification.id, notification.user_id, 'triggered', {
        triggerTime: new Date().toISOString()
      });

      // Check if user is online
      if (this.userSockets.has(notification.user_id)) {
        const socket = this.userSockets.get(notification.user_id);
        
        socket.emit('notification', {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          content: notification.content,
          data: notification.data,
          created_at: notification.created_at
        });

        console.log(`📨 Real-time notification sent to user ${notification.user_id}`);
      } else {
        // User is offline - try email fallback
        await this.sendEmailNotification(notification);
      }
    } catch (err) {
      console.error('Error triggering notification:', err);
    }
  }

  /**
   * Send notification via email
   */
  async sendEmailNotification(notification) {
    try {
      // Check user preferences
      const prefResult = await pool.query(
        'SELECT email_notifications FROM notification_preferences WHERE user_id = $1',
        [notification.user_id]
      );
      
      const prefs = prefResult.rows[0];
      if (prefs && !prefs.email_notifications) {
        console.log(`📧 Email notifications disabled for user ${notification.user_id}`);
        return;
      }

      // Get user email
      const userResult = await pool.query(
        'SELECT email, username FROM users WHERE id = $1',
        [notification.user_id]
      );
      
      if (userResult.rows.length === 0) return;
      
      const user = userResult.rows[0];
      
      // Send email using email service
      await emailService.sendNotificationEmail(
        user.email,
        notification.title,
        notification.content,
        notification.type
      );

      await this.logNotificationAction(notification.id, notification.user_id, 'sent_email', {
        email: user.email
      });

      console.log(`📧 Email notification sent to ${user.email}`);
    } catch (err) {
      console.error('Error sending email notification:', err);
    }
  }

  // ============================================
  // NOTIFICATION MANAGEMENT
  // ============================================

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const result = await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
        [notificationId, userId]
      );

      if (result.rows.length > 0) {
        await this.logNotificationAction(notificationId, userId, 'read', {});
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    try {
      const result = await pool.query(
        'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE RETURNING id',
        [userId]
      );

      await this.logNotificationAction(null, userId, 'read_all', {
        count: result.rows.length
      });

      return result.rows.length;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      const result = await pool.query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
        [notificationId, userId]
      );

      return result.rows.length > 0;
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId, limit = 50, unreadOnly = false) {
    try {
      let query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 
        ${unreadOnly ? 'AND is_read = FALSE' : ''}
        ORDER BY is_read ASC, triggered_at DESC NULLS LAST, created_at DESC
        LIMIT $2
      `;
      
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (err) {
      console.error('Error fetching notifications:', err);
      throw err;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
        [userId]
      );
      return parseInt(result.rows[0].count);
    } catch (err) {
      console.error('Error getting unread count:', err);
      throw err;
    }
  }

  // ============================================
  // PREFERENCES
  // ============================================

  /**
   * Get notification preferences
   */
  async getPreferences(userId) {
    try {
      const result = await pool.query(
        `INSERT INTO notification_preferences (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error getting notification preferences:', err);
      throw err;
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId, preferences) {
    try {
      const fields = [];
      const values = [userId];
      let paramCount = 1;

      const allowedFields = [
        'tile_capture_alerts',
        'training_reminders',
        'friend_activity',
        'email_notifications',
        'push_notifications'
      ];

      for (const [key, value] of Object.entries(preferences)) {
        if (allowedFields.includes(key) && typeof value === 'boolean') {
          paramCount++;
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid preferences to update');
      }

      const query = `
        INSERT INTO notification_preferences (user_id, ${fields.map(f => f.split(' ')[0]).join(', ')})
        VALUES ($1, ${fields.map((_, i) => `$${i + 2}`).join(', ')})
        ON CONFLICT (user_id) DO UPDATE SET
          ${fields.join(', ')},
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      throw err;
    }
  }

  // ============================================
  // LOGGING
  // ============================================

  async logNotificationAction(notificationId, userId, action, details) {
    try {
      await pool.query(
        `INSERT INTO notification_logs (notification_id, user_id, action, details)
         VALUES ($1, $2, $3, $4)`,
        [notificationId, userId, action, JSON.stringify(details)]
      );
    } catch (err) {
      // Don't throw - logging errors shouldn't break functionality
      console.error('Error logging notification action:', err);
    }
  }

  // ============================================
  // STATS & DEBUGGING
  // ============================================

  async getNotificationStats(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          COUNT(*) FILTER (WHERE is_read = FALSE) as unread,
          COUNT(*) FILTER (WHERE is_read = TRUE) as read,
          COUNT(*) FILTER (WHERE type = 'scheduled') as scheduled,
          COUNT(*) FILTER (WHERE type = 'delayed') as delayed,
          COUNT(*) FILTER (WHERE type = 'event') as event,
          COUNT(*) as total
         FROM notifications 
         WHERE user_id = $1`,
        [userId]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error getting notification stats:', err);
      throw err;
    }
  }
}

module.exports = NotificationService;
