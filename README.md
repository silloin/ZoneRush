# 🏃 ZoneRush - Territory Conquest Running Game

<div align="center">
  <img src="https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/PostgreSQL-PostGIS-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Mapbox-GL_JS-black?style=for-the-badge&logo=mapbox" alt="Mapbox">
  <img src="https://img.shields.io/badge/Socket.io-Realtime-white?style=for-the-badge&logo=socket.io" alt="Socket.io">
  <img src="https://img.shields.io/badge/Deployed-Render-purple?style=for-the-badge" alt="Render">
</div>

<div align="center">
  <h3>🎮 Turn your runs into epic territory battles! 🗺️</h3>
  <p><em>Capture zones, compete globally, and level up your running game</em></p>
</div>

---

## 🚀 Features

| Feature | Description | Status |
|---------|-------------|--------|
| 🗺️ Live Territory Map | Real-time GPS tracking with zone capture system | ✅ Active |
| 🔥 Activity Heatmap | Visualize popular running routes in your area | ✅ Active |
| 📊 Performance Dashboard | Comprehensive analytics and progress tracking | ✅ Active |
| 🏆 Achievement System | Unlock badges and level up your profile (XP/levels) | ✅ Active |
| 📈 Global Leaderboard | Compete with runners worldwide | ✅ Active |
| 👥 Multiplayer | See other runners live on the map via Socket.io | ✅ Active |
| 🤖 AI Coach | Personalized training recommendations | ✅ Active |
| 🛡️ Anti-Cheat | Speed and route validation middleware | ✅ Active |
| 📁 GPX Import | Upload runs from Garmin, Strava, etc. | ✅ Active |
| 🏅 Challenges | Join time-limited running challenges | ✅ Active |
| 📱 Mobile Optimized | Responsive UI for all devices | ✅ Active |

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS
- Mapbox GL JS + Mapbox Directions
- Recharts (analytics)
- Socket.io Client
- Lucide React (icons)

**Backend**
- Node.js + Express.js
- PostgreSQL + PostGIS (spatial queries)
- Socket.io (real-time multiplayer)
- JWT Authentication
- Multer (GPX file uploads)
- ngeohash (tile/territory encoding)

**Infrastructure**
- Deployed on Render (web service)
- Frontend built with Vite, served from `server/public`

---

## ⚡ Quick Start

### Prerequisites

```
Node.js 18+
PostgreSQL with PostGIS extension
Mapbox API key
```

### Installation

**1. Clone & install dependencies**

```bash
git clone https://github.com/silloin/ZoneRush.git
cd ZoneRush
npm install --prefix server
npm install --prefix client --legacy-peer-deps
```

**2. Configure environment variables**

`server/.env`
```env
DATABASE_URL=postgresql://<db_user>:<db_password>@<db_host>:5432/<db_name>
JWT_SECRET=<your_jwt_secret>
PORT=5000
NODE_ENV=development
```

`client/.env`
```env
VITE_MAPBOX_API_KEY=<your_mapbox_access_token>
VITE_API_URL=http://localhost:5000/api
```

**3. Run the app**

```bash
# Start backend
cd server && npm run dev

# Start frontend (separate terminal)
cd client && npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:5000`.

---

## 🗄️ Database Setup

The server auto-initializes the database schema on startup by running:

1. `sql/setup_database.sql` — all core tables + PostGIS + migration guards
2. `sql/postgis_setup.sql` — spatial indexes and helper functions
3. `sql/social_gamification.sql` — achievements, social feed, AI recommendations

Tables created:
- `users` — profiles, XP, level, streak
- `runs` — run history with geometry
- `route_points` — GPS point log per run
- `tiles` / `captured_tiles` — territory tile system
- `territories` / `territory_battles` — polygon territory wars
- `route_heatmap` — aggregated heatmap data
- `achievements` / `user_achievements` — gamification
- `posts` / `likes` / `comments` — social feed
- `challenges` / `events` / `training_plans`
- `cheat_flags` — anti-cheat records

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Register new user | ❌ |
| `POST` | `/api/auth/login` | Login | ❌ |
| `GET` | `/api/runs` | Get user runs | ✅ |
| `POST` | `/api/runs` | Save a run | ✅ |
| `POST` | `/api/gpx/upload` | Upload GPX file | ✅ |
| `GET` | `/api/tiles` | Get all captured tiles | ✅ |
| `GET` | `/api/territories` | Get territory polygons | ✅ |
| `GET` | `/api/heatmap/bounds` | Heatmap data for map bounds | ✅ |
| `GET` | `/api/achievements` | All achievements | ✅ |
| `GET` | `/api/users/leaderboard` | Global leaderboard | ✅ |
| `GET` | `/api/challenges` | Active challenges | ✅ |
| `GET` | `/api/ai-coach` | AI training recommendations | ✅ |
| `GET` | `/api/social` | Social feed | ✅ |
| `GET` | `/api/segments` | Route segments | ✅ |

---

## 🎮 How to Play

1. Register/Login — create your runner profile
2. Start a Run — enable GPS tracking from the map
3. Capture Tiles — run through geohash grid cells to claim territory
4. Defend Territory — other runners can steal your zones
5. Earn XP & Level Up — complete achievements and challenges
6. Climb Leaderboards — compete globally or in your city

---

## 🚀 Deployment (Render)

The app is configured for Render via `render.yaml`:

```yaml
services:
  - type: web
    name: zonerush-backend
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
```

The build pipeline (`npm run build` at root) installs both client and server dependencies, builds the Vite frontend, and outputs it to `server/public` for Express to serve.

Required environment variables on Render:
```
DATABASE_URL
JWT_SECRET
NODE_ENV=production
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes (`git commit -m 'Add your feature'`)
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Made with ❤️ by the ZoneRush team</sub><br>
  <sub>📧 support@zonerush.com · 💬 <a href="https://discord.gg/zonerush">Discord</a> · 🐦 <a href="https://twitter.com/zonerushapp">@ZoneRushApp</a></sub>
</div>
