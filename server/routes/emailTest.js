const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Test email endpoint for debugging
router.post('/test-email', async (req, res) => {
  try {
    console.log('Testing email configuration...');
    
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_APP_PASSWORD;
    
    if (!emailUser || !emailPass) {
      return res.status(400).json({
        success: false,
        error: 'Email credentials not configured',
        config: {
          EMAIL_USER: !!emailUser,
          EMAIL_APP_PASSWORD: !!emailPass
        }
      });
    }

    // Create transporter with Render-compatible settings
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 30000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    });

    // Test connection
    await transporter.verify();
    
    // Send test email
    const info = await transporter.sendMail({
      from: `"ZoneRush Test" <${emailUser}>`,
      to: emailUser,
      subject: 'Email Test - Render Environment',
      text: 'This is a test email from your ZoneRush deployment on Render.',
      html: `
        <h2>Email Test Successful!</h2>
        <p>This email was sent from your ZoneRush backend deployed on Render.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'unknown'}</p>
        <p><strong>Service:</strong> ${process.env.EMAIL_SERVICE || 'gmail'}</p>
      `
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: info.messageId,
      config: {
        EMAIL_USER: emailUser,
        EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail'
      }
    });

  } catch (error) {
    console.error('Email test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.code || 'Unknown error',
      config: {
        EMAIL_USER: !!process.env.EMAIL_USER,
        EMAIL_APP_PASSWORD: !!process.env.EMAIL_APP_PASSWORD,
        EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail'
      }
    });
  }
});

// Check email configuration
router.get('/config', (req, res) => {
  res.json({
    EMAIL_USER: process.env.EMAIL_USER ? 'configured' : 'missing',
    EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ? 'configured' : 'missing',
    EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
    NODE_ENV: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
