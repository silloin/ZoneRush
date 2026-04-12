const express = require('express');
const { sendEmail } = require('../utils/sendEmail');
const router = express.Router();

// Test email endpoint for debugging
router.post('/test-email', async (req, res) => {
  try {
    console.log('Testing Resend email configuration...');
    
    if (!process.env.RESEND_API_KEY) {
      return res.status(400).json({
        success: false,
        error: 'Resend API key not configured',
        config: {
          RESEND_API_KEY: !!process.env.RESEND_API_KEY,
          DISABLE_EMAIL: process.env.DISABLE_EMAIL === 'true'
        }
      });
    }

    const testEmail = req.body.email || process.env.RESEND_FROM_EMAIL || 'test@example.com';
    
    // Send test email using Resend
    const result = await sendEmail({
      to: testEmail,
      subject: 'Email Test - ZoneRush Backend',
      html: `
        <h2>Resend Email Test Successful! </h2>
        <p>This email was sent from your ZoneRush backend using Resend API.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'unknown'}</p>
        <p><strong>Backend URL:</strong> ${process.env.RENDER_EXTERNAL_URL || 'localhost'}</p>
        <p><strong>Email Service:</strong> Resend API</p>
        <hr>
        <p style="color: #6c757d; font-size: 12px;">
          If you receive this email, your Resend configuration is working correctly!
        </p>
      `
    });

    res.json({
      success: true,
      message: 'Test email sent successfully via Resend',
      messageId: result.id,
      config: {
        RESEND_API_KEY: !!process.env.RESEND_API_KEY,
        DISABLE_EMAIL: process.env.DISABLE_EMAIL === 'true',
        RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
      }
    });

  } catch (error) {
    console.error('Resend email test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.code || 'Unknown error',
      config: {
        RESEND_API_KEY: !!process.env.RESEND_API_KEY,
        DISABLE_EMAIL: process.env.DISABLE_EMAIL === 'true'
      }
    });
  }
});

// Check email configuration
router.get('/config', (req, res) => {
  res.json({
    RESEND_API_KEY: process.env.RESEND_API_KEY ? 'configured' : 'missing',
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    DISABLE_EMAIL: process.env.DISABLE_EMAIL === 'true' ? 'disabled' : 'enabled',
    NODE_ENV: process.env.NODE_ENV || 'development',
    emailService: 'Resend API'
  });
});

module.exports = router;
