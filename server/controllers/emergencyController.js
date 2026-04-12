const pool = require('../config/db');
const twilio = require('twilio');
const firebasePush = require('../utils/firebasePush');
const nodemailer = require('nodemailer');
const axios = require('axios');

// Initialize Twilio (if credentials exist)
let twilioClient;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// Initialize TextLocal SMS (if credentials exist)
const textLocalConfig = {
  apiKey: process.env.TEXTLOCAL_API_KEY,
  sender: process.env.TEXTLOCAL_SENDER || 'ZONERUSH',
  enabled: !!process.env.TEXTLOCAL_API_KEY
};

if (textLocalConfig.enabled) {
  console.log('✅ TextLocal SMS initialized for SOS alerts');
} else {
  console.log('⚠️  TextLocal SMS not configured - set TEXTLOCAL_API_KEY in .env');
}

// Initialize Nodemailer for email alerts
let emailTransporter;
const emailPass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;
const emailService = process.env.EMAIL_SERVICE || 'gmail';
if (process.env.EMAIL_USER && emailPass) {
  // Support multiple service names for Gmail
  const service = (emailService === 'mail' || emailService === 'google') ? 'gmail' : emailService;
  
  emailTransporter = nodemailer.createTransport({
    service: service,
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: emailPass
    }
  });
  
  // Verify email transporter connection with timeout (non-blocking)
  const verifyTimeout = setTimeout(() => {
    console.warn('⚠️  Email verification timeout - will attempt on-demand');
  }, 10000);
  
  emailTransporter.verify(function(error, success) {
    clearTimeout(verifyTimeout);
    if (error) {
      console.warn(`⚠️  Email verification failed: ${error.message}`);
      console.log('📧 SOS emails will attempt to send when triggered');
    } else {
      console.log('✅ Email service verified and ready for SOS alerts');
    }
  });
} else {
  console.log('⚠️  Email not configured - set EMAIL_USER and EMAIL_APP_PASSWORD in .env');
}

// @route   GET api/emergency/contacts
// @desc    Get user's emergency contacts
// @access  Private
exports.getEmergencyContacts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM emergency_contacts 
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY priority ASC`,
      [req.user.id]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching emergency contacts:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST api/emergency/contacts
// @desc    Add emergency contact
// @access  Private
exports.addEmergencyContact = async (req, res) => {
  try {
    const { contactName, contactType, phoneNumber, email, priority } = req.body;
    
    if (!contactName || !phoneNumber || !email) {
      return res.status(400).json({ msg: 'Name, phone number, and email are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO emergency_contacts 
       (user_id, contact_name, contact_type, phone_number, email, priority)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, contactName, contactType || 'custom', phoneNumber, email, priority || 1]
    );
    
    res.json({
      msg: 'Emergency contact added successfully',
      contact: result.rows[0]
    });
  } catch (err) {
    console.error('Error adding emergency contact:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   PUT api/emergency/contacts/:id
// @desc    Update emergency contact
// @access  Private
exports.updateEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { contactName, contactType, phoneNumber, email, priority, isActive } = req.body;
    
    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT user_id FROM emergency_contacts WHERE id = $1',
      [id]
    );
    
    if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== req.user.id) {
      return res.status(404).json({ msg: 'Contact not found' });
    }
    
    const result = await pool.query(
      `UPDATE emergency_contacts 
       SET contact_name = COALESCE($1, contact_name),
           contact_type = COALESCE($2, contact_type),
           phone_number = COALESCE($3, phone_number),
           email = COALESCE($4, email),
           priority = COALESCE($5, priority),
           is_active = COALESCE($6, is_active)
       WHERE id = $7
       RETURNING *`,
      [contactName, contactType, phoneNumber, email, priority, isActive, id]
    );
    
    res.json({
      msg: 'Emergency contact updated successfully',
      contact: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating emergency contact:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   DELETE api/emergency/contacts/:id
// @desc    Delete emergency contact
// @access  Private
exports.deleteEmergencyContact = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ msg: 'Contact not found' });
    }
    
    res.json({ msg: 'Emergency contact deleted successfully' });
  } catch (err) {
    console.error('Error deleting emergency contact:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   POST api/emergency/send-sos
// @desc    Send SOS alert with live location to all emergency contacts
// @access  Private
exports.sendSOSAlert = async (req, res) => {
  try {
    const { latitude, longitude, message } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ msg: 'Location coordinates are required' });
    }
    
    // Get user info
    const userResult = await pool.query(
      'SELECT username FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    
    // Get all active emergency contacts
    const contactsResult = await pool.query(
      'SELECT * FROM emergency_contacts WHERE user_id = $1 AND is_active = TRUE ORDER BY priority',
      [req.user.id]
    );
    
    if (contactsResult.rows.length === 0) {
      return res.status(400).json({ msg: 'No emergency contacts configured' });
    }
    
    const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const sosMessage = message || `🚨 SOS ALERT! ${user.username} needs emergency assistance!`;
    const fullMessage = `${sosMessage}\n\n📍 Live Location: ${googleMapsLink}\n\nPlease help immediately!`;
    
    const sentAlerts = [];
    const failedAlerts = [];
    const pushResults = [];
    const emailResults = [];
    const smsResults = [];

    // Send Email Alerts (if configured) - FIRE AND FORGET (non-blocking)
    if (emailTransporter) {
      console.log(`📧 Queuing email alerts to ${contactsResult.rows.filter(c => c.email).length} contacts (non-blocking)...`);
      
      // Fire emails in background without waiting
      const emailContactsToNotify = contactsResult.rows.filter(contact => contact.email);
      if (emailContactsToNotify.length > 0) {
        // Schedule emails asynchronously without awaiting
        setImmediate(async () => {
          for (const contact of emailContactsToNotify) {
            try {
              console.log(`📤 Sending email to ${contact.contact_name} (${contact.email})...`);
              
              // Send with timeout to prevent hanging
              const emailPromise = Promise.race([
                emailTransporter.sendMail({
                  from: `"SOS Alert - ${user.username}" <${process.env.EMAIL_USER}>`,
                  to: contact.email,
                  subject: `🚨 SOS EMERGENCY ALERT - ${user.username}`,
                  html: `
                    <h1 style="color: #dc3545;">🚨 SOS EMERGENCY ALERT</h1>
                    <p><strong>${user.username}</strong> needs emergency assistance!</p>
                    <p><strong>📍 Live Location:</strong> <a href="${googleMapsLink}">View on Google Maps</a></p>
                    <p><strong>Coordinates:</strong> ${latitude}, ${longitude}</p>
                    <p><strong>Message:</strong> ${message || 'No additional message provided.'}</p>
                    <hr/>
                    <p style="color: #6c757d; font-size: 12px;">This is an automated SOS alert from the Realtime Location Tracker system.</p>
                  `
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Email send timeout after 5 seconds')), 5000)
                )
              ]);
              
              const info = await emailPromise;
              console.log(`✅ Email sent to ${contact.contact_name}. Message ID: ${info.messageId}`);
              emailResults.push({ contact: contact.contact_name, email: contact.email, status: 'sent', messageId: info.messageId });
            } catch (err) {
              console.warn(`⚠️  Email failed for ${contact.contact_name} (non-critical):`, err.message);
              emailResults.push({ contact: contact.contact_name, email: contact.email, status: 'failed', error: err.message });
            }
          }
          console.log(`📊 Email results: ${emailResults.filter(e => e.status === 'sent').length} sent, ${emailResults.filter(e => e.status === 'failed').length} failed`);
        });
      }
    } else {
      console.log('⚠️  Email transporter not configured - skipping email alerts');
    }

    // Send SMS via TextLocal (if configured) in parallel
    if (textLocalConfig.enabled) {
      console.log('📱 Sending SMS via TextLocal...');
      const smsTasks = contactsResult.rows.map(async (contact) => {
        try {
          let formattedPhone = contact.phone_number.replace(/\D/g, ''); // Remove non-digits

          if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
          }

          const smsMessage = `🚨 SOS ALERT! ${user.username} needs help!\n📍 Location: ${googleMapsLink}\nPlease respond immediately!`;

          const response = await axios.get('https://api.textlocal.in/send/', {
            params: {
              apikey: textLocalConfig.apiKey,
              numbers: formattedPhone,
              sender: textLocalConfig.sender,
              message: smsMessage,
              format: 'json'
            },
            timeout: 10000 // 10 second timeout
          });

          if (response.data.status === 'success') {
            console.log(`✅ SMS sent to ${contact.contact_name} (${formattedPhone})`);
            smsResults.push({ contact: contact.contact_name, phone: formattedPhone, status: 'sent', messageId: response.data.id });
            sentAlerts.push(contact.contact_name);
          } else {
            throw new Error(response.data.errors?.[0] || 'Unknown error');
          }
        } catch (err) {
          console.error(`❌ Failed to send SMS to ${contact.contact_name}:`, err.message);
          smsResults.push({ contact: contact.contact_name, phone: contact.phone_number, status: 'failed', error: err.message });
          failedAlerts.push(contact.contact_name);
        }
      });

      await Promise.all(smsTasks);
    }

    // Send Push Notifications (Firebase)
    if (firebasePush.isConfigured) {
      const pushResult = await firebasePush.sendSOSPushAlert(
        req.user.id,
        { latitude, longitude },
        contactsResult.rows
      );

      if (pushResult.success) {
        pushResults.push(...pushResult.results);
      }
    }

    // Send SMS via Twilio (if configured and TextLocal not used) in parallel
    if (twilioClient && !textLocalConfig.enabled) {
      const twilioTasks = contactsResult.rows.map(async (contact) => {
        try {
          await twilioClient.messages.create({
            body: fullMessage,
            from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
            to: contact.phone_number
          });
          sentAlerts.push(contact.contact_name);
        } catch (err) {
          console.error(`Failed to send SMS to ${contact.contact_name}:`, err.message);
          failedAlerts.push(contact.contact_name);
        }
      });

      await Promise.all(twilioTasks);
    }
    
    // Generate WhatsApp links (always available as backup)
    const whatsappLinks = contactsResult.rows.map(contact => {
      const encodedMessage = encodeURIComponent(fullMessage);
      return {
        name: contact.contact_name,
        phone: contact.phone_number,
        whatsappUrl: `https://wa.me/${contact.phone_number}?text=${encodedMessage}`
      };
    });
    
    // Log SOS alert in database
    await pool.query(
      `INSERT INTO sos_alerts (user_id, latitude, longitude, message)
       VALUES ($1, $2, $3, $4)`,
      [req.user.id, latitude, longitude, message || null]
    );
    
    return res.json({
      msg: 'SOS Alert sent successfully!',
      user: user.username,
      location: { latitude, longitude },
      mapsLink: googleMapsLink,
      sentTo: sentAlerts,
      failedToSend: failedAlerts,
      totalSent: sentAlerts.length + emailResults.filter(e => e.status === 'sent').length + smsResults.filter(s => s.status === 'sent').length,
      emailsSent: emailResults.filter(e => e.status === 'sent').length,
      smsSent: smsResults.filter(s => s.status === 'sent').length,
      emailResults,
      smsResults,
      whatsappLinks,
      pushNotificationsSent: pushResults.length
    });
    
  } catch (err) {
    console.error('❌ Error sending SOS alert:', err.message);
    console.error('Stack trace:', err.stack);
    console.error('Request body:', req.body);
    console.error('User ID:', req.user?.id);
    res.status(500).json({ 
      msg: 'Something went wrong!',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// @route   GET api/emergency/alerts/history
// @desc    Get user's SOS alert history
// @access  Private
exports.getSOSHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await pool.query(
      `SELECT * FROM sos_alerts 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [req.user.id, limit]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching SOS history:', err.message);
    res.status(500).send('Server Error');
  }
};

// @route   GET api/emergency/stats
// @desc    Get SOS statistics (for admin dashboard)
// @access  Private/Admin
exports.getSOSStats = async (req, res) => {
  try {
    // Total alerts
    const totalAlerts = await pool.query('SELECT COUNT(*) FROM sos_alerts');
    
    // Alerts in last 24 hours
    const last24Hours = await pool.query(
      `SELECT COUNT(*) FROM sos_alerts 
       WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    
    // Active users (users with at least one emergency contact)
    const activeUsers = await pool.query(
      `SELECT COUNT(DISTINCT user_id) FROM emergency_contacts WHERE is_active = TRUE`
    );
    
    // Total emergency contacts
    const totalContacts = await pool.query(
      `SELECT COUNT(*) FROM emergency_contacts WHERE is_active = TRUE`
    );
    
    res.json({
      totalAlerts: parseInt(totalAlerts.rows[0].count),
      last24Hours: parseInt(last24Hours.rows[0].count),
      activeUsers: parseInt(activeUsers.rows[0].count),
      totalContacts: parseInt(totalContacts.rows[0].count)
    });
  } catch (err) {
    console.error('Error fetching stats:', err.message);
    res.status(500).send('Server Error');
  }
};
