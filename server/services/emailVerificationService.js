/**
 * Email Verification Service for ZoneRush
 * Handles sending verification emails and token management using Resend API
 */

const crypto = require('crypto');
const pool = require('../config/db');
const { sendVerificationEmail } = require('../utils/sendEmail');

class EmailVerificationService {
  constructor() {
    // Check Resend configuration
    if (process.env.RESEND_API_KEY) {
      console.log(' Resend email service configured for verification emails');
    } else {
      console.warn(' RESEND_API_KEY not configured - email verification disabled');
    }
  }

  /**
   * Generate secure verification token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create verification record in database
   */
  async createVerificationRecord(userId, email) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    try {
      // Delete any existing unverified tokens for this user
      await pool.query(
        'DELETE FROM email_verifications WHERE user_id = $1 AND verified = false',
        [userId]
      );

      // Insert new verification record
      const result = await pool.query(
        `INSERT INTO email_verifications (user_id, email, token, expires_at) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id, token, expires_at`,
        [userId, email, token, expiresAt]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating verification record:', error);
      throw error;
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(userId, email, username) {
    // Check if email is disabled
    if (process.env.DISABLE_EMAIL === 'true') {
      console.log('Email disabled - skipping verification email');
      // Still create verification record
      const verification = await this.createVerificationRecord(userId, email);
      return {
        success: true,
        messageId: 'email-disabled',
        expiresAt: verification.expires_at
      };
    }

    try {
      // Create verification record
      const verification = await this.createVerificationRecord(userId, email);

      // Generate verification link
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verificationLink = `${frontendUrl}/verify-email?token=${verification.token}`;

      // Send email using Resend
      const result = await sendVerificationEmail(email, username, verificationLink);
      console.log(' Verification email sent:', result.id);

      return {
        success: true,
        messageId: result.id,
        expiresAt: verification.expires_at
      };
    } catch (error) {
      console.warn(' Verification email failed (non-fatal):', error.message);
      // Still create verification record and continue
      const verification = await this.createVerificationRecord(userId, email);
      return {
        success: true,
        messageId: 'email-failed',
        expiresAt: verification.expires_at,
        note: 'Email failed but verification record created'
      };
    }
  }

  /**
   * Verify token and mark email as verified
   */
  async verifyToken(token) {
    try {
      // Find verification record
      const result = await pool.query(
        `SELECT ev.*, u.id as user_id 
         FROM email_verifications ev
         JOIN users u ON ev.user_id = u.id
         WHERE ev.token = $1 AND ev.expires_at > NOW()`,
        [token]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired token'
        };
      }

      const verification = result.rows[0];

      // Mark as verified
      await pool.query(
        'UPDATE email_verifications SET verified = true, verified_at = NOW() WHERE id = $1',
        [verification.id]
      );

      // Update user's email_verified status
      await pool.query(
        'UPDATE users SET email_verified = true WHERE id = $1',
        [verification.user_id]
      );

      return {
        success: true,
        userId: verification.user_id,
        email: verification.email
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId) {
    try {
      // Get user info
      const userResult = await pool.query(
        'SELECT id, email, username, email_verified FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      if (user.email_verified) {
        throw new Error('Email already verified');
      }

      // Check rate limit (max 3 requests per hour)
      const rateLimitResult = await pool.query(
        `SELECT COUNT(*) as count 
         FROM email_verifications 
         WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [userId]
      );

      if (parseInt(rateLimitResult.rows[0].count) >= 3) {
        throw new Error('Too many requests. Please try again later.');
      }

      // Send new verification email
      return await this.sendVerificationEmail(user.id, user.email, user.username);
    } catch (error) {
      console.error('Error resending verification email:', error);
      throw error;
    }
  }

  /**
   * Create HTML email template
   */
  createVerificationEmailTemplate(username, verificationLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your ZoneRush Account</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🏃‍♂️ ZoneRush</h1>
                    <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Run. Capture. Compete.</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Welcome, ${username}! 👋</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Thanks for joining ZoneRush! To get started capturing territory and competing with runners worldwide, 
                      please verify your email address.
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="margin: 30px 0;">
                      <tr>
                        <td align="center" style="background-color: #3b82f6; border-radius: 8px;">
                          <a href="${verificationLink}" 
                             style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 8px;">
                            Verify Email Address ✓
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                      Or copy and paste this link into your browser:<br>
                      <span style="color: #3b82f6; word-break: break-all;">${verificationLink}</span>
                    </p>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 4px;">
                      <p style="color: #92400e; font-size: 14px; margin: 0;">
                        ⏰ This verification link will expire in <strong>24 hours</strong>.
                      </p>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                      If you didn't create a ZoneRush account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                      Need help? Contact us at <a href="mailto:support@zonerush.com" style="color: #3b82f6;">support@zonerush.com</a>
                    </p>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                      © 2026 ZoneRush. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
module.exports = new EmailVerificationService();
