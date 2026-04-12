/**
 * Resend Email Service
 * Simplified email sending using Resend API
 */

const { Resend } = require('resend');

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email using Resend API
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML email body
 * @returns {Promise<Object>} - Resend response
 */
const sendEmail = async ({ to, subject, html }) => {
  // Check if email is disabled
  if (process.env.DISABLE_EMAIL === 'true') {
    console.log('Email disabled - skipping send');
    return { id: 'email-disabled', message: 'Email service disabled' };
  }

  // Check if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured - email disabled');
    return { id: 'no-api-key', message: 'Email service not configured' };
  }

  try {
    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [to], // Resend expects array
      subject,
      html,
    });

    console.log(`Email sent successfully to ${to}:`, response);
    return response;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

/**
 * Send SOS alert email
 * @param {string} to - Recipient email
 * @param {Object} userInfo - User information
 * @param {Object} location - Location coordinates
 * @param {string} message - Custom message
 * @returns {Promise<Object>} - Resend response
 */
const sendSOSEmail = async (to, userInfo, location, message = '') => {
  const googleMapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  const sosMessage = message || `SOS ALERT! ${userInfo.username} needs emergency assistance!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 32px;">SOS EMERGENCY ALERT</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Please respond immediately!</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px;">
        <h2 style="color: #dc3545; margin-top: 0;">Emergency Alert</h2>
        
        <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>User:</strong> ${userInfo.username}</p>
          <p><strong>Message:</strong> ${sosMessage}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1976d2;">Location</h3>
          <p><strong>Coordinates:</strong> ${location.lat}, ${location.lng}</p>
          <p><strong>Live Location:</strong> 
            <a href="${googleMapsLink}" style="color: #1976d2; text-decoration: none;">
              View on Google Maps
            </a>
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${googleMapsLink}" 
             style="background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Emergency Location
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px; text-align: center; margin: 0;">
          This is an automated SOS alert from the ZoneRush application.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to,
    subject: `SOS EMERGENCY ALERT - ${userInfo.username}`,
    html,
  });
};

/**
 * Send verification email
 * @param {string} to - Recipient email
 * @param {string} username - User's username
 * @param {string} verificationLink - Email verification link
 * @returns {Promise<Object>} - Resend response
 */
const sendVerificationEmail = async (to, username, verificationLink) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 32px;">ZoneRush</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Run. Capture. Compete.</p>
      </div>
      
      <div style="background: #ffffff; padding: 40px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px;">
        <h2 style="color: #007bff; margin-top: 0;">Welcome, ${username}! </h2>
        <p>Thanks for joining ZoneRush! To get started capturing territory and competing with runners worldwide, please verify your email address.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background: #007bff; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
            Verify Email Address 
          </a>
        </div>
        
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #856404; margin: 0;">
            This verification link will expire in <strong>24 hours</strong>.
          </p>
        </div>
        
        <p style="color: #6c757d; font-size: 14px;">
          Or copy and paste this link into your browser:<br>
          <span style="color: #007bff; word-break: break-all;">${verificationLink}</span>
        </p>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        <p style="color: #6c757d; font-size: 12px; text-align: center; margin: 0;">
          If you didn't create a ZoneRush account, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  return await sendEmail({
    to,
    subject: 'Verify Your ZoneRush Account',
    html,
  });
};

module.exports = {
  sendEmail,
  sendSOSEmail,
  sendVerificationEmail,
};
