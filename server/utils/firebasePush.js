// Firebase Admin SDK for server-side push notifications
const admin = require('firebase-admin');

// Initialize Firebase Admin (only once)
let firebaseApp = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('✅ Firebase Admin initialized');
  } catch (err) {
    console.error('❌ Firebase Admin initialization error:', err.message);
  }
}

/**
 * Send push notification to user's device
 * @param {string} userId - User ID to notify
 * @param {object} notification - Notification payload
 * @returns {Promise<object>} - Send result
 */
async function sendPushNotification(userId, notification) {
  if (!firebaseApp) {
    console.warn('Firebase not configured, skipping push notification');
    return { success: false, reason: 'Firebase not initialized' };
  }

  try {
    // Get user's FCM tokens from database
    const pool = require('../config/db');
    const tokenResult = await pool.query(
      `SELECT token FROM user_fcm_tokens 
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (tokenResult.rows.length === 0) {
      console.log(`No active FCM tokens for user ${userId}`);
      return { success: false, reason: 'No tokens found' };
    }

    const tokens = tokenResult.rows.map(r => r.token);
    
    // Prepare message
    const message = {
      notification: {
        title: notification.title || 'Alert',
        body: notification.body || 'You have a new notification',
        sound: 'default',
      },
      data: notification.data || {},
      tokens: tokens
    };

    // Send multicast message
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`Push notifications sent to ${response.successCount}/${tokens.length} devices`);

    // Remove invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      // Remove invalid tokens from database
      if (invalidTokens.length > 0) {
        await pool.query(
          `UPDATE user_fcm_tokens 
           SET is_active = FALSE 
           WHERE token = ANY($1)`,
          [invalidTokens]
        );
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };

  } catch (error) {
    console.error('Error sending push notification:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send SOS Emergency Alert via Push Notification
 * @param {number} userId - User in emergency
 * @param {object} location - GPS coordinates
 * @param {array} contacts - Emergency contacts to notify
 */
async function sendSOSPushAlert(userId, location, contacts) {
  if (!firebaseApp) {
    return { success: false, reason: 'Firebase not configured' };
  }

  try {
    const pool = require('../config/db');
    
    // Get user info
    const userResult = await pool.query(
      'SELECT username, city FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

    // Send to each contact
    const results = [];
    
    for (const contact of contacts) {
      // Get contact's FCM tokens
      const tokenResult = await pool.query(
        `SELECT u.id as user_id FROM users u
         JOIN emergency_contacts ec ON ec.user_id = u.id
         WHERE ec.phone_number = $1 AND ec.is_active = TRUE`,
        [contact.phone_number]
      );

      if (tokenResult.rows.length > 0) {
        const contactUserId = tokenResult.rows[0].user_id;
        
        const result = await sendPushNotification(contactUserId, {
          title: '🚨 SOS EMERGENCY ALERT!',
          body: `${user.username} needs immediate help! Tap to view location.`,
          data: {
            type: 'sos_emergency',
            userId: userId.toString(),
            username: user.username,
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString(),
            mapsLink: googleMapsLink,
            city: user.city || '',
            timestamp: new Date().toISOString()
          }
        });

        results.push({
          contact: contact.contact_name,
          ...result
        });
      }
    }

    return {
      success: true,
      results
    };

  } catch (error) {
    console.error('Error sending SOS push alerts:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Register new FCM token for user
 * @param {number} userId - User ID
 * @param {string} token - FCM token from device
 * @param {string} deviceInfo - Device model/info
 */
async function registerFCMToken(userId, token, deviceInfo = '') {
  try {
    const pool = require('../config/db');
    
    // Check if token already exists
    const existing = await pool.query(
      'SELECT id FROM user_fcm_tokens WHERE token = $1',
      [token]
    );

    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE user_fcm_tokens 
         SET last_used_at = NOW(), is_active = TRUE 
         WHERE token = $1`,
        [token]
      );
      return { success: true, message: 'Token updated' };
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO user_fcm_tokens 
         (user_id, token, device_info, created_at, last_used_at, is_active)
         VALUES ($1, $2, $3, NOW(), NOW(), TRUE)`,
        [userId, token, deviceInfo]
      );
      return { success: true, message: 'Token registered' };
    }
  } catch (error) {
    console.error('Error registering FCM token:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPushNotification,
  sendSOSPushAlert,
  registerFCMToken,
  isConfigured: !!firebaseApp
};
