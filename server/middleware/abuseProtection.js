/**
 * Comprehensive Abuse Protection System
 * Rate limiting, bot detection, anti-scraping, endpoint protection
 */

const { RateLimiterRedis } = require('rate-limiter-flexible');
const securityLogger = require('./securityLogger');

// ============================================
// Rate Limiter Factory
// ============================================

class AbuseProtection {
  constructor(redisClient, isRedisAvailable) {
    this.redisClient = redisClient;
    this.isRedisAvailable = isRedisAvailable;
    this.limiters = new Map();
    this.botSignatures = this.loadBotSignatures();
    this.suspiciousPatterns = this.loadSuspiciousPatterns();
  }

  /**
   * Get or create a rate limiter
   */
  getLimiter(name, config) {
    if (!this.limiters.has(name)) {
      let limiter;

      if (this.isRedisAvailable()) {
        limiter = new RateLimiterRedis({
          storeClient: this.redisClient,
          keyPrefix: `abuse_${name}`,
          ...config
        });
      } else {
        // In-memory fallback
        limiter = this.createMemoryLimiter(config);
      }

      this.limiters.set(name, limiter);
    }

    return this.limiters.get(name);
  }

  /**
   * Create in-memory rate limiter (fallback)
   */
  createMemoryLimiter(config) {
    const store = new Map();

    return {
      consume: async (key, points = 1) => {
        const now = Date.now();
        const record = store.get(key);

        if (!record || now - record.resetTime > config.duration * 1000) {
          store.set(key, { 
            points: config.points - points, 
            resetTime: now + config.duration * 1000 
          });
          return { remainingPoints: config.points - points };
        }

        if (record.points >= points) {
          record.points -= points;
          return { remainingPoints: record.points };
        }

        const retrySecs = Math.ceil((record.resetTime - now) / 1000);
        const error = new Error('Rate limit exceeded');
        error.msBeforeNext = retrySecs * 1000;
        error.secsBeforeNext = retrySecs;
        throw error;
      }
    };
  }

  // ============================================
  // Pre-configured Rate Limiters
  // ============================================

  /**
   * Login attempts: 5 per 15 minutes per IP
   */
  loginLimiter() {
    return this.getLimiter('login', {
      points: 5,
      duration: 60 * 15,
      blockDuration: 60 * 30 // Block for 30 minutes
    });
  }

  /**
   * Registration: 3 per hour per IP
   */
  registrationLimiter() {
    return this.getLimiter('registration', {
      points: 3,
      duration: 60 * 60,
      blockDuration: 60 * 60 // Block for 1 hour
    });
  }

  /**
   * Password reset: 3 per hour per email/IP
   */
  passwordResetLimiter() {
    return this.getLimiter('password_reset', {
      points: 3,
      duration: 60 * 60,
      blockDuration: 60 * 60
    });
  }

  /**
   * AI generation: 10 per hour per user
   */
  aiGenerationLimiter() {
    return this.getLimiter('ai_generation', {
      points: 10,
      duration: 60 * 60,
      blockDuration: 60 * 30
    });
  }

  /**
   * API endpoints: 100 per 15 minutes per user/IP
   */
  apiLimiter() {
    return this.getLimiter('api', {
      points: 100,
      duration: 60 * 15
    });
  }

  /**
   * Data export/scraping: 10 per hour per user
   */
  dataExportLimiter() {
    return this.getLimiter('data_export', {
      points: 10,
      duration: 60 * 60,
      blockDuration: 60 * 60 * 2 // Block for 2 hours
    });
  }

  /**
   * Message sending: 30 per minute per user
   */
  messageLimiter() {
    return this.getLimiter('messaging', {
      points: 30,
      duration: 60
    });
  }

  /**
   * File uploads: 20 per hour per user
   */
  uploadLimiter() {
    return this.getLimiter('uploads', {
      points: 20,
      duration: 60 * 60
    });
  }

  /**
   * Search queries: 60 per minute per user
   */
  searchLimiter() {
    return this.getLimiter('search', {
      points: 60,
      duration: 60
    });
  }

  // ============================================
  // Bot Detection
  // ============================================

  /**
   * Load known bot signatures
   */
  loadBotSignatures() {
    return [
      // Security scanners
      { pattern: /nikto/i, name: 'Nikto Scanner' },
      { pattern: /nmap/i, name: 'Nmap Scanner' },
      { pattern: /sqlmap/i, name: 'SQLMap' },
      { pattern: /burp/i, name: 'Burp Suite' },
      { pattern: /zap/i, name: 'OWASP ZAP' },
      { pattern: /dirbuster/i, name: 'DirBuster' },
      { pattern: /gobuster/i, name: 'GoBuster' },
      { pattern: /wfuzz/i, name: 'WFuzz' },
      { pattern: /masscan/i, name: 'Masscan' },
      
      // Web scrapers
      { pattern: /scrapy/i, name: 'Scrapy' },
      { pattern: /puppeteer/i, name: 'Puppeteer' },
      { pattern: /selenium/i, name: 'Selenium' },
      { pattern: /phantomjs/i, name: 'PhantomJS' },
      { pattern: /headlesschrome/i, name: 'Headless Chrome' },
      { pattern: /playwright/i, name: 'Playwright' },
      { pattern: /crawl/i, name: 'Generic Crawler' },
      { pattern: /spider/i, name: 'Generic Spider' },
      
      // HTTP libraries (often used for automation)
      { pattern: /^python-requests/i, name: 'Python Requests' },
      { pattern: /^python-urllib/i, name: 'Python Urllib' },
      { pattern: /^go-http-client/i, name: 'Go HTTP Client' },
      { pattern: /^java/i, name: 'Java HTTP Client' },
      { pattern: /^curl\//i, name: 'cURL' },
      { pattern: /^wget\//i, name: 'Wget' },
    ];
  }

  /**
   * Load suspicious URL patterns
   */
  loadSuspiciousPatterns() {
    return {
      // Enumeration attempts
      enumeration: [
        /\/api\/\w+\/\d+/g, // Sequential ID access
        /\/api\/\w+\/[a-f0-9-]{36}/g, // UUID enumeration
      ],
      // Path traversal
      pathTraversal: [
        /\.\./,
        /%2e%2e/i,
        /%252e%252e/i,
      ],
      // SQL injection
      sqlInjection: [
        /union\s+select/i,
        /or\s+1\s*=\s*1/i,
        /drop\s+table/i,
        /;\s*--/i,
      ],
      // XSS attempts
      xss: [
        /<script/i,
        /javascript:/i,
        /onerror\s*=/i,
        /onload\s*=/i,
      ]
    };
  }

  /**
   * Detect bot/crawler
   */
  detectBot(userAgent) {
    if (!userAgent) return { isBot: true, confidence: 0.9, name: 'No User-Agent' };

    for (const { pattern, name } of this.botSignatures) {
      if (pattern.test(userAgent)) {
        return { isBot: true, confidence: 0.95, name };
      }
    }

    // Missing standard headers suggests automation
    return { isBot: false, confidence: 0, name: null };
  }

  /**
   * Detect scraping behavior
   */
  detectScraping(req) {
    const indicators = [];
    let score = 0;

    // 1. Rapid sequential requests
    // (tracked via rate limiter)

    // 2. Accessing multiple resources in sequence
    const urlPattern = /\/api\/(\w+)\/(\d+)/;
    const match = req.url.match(urlPattern);
    if (match) {
      indicators.push('sequential_resource_access');
      score += 2;
    }

    // 3. No referrer on data endpoints
    if (!req.headers.referer && req.url.startsWith('/api/')) {
      indicators.push('no_referrer');
      score += 1;
    }

    // 4. Missing standard browser headers
    const browserHeaders = ['accept-language', 'accept-encoding'];
    const missingHeaders = browserHeaders.filter(h => !req.headers[h]);
    if (missingHeaders.length > 0) {
      indicators.push(`missing_headers: ${missingHeaders.join(', ')}`);
      score += missingHeaders.length;
    }

    // 5. Suspicious user agent
    const botDetection = this.detectBot(req.headers['user-agent']);
    if (botDetection.isBot) {
      indicators.push(`bot_detected: ${botDetection.name}`);
      score += 5;
    }

    return {
      isScraping: score >= 5,
      score,
      indicators,
      confidence: Math.min(score / 10, 1)
    };
  }

  // ============================================
  // Middleware Functions
  // ============================================

  /**
   * Rate limit middleware factory
   */
  rateLimit(limiterFn, options = {}) {
    const {
      keyGenerator = (req) => req.user ? `user_${req.user.id}` : `ip_${req.ip}`,
      points = 1,
      errorMessage = 'Too many requests. Please try again later.',
      logViolation = true
    } = options;

    return async (req, res, next) => {
      const limiter = limiterFn.call(this);
      const key = keyGenerator(req);

      try {
        await limiter.consume(key, points);
        next();
      } catch (error) {
        const retrySecs = error.secsBeforeNext || Math.ceil(error.msBeforeNext / 1000);

        // Log violation
        if (logViolation) {
          securityLogger.logRateLimit({
            ip: req.ip,
            endpoint: req.originalUrl,
            attempts: options.points || 100,
            windowMs: options.duration || 900000,
            userId: req.user?.id,
            retryAfter: retrySecs
          });
        }

        res.set('Retry-After', String(retrySecs));
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: errorMessage,
          retryAfter: retrySecs,
          retryAfterDate: new Date(Date.now() + retrySecs * 1000).toISOString()
        });
      }
    };
  }

  /**
   * Bot detection middleware
   */
  botDetection(options = {}) {
    const {
      blockBots = true,
      allowSearchEngines = false,
      customHandler = null
    } = options;

    return (req, res, next) => {
      const userAgent = req.headers['user-agent'] || '';
      const botInfo = this.detectBot(userAgent);

      // Allow search engines if configured
      if (allowSearchEngines && /googlebot|bingbot|slurp|duckduckbot/i.test(userAgent)) {
        req.botInfo = { isBot: false, isSearchEngine: true };
        return next();
      }

      if (botInfo.isBot) {
        req.botInfo = botInfo;

        // Log bot detection
        securityLogger.logSuspiciousActivity({
          type: 'bot_detected',
          ip: req.ip,
          userAgent,
          endpoint: req.originalUrl,
          evidence: `Bot: ${botInfo.name} (confidence: ${botInfo.confidence})`,
          action: blockBots ? 'blocked' : 'monitored'
        });

        if (blockBots) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Automated access is not permitted'
          });
        }

        // Allow but mark for monitoring
        if (customHandler) {
          return customHandler(req, res, next);
        }
      }

      next();
    };
  }

  /**
   * Anti-scraping middleware
   */
  antiScraping(options = {}) {
    const {
      threshold = 5,
      blockOnDetection = true,
      logViolations = true
    } = options;

    return (req, res, next) => {
      const scrapingInfo = this.detectScraping(req);

      if (scrapingInfo.isScraping && scrapingInfo.score >= threshold) {
        req.scrapingInfo = scrapingInfo;

        // Log scraping attempt
        if (logViolations) {
          securityLogger.logSuspiciousActivity({
            type: 'scraping_detected',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            endpoint: req.originalUrl,
            evidence: `Score: ${scrapingInfo.score}, Indicators: ${scrapingInfo.indicators.join(', ')}`,
            action: blockOnDetection ? 'blocked' : 'monitored'
          });
        }

        if (blockOnDetection) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Automated data collection is not permitted'
          });
        }
      }

      next();
    };
  }

  /**
   * Progressive rate limiting (stricter for repeat offenders)
   */
  progressiveRateLimit(limiterFn, options = {}) {
    const {
      levels = [
        { threshold: 1, multiplier: 1 },
        { threshold: 3, multiplier: 2 },
        { threshold: 5, multiplier: 5 },
        { threshold: 10, multiplier: 10 }
      ],
      trackKey = (req) => `ip_${req.ip}`
    } = options;

    return async (req, res, next) => {
      const trackKeyVal = trackKey(req);
      const violationKey = `violations_${trackKeyVal}`;
      
      // Get violation count
      let violations = 0;
      if (this.isRedisAvailable()) {
        try {
          const count = await this.redisClient.get(violationKey);
          violations = parseInt(count) || 0;
        } catch (e) {
          // Ignore errors
        }
      }

      // Find appropriate level
      let multiplier = 1;
      for (const level of levels) {
        if (violations >= level.threshold) {
          multiplier = level.multiplier;
        }
      }

      // Apply rate limit with multiplier
      const limiter = limiterFn.call(this);
      const key = options.keyGenerator ? options.keyGenerator(req) : trackKeyVal;

      try {
        await limiter.consume(key, multiplier);
        next();
      } catch (error) {
        const retrySecs = error.secsBeforeNext || Math.ceil(error.msBeforeNext / 1000);

        // Increment violation counter
        if (this.isRedisAvailable()) {
          try {
            await this.redisClient.incr(violationKey);
            await this.redisClient.expire(violationKey, 60 * 60 * 24); // 24 hour window
          } catch (e) {
            // Ignore errors
          }
        }

        securityLogger.logRateLimit({
          ip: req.ip,
          endpoint: req.originalUrl,
          attempts: options.points || 100,
          windowMs: options.duration || 900000,
          userId: req.user?.id,
          retryAfter: retrySecs,
          violations,
          multiplier
        });

        res.set('Retry-After', String(retrySecs));
        res.status(429).json({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please wait ${retrySecs} seconds.`,
          retryAfter: retrySecs
        });
      }
    };
  }
}

// Export factory function
const createAbuseProtection = (redisClient, isRedisAvailable) => {
  return new AbuseProtection(redisClient, isRedisAvailable);
};

module.exports = createAbuseProtection;
