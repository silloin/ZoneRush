# 🚀 Quick Deployment Checklist

## Pre-Deployment (Do This First!)

### ✅ Code Fixes Applied
- [x] Fixed abuseMiddleware.js null check for req.user
- [x] Removed duplicate messageProtection middleware from server.js
- [x] Updated hardcoded URLs in AuthContext.jsx
- [x] Updated hardcoded URLs in socketConfig.js
- [x] Created .env.production.example templates

---

## Step 1: Database Setup (Supabase) ⏱️ 15 minutes

- [ ] Create Supabase account at https://supabase.com
- [ ] Create new project
- [ ] Wait for database to be ready (~2 minutes)
- [ ] Go to SQL Editor
- [ ] Run: `CREATE EXTENSION IF NOT EXISTS postgis;`
- [ ] Execute SQL files in order:
  - [ ] `server/sql/setup_database.sql`
  - [ ] `server/sql/postgis_setup.sql`
  - [ ] `server/sql/social_gamification.sql`
  - [ ] `server/sql/emergency_contacts.sql`
  - [ ] `server/sql/sos_alerts.sql`
  - [ ] `server/sql/clans.sql`
  - [ ] `server/sql/chat_system.sql`
- [ ] Copy DATABASE_URL from Settings → Database
  - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

---

## Step 2: Backend Deployment (Render) ⏱️ 20 minutes

### Create Repository
- [ ] Push code to GitHub/GitLab
- [ ] Ensure `server/.env` is in `.gitignore` (DO NOT COMMIT SECRETS!)

### Deploy to Render
- [ ] Go to https://render.com and sign in
- [ ] Click "New +" → "Web Service"
- [ ] Connect your repository
- [ ] Configure:
  - **Name**: `zonerush-api`
  - **Region**: Oregon (or closest to your users)
  - **Branch**: `main`
  - **Root Directory**: Leave blank
  - **Runtime**: `Node`
  - **Build Command**: `cd server && npm install`
  - **Start Command**: `cd server && npm start`
  - **Health Check Path**: `/api/health`

### Add Environment Variables
Copy these from `server/.env.production.example` and add in Render Dashboard → Environment:

- [ ] `NODE_ENV` = `production`
- [ ] `DATABASE_URL` = (from Supabase)
- [ ] `JWT_SECRET` = (generate secure random string)
- [ ] `FRONTEND_URL` = `https://your-app.vercel.app` (will update after Vercel deploy)
- [ ] `CORS_ORIGIN` = `https://your-app.vercel.app` (will update after Vercel deploy)
- [ ] `WEATHER_API_KEY` = (from OpenWeatherMap)
- [ ] `AQI_API_KEY` = (from WAQI)
- [ ] `GROQ_API_KEY` = (from Groq)
- [ ] `EMAIL_SERVICE` = `resend`
- [ ] `RESEND_API_KEY` = (from Resend)
- [ ] `RESEND_FROM_EMAIL` = (verified email)

### Generate JWT Secret
Run this command to generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for deployment to complete (~3-5 minutes)
- [ ] Note your Render URL: `https://zonerush-api.onrender.com`
- [ ] Test health check: Visit `https://your-api.onrender.com/api/health`
  - Should return: `{"status": "ok", ...}`

---

## Step 3: Frontend Deployment (Vercel) ⏱️ 10 minutes

### Prepare Environment Variables
- [ ] Copy `client/.env.production.example` to `client/.env.production`
- [ ] Fill in values:
  - `VITE_API_URL_PROD` = `https://your-api.onrender.com/api`
  - `VITE_MAPBOX_API_KEY` = `pk.your_mapbox_token`
  - `VITE_SOCKET_URL` = `https://your-api.onrender.com`

### Deploy to Vercel
- [ ] Go to https://vercel.com and sign in
- [ ] Click "Add New..." → "Project"
- [ ] Import from GitHub
- [ ] Configure:
  - **Framework Preset**: `Vite`
  - **Root Directory**: `client`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Install Command**: `npm install --legacy-peer-deps`

### Add Environment Variables
Click "Environment Variables" and add:
- [ ] `VITE_API_URL_PROD` = `https://your-api.onrender.com/api`
- [ ] `VITE_MAPBOX_API_KEY` = `pk.your_mapbox_token`
- [ ] `VITE_SOCKET_URL` = `https://your-api.onrender.com`

### Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Note your Vercel URL: `https://your-app.vercel.app`

---

## Step 4: Update Backend CORS ⏱️ 2 minutes

- [ ] Go to Render Dashboard → Your Service → Environment
- [ ] Update:
  - `FRONTEND_URL` = `https://your-app.vercel.app` (your actual Vercel URL)
  - `CORS_ORIGIN` = `https://your-app.vercel.app` (your actual Vercel URL)
- [ ] Click "Save Changes"
- [ ] Wait for redeploy (~3 minutes)

---

## Step 5: Testing ⏱️ 15 minutes

### Backend Tests
- [ ] Visit: `https://your-api.onrender.com/api/health`
  - ✅ Should return JSON with status "ok"
- [ ] Visit: `https://your-api.onrender.com/api`
  - ✅ Should return "API is running 🚀"

### Frontend Tests
- [ ] Visit: `https://your-app.vercel.app`
  - ✅ App should load without errors
  - ✅ Check browser console (no errors)

### Authentication Tests
- [ ] Register a new user
  - ✅ User created successfully
  - ✅ Email verification sent
- [ ] Verify email (check inbox)
  - ✅ Email verified
- [ ] Login with credentials
  - ✅ Login successful
  - ✅ Token stored in localStorage
  - ✅ User redirected to dashboard

### Feature Tests
- [ ] Location tracking works
  - ✅ Map displays
  - ✅ Location updates in real-time
- [ ] Territory capture
  - ✅ Can capture territories
  - ✅ Saved to database
- [ ] Chat messaging
  - ✅ Can send messages
  - ✅ Real-time delivery
  - ✅ Messages persist after refresh
- [ ] Social features
  - ✅ Can create posts
  - ✅ Can like/comment
- [ ] Profile update
  - ✅ Can update profile
  - ✅ Can upload photo

---

## Step 6: Production Verification ⏱️ 10 minutes

### Security Checks
- [ ] HTTPS is enforced (check URL starts with https://)
- [ ] CORS is working (no console errors)
- [ ] API keys are not visible in browser DevTools
- [ ] JWT tokens are being used properly

### Performance Checks
- [ ] Page loads in < 3 seconds
- [ ] API responses in < 1 second (after cold start)
- [ ] Socket.IO connects successfully
- [ ] No memory leaks (check browser DevTools)

### Database Checks
- [ ] Log into Supabase Dashboard
- [ ] Check tables exist
- [ ] Check data is being saved
- [ ] Check connection pool usage

---

## Common Issues & Solutions

### ❌ CORS Error in Browser Console
**Solution**: 
- Verify `FRONTEND_URL` and `CORS_ORIGIN` in Render match your Vercel URL exactly
- Include `https://` in the URL
- Redeploy backend after changing

### ❌ Socket.IO Connection Failed
**Solution**:
- Check `VITE_SOCKET_URL` is set in Vercel
- Verify it matches your Render URL (without `/api`)
- Check browser console for specific error

### ❌ Database Connection Error
**Solution**:
- Verify `DATABASE_URL` format in Render
- Check Supabase project is active
- Ensure PostGIS extension is enabled
- Check SSL settings (should be enabled)

### ❌ Messages Not Sending (500 Error)
**Solution**:
- Verify abuseMiddleware.js fix is applied
- Check users are friends (required for messaging)
- Verify auth middleware is working
- Check Render logs for error details

### ❌ Email Not Sending
**Solution**:
- Verify email service API key is correct
- Check `EMAIL_SERVICE` is set properly
- Verify "from" email is verified with provider
- Check Render logs for email errors

---

## 🎉 Deployment Complete!

### Your URLs:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-api.onrender.com`
- **Database**: Supabase Cloud
- **API Docs**: `https://your-api.onrender.com/api`

### Next Steps:
1. [ ] Set up monitoring (Render logs, Vercel analytics)
2. [ ] Configure custom domain (optional)
3. [ ] Set up CI/CD pipeline
4. [ ] Enable error tracking (Sentry, etc.)
5. [ ] Set up database backups
6. [ ] Configure email templates
7. [ ] Test on mobile devices
8. [ ] Share with users!

---

## Maintenance

### Weekly:
- [ ] Check Render logs for errors
- [ ] Check Supabase storage usage
- [ ] Review Vercel analytics

### Monthly:
- [ ] Rotate API keys
- [ ] Update dependencies
- [ ] Review security logs
- [ ] Check database performance

### Quarterly:
- [ ] Full security audit
- [ ] Performance optimization
- [ ] Database cleanup
- [ ] Backup verification

---

**Need Help?**
- Check `DEPLOYMENT_COMPLETE_GUIDE.md` for detailed instructions
- Review Render logs: Dashboard → Service → Logs
- Review Vercel logs: Dashboard → Deployments → Click deployment → Logs
- Check Supabase: Dashboard → Logs

---

**Last Updated**: April 15, 2026
