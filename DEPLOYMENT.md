# 🚀 Deployment Guide - ZoneRush

This guide will help you deploy ZoneRush to work both on **localhost** and **production** (Render, Railway, etc.)

---

## 📋 Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Production Deployment (Render)](#production-deployment-render)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Common Issues & Solutions](#common-issues--solutions)

---

## 🖥️ Local Development Setup

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ with PostGIS extension
- npm or yarn

### Step-by-Step Setup

#### 1. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

#### 2. Set Up Database

```bash
# Create database
createdb zonerush

# Enable PostGIS
psql -d zonerush -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

#### 3. Configure Environment Variables

**Server (.env):**
```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
# Database
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_DATABASE=zonerush
DB_PORT=5432

# JWT
JWT_SECRET=your_secret_key_here

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# APIs (get your own keys)
WEATHER_API_KEY=your_key
AQI_API_KEY=your_key
GROQ_API_KEY=your_key
MAPBOX_API_KEY=your_key
```

**Client (.env):**
```bash
cd ../client
cp .env.example .env
```

Edit `client/.env`:
```env
VITE_MAPBOX_API_KEY=your_mapbox_key_here
```

#### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

#### 5. Open in Browser

Navigate to: `http://localhost:5173`

✅ **Local setup complete!**

---

## 🌐 Production Deployment (Render)

### Option 1: Deploy via render.yaml (Recommended)

#### 1. Push to GitHub

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Connect to Render

1. Go to [render.com](https://render.com)
2. Sign up/Login
3. Click **"New +"** → **"Blueprint"**
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml`
6. Click **"Apply"**

#### 3. Set Environment Variables

In Render dashboard, add these environment variables:

```env
# API Keys (get your own)
WEATHER_API_KEY=your_key
AQI_API_KEY=your_key
GROQ_API_KEY=your_key
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password
```

#### 4. Wait for Deployment

- Render will automatically build and deploy
- Database will be created with PostGIS
- You'll get a URL like: `https://zonerush.onrender.com`

✅ **Production deployment complete!**

---

### Option 2: Manual Deployment

#### 1. Create Web Service

1. Go to Render Dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name:** zonerush
   - **Environment:** Node
   - **Build Command:** `npm install --prefix server --legacy-peer-deps && npm run build --prefix client`
   - **Start Command:** `cd server && npm start`

#### 2. Create PostgreSQL Database

1. Click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name:** zonerush-db
   - **Region:** Same as web service
   - **Plan:** Free

#### 3. Add Environment Variables

In the web service settings, add:

```env
NODE_ENV=production
DATABASE_URL=<from your PostgreSQL service>
JWT_SECRET=<generate a random string>
FRONTEND_URL=<your render service URL>
WEATHER_API_KEY=your_key
AQI_API_KEY=your_key
GROQ_API_KEY=your_key
```

#### 4. Deploy

Click **"Deploy"** and wait for completion.

---

## 🔑 Environment Variables

### Server (.env)

| Variable | Description | Local | Production |
|----------|-------------|-------|------------|
| `DB_USER` | PostgreSQL user | postgres | - |
| `DB_PASSWORD` | PostgreSQL password | your_password | - |
| `DB_HOST` | Database host | localhost | - |
| `DB_DATABASE` | Database name | zonerush | - |
| `DB_PORT` | Database port | 5432 | - |
| `DATABASE_URL` | Full DB connection string | - | from Render/Railway |
| `JWT_SECRET` | JWT signing key | your_secret | generate random |
| `PORT` | Server port | 5000 | auto-assigned |
| `NODE_ENV` | Environment | development | production |
| `FRONTEND_URL` | Frontend URL | http://localhost:5173 | your render URL |
| `WEATHER_API_KEY` | OpenWeatherMap API | your_key | your_key |
| `AQI_API_KEY` | WAQI API | your_key | your_key |
| `GROQ_API_KEY` | Groq AI API | your_key | your_key |
| `EMAIL_SERVICE` | Email provider | gmail | gmail |
| `EMAIL_USER` | Email address | your_email | your_email |
| `EMAIL_APP_PASSWORD` | Email password | your_app_pw | your_app_pw |
| `MAPBOX_API_KEY` | Mapbox API | your_key | your_key |

### Client (.env)

| Variable | Description | Local | Production |
|----------|-------------|-------|------------|
| `VITE_MAPBOX_API_KEY` | Mapbox public key | your_key | your_key |
| `VITE_API_URL` | Backend API URL | (leave empty) | (leave empty) |
| `VITE_SOCKET_URL` | Socket.IO URL | (leave empty) | (leave empty) |

⚠️ **Important:** Leave `VITE_API_URL` and `VITE_SOCKET_URL` empty! The app automatically detects the correct URLs.

---

## 🗄️ Database Setup

### Local Database

```bash
# Create database
createdb zonerush

# Enable PostGIS
psql -d zonerush -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Tables are created automatically on first server start
```

### Production Database (Render)

Render automatically creates the database and runs migrations. No manual setup needed!

### Production Database (Railway)

1. Create PostgreSQL service
2. Add PostGIS extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Tables are created automatically on first server start

---

## 🔄 How It Works

### Development Mode

```
Browser (localhost:5173)
    ↓
Vite Dev Server (proxy /api → localhost:5000)
    ↓
Express Server (localhost:5000)
    ↓
PostgreSQL (localhost:5432)
```

### Production Mode

```
Browser (zonerush.onrender.com)
    ↓
Express Server (same domain)
    ↓
PostgreSQL (Render managed)
```

### Smart URL Detection

The app automatically detects the environment:

**API URLs:**
- Local: `/api` (proxied to localhost:5000 by Vite)
- Production: `/api` (same domain)

**Socket URLs:**
- Local: `http://localhost:5000`
- Production: `window.location.origin` (same domain)

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Error in Production

**Error:** `Access-Control-Allow-Origin` missing

**Solution:**
- Make sure `FRONTEND_URL` is set correctly in production
- Check that `NODE_ENV=production`

### Issue 2: Database Connection Failed

**Error:** `ECONNREFUSED` or `password authentication failed`

**Solution (Local):**
```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials
psql -U postgres -d zonerush
```

**Solution (Production):**
- Ensure `DATABASE_URL` is set correctly
- Check database service is running

### Issue 3: Socket.IO Not Connecting

**Error:** WebSocket connection failed

**Solution:**
- Don't set `VITE_SOCKET_URL` - let it auto-detect
- Check server logs for Socket.IO errors
- Ensure CORS is configured properly

### Issue 4: Build Fails on Render

**Error:** Module not found or build errors

**Solution:**
```bash
# Test build locally
cd client
npm run build

# Check for errors
cd server
npm start
```

### Issue 5: Environment Variables Not Working

**Solution:**
- Restart server after changing `.env`
- In production, redeploy after changing env vars
- Check variable names match exactly

---

## 📊 Deployment Checklist

### Before Deploying

- [ ] All `.env` files created (not committed!)
- [ ] API keys obtained and configured
- [ ] Database created with PostGIS
- [ ] `.gitignore` includes `.env` files
- [ ] Code pushed to GitHub
- [ ] No sensitive data in code (API keys, passwords)

### After Deploying

- [ ] Health check passes (`/api` endpoint)
- [ ] Frontend loads correctly
- [ ] User registration works
- [ ] Map loads with Mapbox tiles
- [ ] Socket.IO connection successful
- [ ] Database queries working
- [ ] Environment variables set

---

## 🎯 Quick Commands

### Local Development

```bash
# Start backend
cd server && npm run dev

# Start frontend
cd client && npm run dev

# Build for production
cd client && npm run build

# Test database connection
cd server && node test-database-connection.js
```

### Production

```bash
# Deploy to Render
git push origin main

# View logs (Render dashboard)
# Redeploy (Render dashboard)
```

---

## 📞 Support

If you encounter issues:

1. Check server logs
2. Verify environment variables
3. Test database connection
4. Check browser console for errors
5. Review CORS configuration

---

**Happy deploying! 🚀**
