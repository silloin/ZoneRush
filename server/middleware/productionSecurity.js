/**
 * Production Security Middleware
 * HTTPS enforcement, request logging, suspicious traffic detection
 */

const securityLogger = require('./securityLogger');

/**
 * Enhanced HTTPS Enforcement Middleware
 */
const enforceHTTPS = (req, res, next) => {
  // Skip in development or if behind reverse proxy with proper headers
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is secure (HTTPS)
  const isHTTPS = req.header('x-forwarded-proto') === 'https' || 
                  req.header('x-forwarded-ssl') === 'on' ||
                  req.secure === true;

  if (!isHTTPS) {
    // Log insecure access attempt
    securityLogger.logSuspiciousActivity({
      type: 'insecure_access',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      endpoint: req.originalUrl,
      evidence: 'HTTP request in production',
      action: 'redirected_to_https'
    });

    // Redirect to HTTPS
    const httpsUrl = `https://${req.header('host')}${req.originalUrl}`;
    return res.redirect(301, httpsUrl);
  }

  next();
};

/**
 * Security Headers Middleware
 */
const securityHeaders = (req, res, next) => {
  // HTTP Strict Transport Security
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (adjust as needed)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://*.mapbox.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com; img-src 'self' data: https://*.mapbox.com https://*.mapbox.net blob:; connect-src 'self' https://api.mapbox.com https://*.mapbox.com https://events.mapbox.com ws: wss:; font-src 'self' data: https://api.mapbox.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';"
  );
  
  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=()'
  );
  
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  // Cache control for API responses
  if (req.originalUrl.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
};

/**
 * Request Logging Middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id || null
  };

  // Monitor response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Log slow requests (>2 seconds)
    if (duration > 2000) {
      securityLogger.writeLog('performance', 'warn', {
        event: 'slow_request',
        ...requestInfo,
        statusCode,
        duration: `${duration}ms`,
        message: `Slow ${req.method} ${req.originalUrl} took ${duration}ms`
      });
    }

    // Log server errors (5xx)
    if (statusCode >= 500) {
      securityLogger.logAPIError({
        endpoint: req.originalUrl,
        method: req.method,
        statusCode,
        error: 'Internal Server Error',
        userId: req.user?.id,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    }

    // Log client errors for security monitoring (4xx)
    if (statusCode === 401 || statusCode === 403 || statusCode === 429) {
      securityLogger.writeLog('security', 'warn', {
        event: 'access_denied',
        ...requestInfo,
        statusCode,
        duration: `${duration}ms`,
        message: `${statusCode} on ${req.method} ${req.originalUrl}`
      });
    }
  });

  next();
};

/**
 * Suspicious Traffic Detection Middleware
 */
const detectSuspiciousTraffic = (req, res, next) => {
  const ip = req.ip;
  const userAgent = req.headers['user-agent'] || '';
  const url = req.originalUrl;

  // 1. Detect automated scanners/bots
  const botPatterns = [
    /nikto/i, /nmap/i, /sqlmap/i, /burp/i, /zap/i,
    /dirbuster/i, /gobuster/i, /wfuzz/i
  ];

  for (const pattern of botPatterns) {
    if (pattern.test(userAgent)) {
      securityLogger.logSuspiciousActivity({
        type: 'scanner_detected',
        ip,
        userAgent,
        endpoint: url,
        evidence: `Bot signature detected: ${pattern.source}`,
        action: 'blocked'
      });

      return res.status(403).json({
        error: 'Access denied',
        message: 'Automated scanning tools are not permitted'
      });
    }
  }

  // 2. Detect enumeration attempts (sequential IDs in rapid succession)
  const idPattern = /\/(\d+)/g;
  const ids = [];
  let match;
  while ((match = idPattern.exec(url)) !== null) {
    ids.push(parseInt(match[1]));
  }

  // Could add IP-based tracking here with Redis
  // For now, just log if multiple IDs detected
  if (ids.length > 5) {
    securityLogger.logSuspiciousActivity({
      type: 'enumeration_attempt',
      ip,
      userAgent,
      endpoint: url,
      evidence: `Multiple IDs in URL: ${ids.join(', ')}`,
      action: 'monitored'
    });
  }

  // 3. Detect path traversal attempts
  const traversalPatterns = [
    /\.\./, // ../
    /%2e%2e/i, // URL encoded ../
    /%252e%252e/i, // Double URL encoded
    /etc\/passwd/i,
    /etc\/shadow/i,
    /windows\/system32/i
  ];

  for (const pattern of traversalPatterns) {
    if (pattern.test(url)) {
      securityLogger.logSuspiciousActivity({
        type: 'path_traversal',
        ip,
        userAgent,
        endpoint: url,
        evidence: `Path traversal pattern detected: ${pattern.source}`,
        action: 'blocked'
      });

      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request path'
      });
    }
  }

  // 4. Detect SQL injection attempts
  const sqlPatterns = [
    /union\s+select/i,
    /or\s+1\s*=\s*1/i,
    /drop\s+table/i,
    /;\s*--/i,
    /'\s*or\s*'/i
  ];

  const queryString = JSON.stringify(req.query ?? {}).toLowerCase();
  const bodyString = JSON.stringify(req.body ?? {}).toLowerCase();

  for (const pattern of sqlPatterns) {
    if (pattern.test(queryString) || pattern.test(bodyString)) {
      securityLogger.logSuspiciousActivity({
        type: 'sql_injection_attempt',
        ip,
        userAgent,
        endpoint: url,
        evidence: `SQL injection pattern: ${pattern.source}`,
        action: 'blocked'
      });

      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request parameters'
      });
    }
  }

  // 5. Detect XSS attempts
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /eval\(/i
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(queryString) || pattern.test(bodyString)) {
      securityLogger.logSuspiciousActivity({
        type: 'xss_attempt',
        ip,
        userAgent,
        endpoint: url,
        evidence: `XSS pattern: ${pattern.source}`,
        action: 'blocked'
      });

      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request parameters'
      });
    }
  }

  next();
};

/**
 * Database Access Restriction Middleware
 * Ensures database operations are logged and monitored
 */
const monitorDatabaseAccess = (queryFn) => {
  return async (query, params) => {
    const start = Date.now();
    
    try {
      const result = await queryFn(query, params);
      const duration = Date.now() - start;

      // Log slow queries (>1 second)
      if (duration > 1000) {
        securityLogger.writeLog('database', 'warn', {
          event: 'slow_query',
          duration: `${duration}ms`,
          query: query.substring(0, 100) + '...',
          paramCount: params?.length || 0
        });
      }

      return result;
    } catch (error) {
      securityLogger.logDatabaseError({
        error: error.message,
        code: error.code,
        query: query.substring(0, 100),
        userId: global.currentUserId || null,
        ip: global.currentIP || null
      });

      throw error;
    }
  };
};

/**
 * Environment Variable Sanitizer
 * Prevents accidental logging of sensitive data
 */
const sanitizeEnvForLogging = () => {
  const sensitiveKeys = [
    'JWT_SECRET', 'DB_PASSWORD', 'API_KEY', 'SECRET',
    'PASSWORD', 'TOKEN', 'AUTH'
  ];

  const sanitized = {};
  
  for (const [key, value] of Object.entries(process.env)) {
    const isSensitive = sensitiveKeys.some(sensitive => 
      key.toUpperCase().includes(sensitive)
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

module.exports = {
  enforceHTTPS,
  securityHeaders,
  requestLogger,
  detectSuspiciousTraffic,
  monitorDatabaseAccess,
  sanitizeEnvForLogging
};
