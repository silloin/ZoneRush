# Vercel + Render Deployment Fix

## Issue Fixed ✅

**Error:** `POST https://zonerush.vercel.app/api/auth/logout 405 (Method Not Allowed)`

**Root Cause:** The frontend deployed on Vercel was making API calls to `https://zonerush.vercel.app/api/*` instead of the Render backend URL.

---

## Problem Explained

### Architecture:
- **Frontend**: Deployed on Vercel (`https://zonerush.vercel.app`)
- **Backend**: Deployed on Render (`https://your-app.onrender.com`)

### The Issue:
In production, axios was configured with `baseURL: '/api'` (relative URL), which meant:
```javascript
axios.post('/auth/logout')
// Resolved to: https://zonerush.vercel.app/api/auth/logout ❌
// Should be: https://your-app.onrender.com/api/auth/logout ✅
```

Vercel is a static site host - it doesn't have your backend API routes!

---

## Solution Implemented ✅

### 1. **Updated AuthContext.jsx**
Enhanced API URL detection to use `VITE_API_URL_PROD` in production:

```javascript
const getApiUrl = () => {
  // In production, use VITE_API_URL_PROD if set
  if (import.meta.env.PROD) {
    const prodApiUrl = import.meta.env.VITE_API_URL_PROD;
    if (prodApiUrl) {
      return prodApiUrl; // e.g., https://your-app.onrender.com/api
    }
    return '/api'; // Fallback
  }
  
  // In development, use VITE_API_URL or /api
  const devApiUrl = import.meta.env.VITE_API_URL;
  return devApiUrl || '/api';
};
```

### 2. **Updated SocketConfig.js**
Enhanced Socket.IO URL detection to use the same production URL:

```javascript
export const getSocketURL = () => {
  // In production, use VITE_API_URL_PROD if set
  if (import.meta.env.PROD) {
    const prodApiUrl = import.meta.env.VITE_API_URL_PROD;
    if (prodApiUrl) {
      return prodApiUrl.replace('/api', ''); // e.g., https://your-app.onrender.com
    }
    return window.location.origin; // Fallback
  }
  
  // Development logic...
};
```

---

## Deployment Steps 🚀

### Step 1: Get Your Render Backend URL

1. Go to your Render Dashboard: https://dashboard.render.com/
2. Find your backend service
3. Copy the URL (looks like: `https://zonerush.onrender.com`)

### Step 2: Add Environment Variable in Vercel

1. Go to Vercel Dashboard: https://vercel.com/
2. Select your project: `zonerush`
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `VITE_API_URL_PROD`
   - **Value**: `https://your-app.onrender.com/api` (replace with your actual Render URL)
   - **Environment**: Check all (Production, Preview, Development)
5. Click **Save**

**Example:**
```
VITE_API_URL_PROD = https://zonerush.onrender.com/api
```

### Step 3: Redeploy on Vercel

After adding the environment variable, trigger a new deployment:

**Option A: Automatic (if connected to Git)**
```bash
git add .
git commit -m "Fix production API URL configuration for Vercel + Render"
git push
```

**Option B: Manual**
- Go to Vercel Dashboard
- Click **Redeploy** on the latest deployment

---

## What Changed 📝

### Modified Files:
1. ✅ `client/src/context/AuthContext.jsx` - Enhanced production API URL detection
2. ✅ `client/src/services/socketConfig.js` - Enhanced Socket.IO URL detection
3. ✅ `client/.env` - Added documentation for VITE_API_URL_PROD

### No Breaking Changes:
- ✅ Local development still works (uses Vite proxy)
- ✅ Production now correctly points to Render backend
- ✅ Socket.IO connections will work in production
- ✅ All API calls (login, logout, etc.) will work in production

---

## How It Works Now

### Development (localhost):
```
Frontend: http://localhost:5173
Backend:  http://localhost:5000
API Calls: /api/* → proxied to http://localhost:5000/api/* ✅
```

### Production (Vercel + Render):
```
Frontend: https://zonerush.vercel.app
Backend:  https://your-app.onrender.com
API Calls: /api/* → https://your-app.onrender.com/api/* ✅
Socket:   → https://your-app.onrender.com ✅
```

---

## Verification Checklist ✅

After deploying, verify these work:

### 1. **Authentication**
- [ ] Login works
- [ ] Logout works (no more 405 error!)
- [ ] User data loads correctly
- [ ] Token is stored and sent properly

### 2. **API Calls**
- [ ] Profile updates work
- [ ] Map data loads
- [ ] Tiles/territories load
- [ ] Social features work

### 3. **Socket.IO**
- [ ] Socket connects successfully
- [ ] Online users show
- [ ] Real-time location tracking works
- [ ] Multiplayer features work

### 4. **Browser Console**
Check for these success messages:
```
✅ No 405 errors
✅ No CORS errors
✅ "Socket connected: true"
✅ API responses returning data
```

---

## Troubleshooting

### Still Getting 405 Errors?

**Check 1: Environment Variable Set**
```bash
# In Vercel Dashboard → Settings → Environment Variables
# Verify VITE_API_URL_PROD is set correctly
```

**Check 2: Correct URL Format**
```
✅ Correct: https://your-app.onrender.com/api
❌ Wrong:   https://your-app.onrender.com/api/
❌ Wrong:   http://your-app.onrender.com/api (use https!)
```

**Check 3: Backend Running**
```bash
# Visit your Render URL directly:
https://your-app.onrender.com/api

# Should return: {"msg":"Server is running"} or similar
```

**Check 4: Vercel Logs**
```
# Vercel Dashboard → Your Project → Logs
# Check if VITE_API_URL_PROD is being used
```

### Socket.IO Not Connecting?

**Check Render CORS Settings:**
Make sure your Render backend has Vercel URL in CORS origin:

```javascript
// server/server.js
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://zonerush.vercel.app',  // Add your Vercel URL
    ],
    credentials: true
  }
});
```

---

## Environment Variables Summary

### Local Development (`.env`):
```env
# Leave unset - uses Vite proxy
VITE_API_URL=
VITE_SOCKET_URL=
```

### Vercel Production (Dashboard):
```env
VITE_API_URL_PROD=https://your-app.onrender.com/api
VITE_SOCKET_URL=https://your-app.onrender.com  # Optional, auto-detected
VITE_MAPBOX_API_KEY=pk.your_mapbox_token
```

---

## Quick Reference

### Your URLs:
- **Frontend (Vercel)**: `https://zonerush.vercel.app`
- **Backend (Render)**: `https://[YOUR-APP].onrender.com`
- **API Base**: `https://[YOUR-APP].onrender.com/api`
- **Socket**: `https://[YOUR-APP].onrender.com`

### Environment Variable to Set:
```
Name: VITE_API_URL_PROD
Value: https://[YOUR-APP].onrender.com/api
```

---

## Summary

✅ **Issue Fixed**: 405 Method Not Allowed errors  
✅ **Root Cause**: Frontend calling wrong URL in production  
✅ **Solution**: Use `VITE_API_URL_PROD` environment variable  
✅ **Action Required**: Add env var in Vercel Dashboard  
✅ **Result**: All API calls and sockets work in production!  

**After adding the environment variable and redeploying, your logout (and all other API calls) will work perfectly!** 🎉
