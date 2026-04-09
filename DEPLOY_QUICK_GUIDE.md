# ⚡ Quick Deploy: Vercel + Render + Supabase

Deploy ZoneRush in **30 minutes** using free services!

---

## 🎯 Architecture

```
┌─────────────────┐
│   Vercel        │  Frontend (React)
│   (Free)        │  https://zonerush.vercel.app
└────────┬────────┘
         │
         │ API Calls
         ↓
┌─────────────────┐
│   Render        │  Backend (Node.js)
│   (Free)        │  https://zonerush-api.onrender.com
└────────┬────────┘
         │
         │ Database
         ↓
┌─────────────────┐
│   Supabase      │  PostgreSQL + PostGIS
│   (Free)        │  Managed Database
└─────────────────┘
```

---

## 📋 Step-by-Step (30 Minutes)

### 1️⃣ Supabase Database (10 min)

```
1. supabase.com → Sign up with GitHub
2. New Project → Name: "zonerush"
3. Set database password → Save it!
4. SQL Editor → Run:
   
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT PostGIS_Version();

5. Settings → Database → Copy Connection String
   postgresql://postgres.[id]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
```

**✅ Save the connection string!**

---

### 2️⃣ Render Backend (15 min)

```
1. render.com → Sign up with GitHub
2. New + → Web Service → Connect GitHub repo
3. Configure:
   - Name: zonerush-api
   - Build: npm install --prefix server --legacy-peer-deps && npm install --prefix client --legacy-peer-deps && npm run build --prefix client
   - Start: cd server && npm start

4. Environment Variables:
   DATABASE_URL = [Supabase connection string]
   NODE_ENV = production
   JWT_SECRET = [Click Generate]
   FRONTEND_URL = https://zonerush.vercel.app (update later)
   WEATHER_API_KEY = [Get from openweathermap.org]
   AQI_API_KEY = [Get from aqicn.org]
   GROQ_API_KEY = [Get from groq.com]
   MAPBOX_API_KEY = [Get from mapbox.com]

5. Create Web Service → Wait 5-10 min
6. Get URL: https://zonerush-api.onrender.com
```

**Test:** Open `https://zonerush-api.onrender.com/api` → Should see "API is running 🚀"

---

### 3️⃣ Vercel Frontend (10 min)

```
1. vercel.com → Sign up with GitHub
2. Add New → Project → Import repo
3. Configure:
   - Root Directory: client
   - Framework: Vite
   - Build: npm run build

4. Environment Variables:
   VITE_MAPBOX_API_KEY = [Your Mapbox key]
   VITE_API_URL = https://zonerush-api.onrender.com/api
   VITE_SOCKET_URL = https://zonerush-api.onrender.com

5. Deploy → Wait 2-3 min
6. Get URL: https://zonerush.vercel.app
```

---

### 4️⃣ Connect Everything (5 min)

```
1. Update Render:
   - Set FRONTEND_URL = https://zonerush.vercel.app
   - Redeploy

2. Update Vercel:
   - Redeploy latest version

3. Test:
   - Open https://zonerush.vercel.app
   - Register account
   - Login
   - Check map loads
```

---

### 5️⃣ Prevent Render Sleep (Optional)

```
1. uptimerobot.com → Sign up
2. Add Monitor: https://zonerush-api.onrender.com/api
3. Interval: 5 minutes
4. Backend never sleeps! ✅
```

---

## 🎉 Done! Your Live App

- **Frontend:** https://zonerush.vercel.app
- **Backend:** https://zonerush-api.onrender.com/api
- **Database:** Supabase (managed)
- **Cost:** $0/month 🎊

---

## 🔑 Environment Variables Summary

### Render (Backend)

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
JWT_SECRET=[generated]
FRONTEND_URL=https://zonerush.vercel.app
WEATHER_API_KEY=[your key]
AQI_API_KEY=[your key]
GROQ_API_KEY=[your key]
MAPBOX_API_KEY=[your key]
```

### Vercel (Frontend)

```env
VITE_MAPBOX_API_KEY=[your key]
VITE_API_URL=https://zonerush-api.onrender.com/api
VITE_SOCKET_URL=https://zonerush-api.onrender.com
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS error | Check FRONTEND_URL matches Vercel URL |
| Database error | Verify DATABASE_URL is correct |
| Socket not connecting | Set VITE_SOCKET_URL in Vercel |
| Map not loading | Check VITE_MAPBOX_API_KEY |
| Render sleeps | Setup UptimeRobot keep-alive |

---

## 📚 Full Guide

For detailed instructions with screenshots, see:
📖 [DEPLOY_VERCEL_RENDER_SUPABASE.md](DEPLOY_VERCEL_RENDER_SUPABASE.md)

---

**Ready to deploy? Start with Supabase! 🚀**
