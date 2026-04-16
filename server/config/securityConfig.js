/**
 * Production Security Configuration
 * Validates environment variables and enforces security requirements
 */

class SecurityConfig {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate all required environment variables for production
   */
  validateProductionConfig() {
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isProduction) {
      console.log('⚠️  Development mode - skipping production security checks');
      return true;
    }

    console.log('\n🔒 Validating production security configuration...');
    console.log('═'.repeat(60));

    // 1. Validate JWT Secret
    this.validateJWTSecret();

    // 2. Validate Database Connection
    this.validateDatabaseConfig();

    // 3. Validate Email Configuration
    this.validateEmailConfig();

    // 4. Validate CORS Configuration
    this.validateCORSConfig();

    // 5. Validate HTTPS Configuration
    this.validateHTTPSConfig();

    // 6. Validate Secret Strength
    this.validateSecretStrength();

    // 7. Check for exposed development keys
    this.checkExposedKeys();

    // Report results
    this.reportResults();

    return this.errors.length === 0;
  }

  /**
   * Validate JWT Secret is strong enough
   */
  validateJWTSecret() {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      this.errors.push('JWT_SECRET is not set');
      return;
    }

    if (jwtSecret === 'your_super_secret_jwt_key_here' || 
        jwtSecret === 'secret' || 
        jwtSecret === 'password' ||
        jwtSecret.length < 32) {
      this.errors.push('JWT_SECRET is too weak or using default value (min 32 chars required)');
    }

    if (jwtSecret.length < 64) {
      this.warnings.push('JWT_SECRET should be at least 64 characters for production');
    }
  }

  /**
   * Validate database configuration is secure
   */
  validateDatabaseConfig() {
    const databaseUrl = process.env.DATABASE_URL;
    const dbHost = process.env.DB_HOST;
    const dbPassword = process.env.DB_PASSWORD;

    // Support both DATABASE_URL (Render/Supabase) and individual DB_* variables
    if (!databaseUrl && !dbHost) {
      this.errors.push('DATABASE_URL or DB_HOST is not set');
      return;
    }

    // If using DATABASE_URL, validate it
    if (databaseUrl) {
      if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
        this.errors.push('DATABASE_URL must start with postgres:// or postgresql://');
      }
      
      // Check if password is embedded in the URL
      try {
        const url = new URL(databaseUrl);
        const password = url.password;
        
        if (!password || password === 'password' || password === '8810') {
          this.errors.push('DB_PASSWORD in DATABASE_URL is too weak or using default value');
        }
        
        // Warn if using localhost in production
        if (url.hostname === 'localhost' && process.env.NODE_ENV === 'production') {
          this.warnings.push('Database host is localhost in production - ensure database is not publicly accessible');
        }
      } catch (e) {
        this.errors.push('DATABASE_URL is malformed');
      }
    } else {
      // Using individual DB_* variables
      if (!dbHost) {
        this.errors.push('DB_HOST is not set');
      }

      if (!dbPassword || dbPassword === '8810' || dbPassword === 'password') {
        this.errors.push('DB_PASSWORD is too weak or using default value');
      }

      // Warn if using localhost in production
      if (dbHost === 'localhost' && process.env.NODE_ENV === 'production') {
        this.warnings.push('Database host is localhost in production - ensure database is not publicly accessible');
      }
    }

    // Check for SSL requirement
    if (!process.env.DB_SSL && process.env.NODE_ENV === 'production') {
      this.warnings.push('DB_SSL is not enabled - production databases should use SSL/TLS');
    }
  }

  /**
   * Validate email service configuration
   */
  validateEmailConfig() {
    const emailService = process.env.EMAIL_SERVICE;

    if (!emailService) {
      this.warnings.push('EMAIL_SERVICE not configured - email features will not work');
      return;
    }

    switch (emailService) {
      case 'resend':
        if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_YOUR_RESEND_API_KEY') {
          this.errors.push('RESEND_API_KEY is not set or using placeholder');
        }
        break;
      case 'mailjet':
        if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
          this.errors.push('MAILJET_API_KEY and MAILJET_SECRET_KEY are required');
        }
        break;
      case 'gmail':
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
          this.errors.push('EMAIL_USER and EMAIL_APP_PASSWORD are required for Gmail');
        }
        if (process.env.EMAIL_APP_PASSWORD?.includes('pgsm')) {
          this.errors.push('EMAIL_APP_PASSWORD appears to be a real password - rotate immediately if committed');
        }
        break;
    }
  }

  /**
   * Validate CORS configuration
   */
  validateCORSConfig() {
    const frontendURL = process.env.FRONTEND_URL;

    if (!frontendURL) {
      this.errors.push('FRONTEND_URL is not set - CORS will block all requests');
    }

    if (frontendURL?.startsWith('http://') && process.env.NODE_ENV === 'production') {
      this.warnings.push('FRONTEND_URL uses HTTP instead of HTTPS in production');
    }
  }

  /**
   * Validate HTTPS is configured
   */
  validateHTTPSConfig() {
    if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_HTTPS) {
      this.warnings.push('ENABLE_HTTPS not set - ensure reverse proxy (nginx/Traefik) handles HTTPS termination');
    }
  }

  /**
   * Validate API key strength
   */
  validateSecretStrength() {
    // Check for weak API keys
    const apiKeys = {
      'WEATHER_API_KEY': process.env.WEATHER_API_KEY,
      'GROQ_API_KEY': process.env.GROQ_API_KEY,
      'TWILIO_AUTH_TOKEN': process.env.TWILIO_AUTH_TOKEN,
    };

    for (const [key, value] of Object.entries(apiKeys)) {
      if (value && (value === 'your_api_key_here' || value.length < 16)) {
        this.warnings.push(`${key} appears to be unset or too short`);
      }
    }
  }

  /**
   * Check for exposed development/test keys
   */
  checkExposedKeys() {
    const dangerousPatterns = [
      { pattern: '8810', name: 'weak database password' },
      { pattern: 'changeme123', name: 'test password' },
      { pattern: 'your_super_secret', name: 'default JWT secret' },
      { pattern: 'your_textlocal_api_key_here', name: 'placeholder SMS key' },
    ];

    const envString = JSON.stringify(process.env);

    for (const { pattern, name } of dangerousPatterns) {
      // Skip database password check if using DATABASE_URL with strong password
      if (pattern === '8810' && process.env.DATABASE_URL) {
        try {
          const url = new URL(process.env.DATABASE_URL);
          if (url.password && url.password !== '8810') {
            continue; // Skip this check if DATABASE_URL has a different password
          }
        } catch (e) {
          // If URL parsing fails, continue with normal check
        }
      }
      
      if (envString.includes(pattern)) {
        this.errors.push(`Exposed ${name} detected in environment - must be changed for production`);
      }
    }
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log('\n📊 Security Validation Results:');
    console.log('─'.repeat(60));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All security checks passed!');
    } else {
      if (this.errors.length > 0) {
        console.log(`\n❌ ${this.errors.length} CRITICAL ERROR(S):`);
        this.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }

      if (this.warnings.length > 0) {
        console.log(`\n⚠️  ${this.warnings.length} WARNING(S):`);
        this.warnings.forEach((warning, i) => {
          console.log(`   ${i + 1}. ${warning}`);
        });
      }
    }

    console.log('\n' + '═'.repeat(60));

    if (this.errors.length > 0) {
      console.log('\n🚨 PRODUCTION DEPLOYMENT BLOCKED');
      console.log('   Fix all critical errors before deploying to production.');
      console.log('   See DEPLOYMENT_SECURITY_GUIDE.md for instructions.\n');
    } else if (this.warnings.length > 0) {
      console.log('\n⚠️  Production deployment possible but review warnings\n');
    } else {
      console.log('✅ Ready for secure production deployment!\n');
    }
  }
}

// Export singleton instance
const securityConfig = new SecurityConfig();

module.exports = securityConfig;
