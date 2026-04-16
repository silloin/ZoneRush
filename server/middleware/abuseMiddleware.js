/**
 * Global Abuse Protection Middleware
 * Apply bot detection, anti-scraping, and rate limiting across all routes
 */

const securityLogger = require('./securityLogger');

/**
 * Global bot detection and anti-scraping middleware
 * Apply this early in the middleware chain
 */
const globalAbuseProtection = (req, res, next) => {
  // Skip abuse protection in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const abuseProtection = req.app.get('abuseProtection');
  if (!abuseProtection) {
    return next();
  }

  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip;
  const url = req.originalUrl;

  // 1. Detect bots
  const botInfo = abuseProtection.detectBot(userAgent);
  req.botInfo = botInfo;

  // Allow search engines (for SEO)
  const isSearchEngine = /googlebot|bingbot|slurp|duckduckbot|baiduspider/i.test(userAgent);
  
  if (botInfo.isBot && !isSearchEngine) {
    // Log bot detection
    securityLogger.logSuspiciousActivity({
      type: 'bot_detected',
      ip,
      userAgent,
      endpoint: url,
      evidence: `Bot: ${botInfo.name} (confidence: ${botInfo.confidence})`,
      action: 'blocked'
    });

    return res.status(403).json({
      error: 'Access denied',
      message: 'Automated access is not permitted'
    });
  }

  // 2. Detect scraping (only for API routes, not frontend)
  if (url.startsWith('/api/')) {
    const scrapingInfo = abuseProtection.detectScraping(req);
    req.scrapingInfo = scrapingInfo;

    if (scrapingInfo.isScraping && scrapingInfo.score >= 5) {
      // Log scraping attempt
      securityLogger.logSuspiciousActivity({
        type: 'scraping_detected',
        ip,
        userAgent,
        endpoint: url,
        evidence: `Score: ${scrapingInfo.score}, Indicators: ${scrapingInfo.indicators.join(', ')}`,
        action: 'blocked'
      });

      return res.status(403).json({
        error: 'Access denied',
        message: 'Automated data collection is not permitted'
      });
    }
  }

  next();
};

/**
 * API-wide rate limiting middleware
 * Apply to all /api/* routes
 */
const apiRateLimit = (req, res, next) => {
  const abuseProtection = req.app.get('abuseProtection');
  if (!abuseProtection) {
    return next();
  }

  // Apply general API rate limit
  return abuseProtection.rateLimit(
    abuseProtection.apiLimiter,
    {
      keyGenerator: (req) => req.user ? `user_${req.user.id}` : `ip_${req.ip}`,
      points: 1,
      errorMessage: 'API rate limit exceeded. Please slow down.',
      logViolation: true
    }
  )(req, res, next);
};

/**
 * Progressive rate limiting for repeat offenders
 * Gets stricter with each violation
 */
const progressiveAbuseProtection = (req, res, next) => {
  const abuseProtection = req.app.get('abuseProtection');
  if (!abuseProtection) {
    return next();
  }

  return abuseProtection.progressiveRateLimit(
    abuseProtection.apiLimiter,
    {
      keyGenerator: (req) => req.user ? `user_${req.user.id}` : `ip_${req.ip}`,
      levels: [
        { threshold: 0, multiplier: 1 },   // Normal: 100 req/15min
        { threshold: 3, multiplier: 2 },   // After 3 violations: 50 req/15min
        { threshold: 5, multiplier: 5 },   // After 5 violations: 20 req/15min
        { threshold: 10, multiplier: 10 }  // After 10 violations: 10 req/15min
      ]
    }
  )(req, res, next);
};

/**
 * Data export protection
 * Prevent bulk data scraping
 */
const dataExportProtection = (req, res, next) => {
  const abuseProtection = req.app.get('abuseProtection');
  if (!abuseProtection) {
    return next();
  }

  return abuseProtection.rateLimit(
    abuseProtection.dataExportLimiter,
    {
      keyGenerator: (req) => req.user ? `user_${req.user.id}` : `ip_${req.ip}`,
      points: 1,
      errorMessage: 'Data export limit reached. Try again in 1 hour.',
      logViolation: true
    }
  )(req, res, next);
};

/**
 * Message spam protection
 */
const messageProtection = (req, res, next) => {
  const abuseProtection = req.app.get('abuseProtection');
  if (!abuseProtection) {
    return next();
  }

  return abuseProtection.rateLimit(
    abuseProtection.messageLimiter,
    {
      keyGenerator: (req) => req.user ? `user_${req.user.id}` : req.ip,
      points: 1,
      errorMessage: 'Message limit reached. Please slow down.',
      logViolation: true
    }
  )(req, res, next);
};

/**
 * Search abuse protection
 */
const searchProtection = (req, res, next) => {
  const abuseProtection = req.app.get('abuseProtection');
  if (!abuseProtection) {
    return next();
  }

  return abuseProtection.rateLimit(
    abuseProtection.searchLimiter,
    {
      keyGenerator: (req) => req.user ? `user_${req.user.id}` : `ip_${req.ip}`,
      points: 1,
      errorMessage: 'Search limit reached. Please wait a moment.',
      logViolation: true
    }
  )(req, res, next);
};

/**
 * File upload protection
 */
const uploadProtection = (req, res, next) => {
  const abuseProtection = req.app.get('abuseProtection');
  if (!abuseProtection) {
    return next();
  }

  return abuseProtection.rateLimit(
    abuseProtection.uploadLimiter,
    {
      keyGenerator: (req) => `user_${req.user.id}`,
      points: 1,
      errorMessage: 'Upload limit reached. Try again in 1 hour.',
      logViolation: true
    }
  )(req, res, next);
};

module.exports = {
  globalAbuseProtection,
  apiRateLimit,
  progressiveAbuseProtection,
  dataExportProtection,
  messageProtection,
  searchProtection,
  uploadProtection
};
