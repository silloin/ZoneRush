# ⚡ Quick Setup Guide - ZoneRush

Get ZoneRush running in **5 minutes**!

---

## 🎯 Prerequisites Checklist

Before starting, make sure you have:

- [ ] Node.js 18+ installed ([Download](https://nodejs.org/))
- [ ] PostgreSQL 14+ installed ([Download](https://www.postgresql.org/download/))
- [ ] PostGIS extension available
- [ ] Git installed
- [ ] Mapbox API key ([Get Free Key](https://www.mapbox.com/))

---

## 🚀 Setup in 3 Steps

### Step 1: Database Setup (2 minutes)

```bash
# Open PowerShell or Command Prompt

# Create database
createdb zonerush

# Enable PostGIS extension
psql -d zonerush -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Verify it worked
psql -d zonerush -c "SELECT PostGIS_Version();"
```

**Expected output:** `3.x.x`

---

### Step 2: Configure Environment (2 minutes)

#### Server Configuration

```bash
cd server
copy .env.example .env
notepad .env
```

**Edit these values in `.env`:**

```env
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_DATABASE=zonerush

WEATHER_API_KEY=get_from_openweathermap.org
AQI_API_KEY=get_from_aqicn.org
GROQ_API_KEY=get_from_groq.com
MAPBOX_API_KEY=get_from_mapbox.com

EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password
```

#### Client Configuration

```bash
cd ..\client
copy .env.example .env
notepad .env
```

**Edit this value in `.env`:**

```env
VITE_MAPBOX_API_KEY=your_mapbox_public_key
```

---

### Step 3: Start the App (1 minute)

#### Option A: Using Start Script (Easiest)

```bash
# From project root
start-dev.bat
```

✅ Done! Browser opens automatically at `http://localhost:5173`

#### Option B: Manual Start

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

**Open browser:** `http://localhost:5173`

---

## ✅ Verify Everything Works

### 1. Check Backend

Open: `http://localhost:5000/api`

**Expected:** `API is running 🚀`

### 2. Check Frontend

Open: `http://localhost:5173`

**Expected:** ZoneRush login page

### 3. Check Database

```bash
cd server
node test-database-connection.js
```

**Expected:** All tests pass ✅

### 4. Test Registration

1. Go to `http://localhost:5173/register`
2. Create an account
3. Login successfully

---

## 🎮 Start Playing!

1. **Login** to your account
2. Go to **Map** page
3. Click **Start Run**
4. Run around to capture tiles! 🏃‍♂️

---

## 🐛 Troubleshooting

### Error: "Database connection failed"

```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials
psql -U postgres -d zonerush -c "SELECT 1;"
```

### Error: "Port 5000 already in use"

```bash
# Stop existing server
stop-server.bat

# Or manually kill the process
netstat -ano | findstr :5000
taskkill /F /PID <process_id>
```

### Error: "Map not loading"

- Check `VITE_MAPBOX_API_KEY` is set in `client/.env`
- Check Mapbox account is active
- Open browser console for errors (F12)

### Error: "Module not found"

```bash
# Reinstall dependencies
cd server
npm install

cd ..\client
npm install
```

---

## 📚 Next Steps

- 📖 Read [README.md](README.md) for full documentation
- 🚀 See [DEPLOYMENT.md](DEPLOYMENT.md) to deploy online
- 💬 Join the community
- ⭐ Star the repo on GitHub

---

## 🆘 Need Help?

1. Check [DEPLOYMENT.md](DEPLOYMENT.md) for common issues
2. Review server logs in terminal
3. Check browser console (F12)
4. Open a GitHub issue

---

**Enjoy ZoneRush! 🎉**
