# ZoneRush Production Deployment Security Guide

## 🚀 Complete Setup for Secure Production Deployment

This guide covers everything needed to deploy ZoneRush securely in production.

---

## 📋 Pre-Deployment Checklist

### 1. **Rotate ALL API Keys** ⚠️ CRITICAL

Your current `.env` file has **REAL API KEYS EXPOSED**. These MUST be rotated immediately:

```bash
# Generate new JWT Secret (64+ characters)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy the output and replace in .env:
JWT_SECRET=<paste_generated_secret>
```

**APIs to Rotate:**
- [ ] PostgreSQL Database Password
- [ ] JWT Secret
- [ ] Mailjet API Key & Secret
- [ ] Resend API Key
- [ ] SendGrid API Key
- [ ] Mailgun API Key
- [ ] OpenWeatherMap API Key
- [ ] WAQI API Key
- [ ] Groq API Key
- [ ] Anthropic API Key
- [ ] Twilio Account SID & Auth Token
- [ ] TextLocal API Key

### 2. **Secure Database Access**

#### PostgreSQL Security Configuration:

```sql
-- 1. Create dedicated production user (not postgres superuser)
CREATE USER zonerush_prod WITH PASSWORD 'strong_password_here';

-- 2. Grant only necessary permissions
GRANT CONNECT ON DATABASE zonerush_production TO zonerush_prod;
GRANT USAGE ON SCHEMA public TO zonerush_prod;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO zonerush_prod;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO zonerush_prod;

-- 3. Revoke public schema access from everyone
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 4. Enable SSL for connections
ALTER SYSTEM SET ssl = 'on';
ALTER SYSTEM SET ssl_cert_file = '/path/to/cert.pem';
ALTER SYSTEM SET ssl_key_file = '/path/to/key.pem';
```

#### Network Security:

```bash
# PostgreSQL pg_hba.conf - Restrict access
# Only allow your application server IP
hostssl zonerush_production zonerush_prod YOUR_SERVER_IP/32 scram-sha-256

# NEVER use:
# host all all 0.0.0.0/0 trust  ❌ DANGEROUS!
```

#### Cloud Database (AWS RDS / Supabase / Neon):

1. Enable SSL/TLS connections
2. Configure VPC security groups
3. Allow only application server IP
4. Enable encryption at rest
5. Use IAM authentication if available

### 3. **HTTPS Configuration**

#### Option A: Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/zonerush
server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket support for Socket.IO
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

```bash
# Install Let's Encrypt Certificate
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet
```

#### Option B: Platform Deployment (Render/Railway/Heroku)

These platforms handle HTTPS automatically. Just ensure:
- ✅ Set `NODE_ENV=production`
- ✅ Set `FRONTEND_URL=https://your-domain.com`
- ✅ Set `ENABLE_HTTPS=true`

### 4. **Environment Variables Setup**

#### Production `.env` Template:

```bash
# Copy the example template
cp server/.env.example server/.env

# Edit with your secure values
nano server/.env
```

**Security Requirements:**
- ✅ JWT_SECRET: 64+ random characters
- ✅ DB_PASSWORD: 16+ chars, mixed case + numbers + symbols
- ✅ All API keys: Replace with newly rotated keys
- ✅ HTTPS URLs only (no http://)
- ✅ DB_SSL=true

#### Never Commit `.env`:

```bash
# Verify .gitignore has .env
echo ".env" >> .gitignore
echo "server/.env" >> .gitignore
echo "server/logs/" >> .gitignore

# Remove from git if already committed
git rm --cached server/.env
git commit -m "Remove .env from repository"
```

### 5. **File Permissions**

```bash
# Secure .env file (owner read-only)
chmod 600 server/.env

# Secure logs directory
chmod 700 server/logs

# Secure uploads directory
chmod 755 server/public/uploads

# Node process should run as non-root user
sudo useradd --system --no-create-home zonerush
sudo chown -R zonerush:zonerush /path/to/zonerush
```

### 6. **Systemd Service (Linux)**

```ini
# /etc/systemd/system/zonerush.service
[Unit]
Description=ZoneRush API Server
After=network.target postgresql.service

[Service]
Type=simple
User=zonerush
WorkingDirectory=/path/to/zonerush/server
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

# Environment
Environment=NODE_ENV=production
EnvironmentFile=/path/to/zonerush/server/.env

# Security Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/path/to/zonerush/server/logs
ReadWritePaths=/path/to/zonerush/server/public/uploads

# Resource Limits
LimitNOFILE=65536
MemoryMax=1G

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable zonerush
sudo systemctl start zonerush

# Check status
sudo systemctl status zonerush

# View logs
sudo journalctl -u zonerush -f
```

---

## 🔒 Security Features Enabled

### 1. **HTTPS Enforcement**
- ✅ Automatic HTTP → HTTPS redirect (301)
- ✅ HSTS headers (Strict-Transport-Security)
- ✅ SSL/TLS certificate management

### 2. **Security Headers**
```javascript
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

### 3. **Request Logging**
All requests are logged to `server/logs/`:
- `auth-YYYY-MM-DD.log` - Authentication attempts
- `api-error-YYYY-MM-DD.log` - API errors
- `security-YYYY-MM-DD.log` - Security events
- `database-YYYY-MM-DD.log` - Database errors
- `server-YYYY-MM-DD.log` - Server events

### 4. **Suspicious Traffic Detection**
Automatically blocks:
- ❌ Automated scanners (Nikto, Nmap, SQLMap, etc.)
- ❌ Path traversal attempts (`../../../etc/passwd`)
- ❌ SQL injection attempts (`UNION SELECT`, `OR 1=1`)
- ❌ XSS attempts (`<script>`, `javascript:`)
- ❌ Enumeration attacks (sequential ID probing)

### 5. **Rate Limiting**
```javascript
// Default: 100 requests per 15 minutes per IP
// Redis-backed for distributed deployments
// Returns 429 Too Many Requests when exceeded
```

### 6. **Production Validation**
Server will **refuse to start** in production if:
- ❌ JWT_SECRET is weak or default
- ❌ DB_PASSWORD is weak or default
- ❌ FRONTEND_URL not set
- ❌ Email service misconfigured
- ❌ Exposed development/test keys detected

---

## 📊 Monitoring & Alerting

### 1. **View Security Logs**

```bash
# Navigate to logs directory
cd server/logs

# View today's auth logs
cat auth-$(date +%Y-%m-%d).log | jq .

# View security events
cat security-$(date +%Y-%m-%d).log | jq .

# Search for failed logins
grep '"level":"warn"' auth-*.log | jq '.email'

# Count unauthorized access attempts
grep '"event":"unauthorized_access"' security-*.log | wc -l
```

### 2. **Security Metrics**

```javascript
// Get metrics from security logger
const securityLogger = require('./middleware/securityLogger');

const metrics = securityLogger.getSecurityMetrics(24);
console.log(metrics);

// Output:
// {
//   authAttempts: 150,
//   authFailures: 12,
//   unauthorizedAccess: 3,
//   rateLimitViolations: 8,
//   apiErrors: 5,
//   suspiciousActivities: 2
// }
```

### 3. **Search Logs**

```javascript
// Search for specific IP
const results = securityLogger.searchLogs('192.168.1.100', {
  hours: 24,
  type: 'security'
});

// Search for failed auth attempts
const failures = securityLogger.searchLogs('login_failed', {
  hours: 48,
  type: 'auth',
  level: 'warn'
});
```

### 4. **Database Security Events**

```sql
-- View recent unauthorized access attempts
SELECT 
  u.username,
  se.event_type,
  se.ip_address,
  se.details->>'type' as resource_type,
  se.details->>'attempt' as attempt_type,
  se.created_at
FROM security_events se
LEFT JOIN users u ON se.user_id = u.id
WHERE se.event_type = 'unauthorized_access'
ORDER BY se.created_at DESC
LIMIT 50;

-- View login attempts (brute force detection)
SELECT 
  u.username,
  COUNT(*) as failed_attempts,
  MAX(la.attempted_at) as last_attempt,
  u.account_locked,
  u.lockout_until
FROM login_attempts la
JOIN users u ON la.user_id = u.id
WHERE la.attempted_at > NOW() - INTERVAL '1 hour'
GROUP BY u.id, u.username, u.account_locked, u.lockout_until
HAVING COUNT(*) >= 3
ORDER BY failed_attempts DESC;
```

---

## 🚨 Incident Response

### 1. **Detect Brute Force Attack**

```bash
# Check for multiple failed logins from same IP
grep 'login_failed' server/logs/auth-*.log | \
  jq -r '.ip' | sort | uniq -c | sort -rn | head -10

# If >10 failures from one IP, consider blocking
```

### 2. **Block Malicious IP (Nginx)**

```nginx
# /etc/nginx/conf.d/blocked-ips.conf
deny 192.168.1.100;  # Replace with actual IP
deny 10.0.0.50;

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

### 3. **Block IP (Firewall)**

```bash
# Linux iptables
sudo iptables -A INPUT -s 192.168.1.100 -j DROP
sudo iptables-save | sudo tee /etc/iptables/rules.v4

# UFW (Ubuntu)
sudo ufw deny from 192.168.1.100
```

### 4. **Investigate Security Event**

```javascript
// In server console
const securityLogger = require('./middleware/securityLogger');

// Get all suspicious activity from last 24 hours
const incidents = securityLogger.searchLogs('suspicious_activity', {
  hours: 24,
  type: 'security'
});

incidents.forEach(incident => {
  console.log(`${incident.timestamp} - ${incident.type}`);
  console.log(`  IP: ${incident.ip}`);
  console.log(`  Evidence: ${incident.evidence}`);
  console.log(`  Action: ${incident.action}`);
  console.log('---');
});
```

---

## 🧪 Post-Deployment Testing

### 1. **Test HTTPS Enforcement**

```bash
# Should redirect to HTTPS
curl -I http://your-api-domain.com/api/health

# Expected: HTTP/1.1 301 Moved Permanently
# Location: https://your-api-domain.com/api/health
```

### 2. **Test Security Headers**

```bash
curl -I https://your-api-domain.com/api/health

# Verify headers present:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
```

### 3. **Test Rate Limiting**

```bash
# Send 100+ requests rapidly
for i in {1..110}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-api-domain.com/api/health
done

# Expected: First 100 return 200, then 429
```

### 4. **Test SQL Injection Protection**

```bash
curl "https://your-api-domain.com/api/auth/login?username=admin'%20OR%201=1--"

# Expected: 400 Bad Request
```

### 5. **Test Path Traversal Protection**

```bash
curl "https://your-api-domain.com/api/../../../etc/passwd"

# Expected: 400 Bad Request
```

### 6. **Verify Logs Are Working**

```bash
# Check logs directory
ls -la server/logs/

# Should see today's log files:
# auth-2026-04-14.log
# api-error-2026-04-14.log
# security-2026-04-14.log
# server-2026-04-14.log
```

---

## 📝 Deployment Commands

### Quick Deployment (Linux)

```bash
# 1. Pull latest code
cd /path/to/zonerush
git pull origin main

# 2. Install dependencies
cd server
npm ci --production

# 3. Validate configuration
node -e "require('./config/securityConfig').validateProductionConfig()"

# 4. Restart service
sudo systemctl restart zonerush

# 5. Check status
sudo systemctl status zonerush

# 6. Monitor logs
sudo journalctl -u zonerush -f
```

### Docker Deployment

```dockerfile
# server/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S zonerush -u 1001

# Create logs directory
RUN mkdir -p /app/logs && chown zonerush:nodejs /app/logs

# Switch to non-root user
USER zonerush

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start application
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./server
    ports:
      - "5000:5000"
    env_file:
      - ./server/.env
    volumes:
      - ./server/logs:/app/logs
      - ./server/public/uploads:/app/public/uploads
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: zonerush_production
      POSTGRES_USER: zonerush_prod
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

```bash
# Start with Docker
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

---

## ✅ Final Security Checklist

### Before Going Live:

- [ ] All API keys rotated
- [ ] Strong JWT_SECRET generated (64+ chars)
- [ ] Database password changed (16+ chars)
- [ ] `.env` file secured (chmod 600)
- [ ] `.env` not in git repository
- [ ] HTTPS configured and working
- [ ] Database SSL enabled
- [ ] Database user has minimal permissions
- [ ] Firewall rules configured
- [ ] Rate limiting tested
- [ ] Security headers verified
- [ ] Logs directory created and writable
- [ ] Monitoring/alerting setup
- [ ] Backup strategy in place
- [ ] Non-root user for Node.js process
- [ ] File permissions correct
- [ ] CORS restricted to production domains
- [ ] Test accounts removed or disabled

### Ongoing Maintenance:

- [ ] Monitor security logs daily
- [ ] Review unauthorized access attempts weekly
- [ ] Rotate API keys every 90 days
- [ ] Update dependencies monthly (`npm audit fix`)
- [ ] Review rate limit thresholds
- [ ] Backup database daily
- [ ] Test disaster recovery quarterly
- [ ] Audit user permissions quarterly

---

## 🆘 Troubleshooting

### Server Won't Start in Production

```bash
# Check validation errors
node server/config/securityConfig.js

# Common issues:
# - JWT_SECRET too weak
# - DB_PASSWORD using default
# - Missing FRONTEND_URL
# - Exposed test keys
```

### HTTPS Redirect Loop

```nginx
# Fix nginx configuration
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Proto https;
```

### Database Connection Failed

```bash
# Test SSL connection
psql "host=your-db-host dbname=zonerush_production user=zonerush_prod sslmode=require"

# Check if SSL is enabled
psql -c "SHOW ssl;"
```

### Logs Not Being Written

```bash
# Check directory permissions
ls -la server/logs/

# Fix permissions
chmod 755 server/logs/
chown zonerush:zonerush server/logs/
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

---

**Your ZoneRush application is now production-ready and secure!** 🎉🔒
