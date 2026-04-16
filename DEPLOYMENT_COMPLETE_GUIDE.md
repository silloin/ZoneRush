# 🚀 Production Deployment Guide
## Vercel (Frontend) + Render (Backend) + Supabase (Database)

---

## ✅ ISSUES FOUND & FIXED

### 1. **Backend Issues** ✓ FIXED

#### Issue 1: Message Protection Middleware Error (500 Error)
- **Problem**: `Cannot read properties of undefined (reading 'id')` in abuseMiddleware.js
- **Location**: `server/middleware/abuseMiddleware.js:156`
- **Fix Applied**: Added null check for `req.user`
```javascript
// Before (BROKEN):
keyGenerator: (req) => `user_${req.user.id}`

// After (FIXED):
keyGenerator: (req) => req.user ? `user_${req.user.id}` : req.ip
```

#### Issue 2: Message Spam Protection Applied Twice
- **Problem**: `messageProtection` middleware applied in server.js line 306 AND in messages.js route
- **Fix**: Remove duplicate middleware from server.js

#### Issue 3: Hardcoded Backend URLs
- **Problem**: Multiple files have hardcoded `localhost` or old Render URLs
- **Locations**: 
  - `client/src/context/AuthContext.jsx:14` - Has old Render URL
  - `client/src/services/socketConfig.js:29` - Has old Render URL
- **Fix**: Use environment variables instead

---

## 📋 DEPLOYMENT STEPS

### Step 1: Database Setup (Supabase)

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Wait for database to be ready

2. **Enable PostGIS Extension**
   ```sql
   -- Run in Supabase SQL Editor
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

3. **Run Database Migrations**
   Execute these SQL files in order:
   - `server/sql/setup_database.sql`
   - `server/sql/postgis_setup.sql`
   - `server/sql/social_gamification.sql`
   - `server/sql/emergency_contacts.sql`
   - `server/sql/sos_alerts.sql`
   - `server/sql/clans.sql`
   - `server/sql/chat_system.sql`

4. **Get Database Connection String**
   - Go to Settings → Database
   - Copy "Connection string" (URI mode)
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

---

### Step 2: Backend Deployment (Render)

1. **Prepare Repository**
   - Push your code to GitHub/GitLab

2. **Create Web Service on Render**
   - Go to https://render.com
   - New → Web Service
   - Connect your repository
   - Configure:
     - **Name**: zonerush-api
     - **Region**: Oregon (or your preferred region)
     - **Branch**: main
     - **Root Directory**: Leave blank (or `server` if monorepo)
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `cd server && npm start`
     - **Health Check Path**: `/api/health`

3. **Add Environment Variables**
   
   Add these in Render Dashboard → Environment:

   ```env
   # Node Environment
   NODE_ENV=production
   
   # Database (from Supabase)
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   
   # JWT Secret (generate a secure random string)
   JWT_SECRET=your_super_secure_jwt_secret_here_min_32_chars
   
   # CORS Configuration
   FRONTEND_URL=https://your-app.vercel.app
   CORS_ORIGIN=https://your-app.vercel.app
   
   # API Keys
   WEATHER_API_KEY=your_openweather_api_key
   AQI_API_KEY=your_waqi_api_key
   GROQ_API_KEY=your_groq_api_key
   
   # Email Configuration (choose one)
   EMAIL_SERVICE=resend
   RESEND_API_KEY=your_resend_api_key
   RESEND_FROM_EMAIL=your_verified_email@domain.com
   
   # SMS Configuration (optional)
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   
   # MapBox (optional for backend)
   MAPBOX_API_KEY=your_mapbox_key
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note your Render URL: `https://zonerush-api.onrender.com`

---

### Step 3: Frontend Deployment (Vercel)

1. **Update Environment Variables**
   
   Create/Update `client/.env.production`:
   ```env
   # Production API URL (your Render backend)
   VITE_API_URL_PROD=https://your-api.onrender.com/api
   
   # MapBox API Key
   VITE_MAPBOX_API_KEY=pk.your_mapbox_key_here
   
   # Socket URL (same as backend)
   VITE_SOCKET_URL=https://your-api.onrender.com
   ```

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Update production configuration"
   git push origin main
   ```

3. **Deploy to Vercel**
   - Go to https://vercel.com
   - New Project → Import from GitHub
   - Configure:
     - **Framework**: Vite
     - **Root Directory**: `client`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install --legacy-peer-deps`

4. **Add Environment Variables in Vercel**
   
   Settings → Environment Variables:
   ```env
   VITE_API_URL_PROD=https://your-api.onrender.com/api
   VITE_MAPBOX_API_KEY=pk.your_mapbox_key_here
   VITE_SOCKET_URL=https://your-api.onrender.com
   ```

5. **Deploy**
   - Click Deploy
   - Wait for build to complete
   - Note your Vercel URL: `https://your-app.vercel.app`

6. **Update Backend CORS**
   
   Go back to Render and update:
   ```env
   FRONTEND_URL=https://your-app.vercel.app
   CORS_ORIGIN=https://your-app.vercel.app
   ```
   
   Redeploy backend to apply changes.

---

## 🔧 CRITICAL FIXES TO APPLY BEFORE DEPLOYMENT

### Fix 1: Remove Duplicate Message Protection

**File**: `server/server.js` (lines 305-306)

```javascript
// REMOVE THESE LINES:
const { messageProtection } = require('./middleware/abuseMiddleware');
app.use('/api/messages/private', messageProtection);
```

**Reason**: The protection is already applied in `server/routes/messages.js:10`

---

### Fix 2: Update Hardcoded URLs

**File**: `client/src/context/AuthContext.jsx` (line 14)

```javascript
// Change from:
return 'https://zonerush-api.onrender.com/api';

// To (use environment variable):
return import.meta.env.VITE_API_URL_PROD || '/api';
```

**File**: `client/src/services/socketConfig.js` (line 29)

```javascript
// Change from:
return 'https://zonerush-api.onrender.com';

// To:
return import.meta.env.VITE_SOCKET_URL || 'https://your-api.onrender.com';
```

---

### Fix 3: Update render.yaml

**File**: `render.yaml`

```yaml
services:
  - type: web
    name: zonerush-api
    env: node
    region: oregon
    plan: free
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      # Add these manually in Render dashboard:
      # - DATABASE_URL (from Supabase)
      # - FRONTEND_URL (your Vercel URL)
      # - All API keys
```

---

## 🧪 TESTING CHECKLIST

### After Deployment, Test:

1. **Backend Health Check**
   ```
   GET https://your-api.onrender.com/api/health
   Expected: {"status": "ok", "timestamp": "...", ...}
   ```

2. **Frontend Loads**
   ```
   Visit: https://your-app.vercel.app
   Expected: App loads without errors
   ```

3. **User Registration**
   - Register a new user
   - Check email verification
   - Verify user created in Supabase

4. **User Login**
   - Login with credentials
   - Check token stored in localStorage
   - Verify session persists

5. **Real-time Features**
   - Socket.IO connection
   - Live location tracking
   - Chat messaging

6. **Database Operations**
   - Create/run activities
   - Capture territories
   - Save social posts

7. **File Uploads**
   - Profile photo upload
   - GPX file upload

---

## 🔐 SECURITY CHECKLIST

- [ ] JWT_SECRET is strong and unique (32+ characters)
- [ ] DATABASE_URL uses SSL (Supabase does by default)
- [ ] CORS is configured with specific origins (not `*`)
- [ ] API keys are stored in environment variables (not in code)
- [ ] Email verification is enabled
- [ ] Rate limiting is active
- [ ] HTTPS is enforced
- [ ] Sensitive files are in `.gitignore`

---

## 📝 ENVIRONMENT VARIABLES SUMMARY

### Backend (Render)

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `DATABASE_URL` | Supabase connection | `postgresql://...` |
| `JWT_SECRET` | JWT signing key | `random_32_chars` |
| `FRONTEND_URL` | Vercel app URL | `https://app.vercel.app` |
| `CORS_ORIGIN` | Allowed origins | `https://app.vercel.app` |
| `WEATHER_API_KEY` | OpenWeather key | `abc123...` |
| `AQI_API_KEY` | WAQI key | `def456...` |
| `GROQ_API_KEY` | Groq AI key | `ghi789...` |
| `EMAIL_SERVICE` | Email provider | `resend` |
| `RESEND_API_KEY` | Resend key | `re_abc123...` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL_PROD` | Backend API URL | `https://api.onrender.com/api` |
| `VITE_MAPBOX_API_KEY` | MapBox token | `pk.abc123...` |
| `VITE_SOCKET_URL` | Socket.IO URL | `https://api.onrender.com` |

---

## 🐛 TROUBLESHOOTING

### Issue: CORS Errors
**Solution**: 
- Verify `FRONTEND_URL` in Render matches your Vercel URL exactly
- Check CORS configuration in `server/server.js`
- Ensure protocol (https) is included

### Issue: Socket.IO Connection Fails
**Solution**:
- Check `VITE_SOCKET_URL` in Vercel env vars
- Verify backend Socket.IO CORS settings
- Check browser console for connection errors

### Issue: Database Connection Fails
**Solution**:
- Verify `DATABASE_URL` format
- Check Supabase project is active
- Ensure PostGIS extension is enabled
- Verify SSL settings in `server/config/db.js`

### Issue: 500 Internal Server Error
**Solution**:
- Check Render logs for error details
- Verify all environment variables are set
- Check database connection
- Look for missing API keys

### Issue: Messages Not Sending
**Solution**:
- Verify auth middleware is working
- Check `messageProtection` middleware fix applied
- Verify users are friends (required for messaging)
- Check socket connection status

---

## 📊 MONITORING

### Backend Logs
- Render Dashboard → Logs
- Server logs directory: `server/logs/`

### Frontend Errors
- Vercel Dashboard → Logs
- Browser console
- Sentry (if configured)

### Database
- Supabase Dashboard → Logs
- Query performance monitoring
- Connection pool usage

---

## 🚨 IMPORTANT NOTES

1. **Render Free Tier**: 
   - Spins down after 15 minutes of inactivity
   - First request after spin-up takes 30-60 seconds
   - Socket.IO may disconnect during spin-down

2. **Vercel Free Tier**:
   - 100GB bandwidth/month
   - Serverless functions have 10s timeout
   - Static site hosting only

3. **Supabase Free Tier**:
   - 500MB database
   - 2GB bandwidth/month
   - Pauses after 7 days inactivity

4. **Environment Variables**:
   - Never commit `.env` files
   - Use `.env.example` for documentation
   - Rotate API keys regularly

---

## ✅ DEPLOYMENT COMPLETE

After following all steps:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-api.onrender.com`
- Database: Supabase Cloud

All features should work:
- ✅ User authentication
- ✅ Real-time location tracking
- ✅ Territory capture
- ✅ Chat messaging (private & global)
- ✅ Social features
- ✅ Email notifications
- ✅ File uploads
- ✅ AI Coach
- ✅ Emergency SOS

---

**Last Updated**: April 15, 2026
**Version**: 1.0.0
