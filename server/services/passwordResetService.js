/**
 * Password Reset Service for ZoneRush
 * Secure token-based password reset with expiration
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const emailVerificationService = require('./emailVerificationService');

class PasswordResetService {
  /**
   * Generate secure reset token (hashed for storage)
   */
  generateResetToken() {
    // Generate random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token for secure storage (like passwords)
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    return {
      rawToken,      // Send this via email (plain text)
      hashedToken    // Store this in database (hashed)
    };
  }

  /**
   * Request password reset - send email with reset link
   */
  async requestPasswordReset(email) {
    try {
      // Find user by email
      const userResult = await pool.query(
        'SELECT id, username, email FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (userResult.rows.length === 0) {
        // Don't reveal if email exists (security best practice)
        return {
          success: true,
          msg: 'If an account exists with that email, a password reset link has been sent.'
        };
      }

      const user = userResult.rows[0];

      // Generate reset token
      const { rawToken, hashedToken } = this.generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      // Delete any existing reset tokens for this user
      await pool.query(
        'DELETE FROM password_resets WHERE user_id = $1',
        [user.id]
      );

      // Store hashed token in database
      await pool.query(
        `INSERT INTO password_resets (user_id, token_hash, expires_at) 
         VALUES ($1, $2, $3)`,
        [user.id, hashedToken, expiresAt]
      );

      // Generate reset link
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

      // Send reset email
      await this.sendResetEmail(user.email, user.username, resetLink);

      return {
        success: true,
        msg: 'If an account exists with that email, a password reset link has been sent.'
      };
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token, newPassword) {
    try {
      // Hash the provided token to compare with stored hash
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Find valid reset token
      const result = await pool.query(
        `SELECT pr.*, u.id as user_id, u.email 
         FROM password_resets pr
         JOIN users u ON pr.user_id = u.id
         WHERE pr.token_hash = $1 AND pr.expires_at > NOW() AND pr.used = false`,
        [tokenHash]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired reset token'
        };
      }

      const resetRecord = result.rows[0];

      // Validate password strength
      if (newPassword.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters'
        };
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update user password
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, resetRecord.user_id]
      );

      // Mark reset token as used
      await pool.query(
        'UPDATE password_resets SET used = true, used_at = NOW() WHERE id = $1',
        [resetRecord.id]
      );

      return {
        success: true,
        msg: 'Password reset successfully'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendResetEmail(email, username, resetLink) {
    if (!emailVerificationService.transporter) {
      console.warn('⚠️  Email transporter not configured - skipping reset email');
      return; // Don't throw - email is optional
    }

    try {
      const mailOptions = {
        from: `"ZoneRush" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Reset Your ZoneRush Password',
        html: this.createResetEmailTemplate(username, resetLink),
        text: `Hello ${username},\n\nYou requested a password reset for your ZoneRush account.\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`
      };

      // Send with timeout
      await Promise.race([
        emailVerificationService.transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email send timeout')), 5000)
        )
      ]);
      
      console.log(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      console.warn(`⚠️  Failed to send password reset email (non-critical):`, error.message);
      // Don't throw - email is optional, allow user to proceed
    }
  }

  /**
   * Create HTML email template for password reset
   */
  createResetEmailTemplate(username, resetLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your ZoneRush Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">🔐 Password Reset</h1>
                    <p style="color: #fee2e2; margin: 10px 0 0 0; font-size: 16px;">ZoneRush Account Security</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hi ${username}! 👋</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We received a request to reset your ZoneRush password. Click the button below to create a new password.
                    </p>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="margin: 30px 0;">
                      <tr>
                        <td align="center" style="background-color: #ef4444; border-radius: 8px;">
                          <a href="${resetLink}" 
                             style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 8px;">
                            Reset Password 🔑
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                      Or copy and paste this link into your browser:<br>
                      <span style="color: #ef4444; word-break: break-all;">${resetLink}</span>
                    </p>
                    
                    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 30px 0; border-radius: 4px;">
                      <p style="color: #991b1b; font-size: 14px; margin: 0;">
                        ⏰ This link will expire in <strong>1 hour</strong> for security reasons.
                      </p>
                    </div>
                    
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="color: #92400e; font-size: 14px; margin: 0;">
                        ⚠️ Didn't request this? Ignore this email. Your password won't change.
                      </p>
                    </div>
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
module.exports = new PasswordResetService();
