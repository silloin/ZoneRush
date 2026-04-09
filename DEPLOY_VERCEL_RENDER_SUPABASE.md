# 🚀 Deploy ZoneRush: Vercel + Render + Supabase (All Free!)

This guide shows you how to deploy ZoneRush using **free tier** services:

| Service | Purpose | Free Tier | Notes |
|---------|---------|-----------|-------|
| **Vercel** | Frontend (React) | ✅ Yes | Fast CDN, auto HTTPS |
| **Render** | Backend (Node.js) | ✅ Yes | Sleeps after 15 min |
| **Supabase** | Database (PostgreSQL + PostGIS) | ✅ Yes | 500MB storage |

---

## 📋 Overview Architecture

```
User Browser
    ↓
Vercel (https://zonerush.vercel.app)
    ↓ (API calls to)
Render (https://zonerush.onrender.com)
    ↓ (connects to)
Supabase (PostgreSQL + PostGIS)
```

---

## 🗄️ Step 1: Setup Supabase Database (10 minutes)

### 1.1 Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub

### 1.2 Create New Project

1. Click **"New Project"**
2. Fill in:
   - **Project name:** `zonerush`
   - **Database Password:** (create a strong password - save it!)
   - **Region:** Choose closest to you (e.g., `US East`)
3. Click **"Create new project"**
4. Wait 2-3 minutes for setup

### 1.3 Enable PostGIS Extension

1. Go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Run this SQL:

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify installation
SELECT PostGIS_Version();
```

4. Click **"Run"** (should return `3.x.x`)

### 1.4 Get Database Connection String

1. Go to **Settings** (gear icon) → **Database**
2. Find **"Connection string"** section
3. Select **URI** tab
4. Copy the connection string (looks like):

```
postgresql://postgres.[project-id]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

5. **Save this for later!** 🔑

### 1.5 Get Database Credentials (Alternative)

If you need individual credentials:

- **Host:** `aws-0-[region].pooler.supabase.com`
- **Port:** `6543` (for connection pooling) or `5432` (direct)
- **Database:** `postgres`
- **User:** `postgres.[your-project-id]`
- **Password:** (the one you created)

---

## 🔧 Step 2: Deploy Backend to Render (15 minutes)

### 2.1 Prepare Your Code

Your code is already ready! Just make sure it's on GitHub:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2.2 Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get Started"**
3. Sign up with **GitHub**

### 2.3 Create Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure the service:

**Settings:**
- **Name:** `zonerush-api`
- **Region:** Same as Supabase (e.g., Oregon)
- **Branch:** `main`
- **Root Directory:** Leave blank
- **Environment:** `Node`
- **Build Command:**
  ```bash
  npm install --prefix server --legacy-peer-deps && npm install --prefix client --legacy-peer-deps && npm run build --prefix client
  ```
- **Start Command:**
  ```bash
  cd server && npm start
  ```

### 2.4 Add Environment Variables

Scroll to **"Environment"** section and add these variables:

#### Database Configuration (from Supabase)

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `postgresql://postgres.[project-id]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres` |

#### Server Configuration

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | (click "Generate" for random string) |
| `PORT` | `10000` (Render default) |

#### API Keys (Get Your Own)

| Key | Where to Get |
|-----|--------------|
| `WEATHER_API_KEY` | [OpenWeatherMap](https://openweathermap.org/api) (free) |
| `AQI_API_KEY` | [WAQI](https://aqicn.org/api/) (free) |
| `GROQ_API_KEY` | [Groq Console](https://console.groq.com/keys) (free) |
| `MAPBOX_API_KEY` | [Mapbox](https://www.mapbox.com/) (free) |

#### Email Configuration (Optional)

| Key | Value |
|-----|-------|
| `EMAIL_SERVICE` | `gmail` |
| `EMAIL_USER` | `your-email@gmail.com` |
| `EMAIL_APP_PASSWORD` | (Gmail app password) |

**How to get Gmail App Password:**
1. Go to [Google Account](https://myaccount.google.com/)
2. Security → 2-Step Verification (must be enabled)
3. App Passwords → Generate new password
4. Select "Mail" and your device
5. Copy the 16-character password

#### Frontend URL (Update after Vercel deployment)

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://zonerush.vercel.app` (update later) |

### 2.5 Deploy!

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. You'll get a URL like: `https://zonerush-api.onrender.com`

### 2.6 Test Backend

Open: `https://zonerush-api.onrender.com/api`

**Expected:** `API is running 🚀`

✅ **Backend deployed!**

---

## 🎨 Step 3: Deploy Frontend to Vercel (10 minutes)

### 3.1 Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with **GitHub**

### 3.2 Import Project

1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. Configure the project:

**Settings:**
- **Framework Preset:** `Vite`
- **Name:** `zonerush`
- **Root Directory:** `client` (IMPORTANT!)

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `VITE_MAPBOX_API_KEY` | Your Mapbox public key |

⚠️ **IMPORTANT:** Do NOT set `VITE_API_URL` or `VITE_SOCKET_URL` - they will be configured differently!

### 3.4 Configure Build Settings

Expand **"Build and Output Settings"**:

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install --legacy-peer-deps`

### 3.5 Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. You'll get a URL like: `https://zonerush.vercel.app`

✅ **Frontend deployed!**

---

## 🔗 Step 4: Connect Frontend to Backend

### 4.1 Update Vercel Environment Variables

Now that you have the Render backend URL, update Vercel:

1. Go to Vercel Dashboard → Your Project → **Settings**
2. Go to **Environment Variables**
3. Add these variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://zonerush-api.onrender.com/api` |
| `VITE_SOCKET_URL` | `https://zonerush-api.onrender.com` |

4. Click **"Save"**

### 4.2 Update Render FRONTEND_URL

1. Go to Render Dashboard → Your Web Service → **Environment**
2. Update `FRONTEND_URL`:

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://zonerush.vercel.app` |

3. Click **"Save Changes"**
4. Render will redeploy automatically

### 4.3 Redeploy Vercel

1. Go to Vercel Dashboard → Your Project
2. Go to **Deployments**
3. Click the **"..."** menu on latest deployment
4. Click **"Redeploy"**

---

## ✅ Step 5: Verify Everything Works

### 5.1 Test Frontend

1. Open: `https://zonerush.vercel.app`
2. You should see the login page
3. Open browser console (F12) - check for errors

### 5.2 Test Registration

1. Click **"Register"**
2. Create an account
3. Check for success message

### 5.3 Test Login

1. Login with your new account
2. Should redirect to dashboard
3. Check browser console - no CORS errors

### 5.4 Test Map

1. Go to **Map** page
2. Map should load with Mapbox tiles
3. No console errors

### 5.5 Test Socket Connection

1. Open browser console
2. Look for: `🔌 Socket connected: [socket-id]`
3. Should see connection success message

---

## 🎉 You're Live!

**Your App URLs:**

- **Frontend:** `https://zonerush.vercel.app`
- **Backend API:** `https://zonerush-api.onrender.com/api`
- **Database:** Supabase (managed)

---

## 🔄 Important: Render Sleep Issue

### The Problem

Render's free tier **sleeps after 15 minutes** of inactivity. First request after sleep takes 30-50 seconds.

### Solutions

#### Option 1: Keep-Alive Service (Recommended)

Use a free uptime monitor to ping your backend every 14 minutes:

1. **UptimeRobot** (Free):
   - Go to [uptimerobot.com](https://uptimerobot.com)
   - Create account
   - Add new monitor: `https://zonerush-api.onrender.com/api`
   - Set interval: **5 minutes**
   - Your backend will never sleep!

2. **Cron-Job.org** (Free):
   - Go to [cron-job.org](https://cron-job.org)
   - Create cron job to ping your API every 10 minutes

#### Option 2: Upgrade Render (Paid)

- **Render Starter:** $7/month
- No sleep, faster performance

---

## 🐛 Troubleshooting

### Issue 1: CORS Error

**Error:** `Access-Control-Allow-Origin` missing

**Solution:**
1. Check `FRONTEND_URL` in Render matches your Vercel URL exactly
2. Redeploy Render service
3. Clear browser cache

### Issue 2: Database Connection Failed

**Error:** `password authentication failed`

**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check Supabase database is active
3. Ensure PostGIS extension is enabled:
   ```sql
   SELECT PostGIS_Version();
   ```

### Issue 3: Socket.IO Not Connecting

**Error:** WebSocket connection failed

**Solution:**
1. Verify `VITE_SOCKET_URL` is set in Vercel
2. Check Render CORS allows Vercel domain
3. Open browser console for detailed error

### Issue 4: Map Not Loading

**Error:** Mapbox tiles not showing

**Solution:**
1. Check `VITE_MAPBOX_API_KEY` in Vercel
2. Verify Mapbox account is active
3. Check browser console for 401 errors

### Issue 5: Registration Fails

**Error:** 500 Internal Server Error

**Solution:**
1. Check Render logs for database errors
2. Verify database tables exist
3. Tables should auto-create on first start

---

## 📊 Monitoring Your Deployment

### Vercel Dashboard

- **Analytics:** View traffic
- **Deployments:** View deployment history
- **Logs:** Check build logs

### Render Dashboard

- **Logs:** View server logs in real-time
- **Metrics:** Monitor CPU/Memory usage
- **Deploys:** View deployment history

### Supabase Dashboard

- **Table Editor:** View database tables
- **SQL Editor:** Run queries
- **Logs:** Check database logs

---

## 🎯 Next Steps

### 1. Custom Domain (Optional)

**Vercel:**
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records

**Render:**
1. Go to Settings → Custom Domain
2. Add your domain
3. Update `FRONTEND_URL` in environment variables

### 2. Environment-Specific Configuration

Your app now works in 3 environments:

| Environment | URL | Config |
|-------------|-----|--------|
| **Local** | `http://localhost:5173` | `client/.env` |
| **Production Frontend** | `https://zonerush.vercel.app` | Vercel env vars |
| **Production Backend** | `https://zonerush-api.onrender.com` | Render env vars |

### 3. Update README

Update your README with live URLs:

```markdown
## 🌐 Live Demo

- **Frontend:** https://zonerush.vercel.app
- **Backend API:** https://zonerush-api.onrender.com/api
```

---

## 💰 Cost Breakdown

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| **Vercel** | Hobby | **$0** | 100GB bandwidth |
| **Render** | Free | **$0** | 750 hrs/month, sleeps |
| **Supabase** | Free | **$0** | 500MB database |
| **Mapbox** | Free | **$0** | 50,000 loads/month |
| **UptimeRobot** | Free | **$0** | 50 monitors |
| **Total** | | **$0/month** 🎉 | |

---

## 📞 Support

If you encounter issues:

1. **Check Logs:**
   - Vercel: Dashboard → Deployments → View logs
   - Render: Dashboard → Logs tab
   - Supabase: Dashboard → Logs

2. **Common Fixes:**
   - Redeploy services
   - Clear browser cache
   - Verify environment variables
   - Check CORS configuration

3. **Get Help:**
   - Open GitHub issue
   - Check [DEPLOYMENT.md](DEPLOYMENT.md)
   - Review error logs

---

## ✅ Deployment Checklist

Before going live:

- [ ] Supabase database created with PostGIS
- [ ] Render backend deployed and responding
- [ ] Vercel frontend deployed and loading
- [ ] Environment variables set correctly
- [ ] CORS configured (FRONTEND_URL matches Vercel URL)
- [ ] Socket.IO connection working
- [ ] User registration/login working
- [ ] Map loads without errors
- [ ] Database queries working
- [ ] Keep-alive service setup (UptimeRobot)

---

**Congratulations! Your ZoneRush app is now live and accessible worldwide! 🌍🎉**
