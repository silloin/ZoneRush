/**
 * Security Event Logger
 * Structured logging for authentication attempts, API errors, and suspicious behavior
 * Supports file-based logging for production monitoring
 */

const fs = require('fs');
const path = require('path');

class SecurityLogger {
  constructor() {
    this.logDir = path.join(__dirname, '..', 'logs');
    this.ensureLogDirectory();
    
    // Log rotation: keep last 30 days
    this.maxLogAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    this.rotateLogs();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Rotate old log files
   */
  rotateLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        
        if (now - stats.mtimeMs > this.maxLogAge) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Rotated old log file: ${file}`);
        }
      });
    } catch (error) {
      console.error('Log rotation error:', error.message);
    }
  }

  /**
   * Get log file path for today
   */
  getLogFilePath(type) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `${type}-${date}.log`);
  }

  /**
   * Write structured log entry
   */
  writeLog(type, level, event) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      type,
      ...event
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    const logFile = this.getLogFilePath(type);

    try {
      fs.appendFileSync(logFile, logLine);
    } catch (error) {
      console.error('Failed to write log:', error.message);
    }

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${type.toUpperCase()}]`, event.message || event);
    }
  }

  /**
   * Log authentication attempt
   */
  logAuthAttempt(event) {
    this.writeLog('auth', event.success ? 'info' : 'warn', {
      event: event.success ? 'login_success' : 'login_failed',
      userId: event.userId || null,
      email: event.email || null,
      ip: event.ip,
      userAgent: event.userAgent,
      reason: event.reason || null, // For failed attempts
      attemptCount: event.attemptCount || null
    });
  }

  /**
   * Log successful logout / token revocation
   */
  logAuthEvent(event) {
    this.writeLog('auth', 'info', {
      event: event.type || 'auth_event',
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details
    });
  }

  /**
   * Log API error
   */
  logAPIError(event) {
    this.writeLog('api-error', 'error', {
      endpoint: event.endpoint,
      method: event.method,
      statusCode: event.statusCode,
      error: event.error,
      stack: event.stack,
      userId: event.userId || null,
      ip: event.ip,
      userAgent: event.userAgent,
      params: event.params,
      query: event.query,
      body: event.body ? '[REDACTED]' : null // Never log request body
    });
  }

  /**
   * Log unauthorized access attempt (IDOR, etc.)
   */
  logUnauthorizedAccess(event) {
    this.writeLog('security', 'warn', {
      event: 'unauthorized_access',
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      resourceOwner: event.resourceOwner,
      action: event.action // read, write, delete
    });
  }

  /**
   * Log rate limit violations
   */
  logRateLimit(event) {
    this.writeLog('security', 'warn', {
      event: 'rate_limit_exceeded',
      ip: event.ip,
      endpoint: event.endpoint,
      attempts: event.attempts,
      windowMs: event.windowMs,
      userId: event.userId || null
    });
  }

  /**
   * Log suspicious traffic patterns
   */
  logSuspiciousActivity(event) {
    this.writeLog('security', 'error', {
      event: 'suspicious_activity',
      type: event.type, // enumeration, brute_force, scraping, etc.
      ip: event.ip,
      userId: event.userId || null,
      userAgent: event.userAgent,
      evidence: event.evidence,
      action: event.action // blocked, monitored, alerted
    });
  }

  /**
   * Log database errors
   */
  logDatabaseError(event) {
    this.writeLog('database', 'error', {
      event: 'database_error',
      error: event.error,
      code: event.code,
      query: event.query ? '[REDACTED]' : null,
      params: event.params ? '[REDACTED]' : null,
      userId: event.userId || null,
      ip: event.ip
    });
  }

  /**
   * Log email sending failures
   */
  logEmailFailure(event) {
    this.writeLog('email', 'error', {
      event: 'email_send_failed',
      service: event.service,
      recipient: event.recipient,
      error: event.error,
      userId: event.userId || null
    });
  }

  /**
   * Log server startup/shutdown
   */
  logServerEvent(event) {
    this.writeLog('server', 'info', {
      event: event.type, // startup, shutdown, error
      port: event.port,
      environment: event.environment,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      details: event.details
    });
  }

  /**
   * Log file integrity check
   */
  logFileAccess(event) {
    this.writeLog('security', 'warn', {
      event: 'file_access_attempt',
      filePath: event.filePath,
      userId: event.userId || null,
      ip: event.ip,
      action: event.action, // read, write, delete
      authorized: event.authorized
    });
  }

  /**
   * Get security metrics (for monitoring dashboard)
   */
  getSecurityMetrics(hours = 24) {
    const metrics = {
      authAttempts: 0,
      authFailures: 0,
      unauthorizedAccess: 0,
      rateLimitViolations: 0,
      apiErrors: 0,
      suspiciousActivities: 0
    };

    try {
      const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
      const files = fs.readdirSync(this.logDir);

      files.forEach(file => {
        if (!file.endsWith('.log')) return;

        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoffTime) return;

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        lines.forEach(line => {
          try {
            const entry = JSON.parse(line);
            
            if (entry.type === 'auth') {
              metrics.authAttempts++;
              if (entry.level === 'warn') metrics.authFailures++;
            }
            if (entry.type === 'security' && entry.event === 'unauthorized_access') {
              metrics.unauthorizedAccess++;
            }
            if (entry.type === 'security' && entry.event === 'rate_limit_exceeded') {
              metrics.rateLimitViolations++;
            }
            if (entry.type === 'api-error') {
              metrics.apiErrors++;
            }
            if (entry.type === 'security' && entry.event === 'suspicious_activity') {
              metrics.suspiciousActivities++;
            }
          } catch (e) {
            // Skip malformed log lines
          }
        });
      });
    } catch (error) {
      console.error('Failed to calculate security metrics:', error.message);
    }

    return metrics;
  }

  /**
   * Search logs for specific patterns (for incident investigation)
   */
  searchLogs(query, options = {}) {
    const { hours = 24, type = null, level = null } = options;
    const results = [];

    try {
      const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
      const files = fs.readdirSync(this.logDir);

      files.forEach(file => {
        if (type && !file.startsWith(type)) return;
        if (!file.endsWith('.log')) return;

        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtimeMs < cutoffTime) return;

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());

        lines.forEach(line => {
          try {
            const entry = JSON.parse(line);

            if (level && entry.level !== level) return;

            const lineStr = JSON.stringify(entry).toLowerCase();
            if (query && lineStr.includes(query.toLowerCase())) {
              results.push(entry);
            }
          } catch (e) {
            // Skip malformed log lines
          }
        });
      });
    } catch (error) {
      console.error('Failed to search logs:', error.message);
    }

    return results;
  }
}

// Export singleton instance
const securityLogger = new SecurityLogger();

module.exports = securityLogger;
